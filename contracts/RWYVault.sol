// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IRWYVault.sol";

/**
 * @title RWYVault
 * @notice Real World Yield Vault for commodity staking and processing
 * @dev Users stake ERC1155 commodities, operators process them, profits distributed via CLOB
 * 
 * Flow:
 * 1. Operator creates opportunity (deposits collateral)
 * 2. Users stake commodities into the vault
 * 3. When funded, commodities are delivered to operator via node network
 * 4. Operator processes commodities (e.g., goat → meat)
 * 5. Processed goods sold on CLOB
 * 6. Profits distributed to stakers automatically
 */
contract RWYVault is IRWYVault, ERC1155Holder, ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ============ STATE VARIABLES ============

    // Opportunity tracking
    mapping(bytes32 => Opportunity) public opportunities;
    bytes32[] public opportunityIds;
    uint256 public opportunityCounter;

    // Staking tracking: opportunityId => staker => Stake
    mapping(bytes32 => mapping(address => Stake)) public stakes;
    // Track all stakers per opportunity for iteration
    mapping(bytes32 => address[]) public opportunityStakers;
    mapping(bytes32 => mapping(address => bool)) public isStaker;

    // Operator registry
    mapping(address => bool) public approvedOperators;
    mapping(address => uint256) public operatorReputation;
    mapping(address => uint256) public operatorSuccessfulOps;
    mapping(address => uint256) public operatorTotalValueProcessed;

    // Sale proceeds tracking: opportunityId => total proceeds from CLOB
    mapping(bytes32 => uint256) public saleProceeds;
    mapping(bytes32 => bool) public proceedsFinalized;

    // Configuration
    uint256 public minOperatorCollateralBps = 2000; // 20% minimum collateral
    uint256 public maxYieldBps = 5000;              // 50% max promised yield
    uint256 public protocolFeeBps = 100;            // 1% protocol fee
    uint256 public defaultProcessingDays = 30;      // Default processing period
    address public feeRecipient;
    address public clobAddress;
    address public quoteToken;                       // AURUM token for payments

    // ============ ERRORS ============

    error InvalidAmount();
    error InvalidTimeline();
    error InvalidYield();
    error InsufficientCollateral();
    error NotApprovedOperator();
    error NotOperator();
    error OpportunityNotFound();
    error InvalidStatus();
    error FundingDeadlinePassed();
    error ProcessingDeadlinePassed();
    error ExceedsTarget();
    error InsufficientStake();
    error AlreadyClaimed();
    error NoStake();
    error CannotUnstake();

    // ============ MODIFIERS ============

    modifier onlyOperator(bytes32 opportunityId) {
        if (opportunities[opportunityId].operator != msg.sender) revert NotOperator();
        _;
    }

    modifier onlyApprovedOperator() {
        if (!approvedOperators[msg.sender]) revert NotApprovedOperator();
        _;
    }

    modifier opportunityExists(bytes32 opportunityId) {
        if (opportunities[opportunityId].id == bytes32(0)) revert OpportunityNotFound();
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(
        address _feeRecipient,
        address _clobAddress,
        address _quoteToken
    ) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
        clobAddress = _clobAddress;
        quoteToken = _quoteToken;
    }

    // ============ OPERATOR FUNCTIONS ============

    /**
     * @notice Create a new RWY opportunity
     * @param name Name of the opportunity
     * @param description Description of the processing operation
     * @param inputToken AuraAsset contract address for input commodity
     * @param inputTokenId Token ID of input commodity
     * @param targetAmount Total amount of input commodity needed
     * @param outputToken AuraAsset contract for output (can be same as input)
     * @param expectedOutputAmount Expected amount of processed output
     * @param promisedYieldBps Promised yield in basis points (1500 = 15%)
     * @param operatorFeeBps Operator's fee in basis points
     * @param minSalePrice Minimum acceptable sale price per unit
     * @param fundingDays Days until funding deadline
     * @param processingDays Days for processing after funding
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
        uint256 processingDays
    ) external payable override onlyApprovedOperator nonReentrant whenNotPaused returns (bytes32) {
        if (targetAmount == 0) revert InvalidAmount();
        if (promisedYieldBps > maxYieldBps) revert InvalidYield();
        if (fundingDays == 0 || processingDays == 0) revert InvalidTimeline();

        // Calculate required collateral based on expected value
        // Collateral = targetAmount * minSalePrice * collateralBps / 10000
        uint256 requiredCollateral = (targetAmount * minSalePrice * minOperatorCollateralBps) / 10000;
        if (msg.value < requiredCollateral) revert InsufficientCollateral();

        bytes32 opportunityId = keccak256(abi.encodePacked(
            opportunityCounter++,
            msg.sender,
            block.timestamp,
            inputToken,
            inputTokenId
        ));

        opportunities[opportunityId] = Opportunity({
            id: opportunityId,
            operator: msg.sender,
            name: name,
            description: description,
            inputToken: inputToken,
            inputTokenId: inputTokenId,
            targetAmount: targetAmount,
            stakedAmount: 0,
            outputToken: outputToken,
            outputTokenId: 0, // Set when processing completes
            expectedOutputAmount: expectedOutputAmount,
            promisedYieldBps: promisedYieldBps,
            operatorFeeBps: operatorFeeBps,
            minSalePrice: minSalePrice,
            fundingDeadline: block.timestamp + (fundingDays * 1 days),
            processingDeadline: 0, // Set when funded
            createdAt: block.timestamp,
            fundedAt: 0,
            completedAt: 0,
            status: OpportunityStatus.FUNDING,
            operatorCollateral: msg.value
        });

        opportunityIds.push(opportunityId);

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
        Opportunity storage opp = opportunities[opportunityId];
        if (opp.status != OpportunityStatus.FUNDED) revert InvalidStatus();

        opp.status = OpportunityStatus.IN_TRANSIT;

        emit DeliveryStarted(opportunityId, journeyId);
    }

    /**
     * @notice Confirm delivery of commodities to operator facility
     * @param opportunityId The opportunity ID
     * @param deliveredAmount Amount actually delivered (for verification)
     */
    function confirmDelivery(
        bytes32 opportunityId,
        uint256 deliveredAmount
    ) external override onlyOperator(opportunityId) opportunityExists(opportunityId) {
        Opportunity storage opp = opportunities[opportunityId];
        if (opp.status != OpportunityStatus.IN_TRANSIT) revert InvalidStatus();
        if (deliveredAmount > opp.stakedAmount) revert InvalidAmount();

        // In production: require multi-sig or node attestation here
        
        opp.status = OpportunityStatus.PROCESSING;

        emit DeliveryConfirmed(opportunityId, deliveredAmount);
        emit ProcessingStarted(opportunityId);
    }

    /**
     * @notice Report processing completion
     * @param opportunityId The opportunity ID
     * @param outputTokenId Token ID of the processed commodity (minted by operator)
     * @param actualOutputAmount Actual amount of processed output
     */
    function completeProcessing(
        bytes32 opportunityId,
        uint256 outputTokenId,
        uint256 actualOutputAmount
    ) external override onlyOperator(opportunityId) opportunityExists(opportunityId) {
        Opportunity storage opp = opportunities[opportunityId];
        if (opp.status != OpportunityStatus.PROCESSING) revert InvalidStatus();
        if (block.timestamp > opp.processingDeadline) revert ProcessingDeadlinePassed();

        opp.outputTokenId = outputTokenId;
        opp.status = OpportunityStatus.SELLING;

        // Operator should have minted the processed tokens and approved this contract
        // Transfer processed tokens to vault for sale
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
     * @notice Record sale proceeds from CLOB (called by CLOB integration)
     * @param opportunityId The opportunity ID
     * @param proceeds Total proceeds from the sale
     */
    function recordSaleProceeds(
        bytes32 opportunityId,
        uint256 proceeds
    ) external opportunityExists(opportunityId) {
        // In production: only callable by CLOB contract or authorized bridge
        require(msg.sender == clobAddress || msg.sender == owner(), "Not authorized");
        
        Opportunity storage opp = opportunities[opportunityId];
        if (opp.status != OpportunityStatus.SELLING) revert InvalidStatus();

        saleProceeds[opportunityId] = proceeds;
        proceedsFinalized[opportunityId] = true;
        opp.status = OpportunityStatus.DISTRIBUTING;
    }

    /**
     * @notice Cancel an opportunity (only during FUNDING phase)
     * @param opportunityId The opportunity ID
     * @param reason Reason for cancellation
     */
    function cancelOpportunity(
        bytes32 opportunityId,
        string memory reason
    ) external onlyOperator(opportunityId) opportunityExists(opportunityId) {
        Opportunity storage opp = opportunities[opportunityId];
        if (opp.status != OpportunityStatus.FUNDING) revert InvalidStatus();

        opp.status = OpportunityStatus.CANCELLED;

        // Return operator collateral
        if (opp.operatorCollateral > 0) {
            uint256 collateral = opp.operatorCollateral;
            opp.operatorCollateral = 0;
            payable(opp.operator).transfer(collateral);
        }

        emit OpportunityCancelled(opportunityId, reason);
    }

    // ============ STAKER FUNCTIONS ============

    /**
     * @notice Stake commodities into an RWY opportunity
     * @param opportunityId The opportunity to stake into
     * @param amount Amount of commodity tokens to stake
     */
    function stake(
        bytes32 opportunityId,
        uint256 amount
    ) external override nonReentrant whenNotPaused opportunityExists(opportunityId) {
        Opportunity storage opp = opportunities[opportunityId];
        if (opp.status != OpportunityStatus.FUNDING) revert InvalidStatus();
        if (block.timestamp >= opp.fundingDeadline) revert FundingDeadlinePassed();
        if (amount == 0) revert InvalidAmount();
        if (opp.stakedAmount + amount > opp.targetAmount) revert ExceedsTarget();

        // Transfer commodity tokens to vault
        IERC1155(opp.inputToken).safeTransferFrom(
            msg.sender,
            address(this),
            opp.inputTokenId,
            amount,
            ""
        );

        // Update stake tracking
        if (!isStaker[opportunityId][msg.sender]) {
            opportunityStakers[opportunityId].push(msg.sender);
            isStaker[opportunityId][msg.sender] = true;
        }

        stakes[opportunityId][msg.sender].amount += amount;
        stakes[opportunityId][msg.sender].stakedAt = block.timestamp;
        opp.stakedAmount += amount;

        emit CommodityStaked(opportunityId, msg.sender, amount, opp.stakedAmount);

        // Check if fully funded
        if (opp.stakedAmount >= opp.targetAmount) {
            opp.status = OpportunityStatus.FUNDED;
            opp.fundedAt = block.timestamp;
            opp.processingDeadline = block.timestamp + (defaultProcessingDays * 1 days);

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
    ) external override nonReentrant opportunityExists(opportunityId) {
        Opportunity storage opp = opportunities[opportunityId];
        
        // Can only unstake during FUNDING or after CANCELLED
        if (opp.status != OpportunityStatus.FUNDING && 
            opp.status != OpportunityStatus.CANCELLED) {
            revert CannotUnstake();
        }

        Stake storage userStake = stakes[opportunityId][msg.sender];
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
    ) external override nonReentrant opportunityExists(opportunityId) {
        Opportunity storage opp = opportunities[opportunityId];
        if (opp.status != OpportunityStatus.DISTRIBUTING) revert InvalidStatus();
        if (!proceedsFinalized[opportunityId]) revert InvalidStatus();

        Stake storage userStake = stakes[opportunityId][msg.sender];
        if (userStake.amount == 0) revert NoStake();
        if (userStake.claimed) revert AlreadyClaimed();

        userStake.claimed = true;

        // Calculate user's share of proceeds
        uint256 totalProceeds = saleProceeds[opportunityId];
        uint256 userShareBps = (userStake.amount * 10000) / opp.stakedAmount;
        
        // Deduct fees
        uint256 protocolFee = (totalProceeds * protocolFeeBps) / 10000;
        uint256 operatorFee = (totalProceeds * opp.operatorFeeBps) / 10000;
        uint256 distributableProceeds = totalProceeds - protocolFee - operatorFee;
        
        uint256 userShare = (distributableProceeds * userShareBps) / 10000;

        // Transfer quote tokens (AURUM) to user
        if (userShare > 0) {
            IERC20(quoteToken).safeTransfer(msg.sender, userShare);
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
        Opportunity storage opp = opportunities[opportunityId];
        if (opp.status != OpportunityStatus.CANCELLED) revert InvalidStatus();

        Stake storage userStake = stakes[opportunityId][msg.sender];
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

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Approve an operator to create opportunities
     * @param operator Address to approve
     */
    function approveOperator(address operator) external onlyOwner {
        require(operator != address(0), "Invalid address");
        approvedOperators[operator] = true;
        emit OperatorApproved(operator);
    }

    /**
     * @notice Revoke operator approval
     * @param operator Address to revoke
     */
    function revokeOperator(address operator) external onlyOwner {
        approvedOperators[operator] = false;
        emit OperatorRevoked(operator);
    }

    /**
     * @notice Set minimum operator collateral requirement
     * @param bps Basis points (2000 = 20%)
     */
    function setMinCollateralBps(uint256 bps) external onlyOwner {
        require(bps >= 1000 && bps <= 5000, "Invalid range"); // 10-50%
        minOperatorCollateralBps = bps;
    }

    /**
     * @notice Set maximum allowed yield
     * @param bps Basis points (5000 = 50%)
     */
    function setMaxYieldBps(uint256 bps) external onlyOwner {
        require(bps <= 10000, "Invalid yield"); // Max 100%
        maxYieldBps = bps;
    }

    /**
     * @notice Set protocol fee
     * @param bps Basis points (100 = 1%)
     */
    function setProtocolFeeBps(uint256 bps) external onlyOwner {
        require(bps <= 500, "Fee too high"); // Max 5%
        protocolFeeBps = bps;
    }

    /**
     * @notice Set CLOB contract address
     * @param _clob CLOB contract address
     */
    function setCLOBAddress(address _clob) external onlyOwner {
        clobAddress = _clob;
    }

    /**
     * @notice Set quote token address
     * @param _quoteToken Quote token (AURUM) address
     */
    function setQuoteToken(address _quoteToken) external onlyOwner {
        quoteToken = _quoteToken;
    }

    /**
     * @notice Set fee recipient
     * @param _feeRecipient Fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Set default processing days
     * @param _days Number of days
     */
    function setDefaultProcessingDays(uint256 _days) external onlyOwner {
        require(_days > 0 && _days <= 365, "Invalid days");
        defaultProcessingDays = _days;
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Slash operator collateral for failing obligations
     * @param opportunityId The opportunity ID
     * @param amount Amount to slash
     */
    function slashOperator(
        bytes32 opportunityId,
        uint256 amount
    ) external onlyOwner opportunityExists(opportunityId) {
        Opportunity storage opp = opportunities[opportunityId];
        uint256 slashAmount = amount > opp.operatorCollateral ? opp.operatorCollateral : amount;
        
        opp.operatorCollateral -= slashAmount;
        
        // Transfer slashed amount to fee recipient (for distribution to stakers)
        payable(feeRecipient).transfer(slashAmount);
        
        emit OperatorSlashed(opportunityId, opp.operator, slashAmount);
    }

    /**
     * @notice Force cancel an opportunity (emergency use)
     * @param opportunityId The opportunity ID
     * @param reason Reason for cancellation
     */
    function forceCancel(
        bytes32 opportunityId,
        string memory reason
    ) external onlyOwner opportunityExists(opportunityId) {
        Opportunity storage opp = opportunities[opportunityId];
        
        // Can force cancel from any status except COMPLETED
        if (opp.status == OpportunityStatus.COMPLETED) revert InvalidStatus();

        opp.status = OpportunityStatus.CANCELLED;

        emit OpportunityCancelled(opportunityId, reason);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get opportunity details
     * @param opportunityId The opportunity ID
     */
    function getOpportunity(bytes32 opportunityId) external view override returns (Opportunity memory) {
        return opportunities[opportunityId];
    }

    /**
     * @notice Get stake details for a user
     * @param opportunityId The opportunity ID
     * @param staker The staker address
     */
    function getStake(bytes32 opportunityId, address staker) external view override returns (Stake memory) {
        return stakes[opportunityId][staker];
    }

    /**
     * @notice Get all stakers for an opportunity
     * @param opportunityId The opportunity ID
     */
    function getOpportunityStakers(bytes32 opportunityId) external view override returns (address[] memory) {
        return opportunityStakers[opportunityId];
    }

    /**
     * @notice Get total number of opportunities
     */
    function getOpportunityCount() external view override returns (uint256) {
        return opportunityIds.length;
    }

    /**
     * @notice Get all opportunity IDs
     */
    function getAllOpportunities() external view override returns (bytes32[] memory) {
        return opportunityIds;
    }

    /**
     * @notice Check if an address is an approved operator
     * @param operator The address to check
     */
    function isApprovedOperator(address operator) external view override returns (bool) {
        return approvedOperators[operator];
    }

    /**
     * @notice Get operator statistics
     * @param operator The operator address
     */
    function getOperatorStats(address operator) external view returns (
        bool approved,
        uint256 reputation,
        uint256 successfulOps,
        uint256 totalValueProcessed
    ) {
        return (
            approvedOperators[operator],
            operatorReputation[operator],
            operatorSuccessfulOps[operator],
            operatorTotalValueProcessed[operator]
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
        Opportunity memory opp = opportunities[opportunityId];
        
        // Calculate share of the pool
        uint256 totalAfterStake = opp.stakedAmount + stakeAmount;
        userShareBps = (stakeAmount * 10000) / totalAfterStake;
        
        // Expected proceeds = expectedOutput * minSalePrice
        uint256 expectedProceeds = opp.expectedOutputAmount * opp.minSalePrice;
        
        // Deduct fees
        uint256 protocolFee = (expectedProceeds * protocolFeeBps) / 10000;
        uint256 operatorFee = (expectedProceeds * opp.operatorFeeBps) / 10000;
        uint256 distributable = expectedProceeds - protocolFee - operatorFee;
        
        expectedProfit = (distributable * userShareBps) / 10000;
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Check if all stakers have claimed and mark opportunity complete
     */
    function _checkCompletionStatus(bytes32 opportunityId) internal {
        address[] memory stakers = opportunityStakers[opportunityId];
        bool allClaimed = true;
        
        for (uint256 i = 0; i < stakers.length; i++) {
            if (!stakes[opportunityId][stakers[i]].claimed) {
                allClaimed = false;
                break;
            }
        }
        
        if (allClaimed) {
            Opportunity storage opp = opportunities[opportunityId];
            opp.status = OpportunityStatus.COMPLETED;
            opp.completedAt = block.timestamp;
            
            // Update operator stats
            operatorSuccessfulOps[opp.operator]++;
            operatorTotalValueProcessed[opp.operator] += saleProceeds[opportunityId];
            operatorReputation[opp.operator] += 10; // Simple reputation increase
            
            // Return remaining operator collateral
            if (opp.operatorCollateral > 0) {
                uint256 collateral = opp.operatorCollateral;
                opp.operatorCollateral = 0;
                payable(opp.operator).transfer(collateral);
            }
            
            // Transfer protocol fees
            uint256 protocolFee = (saleProceeds[opportunityId] * protocolFeeBps) / 10000;
            if (protocolFee > 0) {
                IERC20(quoteToken).safeTransfer(feeRecipient, protocolFee);
            }
            
            // Transfer operator fees
            uint256 operatorFee = (saleProceeds[opportunityId] * opp.operatorFeeBps) / 10000;
            if (operatorFee > 0) {
                IERC20(quoteToken).safeTransfer(opp.operator, operatorFee);
            }
        }
    }

    /**
     * @notice Receive ETH for operator collateral
     */
    receive() external payable {}
}

