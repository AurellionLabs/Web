// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DiamondStorage} from "./DiamondStorage.sol";
import {RWYStorage} from "./RWYStorage.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RWYLib
 * @notice Library for RWY staking operations - collateral management, completion checks
 * @dev Extracted from RWYStakingFacet to reduce contract size and stack depth
 */
library RWYLib {
    using SafeERC20 for IERC20;

    // ============================================================================
    // EVENTS
    // ============================================================================

    event CollateralReturned(
        bytes32 indexed opportunityId,
        address indexed operator,
        uint256 amount
    );

    event OpportunityCompleted(bytes32 indexed opportunityId, uint256 totalProceeds);

    // ============================================================================
    // COLLATERAL FUNCTIONS
    // ============================================================================

    /**
     * @notice Transfer collateral from operator to Diamond
     * @dev Skips transfer if amount is 0 (for insured/trusted pools)
     */
    function transferCollateralIn(
        address token,
        uint256 tokenId,
        uint256 amount,
        address from
    ) internal {
        // Skip transfer if no collateral required
        if (amount == 0) return;
        
        if (tokenId == 0) {
            // ERC20 collateral
            IERC20(token).safeTransferFrom(from, address(this), amount);
        } else {
            // ERC1155 collateral
            IERC1155(token).safeTransferFrom(from, address(this), tokenId, amount, "");
        }
    }

    /**
     * @notice Return collateral to operator
     */
    function returnCollateral(RWYStorage.Opportunity storage opp) internal {
        RWYStorage.CollateralInfo storage collateral = opp.collateral;

        if (collateral.amount == 0) return;

        uint256 amount = collateral.amount;
        collateral.amount = 0;

        if (collateral.tokenId == 0) {
            // ERC20 collateral
            IERC20(collateral.token).safeTransfer(opp.operator, amount);
        } else {
            // ERC1155 collateral
            IERC1155(collateral.token).safeTransferFrom(
                address(this),
                opp.operator,
                collateral.tokenId,
                amount,
                ""
            );
        }

        emit CollateralReturned(opp.id, opp.operator, amount);
    }

    // ============================================================================
    // COMPLETION FUNCTIONS
    // ============================================================================

    /**
     * @notice Check if all stakers have claimed and mark opportunity complete
     */
    function checkCompletionStatus(bytes32 opportunityId) internal {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        address[] storage stakers = rs.opportunityStakers[opportunityId];
        
        // Check if all stakers have claimed
        for (uint256 i = 0; i < stakers.length; i++) {
            if (!rs.stakes[opportunityId][stakers[i]].claimed) {
                return; // Not all claimed yet
            }
        }

        // All claimed - complete the opportunity
        _completeOpportunity(rs, s, opportunityId);
    }

    function _completeOpportunity(
        RWYStorage.RWYAppStorage storage rs,
        DiamondStorage.AppStorage storage s,
        bytes32 opportunityId
    ) private {
        RWYStorage.Opportunity storage opp = rs.opportunities[opportunityId];
        opp.status = RWYStorage.OpportunityStatus.COMPLETED;
        opp.completedAt = block.timestamp;

        uint256 totalProceeds = rs.saleProceeds[opportunityId];

        // Update operator stats
        s.operatorSuccessfulOps[opp.operator]++;
        s.operatorTotalValueProcessed[opp.operator] += totalProceeds;
        s.operatorReputation[opp.operator] += 10;

        // Return remaining operator collateral
        returnCollateral(opp);

        // Transfer protocol fees to fee recipient
        _transferFees(s, rs, opp, totalProceeds);

        emit OpportunityCompleted(opportunityId, totalProceeds);
    }

    function _transferFees(
        DiamondStorage.AppStorage storage s,
        RWYStorage.RWYAppStorage storage rs,
        RWYStorage.Opportunity storage opp,
        uint256 totalProceeds
    ) private {
        // Transfer protocol fees to fee recipient
        uint256 protocolFee = (totalProceeds * rs.protocolFeeBps) / 10000;
        if (protocolFee > 0 && s.feeRecipient != address(0)) {
            IERC20(s.quoteTokenAddress).safeTransfer(s.feeRecipient, protocolFee);
        }

        // Transfer operator fees
        uint256 operatorFee = (totalProceeds * opp.operatorFeeBps) / 10000;
        if (operatorFee > 0) {
            IERC20(s.quoteTokenAddress).safeTransfer(opp.operator, operatorFee);
        }
    }

    // ============================================================================
    // VALIDATION FUNCTIONS
    // ============================================================================

    /**
     * @notice Validate opportunity creation parameters
     * @dev Supports 0 collateral for insured opportunities or trusted operators
     */
    function validateCreateParams(
        uint256 targetAmount,
        uint256 promisedYieldBps,
        uint256 fundingDays,
        uint256 processingDays,
        address collateralToken,
        uint256 collateralAmount,
        uint256 minSalePrice,
        uint256 maxYieldBps,
        uint256 minOperatorCollateralBps
    ) internal pure {
        require(targetAmount > 0, "Invalid amount");
        require(promisedYieldBps <= maxYieldBps, "Invalid yield");
        require(fundingDays > 0 && processingDays > 0, "Invalid timeline");
        
        // If collateral is provided, validate it meets minimum requirements
        // If collateral is 0, allow it (for insured pools or trusted operators)
        if (collateralAmount > 0) {
            require(collateralToken != address(0), "Invalid collateral token");
            
            // Calculate required collateral based on expected value
            uint256 requiredCollateral = (targetAmount * minSalePrice * minOperatorCollateralBps) / 10000;
            require(collateralAmount >= requiredCollateral, "Insufficient collateral");
        }
        // Note: 0 collateral is allowed - UI should display this clearly to investors
    }

    /**
     * @notice Calculate user's profit share
     */
    function calculateUserShare(
        uint256 userStakeAmount,
        uint256 totalStaked,
        uint256 totalProceeds,
        uint256 protocolFeeBps,
        uint256 operatorFeeBps
    ) internal pure returns (uint256 userShare) {
        uint256 userShareBps = (userStakeAmount * 10000) / totalStaked;

        // Deduct fees
        uint256 protocolFee = (totalProceeds * protocolFeeBps) / 10000;
        uint256 operatorFee = (totalProceeds * operatorFeeBps) / 10000;
        uint256 distributableProceeds = totalProceeds - protocolFee - operatorFee;

        userShare = (distributableProceeds * userShareBps) / 10000;
    }
}
