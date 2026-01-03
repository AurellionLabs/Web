// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title DiamondStorage
 * @notice Library to access Diamond AppStorage at a specific storage slot
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
}
