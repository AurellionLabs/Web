// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from './DiamondStorage.sol';
import { CLOBLib } from './CLOBLib.sol';
import { OrderBookLib } from './OrderBookLib.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

/**
 * @title OrderMatchingLib
 * @notice Library for order matching engine logic
 * @dev Extracted from OrderRouterFacet to reduce contract size and stack depth.
 *      Uses context structs to minimize stack variables.
 */
library OrderMatchingLib {
    using SafeERC20 for IERC20;
    // ============================================================================
    // STRUCTS - Used to reduce stack depth
    // ============================================================================

    struct MatchContext {
        bytes32 marketId;
        address baseToken;
        uint256 baseTokenId;
        address quoteToken;
    }

    // ============================================================================
    // EVENTS
    // ============================================================================

    event RouterTradeExecuted(
        bytes32 indexed tradeId,
        bytes32 indexed takerOrderId,
        bytes32 indexed makerOrderId,
        uint256 price,
        uint256 amount,
        uint256 quoteAmount
    );

    // ============================================================================
    // MATCHING FUNCTIONS
    // ============================================================================

    /**
     * @notice Match an order (routes to buy or sell matching)
     */
    function matchOrder(
        DiamondStorage.AppStorage storage s,
        bytes32 orderId,
        bytes32 marketId,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) internal {
        bool isBuy = CLOBLib.unpackIsBuy(s.packedOrders[orderId].makerAndFlags);
        MatchContext memory ctx = MatchContext(marketId, baseToken, baseTokenId, quoteToken);
        
        if (isBuy) {
            _matchBuyOrder(s, orderId, ctx);
        } else {
            _matchSellOrder(s, orderId, ctx);
        }
    }

    /**
     * @notice Match a buy order against existing sell orders
     */
    function _matchBuyOrder(
        DiamondStorage.AppStorage storage s,
        bytes32 buyOrderId,
        MatchContext memory ctx
    ) private {
        uint96 buyPrice = CLOBLib.unpackPrice(s.packedOrders[buyOrderId].priceAmountFilled);
        uint256 remaining = _getRemaining(s, buyOrderId);
        uint256 askPrice = OrderBookLib.getBestPrice(s.askTreeMeta[ctx.marketId], s.askTreeNodes[ctx.marketId], true);
        
        while (remaining > 0 && askPrice > 0 && askPrice <= buyPrice) {
            remaining = _matchBuyAtPrice(s, buyOrderId, ctx, askPrice, remaining);
            askPrice = OrderBookLib.getNextHigher(s.askTreeNodes[ctx.marketId], askPrice);
        }
    }

    /**
     * @notice Match buy order at a specific price level
     */
    function _matchBuyAtPrice(
        DiamondStorage.AppStorage storage s,
        bytes32 buyOrderId,
        MatchContext memory ctx,
        uint256 askPrice,
        uint256 remaining
    ) private returns (uint256) {
        bytes32 sellOrderId = s.askLevels[ctx.marketId][askPrice].head;
        
        while (remaining > 0 && sellOrderId != bytes32(0)) {
            uint256 fillAmount = _calculateFill(s, sellOrderId, remaining);
            if (fillAmount > 0) {
                _executeTrade(s, buyOrderId, sellOrderId, ctx, uint96(askPrice), uint96(fillAmount));
                remaining -= fillAmount;
            }
            sellOrderId = s.orderQueue[sellOrderId].next;
        }
        return remaining;
    }

    /**
     * @notice Match a sell order against existing buy orders
     */
    function _matchSellOrder(
        DiamondStorage.AppStorage storage s,
        bytes32 sellOrderId,
        MatchContext memory ctx
    ) private {
        uint96 sellPrice = CLOBLib.unpackPrice(s.packedOrders[sellOrderId].priceAmountFilled);
        uint256 remaining = _getRemaining(s, sellOrderId);
        uint256 bidPrice = OrderBookLib.getBestPrice(s.bidTreeMeta[ctx.marketId], s.bidTreeNodes[ctx.marketId], false);
        
        while (remaining > 0 && bidPrice > 0 && bidPrice >= sellPrice) {
            remaining = _matchSellAtPrice(s, sellOrderId, ctx, bidPrice, remaining);
            bidPrice = OrderBookLib.getNextLower(s.bidTreeNodes[ctx.marketId], bidPrice);
        }
    }

    /**
     * @notice Match sell order at a specific price level
     */
    function _matchSellAtPrice(
        DiamondStorage.AppStorage storage s,
        bytes32 sellOrderId,
        MatchContext memory ctx,
        uint256 bidPrice,
        uint256 remaining
    ) private returns (uint256) {
        bytes32 buyOrderId = s.bidLevels[ctx.marketId][bidPrice].head;
        
        while (remaining > 0 && buyOrderId != bytes32(0)) {
            uint256 fillAmount = _calculateFill(s, buyOrderId, remaining);
            if (fillAmount > 0) {
                _executeTrade(s, buyOrderId, sellOrderId, ctx, uint96(bidPrice), uint96(fillAmount));
                remaining -= fillAmount;
            }
            buyOrderId = s.orderQueue[buyOrderId].next;
        }
        return remaining;
    }

    // ============================================================================
    // INTERNAL HELPERS
    // ============================================================================

    /**
     * @notice Get remaining unfilled amount for an order
     */
    function _getRemaining(
        DiamondStorage.AppStorage storage s,
        bytes32 orderId
    ) private view returns (uint256) {
        uint256 packed = s.packedOrders[orderId].priceAmountFilled;
        uint96 amount = CLOBLib.unpackAmount(packed);
        uint64 filled = CLOBLib.unpackFilledAmount(packed);
        return amount - filled;
    }

    /**
     * @notice Calculate fill amount for a counter-order
     */
    function _calculateFill(
        DiamondStorage.AppStorage storage s,
        bytes32 orderId,
        uint256 remaining
    ) private view returns (uint256) {
        uint256 counterRemaining = _getRemaining(s, orderId);
        return remaining < counterRemaining ? remaining : counterRemaining;
    }

    /**
     * @notice Execute a trade between two orders
     */
    function _executeTrade(
        DiamondStorage.AppStorage storage s,
        bytes32 buyOrderId,
        bytes32 sellOrderId,
        MatchContext memory ctx,
        uint96 price,
        uint96 amount
    ) private {
        // Get participants and calculate quote
        address buyer = CLOBLib.unpackMaker(s.packedOrders[buyOrderId].makerAndFlags);
        address seller = CLOBLib.unpackMaker(s.packedOrders[sellOrderId].makerAndFlags);
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        // Execute transfers
        IERC1155(ctx.baseToken).safeTransferFrom(address(this), buyer, ctx.baseTokenId, amount, "");
        IERC20(ctx.quoteToken).safeTransfer(seller, quoteAmount);
        
        // Update both orders
        _updateOrderFilled(s.packedOrders[buyOrderId], amount);
        _updateOrderFilled(s.packedOrders[sellOrderId], amount);
        
        // Emit trade event
        _emitTradeEvent(s, buyOrderId, sellOrderId, price, amount, quoteAmount);
    }

    /**
     * @notice Update order filled amount and status
     * @dev Optimized: only updates status if it actually changes (saves ~5000 gas per partial fill)
     */
    function _updateOrderFilled(
        DiamondStorage.PackedOrder storage order,
        uint256 fillAmount
    ) private {
        uint256 packed = order.priceAmountFilled;
        uint96 price = CLOBLib.unpackPrice(packed);
        uint96 amount = CLOBLib.unpackAmount(packed);
        uint64 filled = CLOBLib.unpackFilledAmount(packed);
        uint64 newFilled = filled + uint64(fillAmount);
        
        order.priceAmountFilled = CLOBLib.packPriceAmountFilled(price, amount, newFilled);
        
        // Only update status if changing - saves gas on repeated partial fills
        uint8 currentStatus = CLOBLib.unpackStatus(order.makerAndFlags);
        uint8 newStatus = newFilled >= amount ? CLOBLib.STATUS_FILLED : CLOBLib.STATUS_PARTIAL;
        if (currentStatus != newStatus) {
            order.makerAndFlags = CLOBLib.updateStatus(order.makerAndFlags, newStatus);
        }
    }

    /**
     * @notice Emit trade executed event (separated to reduce stack in _executeTrade)
     */
    function _emitTradeEvent(
        DiamondStorage.AppStorage storage s,
        bytes32 buyOrderId,
        bytes32 sellOrderId,
        uint96 price,
        uint96 amount,
        uint256 quoteAmount
    ) private {
        bytes32 tradeId = keccak256(abi.encodePacked(buyOrderId, sellOrderId, block.timestamp, s.totalTrades++));
        emit RouterTradeExecuted(tradeId, sellOrderId, buyOrderId, price, amount, quoteAmount);
    }
}
