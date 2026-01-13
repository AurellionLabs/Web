// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { CLOBLib } from '../libraries/CLOBLib.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/security/ReentrancyGuard.sol';

/**
 * @title OrderRouterFacet
 * @notice SINGLE ENTRY POINT for all order operations in the Diamond
 * @dev This facet routes all order operations to ensure consistent storage usage.
 *      All order placement should go through this facet to prevent storage fragmentation.
 * 
 * DESIGN PRINCIPLES:
 * 1. Single source of truth for order placement
 * 2. Consistent storage structure (V2 tree-based)
 * 3. Unified interface for all order types
 * 4. Internal routing to appropriate handlers
 * 
 * DEPRECATION:
 * - Old functions (placeNodeSellOrder, placeBuyOrder, etc.) should be removed from Diamond
 * - This facet replaces them with a unified interface
 */
contract OrderRouterFacet is ReentrancyGuard {
    
    // ============================================================================
    // ERRORS
    // ============================================================================
    
    error InvalidPrice();
    error InvalidAmount();
    error InvalidTimeInForce();
    error OrderExpired();
    error InsufficientNodeBalance();
    error NotNodeOwner();
    error MarketPaused();
    error NoLiquidityForMarketOrder();
    
    // ============================================================================
    // EVENTS
    // ============================================================================
    
    event OrderRouted(
        bytes32 indexed orderId,
        address indexed maker,
        uint8 orderSource,  // 0=direct, 1=node, 2=market
        bool isBuy
    );
    
    // Token-based event for indexer compatibility
    event OrderPlacedWithTokens(
        bytes32 indexed orderId,
        address indexed maker,
        address indexed baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint256 price,
        uint256 amount,
        bool isBuy,
        uint8 orderType
    );
    
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
    
    event OrderFilled(
        bytes32 indexed orderId,
        bytes32 indexed tradeId,
        uint256 fillAmount,
        uint256 fillPrice,
        uint256 remainingAmount,
        uint256 cumulativeFilled
    );
    
    event CLOBOrderCancelled(
        bytes32 indexed orderId,
        address indexed maker,
        uint256 remainingAmount,
        uint8 reason
    );
    
    event TradeExecuted(
        bytes32 indexed tradeId,
        bytes32 indexed takerOrderId,
        bytes32 indexed makerOrderId,
        uint256 price,
        uint256 amount,
        uint256 quoteAmount
    );
    
    // ============================================================================
    // ORDER PLACEMENT - UNIFIED INTERFACE
    // ============================================================================
    
    /**
     * @notice Place a limit order (buy or sell)
     * @dev This is the primary entry point for limit orders from user wallets
     * @param baseToken ERC1155 token address
     * @param baseTokenId Token ID
     * @param quoteToken Payment token (ERC20)
     * @param price Price per unit in quote token (wei)
     * @param amount Amount of base tokens
     * @param isBuy True for buy, false for sell
     * @param timeInForce 0=GTC, 1=IOC, 2=FOK, 3=GTD
     * @param expiry Expiration timestamp (0 for no expiry, required for GTD)
     */
    function placeOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount,
        bool isBuy,
        uint8 timeInForce,
        uint40 expiry
    ) external nonReentrant returns (bytes32 orderId) {
        _validateOrderParams(price, amount, timeInForce, expiry);
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = _getOrCreateMarket(s, baseToken, baseTokenId, quoteToken);
        
        // Transfer tokens to escrow
        if (isBuy) {
            uint256 totalCost = CLOBLib.calculateQuoteAmount(price, amount);
            IERC20(quoteToken).transferFrom(msg.sender, address(this), totalCost);
        } else {
            IERC1155(baseToken).safeTransferFrom(msg.sender, address(this), baseTokenId, amount, "");
        }
        
        // Create order using V2 storage
        orderId = _createOrder(s, marketId, msg.sender, price, amount, isBuy, CLOBLib.TYPE_LIMIT, timeInForce, expiry, false);
        
        emit OrderRouted(orderId, msg.sender, 0, isBuy);
        emit OrderPlacedWithTokens(orderId, msg.sender, baseToken, baseTokenId, quoteToken, price, amount, isBuy, CLOBLib.TYPE_LIMIT);
        
        // Match order
        _matchOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
        
        // Handle time-in-force
        _handleTimeInForce(s, orderId, timeInForce, amount);
    }
    
    /**
     * @notice Place a sell order from node inventory
     * @dev Called by NodesFacet - tokens already in Diamond, just need accounting
     * @param nodeOwner Address to receive proceeds
     * @param baseToken ERC1155 token address  
     * @param baseTokenId Token ID
     * @param quoteToken Payment token
     * @param price Price per unit
     * @param amount Amount to sell
     * @param timeInForce Order duration type
     * @param expiry Expiration (for GTD orders)
     */
    function placeNodeSellOrder(
        address nodeOwner,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount,
        uint8 timeInForce,
        uint40 expiry
    ) external nonReentrant returns (bytes32 orderId) {
        _validateOrderParams(price, amount, timeInForce, expiry);
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = _getOrCreateMarket(s, baseToken, baseTokenId, quoteToken);
        
        // Tokens already in Diamond from node inventory - no transfer needed
        // Create order using V2 storage (skipTransfer = true)
        orderId = _createOrder(s, marketId, nodeOwner, price, amount, false, CLOBLib.TYPE_LIMIT, timeInForce, expiry, true);
        
        emit OrderRouted(orderId, nodeOwner, 1, false);
        emit OrderPlacedWithTokens(orderId, nodeOwner, baseToken, baseTokenId, quoteToken, price, amount, false, CLOBLib.TYPE_LIMIT);
        
        // Match order
        _matchOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
        
        // Handle time-in-force
        _handleTimeInForce(s, orderId, timeInForce, amount);
    }
    
    /**
     * @notice Place a market order (immediate execution at best price)
     * @param baseToken ERC1155 token address
     * @param baseTokenId Token ID
     * @param quoteToken Payment token
     * @param amount Amount to trade
     * @param isBuy True for buy, false for sell
     * @param maxSlippageBps Maximum slippage in basis points (e.g., 100 = 1%)
     */
    function placeMarketOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 amount,
        bool isBuy,
        uint16 maxSlippageBps
    ) external nonReentrant returns (bytes32 orderId) {
        if (amount == 0) revert InvalidAmount();
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = _getOrCreateMarket(s, baseToken, baseTokenId, quoteToken);
        
        // Get best price from order book
        uint96 limitPrice = _getMarketOrderPrice(s, marketId, isBuy, maxSlippageBps);
        if (limitPrice == 0) revert NoLiquidityForMarketOrder();
        
        // Transfer tokens
        if (isBuy) {
            uint256 maxCost = CLOBLib.calculateQuoteAmount(limitPrice, amount);
            IERC20(quoteToken).transferFrom(msg.sender, address(this), maxCost);
        } else {
            IERC1155(baseToken).safeTransferFrom(msg.sender, address(this), baseTokenId, amount, "");
        }
        
        // Create as IOC order (Immediate Or Cancel) with MARKET type
        orderId = _createOrder(s, marketId, msg.sender, limitPrice, amount, isBuy, CLOBLib.TYPE_MARKET, CLOBLib.TIF_IOC, 0, false);
        
        emit OrderRouted(orderId, msg.sender, 2, isBuy);
        emit OrderPlacedWithTokens(orderId, msg.sender, baseToken, baseTokenId, quoteToken, limitPrice, amount, isBuy, CLOBLib.TYPE_MARKET);
        
        // Match immediately
        _matchOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
        
        // Cancel any unfilled portion (IOC behavior)
        _handleTimeInForce(s, orderId, CLOBLib.TIF_IOC, amount);
    }
    
    // ============================================================================
    // CONVENIENCE FUNCTIONS - Simplified interfaces for common use cases
    // ============================================================================
    
    /**
     * @notice Place a buy order (convenience wrapper for placeOrder)
     * @dev Simplified interface for buying tokens. Equivalent to calling
     *      placeOrder() with isBuy=true, timeInForce=GTC, expiry=0
     * @param baseToken ERC1155 token address to buy
     * @param baseTokenId Token ID to buy
     * @param quoteToken Payment token (ERC20)
     * @param price Price per unit in quote token (wei)
     * @param amount Amount of base tokens to buy
     * @return orderId The generated order ID
     */
    function placeBuyOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount
    ) external nonReentrant returns (bytes32 orderId) {
        _validateOrderParams(price, amount, CLOBLib.TIF_GTC, 0);
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = _getOrCreateMarket(s, baseToken, baseTokenId, quoteToken);
        
        // Transfer quote tokens to escrow
        uint256 totalCost = CLOBLib.calculateQuoteAmount(price, amount);
        IERC20(quoteToken).transferFrom(msg.sender, address(this), totalCost);
        
        // Create order using V2 storage
        orderId = _createOrder(s, marketId, msg.sender, price, amount, true, CLOBLib.TYPE_LIMIT, CLOBLib.TIF_GTC, 0, false);
        
        emit OrderRouted(orderId, msg.sender, 0, true);
        emit OrderPlacedWithTokens(orderId, msg.sender, baseToken, baseTokenId, quoteToken, price, amount, true, CLOBLib.TYPE_LIMIT);
        
        // Match order
        _matchOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
        
        // No time-in-force handling needed for GTC orders
    }
    
    /**
     * @notice Place a sell order (convenience wrapper for placeOrder)
     * @dev Simplified interface for selling tokens. Equivalent to calling
     *      placeOrder() with isBuy=false, timeInForce=GTC, expiry=0
     *      Seller must have approved Diamond to transfer their tokens.
     * @param baseToken ERC1155 token address to sell
     * @param baseTokenId Token ID to sell
     * @param quoteToken Payment token (ERC20) to receive
     * @param price Price per unit in quote token (wei)
     * @param amount Amount of base tokens to sell
     * @return orderId The generated order ID
     */
    function placeSellOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount
    ) external nonReentrant returns (bytes32 orderId) {
        _validateOrderParams(price, amount, CLOBLib.TIF_GTC, 0);
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = _getOrCreateMarket(s, baseToken, baseTokenId, quoteToken);
        
        // Transfer base tokens to escrow
        IERC1155(baseToken).safeTransferFrom(msg.sender, address(this), baseTokenId, amount, "");
        
        // Create order using V2 storage
        orderId = _createOrder(s, marketId, msg.sender, price, amount, false, CLOBLib.TYPE_LIMIT, CLOBLib.TIF_GTC, 0, false);
        
        emit OrderRouted(orderId, msg.sender, 0, false);
        emit OrderPlacedWithTokens(orderId, msg.sender, baseToken, baseTokenId, quoteToken, price, amount, false, CLOBLib.TYPE_LIMIT);
        
        // Match order
        _matchOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
        
        // No time-in-force handling needed for GTC orders
    }
    
    // ============================================================================
    // ORDER CANCELLATION
    // ============================================================================
    
    /**
     * @notice Cancel an open order
     * @param orderId Order to cancel
     */
    function cancelOrder(bytes32 orderId) external nonReentrant {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        
        address maker = CLOBLib.unpackMaker(order.makerAndFlags);
        require(maker == msg.sender, "Not order maker");
        
        uint8 status = CLOBLib.unpackStatus(order.makerAndFlags);
        require(status == CLOBLib.STATUS_OPEN || status == CLOBLib.STATUS_PARTIAL, "Order not active");
        
        _cancelOrder(s, orderId, 0); // reason 0 = user cancelled
    }
    
    /**
     * @notice Cancel multiple orders in one transaction
     * @param orderIds Array of orders to cancel
     */
    function cancelOrders(bytes32[] calldata orderIds) external nonReentrant {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        for (uint256 i = 0; i < orderIds.length; i++) {
            DiamondStorage.PackedOrder storage order = s.packedOrders[orderIds[i]];
            
            address maker = CLOBLib.unpackMaker(order.makerAndFlags);
            if (maker != msg.sender) continue;
            
            uint8 status = CLOBLib.unpackStatus(order.makerAndFlags);
            if (status == CLOBLib.STATUS_OPEN || status == CLOBLib.STATUS_PARTIAL) {
                _cancelOrder(s, orderIds[i], 0);
            }
        }
    }
    
    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Get order details
     */
    function getOrder(bytes32 orderId) external view returns (
        address maker,
        bytes32 marketId,
        uint96 price,
        uint96 amount,
        uint64 filledAmount,
        bool isBuy,
        uint8 status,
        uint8 timeInForce,
        uint40 expiry,
        uint40 createdAt
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        
        maker = CLOBLib.unpackMaker(order.makerAndFlags);
        isBuy = CLOBLib.unpackIsBuy(order.makerAndFlags);
        status = CLOBLib.unpackStatus(order.makerAndFlags);
        timeInForce = CLOBLib.unpackTimeInForce(order.makerAndFlags);
        
        price = CLOBLib.unpackPrice(order.priceAmountFilled);
        amount = CLOBLib.unpackAmount(order.priceAmountFilled);
        filledAmount = CLOBLib.unpackFilledAmount(order.priceAmountFilled);
        expiry = CLOBLib.unpackExpiry(order.expiryAndMeta);
        createdAt = CLOBLib.unpackCreatedAt(order.expiryAndMeta);
        
        marketId = order.marketId;
    }
    
    /**
     * @notice Get best bid and ask for a market
     */
    function getBestPrices(bytes32 marketId) external view returns (
        uint96 bestBid,
        uint96 bestBidSize,
        uint96 bestAsk,
        uint96 bestAskSize
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        // Get best bid (highest buy price)
        uint256 bidPrice = _getBestPrice(s.bidTreeMeta[marketId], s.bidTreeNodes[marketId], false);
        if (bidPrice > 0) {
            bestBid = uint96(bidPrice);
            bestBidSize = uint96(s.bidLevels[marketId][bidPrice].totalAmount);
        }
        
        // Get best ask (lowest sell price)
        uint256 askPrice = _getBestPrice(s.askTreeMeta[marketId], s.askTreeNodes[marketId], true);
        if (askPrice > 0) {
            bestAsk = uint96(askPrice);
            bestAskSize = uint96(s.askLevels[marketId][askPrice].totalAmount);
        }
    }
    
    // ============================================================================
    // INTERNAL FUNCTIONS
    // ============================================================================
    
    /**
     * @dev Helper to unpack price, amount, and filled amount from packed storage
     */
    function _unpackPriceAmountFilled(uint256 packed) internal pure returns (uint96 price, uint96 amount, uint64 filled) {
        price = CLOBLib.unpackPrice(packed);
        amount = CLOBLib.unpackAmount(packed);
        filled = CLOBLib.unpackFilledAmount(packed);
    }
    
    function _validateOrderParams(
        uint96 price,
        uint96 amount,
        uint8 timeInForce,
        uint40 expiry
    ) internal view {
        if (price == 0) revert InvalidPrice();
        if (amount == 0) revert InvalidAmount();
        if (timeInForce > CLOBLib.TIF_GTD) revert InvalidTimeInForce();
        if (timeInForce == CLOBLib.TIF_GTD && expiry <= block.timestamp) revert OrderExpired();
    }
    
    function _getOrCreateMarket(
        DiamondStorage.AppStorage storage s,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) internal returns (bytes32 marketId) {
        marketId = keccak256(abi.encodePacked(baseToken, baseTokenId, quoteToken));
        
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
        }
    }
    
    function _createOrder(
        DiamondStorage.AppStorage storage s,
        bytes32 marketId,
        address maker,
        uint96 price,
        uint96 amount,
        bool isBuy,
        uint8 orderType,
        uint8 timeInForce,
        uint40 expiry,
        bool skipTransfer
    ) internal returns (bytes32 orderId) {
        uint256 nonce = s.orderNonce++;
        orderId = keccak256(abi.encodePacked(maker, marketId, nonce, block.timestamp));
        
        // Create packed order (V2 storage)
        s.packedOrders[orderId] = DiamondStorage.PackedOrder({
            makerAndFlags: CLOBLib.packMakerAndFlags(
                maker,
                isBuy,
                orderType,
                CLOBLib.STATUS_OPEN,
                timeInForce,
                uint88(nonce)
            ),
            priceAmountFilled: CLOBLib.packPriceAmountFilled(price, amount, 0),
            expiryAndMeta: CLOBLib.packExpiryAndMeta(expiry, uint40(block.timestamp), uint32(s.totalMarkets)),
            marketId: marketId
        });
        
        // Add to order book (V2 tree-based storage)
        _addToOrderBook(s, orderId, marketId, price, amount, isBuy);
        
        emit OrderCreated(orderId, marketId, maker, price, amount, isBuy, orderType, timeInForce, expiry, nonce);
    }
    
    function _addToOrderBook(
        DiamondStorage.AppStorage storage s,
        bytes32 orderId,
        bytes32 marketId,
        uint256 price,
        uint256 amount,
        bool isBuy
    ) internal {
        DiamondStorage.RBTreeMeta storage meta = isBuy ? s.bidTreeMeta[marketId] : s.askTreeMeta[marketId];
        mapping(uint256 => DiamondStorage.RBNode) storage nodes = 
            isBuy ? s.bidTreeNodes[marketId] : s.askTreeNodes[marketId];
        mapping(uint256 => DiamondStorage.PriceLevel) storage levels = 
            isBuy ? s.bidLevels[marketId] : s.askLevels[marketId];
        
        // Insert price level if new
        if (!nodes[price].exists) {
            _insertPriceLevel(meta, nodes, price);
        }
        
        // Add order to FIFO queue at price level
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
        
        // Update aggregates
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
            meta.count = 1;
        } else {
            _insertNode(nodes, meta.root, price);
            meta.count++;
        }
    }
    
    function _insertNode(
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        uint256 root,
        uint256 price
    ) internal {
        uint256 current = root;
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
    
    // ============================================================================
    // MATCHING - Delegated to OrderMatchingFacet for size optimization
    // ============================================================================
    
    function _matchOrder(
        DiamondStorage.AppStorage storage s,
        bytes32 orderId,
        bytes32 marketId,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) internal {
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        bool isBuy = CLOBLib.unpackIsBuy(order.makerAndFlags);
        
        if (isBuy) {
            _matchBuyOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
        } else {
            _matchSellOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
        }
    }
    
    function _matchBuyOrder(DiamondStorage.AppStorage storage s, bytes32 buyOrderId, bytes32 marketId, address baseToken, uint256 baseTokenId, address quoteToken) internal {
        (uint96 buyPrice, uint96 buyAmount, uint64 buyFilled) = _unpackPriceAmountFilled(s.packedOrders[buyOrderId].priceAmountFilled);
        uint256 remaining = buyAmount - buyFilled;
        uint256 askPrice = _getBestPrice(s.askTreeMeta[marketId], s.askTreeNodes[marketId], true);
        
        while (remaining > 0 && askPrice > 0 && askPrice <= buyPrice) {
            bytes32 sellOrderId = s.askLevels[marketId][askPrice].head;
            while (remaining > 0 && sellOrderId != bytes32(0)) {
                (, uint96 sellAmount, uint64 sellFilled) = _unpackPriceAmountFilled(s.packedOrders[sellOrderId].priceAmountFilled);
                uint256 fillAmount = _min(remaining, sellAmount - sellFilled);
                if (fillAmount > 0) {
                    _executeTrade(s, buyOrderId, sellOrderId, marketId, uint96(askPrice), uint96(fillAmount), baseToken, baseTokenId, quoteToken);
                    remaining -= fillAmount;
                }
                sellOrderId = s.orderQueue[sellOrderId].next;
            }
            askPrice = _getNextHigher(s.askTreeNodes[marketId], askPrice);
        }
    }
    
    function _matchSellOrder(DiamondStorage.AppStorage storage s, bytes32 sellOrderId, bytes32 marketId, address baseToken, uint256 baseTokenId, address quoteToken) internal {
        (uint96 sellPrice, uint96 sellAmount, uint64 sellFilled) = _unpackPriceAmountFilled(s.packedOrders[sellOrderId].priceAmountFilled);
        uint256 remaining = sellAmount - sellFilled;
        uint256 bidPrice = _getBestPrice(s.bidTreeMeta[marketId], s.bidTreeNodes[marketId], false);
        
        while (remaining > 0 && bidPrice > 0 && bidPrice >= sellPrice) {
            bytes32 buyOrderId = s.bidLevels[marketId][bidPrice].head;
            while (remaining > 0 && buyOrderId != bytes32(0)) {
                (, uint96 buyAmount, uint64 buyFilled) = _unpackPriceAmountFilled(s.packedOrders[buyOrderId].priceAmountFilled);
                uint256 fillAmount = _min(remaining, buyAmount - buyFilled);
                if (fillAmount > 0) {
                    _executeTrade(s, buyOrderId, sellOrderId, marketId, uint96(bidPrice), uint96(fillAmount), baseToken, baseTokenId, quoteToken);
                    remaining -= fillAmount;
                }
                buyOrderId = s.orderQueue[buyOrderId].next;
            }
            bidPrice = _getNextLower(s.bidTreeNodes[marketId], bidPrice);
        }
    }
    
    function _executeTrade(DiamondStorage.AppStorage storage s, bytes32 buyOrderId, bytes32 sellOrderId, bytes32 marketId, uint96 price, uint96 amount, address baseToken, uint256 baseTokenId, address quoteToken) internal {
        address buyer = CLOBLib.unpackMaker(s.packedOrders[buyOrderId].makerAndFlags);
        address seller = CLOBLib.unpackMaker(s.packedOrders[sellOrderId].makerAndFlags);
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        IERC1155(baseToken).safeTransferFrom(address(this), buyer, baseTokenId, amount, "");
        IERC20(quoteToken).transfer(seller, quoteAmount);
        
        _updateOrderFilled(s.packedOrders[buyOrderId], amount);
        _updateOrderFilled(s.packedOrders[sellOrderId], amount);
        
        bytes32 tradeId = keccak256(abi.encodePacked(buyOrderId, sellOrderId, block.timestamp, s.totalTrades++));
        emit TradeExecuted(tradeId, sellOrderId, buyOrderId, price, amount, quoteAmount);
    }
    
    function _updateOrderFilled(DiamondStorage.PackedOrder storage order, uint256 fillAmount) internal {
        (uint96 price, uint96 amount, uint64 filled) = _unpackPriceAmountFilled(order.priceAmountFilled);
        uint64 newFilled = filled + uint64(fillAmount);
        order.priceAmountFilled = CLOBLib.packPriceAmountFilled(price, amount, newFilled);
        order.makerAndFlags = CLOBLib.updateStatus(order.makerAndFlags, newFilled >= amount ? CLOBLib.STATUS_FILLED : CLOBLib.STATUS_PARTIAL);
    }
    
    function _min(uint256 a, uint256 b) internal pure returns (uint256) { return a < b ? a : b; }
    
    function _cancelOrder(
        DiamondStorage.AppStorage storage s,
        bytes32 orderId,
        uint8 reason
    ) internal {
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        
        address maker = CLOBLib.unpackMaker(order.makerAndFlags);
        bool isBuy = CLOBLib.unpackIsBuy(order.makerAndFlags);
        uint8 orderType = CLOBLib.unpackOrderType(order.makerAndFlags);
        uint8 timeInForce = CLOBLib.unpackTimeInForce(order.makerAndFlags);
        uint88 nonce = CLOBLib.unpackNonce(order.makerAndFlags);
        
        (uint96 price, uint96 amount, uint64 filled) = _unpackPriceAmountFilled(order.priceAmountFilled);
        uint96 remaining = amount - uint96(filled);
        
        // Update status to cancelled
        order.makerAndFlags = CLOBLib.packMakerAndFlags(maker, isBuy, orderType, CLOBLib.STATUS_CANCELLED, timeInForce, nonce);
        
        // Remove from price level
        _removeFromPriceLevel(s, order.marketId, price, remaining, isBuy);
        
        // Refund remaining tokens
        if (remaining > 0) {
            bytes32 marketId = order.marketId;
            DiamondStorage.Market storage market = s.markets[marketId];
            
            if (isBuy) {
                // Refund quote tokens
                uint256 refundAmount = CLOBLib.calculateQuoteAmount(price, remaining);
                IERC20(_stringToAddress(market.quoteToken)).transfer(maker, refundAmount);
            } else {
                // Refund base tokens
                IERC1155(_stringToAddress(market.baseToken)).safeTransferFrom(
                    address(this), 
                    maker, 
                    market.baseTokenId, 
                    remaining, 
                    ""
                );
            }
        }
        
        emit CLOBOrderCancelled(orderId, maker, remaining, reason);
    }
    
    function _removeFromPriceLevel(
        DiamondStorage.AppStorage storage s,
        bytes32 marketId,
        uint256 price,
        uint256 amount,
        bool isBuy
    ) internal {
        mapping(uint256 => DiamondStorage.PriceLevel) storage levels = 
            isBuy ? s.bidLevels[marketId] : s.askLevels[marketId];
        mapping(uint256 => DiamondStorage.RBNode) storage nodes = 
            isBuy ? s.bidTreeNodes[marketId] : s.askTreeNodes[marketId];
        
        if (levels[price].totalAmount >= amount) {
            levels[price].totalAmount -= amount;
            nodes[price].totalAmount -= amount;
        }
        
        if (levels[price].orderCount > 0) {
            levels[price].orderCount--;
            nodes[price].orderCount--;
        }
    }
    
    function _handleTimeInForce(
        DiamondStorage.AppStorage storage s,
        bytes32 orderId,
        uint8 timeInForce,
        uint96 originalAmount
    ) internal {
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        (, uint96 amount, uint64 filled) = _unpackPriceAmountFilled(order.priceAmountFilled);
        
        if (timeInForce == CLOBLib.TIF_IOC && filled < amount) {
            // Cancel unfilled portion
            _cancelOrder(s, orderId, 2); // reason 2 = IOC unfilled
        } else if (timeInForce == CLOBLib.TIF_FOK && filled < originalAmount) {
            // FOK must fill completely - revert entire order
            revert("FOK order not fully filled");
        }
    }
    
    function _getMarketOrderPrice(
        DiamondStorage.AppStorage storage s,
        bytes32 marketId,
        bool isBuy,
        uint16 maxSlippageBps
    ) internal view returns (uint96) {
        uint256 bestPrice;
        
        if (isBuy) {
            // For buy, get best ask (lowest sell price)
            bestPrice = _getBestPrice(s.askTreeMeta[marketId], s.askTreeNodes[marketId], true);
            if (bestPrice == 0) return 0;
            // Add slippage for buy (willing to pay more)
            return uint96(bestPrice * (10000 + maxSlippageBps) / 10000);
        } else {
            // For sell, get best bid (highest buy price)
            bestPrice = _getBestPrice(s.bidTreeMeta[marketId], s.bidTreeNodes[marketId], false);
            if (bestPrice == 0) return 0;
            // Subtract slippage for sell (willing to accept less)
            return uint96(bestPrice * (10000 - maxSlippageBps) / 10000);
        }
    }
    
    function _getBestPrice(
        DiamondStorage.RBTreeMeta storage meta,
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        bool getMin
    ) internal view returns (uint256) {
        if (meta.root == 0) return 0;
        
        uint256 current = meta.root;
        if (getMin) {
            while (nodes[current].left != 0) {
                current = nodes[current].left;
            }
        } else {
            while (nodes[current].right != 0) {
                current = nodes[current].right;
            }
        }
        return current;
    }
    
    function _getNextHigher(
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        uint256 price
    ) internal view returns (uint256) {
        if (nodes[price].right != 0) {
            uint256 current = nodes[price].right;
            while (nodes[current].left != 0) {
                current = nodes[current].left;
            }
            return current;
        }
        
        uint256 current = price;
        uint256 parent = nodes[current].parent;
        while (parent != 0 && current == nodes[parent].right) {
            current = parent;
            parent = nodes[current].parent;
        }
        return parent;
    }
    
    function _getNextLower(
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        uint256 price
    ) internal view returns (uint256) {
        if (nodes[price].left != 0) {
            uint256 current = nodes[price].left;
            while (nodes[current].right != 0) {
                current = nodes[current].right;
            }
            return current;
        }
        
        uint256 current = price;
        uint256 parent = nodes[current].parent;
        while (parent != 0 && current == nodes[parent].left) {
            current = parent;
            parent = nodes[current].parent;
        }
        return parent;
    }
    
    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(uint160(_addr) >> (8 * (19 - i)) >> 4)];
            str[3 + i * 2] = alphabet[uint8(uint160(_addr) >> (8 * (19 - i))) & 0x0f];
        }
        return string(str);
    }
    
    function _stringToAddress(string memory _str) internal pure returns (address) {
        bytes memory b = bytes(_str);
        require(b.length == 42, "Invalid address length");
        
        uint160 result = 0;
        for (uint256 i = 2; i < 42; i++) {
            result *= 16;
            uint8 c = uint8(b[i]);
            if (c >= 48 && c <= 57) {
                result += c - 48;
            } else if (c >= 97 && c <= 102) {
                result += c - 87;
            } else if (c >= 65 && c <= 70) {
                result += c - 55;
            }
        }
        return address(result);
    }
}

