// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DiamondStorage} from "../libraries/DiamondStorage.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import {RWYStorage} from "../libraries/RWYStorage.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

/**
 * @title RWYStakingFacet
 * @notice Real World Yield staking for commodity processing opportunities
 * @dev Diamond facet that handles:
 *      - Operators creating opportunities with token-based collateral
 *      - Users staking ERC1155 commodities
 *      - Lifecycle management: funding -> delivery -> processing -> selling -> distribution
 *      - Profit distribution from CLOB sales
 *
 * Flow:
 * 1. Operator creates opportunity (deposits ERC20 or ERC1155 collateral)
 * 2. Users stake ERC1155 commodities into the vault
 * 3. When funded, commodities are delivered to operator via node network
 * 4. Operator processes commodities (e.g., goat -> meat)
 * 5. Processed goods sold on CLOB (internal call to record proceeds)
 * 6. Profits distributed to stakers automatically
 */
contract RWYStakingFacet {
    using SafeERC20 for IERC20;

    // ============================================================================
    // EVENTS
    // ============================================================================

    event OpportunityCreated(
        bytes32 indexed id,
        address indexed operator,
        address inputToken,
        uint256 inputTokenId,
        uint256 targetAmount,
        uint256 promisedYieldBps
    );

    event OpportunityFunded(bytes32 indexed id, uint256 totalStaked);

    event OpportunityCancelled(bytes32 indexed id, string reason);

    event CommodityStaked(
        bytes32 indexed opportunityId,
        address indexed staker,
        uint256 amount,
        uint256 totalStaked
    );

    event CommodityUnstaked(
        bytes32 indexed opportunityId,
        address indexed staker,
        uint256 amount
    );

    event DeliveryStarted(bytes32 indexed opportunityId, bytes32 journeyId);

    event DeliveryConfirmed(bytes32 indexed opportunityId, uint256 deliveredAmount);

    event ProcessingStarted(bytes32 indexed opportunityId);

    event ProcessingCompleted(
        bytes32 indexed opportunityId,
        uint256 outputAmount,
        uint256 outputTokenId
    );

    event SaleProceedsRecorded(bytes32 indexed opportunityId, uint256 proceeds);

    event ProfitDistributed(
        bytes32 indexed opportunityId,
        address indexed staker,
        uint256 stakedAmount,
        uint256 profitShare
    );

    event OpportunityCompleted(bytes32 indexed opportunityId, uint256 totalProceeds);

    event CollateralReturned(
        bytes32 indexed opportunityId,
        address indexed operator,
        uint256 amount
    );

    event ConfigUpdated(string indexed param, uint256 oldValue, uint256 newValue);

    // ============================================================================
    // ERRORS
    // ============================================================================

    error NotContractOwner();
    error NotApprovedOperator();
    error NotOperator();
    error OpportunityNotFound();
    error InvalidStatus();
    error InvalidAmount();
    error InvalidTimeline();
    error InvalidYield();
    error InsufficientCollateral();
    error FundingDeadlinePassed();
    error ProcessingDeadlinePassed();
    error ExceedsTarget();
    error InsufficientStake();
    error AlreadyClaimed();
    error NoStake();
    error CannotUnstake();
    error ReentrancyGuard();
    error ContractPaused();
    error NotAuthorized();
    error InvalidCollateralToken();

    // ============================================================================
    // MODIFIERS
    // ============================================================================

    modifier onlyOwner() {
        if (msg.sender != LibDiamond.diamondStorage().contractOwner) {
            revert NotContractOwner();
        }
        _;
    }

    modifier onlyApprovedOperator() {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (!s.approvedOperators[msg.sender]) {
            revert NotApprovedOperator();
        }
        _;
    }

    modifier onlyOperator(bytes32 opportunityId) {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        if (rs.opportunities[opportunityId].operator != msg.sender) {
            revert NotOperator();
        }
        _;
    }

    modifier opportunityExists(bytes32 opportunityId) {
        if (!RWYStorage.opportunityExists(opportunityId)) {
            revert OpportunityNotFound();
        }
        _;
    }

    modifier nonReentrant() {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        if (rs.reentrancyStatus == RWYStorage.ENTERED) {
            revert ReentrancyGuard();
        }
        rs.reentrancyStatus = RWYStorage.ENTERED;
        _;
        rs.reentrancyStatus = RWYStorage.NOT_ENTERED;
    }

    modifier whenNotPaused() {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (s.paused) {
            revert ContractPaused();
        }
        _;
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    /**
     * @notice Initialize RWY staking configuration
     * @dev Should be called once after facet is added to Diamond
     */
    function initializeRWYStaking() external onlyOwner {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();

        // Set defaults if not already set
        if (rs.minOperatorCollateralBps == 0) {
            rs.minOperatorCollateralBps = 2000; // 20%
        }
        if (rs.maxYieldBps == 0) {
            rs.maxYieldBps = 5000; // 50%
        }
        if (rs.protocolFeeBps == 0) {
            rs.protocolFeeBps = 100; // 1%
        }
        if (rs.defaultProcessingDays == 0) {
            rs.defaultProcessingDays = 30;
        }
        if (rs.reentrancyStatus == 0) {
            rs.reentrancyStatus = RWYStorage.NOT_ENTERED;
        }
    }

    // ============================================================================
    // OPERATOR FUNCTIONS
    // ============================================================================

    /**
     * @notice Create a new RWY opportunity
     * @param name Name of the opportunity
     * @param description Description of the processing operation
     * @param inputToken AuraAsset contract address for input commodity
     * @param inputTokenId Token ID of input commodity
     * @param targetAmount Total amount of input commodity needed
     * @param outputToken AuraAsset contract for output
     * @param expectedOutputAmount Expected amount of processed output
     * @param promisedYieldBps Promised yield in basis points (1500 = 15%)
     * @param operatorFeeBps Operator's fee in basis points
     * @param minSalePrice Minimum acceptable sale price per unit
     * @param fundingDays Days until funding deadline
     * @param processingDays Days for processing after funding
     * @param collateralToken Collateral token address (ERC20 or ERC1155)
     * @param collateralTokenId Token ID for ERC1155 collateral (0 for ERC20)
     * @param collateralAmount Amount of collateral
     */
    function createOpportunity(
        string memory name,
        string memory description,
        address inputToken,
        uint256 inputTokenId,
        uint256 targetAmount,
        address outputToken,
        uint256 expectedOutputAmount,
        uint256 promisedYieldBps,
        uint256 operatorFeeBps,
        uint256 minSalePrice,
        uint256 fundingDays,
        uint256 processingDays,
        address collateralToken,
        uint256 collateralTokenId,
        uint256 collateralAmount
    ) external onlyApprovedOperator nonReentrant whenNotPaused returns (bytes32) {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();

        // Validations
        if (targetAmount == 0) revert InvalidAmount();
        if (promisedYieldBps > rs.maxYieldBps) revert InvalidYield();
        if (fundingDays == 0 || processingDays == 0) revert InvalidTimeline();
        if (collateralToken == address(0)) revert InvalidCollateralToken();

        // Calculate required collateral based on expected value
        uint256 requiredCollateral = (targetAmount * minSalePrice * rs.minOperatorCollateralBps) / 10000;
        if (collateralAmount < requiredCollateral) revert InsufficientCollateral();

        // Transfer collateral from operator
        _transferCollateralIn(collateralToken, collateralTokenId, collateralAmount, msg.sender);

        // Generate opportunity ID
        bytes32 opportunityId = keccak256(
            abi.encodePacked(
                rs.opportunityCounter++,
                msg.sender,
                block.timestamp,
                inputToken,
                inputTokenId
            )
        );

        // Create opportunity
        RWYStorage.Opportunity storage opp = rs.opportunities[opportunityId];
        opp.id = opportunityId;
        opp.operator = msg.sender;
        opp.name = name;
        opp.description = description;
        opp.inputToken = inputToken;
        opp.inputTokenId = inputTokenId;
        opp.targetAmount = targetAmount;
        opp.stakedAmount = 0;
        opp.outputToken = outputToken;
        opp.outputTokenId = 0;
        opp.expectedOutputAmount = expectedOutputAmount;
        opp.promisedYieldBps = promisedYieldBps;
        opp.operatorFeeBps = operatorFeeBps;
        opp.minSalePrice = minSalePrice;
        opp.fundingDeadline = block.timestamp + (fundingDays * 1 days);
        opp.processingDeadline = 0;
        opp.createdAt = block.timestamp;
        opp.fundedAt = 0;
        opp.completedAt = 0;
        opp.status = RWYStorage.OpportunityStatus.FUNDING;

        // Store collateral info
        opp.collateral.token = collateralToken;
        opp.collateral.tokenId = collateralTokenId;
        opp.collateral.amount = collateralAmount;

        rs.opportunityIds.push(opportunityId);

        emit OpportunityCreated(
            opportunityId,
            msg.sender,
            inputToken,
            inputTokenId,
            targetAmount,
            promisedYieldBps
        );

        return opportunityId;
    }

    /**
     * @notice Start delivery process - transitions to IN_TRANSIT
     * @param opportunityId The opportunity ID
     * @param journeyId The journey ID from the node network
     */
    function startDelivery(
        bytes32 opportunityId,
        bytes32 journeyId
    ) external onlyOperator(opportunityId) opportunityExists(opportunityId) {
        RWYStorage.Opportunity storage opp = RWYStorage.getOpportunity(opportunityId);

        if (opp.status != RWYStorage.OpportunityStatus.FUNDED) revert InvalidStatus();

        opp.status = RWYStorage.OpportunityStatus.IN_TRANSIT;

        emit DeliveryStarted(opportunityId, journeyId);
    }

    /**
     * @notice Confirm delivery of commodities to operator facility
     * @param opportunityId The opportunity ID
     * @param deliveredAmount Amount actually delivered
     */
    function confirmDelivery(
        bytes32 opportunityId,
        uint256 deliveredAmount
    ) external onlyOperator(opportunityId) opportunityExists(opportunityId) {
        RWYStorage.Opportunity storage opp = RWYStorage.getOpportunity(opportunityId);

        if (opp.status != RWYStorage.OpportunityStatus.IN_TRANSIT) revert InvalidStatus();
        if (deliveredAmount > opp.stakedAmount) revert InvalidAmount();

        opp.status = RWYStorage.OpportunityStatus.PROCESSING;

        emit DeliveryConfirmed(opportunityId, deliveredAmount);
        emit ProcessingStarted(opportunityId);
    }

    /**
     * @notice Report processing completion
     * @param opportunityId The opportunity ID
     * @param outputTokenId Token ID of the processed commodity
     * @param actualOutputAmount Actual amount of processed output
     */
    function completeProcessing(
        bytes32 opportunityId,
        uint256 outputTokenId,
        uint256 actualOutputAmount
    ) external onlyOperator(opportunityId) opportunityExists(opportunityId) nonReentrant {
        RWYStorage.Opportunity storage opp = RWYStorage.getOpportunity(opportunityId);

        if (opp.status != RWYStorage.OpportunityStatus.PROCESSING) revert InvalidStatus();
        if (block.timestamp > opp.processingDeadline) revert ProcessingDeadlinePassed();

        opp.outputTokenId = outputTokenId;
        opp.status = RWYStorage.OpportunityStatus.SELLING;

        // Transfer processed tokens from operator to Diamond
        IERC1155(opp.outputToken).safeTransferFrom(
            msg.sender,
            address(this),
            outputTokenId,
            actualOutputAmount,
            ""
        );

        emit ProcessingCompleted(opportunityId, actualOutputAmount, outputTokenId);
    }

    /**
     * @notice Cancel an opportunity (only during FUNDING phase)
     * @param opportunityId The opportunity ID
     * @param reason Reason for cancellation
     */
    function cancelOpportunity(
        bytes32 opportunityId,
        string memory reason
    ) external onlyOperator(opportunityId) opportunityExists(opportunityId) nonReentrant {
        RWYStorage.Opportunity storage opp = RWYStorage.getOpportunity(opportunityId);

        if (opp.status != RWYStorage.OpportunityStatus.FUNDING) revert InvalidStatus();

        opp.status = RWYStorage.OpportunityStatus.CANCELLED;

        // Return operator collateral
        _returnCollateral(opp);

        emit OpportunityCancelled(opportunityId, reason);
    }

    // ============================================================================
    // STAKER FUNCTIONS
    // ============================================================================

    /**
     * @notice Stake commodities into an RWY opportunity
     * @param opportunityId The opportunity to stake into
     * @param amount Amount of commodity tokens to stake
     */
    function stake(
        bytes32 opportunityId,
        uint256 amount
    ) external nonReentrant whenNotPaused opportunityExists(opportunityId) {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        RWYStorage.Opportunity storage opp = rs.opportunities[opportunityId];

        if (opp.status != RWYStorage.OpportunityStatus.FUNDING) revert InvalidStatus();
        if (block.timestamp >= opp.fundingDeadline) revert FundingDeadlinePassed();
        if (amount == 0) revert InvalidAmount();
        if (opp.stakedAmount + amount > opp.targetAmount) revert ExceedsTarget();

        // Transfer commodity tokens to Diamond
        IERC1155(opp.inputToken).safeTransferFrom(
            msg.sender,
            address(this),
            opp.inputTokenId,
            amount,
            ""
        );

        // Update stake tracking
        if (!rs.isStaker[opportunityId][msg.sender]) {
            rs.opportunityStakers[opportunityId].push(msg.sender);
            rs.isStaker[opportunityId][msg.sender] = true;
        }

        rs.stakes[opportunityId][msg.sender].amount += amount;
        rs.stakes[opportunityId][msg.sender].stakedAt = block.timestamp;
        opp.stakedAmount += amount;

        emit CommodityStaked(opportunityId, msg.sender, amount, opp.stakedAmount);

        // Check if fully funded
        if (opp.stakedAmount >= opp.targetAmount) {
            opp.status = RWYStorage.OpportunityStatus.FUNDED;
            opp.fundedAt = block.timestamp;
            opp.processingDeadline = block.timestamp + (rs.defaultProcessingDays * 1 days);

            emit OpportunityFunded(opportunityId, opp.stakedAmount);
        }
    }

    /**
     * @notice Unstake commodities before funding is complete or after cancellation
     * @param opportunityId The opportunity to unstake from
     * @param amount Amount to unstake
     */
    function unstake(
        bytes32 opportunityId,
        uint256 amount
    ) external nonReentrant opportunityExists(opportunityId) {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        RWYStorage.Opportunity storage opp = rs.opportunities[opportunityId];

        // Can only unstake during FUNDING or after CANCELLED
        if (
            opp.status != RWYStorage.OpportunityStatus.FUNDING &&
            opp.status != RWYStorage.OpportunityStatus.CANCELLED
        ) {
            revert CannotUnstake();
        }

        RWYStorage.RWYStake storage userStake = rs.stakes[opportunityId][msg.sender];
        if (userStake.amount < amount) revert InsufficientStake();

        userStake.amount -= amount;
        opp.stakedAmount -= amount;

        // Return commodity tokens
        IERC1155(opp.inputToken).safeTransferFrom(
            address(this),
            msg.sender,
            opp.inputTokenId,
            amount,
            ""
        );

        emit CommodityUnstaked(opportunityId, msg.sender, amount);
    }

    /**
     * @notice Claim profits after opportunity completion
     * @param opportunityId The opportunity to claim from
     */
    function claimProfits(
        bytes32 opportunityId
    ) external nonReentrant opportunityExists(opportunityId) {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        RWYStorage.Opportunity storage opp = rs.opportunities[opportunityId];

        if (opp.status != RWYStorage.OpportunityStatus.DISTRIBUTING) revert InvalidStatus();
        if (!rs.proceedsFinalized[opportunityId]) revert InvalidStatus();

        RWYStorage.RWYStake storage userStake = rs.stakes[opportunityId][msg.sender];
        if (userStake.amount == 0) revert NoStake();
        if (userStake.claimed) revert AlreadyClaimed();

        userStake.claimed = true;

        // Calculate user's share of proceeds
        uint256 totalProceeds = rs.saleProceeds[opportunityId];
        uint256 userShareBps = (userStake.amount * 10000) / opp.stakedAmount;

        // Deduct fees
        uint256 protocolFee = (totalProceeds * rs.protocolFeeBps) / 10000;
        uint256 operatorFee = (totalProceeds * opp.operatorFeeBps) / 10000;
        uint256 distributableProceeds = totalProceeds - protocolFee - operatorFee;

        uint256 userShare = (distributableProceeds * userShareBps) / 10000;

        // Transfer quote tokens to user
        if (userShare > 0) {
            IERC20(s.quoteTokenAddress).safeTransfer(msg.sender, userShare);
        }

        emit ProfitDistributed(opportunityId, msg.sender, userStake.amount, userShare);

        // Check if all stakers have claimed
        _checkCompletionStatus(opportunityId);
    }

    /**
     * @notice Emergency claim for cancelled opportunities (returns original tokens)
     * @param opportunityId The opportunity ID
     */
    function emergencyClaim(
        bytes32 opportunityId
    ) external nonReentrant opportunityExists(opportunityId) {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        RWYStorage.Opportunity storage opp = rs.opportunities[opportunityId];

        if (opp.status != RWYStorage.OpportunityStatus.CANCELLED) revert InvalidStatus();

        RWYStorage.RWYStake storage userStake = rs.stakes[opportunityId][msg.sender];
        if (userStake.amount == 0) revert NoStake();
        if (userStake.claimed) revert AlreadyClaimed();

        uint256 amount = userStake.amount;
        userStake.claimed = true;
        userStake.amount = 0;

        // Return original commodity tokens
        IERC1155(opp.inputToken).safeTransferFrom(
            address(this),
            msg.sender,
            opp.inputTokenId,
            amount,
            ""
        );

        emit CommodityUnstaked(opportunityId, msg.sender, amount);
    }

    // ============================================================================
    // INTERNAL CLOB INTEGRATION
    // ============================================================================

    /**
     * @notice Record sale proceeds from CLOB (called internally by CLOBFacet)
     * @param opportunityId The opportunity ID
     * @param proceeds Total proceeds from the sale
     * @dev This should be called by CLOBFacet when processed goods are sold
     */
    function recordSaleProceeds(
        bytes32 opportunityId,
        uint256 proceeds
    ) external opportunityExists(opportunityId) {
        // Authorization: only CLOB facet or owner can call this
        // In Diamond pattern, we can check the caller is the Diamond itself (internal call)
        // or the contract owner for manual recording
        if (msg.sender != address(this) && msg.sender != LibDiamond.diamondStorage().contractOwner) {
            revert NotAuthorized();
        }

        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        RWYStorage.Opportunity storage opp = rs.opportunities[opportunityId];

        if (opp.status != RWYStorage.OpportunityStatus.SELLING) revert InvalidStatus();

        rs.saleProceeds[opportunityId] = proceeds;
        rs.proceedsFinalized[opportunityId] = true;
        opp.status = RWYStorage.OpportunityStatus.DISTRIBUTING;

        emit SaleProceedsRecorded(opportunityId, proceeds);
    }

    // ============================================================================
    // ADMIN FUNCTIONS
    // ============================================================================

    /**
     * @notice Set minimum operator collateral requirement
     * @param bps Basis points (2000 = 20%)
     */
    function setMinCollateralBps(uint256 bps) external onlyOwner {
        require(bps >= 1000 && bps <= 5000, "Invalid range"); // 10-50%
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        uint256 oldValue = rs.minOperatorCollateralBps;
        rs.minOperatorCollateralBps = bps;
        emit ConfigUpdated("minOperatorCollateralBps", oldValue, bps);
    }

    /**
     * @notice Set maximum allowed yield
     * @param bps Basis points (5000 = 50%)
     */
    function setMaxYieldBps(uint256 bps) external onlyOwner {
        require(bps <= 10000, "Invalid yield"); // Max 100%
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        uint256 oldValue = rs.maxYieldBps;
        rs.maxYieldBps = bps;
        emit ConfigUpdated("maxYieldBps", oldValue, bps);
    }

    /**
     * @notice Set protocol fee
     * @param bps Basis points (100 = 1%)
     */
    function setProtocolFeeBps(uint256 bps) external onlyOwner {
        require(bps <= 500, "Fee too high"); // Max 5%
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        uint256 oldValue = rs.protocolFeeBps;
        rs.protocolFeeBps = bps;
        emit ConfigUpdated("protocolFeeBps", oldValue, bps);
    }

    /**
     * @notice Set default processing days
     * @param days_ Number of days
     */
    function setDefaultProcessingDays(uint256 days_) external onlyOwner {
        require(days_ > 0 && days_ <= 365, "Invalid days");
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        uint256 oldValue = rs.defaultProcessingDays;
        rs.defaultProcessingDays = days_;
        emit ConfigUpdated("defaultProcessingDays", oldValue, days_);
    }

    /**
     * @notice Force cancel an opportunity (emergency use)
     * @param opportunityId The opportunity ID
     * @param reason Reason for cancellation
     */
    function forceCancel(
        bytes32 opportunityId,
        string memory reason
    ) external onlyOwner opportunityExists(opportunityId) nonReentrant {
        RWYStorage.Opportunity storage opp = RWYStorage.getOpportunity(opportunityId);

        // Can force cancel from any status except COMPLETED
        if (opp.status == RWYStorage.OpportunityStatus.COMPLETED) revert InvalidStatus();

        opp.status = RWYStorage.OpportunityStatus.CANCELLED;

        emit OpportunityCancelled(opportunityId, reason);
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    /**
     * @notice Get opportunity details
     * @param opportunityId The opportunity ID
     */
    function getOpportunity(
        bytes32 opportunityId
    ) external view returns (RWYStorage.Opportunity memory) {
        return RWYStorage.rwyStorage().opportunities[opportunityId];
    }

    /**
     * @notice Get stake details for a user
     * @param opportunityId The opportunity ID
     * @param staker The staker address
     */
    function getRWYStake(
        bytes32 opportunityId,
        address staker
    ) external view returns (RWYStorage.RWYStake memory) {
        return RWYStorage.rwyStorage().stakes[opportunityId][staker];
    }

    /**
     * @notice Get all stakers for an opportunity
     * @param opportunityId The opportunity ID
     */
    function getOpportunityStakers(
        bytes32 opportunityId
    ) external view returns (address[] memory) {
        return RWYStorage.rwyStorage().opportunityStakers[opportunityId];
    }

    /**
     * @notice Get total number of opportunities
     */
    function getOpportunityCount() external view returns (uint256) {
        return RWYStorage.rwyStorage().opportunityIds.length;
    }

    /**
     * @notice Get all opportunity IDs
     */
    function getAllOpportunities() external view returns (bytes32[] memory) {
        return RWYStorage.rwyStorage().opportunityIds;
    }

    /**
     * @notice Get sale proceeds for an opportunity
     * @param opportunityId The opportunity ID
     */
    function getSaleProceeds(
        bytes32 opportunityId
    ) external view returns (uint256 proceeds, bool finalized) {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        return (rs.saleProceeds[opportunityId], rs.proceedsFinalized[opportunityId]);
    }

    /**
     * @notice Get RWY configuration
     */
    function getRWYConfig()
        external
        view
        returns (
            uint256 minOperatorCollateralBps,
            uint256 maxYieldBps,
            uint256 protocolFeeBps,
            uint256 defaultProcessingDays
        )
    {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        return (
            rs.minOperatorCollateralBps,
            rs.maxYieldBps,
            rs.protocolFeeBps,
            rs.defaultProcessingDays
        );
    }

    /**
     * @notice Calculate expected profit for a stake amount
     * @param opportunityId The opportunity ID
     * @param stakeAmount Amount to stake
     */
    function calculateExpectedProfit(
        bytes32 opportunityId,
        uint256 stakeAmount
    ) external view returns (uint256 expectedProfit, uint256 userShareBps) {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        RWYStorage.Opportunity storage opp = rs.opportunities[opportunityId];

        // Calculate share of the pool
        uint256 totalAfterStake = opp.stakedAmount + stakeAmount;
        userShareBps = (stakeAmount * 10000) / totalAfterStake;

        // Expected proceeds = expectedOutput * minSalePrice
        uint256 expectedProceeds = opp.expectedOutputAmount * opp.minSalePrice;

        // Deduct fees
        uint256 protocolFee = (expectedProceeds * rs.protocolFeeBps) / 10000;
        uint256 operatorFee = (expectedProceeds * opp.operatorFeeBps) / 10000;
        uint256 distributable = expectedProceeds - protocolFee - operatorFee;

        expectedProfit = (distributable * userShareBps) / 10000;
    }

    // ============================================================================
    // INTERNAL FUNCTIONS
    // ============================================================================

    /**
     * @notice Transfer collateral from operator to Diamond
     */
    function _transferCollateralIn(
        address token,
        uint256 tokenId,
        uint256 amount,
        address from
    ) internal {
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
    function _returnCollateral(RWYStorage.Opportunity storage opp) internal {
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

    /**
     * @notice Check if all stakers have claimed and mark opportunity complete
     */
    function _checkCompletionStatus(bytes32 opportunityId) internal {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        address[] storage stakers = rs.opportunityStakers[opportunityId];
        bool allClaimed = true;

        for (uint256 i = 0; i < stakers.length; i++) {
            if (!rs.stakes[opportunityId][stakers[i]].claimed) {
                allClaimed = false;
                break;
            }
        }

        if (allClaimed) {
            RWYStorage.Opportunity storage opp = rs.opportunities[opportunityId];
            opp.status = RWYStorage.OpportunityStatus.COMPLETED;
            opp.completedAt = block.timestamp;

            uint256 totalProceeds = rs.saleProceeds[opportunityId];

            // Update operator stats
            s.operatorSuccessfulOps[opp.operator]++;
            s.operatorTotalValueProcessed[opp.operator] += totalProceeds;
            s.operatorReputation[opp.operator] += 10;

            // Return remaining operator collateral
            _returnCollateral(opp);

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

            emit OpportunityCompleted(opportunityId, totalProceeds);
        }
    }
}
