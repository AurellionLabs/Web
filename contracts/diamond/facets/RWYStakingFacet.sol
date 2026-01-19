// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DiamondStorage} from "../libraries/DiamondStorage.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import {RWYStorage} from "../libraries/RWYStorage.sol";
import {RWYLib} from "../libraries/RWYLib.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RWYStakingFacet
 * @notice Real World Yield staking for commodity processing opportunities
 * @dev Diamond facet using RWYLib to reduce contract size
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

    // ============================================================================
    // MODIFIERS
    // ============================================================================

    modifier onlyOwner() {
        if (msg.sender != LibDiamond.diamondStorage().contractOwner) revert NotContractOwner();
        _;
    }

    modifier onlyApprovedOperator() {
        if (!DiamondStorage.appStorage().approvedOperators[msg.sender]) revert NotApprovedOperator();
        _;
    }

    modifier onlyOperator(bytes32 opportunityId) {
        if (RWYStorage.rwyStorage().opportunities[opportunityId].operator != msg.sender) revert NotOperator();
        _;
    }

    modifier opportunityExists(bytes32 opportunityId) {
        if (!RWYStorage.opportunityExists(opportunityId)) revert OpportunityNotFound();
        _;
    }

    modifier nonReentrant() {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        if (rs.reentrancyStatus == RWYStorage.ENTERED) revert ReentrancyGuard();
        rs.reentrancyStatus = RWYStorage.ENTERED;
        _;
        rs.reentrancyStatus = RWYStorage.NOT_ENTERED;
    }

    modifier whenNotPaused() {
        if (DiamondStorage.appStorage().paused) revert ContractPaused();
        _;
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    function initializeRWYStaking() external onlyOwner {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        if (rs.minOperatorCollateralBps == 0) rs.minOperatorCollateralBps = 2000;
        if (rs.maxYieldBps == 0) rs.maxYieldBps = 5000;
        if (rs.protocolFeeBps == 0) rs.protocolFeeBps = 100;
        if (rs.defaultProcessingDays == 0) rs.defaultProcessingDays = 30;
        if (rs.reentrancyStatus == 0) rs.reentrancyStatus = RWYStorage.NOT_ENTERED;
    }

    // ============================================================================
    // OPERATOR FUNCTIONS
    // ============================================================================

    /**
     * @notice Create a new RWY opportunity
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

        // Validate using library
        RWYLib.validateCreateParams(
            targetAmount,
            promisedYieldBps,
            fundingDays,
            processingDays,
            collateralToken,
            collateralAmount,
            minSalePrice,
            rs.maxYieldBps,
            rs.minOperatorCollateralBps
        );

        // Transfer collateral from operator using library
        RWYLib.transferCollateralIn(collateralToken, collateralTokenId, collateralAmount, msg.sender);

        // Generate opportunity ID
        bytes32 opportunityId = keccak256(
            abi.encodePacked(rs.opportunityCounter++, msg.sender, block.timestamp, inputToken, inputTokenId)
        );

        // Create opportunity struct
        _initializeOpportunity(
            rs.opportunities[opportunityId],
            opportunityId,
            name,
            description,
            inputToken,
            inputTokenId,
            targetAmount,
            outputToken,
            expectedOutputAmount,
            promisedYieldBps,
            operatorFeeBps,
            minSalePrice,
            fundingDays,
            collateralToken,
            collateralTokenId,
            collateralAmount
        );

        rs.opportunityIds.push(opportunityId);

        emit OpportunityCreated(opportunityId, msg.sender, inputToken, inputTokenId, targetAmount, promisedYieldBps);

        return opportunityId;
    }

    function _initializeOpportunity(
        RWYStorage.Opportunity storage opp,
        bytes32 opportunityId,
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
        address collateralToken,
        uint256 collateralTokenId,
        uint256 collateralAmount
    ) internal {
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
        opp.collateral.token = collateralToken;
        opp.collateral.tokenId = collateralTokenId;
        opp.collateral.amount = collateralAmount;
    }

    function startDelivery(
        bytes32 opportunityId,
        bytes32 journeyId
    ) external onlyOperator(opportunityId) opportunityExists(opportunityId) {
        RWYStorage.Opportunity storage opp = RWYStorage.getOpportunity(opportunityId);
        if (opp.status != RWYStorage.OpportunityStatus.FUNDED) revert InvalidStatus();
        opp.status = RWYStorage.OpportunityStatus.IN_TRANSIT;
        emit DeliveryStarted(opportunityId, journeyId);
    }

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

        IERC1155(opp.outputToken).safeTransferFrom(msg.sender, address(this), outputTokenId, actualOutputAmount, "");

        emit ProcessingCompleted(opportunityId, actualOutputAmount, outputTokenId);
    }

    function cancelOpportunity(
        bytes32 opportunityId,
        string memory reason
    ) external onlyOperator(opportunityId) opportunityExists(opportunityId) nonReentrant {
        RWYStorage.Opportunity storage opp = RWYStorage.getOpportunity(opportunityId);
        if (opp.status != RWYStorage.OpportunityStatus.FUNDING) revert InvalidStatus();
        opp.status = RWYStorage.OpportunityStatus.CANCELLED;
        RWYLib.returnCollateral(opp);
        emit OpportunityCancelled(opportunityId, reason);
    }

    // ============================================================================
    // STAKER FUNCTIONS
    // ============================================================================

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

        IERC1155(opp.inputToken).safeTransferFrom(msg.sender, address(this), opp.inputTokenId, amount, "");

        if (!rs.isStaker[opportunityId][msg.sender]) {
            rs.opportunityStakers[opportunityId].push(msg.sender);
            rs.isStaker[opportunityId][msg.sender] = true;
        }

        rs.stakes[opportunityId][msg.sender].amount += amount;
        rs.stakes[opportunityId][msg.sender].stakedAt = block.timestamp;
        opp.stakedAmount += amount;

        emit CommodityStaked(opportunityId, msg.sender, amount, opp.stakedAmount);

        if (opp.stakedAmount >= opp.targetAmount) {
            opp.status = RWYStorage.OpportunityStatus.FUNDED;
            opp.fundedAt = block.timestamp;
            opp.processingDeadline = block.timestamp + (rs.defaultProcessingDays * 1 days);
            emit OpportunityFunded(opportunityId, opp.stakedAmount);
        }
    }

    function unstake(
        bytes32 opportunityId,
        uint256 amount
    ) external nonReentrant opportunityExists(opportunityId) {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        RWYStorage.Opportunity storage opp = rs.opportunities[opportunityId];

        if (opp.status != RWYStorage.OpportunityStatus.FUNDING && opp.status != RWYStorage.OpportunityStatus.CANCELLED) {
            revert CannotUnstake();
        }

        RWYStorage.RWYStake storage userStake = rs.stakes[opportunityId][msg.sender];
        if (userStake.amount < amount) revert InsufficientStake();

        userStake.amount -= amount;
        opp.stakedAmount -= amount;

        IERC1155(opp.inputToken).safeTransferFrom(address(this), msg.sender, opp.inputTokenId, amount, "");

        emit CommodityUnstaked(opportunityId, msg.sender, amount);
    }

    function claimProfits(bytes32 opportunityId) external nonReentrant opportunityExists(opportunityId) {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        RWYStorage.Opportunity storage opp = rs.opportunities[opportunityId];

        if (opp.status != RWYStorage.OpportunityStatus.DISTRIBUTING) revert InvalidStatus();
        if (!rs.proceedsFinalized[opportunityId]) revert InvalidStatus();

        RWYStorage.RWYStake storage userStake = rs.stakes[opportunityId][msg.sender];
        if (userStake.amount == 0) revert NoStake();
        if (userStake.claimed) revert AlreadyClaimed();

        userStake.claimed = true;

        uint256 userShare = RWYLib.calculateUserShare(
            userStake.amount,
            opp.stakedAmount,
            rs.saleProceeds[opportunityId],
            rs.protocolFeeBps,
            opp.operatorFeeBps
        );

        if (userShare > 0) {
            IERC20(s.quoteTokenAddress).safeTransfer(msg.sender, userShare);
        }

        emit ProfitDistributed(opportunityId, msg.sender, userStake.amount, userShare);

        RWYLib.checkCompletionStatus(opportunityId);
    }

    function emergencyClaim(bytes32 opportunityId) external nonReentrant opportunityExists(opportunityId) {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        RWYStorage.Opportunity storage opp = rs.opportunities[opportunityId];

        if (opp.status != RWYStorage.OpportunityStatus.CANCELLED) revert InvalidStatus();

        RWYStorage.RWYStake storage userStake = rs.stakes[opportunityId][msg.sender];
        if (userStake.amount == 0) revert NoStake();
        if (userStake.claimed) revert AlreadyClaimed();

        uint256 amount = userStake.amount;
        userStake.claimed = true;
        userStake.amount = 0;

        IERC1155(opp.inputToken).safeTransferFrom(address(this), msg.sender, opp.inputTokenId, amount, "");

        emit CommodityUnstaked(opportunityId, msg.sender, amount);
    }

    // ============================================================================
    // INTERNAL CLOB INTEGRATION
    // ============================================================================

    function recordSaleProceeds(bytes32 opportunityId, uint256 proceeds) external opportunityExists(opportunityId) {
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

    function setMinCollateralBps(uint256 bps) external onlyOwner {
        require(bps >= 1000 && bps <= 5000, "Invalid range");
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        emit ConfigUpdated("minOperatorCollateralBps", rs.minOperatorCollateralBps, bps);
        rs.minOperatorCollateralBps = bps;
    }

    function setMaxYieldBps(uint256 bps) external onlyOwner {
        require(bps <= 10000, "Invalid yield");
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        emit ConfigUpdated("maxYieldBps", rs.maxYieldBps, bps);
        rs.maxYieldBps = bps;
    }

    function setProtocolFeeBps(uint256 bps) external onlyOwner {
        require(bps <= 500, "Fee too high");
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        emit ConfigUpdated("protocolFeeBps", rs.protocolFeeBps, bps);
        rs.protocolFeeBps = bps;
    }

    function setDefaultProcessingDays(uint256 days_) external onlyOwner {
        require(days_ > 0 && days_ <= 365, "Invalid days");
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        emit ConfigUpdated("defaultProcessingDays", rs.defaultProcessingDays, days_);
        rs.defaultProcessingDays = days_;
    }

    /**
     * @notice Set CLOB address for RWY integration (from RWYVault.sol)
     */
    function setRWYCLOBAddress(address _clob) external onlyOwner {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        rs.clobAddress = _clob;
    }

    /**
     * @notice Set quote token (payment token) address (from RWYVault.sol)
     */
    function setRWYQuoteToken(address _quoteToken) external onlyOwner {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        rs.quoteToken = _quoteToken;
    }

    /**
     * @notice Set fee recipient address (from RWYVault.sol)
     */
    function setRWYFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        rs.feeRecipient = _feeRecipient;
    }

    /**
     * @notice Pause RWY staking (from RWYVault.sol)
     */
    function pauseRWY() external onlyOwner {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        rs.paused = true;
    }

    /**
     * @notice Unpause RWY staking (from RWYVault.sol)
     */
    function unpauseRWY() external onlyOwner {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        rs.paused = false;
    }

    /**
     * @notice Check if RWY staking is paused
     */
    function isRWYPaused() external view returns (bool) {
        return RWYStorage.rwyStorage().paused;
    }

    /**
     * @notice Get CLOB address
     */
    function getRWYCLOBAddress() external view returns (address) {
        return RWYStorage.rwyStorage().clobAddress;
    }

    /**
     * @notice Get quote token address
     */
    function getRWYQuoteToken() external view returns (address) {
        return RWYStorage.rwyStorage().quoteToken;
    }

    /**
     * @notice Get fee recipient address
     */
    function getRWYFeeRecipient() external view returns (address) {
        return RWYStorage.rwyStorage().feeRecipient;
    }

    function forceCancel(
        bytes32 opportunityId,
        string memory reason
    ) external onlyOwner opportunityExists(opportunityId) nonReentrant {
        RWYStorage.Opportunity storage opp = RWYStorage.getOpportunity(opportunityId);
        if (opp.status == RWYStorage.OpportunityStatus.COMPLETED) revert InvalidStatus();
        opp.status = RWYStorage.OpportunityStatus.CANCELLED;
        emit OpportunityCancelled(opportunityId, reason);
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    function getOpportunity(bytes32 opportunityId) external view returns (RWYStorage.Opportunity memory) {
        return RWYStorage.rwyStorage().opportunities[opportunityId];
    }

    function getRWYStake(bytes32 opportunityId, address staker) external view returns (RWYStorage.RWYStake memory) {
        return RWYStorage.rwyStorage().stakes[opportunityId][staker];
    }

    function getOpportunityStakers(bytes32 opportunityId) external view returns (address[] memory) {
        return RWYStorage.rwyStorage().opportunityStakers[opportunityId];
    }

    function getOpportunityCount() external view returns (uint256) {
        return RWYStorage.rwyStorage().opportunityIds.length;
    }

    function getAllOpportunities() external view returns (bytes32[] memory) {
        return RWYStorage.rwyStorage().opportunityIds;
    }

    function getSaleProceeds(bytes32 opportunityId) external view returns (uint256 proceeds, bool finalized) {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        return (rs.saleProceeds[opportunityId], rs.proceedsFinalized[opportunityId]);
    }

    function getRWYConfig() external view returns (uint256, uint256, uint256, uint256) {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        return (rs.minOperatorCollateralBps, rs.maxYieldBps, rs.protocolFeeBps, rs.defaultProcessingDays);
    }

    function calculateExpectedProfit(bytes32 opportunityId, uint256 stakeAmount) external view returns (uint256, uint256) {
        RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();
        RWYStorage.Opportunity storage opp = rs.opportunities[opportunityId];

        uint256 totalAfterStake = opp.stakedAmount + stakeAmount;
        uint256 userShareBps = (stakeAmount * 10000) / totalAfterStake;
        uint256 expectedProceeds = opp.expectedOutputAmount * opp.minSalePrice;

        uint256 expectedProfit = RWYLib.calculateUserShare(
            stakeAmount,
            totalAfterStake,
            expectedProceeds,
            rs.protocolFeeBps,
            opp.operatorFeeBps
        );

        return (expectedProfit, userShareBps);
    }
}
