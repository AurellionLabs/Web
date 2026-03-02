// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { CLOBLib } from '../libraries/CLOBLib.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/**
 * @title CLOBCoreFacet
 * @notice Core CLOB order placement and cancellation (split from CLOBFacetV2)
 * @dev Handles order creation, cancellation, and basic order book management
 */
contract CLOBCoreFacet is ReentrancyGuard {
    
    // ============================================================================
    // EVENTS
    // ============================================================================
    
    event OrderCreated(
        bytes32 indexed orderId,
        bytes32 indexed marketId,
        address indexed maker,
        uint256 price,
        uint256 amount,
        bool isBuy,
        uint8 orderType,
        uint8 timeInForce,
        uint256 expiry,
        uint256 nonce
    );
    
    event CLOBOrderCancelled(
        bytes32 indexed orderId,
        address indexed maker,
        uint256 remainingAmount,
        uint8 reason
    );
    
    event OrderExpired(
        bytes32 indexed orderId,
        uint256 expiredAt
    );
    
    event MarketCreated(
        bytes32 indexed marketId,
        address indexed baseToken,
        uint256 baseTokenId,
        address indexed quoteToken
    );
    
    // ============================================================================
    // ERRORS
    // ============================================================================
    
    error InvalidPrice();
    error InvalidAmount();
    error InvalidTimeInForce();
    error OrderNotFound();
    error OrderNotActive();
    error NotOrderMaker();
    error MarketPaused();
    error OrderRequiresCommitReveal();
    error RateLimitExceeded();
    error OrderExpiredError();
    
    // ============================================================================
    // CONSTANTS
    // ============================================================================
    
    uint256 public constant BASIS_POINTS = 10000;
    
    // ============================================================================
    // MODIFIERS
    // ============================================================================
    
    modifier whenNotPaused() {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (s.paused) revert MarketPaused();
        _;
    }
    
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    modifier checkRateLimit() {
        _checkRateLimit();
        _;
    }
    
    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    
    function initializeCLOBV2(
        uint16 _takerFeeBps,
        uint16 _makerFeeBps,
        uint256 _defaultPriceChangeThreshold,
        uint256 _defaultCooldownPeriod,
        uint256 _emergencyTimelock
    ) external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        s.takerFeeBps = _takerFeeBps;
        s.makerFeeBps = _makerFeeBps;
        s.defaultPriceChangeThreshold = _defaultPriceChangeThreshold;
        s.defaultCooldownPeriod = _defaultCooldownPeriod;
        s.emergencyTimelock = _emergencyTimelock;
        s.minRevealDelay = 2;
        s.commitmentThreshold = 10000e18;
        s.maxOrdersPerBlock = 100;
        s.maxVolumePerBlock = 1000000e18;
    }
    
    // ============================================================================
    // ORDER PLACEMENT
    // ============================================================================
    
    /**
     * @notice Place a limit order with time-in-force
     */
    function placeLimitOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount,
        bool isBuy,
        uint8 timeInForce,
        uint40 expiry
    ) external nonReentrant whenNotPaused checkRateLimit returns (bytes32 orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        // Check if order requires commit-reveal
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        if (quoteAmount >= s.commitmentThreshold) {
            revert OrderRequiresCommitReveal();
        }
        
        orderId = _createOrder(CreateOrderParams({
            maker: msg.sender,
            baseToken: baseToken,
            baseTokenId: baseTokenId,
            quoteToken: quoteToken,
            price: price,
            amount: amount,
            isBuy: isBuy,
            timeInForce: timeInForce,
            expiry: expiry,
            skipTransfer: false
        }));
    }
    
    /**
     * @notice Place a sell order from node inventory
     */
    function placeNodeSellOrderV2(
        address nodeOwner,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount,
        uint8 timeInForce,
        uint40 expiry
    ) external nonReentrant whenNotPaused returns (bytes32 orderId) {
        orderId = _createOrder(CreateOrderParams({
            maker: nodeOwner,
            baseToken: baseToken,
            baseTokenId: baseTokenId,
            quoteToken: quoteToken,
            price: price,
            amount: amount,
            isBuy: false,
            timeInForce: timeInForce,
            expiry: expiry,
            skipTransfer: true
        }));
    }
    
    // ============================================================================
    // ORDER CANCELLATION
    // ============================================================================
    
    /**
     * @notice Cancel an open order
     */
    function cancelOrder(bytes32 orderId) external nonReentrant {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        
        if (order.makerAndFlags == 0) revert OrderNotFound();
        
        address maker = CLOBLib.unpackMaker(order.makerAndFlags);
        if (maker != msg.sender) revert NotOrderMaker();
        
        uint8 status = CLOBLib.unpackStatus(order.makerAndFlags);
        if (status != CLOBLib.STATUS_OPEN && status != CLOBLib.STATUS_PARTIAL) {
            revert OrderNotActive();
        }
        
        _cancelOrder(orderId, 0);
    }
    
    /**
     * @notice Cancel multiple orders
     */
    function cancelOrders(bytes32[] calldata orderIds) external nonReentrant {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        for (uint256 i = 0; i < orderIds.length; i++) {
            DiamondStorage.PackedOrder storage order = s.packedOrders[orderIds[i]];
            
            if (order.makerAndFlags == 0) continue;
            
            address maker = CLOBLib.unpackMaker(order.makerAndFlags);
            if (maker != msg.sender) continue;
            
            uint8 status = CLOBLib.unpackStatus(order.makerAndFlags);
            if (status == CLOBLib.STATUS_OPEN || status == CLOBLib.STATUS_PARTIAL) {
                _cancelOrder(orderIds[i], 0);
            }
        }
    }
    
    // ============================================================================
    // INTERNAL FUNCTIONS
    // ============================================================================
    
    struct CreateOrderParams {
        address maker;
        address baseToken;
        uint256 baseTokenId;
        address quoteToken;
        uint96 price;
        uint96 amount;
        bool isBuy;
        uint8 timeInForce;
        uint40 expiry;
        bool skipTransfer;
    }
    
    function _createOrder(CreateOrderParams memory p) internal returns (bytes32 orderId) {
        if (p.price == 0) revert InvalidPrice();
        if (p.amount == 0) revert InvalidAmount();
        if (p.timeInForce > CLOBLib.TIF_GTD) revert InvalidTimeInForce();
        if (p.timeInForce == CLOBLib.TIF_GTD && p.expiry <= block.timestamp) revert OrderExpiredError();
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = keccak256(abi.encodePacked(p.baseToken, p.baseTokenId, p.quoteToken));
        
        _ensureMarket(marketId, p.baseToken, p.baseTokenId, p.quoteToken);
        
        // Transfer tokens to escrow
        if (!p.skipTransfer) {
            if (p.isBuy) {
                uint256 totalCost = CLOBLib.calculateQuoteAmount(p.price, p.amount);
                IERC20(p.quoteToken).transferFrom(msg.sender, address(this), totalCost);
            } else {
                IERC1155(p.baseToken).safeTransferFrom(msg.sender, address(this), p.baseTokenId, p.amount, "");
            }
        }
        
        // Generate order ID — deterministic (no block.timestamp) so simulation and
        // broadcast produce the same ID, enabling return-value capture across tx boundaries.
        uint256 nonce = s.orderNonce++;
        orderId = keccak256(abi.encodePacked(p.maker, marketId, nonce));
        
        // Create packed order
        s.packedOrders[orderId] = DiamondStorage.PackedOrder({
            makerAndFlags: CLOBLib.packMakerAndFlags(
                p.maker,
                p.isBuy,
                CLOBLib.TYPE_LIMIT,
                CLOBLib.STATUS_OPEN,
                p.timeInForce,
                uint88(nonce)
            ),
            priceAmountFilled: CLOBLib.packPriceAmountFilled(p.price, p.amount, 0),
            expiryAndMeta: CLOBLib.packExpiryAndMeta(p.expiry, uint40(block.timestamp), uint32(s.totalMarkets)),
            marketId: marketId
        });
        
        // Add to order book
        _addToOrderBook(orderId, marketId, p.price, p.amount, p.isBuy);
        
        emit OrderCreated(
            orderId,
            marketId,
            p.maker,
            p.price,
            p.amount,
            p.isBuy,
            CLOBLib.TYPE_LIMIT,
            p.timeInForce,
            p.expiry,
            nonce
        );
    }
    
    function _addToOrderBook(
        bytes32 orderId,
        bytes32 marketId,
        uint256 price,
        uint256 amount,
        bool isBuy
    ) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        DiamondStorage.RBTreeMeta storage meta = isBuy ? s.bidTreeMeta[marketId] : s.askTreeMeta[marketId];
        mapping(uint256 => DiamondStorage.RBNode) storage nodes = 
            isBuy ? s.bidTreeNodes[marketId] : s.askTreeNodes[marketId];
        mapping(uint256 => DiamondStorage.PriceLevel) storage levels = 
            isBuy ? s.bidLevels[marketId] : s.askLevels[marketId];
        
        // Insert price level if new
        if (!nodes[price].exists) {
            _insertPriceLevel(meta, nodes, price);
        }
        
        // Add to FIFO queue
        DiamondStorage.PriceLevel storage level = levels[price];
        DiamondStorage.OrderQueueNode storage node = s.orderQueue[orderId];
        
        node.price = price;
        node.prev = level.tail;
        node.next = bytes32(0);
        
        if (level.tail != bytes32(0)) {
            s.orderQueue[level.tail].next = orderId;
        } else {
            level.head = orderId;
        }
        level.tail = orderId;
        
        level.totalAmount += amount;
        level.orderCount++;
        nodes[price].totalAmount += amount;
        nodes[price].orderCount++;
    }
    
    function _insertPriceLevel(
        DiamondStorage.RBTreeMeta storage meta,
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        uint256 price
    ) internal {
        nodes[price] = DiamondStorage.RBNode({
            parent: 0,
            left: 0,
            right: 0,
            color: 0,
            exists: true,
            totalAmount: 0,
            orderCount: 0
        });
        
        if (meta.root == 0) {
            meta.root = price;
        } else {
            uint256 current = meta.root;
            while (true) {
                if (price < current) {
                    if (nodes[current].left == 0) {
                        nodes[current].left = price;
                        nodes[price].parent = current;
                        break;
                    }
                    current = nodes[current].left;
                } else {
                    if (nodes[current].right == 0) {
                        nodes[current].right = price;
                        nodes[price].parent = current;
                        break;
                    }
                    current = nodes[current].right;
                }
            }
        }
        meta.count++;
    }
    
    function _cancelOrder(bytes32 orderId, uint8 reason) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        
        address maker = CLOBLib.unpackMaker(order.makerAndFlags);
        uint96 remaining = CLOBLib.getRemainingAmount(order.priceAmountFilled);
        
        uint8 newStatus = reason == 1 ? CLOBLib.STATUS_EXPIRED : CLOBLib.STATUS_CANCELLED;
        order.makerAndFlags = CLOBLib.updateStatus(order.makerAndFlags, newStatus);
        
        _removeFromOrderBook(orderId);
        
        if (reason == 1) {
            emit OrderExpired(orderId, block.timestamp);
        }
        
        emit CLOBOrderCancelled(orderId, maker, remaining, reason);
    }
    
    function _removeFromOrderBook(bytes32 orderId) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        DiamondStorage.OrderQueueNode storage node = s.orderQueue[orderId];
        
        bytes32 marketId = order.marketId;
        uint256 price = node.price;
        bool isBuy = CLOBLib.unpackIsBuy(order.makerAndFlags);
        uint96 remaining = CLOBLib.getRemainingAmount(order.priceAmountFilled);
        
        mapping(uint256 => DiamondStorage.RBNode) storage nodes = 
            isBuy ? s.bidTreeNodes[marketId] : s.askTreeNodes[marketId];
        mapping(uint256 => DiamondStorage.PriceLevel) storage levels = 
            isBuy ? s.bidLevels[marketId] : s.askLevels[marketId];
        
        DiamondStorage.PriceLevel storage level = levels[price];
        
        if (node.prev != bytes32(0)) {
            s.orderQueue[node.prev].next = node.next;
        } else {
            level.head = node.next;
        }
        
        if (node.next != bytes32(0)) {
            s.orderQueue[node.next].prev = node.prev;
        } else {
            level.tail = node.prev;
        }
        
        if (level.totalAmount >= remaining) level.totalAmount -= remaining;
        if (level.orderCount > 0) level.orderCount--;
        if (nodes[price].totalAmount >= remaining) nodes[price].totalAmount -= remaining;
        if (nodes[price].orderCount > 0) nodes[price].orderCount--;
        
        delete s.orderQueue[orderId];
    }
    
    function _ensureMarket(
        bytes32 marketId,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        if (!s.markets[marketId].active) {
            s.markets[marketId] = DiamondStorage.Market({
                baseToken: _addressToString(baseToken),
                baseTokenId: baseTokenId,
                quoteToken: _addressToString(quoteToken),
                active: true,
                createdAt: block.timestamp
            });
            s.marketIds.push(marketId);
            s.totalMarkets++;
            
            s.circuitBreakers[marketId] = DiamondStorage.CircuitBreaker({
                lastPrice: 0,
                priceChangeThreshold: s.defaultPriceChangeThreshold,
                cooldownPeriod: s.defaultCooldownPeriod,
                tripTimestamp: 0,
                isTripped: false,
                isEnabled: true
            });
            
            emit MarketCreated(marketId, baseToken, baseTokenId, quoteToken);
        }
    }
    
    function _checkRateLimit() internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.RateLimit storage limit = s.userRateLimits[msg.sender];
        
        if (limit.lastBlock != block.number) {
            limit.lastBlock = block.number;
            limit.ordersThisBlock = 0;
            limit.volumeThisBlock = 0;
        }
        
        limit.ordersThisBlock++;
        
        if (limit.ordersThisBlock > s.maxOrdersPerBlock) {
            revert RateLimitExceeded();
        }
    }
    
    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory data = abi.encodePacked(_addr);
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
    
    // ERC1155 Receiver
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }
    
    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}

