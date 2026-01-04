// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IRWYVault
 * @notice Interface for the Real World Yield Vault
 * @dev Users stake ERC1155 commodities, operators process them, profits distributed via CLOB
 */
interface IRWYVault {
    // ============ ENUMS ============
    
    enum OpportunityStatus {
        PENDING,      // Created, awaiting funding
        FUNDING,      // Accepting stakes
        FUNDED,       // Fully funded, ready for delivery
        IN_TRANSIT,   // Commodities being delivered to operator
        PROCESSING,   // Operator processing commodities
        SELLING,      // Processed goods listed on CLOB
        DISTRIBUTING, // Profits being distributed
        COMPLETED,    // All profits distributed
        CANCELLED     // Opportunity cancelled, refunds available
    }

    // ============ STRUCTS ============

    struct Opportunity {
        bytes32 id;
        address operator;
        string name;
        string description;
        
        // Input commodity (what stakers provide)
        address inputToken;           // AuraAsset contract
        uint256 inputTokenId;         // Token ID for input commodity
        uint256 targetAmount;         // Total amount needed
        uint256 stakedAmount;         // Current amount staked
        
        // Output commodity (what operator produces)
        address outputToken;          // AuraAsset contract (can be same)
        uint256 outputTokenId;        // Token ID for processed commodity
        uint256 expectedOutputAmount; // Expected output quantity
        
        // Economics
        uint256 promisedYieldBps;     // Promised yield in basis points (1500 = 15%)
        uint256 operatorFeeBps;       // Operator fee in basis points
        uint256 minSalePrice;         // Minimum acceptable sale price per unit
        
        // Timeline
        uint256 fundingDeadline;      // Deadline to reach funding goal
        uint256 processingDeadline;   // Deadline for processing completion
        uint256 createdAt;
        uint256 fundedAt;
        uint256 completedAt;
        
        // Status
        OpportunityStatus status;
        
        // Collateral
        uint256 operatorCollateral;   // Operator's staked collateral
    }

    struct Stake {
        uint256 amount;
        uint256 stakedAt;
        bool claimed;
    }

    // ============ EVENTS ============

    event OpportunityCreated(
        bytes32 indexed opportunityId,
        address indexed operator,
        address inputToken,
        uint256 inputTokenId,
        uint256 targetAmount,
        uint256 promisedYieldBps
    );

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

    event OpportunityFunded(
        bytes32 indexed opportunityId,
        uint256 totalAmount
    );

    event DeliveryStarted(
        bytes32 indexed opportunityId,
        bytes32 journeyId
    );

    event DeliveryConfirmed(
        bytes32 indexed opportunityId,
        uint256 deliveredAmount
    );

    event ProcessingStarted(
        bytes32 indexed opportunityId
    );

    event ProcessingCompleted(
        bytes32 indexed opportunityId,
        uint256 outputAmount,
        uint256 outputTokenId
    );

    event SaleOrderCreated(
        bytes32 indexed opportunityId,
        bytes32 indexed clobOrderId,
        uint256 amount,
        uint256 price
    );

    event ProfitDistributed(
        bytes32 indexed opportunityId,
        address indexed staker,
        uint256 principal,
        uint256 profit
    );

    event OpportunityCancelled(
        bytes32 indexed opportunityId,
        string reason
    );

    event OperatorSlashed(
        bytes32 indexed opportunityId,
        address indexed operator,
        uint256 slashedAmount
    );

    event OperatorApproved(address indexed operator);
    event OperatorRevoked(address indexed operator);

    // ============ OPERATOR FUNCTIONS ============

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
    ) external payable returns (bytes32);

    function confirmDelivery(
        bytes32 opportunityId,
        uint256 deliveredAmount
    ) external;

    function completeProcessing(
        bytes32 opportunityId,
        uint256 outputTokenId,
        uint256 actualOutputAmount
    ) external;

    // ============ STAKER FUNCTIONS ============

    function stake(
        bytes32 opportunityId,
        uint256 amount
    ) external;

    function unstake(
        bytes32 opportunityId,
        uint256 amount
    ) external;

    function claimProfits(
        bytes32 opportunityId
    ) external;

    // ============ VIEW FUNCTIONS ============

    function getOpportunity(bytes32 opportunityId) external view returns (Opportunity memory);
    function getStake(bytes32 opportunityId, address staker) external view returns (Stake memory);
    function getOpportunityStakers(bytes32 opportunityId) external view returns (address[] memory);
    function getOpportunityCount() external view returns (uint256);
    function getAllOpportunities() external view returns (bytes32[] memory);
    function isApprovedOperator(address operator) external view returns (bool);
}

