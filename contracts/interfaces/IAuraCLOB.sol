// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAuraCLOB
 * @notice Integrated Central Limit Order Book with Physical Delivery
 * 
 * Flow:
 * 1. Nodes list inventory → Auto-creates sell orders
 * 2. Buyers place buy orders → Matching engine finds best price
 * 3. Orders match → Trade executed, logistics order created
 * 4. Drivers notified → Accept and pick up
 * 5. Delivery confirmed → Settlement and payments
 */
interface IAuraCLOB {
    // ==========================================================================
    // ENUMS
    // ==========================================================================
    
    enum OrderType { LIMIT, MARKET }
    enum OrderStatus { OPEN, PARTIAL, FILLED, CANCELLED }
    enum LogisticsStatus { CREATED, ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, SETTLED, CANCELLED, DISPUTED }
    
    // ==========================================================================
    // STRUCTS
    // ==========================================================================
    
    struct Location {
        string lat;
        string lng;
        string name;
    }
    
    struct MarketOrder {
        bytes32 orderId;
        address maker;
        address nodeId;          // Non-zero if from a node
        address baseToken;       // AuraAsset contract
        uint256 baseTokenId;     // Token ID
        address quoteToken;      // Payment token (USDC, etc.)
        uint256 price;           // Price per unit in quote token
        uint256 quantity;        // Total quantity
        uint256 filledQuantity;
        bool isBuy;
        OrderType orderType;
        OrderStatus status;
        uint256 expiresAt;
        uint256 createdAt;
    }
    
    struct Trade {
        bytes32 tradeId;
        bytes32 buyOrderId;
        bytes32 sellOrderId;
        address buyer;
        address seller;
        address sellerNode;
        uint256 price;
        uint256 quantity;
        uint256 quoteAmount;
        uint256 protocolFee;
        uint256 nodeFee;
        bytes32 logisticsOrderId;
        uint256 timestamp;
    }
    
    struct LogisticsOrder {
        bytes32 orderId;
        bytes32 tradeId;
        address buyer;
        address seller;
        address sellerNode;
        address token;
        uint256 tokenId;
        uint256 quantity;
        uint256 totalPrice;
        uint256 escrowedAmount;
        uint256 driverBounty;
        Location pickupLocation;
        Location deliveryLocation;
        LogisticsStatus status;
        address assignedDriver;
        uint256 createdAt;
        uint256 deliveredAt;
    }
    
    struct DriverInfo {
        address driver;
        bool isActive;
        bool isAvailable;
        Location currentLocation;
        uint256 totalDeliveries;
        uint256 completedDeliveries;
        uint256 totalEarnings;
        uint256 rating;          // Scaled by 100 (450 = 4.50)
    }
    
    // ==========================================================================
    // EVENTS - Order Book
    // ==========================================================================
    
    event OrderPlaced(
        bytes32 indexed orderId,
        address indexed maker,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint256 price,
        uint256 quantity,
        bool isBuy,
        OrderType orderType
    );
    
    event OrderCancelled(
        bytes32 indexed orderId,
        address indexed maker,
        uint256 remainingQuantity
    );
    
    event OrderMatched(
        bytes32 indexed tradeId,
        bytes32 indexed buyOrderId,
        bytes32 indexed sellOrderId,
        uint256 price,
        uint256 quantity,
        uint256 quoteAmount
    );
    
    // ==========================================================================
    // EVENTS - Logistics
    // ==========================================================================
    
    event LogisticsOrderCreated(
        bytes32 indexed orderId,
        bytes32 indexed tradeId,
        address indexed buyer,
        address seller,
        address sellerNode,
        address token,
        uint256 tokenId,
        uint256 quantity,
        uint256 totalPrice,
        uint256 driverBounty,
        Location pickupLocation,
        Location deliveryLocation
    );
    
    event DriverNotified(
        bytes32 indexed orderId,
        address indexed driver,
        Location pickupLocation,
        Location deliveryLocation,
        uint256 bountyAmount,
        uint256 estimatedDistance,
        uint256 expiresAt
    );
    
    event DriverAssigned(
        bytes32 indexed orderId,
        address indexed driver,
        uint256 estimatedPickupTime,
        uint256 estimatedDeliveryTime,
        uint256 bountyAmount
    );
    
    event PackagePickedUp(
        bytes32 indexed orderId,
        address indexed driver,
        bytes32 signature,
        Location location
    );
    
    event DriverLocationUpdated(
        bytes32 indexed orderId,
        address indexed driver,
        Location location
    );
    
    event PackageDelivered(
        bytes32 indexed orderId,
        address indexed driver,
        address indexed receiver,
        bytes32 signature,
        Location location
    );
    
    // ==========================================================================
    // EVENTS - Settlement
    // ==========================================================================
    
    event OrderSettled(bytes32 indexed orderId);
    
