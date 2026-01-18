// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from './DiamondStorage.sol';
import { CLOBLib } from './CLOBLib.sol';
import { OrderBookLib } from './OrderBookLib.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @title OrderMatchingLib
 * @notice Library for order matching engine logic
 * @dev Extracted from OrderRouterFacet to reduce contract size and stack depth
 */
library OrderMatchingLib {
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
     * @notice Match a buy order against existing sell orders
     */
    function matchBuyOrder(
        DiamondStorage.AppStorage storage s,
        bytes32 buyOrderId,
        bytes32 marketId,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) internal {
        (uint96 buyPrice, uint96 buyAmount, uint64 buyFilled) = _unpackPriceAmountFilled(s.packedOrders[buyOrderId].priceAmountFilled);
        uint256 remaining = buyAmount - buyFilled;
        uint256 askPrice = OrderBookLib.getBestPrice(s.askTreeMeta[marketId], s.askTreeNodes[marketId], true);
        
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
            askPrice = OrderBookLib.getNextHigher(s.askTreeNodes[marketId], askPrice);
        }
    }

    /**
     * @notice Match a sell order against existing buy orders
     */
    function matchSellOrder(
        DiamondStorage.AppStorage storage s,
        bytes32 sellOrderId,
        bytes32 marketId,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) internal {
        (uint96 sellPrice, uint96 sellAmount, uint64 sellFilled) = _unpackPriceAmountFilled(s.packedOrders[sellOrderId].priceAmountFilled);
        uint256 remaining = sellAmount - sellFilled;
        uint256 bidPrice = OrderBookLib.getBestPrice(s.bidTreeMeta[marketId], s.bidTreeNodes[marketId], false);
        
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
            bidPrice = OrderBookLib.getNextLower(s.bidTreeNodes[marketId], bidPrice);
        }
    }

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
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        bool isBuy = CLOBLib.unpackIsBuy(order.makerAndFlags);
        
        if (isBuy) {
            matchBuyOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
        } else {
            matchSellOrder(s, orderId, marketId, baseToken, baseTokenId, quoteToken);
        }
    }

    // ============================================================================
    // INTERNAL HELPERS
    // ============================================================================

    function _executeTrade(
        DiamondStorage.AppStorage storage s,
        bytes32 buyOrderId,
        bytes32 sellOrderId,
        bytes32 marketId,
        uint96 price,
        uint96 amount,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) private {
        address buyer = CLOBLib.unpackMaker(s.packedOrders[buyOrderId].makerAndFlags);
        address seller = CLOBLib.unpackMaker(s.packedOrders[sellOrderId].makerAndFlags);
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        IERC1155(baseToken).safeTransferFrom(address(this), buyer, baseTokenId, amount, "");
        IERC20(quoteToken).transfer(seller, quoteAmount);
        
        _updateOrderFilled(s.packedOrders[buyOrderId], amount);
        _updateOrderFilled(s.packedOrders[sellOrderId], amount);
        
        bytes32 tradeId = keccak256(abi.encodePacked(buyOrderId, sellOrderId, block.timestamp, s.totalTrades++));
        emit RouterTradeExecuted(tradeId, sellOrderId, buyOrderId, price, amount, quoteAmount);
    }

    function _updateOrderFilled(DiamondStorage.PackedOrder storage order, uint256 fillAmount) private {
        (uint96 price, uint96 amount, uint64 filled) = _unpackPriceAmountFilled(order.priceAmountFilled);
        uint64 newFilled = filled + uint64(fillAmount);
        order.priceAmountFilled = CLOBLib.packPriceAmountFilled(price, amount, newFilled);
        order.makerAndFlags = CLOBLib.updateStatus(order.makerAndFlags, newFilled >= amount ? CLOBLib.STATUS_FILLED : CLOBLib.STATUS_PARTIAL);
    }

    function _unpackPriceAmountFilled(uint256 packed) private pure returns (uint96 price, uint96 amount, uint64 filled) {
        price = CLOBLib.unpackPrice(packed);
        amount = CLOBLib.unpackAmount(packed);
        filled = CLOBLib.unpackFilledAmount(packed);
    }

    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }
}
