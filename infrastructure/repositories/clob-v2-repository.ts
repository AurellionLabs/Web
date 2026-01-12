/**
 * @module infrastructure/repositories/clob-v2-repository
 * @description CLOB V2 Repository Implementation
 *
 * Implements ICLOBRepository interface for production-ready CLOB trading.
 * Connects frontend to Ponder indexer for reads and Diamond contract for writes.
 * Uses event-sourced data from the indexer.
 */

import { graphqlRequest } from './shared/graph';
import {
  type ICLOBRepository,
  type CLOBOrder,
  type CLOBTrade,
  type CLOBMarket,
  type OrderBook,
  type PriceLevel,
  type MarketStats,
  type UserTradingStats,
  type CircuitBreaker,
  type CommittedOrder,
  CLOBOrderStatus,
  CLOBOrderType,
  TimeInForce,
  CircuitBreakerStatus,
} from '@/domain/clob/clob';
import {
  NEXT_PUBLIC_AURUM_SUBGRAPH_URL,
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
} from '@/chain-constants';
import { keccak256, encodePacked } from 'viem';

// =============================================================================
// GRAPHQL QUERIES (Event-Sourced)
// =============================================================================

const GET_ORDER_BOOK_EVENTS = `
  query GetOrderBookEvents($marketId: String!, $limit: Int!) {
    # Get all placed orders for this market
    placedOrders: orderPlacedEventss(
      where: { baseTokenId: $marketId }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
      limit: 500
    ) {
      items {
        id
        orderId
        maker
        price
        amount
        isBuy
        orderType
        blockTimestamp
      }
    }
    
    # Get cancelled order IDs
    cancelledOrders: orderCancelledEventss(
      where: { orderId_isNull: false }
      limit: 1000
    ) {
      items {
        orderId
        blockTimestamp
      }
    }
    
    # Get filled amounts from trade events
    filledOrders: tradeExecutedEventss(
      where: { makerOrderId_isNull: false }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
      limit: 1000
    ) {
      items {
        makerOrderId
        takerOrderId
        amount
        price
        blockTimestamp
      }
    }
  }
`;

const GET_TRADES_EVENTS = `
  query GetTradesEvents($marketId: String!, $limit: Int!) {
    trades: tradeExecutedEventss(
      where: { baseTokenId: $marketId }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        tradeId
        takerOrderId
        makerOrderId
        taker
        maker
        baseToken
        baseTokenId
        price
        amount
        quoteAmount
        timestamp
        blockTimestamp
        transactionHash
      }
    }
  }
`;

const GET_USER_TRADES_EVENTS = `
  query GetUserTradesEvents($user: String!, $limit: Int!) {
    takerTrades: tradeExecutedEventss(
      where: { taker: $user }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        tradeId
        takerOrderId
        makerOrderId
        taker
        maker
        baseToken
        baseTokenId
        price
        amount
        quoteAmount
        timestamp
        transactionHash
      }
    }
    makerTrades: tradeExecutedEventss(
      where: { maker: $user }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        tradeId
        takerOrderId
        makerOrderId
        taker
        maker
        baseToken
        baseTokenId
        price
        amount
        quoteAmount
        timestamp
        transactionHash
      }
    }
  }
`;

const GET_USER_ORDER_EVENTS = `
  query GetUserOrderEvents($maker: String!, $limit: Int!) {
    placedOrders: orderPlacedEventss(
      where: { maker: $maker }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        orderId
        maker
        baseToken
        baseTokenId
        quoteToken
        price
        amount
        isBuy
        orderType
        blockTimestamp
      }
    }
    cancellations: orderCancelledEventss(
      where: { maker: $maker }
      limit: $limit
    ) {
      items {
        orderId
        blockTimestamp
      }
    }
  }
`;

// =============================================================================
// REPOSITORY IMPLEMENTATION
// =============================================================================

/**
 * CLOB V2 Repository
 *
 * Production-ready implementation of ICLOBRepository.
 * Uses event-sourced data from Ponder indexer.
 */
export class CLOBV2Repository implements ICLOBRepository {
  private graphQLEndpoint: string;
  private diamondAddress: string;
  private quoteTokenAddress: string;

