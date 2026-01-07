// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { CLOBLib } from './CLOBLib.sol';

/**
 * @title DiamondStorage
 * @notice Library to access Diamond AppStorage at a specific storage slot
 * @dev Production-ready storage with gas-optimized CLOB structures
 */
library DiamondStorage {
    bytes32 constant APP_STORAGE_POSITION = keccak256('diamond.app.storage');

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
        mapping(bytes32 => mapping(uint256 => NodeAsset)) nodeAssets;
        mapping(bytes32 => uint256[]) nodeAssetIds;
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
        uint256 rewardRate;
        uint256 lastUpdateTime;
        uint256 rewardPerTokenStored;
        mapping(address => uint256) userRewardPerTokenPaid;
        mapping(address => uint256) rewards;

        // ======= TOKEN ADDRESSES =======
        address auraAssetAddress;

        // ======= NODE TOKEN INVENTORY =======
        // Internal accounting: nodeHash => tokenId => balance
        // Tracks how many tokens each node "owns" within the Diamond
        mapping(bytes32 => mapping(uint256 => uint256)) nodeTokenBalances;
        // Track all token IDs a node has ever held (for enumeration)
        mapping(bytes32 => uint256[]) nodeTokenIds;
        // Quick lookup: does node have this token ID in their list?
        mapping(bytes32 => mapping(uint256 => bool)) nodeHasToken;

        // ======= BRIDGE =======
        address clobAddress;
        address ausysAddress;
        address quoteTokenAddress;
        mapping(bytes32 => UnifiedOrder) unifiedOrders;
        bytes32[] unifiedOrderIds;
        uint256 totalUnifiedOrders;
        address feeRecipient;
        uint256 protocolFeePercentage;
        uint256 bountyPercentage;
        mapping(bytes32 => Journey) journeys;
        mapping(bytes32 => bytes32[]) orderJourneys;
        mapping(bytes32 => uint256) totalJourneys;

        // ======= CLOB =======
        mapping(bytes32 => Market) markets;
        bytes32[] marketIds;
        uint256 totalMarkets;
        mapping(bytes32 => CLOBOrder) clobOrders;
        bytes32[] clobOrderIds;
        uint256 totalCLOBOrders;
        mapping(bytes32 => Trade) trades;
        bytes32[] tradeIds;
        uint256 totalTrades;
        mapping(bytes32 => LiquidityPool) pools;
        bytes32[] poolIds;
        uint256 totalPools;
        mapping(bytes32 => mapping(uint256 => bytes32[])) bidOrders;
        mapping(bytes32 => mapping(uint256 => bytes32[])) askOrders;
        mapping(bytes32 => uint256[]) bidPrices;
        mapping(bytes32 => uint256[]) askPrices;

        // ======= CLOB V2 - PRODUCTION READY =======
        // Packed orders for gas efficiency (3 slots instead of 10)
        mapping(bytes32 => PackedOrder) packedOrders;
        uint256 orderNonce;  // Global nonce for unique order IDs
        
        // Red-Black Trees for O(log n) price level management
        // Flattened structure for Diamond storage compatibility
        // marketId => tree metadata
        mapping(bytes32 => RBTreeMeta) bidTreeMeta;
        mapping(bytes32 => RBTreeMeta) askTreeMeta;
        // marketId => price => node data
        mapping(bytes32 => mapping(uint256 => RBNode)) bidTreeNodes;
        mapping(bytes32 => mapping(uint256 => RBNode)) askTreeNodes;
        
        // Price level FIFO queues: marketId => price => PriceLevel
        mapping(bytes32 => mapping(uint256 => PriceLevel)) bidLevels;
        mapping(bytes32 => mapping(uint256 => PriceLevel)) askLevels;
        
        // Order queue nodes for FIFO within price levels
        mapping(bytes32 => OrderQueueNode) orderQueue;
        
        // MEV Protection: Commit-Reveal
        mapping(bytes32 => CommittedOrder) committedOrders;
        uint8 minRevealDelay;  // Minimum blocks between commit and reveal
        uint256 commitmentThreshold;  // Order size threshold requiring commit-reveal
        
        // Circuit Breakers
        mapping(bytes32 => CircuitBreaker) circuitBreakers;
        uint256 defaultPriceChangeThreshold;  // Default: 1000 = 10%
        uint256 defaultCooldownPeriod;  // Default: 5 minutes
        
        // Emergency Recovery
        mapping(bytes32 => EmergencyAction) pendingEmergencyActions;
        uint256 emergencyTimelock;  // Default: 48 hours
        mapping(address => uint256) userEmergencyWithdrawals;
        
        // Fee configuration (basis points, 100 = 1%)
        uint16 takerFeeBps;
        uint16 makerFeeBps;
        uint16 lpFeeBps;
        
        // Rate limiting
        mapping(address => RateLimit) userRateLimits;
        uint256 maxOrdersPerBlock;
        uint256 maxVolumePerBlock;

        // ======= VERSIONING =======
        uint256 version;
        string versionString;

        // ======= PAUSE =======
        bool paused;
        uint256 pauseStartTime;

        // ======= RESERVED =======
        uint256[50] __reserved1;
        mapping(bytes32 => uint256) __reserved2;
    }
    
    // ============================================================================
    // PRODUCTION CLOB STRUCTS
    // ============================================================================
    
    /// @notice Gas-optimized order storage (3 slots instead of 10)
    struct PackedOrder {
        // Slot 1: maker(160) | isBuy(1) | orderType(2) | status(2) | timeInForce(3) | nonce(88)
        uint256 makerAndFlags;
        // Slot 2: price(96) | amount(96) | filledAmount(64)
        uint256 priceAmountFilled;
        // Slot 3: expiry(40) | createdAt(40) | marketIndex(32) | baseToken(160) - for token reference
        uint256 expiryAndMeta;
        // Slot 4: marketId for lookups (could be computed but stored for efficiency)
        bytes32 marketId;
    }
    
    /// @notice Price level with FIFO queue of orders
    struct PriceLevel {
        bytes32 head;       // First order in queue
        bytes32 tail;       // Last order in queue
        uint256 totalAmount;
        uint256 orderCount;
    }
    
    /// @notice Order queue node for FIFO within price level
    struct OrderQueueNode {
        bytes32 prev;
        bytes32 next;
        uint256 price;  // Store price for quick access during removal
    }
    
    /// @notice Committed order for MEV protection
    struct CommittedOrder {
        bytes32 commitment;  // keccak256(order params + salt)
        uint256 commitBlock;
        address committer;
        bool revealed;
        bool expired;
    }
    
    /// @notice Circuit breaker configuration per market
    struct CircuitBreaker {
        uint256 lastPrice;
        uint256 priceChangeThreshold;  // Basis points (1000 = 10%)
        uint256 cooldownPeriod;
        uint256 tripTimestamp;
        bool isTripped;
        bool isEnabled;
    }
    
    /// @notice Emergency action pending timelock
    struct EmergencyAction {
        address initiator;
        address token;
        address recipient;
        uint256 amount;
        uint256 initiatedAt;
        bool executed;
        bool cancelled;
    }
    
    /// @notice Rate limiting per user
    struct RateLimit {
        uint256 lastBlock;
        uint256 ordersThisBlock;
        uint256 volumeThisBlock;
    }
    
    /// @notice Red-Black Tree metadata (root and count)
    struct RBTreeMeta {
        uint256 root;
        uint256 count;
    }
    
    /// @notice Red-Black Tree node
    struct RBNode {
        uint256 parent;
        uint256 left;
        uint256 right;
        uint8 color;      // 0 = RED, 1 = BLACK
        bool exists;
        uint256 totalAmount;  // Aggregate amount at this price level
        uint256 orderCount;   // Number of orders at this price
    }
    
    /// @notice Enhanced market with token addresses
    struct MarketV2 {
        address baseToken;
        uint256 baseTokenId;
        address quoteToken;
        bool active;
        uint256 createdAt;
        uint256 lastTradePrice;
        uint256 volume24h;
        uint256 trades24h;
    }

    struct Node {
        address owner;
        string nodeType;
        uint256 capacity;
        uint256 createdAt;
        bool active;
        bool validNode;
        bytes32 assetHash;
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

    struct Asset {
        string name;
        string assetClass;
        string[] attributes;
        uint256 createdAt;
        bool active;
    }

    struct Order {
        address buyer;
        address seller;
        bytes32 orderHash;
        uint256 price;
        uint256 amount;
        string status;
        uint256 createdAt;
    }

    struct Stake {
        uint256 amount;
        uint256 rewards;
        uint256 stakedAt;
    }

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
        uint8 status;
        uint8 logisticsStatus;
        uint256 createdAt;
        uint256 matchedAt;
        uint256 deliveredAt;
        uint256 settledAt;
    }

    struct Journey {
        bytes32 unifiedOrderId;
        address driver;
        uint8 phase;
        uint256 createdAt;
        uint256 updatedAt;
    }

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
        uint8 orderType;
        uint8 status;
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
    
    /// @notice Enhanced trade with more details for indexing
    struct TradeV2 {
        bytes32 takerOrderId;
        bytes32 makerOrderId;
        address taker;
        address maker;
        bytes32 marketId;
        uint256 price;
        uint256 amount;
        uint256 quoteAmount;
        uint256 takerFee;
        uint256 makerFee;
        uint256 timestamp;
        bool takerIsBuy;
    }

    function appStorage() internal pure returns (AppStorage storage ds) {
        bytes32 position = APP_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}

