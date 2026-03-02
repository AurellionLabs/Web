// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { CLOBLib } from '../libraries/CLOBLib.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/**
 * @title CLOBMatchingFacet
 * @notice Order matching engine (split from CLOBFacetV2)
 * @dev Handles order matching, trade execution, and settlement
 */
contract CLOBMatchingFacet is ReentrancyGuard {
    
    // ============================================================================
    // EVENTS
    // ============================================================================
    
    event MatchingOrderFilled(
        bytes32 indexed orderId,
        bytes32 indexed tradeId,
        uint256 fillAmount,
        uint256 fillPrice,
        uint256 remainingAmount,
        uint256 cumulativeFilled
    );
    
    event TradeExecuted(
        bytes32 indexed tradeId,
        bytes32 indexed takerOrderId,
        bytes32 indexed makerOrderId,
        address taker,
        address maker,
        bytes32 marketId,
        uint256 price,
        uint256 amount,
        uint256 quoteAmount,
        uint256 takerFee,
        uint256 makerFee,
        uint256 timestamp,
        bool takerIsBuy
    );
    
    event MarketDepthChanged(
        bytes32 indexed marketId,
        uint256 bestBid,
        uint256 bestBidSize,
        uint256 bestAsk,
        uint256 bestAskSize,
        uint256 spread
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
    
    // ============================================================================
    // ERRORS
    // ============================================================================
    
    error OrderNotFound();
    error MarketPaused();
    error CircuitBreakerTrippedError();
    error FOKNotFilled();
    
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
    
    // ============================================================================
    // MATCHING FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Match an order against the order book
     * @dev Called after order creation to attempt matching
     */
    function matchOrder(
        bytes32 orderId,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) external nonReentrant whenNotPaused returns (uint256 totalFilled) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        
        if (order.makerAndFlags == 0) revert OrderNotFound();
        
        bytes32 marketId = order.marketId;
        totalFilled = _matchOrder(orderId, marketId, baseToken, baseTokenId, quoteToken);
        
        // Emit market depth change
        _emitMarketDepth(marketId);
    }
    
    // ============================================================================
    // INTERNAL MATCHING FUNCTIONS
    // ============================================================================
    
    function _matchOrder(
        bytes32 takerOrderId,
        bytes32 marketId,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) internal returns (uint256 totalFilled) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage takerOrder = s.packedOrders[takerOrderId];
        
        bool takerIsBuy = CLOBLib.unpackIsBuy(takerOrder.makerAndFlags);
        uint96 takerPrice = CLOBLib.unpackPrice(takerOrder.priceAmountFilled);
        
        DiamondStorage.RBTreeMeta storage oppositeMeta = takerIsBuy ? s.askTreeMeta[marketId] : s.bidTreeMeta[marketId];
        mapping(uint256 => DiamondStorage.RBNode) storage oppositeNodes = 
            takerIsBuy ? s.askTreeNodes[marketId] : s.bidTreeNodes[marketId];
        
        uint256 bestPrice = _getBestPrice(oppositeMeta, oppositeNodes, takerIsBuy);
        
        while (bestPrice != 0) {
            if (takerIsBuy && bestPrice > takerPrice) break;
            if (!takerIsBuy && bestPrice < takerPrice) break;
            
            uint96 takerRemaining = CLOBLib.getRemainingAmount(takerOrder.priceAmountFilled);
            if (takerRemaining == 0) break;
            
            uint256 filledAtLevel = _matchAtPriceLevel(
                takerOrderId,
                marketId,
                bestPrice,
                takerIsBuy,
                baseToken,
                baseTokenId,
                quoteToken
            );
            
            totalFilled += filledAtLevel;
            bestPrice = _getNextPrice(oppositeNodes, bestPrice, takerIsBuy);
        }
    }
    
    function _matchAtPriceLevel(
        bytes32 takerOrderId,
        bytes32 marketId,
        uint256 price,
        bool takerIsBuy,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) internal returns (uint256 filledAtLevel) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        mapping(uint256 => DiamondStorage.PriceLevel) storage levels = 
            takerIsBuy ? s.askLevels[marketId] : s.bidLevels[marketId];
        
        DiamondStorage.PriceLevel storage level = levels[price];
        bytes32 makerOrderId = level.head;
        
        while (makerOrderId != bytes32(0)) {
            DiamondStorage.PackedOrder storage takerOrder = s.packedOrders[takerOrderId];
            uint96 takerRemaining = CLOBLib.getRemainingAmount(takerOrder.priceAmountFilled);
            if (takerRemaining == 0) break;
            
            DiamondStorage.PackedOrder storage makerOrder = s.packedOrders[makerOrderId];
            
            uint8 makerStatus = CLOBLib.unpackStatus(makerOrder.makerAndFlags);
            if (makerStatus != CLOBLib.STATUS_OPEN && makerStatus != CLOBLib.STATUS_PARTIAL) {
                makerOrderId = s.orderQueue[makerOrderId].next;
                continue;
            }
            
            if (CLOBLib.isExpired(makerOrder.expiryAndMeta)) {
                bytes32 nextOrder = s.orderQueue[makerOrderId].next;
                _cancelOrderInternal(makerOrderId, 1);
                makerOrderId = nextOrder;
                continue;
            }
            
            uint96 makerRemaining = CLOBLib.getRemainingAmount(makerOrder.priceAmountFilled);
            uint96 fillAmount = takerRemaining < makerRemaining ? takerRemaining : makerRemaining;
            
            if (fillAmount > 0) {
                _executeTrade(
                    takerOrderId,
                    makerOrderId,
                    fillAmount,
                    uint96(price),
                    baseToken,
                    baseTokenId,
                    quoteToken,
                    takerIsBuy
                );
                filledAtLevel += fillAmount;
            }
            
            makerOrderId = s.orderQueue[makerOrderId].next;
        }
    }
    
    function _executeTrade(
        bytes32 takerOrderId,
        bytes32 makerOrderId,
        uint96 fillAmount,
        uint96 price,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        bool takerIsBuy
    ) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage takerOrder = s.packedOrders[takerOrderId];
        DiamondStorage.PackedOrder storage makerOrder = s.packedOrders[makerOrderId];
        
        address taker = CLOBLib.unpackMaker(takerOrder.makerAndFlags);
        address maker = CLOBLib.unpackMaker(makerOrder.makerAndFlags);
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, fillAmount);
        
        uint256 takerFee = (quoteAmount * s.takerFeeBps) / BASIS_POINTS;
        uint256 makerFee = (quoteAmount * s.makerFeeBps) / BASIS_POINTS;
        
        uint64 takerNewFilled = uint64(CLOBLib.unpackFilledAmount(takerOrder.priceAmountFilled) + fillAmount);
        uint64 makerNewFilled = uint64(CLOBLib.unpackFilledAmount(makerOrder.priceAmountFilled) + fillAmount);
        
        takerOrder.priceAmountFilled = CLOBLib.updateFilledAmount(takerOrder.priceAmountFilled, takerNewFilled);
        makerOrder.priceAmountFilled = CLOBLib.updateFilledAmount(makerOrder.priceAmountFilled, makerNewFilled);
        
        uint96 takerAmount = CLOBLib.unpackAmount(takerOrder.priceAmountFilled);
        uint96 makerAmount = CLOBLib.unpackAmount(makerOrder.priceAmountFilled);
        
        if (takerNewFilled >= takerAmount) {
            takerOrder.makerAndFlags = CLOBLib.updateStatus(takerOrder.makerAndFlags, CLOBLib.STATUS_FILLED);
            _removeFromOrderBook(takerOrderId);
        } else {
            takerOrder.makerAndFlags = CLOBLib.updateStatus(takerOrder.makerAndFlags, CLOBLib.STATUS_PARTIAL);
        }
        
        if (makerNewFilled >= makerAmount) {
            makerOrder.makerAndFlags = CLOBLib.updateStatus(makerOrder.makerAndFlags, CLOBLib.STATUS_FILLED);
            _removeFromOrderBook(makerOrderId);
        } else {
            makerOrder.makerAndFlags = CLOBLib.updateStatus(makerOrder.makerAndFlags, CLOBLib.STATUS_PARTIAL);
        }
        
        // Transfer tokens
        if (takerIsBuy) {
            IERC1155(baseToken).safeTransferFrom(address(this), taker, baseTokenId, fillAmount, "");
            IERC20(quoteToken).transfer(maker, quoteAmount - makerFee);
        } else {
            IERC1155(baseToken).safeTransferFrom(address(this), maker, baseTokenId, fillAmount, "");
            IERC20(quoteToken).transfer(taker, quoteAmount - takerFee);
        }
        
        // Collect fees
        if (takerFee + makerFee > 0 && s.feeRecipient != address(0)) {
            IERC20(quoteToken).transfer(s.feeRecipient, takerFee + makerFee);
        }
        
        s.circuitBreakers[takerOrder.marketId].lastPrice = price;
        
        bytes32 tradeId = keccak256(abi.encodePacked(takerOrderId, makerOrderId, block.timestamp, s.totalTrades));
        s.totalTrades++;
        
        emit TradeExecuted(
            tradeId,
            takerOrderId,
            makerOrderId,
            taker,
            maker,
            takerOrder.marketId,
            price,
            fillAmount,
            quoteAmount,
            takerFee,
            makerFee,
            block.timestamp,
            takerIsBuy
        );
        
        emit MatchingOrderFilled(takerOrderId, tradeId, fillAmount, price, takerAmount - takerNewFilled, takerNewFilled);
        emit MatchingOrderFilled(makerOrderId, tradeId, fillAmount, price, makerAmount - makerNewFilled, makerNewFilled);
    }
    
    // ============================================================================
    // TREE NAVIGATION
    // ============================================================================
    
    function _getBestPrice(
        DiamondStorage.RBTreeMeta storage meta,
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        bool findMin
    ) internal view returns (uint256) {
        if (meta.root == 0) return 0;
        
        uint256 current = meta.root;
        if (findMin) {
            while (nodes[current].left != 0 && nodes[nodes[current].left].exists) {
                current = nodes[current].left;
            }
        } else {
            while (nodes[current].right != 0 && nodes[nodes[current].right].exists) {
                current = nodes[current].right;
            }
        }
        
        while (current != 0 && nodes[current].orderCount == 0) {
            current = findMin ? _getNextHigher(nodes, current) : _getNextLower(nodes, current);
        }
        
        return current;
    }
    
    function _getNextPrice(
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        uint256 current,
        bool ascending
    ) internal view returns (uint256) {
        uint256 next = ascending ? _getNextHigher(nodes, current) : _getNextLower(nodes, current);
        
        while (next != 0 && nodes[next].orderCount == 0) {
            next = ascending ? _getNextHigher(nodes, next) : _getNextLower(nodes, next);
        }
        
        return next;
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
        
        uint256 parent = nodes[price].parent;
        while (parent != 0 && price == nodes[parent].right) {
            price = parent;
            parent = nodes[parent].parent;
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
        
        uint256 parent = nodes[price].parent;
        while (parent != 0 && price == nodes[parent].left) {
            price = parent;
            parent = nodes[parent].parent;
        }
        return parent;
    }
    
    // ============================================================================
    // ORDER BOOK MANAGEMENT
    // ============================================================================
    
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
    
    function _cancelOrderInternal(bytes32 orderId, uint8 reason) internal {
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
    
    function _emitMarketDepth(bytes32 marketId) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        uint256 bestBid = _getBestPrice(s.bidTreeMeta[marketId], s.bidTreeNodes[marketId], false);
        uint256 bestAsk = _getBestPrice(s.askTreeMeta[marketId], s.askTreeNodes[marketId], true);
        
        uint256 bestBidSize = bestBid != 0 ? s.bidLevels[marketId][bestBid].totalAmount : 0;
        uint256 bestAskSize = bestAsk != 0 ? s.askLevels[marketId][bestAsk].totalAmount : 0;
        
        uint256 spread = (bestBid != 0 && bestAsk != 0 && bestAsk > bestBid) ? bestAsk - bestBid : 0;
        
        emit MarketDepthChanged(marketId, bestBid, bestBidSize, bestAsk, bestAskSize, spread);
    }
    
    // ERC1155 Receiver
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }
    
    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}

