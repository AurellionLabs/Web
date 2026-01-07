/**
 * @module infrastructure/repositories/clob-v2-repository
 * @description CLOB V2 Repository Implementation
 *
 * Implements ICLOBRepository interface for production-ready CLOB trading.
 * Connects frontend to Ponder indexer for reads and Diamond contract for writes.
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
// GRAPHQL QUERIES
// =============================================================================

const GET_ORDER_BOOK = `
  query GetOrderBook($marketId: String!, $limit: Int!) {
    bids: clobOrderss(
      where: { marketId: $marketId, isBuy: true, status_in: [0, 1] }
      orderBy: "price"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        maker
        price
        amount
        filledAmount
        remainingAmount
        status
        timeInForce
        expiry
        createdAt
        nonce
      }
    }
    asks: clobOrderss(
      where: { marketId: $marketId, isBuy: false, status_in: [0, 1] }
      orderBy: "price"
      orderDirection: "asc"
      limit: $limit
    ) {
      items {
        id
        maker
        price
        amount
        filledAmount
        remainingAmount
        status
        timeInForce
        expiry
        createdAt
        nonce
      }
    }
  }
`;

const GET_ORDER_BY_ID = `
  query GetOrderById($orderId: String!) {
    clobOrders(id: $orderId) {
      id
      maker
      baseToken
      baseTokenId
      quoteToken
      price
      amount
      filledAmount
      remainingAmount
      isBuy
      orderType
      status
      timeInForce
      expiry
      createdAt
      updatedAt
      marketId
      nonce
    }
  }
`;

const GET_USER_ORDERS = `
  query GetUserOrders($maker: String!, $status: Int, $limit: Int!) {
    clobOrderss(
      where: { maker: $maker, status: $status }
      orderBy: "createdAt"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        maker
        baseToken
        baseTokenId
        quoteToken
        price
        amount
        filledAmount
        remainingAmount
        isBuy
        orderType
        status
        timeInForce
        expiry
        createdAt
        updatedAt
        marketId
        nonce
      }
    }
  }
`;

const GET_USER_ACTIVE_ORDERS = `
  query GetUserActiveOrders($maker: String!) {
    clobOrderss(
      where: { maker: $maker, status_in: [0, 1] }
      orderBy: "createdAt"
      orderDirection: "desc"
    ) {
      items {
        id
        maker
        baseToken
        baseTokenId
        quoteToken
        price
        amount
        filledAmount
        remainingAmount
        isBuy
        orderType
        status
        timeInForce
        expiry
        createdAt
        updatedAt
        marketId
        nonce
      }
    }
  }
`;

const GET_TRADES = `
  query GetTrades($marketId: String!, $limit: Int!) {
    clobTradess(
      where: { marketId: $marketId }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        takerOrderId
        makerOrderId
        taker
        maker
        price
        amount
        quoteAmount
        takerFee
        makerFee
        timestamp
        transactionHash
        takerIsBuy
        marketId
      }
    }
  }
`;

const GET_USER_TRADES = `
  query GetUserTrades($user: String!, $limit: Int!) {
    takerTrades: clobTradess(
      where: { taker: $user }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        takerOrderId
        makerOrderId
        taker
        maker
        price
        amount
        quoteAmount
        takerFee
        makerFee
        timestamp
        transactionHash
        takerIsBuy
        marketId
      }
    }
    makerTrades: clobTradess(
      where: { maker: $user }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        takerOrderId
        makerOrderId
        taker
        maker
        price
        amount
        quoteAmount
        takerFee
        makerFee
        timestamp
        transactionHash
        takerIsBuy
        marketId
      }
    }
  }
`;

const GET_MARKET = `
  query GetMarket($marketId: String!) {
    marketData(id: $marketId) {
      id
      baseToken
      baseTokenId
      quoteToken
      bestBidPrice
      bestAskPrice
      lastTradePrice
      volume24h
      tradeCount24h
      openOrderCount
      createdAt
      updatedAt
    }
  }
`;

const GET_ALL_MARKETS = `
  query GetAllMarkets {
    marketDatas(orderBy: "volume24h", orderDirection: "desc") {
      items {
        id
        baseToken
        baseTokenId
        quoteToken
        bestBidPrice
        bestAskPrice
        lastTradePrice
        volume24h
        tradeCount24h
        openOrderCount
        createdAt
      }
    }
  }
`;

const GET_USER_TRADING_STATS = `
  query GetUserTradingStats($user: String!) {
    userTradingStats(id: $user) {
      id
      totalOrdersPlaced
      totalOrdersFilled
      totalOrdersCancelled
      totalTradesAsMaker
      totalTradesAsTaker
      totalVolumeQuote
      totalFeesPaid
      firstTradeAt
      lastTradeAt
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
 * Uses Ponder indexer for efficient data retrieval.
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
        bids: { items: any[] };
        asks: { items: any[] };
      }>(this.graphQLEndpoint, GET_ORDER_BOOK, { marketId, limit: levels });

      const bids = this.aggregatePriceLevels(response.bids?.items || [], true);
      const asks = this.aggregatePriceLevels(response.asks?.items || [], false);

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
        bids,
        asks,
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
      const response = await graphqlRequest<{ marketData: any }>(
        this.graphQLEndpoint,
        GET_MARKET,
        { marketId },
      );

      const market = response.marketData;
      if (!market) {
        return { bestBid: null, bestAsk: null };
      }

      return {
        bestBid: market.bestBidPrice
          ? {
              price: market.bestBidPrice,
              quantity: '0',
              orderCount: 0,
              cumulativeQuantity: '0',
              depthPercent: 0,
            }
          : null,
        bestAsk: market.bestAskPrice
          ? {
              price: market.bestAskPrice,
              quantity: '0',
              orderCount: 0,
              cumulativeQuantity: '0',
              depthPercent: 0,
            }
          : null,
      };
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
    try {
      const response = await graphqlRequest<{ clobOrders: any }>(
        this.graphQLEndpoint,
        GET_ORDER_BY_ID,
        { orderId },
      );

      if (!response.clobOrders) return null;
      return this.mapOrderToDomain(response.clobOrders);
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get order:', error);
      return null;
    }
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
        bids: { items: any[] };
        asks: { items: any[] };
      }>(this.graphQLEndpoint, GET_ORDER_BOOK, { marketId, limit });

      const orders = [
        ...(response.bids?.items || []),
        ...(response.asks?.items || []),
      ];

      return orders.map((o) => this.mapOrderToDomain(o));
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
      const statusNum =
        status !== undefined ? this.statusToNumber(status) : undefined;

      const response = await graphqlRequest<{
        clobOrderss: { items: any[] };
      }>(this.graphQLEndpoint, GET_USER_ORDERS, {
        maker: userAddress.toLowerCase(),
        status: statusNum,
        limit,
      });

      return (response.clobOrderss?.items || []).map((o) =>
        this.mapOrderToDomain(o),
      );
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get user orders:', error);
      return [];
    }
  }

  async getUserActiveOrders(userAddress: string): Promise<CLOBOrder[]> {
    try {
      const response = await graphqlRequest<{
        clobOrderss: { items: any[] };
      }>(this.graphQLEndpoint, GET_USER_ACTIVE_ORDERS, {
        maker: userAddress.toLowerCase(),
      });

      return (response.clobOrderss?.items || []).map((o) =>
        this.mapOrderToDomain(o),
      );
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get active orders:', error);
      return [];
    }
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
        clobTradess: { items: any[] };
      }>(this.graphQLEndpoint, GET_TRADES, { marketId, limit });

      return (response.clobTradess?.items || []).map((t) =>
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
      }>(this.graphQLEndpoint, GET_USER_TRADES, {
        user: userAddress.toLowerCase(),
        limit,
      });

      const allTrades = [
        ...(response.takerTrades?.items || []),
        ...(response.makerTrades?.items || []),
      ];

      // Dedupe and sort by timestamp
      const uniqueTrades = Array.from(
        new Map(allTrades.map((t) => [t.id, t])).values(),
      );
      uniqueTrades.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

      return uniqueTrades.slice(0, limit).map((t) => this.mapTradeToDomain(t));
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get user trades:', error);
      return [];
    }
  }

  // ============================================================================
  // MARKET QUERIES
  // ============================================================================

  async getMarket(marketId: string): Promise<CLOBMarket | null> {
    try {
      const response = await graphqlRequest<{ marketData: any }>(
        this.graphQLEndpoint,
        GET_MARKET,
        { marketId },
      );

      if (!response.marketData) return null;
      return this.mapMarketToDomain(response.marketData);
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get market:', error);
      return null;
    }
  }

  async getAllMarkets(): Promise<CLOBMarket[]> {
    try {
      const response = await graphqlRequest<{
        marketDatas: { items: any[] };
      }>(this.graphQLEndpoint, GET_ALL_MARKETS, {});

      return (response.marketDatas?.items || []).map((m) =>
        this.mapMarketToDomain(m),
      );
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get all markets:', error);
      return [];
    }
  }

  async getMarketStats(marketId: string): Promise<MarketStats> {
    try {
      const response = await graphqlRequest<{ marketData: any }>(
        this.graphQLEndpoint,
        GET_MARKET,
        { marketId },
      );

      const market = response.marketData;
      if (!market) {
        return this.emptyMarketStats(marketId);
      }

      return {
        marketId,
        baseToken: market.baseToken,
        baseTokenId: market.baseTokenId,
        lastPrice: market.lastTradePrice || '0',
        change24h: 0, // TODO: Calculate from trade history
        volume24h: market.volume24h || '0',
        high24h: '0', // TODO: Calculate from trade history
        low24h: '0', // TODO: Calculate from trade history
        totalVolume: market.volume24h || '0',
        tradeCount: Number(market.tradeCount24h || 0),
        openOrderCount: Number(market.openOrderCount || 0),
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
      const response = await graphqlRequest<{ userTradingStats: any }>(
        this.graphQLEndpoint,
        GET_USER_TRADING_STATS,
        { user: userAddress.toLowerCase() },
      );

      if (!response.userTradingStats) return null;

      const stats = response.userTradingStats;
      return {
        user: userAddress,
        totalOrdersPlaced: stats.totalOrdersPlaced || '0',
        totalOrdersFilled: stats.totalOrdersFilled || '0',
        totalOrdersCancelled: stats.totalOrdersCancelled || '0',
        totalTradesAsMaker: stats.totalTradesAsMaker || '0',
        totalTradesAsTaker: stats.totalTradesAsTaker || '0',
        totalVolumeQuote: stats.totalVolumeQuote || '0',
        totalFeesPaid: stats.totalFeesPaid || '0',
        firstTradeAt: Number(stats.firstTradeAt || 0),
        lastTradeAt: Number(stats.lastTradeAt || 0),
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
    const priceMap = new Map<string, { quantity: bigint; count: number }>();

    for (const order of orders) {
      const price = order.price;
      const remaining = BigInt(order.remainingAmount || order.amount || 0);

      if (priceMap.has(price)) {
        const existing = priceMap.get(price)!;
        existing.quantity += remaining;
        existing.count++;
      } else {
        priceMap.set(price, { quantity: remaining, count: 1 });
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
        depthPercent: 0, // Calculated later
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
      id: order.id,
      maker: order.maker,
      baseToken: order.baseToken || '',
      baseTokenId: order.baseTokenId || '0',
      quoteToken: order.quoteToken || '',
      price: order.price || '0',
      amount: order.amount || '0',
      filledAmount: order.filledAmount || '0',
      remainingAmount: order.remainingAmount || order.amount || '0',
      isBuy: order.isBuy ?? true,
      orderType: this.numberToOrderType(Number(order.orderType || 0)),
      status: this.numberToStatus(Number(order.status || 0)),
      timeInForce: this.numberToTimeInForce(Number(order.timeInForce || 0)),
      expiry: Number(order.expiry || 0),
      createdAt: Number(order.createdAt || 0) * 1000,
      updatedAt: Number(order.updatedAt || order.createdAt || 0) * 1000,
      marketId: order.marketId || '',
      nonce: order.nonce || '0',
    };
  }

  private mapTradeToDomain(trade: any): CLOBTrade {
    return {
      id: trade.id,
      takerOrderId: trade.takerOrderId,
      makerOrderId: trade.makerOrderId,
      taker: trade.taker,
      maker: trade.maker,
      baseToken: trade.baseToken || '',
      baseTokenId: trade.baseTokenId || '0',
      quoteToken: trade.quoteToken || '',
      price: trade.price || '0',
      amount: trade.amount || '0',
      quoteAmount: trade.quoteAmount || '0',
      takerFee: trade.takerFee || '0',
      makerFee: trade.makerFee || '0',
      timestamp: Number(trade.timestamp || 0) * 1000,
      transactionHash: trade.transactionHash || '',
      takerIsBuy: trade.takerIsBuy ?? true,
      marketId: trade.marketId || '',
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
      bidCount: 0, // TODO: Get from order book
      askCount: 0, // TODO: Get from order book
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
      baseTokenId: '0',
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