// Helper functions for common operations
library AppStorageLib {
    using DiamondStorage for DiamondStorage.AppStorage;

    function s() internal pure returns (DiamondStorage.AppStorage storage) {
        return DiamondStorage.appStorage();
    }

    // Node functions
    function getNode(bytes32 nodeHash) internal view returns (DiamondStorage.Node storage) {
        return s().nodes[nodeHash];
    }

    function isNodeOwner(bytes32 nodeHash, address account) internal view returns (bool) {
        return s().nodes[nodeHash].owner == account;
    }

    // Asset functions
    function getAsset(uint256 assetId) internal view returns (DiamondStorage.Asset storage) {
        return s().assets[assetId];
    }

    // Order functions
    function getOrder(bytes32 orderHash) internal view returns (DiamondStorage.Order storage) {
        return s().orders[orderHash];
    }

    // Stake functions
    function getStake(address user) internal view returns (DiamondStorage.Stake storage) {
        return s().stakes[user];
    }

    // Unified order functions
    function getUnifiedOrder(bytes32 orderId) internal view returns (DiamondStorage.UnifiedOrder storage) {
        return s().unifiedOrders[orderId];
    }

    // CLOB functions
    function getCLOBOrder(bytes32 orderId) internal view returns (DiamondStorage.CLOBOrder storage) {
        return s().clobOrders[orderId];
    }

    function getTrade(bytes32 tradeId) internal view returns (DiamondStorage.Trade storage) {
        return s().trades[tradeId];
    }

    function getPool(bytes32 poolId) internal view returns (DiamondStorage.LiquidityPool storage) {
        return s().pools[poolId];
    }

    function getMarket(bytes32 marketId) internal view returns (DiamondStorage.Market storage) {
        return s().markets[marketId];
    }

    function getNodeAsset(bytes32 nodeHash, uint256 assetId) internal view returns (DiamondStorage.NodeAsset storage) {
        return s().nodeAssets[nodeHash][assetId];
    }
    
    // Production CLOB functions
    function getPackedOrder(bytes32 orderId) internal view returns (DiamondStorage.PackedOrder storage) {
        return s().packedOrders[orderId];
    }
    
    function getCircuitBreaker(bytes32 marketId) internal view returns (DiamondStorage.CircuitBreaker storage) {
        return s().circuitBreakers[marketId];
    }
    
    function getCommittedOrder(bytes32 commitmentId) internal view returns (DiamondStorage.CommittedOrder storage) {
        return s().committedOrders[commitmentId];
    }
    
    function getPriceLevel(bytes32 marketId, uint256 price, bool isBid) internal view returns (DiamondStorage.PriceLevel storage) {
        if (isBid) {
            return s().bidLevels[marketId][price];
        } else {
            return s().askLevels[marketId][price];
        }
    }
}
