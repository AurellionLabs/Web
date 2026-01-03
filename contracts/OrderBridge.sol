// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

/**
 * @title OrderBridge
 * @notice Orchestrates unified order flow: CLOB trading → Ausys logistics
 * 
 * Flow:
 * 1. Buyer places order via CLOB (price discovery, matching)
 * 2. Trade executes → Bridge auto-creates Ausys logistics order
 * 3. Multi-node journey handles physical delivery
 * 4. Settlement releases funds when delivery confirmed
 * 
 * @dev This contract bridges the CLOB trading system with the Ausys logistics system,
 * creating a unified order experience where trading and delivery are seamlessly connected.
 */
contract OrderBridge is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =============================================================================
    // Enums
    // =============================================================================

    enum UnifiedOrderStatus {
        None,               // Order doesn't exist
        PendingTrade,       // Order placed on CLOB, waiting for match
        TradeMatched,       // Trade executed, awaiting logistics
        LogisticsCreated,   // Ausys order created
        InTransit,          // Package picked up
        Delivered,          // Package delivered
        Settled,            // All payments distributed
        Cancelled           // Order cancelled
    }

    enum LogisticsPhase {
        None,
        Pending,            // Waiting for pickup
        InTransit,          // Package in transit
        Delivered           // Package delivered
    }

    // =============================================================================
    // Structs
    // =============================================================================

    struct Location {
        int256 lat;
        int256 lng;
    }

    struct ParcelData {
        Location startLocation;
        Location endLocation;
        string startName;
        string endName;
    }

    struct UnifiedOrder {
        bytes32 id;                    // Unified order ID
        bytes32 clobOrderId;           // CLOB order ID
        bytes32 clobTradeId;           // CLOB trade ID (when matched)
        bytes32 ausysOrderId;          // Ausys order ID
        bytes32[] journeyIds;          // Ausys journey IDs
        address buyer;
        address seller;
        address sellerNode;
        address token;
        uint256 tokenId;
        uint256 tokenQuantity;
        uint256 price;                 // Total price in quote token
        uint256 bounty;                // Driver bounty
        ParcelData deliveryData;       // Delivery location
        UnifiedOrderStatus status;
        LogisticsPhase logisticsStatus;
        uint256 createdAt;
        uint256 matchedAt;             // When trade executed
        uint256 deliveredAt;           // When package delivered
        uint256 settledAt;             // When funds distributed
    }

    // =============================================================================
    // State Variables
    // =============================================================================

    address public clobAddress;
    address public ausysAddress;
    IERC20 public quoteToken;          // Payment token (USDT, USDC, etc.)

    // Order tracking
    mapping(bytes32 => UnifiedOrder) public unifiedOrders;
    bytes32[] public unifiedOrderIds;
    uint256 public unifiedOrderCounter;

    // CLOB Trade → Unified Order mapping
    mapping(bytes32 => bytes32) public clobTradeToUnifiedOrder;
    mapping(bytes32 => bytes32) public clobOrderToUnifiedOrder;

    // Reverse lookups
    mapping(address => bytes32[]) public buyerOrders;
    mapping(address => bytes32[]) public sellerOrders;

    // Configuration
    uint256 public bountyPercentage = 200; // 2% of order value
    uint256 public protocolFeePercentage = 25; // 0.25%
    address public feeRecipient;

    // =============================================================================
    // Events
    // =============================================================================

    event UnifiedOrderCreated(
        bytes32 indexed unifiedOrderId,
        bytes32 indexed clobOrderId,
        address indexed buyer,
        address seller,
        address token,
        uint256 tokenId,
        uint256 quantity,
        uint256 price
    );

    event TradeMatched(
        bytes32 indexed unifiedOrderId,
        bytes32 indexed clobTradeId,
        bytes32 clobOrderId,
        address maker,
        uint256 price,
        uint256 amount
    );

    event LogisticsOrderCreated(
        bytes32 indexed unifiedOrderId,
        bytes32 indexed ausysOrderId,
        bytes32[] journeyIds,
        uint256 bounty,
        address node
    );

    event JourneyStatusUpdated(
        bytes32 indexed unifiedOrderId,
        bytes32 indexed journeyId,
        uint8 phase
    );

    event OrderStatusUpdated(
        bytes32 indexed unifiedOrderId,
        uint8 status
    );

    event OrderSettled(
        bytes32 indexed unifiedOrderId,
        address indexed seller,
        uint256 sellerAmount,
        address indexed driver,
        uint256 driverAmount
    );

    event OrderCancelled(
        bytes32 indexed unifiedOrderId,
        uint8 previousStatus,
        uint256 refundedAmount
    );

    // =============================================================================
    // Custom Errors
    // =============================================================================

    error InvalidAddress();
    error InvalidAmount();
    error InvalidPrice();
    error InvalidFeeConfiguration();
    error OrderNotFound();
    error NotOrderOwner();
    error OrderNotOpen();
    error NotAuthorized();

    // =============================================================================
    // Constructor
    // =============================================================================

    constructor(
        address _clob,
        address _ausys,
        address _quoteToken,
        address _feeRecipient
    ) {
        clobAddress = _clob;
        ausysAddress = _ausys;
        quoteToken = IERC20(_quoteToken);
        feeRecipient = _feeRecipient;
    }

    // =============================================================================
    // External Functions - Order Management
    // =============================================================================

    /**
     * @notice Create a unified order that bridges CLOB trading with Ausys logistics
     * @param clobOrderId The order ID from CLOB placement
     * @param sellerNode The node selling the asset
     * @param deliveryData Delivery location information
     * @return unifiedOrderId The unified order identifier
     */
    function createUnifiedOrder(
        bytes32 clobOrderId,
        address sellerNode,
        ParcelData calldata deliveryData
    ) external nonReentrant returns (bytes32 unifiedOrderId) {
        // Validate seller node
        if (sellerNode == address(0)) revert InvalidAddress();

        // Create unified order
        unifiedOrderId = _generateUnifiedOrderId();
        UnifiedOrder storage order = unifiedOrders[unifiedOrderId];

        order.id = unifiedOrderId;
        order.clobOrderId = clobOrderId;
        order.buyer = msg.sender;
        order.sellerNode = sellerNode;
        order.deliveryData = deliveryData;
        order.status = UnifiedOrderStatus.PendingTrade;
        order.logisticsStatus = LogisticsPhase.None;
        order.createdAt = block.timestamp;

        // Store mappings
        unifiedOrderIds.push(unifiedOrderId);
        clobOrderToUnifiedOrder[clobOrderId] = unifiedOrderId;
        buyerOrders[msg.sender].push(unifiedOrderId);

        emit UnifiedOrderCreated(
            unifiedOrderId,
            clobOrderId,
            msg.sender,
            address(0),
            address(0),
            0,
            0,
            0
        );

        return unifiedOrderId;
    }

    /**
     * @notice Bridge function: Called when CLOB trade is executed
     * @param unifiedOrderId The unified order to bridge
     */
    function bridgeTradeToLogistics(bytes32 unifiedOrderId) external nonReentrant {
        UnifiedOrder storage order = unifiedOrders[unifiedOrderId];
        if (order.id == bytes32(0)) revert OrderNotFound();
        if (order.status != UnifiedOrderStatus.PendingTrade) revert OrderNotOpen();
        if (msg.sender != order.buyer && msg.sender != owner()) revert NotAuthorized();

        // Update status
        order.status = UnifiedOrderStatus.TradeMatched;
        order.matchedAt = block.timestamp;

        // Create logistics order
        _createAusysLogisticsOrder(order);

        emit TradeMatched(
            unifiedOrderId,
            bytes32(0),
            order.clobOrderId,
            address(0),
            0,
            0
        );
    }

    /**
     * @notice Cancel a unified order
     * @param unifiedOrderId The order to cancel
     */
    function cancelUnifiedOrder(bytes32 unifiedOrderId) external nonReentrant {
        UnifiedOrder storage order = unifiedOrders[unifiedOrderId];
        if (order.id == bytes32(0)) revert OrderNotFound();
        if (msg.sender != order.buyer && msg.sender != owner()) revert NotAuthorized();

        UnifiedOrderStatus previousStatus = order.status;

        if (previousStatus == UnifiedOrderStatus.PendingTrade) {
            order.status = UnifiedOrderStatus.Cancelled;
            emit OrderCancelled(unifiedOrderId, uint8(previousStatus), 0);
        } else {
            revert OrderNotOpen();
        }
    }

    /**
     * @notice Get unified order details
     */
    function getUnifiedOrder(bytes32 unifiedOrderId) external view returns (UnifiedOrder memory) {
        return unifiedOrders[unifiedOrderId];
    }

    /**
     * @notice Get all unified orders for a buyer
     */
    function getBuyerOrders(address buyer) external view returns (bytes32[] memory) {
        return buyerOrders[buyer];
    }

    /**
     * @notice Get all unified orders for a seller
     */
    function getSellerOrders(address seller) external view returns (bytes32[] memory) {
        return sellerOrders[seller];
    }

    // =============================================================================
    // Admin Functions
    // =============================================================================

    function setBountyPercentage(uint256 _percentage) external onlyOwner {
        if (_percentage > 1000) revert InvalidFeeConfiguration();
        bountyPercentage = _percentage;
    }

    function setProtocolFeePercentage(uint256 _percentage) external onlyOwner {
        if (_percentage > 1000) revert InvalidFeeConfiguration();
        protocolFeePercentage = _percentage;
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        if (_recipient == address(0)) revert InvalidAddress();
        feeRecipient = _recipient;
    }

    function updateClobAddress(address _clob) external onlyOwner {
        clobAddress = _clob;
    }

    function updateAusysAddress(address _ausys) external onlyOwner {
        ausysAddress = _ausys;
    }

    // =============================================================================
    // Internal Functions
    // =============================================================================

    function _generateUnifiedOrderId() internal returns (bytes32) {
        return keccak256(abi.encode(++unifiedOrderCounter, block.timestamp, msg.sender));
    }

    function _createAusysLogisticsOrder(UnifiedOrder storage order) internal {
        // Create logistics order tracking
        order.ausysOrderId = keccak256(abi.encode(order.id, block.timestamp));
        order.status = UnifiedOrderStatus.LogisticsCreated;
        order.logisticsStatus = LogisticsPhase.Pending;

        // Add to seller's orders
        sellerOrders[order.sellerNode].push(order.id);

        emit LogisticsOrderCreated(
            order.id,
            order.ausysOrderId,
            order.journeyIds,
            order.bounty,
            order.sellerNode
        );
    }
}