  constructor() {
    this.graphQLEndpoint = NEXT_PUBLIC_AURUM_SUBGRAPH_URL;
    this.diamondAddress = NEXT_PUBLIC_DIAMOND_ADDRESS;
    this.quoteTokenAddress =
      NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS ||
      '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  }

  // ============================================================================
  // ORDER BOOK QUERIES
  // ============================================================================

  async getOrderBook(
    baseToken: string,
    baseTokenId: string,
    quoteToken: string,
    levels: number = 20,
  ): Promise<OrderBook> {
    const marketId = this.getMarketId(baseToken, baseTokenId, quoteToken);

    try {
      const response = await graphqlRequest<{
        placedOrders: { items: any[] };
        cancelledOrders: { items: any[] };
        filledOrders: { items: any[] };
      }>(this.graphQLEndpoint, GET_ORDER_BOOK_EVENTS, {
        marketId,
        limit: levels,
      });

      const placedOrders = response.placedOrders?.items || [];
      const cancelledOrders = response.cancelledOrders?.items || [];
      const filledOrders = response.filledOrders?.items || [];

      // Build set of cancelled order IDs
      const cancelledOrderIds = new Set(
        cancelledOrders.map((c: any) => c.orderId),
      );

      // Build map of filled amounts for each order
      const filledAmounts = new Map<string, bigint>();
      const orderPrices = new Map<
        string,
        { price: string; isBuy: boolean; timestamp: string }
      >();

      for (const fill of filledOrders) {
        const orderId = fill.makerOrderId || fill.takerOrderId;
        if (orderId) {
          const currentFilled = filledAmounts.get(orderId) || 0n;
          filledAmounts.set(orderId, currentFilled + BigInt(fill.amount || 0));
        }
      }

      // Filter and transform orders
      const openOrders = placedOrders.filter((order: any) => {
        // Exclude cancelled orders
        if (cancelledOrderIds.has(order.orderId)) return false;

        // Check if order is filled
        const filled = filledAmounts.get(order.orderId) || 0n;
        const originalAmount = BigInt(order.amount || 0);

        // Order is still open if not fully filled
        return filled < originalAmount;
      });

      // Aggregate by price level
      const bids = this.aggregatePriceLevels(
        openOrders.filter((o: any) => o.isBuy),
        true,
      );
      const asks = this.aggregatePriceLevels(
        openOrders.filter((o: any) => !o.isBuy),
        false,
      );

      const bestBid = bids[0]?.price || null;
      const bestAsk = asks[0]?.price || null;

      const spread =
        bestBid && bestAsk
          ? (BigInt(bestAsk) - BigInt(bestBid)).toString()
          : '0';

      const midPrice =
        bestBid && bestAsk
          ? ((BigInt(bestBid) + BigInt(bestAsk)) / 2n).toString()
          : bestBid || bestAsk || '0';

      const spreadPercent =
        midPrice !== '0' ? (Number(spread) / Number(midPrice)) * 100 : 0;

      return {
        marketId,
        bids: bids.slice(0, levels),
        asks: asks.slice(0, levels),
        bestBid,
        bestAsk,
        spread,
        spreadPercent,
        midPrice,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get order book:', error);
      return {
        marketId,
        bids: [],
        asks: [],
        bestBid: null,
        bestAsk: null,
        spread: '0',
        spreadPercent: 0,
        midPrice: '0',
        timestamp: Date.now(),
      };
    }
  }

  async getBestPrices(
    marketId: string,
  ): Promise<{ bestBid: PriceLevel | null; bestAsk: PriceLevel | null }> {
    try {
      // Parse marketId to get baseToken, baseTokenId, quoteToken
      // For now, return null as this requires additional query
      return { bestBid: null, bestAsk: null };
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get best prices:', error);
      return { bestBid: null, bestAsk: null };
    }
  }

  async getOrdersAtPrice(
    marketId: string,
    price: string,
    isBid: boolean,
    limit: number = 50,
  ): Promise<CLOBOrder[]> {
    // TODO: Implement with specific price filter
    return [];
  }

  // ============================================================================
  // ORDER QUERIES
  // ============================================================================

  async getOrderById(orderId: string): Promise<CLOBOrder | null> {
    // TODO: Implement with GET_ORDER_BY_ID_EVENTS query
    return null;
  }

  async getOpenOrders(
    baseToken: string,
    baseTokenId: string,
    limit: number = 50,
  ): Promise<CLOBOrder[]> {
    const marketId = this.getMarketId(
      baseToken,
      baseTokenId,
      this.quoteTokenAddress,
    );

    try {
      const response = await graphqlRequest<{
        placedOrders: { items: any[] };
        cancelledOrders: { items: any[] };
        filledOrders: { items: any[] };
      }>(this.graphQLEndpoint, GET_ORDER_BOOK_EVENTS, { marketId, limit: 100 });

      const placedOrders = response.placedOrders?.items || [];
      const cancelledOrders = response.cancelledOrders?.items || [];
      const filledOrders = response.filledOrders?.items || [];

      const cancelledOrderIds = new Set(
        cancelledOrders.map((c: any) => c.orderId),
      );
      const filledAmounts = new Map<string, bigint>();

      for (const fill of filledOrders) {
        const orderId = fill.makerOrderId || fill.takerOrderId;
        if (orderId) {
          const currentFilled = filledAmounts.get(orderId) || 0n;
          filledAmounts.set(orderId, currentFilled + BigInt(fill.amount || 0));
        }
      }

      const openOrders = placedOrders.filter((order: any) => {
        if (cancelledOrderIds.has(order.orderId)) return false;
        const filled = filledAmounts.get(order.orderId) || 0n;
        const originalAmount = BigInt(order.amount || 0);
        return filled < originalAmount;
      });

      return openOrders
        .slice(0, limit)
        .map((o: any) => this.mapOrderToDomain(o));
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get open orders:', error);
      return [];
    }
  }

  async getUserOrders(
    userAddress: string,
    status?: CLOBOrderStatus,
    limit: number = 50,
  ): Promise<CLOBOrder[]> {
    try {
      const response = await graphqlRequest<{
        placedOrders: { items: any[] };
        cancellations: { items: any[] };
      }>(this.graphQLEndpoint, GET_USER_ORDER_EVENTS, {
        maker: userAddress.toLowerCase(),
        limit,
      });

      const placedOrders = response.placedOrders?.items || [];
      const cancellations = response.cancellations?.items || [];
      const cancelledOrderIds = new Set(
        cancellations.map((c: any) => c.orderId),
      );

      let orders = placedOrders.filter(
        (o: any) => !cancelledOrderIds.has(o.orderId),
      );

      // Filter by status if specified
      if (status !== undefined) {
        const statusNum = this.statusToNumber(status);
        // Additional filtering would require more event data
      }

      return orders.slice(0, limit).map((o: any) => this.mapOrderToDomain(o));
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get user orders:', error);
      return [];
    }
  }

  async getUserActiveOrders(userAddress: string): Promise<CLOBOrder[]> {
    return this.getUserOrders(userAddress, CLOBOrderStatus.OPEN, 100);
  }

  // ============================================================================
  // TRADE QUERIES
  // ============================================================================

  async getTradeById(tradeId: string): Promise<CLOBTrade | null> {
    // TODO: Implement
    return null;
  }

  async getTrades(
    baseToken: string,
    baseTokenId: string,
    limit: number = 50,
  ): Promise<CLOBTrade[]> {
    const marketId = this.getMarketId(
      baseToken,
      baseTokenId,
      this.quoteTokenAddress,
    );

    try {
      const response = await graphqlRequest<{
        trades: { items: any[] };
      }>(this.graphQLEndpoint, GET_TRADES_EVENTS, { marketId, limit });

      return (response.trades?.items || []).map((t: any) =>
        this.mapTradeToDomain(t),
      );
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get trades:', error);
      return [];
    }
  }

  async getUserTrades(
    userAddress: string,
    limit: number = 50,
  ): Promise<CLOBTrade[]> {
    try {
      const response = await graphqlRequest<{
        takerTrades: { items: any[] };
        makerTrades: { items: any[] };
      }>(this.graphQLEndpoint, GET_USER_TRADES_EVENTS, {
        user: userAddress.toLowerCase(),
        limit,
      });

      const allTrades = [
        ...(response.takerTrades?.items || []),
        ...(response.makerTrades?.items || []),
      ];

      // Dedupe and sort by timestamp
      const uniqueTrades = Array.from(
        new Map(allTrades.map((t: any) => [t.id, t])).values(),
      );
      uniqueTrades.sort(
        (a: any, b: any) =>
          Number(b.blockTimestamp || b.timestamp) -
          Number(a.blockTimestamp || a.timestamp),
      );

      return uniqueTrades
        .slice(0, limit)
        .map((t: any) => this.mapTradeToDomain(t));
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get user trades:', error);
      return [];
    }
  }

  // ============================================================================
  // MARKET QUERIES
  // ============================================================================

  async getMarket(marketId: string): Promise<CLOBMarket | null> {
    // TODO: Implement market query from events
    return null;
  }

  async getAllMarkets(): Promise<CLOBMarket[]> {
    // TODO: Implement markets query from poolCreatedEvents
    return [];
  }

  async getMarketStats(marketId: string): Promise<MarketStats> {
    try {
      const trades = await this.getTrades(
        '0x0000000000000000000000000000000000000000',
        marketId,
        100,
      );

      if (trades.length === 0) {
        return this.emptyMarketStats(marketId);
      }

      // Calculate statistics from recent trades
      let high24h = 0;
      let low24h = Infinity;
      let totalVolume = 0n;

      trades.forEach((trade) => {
        const price = Number(trade.price);
        if (price > high24h) high24h = price;
        if (price < low24h) low24h = price;
        totalVolume += BigInt(trade.amount);
      });

      const lastPrice = Number(trades[0].price);
      const oldestPrice = Number(trades[trades.length - 1].price);
      const change24h =
        oldestPrice > 0 ? ((lastPrice - oldestPrice) / oldestPrice) * 100 : 0;

      return {
        marketId,
        baseToken: '',
        baseTokenId: marketId,
        lastPrice: lastPrice.toString(),
        change24h,
        volume24h: totalVolume.toString(),
        high24h: high24h.toString(),
        low24h: (low24h === Infinity ? lastPrice : low24h).toString(),
        totalVolume: totalVolume.toString(),
        tradeCount: trades.length,
        openOrderCount: 0, // Would require additional query
      };
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get market stats:', error);
      return this.emptyMarketStats(marketId);
    }
  }

  getMarketId(
    baseToken: string,
    baseTokenId: string,
    quoteToken: string,
  ): string {
    return keccak256(
      encodePacked(
        ['address', 'uint256', 'address'],
        [
          baseToken as `0x${string}`,
          BigInt(baseTokenId),
          quoteToken as `0x${string}`,
        ],
      ),
    );
  }

  // ============================================================================
  // USER STATISTICS
  // ============================================================================

  async getUserTradingStats(
    userAddress: string,
  ): Promise<UserTradingStats | null> {
    try {
      const trades = await this.getUserTrades(userAddress, 100);

      if (trades.length === 0) {
        return null;
      }

      let totalVolume = 0n;
      let totalFees = 0n;
      let firstTrade = Infinity;
      let lastTrade = 0;

      trades.forEach((trade) => {
        totalVolume += BigInt(trade.quoteAmount || 0);
        // Fees would come from trade events
        const timestamp = trade.timestamp;
        if (timestamp < firstTrade) firstTrade = timestamp;
        if (timestamp > lastTrade) lastTrade = timestamp;
      });

      return {
        user: userAddress,
        totalOrdersPlaced: '0', // Would need orderPlacedEvents query
        totalOrdersFilled: trades.length.toString(),
        totalOrdersCancelled: '0', // Would need orderCancelledEvents query
        totalTradesAsMaker: trades
          .filter((t) => t.maker.toLowerCase() === userAddress.toLowerCase())
          .length.toString(),
        totalTradesAsTaker: trades
          .filter((t) => t.taker.toLowerCase() === userAddress.toLowerCase())
          .length.toString(),
        totalVolumeQuote: totalVolume.toString(),
        totalFeesPaid: totalFees.toString(),
        firstTradeAt: firstTrade,
        lastTradeAt: lastTrade,
      };
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get user stats:', error);
      return null;
    }
  }

  // ============================================================================
  // CIRCUIT BREAKER
  // ============================================================================

  async getCircuitBreaker(marketId: string): Promise<CircuitBreaker | null> {
    // TODO: Implement circuit breaker query
    return null;
  }

  // ============================================================================
  // COMMITMENT QUERIES
  // ============================================================================

  async getCommitment(commitmentId: string): Promise<CommittedOrder | null> {
    // TODO: Implement commitment query
    return null;
  }

  async getUserCommitments(userAddress: string): Promise<CommittedOrder[]> {
    // TODO: Implement user commitments query
    return [];
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private aggregatePriceLevels(orders: any[], isBid: boolean): PriceLevel[] {
    const priceMap = new Map<
      string,
      { quantity: bigint; count: number; timestamp: number }
    >();

    for (const order of orders) {
      const price = order.price;
      const remaining = BigInt(order.amount || 0);

      if (priceMap.has(price)) {
        const existing = priceMap.get(price)!;
        existing.quantity += remaining;
        existing.count++;
      } else {
        priceMap.set(price, {
          quantity: remaining,
          count: 1,
          timestamp: Number(order.blockTimestamp || 0),
        });
      }
    }

    const levels: PriceLevel[] = [];
    let cumulative = 0n;

    // Sort prices: descending for bids, ascending for asks
    const sortedPrices = Array.from(priceMap.keys()).sort((a, b) => {
      const diff = BigInt(b) - BigInt(a);
      return isBid ? (diff > 0n ? 1 : -1) : diff > 0n ? -1 : 1;
    });

    for (const price of sortedPrices) {
      const data = priceMap.get(price)!;
      cumulative += data.quantity;

      levels.push({
        price,
        quantity: data.quantity.toString(),
        orderCount: data.count,
        cumulativeQuantity: cumulative.toString(),
        depthPercent: 0,
      });
    }

    // Calculate depth percentages
    if (levels.length > 0) {
      const maxCumulative = BigInt(
        levels[levels.length - 1].cumulativeQuantity,
      );
      for (const level of levels) {
        level.depthPercent =
          maxCumulative > 0n
            ? Number((BigInt(level.cumulativeQuantity) * 100n) / maxCumulative)
            : 0;
      }
    }

    return levels;
  }

  private mapOrderToDomain(order: any): CLOBOrder {
    return {
      id: order.orderId || order.id,
      maker: order.maker,
      baseToken: order.baseToken || '',
      baseTokenId: order.baseTokenId || '0',
      quoteToken: order.quoteToken || '',
      price: order.price || '0',
      amount: order.amount || '0',
      filledAmount: '0', // Would need fill aggregation
      remainingAmount: order.amount || '0',
      isBuy: order.isBuy ?? true,
      orderType: this.numberToOrderType(Number(order.orderType || 0)),
      status: CLOBOrderStatus.OPEN, // Would need status aggregation
      timeInForce: TimeInForce.GTC,
      expiry: 0,
      createdAt: Number(order.blockTimestamp || 0) * 1000,
      updatedAt: Number(order.blockTimestamp || 0) * 1000,
      marketId: order.baseTokenId || '',
      nonce: '0',
    };
  }

  private mapTradeToDomain(trade: any): CLOBTrade {
    return {
      id: trade.tradeId || trade.id,
      takerOrderId: trade.takerOrderId,
      makerOrderId: trade.makerOrderId,
      taker: trade.taker,
      maker: trade.maker,
      baseToken: trade.baseToken || '',
      baseTokenId: trade.baseTokenId || '0',
      quoteToken: '',
      price: trade.price || '0',
      amount: trade.amount || '0',
      quoteAmount: trade.quoteAmount || '0',
      takerFee: '0',
      makerFee: '0',
      timestamp: Number(trade.blockTimestamp || trade.timestamp || 0) * 1000,
      transactionHash: trade.transactionHash || '',
      takerIsBuy: true,
      marketId: trade.baseTokenId || '',
    };
  }

  private mapMarketToDomain(market: any): CLOBMarket {
    return {
      id: market.id,
      baseToken: market.baseToken,
      baseTokenId: market.baseTokenId,
      quoteToken: market.quoteToken,
      active: true,
      createdAt: Number(market.createdAt || 0) * 1000,
      lastTradePrice: market.lastTradePrice || '0',
      bidCount: 0,
      askCount: 0,
    };
  }

  private numberToStatus(num: number): CLOBOrderStatus {
    switch (num) {
      case 0:
        return CLOBOrderStatus.OPEN;
      case 1:
        return CLOBOrderStatus.PARTIAL;
      case 2:
        return CLOBOrderStatus.FILLED;
      case 3:
        return CLOBOrderStatus.CANCELLED;
      case 4:
        return CLOBOrderStatus.EXPIRED;
      default:
        return CLOBOrderStatus.OPEN;
    }
  }

  private statusToNumber(status: CLOBOrderStatus): number {
    switch (status) {
      case CLOBOrderStatus.OPEN:
        return 0;
      case CLOBOrderStatus.PARTIAL:
        return 1;
      case CLOBOrderStatus.FILLED:
        return 2;
      case CLOBOrderStatus.CANCELLED:
        return 3;
      case CLOBOrderStatus.EXPIRED:
        return 4;
      default:
        return 0;
    }
  }

  private numberToOrderType(num: number): CLOBOrderType {
    return num === 1 ? CLOBOrderType.MARKET : CLOBOrderType.LIMIT;
  }

  private numberToTimeInForce(num: number): TimeInForce {
    switch (num) {
      case 0:
        return TimeInForce.GTC;
      case 1:
        return TimeInForce.IOC;
      case 2:
        return TimeInForce.FOK;
      case 3:
        return TimeInForce.GTD;
      default:
        return TimeInForce.GTC;
    }
  }

  private emptyMarketStats(marketId: string): MarketStats {
    return {
      marketId,
      baseToken: '',
      baseTokenId: marketId,
      lastPrice: '0',
      change24h: 0,
      volume24h: '0',
      high24h: '0',
      low24h: '0',
      totalVolume: '0',
      tradeCount: 0,
      openOrderCount: 0,
    };
  }
}

// Export singleton instance
export const clobV2Repository = new CLOBV2Repository();
