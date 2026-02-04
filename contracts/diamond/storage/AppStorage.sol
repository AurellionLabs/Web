// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title AppStorage
 * @notice Storage layout for the Diamond proxy
 * @dev CRITICAL: Never change the order or type of existing state variables
 */
struct AppStorage {
    // ======= OWNERSHIP =======
    address owner;
    address pendingOwner;
    bool initialized;

    // ======= NODES =======
    mapping(bytes32 => Node) nodes;
    mapping(address => bytes32[]) ownerNodes;
    address[] nodeList;
    uint256 totalNodes;
    // Node assets mapping: nodeHash => assetId => NodeAsset
    mapping(bytes32 => mapping(uint256 => NodeAsset)) nodeAssets;
    // Node asset IDs for each node
    mapping(bytes32 => uint256[]) nodeAssetIds;
    // Track total assets per node
    mapping(bytes32 => uint256) totalNodeAssets;

    // ======= ASSETS =======
    mapping(uint256 => Asset) assets;
    mapping(bytes32 => uint256) assetByHash;
    uint256 totalAssets;
    mapping(string => bool) supportedClasses;
    string[] classList;

    // ======= ORDERS =======
    mapping(bytes32 => Order) orders;
    address[] orderList;
    uint256 totalOrders;

    // ======= STAKING =======
    mapping(address => Stake) stakes;
    uint256 totalStaked;
    // Staking reward tracking
    uint256 rewardRate; // Basis points
    uint256 lastUpdateTime;
    uint256 rewardPerTokenStored;
    mapping(address => uint256) userRewardPerTokenPaid;
    mapping(address => uint256) rewards;

    // ======= BRIDGE =======
    address clobAddress;
    address ausysAddress;
    address quoteTokenAddress;
    // Unified orders for bridging
    mapping(bytes32 => UnifiedOrder) unifiedOrders;
    bytes32[] unifiedOrderIds;
    uint256 totalUnifiedOrders;
    // Fee configuration
    address feeRecipient;
    uint256 protocolFeePercentage;
    uint256 bountyPercentage;
    // Journey tracking
    mapping(bytes32 => Journey) journeys;
    mapping(bytes32 => bytes32[]) orderJourneys;
    mapping(bytes32 => uint256) totalJourneys;

    // ======= CLOB =======
    // Markets
    mapping(bytes32 => Market) markets;
    bytes32[] marketIds;
    uint256 totalMarkets;
    // CLOB Orders
    mapping(bytes32 => CLOBOrder) clobOrders;
    bytes32[] clobOrderIds;
    uint256 totalCLOBOrders;
    // Trades
    mapping(bytes32 => Trade) trades;
    bytes32[] tradeIds;
    uint256 totalTrades;
    // Liquidity Pools
    mapping(bytes32 => LiquidityPool) pools;
    bytes32[] poolIds;
    uint256 totalPools;
    // Order book storage
    mapping(bytes32 => mapping(uint256 => bytes32[])) bidOrders;
    mapping(bytes32 => mapping(uint256 => bytes32[])) askOrders;
    mapping(bytes32 => uint256[]) bidPrices;
    mapping(bytes32 => uint256[]) askPrices;

    // ======= VERSIONING =======
    uint256 version;
    string versionString;

    // ======= PAUSE =======
    bool paused;
    uint256 pauseStartTime;

    // ======= NODE SUPPORTING DOCUMENTS =======
    // nodeHash => document index => SupportingDocument
    mapping(bytes32 => mapping(uint256 => SupportingDocument)) nodeSupportingDocuments;
    // nodeHash => array of document indices
    mapping(bytes32 => uint256[]) nodeSupportingDocumentIds;
    // nodeHash => total documents count
    mapping(bytes32 => uint256) totalNodeSupportingDocuments;

    // ======= RESERVED =======
    // Reserved space for future upgrades
    uint256[50] __reserved1;
    mapping(bytes32 => uint256) __reserved2;
}

// ======= NODE STRUCTS =======
struct Node {
    address owner;
    string nodeType;
    uint256 capacity;
    uint256 createdAt;
    bool active;
    bool validNode;
    bytes32 assetHash;
    // Location data
    string addressName;
    string lat;
    string lng;
}

struct NodeAsset {
    address token;
    uint256 tokenId;
    uint256 price;
    uint256 capacity;
    uint256 createdAt;
    bool active;
}

struct SupportingDocument {
    string url;
    string title;
    string description;
    string documentType;
    bool isFrozen;
    bool isRemoved;
    uint256 addedAt;
    uint256 removedAt;
    address addedBy;
    address removedBy;
}

struct Location {
    string addressName;
    string lat;
    string lng;
}

// ======= ASSET STRUCTS =======
struct Asset {
    string name;
    string assetClass;
    string[] attributes;
    uint256 createdAt;
    bool active;
}

// ======= ORDER STRUCTS =======
struct Order {
    address buyer;
    address seller;
    bytes32 orderHash;
    uint256 price;
    uint256 amount;
    string status;
    uint256 createdAt;
}

// ======= STAKE STRUCTS =======
struct Stake {
    uint256 amount;
    uint256 rewards;
    uint256 stakedAt;
}

// ======= BRIDGE STRUCTS =======
struct UnifiedOrder {
    bytes32 clobOrderId;
    bytes32 clobTradeId;
    bytes32 ausysOrderId;
    address buyer;
    address seller;
    address sellerNode;
    address token;
    uint256 tokenId;
    uint256 tokenQuantity;
    uint256 price;
    uint256 bounty;
    uint8 status; // 0: Created, 1: Bridged, 2: InTransit, 3: Delivered, 4: Completed, 5: Cancelled
    uint8 logisticsStatus;
    uint256 createdAt;
    uint256 matchedAt;
    uint256 deliveredAt;
    uint256 settledAt;
}

struct ParcelData {
    uint256 lat;
    uint256 lng;
    string startName;
    string endName;
}

struct Journey {
    bytes32 unifiedOrderId;
    address driver;
    uint8 phase; // 0: Pending, 1: PickedUp, 2: InTransit, 3: Delivered
    uint256 createdAt;
    uint256 updatedAt;
}

// ======= CLOB STRUCTS =======
struct Market {
    string baseToken;
    uint256 baseTokenId;
    string quoteToken;
    bool active;
    uint256 createdAt;
}

struct CLOBOrder {
    address maker;
    bytes32 marketId;
    uint256 price;
    uint256 amount;
    uint256 filledAmount;
    bool isBuy;
    uint8 orderType; // 0: Limit, 1: Market
    uint8 status; // 0: Open, 1: PartiallyFilled, 2: Filled, 3: Cancelled
    uint256 createdAt;
    uint256 updatedAt;
}

struct Trade {
    bytes32 takerOrderId;
    bytes32 makerOrderId;
    address taker;
    address maker;
    bytes32 marketId;
    uint256 price;
    uint256 amount;
    uint256 quoteAmount;
    uint256 timestamp;
    uint256 createdAt;
}

struct LiquidityPool {
    string baseToken;
    uint256 baseTokenId;
    string quoteToken;
    uint256 baseReserve;
    uint256 quoteReserve;
    uint256 totalLpTokens;
    bool isActive;
    uint256 createdAt;
}
