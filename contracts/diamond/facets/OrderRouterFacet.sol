// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { CLOBLib } from '../libraries/CLOBLib.sol';
import { OrderBookLib } from '../libraries/OrderBookLib.sol';
import { OrderMatchingLib } from '../libraries/OrderMatchingLib.sol';
import { OrderUtilsLib } from '../libraries/OrderUtilsLib.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/**
 * @title OrderRouterFacet
 * @notice SINGLE ENTRY POINT for all order operations in the Diamond
 * @dev This facet routes all order operations to ensure consistent storage usage.
 *      Uses OrderBookLib, OrderMatchingLib, and OrderUtilsLib for logic to reduce size.
 */
contract OrderRouterFacet is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============================================================================
    // ERRORS
    // ============================================================================
    
    error InsufficientNodeBalance();
    error NotNodeOwner();
    error NotNodeOperator();
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
    
    event RouterOrderPlaced(
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
    
    event RouterOrderCreated(
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
    
    event RouterOrderCancelled(
        bytes32 indexed orderId,
        address indexed maker,
        uint256 remainingAmount,
        uint8 reason
    );
    
    // ============================================================================
    // ORDER PLACEMENT - UNIFIED INTERFACE
    // ============================================================================
    
    /**
     * @notice Place a limit order (buy or sell)
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
        OrderUtilsLib.validateOrderParams(price, amount, timeInForce, expiry);
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = OrderUtilsLib.getOrCreateMarket(s, baseToken, baseTokenId, quoteToken);
        
        // Transfer tokens to escrow
        if (isBuy) {
            uint256 totalCost = CLOBLib.calculateQuoteAmount(price, amount);
            IERC20(quoteToken).transferFrom(msg.sender, address(this), totalCost);
        } else {
            IERC1155(baseToken).safeTransferFrom(msg.sender, address(this), baseTokenId, amount, "");
        }
        
        // Create order using V2 storage
        orderId = _createOrder(s, marketId, msg.sender, price, amount, isBuy, CLOBLib.TYPE_LIMIT, timeInForce, expiry);
        
        emit OrderRouted(orderId, msg.sender, 0, isBuy);
        emit RouterOrderPlaced(orderId, msg.sender, baseToken, baseTokenId, quoteToken, price, amount, isBuy, CLOBLib.TYPE_LIMIT);
        
        // Match order
        OrderMatchingLib.matchOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
        
        // Handle time-in-force
        _handleTimeInForce(s, orderId, timeInForce, amount);
    }
    
    /**
     * @notice Place a sell order from node inventory
     * @dev Only the node owner can place node sell orders
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
        // CRITICAL: Verify msg.sender is the node owner
        // This prevents unauthorized parties from draining node inventory
        if (msg.sender != nodeOwner) {
            revert NotNodeOperator();
        }
        
        OrderUtilsLib.validateOrderParams(price, amount, timeInForce, expiry);
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = OrderUtilsLib.getOrCreateMarket(s, baseToken, baseTokenId, quoteToken);
        
        // Tokens already in Diamond from node inventory - no transfer needed
        orderId = _createOrder(s, marketId, nodeOwner, price, amount, false, CLOBLib.TYPE_LIMIT, timeInForce, expiry);
        
        emit OrderRouted(orderId, nodeOwner, 1, false);
        emit RouterOrderPlaced(orderId, nodeOwner, baseToken, baseTokenId, quoteToken, price, amount, false, CLOBLib.TYPE_LIMIT);
        
        // Match order
        OrderMatchingLib.matchOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
        
        // Handle time-in-force
        _handleTimeInForce(s, orderId, timeInForce, amount);
    }
    
    /**
     * @notice Place a market order (immediate execution at best price)
     */
    function placeMarketOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 amount,
        bool isBuy,
        uint16 maxSlippageBps
    ) external nonReentrant returns (bytes32 orderId) {
        if (amount == 0) revert OrderUtilsLib.InvalidAmount();
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = OrderUtilsLib.getOrCreateMarket(s, baseToken, baseTokenId, quoteToken);
        
        // Get best price from order book
        uint96 limitPrice = OrderUtilsLib.getMarketOrderPrice(s, marketId, isBuy, maxSlippageBps);
        if (limitPrice == 0) revert NoLiquidityForMarketOrder();
        
        // Transfer tokens
        if (isBuy) {
            uint256 maxCost = CLOBLib.calculateQuoteAmount(limitPrice, amount);
            IERC20(quoteToken).transferFrom(msg.sender, address(this), maxCost);
        } else {
            IERC1155(baseToken).safeTransferFrom(msg.sender, address(this), baseTokenId, amount, "");
        }
        
        // Create as IOC order
        orderId = _createOrder(s, marketId, msg.sender, limitPrice, amount, isBuy, CLOBLib.TYPE_MARKET, CLOBLib.TIF_IOC, 0);
        
        emit OrderRouted(orderId, msg.sender, 2, isBuy);
        emit RouterOrderPlaced(orderId, msg.sender, baseToken, baseTokenId, quoteToken, limitPrice, amount, isBuy, CLOBLib.TYPE_MARKET);
        
        // Match immediately
        OrderMatchingLib.matchOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
        
        // Cancel any unfilled portion (IOC behavior)
        _handleTimeInForce(s, orderId, CLOBLib.TIF_IOC, amount);
    }
    
    // ============================================================================
    // CONVENIENCE FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Place a buy order (convenience wrapper)
     */
    function placeBuyOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount
    ) external nonReentrant returns (bytes32 orderId) {
        OrderUtilsLib.validateOrderParams(price, amount, CLOBLib.TIF_GTC, 0);
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = OrderUtilsLib.getOrCreateMarket(s, baseToken, baseTokenId, quoteToken);
        
        // Transfer quote tokens to escrow
        uint256 totalCost = CLOBLib.calculateQuoteAmount(price, amount);
        IERC20(quoteToken).transferFrom(msg.sender, address(this), totalCost);
        
        // Create order
        orderId = _createOrder(s, marketId, msg.sender, price, amount, true, CLOBLib.TYPE_LIMIT, CLOBLib.TIF_GTC, 0);
        
        emit OrderRouted(orderId, msg.sender, 0, true);
        emit RouterOrderPlaced(orderId, msg.sender, baseToken, baseTokenId, quoteToken, price, amount, true, CLOBLib.TYPE_LIMIT);
        
        // Match order
        OrderMatchingLib.matchOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
    }
    
    /**
     * @notice Place a sell order (convenience wrapper)
     */
    function placeSellOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount
    ) external nonReentrant returns (bytes32 orderId) {
        OrderUtilsLib.validateOrderParams(price, amount, CLOBLib.TIF_GTC, 0);
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = OrderUtilsLib.getOrCreateMarket(s, baseToken, baseTokenId, quoteToken);
        
        // Transfer base tokens to escrow
        IERC1155(baseToken).safeTransferFrom(msg.sender, address(this), baseTokenId, amount, "");
        
        // Create order
        orderId = _createOrder(s, marketId, msg.sender, price, amount, false, CLOBLib.TYPE_LIMIT, CLOBLib.TIF_GTC, 0);
        
        emit OrderRouted(orderId, msg.sender, 0, false);
        emit RouterOrderPlaced(orderId, msg.sender, baseToken, baseTokenId, quoteToken, price, amount, false, CLOBLib.TYPE_LIMIT);
        
        // Match order
        OrderMatchingLib.matchOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
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
        
        address maker = CLOBLib.unpackMaker(order.makerAndFlags);
        require(maker == msg.sender, "Not order maker");
        
        uint8 status = CLOBLib.unpackStatus(order.makerAndFlags);
        require(status == CLOBLib.STATUS_OPEN || status == CLOBLib.STATUS_PARTIAL, "Order not active");
        
        _cancelOrder(s, orderId, 0); // reason 0 = user cancelled
    }
    
    /**
     * @notice Cancel multiple orders in one transaction
     * @dev Optimized: cache makerAndFlags to avoid duplicate SLOAD in loop
     */
    function cancelOrders(bytes32[] calldata orderIds) external nonReentrant {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        uint256 orderCount = orderIds.length;
        for (uint256 i = 0; i < orderCount; i++) {
            DiamondStorage.PackedOrder storage order = s.packedOrders[orderIds[i]];
            
            // Cache packed value to avoid duplicate SLOAD
            uint256 makerAndFlags = order.makerAndFlags;
            address maker = CLOBLib.unpackMaker(makerAndFlags);
            if (maker != msg.sender) continue;
            
            uint8 status = CLOBLib.unpackStatus(makerAndFlags);
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
        uint256 bidPrice = OrderBookLib.getBestPrice(s.bidTreeMeta[marketId], s.bidTreeNodes[marketId], false);
        if (bidPrice > 0) {
            bestBid = uint96(bidPrice);
            bestBidSize = uint96(s.bidLevels[marketId][bidPrice].totalAmount);
        }
        
        // Get best ask (lowest sell price)
        uint256 askPrice = OrderBookLib.getBestPrice(s.askTreeMeta[marketId], s.askTreeNodes[marketId], true);
        if (askPrice > 0) {
            bestAsk = uint96(askPrice);
            bestAskSize = uint96(s.askLevels[marketId][askPrice].totalAmount);
        }
    }
    
    // ============================================================================
    // INTERNAL FUNCTIONS
    // ============================================================================
    
    function _createOrder(
        DiamondStorage.AppStorage storage s,
        bytes32 marketId,
        address maker,
        uint96 price,
        uint96 amount,
        bool isBuy,
        uint8 orderType,
        uint8 timeInForce,
        uint40 expiry
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
        
        // Add to order book
        OrderBookLib.addToOrderBook(s, orderId, marketId, price, amount, isBuy);
        
        emit RouterOrderCreated(orderId, marketId, maker, price, amount, isBuy, orderType, timeInForce, expiry, nonce);
    }
    
    function _handleTimeInForce(
        DiamondStorage.AppStorage storage s,
        bytes32 orderId,
        uint8 timeInForce,
        uint96 originalAmount
    ) internal {
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        (uint96 price, uint96 amount, uint64 filled) = OrderUtilsLib.unpackPriceAmountFilled(order.priceAmountFilled);
        
        if (timeInForce == CLOBLib.TIF_IOC && filled < amount) {
            // Cancel unfilled portion
            _cancelOrder(s, orderId, 2); // reason 2 = IOC unfilled
        } else if (timeInForce == CLOBLib.TIF_FOK && filled < originalAmount) {
            // FOK must fill completely - revert entire order
            revert("FOK order not fully filled");
        }
    }
    
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
        
        (uint96 price, uint96 amount, uint64 filled) = OrderUtilsLib.unpackPriceAmountFilled(order.priceAmountFilled);
        uint96 remaining = amount - uint96(filled);
        
        // Update status to cancelled
        order.makerAndFlags = CLOBLib.packMakerAndFlags(maker, isBuy, orderType, CLOBLib.STATUS_CANCELLED, timeInForce, nonce);
        
        // Remove from price level
        OrderBookLib.removeFromPriceLevel(s, order.marketId, price, remaining, isBuy);
        
        // Refund remaining tokens
        if (remaining > 0) {
            _refundTokens(s, order.marketId, maker, price, remaining, isBuy);
        }
        
        emit RouterOrderCancelled(orderId, maker, remaining, reason);
    }
    
    function _refundTokens(
        DiamondStorage.AppStorage storage s,
        bytes32 marketId,
        address maker,
        uint96 price,
        uint96 remaining,
        bool isBuy
    ) internal {
        DiamondStorage.Market storage market = s.markets[marketId];
        
        if (isBuy) {
            // Refund quote tokens
            uint256 refundAmount = CLOBLib.calculateQuoteAmount(price, remaining);
            IERC20(OrderUtilsLib.stringToAddress(market.quoteToken)).safeTransfer(maker, refundAmount);
        } else {
            // Refund base tokens
            IERC1155(OrderUtilsLib.stringToAddress(market.baseToken)).safeTransferFrom(
                address(this), 
                maker, 
                market.baseTokenId, 
                remaining, 
                ""
            );
        }
    }
}
