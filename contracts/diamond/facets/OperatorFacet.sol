// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DiamondStorage} from "../libraries/DiamondStorage.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import {RWYStorage} from "../libraries/RWYStorage.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title OperatorFacet
 * @notice Manages operator approvals, reputation, and slashing for RWY staking
 * @dev Part of the Diamond proxy pattern - handles operator management separately from staking logic
 *
 * Operators are entities that:
 * - Create RWY opportunities for commodity processing
 * - Deposit collateral to back their obligations
 * - Process commodities and sell on CLOB
 * - Build reputation through successful operations
 */
contract OperatorFacet {
    using SafeERC20 for IERC20;

    // ============================================================================
    // EVENTS
    // ============================================================================

    event OperatorApproved(address indexed operator);
    event OperatorRevoked(address indexed operator);
    event OperatorSlashed(
        bytes32 indexed opportunityId,
        address indexed operator,
        address collateralToken,
        uint256 collateralTokenId,
        uint256 amount
    );
    event OperatorReputationUpdated(
        address indexed operator,
        uint256 oldReputation,
        uint256 newReputation
    );
    event OperatorStatsUpdated(
        address indexed operator,
        uint256 successfulOps,
        uint256 totalValueProcessed
    );

    // ============================================================================
    // ERRORS
    // ============================================================================

    error NotContractOwner();
    error InvalidAddress();
    error OperatorAlreadyApproved();
    error OperatorNotApproved();
    error OpportunityNotFound();
    error InvalidSlashAmount();
    error InsufficientCollateral();

    // ============================================================================
    // MODIFIERS
    // ============================================================================

    modifier onlyOwner() {
        if (msg.sender != LibDiamond.diamondStorage().contractOwner) {
            revert NotContractOwner();
        }
        _;
    }

    // ============================================================================
    // ADMIN FUNCTIONS
    // ============================================================================

    /**
     * @notice Approve an operator to create RWY opportunities
     * @param operator Address to approve
     */
    function approveOperator(address operator) external onlyOwner {
        if (operator == address(0)) revert InvalidAddress();

        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        if (s.approvedOperators[operator]) revert OperatorAlreadyApproved();

        s.approvedOperators[operator] = true;

        emit OperatorApproved(operator);
    }

    /**
     * @notice Revoke operator approval
     * @param operator Address to revoke
     */
    function revokeOperator(address operator) external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        if (!s.approvedOperators[operator]) revert OperatorNotApproved();

        s.approvedOperators[operator] = false;

        emit OperatorRevoked(operator);
    }

    /**
     * @notice Slash operator collateral for failing obligations
     * @param opportunityId The opportunity ID
     * @param amount Amount to slash (must be <= collateral amount)
     * @dev Transfers slashed collateral to the fee recipient
     */
    function slashOperator(
        bytes32 opportunityId,
        uint256 amount
    ) external onlyOwner {
        if (amount == 0) revert InvalidSlashAmount();

        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        if (!RWYStorage.opportunityExists(opportunityId)) {
            revert OpportunityNotFound();
        }

        RWYStorage.Opportunity storage opp = rs.opportunities[opportunityId];
        RWYStorage.CollateralInfo storage collateral = opp.collateral;

        if (amount > collateral.amount) revert InsufficientCollateral();

        // Reduce collateral
        collateral.amount -= amount;

        // Transfer slashed collateral to fee recipient
        address feeRecipient = s.feeRecipient;
        if (feeRecipient == address(0)) {
            feeRecipient = LibDiamond.diamondStorage().contractOwner;
        }

        if (collateral.tokenId == 0) {
            // ERC20 collateral
            IERC20(collateral.token).safeTransfer(feeRecipient, amount);
        } else {
            // ERC1155 collateral
            IERC1155(collateral.token).safeTransferFrom(
                address(this),
                feeRecipient,
                collateral.tokenId,
                amount,
                ""
            );
        }

        // Decrease operator reputation
        uint256 oldReputation = s.operatorReputation[opp.operator];
        uint256 newReputation = oldReputation > 10 ? oldReputation - 10 : 0;
        s.operatorReputation[opp.operator] = newReputation;

        emit OperatorSlashed(
            opportunityId,
            opp.operator,
            collateral.token,
            collateral.tokenId,
            amount
        );

        emit OperatorReputationUpdated(opp.operator, oldReputation, newReputation);
    }

    /**
     * @notice Manually adjust operator reputation (admin function)
     * @param operator The operator address
     * @param newReputation New reputation value
     */
    function setOperatorReputation(
        address operator,
        uint256 newReputation
    ) external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        uint256 oldReputation = s.operatorReputation[operator];
        s.operatorReputation[operator] = newReputation;

        emit OperatorReputationUpdated(operator, oldReputation, newReputation);
    }

    // ============================================================================
    // INTERNAL FUNCTIONS (called by RWYStakingFacet)
    // ============================================================================

    /**
     * @notice Update operator stats after successful opportunity completion
     * @param operator The operator address
     * @param valueProcessed Value of the completed opportunity
     * @dev This should be called internally by RWYStakingFacet
     */
    function _updateOperatorStats(
        address operator,
        uint256 valueProcessed
    ) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        s.operatorSuccessfulOps[operator]++;
        s.operatorTotalValueProcessed[operator] += valueProcessed;

        // Increase reputation for successful completion
        uint256 oldReputation = s.operatorReputation[operator];
        uint256 newReputation = oldReputation + 10;
        s.operatorReputation[operator] = newReputation;

        emit OperatorStatsUpdated(
            operator,
            s.operatorSuccessfulOps[operator],
            s.operatorTotalValueProcessed[operator]
        );

        emit OperatorReputationUpdated(operator, oldReputation, newReputation);
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    /**
     * @notice Check if an address is an approved operator
     * @param operator The address to check
     * @return True if the address is an approved operator
     */
    function isApprovedOperator(address operator) external view returns (bool) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.approvedOperators[operator];
    }

    /**
     * @notice Get comprehensive operator statistics
     * @param operator The operator address
     * @return approved Whether the operator is approved
     * @return reputation Operator's reputation score
     * @return successfulOps Number of successfully completed opportunities
     * @return totalValueProcessed Total value processed across all opportunities
     */
    function getOperatorStats(
        address operator
    )
        external
        view
        returns (
            bool approved,
            uint256 reputation,
            uint256 successfulOps,
            uint256 totalValueProcessed
        )
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return (
            s.approvedOperators[operator],
            s.operatorReputation[operator],
            s.operatorSuccessfulOps[operator],
            s.operatorTotalValueProcessed[operator]
        );
    }

    /**
     * @notice Get operator reputation
     * @param operator The operator address
     * @return Reputation score
     */
    function getOperatorReputation(
        address operator
    ) external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.operatorReputation[operator];
    }

    /**
     * @notice Get number of successful operations by operator
     * @param operator The operator address
     * @return Number of successful operations
     */
    function getOperatorSuccessfulOps(
        address operator
    ) external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.operatorSuccessfulOps[operator];
    }

    /**
     * @notice Get total value processed by operator
     * @param operator The operator address
     * @return Total value processed
     */
    function getOperatorTotalValueProcessed(
        address operator
    ) external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.operatorTotalValueProcessed[operator];
    }
}