    event SellerPaid(
        bytes32 indexed orderId,
        address indexed seller,
        uint256 amount,
        address token
    );
    
    event NodeFeePaid(
        bytes32 indexed orderId,
        address indexed node,
        uint256 amount,
        address token
    );
    
    event DriverPaid(
        bytes32 indexed orderId,
        address indexed driver,
        uint256 amount,
        address token
    );
    
    // ==========================================================================
    // ORDER BOOK FUNCTIONS
    // ==========================================================================
    
    /**
     * @notice Place a limit or market order
     * @param baseToken The asset token contract (AuraAsset)
     * @param baseTokenId The specific token ID
     * @param quoteToken The payment token (USDC, etc.)
     * @param price Price per unit (0 for market orders)
     * @param quantity Number of tokens to buy/sell
     * @param isBuy True for buy order, false for sell
     * @param orderType LIMIT or MARKET
     * @param deliveryLocation Where to deliver (for buy orders)
     * @return orderId The unique order identifier
     */
    function placeOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint256 price,
        uint256 quantity,
        bool isBuy,
        OrderType orderType,
        Location calldata deliveryLocation
    ) external returns (bytes32 orderId);
    
    /**
     * @notice Cancel an open order
     * @param orderId The order to cancel
     */
    function cancelOrder(bytes32 orderId) external;
    
    /**
     * @notice Get order details
     */
    function getOrder(bytes32 orderId) external view returns (MarketOrder memory);
    
    /**
     * @notice Get best bid and ask for a trading pair
     */
    function getOrderBook(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) external view returns (
        uint256 bestBid,
        uint256 bestAsk,
        uint256 bidDepth,
        uint256 askDepth
    );
    
    // ==========================================================================
    // NODE INVENTORY FUNCTIONS
    // ==========================================================================
    
    /**
     * @notice Node lists inventory (creates sell order automatically)
     * @dev Called by AurumNodeManager when SupportedAssetAdded
     */
    function listNodeInventory(
        address node,
        address token,
        uint256 tokenId,
        uint256 price,
        uint256 quantity
    ) external returns (bytes32 orderId);
    
    /**
     * @notice Update node inventory price
     */
    function updateNodePrice(
        address node,
        address token,
        uint256 tokenId,
        uint256 newPrice
    ) external;
    
    /**
     * @notice Update node inventory quantity
     */
    function updateNodeQuantity(
        address node,
        address token,
        uint256 tokenId,
        uint256 newQuantity
    ) external;
    
    // ==========================================================================
    // DRIVER FUNCTIONS
    // ==========================================================================
    
    /**
     * @notice Register as a driver
     */
    function registerDriver() external;
    
    /**
     * @notice Update driver availability
     */
    function setDriverAvailability(bool isAvailable) external;
    
    /**
     * @notice Update driver location (for matching)
     */
    function updateDriverLocation(Location calldata location) external;
    
    /**
     * @notice Accept a delivery assignment
     * @param orderId The logistics order to accept
     * @param estimatedPickupTime ETA for pickup
     * @param estimatedDeliveryTime ETA for delivery
     */
    function acceptDelivery(
        bytes32 orderId,
        uint256 estimatedPickupTime,
        uint256 estimatedDeliveryTime
    ) external;
    
    /**
     * @notice Confirm package pickup
     * @param orderId The logistics order
     * @param signature Seller's signature confirming handoff
     * @param location Current GPS location
     */
    function confirmPickup(
        bytes32 orderId,
        bytes calldata signature,
        Location calldata location
    ) external;
    
    /**
     * @notice Update location during transit
     */
    function updateDeliveryLocation(
        bytes32 orderId,
        Location calldata location
    ) external;
    
    /**
     * @notice Confirm package delivery
     * @param orderId The logistics order
     * @param receiverSignature Buyer's signature confirming receipt
     * @param location Delivery GPS location
     */
    function confirmDelivery(
        bytes32 orderId,
        bytes calldata receiverSignature,
        Location calldata location
    ) external;
    
    // ==========================================================================
    // SETTLEMENT FUNCTIONS
    // ==========================================================================
    
    /**
     * @notice Settle order and release funds (called after delivery confirmed)
     */
    function settleOrder(bytes32 orderId) external;
    
    /**
     * @notice Dispute a delivery
     */
    function disputeOrder(bytes32 orderId, string calldata reason) external;
    
    // ==========================================================================
    // VIEW FUNCTIONS
    // ==========================================================================
    
    function getTrade(bytes32 tradeId) external view returns (Trade memory);
    function getLogisticsOrder(bytes32 orderId) external view returns (LogisticsOrder memory);
    function getDriverInfo(address driver) external view returns (DriverInfo memory);
    function getNodeInventory(address node, address token, uint256 tokenId) 
        external view returns (uint256 available, uint256 reserved, uint256 price);
}

