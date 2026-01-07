// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { CLOBLib } from '../libraries/CLOBLib.sol';

/**
 * @title CLOBViewFacet
 * @notice Gas-efficient view functions for CLOB data
 * @dev Separated from main facet for cleaner organization and gas optimization
 */
contract CLOBViewFacet {
    // ============================================================================
    // ORDER BOOK VIEWS
    // ============================================================================
    
    /**
     * @notice Get best bid and ask for a market
     * @param marketId Market identifier
     * @return bestBid Best bid price
     * @return bestBidSize Total size at best bid
     * @return bestAsk Best ask price
     * @return bestAskSize Total size at best ask
     * @return spread Spread between best bid and ask
     */
    function getBestBidAsk(bytes32 marketId) external view returns (
        uint256 bestBid,
        uint256 bestBidSize,
        uint256 bestAsk,
        uint256 bestAskSize,
        uint256 spread
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        bestBid = _getBestPrice(s.bidTreeMeta[marketId], s.bidTreeNodes[marketId], false);
        bestAsk = _getBestPrice(s.askTreeMeta[marketId], s.askTreeNodes[marketId], true);
        
        if (bestBid != 0) {
            bestBidSize = s.bidLevels[marketId][bestBid].totalAmount;
        }
        
        if (bestAsk != 0) {
            bestAskSize = s.askLevels[marketId][bestAsk].totalAmount;
        }
        
        if (bestBid != 0 && bestAsk != 0 && bestAsk > bestBid) {
            spread = bestAsk - bestBid;
        }
    }
    
    /**
     * @notice Get order book depth for a market
     * @param marketId Market identifier
     * @param levels Number of price levels to return
     * @return bidPrices Array of bid prices (descending)
     * @return bidSizes Array of total sizes at each bid price
     * @return bidCounts Array of order counts at each bid price
     * @return askPrices Array of ask prices (ascending)
     * @return askSizes Array of total sizes at each ask price
     * @return askCounts Array of order counts at each ask price
     */
    function getOrderBookDepth(bytes32 marketId, uint256 levels) external view returns (
        uint256[] memory bidPrices,
        uint256[] memory bidSizes,
        uint256[] memory bidCounts,
        uint256[] memory askPrices,
        uint256[] memory askSizes,
        uint256[] memory askCounts
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        bidPrices = new uint256[](levels);
        bidSizes = new uint256[](levels);
        bidCounts = new uint256[](levels);
        askPrices = new uint256[](levels);
        askSizes = new uint256[](levels);
        askCounts = new uint256[](levels);
        
        // Get bids (highest to lowest)
        uint256 price = _getBestPrice(s.bidTreeMeta[marketId], s.bidTreeNodes[marketId], false);
        for (uint256 i = 0; i < levels && price != 0; i++) {
            bidPrices[i] = price;
            bidSizes[i] = s.bidLevels[marketId][price].totalAmount;
            bidCounts[i] = s.bidLevels[marketId][price].orderCount;
            price = _getNextLower(s.bidTreeNodes[marketId], price);
        }
        
        // Get asks (lowest to highest)
        price = _getBestPrice(s.askTreeMeta[marketId], s.askTreeNodes[marketId], true);
        for (uint256 i = 0; i < levels && price != 0; i++) {
            askPrices[i] = price;
            askSizes[i] = s.askLevels[marketId][price].totalAmount;
            askCounts[i] = s.askLevels[marketId][price].orderCount;
            price = _getNextHigher(s.askTreeNodes[marketId], price);
        }
    }
    
    // ============================================================================
    // ORDER VIEWS
    // ============================================================================
    
    /**
     * @notice Get packed order details
     * @param orderId Order identifier
     */
    function getPackedOrder(bytes32 orderId) external view returns (
        address maker,
        bool isBuy,
        uint8 orderType,
        uint8 status,
        uint8 timeInForce,
        uint96 price,
        uint96 amount,
        uint64 filledAmount,
        uint40 expiry,
        uint40 createdAt,
        bytes32 marketId
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        
        maker = CLOBLib.unpackMaker(order.makerAndFlags);
        isBuy = CLOBLib.unpackIsBuy(order.makerAndFlags);
        orderType = CLOBLib.unpackOrderType(order.makerAndFlags);
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
     * @notice Get order status and fill info
     * @param orderId Order identifier
     */
    function getOrderStatus(bytes32 orderId) external view returns (
        uint8 status,
        uint96 amount,
        uint64 filledAmount,
        uint96 remainingAmount,
        bool isExpired
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        
        status = CLOBLib.unpackStatus(order.makerAndFlags);
        amount = CLOBLib.unpackAmount(order.priceAmountFilled);
        filledAmount = CLOBLib.unpackFilledAmount(order.priceAmountFilled);
        remainingAmount = CLOBLib.getRemainingAmount(order.priceAmountFilled);
        isExpired = CLOBLib.isExpired(order.expiryAndMeta);
    }
    
    /**
     * @notice Get orders at a specific price level
     * @param marketId Market identifier
     * @param price Price level
     * @param isBid True for bid side, false for ask side
     * @param maxOrders Maximum orders to return
     */
    function getOrdersAtPrice(
        bytes32 marketId,
        uint256 price,
        bool isBid,
        uint256 maxOrders
    ) external view returns (
        bytes32[] memory orderIds,
        address[] memory makers,
        uint96[] memory amounts,
        uint64[] memory filledAmounts
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        mapping(uint256 => DiamondStorage.PriceLevel) storage levels = 
            isBid ? s.bidLevels[marketId] : s.askLevels[marketId];
        
        DiamondStorage.PriceLevel storage level = levels[price];
        
        // Count orders at this level
        uint256 count = level.orderCount < maxOrders ? level.orderCount : maxOrders;
        
        orderIds = new bytes32[](count);
        makers = new address[](count);
        amounts = new uint96[](count);
        filledAmounts = new uint64[](count);
        
        bytes32 orderId = level.head;
        for (uint256 i = 0; i < count && orderId != bytes32(0); i++) {
            DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
            
            orderIds[i] = orderId;
            makers[i] = CLOBLib.unpackMaker(order.makerAndFlags);
            amounts[i] = CLOBLib.unpackAmount(order.priceAmountFilled);
            filledAmounts[i] = CLOBLib.unpackFilledAmount(order.priceAmountFilled);
            
            orderId = s.orderQueue[orderId].next;
        }
    }
    
    // ============================================================================
    // MARKET VIEWS
    // ============================================================================
    
    /**
     * @notice Get market information
     * @param marketId Market identifier
     */
    function getMarket(bytes32 marketId) external view returns (
        string memory baseToken,
        uint256 baseTokenId,
        string memory quoteToken,
        bool active,
        uint256 createdAt,
        uint256 lastTradePrice,
        uint256 bidCount,
        uint256 askCount
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.Market storage market = s.markets[marketId];
        
        baseToken = market.baseToken;
        baseTokenId = market.baseTokenId;
        quoteToken = market.quoteToken;
        active = market.active;
        createdAt = market.createdAt;
        lastTradePrice = s.circuitBreakers[marketId].lastPrice;
        bidCount = s.bidTreeMeta[marketId].count;
        askCount = s.askTreeMeta[marketId].count;
    }
    
    /**
     * @notice Get all market IDs
     */
    function getAllMarkets() external view returns (bytes32[] memory) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.marketIds;
    }
    
    /**
     * @notice Get market statistics
     * @param marketId Market identifier
     */
    function getMarketStats(bytes32 marketId) external view returns (
        uint256 totalBidVolume,
        uint256 totalAskVolume,
        uint256 totalBidOrders,
        uint256 totalAskOrders,
        uint256 priceLevelsBid,
        uint256 priceLevelsAsk,
        uint256 lastTradePrice,
        bool circuitBreakerTripped
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        priceLevelsBid = s.bidTreeMeta[marketId].count;
        priceLevelsAsk = s.askTreeMeta[marketId].count;
        lastTradePrice = s.circuitBreakers[marketId].lastPrice;
        circuitBreakerTripped = s.circuitBreakers[marketId].isTripped;
        
        // Calculate totals by iterating price levels
        uint256 price = _getBestPrice(s.bidTreeMeta[marketId], s.bidTreeNodes[marketId], false);
        while (price != 0) {
            totalBidVolume += s.bidLevels[marketId][price].totalAmount;
            totalBidOrders += s.bidLevels[marketId][price].orderCount;
            price = _getNextLower(s.bidTreeNodes[marketId], price);
        }
        
        price = _getBestPrice(s.askTreeMeta[marketId], s.askTreeNodes[marketId], true);
        while (price != 0) {
            totalAskVolume += s.askLevels[marketId][price].totalAmount;
            totalAskOrders += s.askLevels[marketId][price].orderCount;
            price = _getNextHigher(s.askTreeNodes[marketId], price);
        }
    }
    
    // ============================================================================
    // TRADE VIEWS
    // ============================================================================
    
    /**
     * @notice Get trade details
     * @param tradeId Trade identifier
     */
    function getTrade(bytes32 tradeId) external view returns (
        bytes32 takerOrderId,
        bytes32 makerOrderId,
        address taker,
        address maker,
        bytes32 marketId,
        uint256 price,
        uint256 amount,
        uint256 quoteAmount,
        uint256 timestamp
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.Trade storage trade = s.trades[tradeId];
        
        return (
            trade.takerOrderId,
            trade.makerOrderId,
            trade.taker,
            trade.maker,
            trade.marketId,
            trade.price,
            trade.amount,
            trade.quoteAmount,
            trade.timestamp
        );
    }
    
    /**
     * @notice Get recent trades for a market
     * @param marketId Market identifier
     * @param count Number of trades to return
     */
    function getRecentTrades(bytes32 marketId, uint256 count) external view returns (
        bytes32[] memory tradeIds,
        uint256[] memory prices,
        uint256[] memory amounts,
        uint256[] memory timestamps,
        bool[] memory takerIsBuys
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        // Count matching trades from the end
        uint256 totalTrades = s.tradeIds.length;
        uint256 matchCount = 0;
        
        for (uint256 i = totalTrades; i > 0 && matchCount < count; i--) {
            bytes32 tradeId = s.tradeIds[i - 1];
            if (s.trades[tradeId].marketId == marketId) {
                matchCount++;
            }
        }
        
        tradeIds = new bytes32[](matchCount);
        prices = new uint256[](matchCount);
        amounts = new uint256[](matchCount);
        timestamps = new uint256[](matchCount);
        takerIsBuys = new bool[](matchCount);
        
        uint256 idx = 0;
        for (uint256 i = totalTrades; i > 0 && idx < matchCount; i--) {
            bytes32 tradeId = s.tradeIds[i - 1];
            DiamondStorage.Trade storage trade = s.trades[tradeId];
            
            if (trade.marketId == marketId) {
                tradeIds[idx] = tradeId;
                prices[idx] = trade.price;
                amounts[idx] = trade.amount;
                timestamps[idx] = trade.timestamp;
                
                // Determine if taker was buying
                DiamondStorage.PackedOrder storage takerOrder = s.packedOrders[trade.takerOrderId];
                takerIsBuys[idx] = CLOBLib.unpackIsBuy(takerOrder.makerAndFlags);
                
                idx++;
            }
        }
    }
    
    // ============================================================================
    // COMMITMENT VIEWS
    // ============================================================================
    
    /**
     * @notice Get commitment details
     * @param commitmentId Commitment identifier
     */
    function getCommitment(bytes32 commitmentId) external view returns (
        bytes32 commitment,
        uint256 commitBlock,
        address committer,
        bool revealed,
        bool expired,
        uint256 revealDeadline
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.CommittedOrder storage committed = s.committedOrders[commitmentId];
        
        commitment = committed.commitment;
        commitBlock = committed.commitBlock;
        committer = committed.committer;
        revealed = committed.revealed;
        expired = committed.expired;
        
        // Calculate reveal deadline (50 blocks after commit)
        revealDeadline = committed.commitBlock + 50;
    }
    
    // ============================================================================
    // UTILITY VIEWS
    // ============================================================================
    
    /**
     * @notice Calculate quote amount for a given order
     * @param price Price per unit
     * @param amount Amount of base tokens
     */
    function calculateQuoteAmount(uint96 price, uint96 amount) external pure returns (uint256) {
        return CLOBLib.calculateQuoteAmount(price, amount);
    }
    
    /**
     * @notice Get total counts
     */
    function getTotalCounts() external view returns (
        uint256 totalMarkets,
        uint256 totalOrders,
        uint256 totalTrades
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return (s.totalMarkets, s.totalCLOBOrders, s.totalTrades);
    }
    
    /**
     * @notice Check if an order is active
     * @param orderId Order identifier
     */
    function isOrderActive(bytes32 orderId) external view returns (bool) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        
        if (order.makerAndFlags == 0) return false;
        
        uint8 status = CLOBLib.unpackStatus(order.makerAndFlags);
        if (status != CLOBLib.STATUS_OPEN && status != CLOBLib.STATUS_PARTIAL) return false;
        
        return !CLOBLib.isExpired(order.expiryAndMeta);
    }
    
    /**
     * @notice Get market ID from token parameters
     */
    function getMarketId(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(baseToken, baseTokenId, quoteToken));
    }
    
    // ============================================================================
    // INTERNAL TREE HELPERS
    // ============================================================================
    
    function _getBestPrice(
        DiamondStorage.RBTreeMeta storage meta,
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        bool findMin
    ) internal view returns (uint256) {
        if (meta.root == 0) return 0;
        
        uint256 current = meta.root;
        if (findMin) {
            // Find minimum (for asks - buyer wants lowest price)
            while (nodes[current].left != 0 && nodes[nodes[current].left].exists) {
                current = nodes[current].left;
            }
        } else {
            // Find maximum (for bids - seller wants highest price)
            while (nodes[current].right != 0 && nodes[nodes[current].right].exists) {
                current = nodes[current].right;
            }
        }
        
        // Skip empty price levels
        while (current != 0 && nodes[current].orderCount == 0) {
            current = findMin ? _getNextHigher(nodes, current) : _getNextLower(nodes, current);
        }
        
        return current;
    }
    
    function _getNextHigher(
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        uint256 price
    ) internal view returns (uint256) {
        if (!nodes[price].exists) return 0;
        
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
        if (!nodes[price].exists) return 0;
        
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
}
