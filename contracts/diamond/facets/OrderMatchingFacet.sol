// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { CLOBLib } from '../libraries/CLOBLib.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @title OrderMatchingFacet
 * @notice Order matching and trade execution logic (split from OrderRouterFacet)
 * @dev Handles V1/V2 hybrid matching, trade execution, and order book management
 */
contract OrderMatchingFacet {
    
    struct TradeContext {
        bytes32 marketId;
        address baseToken;
        uint256 baseTokenId;
        address quoteToken;
    }
    
    event AusysOrderFilled(bytes32 indexed orderId, bytes32 indexed tradeId, uint256 fillAmount, uint256 fillPrice, uint256 remainingAmount, uint256 cumulativeFilled);
    event TradeExecuted(bytes32 indexed tradeId, bytes32 indexed takerOrderId, bytes32 indexed makerOrderId, uint256 price, uint256 amount, uint256 quoteAmount);
    event MatchingOrderCancelled(bytes32 indexed orderId, address indexed maker, uint256 remainingAmount, uint8 reason);
    
    // ============================================================================
    // MATCHING FUNCTIONS - Called by OrderRouterFacet
    // ============================================================================
    
    function matchOrder(bytes32 orderId, bytes32 marketId, address baseToken, uint256 baseTokenId, address quoteToken) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        bool isBuy = CLOBLib.unpackIsBuy(order.makerAndFlags);
        
        if (isBuy) {
            _matchBuyOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
        } else {
            _matchSellOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
        }
    }
    
    function _matchBuyOrder(DiamondStorage.AppStorage storage s, bytes32 buyOrderId, bytes32 marketId, address baseToken, uint256 baseTokenId, address quoteToken) internal {
        TradeContext memory ctx = TradeContext(marketId, baseToken, baseTokenId, quoteToken);
        (uint96 buyPrice, uint96 buyAmount, uint64 buyFilled) = _unpack(s.packedOrders[buyOrderId].priceAmountFilled);
        uint256 remaining = buyAmount - buyFilled;
        
        uint256 askPrice = _getBestPrice(s.askTreeMeta[marketId], s.askTreeNodes[marketId], true);
        
        while (remaining > 0 && askPrice > 0 && askPrice <= buyPrice) {
            remaining = _matchBuyAtPrice(s, buyOrderId, ctx, askPrice, remaining);
            askPrice = _getNextHigher(s.askTreeNodes[marketId], askPrice);
        }
        
        // Check V1 legacy orders
        if (remaining > 0) {
            _matchBuyOrderV1(s, buyOrderId, ctx, buyPrice, remaining);
        }
    }
    
    function _matchBuyAtPrice(DiamondStorage.AppStorage storage s, bytes32 buyOrderId, TradeContext memory ctx, uint256 askPrice, uint256 remaining) internal returns (uint256) {
        bytes32 sellOrderId = s.askLevels[ctx.marketId][askPrice].head;
        
        while (remaining > 0 && sellOrderId != bytes32(0)) {
            uint256 fillAmount = _getFillAmount(s, sellOrderId, remaining);
            
            if (fillAmount > 0) {
                _executeTradeWithContext(s, buyOrderId, sellOrderId, ctx, askPrice, fillAmount);
                remaining -= fillAmount;
            }
            sellOrderId = s.orderQueue[sellOrderId].next;
        }
        return remaining;
    }
    
    function _matchSellOrder(DiamondStorage.AppStorage storage s, bytes32 sellOrderId, bytes32 marketId, address baseToken, uint256 baseTokenId, address quoteToken) internal {
        TradeContext memory ctx = TradeContext(marketId, baseToken, baseTokenId, quoteToken);
        (uint96 sellPrice, uint96 sellAmount, uint64 sellFilled) = _unpack(s.packedOrders[sellOrderId].priceAmountFilled);
        uint256 remaining = sellAmount - sellFilled;
        
        uint256 bidPrice = _getBestPrice(s.bidTreeMeta[marketId], s.bidTreeNodes[marketId], false);
        
        while (remaining > 0 && bidPrice > 0 && bidPrice >= sellPrice) {
            remaining = _matchSellAtPrice(s, sellOrderId, ctx, bidPrice, remaining);
            bidPrice = _getNextLower(s.bidTreeNodes[marketId], bidPrice);
        }
        
        // Check V1 legacy orders
        if (remaining > 0) {
            _matchSellOrderV1(s, sellOrderId, ctx, sellPrice, remaining);
        }
    }
    
    function _matchSellAtPrice(DiamondStorage.AppStorage storage s, bytes32 sellOrderId, TradeContext memory ctx, uint256 bidPrice, uint256 remaining) internal returns (uint256) {
        bytes32 buyOrderId = s.bidLevels[ctx.marketId][bidPrice].head;
        
        while (remaining > 0 && buyOrderId != bytes32(0)) {
            uint256 fillAmount = _getFillAmount(s, buyOrderId, remaining);
            
            if (fillAmount > 0) {
                _executeTradeWithContext(s, buyOrderId, sellOrderId, ctx, bidPrice, fillAmount);
                remaining -= fillAmount;
            }
            buyOrderId = s.orderQueue[buyOrderId].next;
        }
        return remaining;
    }
    
    // ============================================================================
    // V1 LEGACY MATCHING
    // ============================================================================
    
    function _matchBuyOrderV1(DiamondStorage.AppStorage storage s, bytes32 buyOrderId, TradeContext memory ctx, uint96 buyPrice, uint256 remaining) internal {
        address buyer = CLOBLib.unpackMaker(s.packedOrders[buyOrderId].makerAndFlags);
        uint256[] storage askPrices = s.askPrices[ctx.marketId];
        uint256 len = askPrices.length;
        
        for (uint256 i = 0; i < len && remaining > 0; i++) {
            uint256 askPrice = askPrices[i];
            if (askPrice > buyPrice) break;
            
            remaining = _matchV1AtPrice(s, buyOrderId, ctx, askPrice, remaining, buyer, true);
        }
    }
    
    function _matchSellOrderV1(DiamondStorage.AppStorage storage s, bytes32 sellOrderId, TradeContext memory ctx, uint96 sellPrice, uint256 remaining) internal {
        address seller = CLOBLib.unpackMaker(s.packedOrders[sellOrderId].makerAndFlags);
        uint256[] storage bidPrices = s.bidPrices[ctx.marketId];
        
        for (uint256 i = bidPrices.length; i > 0 && remaining > 0; i--) {
            uint256 bidPrice = bidPrices[i-1];
            if (bidPrice < sellPrice) break;
            
            remaining = _matchV1AtPrice(s, sellOrderId, ctx, bidPrice, remaining, seller, false);
        }
    }
    
    function _matchV1AtPrice(DiamondStorage.AppStorage storage s, bytes32 v2OrderId, TradeContext memory ctx, uint256 price, uint256 remaining, address v2Maker, bool v2IsBuy) internal returns (uint256) {
        bytes32[] storage orders = v2IsBuy ? s.askOrders[ctx.marketId][price] : s.bidOrders[ctx.marketId][price];
        uint256 len = orders.length;
        
        for (uint256 j = 0; j < len && remaining > 0; j++) {
            DiamondStorage.CLOBOrder storage v1Order = s.clobOrders[orders[j]];
            if (v1Order.status > 1) continue;
            
            uint256 fillAmount = CLOBLib.min(remaining, v1Order.amount - v1Order.filledAmount);
            if (fillAmount > 0) {
                _executeV1Trade(s, v2OrderId, orders[j], ctx, price, fillAmount, v2Maker, v1Order.maker, v2IsBuy);
                remaining -= fillAmount;
            }
        }
        return remaining;
    }
    
    // ============================================================================
    // TRADE EXECUTION
    // ============================================================================
    
    function _executeTrade(DiamondStorage.AppStorage storage s, bytes32 buyOrderId, bytes32 sellOrderId, bytes32 marketId, uint96 price, uint96 amount, address baseToken, uint256 baseTokenId, address quoteToken) internal {
        // Get participants
        address buyer = CLOBLib.unpackMaker(s.packedOrders[buyOrderId].makerAndFlags);
        address seller = CLOBLib.unpackMaker(s.packedOrders[sellOrderId].makerAndFlags);
        
        // Execute transfers
        _executeTransfers(baseToken, quoteToken, buyer, seller, baseTokenId, price, amount);
        
        // Update order state
        _updateOrderFilled(s.packedOrders[buyOrderId], amount);
        _updateOrderFilled(s.packedOrders[sellOrderId], amount);
        _updatePriceLevel(s, marketId, price, amount, true);
        _updatePriceLevel(s, marketId, price, amount, false);
        
        // Emit event
        _emitTradeEvent(s, buyOrderId, sellOrderId, price, amount);
    }
    
    function _executeTransfers(address baseToken, address quoteToken, address buyer, address seller, uint256 baseTokenId, uint96 price, uint96 amount) internal {
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        IERC1155(baseToken).safeTransferFrom(address(this), buyer, baseTokenId, amount, "");
        IERC20(quoteToken).transfer(seller, quoteAmount);
    }
    
    function _emitTradeEvent(DiamondStorage.AppStorage storage s, bytes32 buyOrderId, bytes32 sellOrderId, uint96 price, uint96 amount) internal {
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        bytes32 tradeId = keccak256(abi.encodePacked(buyOrderId, sellOrderId, block.timestamp, s.totalTrades++));
        emit TradeExecuted(tradeId, sellOrderId, buyOrderId, price, amount, quoteAmount);
    }
    
    function _executeV1Trade(DiamondStorage.AppStorage storage s, bytes32 v2OrderId, bytes32 v1OrderId, TradeContext memory ctx, uint256 price, uint256 amount, address v2Maker, address v1Maker, bool v2IsBuy) internal {
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(uint96(price), uint96(amount));
        
        address buyer = v2IsBuy ? v2Maker : v1Maker;
        address seller = v2IsBuy ? v1Maker : v2Maker;
        
        IERC1155(ctx.baseToken).safeTransferFrom(address(this), buyer, ctx.baseTokenId, amount, "");
        IERC20(ctx.quoteToken).transfer(seller, quoteAmount);
        
        _updateOrderFilled(s.packedOrders[v2OrderId], amount);
        
        DiamondStorage.CLOBOrder storage v1Order = s.clobOrders[v1OrderId];
        v1Order.filledAmount += amount;
        v1Order.updatedAt = block.timestamp;
        v1Order.status = v1Order.filledAmount >= v1Order.amount ? 2 : 1;
        
        bytes32 tradeId = keccak256(abi.encodePacked(v2OrderId, v1OrderId, block.timestamp, s.totalTrades++));
        emit TradeExecuted(tradeId, v2OrderId, v1OrderId, price, amount, quoteAmount);
    }
    
    // ============================================================================
    // ORDER CANCELLATION
    // ============================================================================
    
    function cancelOrderInternal(bytes32 orderId, uint8 reason) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        _cancelOrder(s, orderId, reason);
    }
    
    function _cancelOrder(DiamondStorage.AppStorage storage s, bytes32 orderId, uint8 reason) internal {
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        address maker = CLOBLib.unpackMaker(order.makerAndFlags);
        bool isBuy = CLOBLib.unpackIsBuy(order.makerAndFlags);
        (uint96 price, uint96 amount, uint64 filled) = _unpack(order.priceAmountFilled);
        uint96 remaining = amount - uint96(filled);
        
        order.makerAndFlags = CLOBLib.updateStatus(order.makerAndFlags, CLOBLib.STATUS_CANCELLED);
        _updatePriceLevel(s, order.marketId, price, remaining, isBuy);
        
        if (remaining > 0) {
            DiamondStorage.Market storage market = s.markets[order.marketId];
            if (isBuy) {
                IERC20(CLOBLib.stringToAddress(market.quoteToken)).transfer(maker, CLOBLib.calculateQuoteAmount(price, remaining));
            } else {
                IERC1155(CLOBLib.stringToAddress(market.baseToken)).safeTransferFrom(address(this), maker, market.baseTokenId, remaining, "");
            }
        }
        emit MatchingOrderCancelled(orderId, maker, remaining, reason);
    }
    
    // ============================================================================
    // HELPERS
    // ============================================================================
    
    function _unpack(uint256 packed) internal pure returns (uint96 price, uint96 amount, uint64 filled) {
        price = CLOBLib.unpackPrice(packed);
        amount = CLOBLib.unpackAmount(packed);
        filled = CLOBLib.unpackFilledAmount(packed);
    }
    
    function _updateOrderFilled(DiamondStorage.PackedOrder storage order, uint256 fillAmount) internal {
        (uint96 price, uint96 amount, uint64 filled) = _unpack(order.priceAmountFilled);
        uint64 newFilled = filled + uint64(fillAmount);
        order.priceAmountFilled = CLOBLib.packPriceAmountFilled(price, amount, newFilled);
        order.makerAndFlags = CLOBLib.updateStatus(order.makerAndFlags, newFilled >= amount ? CLOBLib.STATUS_FILLED : CLOBLib.STATUS_PARTIAL);
    }
    
    function _updatePriceLevel(DiamondStorage.AppStorage storage s, bytes32 marketId, uint256 price, uint256 amount, bool isBuy) internal {
        mapping(uint256 => DiamondStorage.PriceLevel) storage levels = isBuy ? s.bidLevels[marketId] : s.askLevels[marketId];
        mapping(uint256 => DiamondStorage.RBNode) storage nodes = isBuy ? s.bidTreeNodes[marketId] : s.askTreeNodes[marketId];
        if (levels[price].totalAmount >= amount) {
            levels[price].totalAmount -= amount;
            nodes[price].totalAmount -= amount;
        }
    }
    
    function _getBestPrice(DiamondStorage.RBTreeMeta storage meta, mapping(uint256 => DiamondStorage.RBNode) storage nodes, bool getMin) internal view returns (uint256) {
        if (meta.root == 0) return 0;
        uint256 c = meta.root;
        if (getMin) { while (nodes[c].left != 0) c = nodes[c].left; }
        else { while (nodes[c].right != 0) c = nodes[c].right; }
        return c;
    }
    
    function _getNextHigher(mapping(uint256 => DiamondStorage.RBNode) storage nodes, uint256 price) internal view returns (uint256) {
        if (nodes[price].right != 0) { uint256 c = nodes[price].right; while (nodes[c].left != 0) c = nodes[c].left; return c; }
        uint256 c = price; uint256 p = nodes[c].parent;
        while (p != 0 && c == nodes[p].right) { c = p; p = nodes[c].parent; }
        return p;
    }
    
    function _getNextLower(mapping(uint256 => DiamondStorage.RBNode) storage nodes, uint256 price) internal view returns (uint256) {
        if (nodes[price].left != 0) { uint256 c = nodes[price].left; while (nodes[c].right != 0) c = nodes[c].right; return c; }
        uint256 c = price; uint256 p = nodes[c].parent;
        while (p != 0 && c == nodes[p].left) { c = p; p = nodes[c].parent; }
        return p;
    }
    
    function _getFillAmount(DiamondStorage.AppStorage storage s, bytes32 orderId, uint256 remaining) internal view returns (uint256) {
        (, uint96 amount, uint64 filled) = _unpack(s.packedOrders[orderId].priceAmountFilled);
        return CLOBLib.min(remaining, amount - filled);
    }
    
    function _executeTradeWithContext(DiamondStorage.AppStorage storage s, bytes32 buyOrderId, bytes32 sellOrderId, TradeContext memory ctx, uint256 price, uint256 amount) internal {
        _executeTrade(s, buyOrderId, sellOrderId, ctx.marketId, uint96(price), uint96(amount), ctx.baseToken, ctx.baseTokenId, ctx.quoteToken);
    }
    
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }
    
    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}

