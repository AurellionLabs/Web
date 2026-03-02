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
// GRAPHQL QUERIES (Event-Sourced from Ponder)
// =============================================================================
// Table names follow pattern: diamond{EventName}Eventss (note double 's' from Ponder pluralization)
// Field names use snake_case as stored in Ponder

const GET_ORDER_BOOK_EVENTS = `
  query GetOrderBookEvents($baseToken: String!, $baseTokenId: BigInt!, $limit: Int!) {
    # Get all placed orders for this market
    placedOrders: diamondOrderPlacedWithTokensEventss(
      where: { base_token: $baseToken, base_token_id: $baseTokenId }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: 500
    ) {
      items {
        id
        order_id
        maker
        base_token
        base_token_id
        quote_token
        price
        amount
        is_buy
        order_type
        block_timestamp
        transaction_hash
      }
    }
    
    # Also get router-placed orders
    routerPlacedOrders: diamondRouterOrderPlacedEventss(
      where: { base_token: $baseToken, base_token_id: $baseTokenId }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: 500
    ) {
      items {
        id
        order_id
        maker
        base_token
        base_token_id
        quote_token
        price
        amount
        is_buy
        order_type
        block_timestamp
        transaction_hash
      }
    }
    
    # Get cancelled order IDs
    cancelledOrders: diamondCLOBOrderCancelledEventss(
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: 1000
    ) {
      items {
        order_id
        maker
        remaining_amount
        reason
        block_timestamp
      }
    }
    
    # Get filled amounts from trade events
    filledOrders: diamondCLOBOrderFilledEventss(
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: 1000
    ) {
      items {
        order_id
        trade_id
        fill_amount
        fill_price
        remaining_amount
        cumulative_filled
        block_timestamp
      }
    }
  }
`;

const GET_TRADES_EVENTS = `
  query GetTradesEvents($limit: Int!) {
    trades: diamondCLOBTradeExecutedEventss(
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        trade_id
        taker_order_id
        maker_order_id
        taker
        maker
        market_id
        price
        amount
        quote_amount
        taker_fee
        maker_fee
        timestamp
        taker_is_buy
        block_timestamp
        transaction_hash
      }
    }
  }
`;

const GET_USER_TRADES_EVENTS = `
  query GetUserTradesEvents($user: String!, $limit: Int!) {
    takerTrades: diamondCLOBTradeExecutedEventss(
      where: { taker: $user }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        trade_id
        taker_order_id
        maker_order_id
        taker
        maker
        market_id
        price
        amount
        quote_amount
        taker_fee
        maker_fee
        timestamp
        taker_is_buy
        block_timestamp
        transaction_hash
      }
    }
    makerTrades: diamondCLOBTradeExecutedEventss(
      where: { maker: $user }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        trade_id
        taker_order_id
        maker_order_id
        taker
        maker
        market_id
        price
        amount
        quote_amount
        taker_fee
        maker_fee
        timestamp
        taker_is_buy
        block_timestamp
        transaction_hash
      }
    }
  }
`;

const GET_USER_ORDER_EVENTS = `
  query GetUserOrderEvents($maker: String!, $limit: Int!) {
    placedOrders: diamondOrderPlacedWithTokensEventss(
      where: { maker: $maker }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        order_id
        maker
        base_token
        base_token_id
        quote_token
        price
        amount
        is_buy
        order_type
        block_timestamp
        transaction_hash
      }
    }
    routerPlacedOrders: diamondRouterOrderPlacedEventss(
      where: { maker: $maker }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        order_id
        maker
        base_token
        base_token_id
        quote_token
        price
        amount
        is_buy
        order_type
        block_timestamp
        transaction_hash
      }
    }
    cancellations: diamondCLOBOrderCancelledEventss(
      where: { maker: $maker }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        order_id
        maker
        remaining_amount
        reason
        block_timestamp
      }
    }
  }
`;

const GET_ORDER_BY_ID_EVENTS = `
  query GetOrderByIdEvents($orderId: Hex!) {
    placedOrders: diamondOrderPlacedWithTokensEventss(
      where: { order_id: $orderId }
      limit: 1
    ) {
      items {
        id
        order_id
        maker
        base_token
        base_token_id
        quote_token
        price
        amount
        is_buy
        order_type
        block_timestamp
        transaction_hash
      }
    }
    routerPlacedOrders: diamondRouterOrderPlacedEventss(
      where: { order_id: $orderId }
      limit: 1
    ) {
      items {
        id
        order_id
        maker
        base_token
        base_token_id
        quote_token
        price
        amount
        is_buy
        order_type
        block_timestamp
        transaction_hash
      }
    }
    cancellations: diamondCLOBOrderCancelledEventss(
      where: { order_id: $orderId }
      limit: 1
    ) {
      items {
        order_id
        remaining_amount
        reason
        block_timestamp
      }
    }
    fills: diamondCLOBOrderFilledEventss(
      where: { order_id: $orderId }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: 1
    ) {
      items {
        order_id
        fill_amount
        remaining_amount
        cumulative_filled
        block_timestamp
      }
    }
  }
`;

const GET_TRADE_BY_ID_EVENTS = `
  query GetTradeByIdEvents($tradeId: Hex!) {
    trades: diamondCLOBTradeExecutedEventss(
      where: { trade_id: $tradeId }
      limit: 1
    ) {
      items {
        id
        trade_id
        taker_order_id
        maker_order_id
        taker
        maker
        market_id
        price
        amount
        quote_amount
        taker_fee
        maker_fee
        timestamp
        taker_is_buy
        block_timestamp
        transaction_hash
      }
    }
  }
`;

const GET_MARKETS_EVENTS = `
  query GetMarketsEvents($limit: Int!) {
    markets: diamondMarketCreatedEventss(
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        market_id
        base_token
        base_token_id
        quote_token
        block_timestamp
        transaction_hash
      }
    }
  }
`;

const GET_MARKET_BY_ID_EVENTS = `
  query GetMarketByIdEvents($marketId: Hex!) {
    markets: diamondMarketCreatedEventss(
      where: { market_id: $marketId }
      limit: 1
    ) {
      items {
        id
        market_id
        base_token
        base_token_id
        quote_token
        block_timestamp
        transaction_hash
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
        routerPlacedOrders: { items: any[] };
        cancelledOrders: { items: any[] };
        filledOrders: { items: any[] };
      }>(this.graphQLEndpoint, GET_ORDER_BOOK_EVENTS, {
        baseToken: baseToken.toLowerCase(),
        baseTokenId,
        limit: levels,
      });

      // Combine direct and router placed orders
      const placedOrders = [
        ...(response.placedOrders?.items || []),
        ...(response.routerPlacedOrders?.items || []),
      ];
      const cancelledOrders = response.cancelledOrders?.items || [];
      const filledOrders = response.filledOrders?.items || [];

      // Build set of cancelled order IDs (using snake_case field)
      const cancelledOrderIds = new Set(
        cancelledOrders.map((c: any) => c.order_id),
      );

      // Build map of remaining amounts for each order from fill events
      const remainingAmounts = new Map<string, bigint>();
      for (const fill of filledOrders) {
        const orderId = fill.order_id;
        if (orderId) {
          // Use the remaining_amount from the latest fill event
          remainingAmounts.set(orderId, BigInt(fill.remaining_amount || 0));
        }
      }

      // Filter and transform orders
      const openOrders = placedOrders.filter((order: any) => {
        const orderId = order.order_id;
        // Exclude cancelled orders
        if (cancelledOrderIds.has(orderId)) return false;

        // Check if order is filled (remaining = 0)
        if (remainingAmounts.has(orderId)) {
          const remaining = remainingAmounts.get(orderId)!;
          return remaining > 0n;
        }

        // No fill events means order is still fully open
        return true;
      });

      // Aggregate by price level (using snake_case field is_buy)
      const bids = this.aggregatePriceLevels(
        openOrders.filter((o: any) => o.is_buy),
        true,
      );
      const asks = this.aggregatePriceLevels(
        openOrders.filter((o: any) => !o.is_buy),
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
      const market = await this.getMarket(marketId);
      if (!market) return { bestBid: null, bestAsk: null };
      const orderBook = await this.getOrderBook(
        market.baseToken,
        market.baseTokenId,
        market.quoteToken,
        1,
      );
      return {
        bestBid: orderBook.bids?.[0] ?? null,
        bestAsk: orderBook.asks?.[0] ?? null,
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
    // Fetch market to resolve base/quote tokens, then filter open orders by price
    try {
      const market = await this.getMarket(marketId);
      if (!market) return [];
      const openOrders = await this.getOpenOrders(
        market.baseToken,
        market.baseTokenId,
        500,
      );
      return openOrders
        .filter((o) => o.isBuy === isBid && o.price === price)
        .slice(0, limit);
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get orders at price:', error);
      return [];
    }
  }

  // ============================================================================
  // ORDER QUERIES
  // ============================================================================

  async getOrderById(orderId: string): Promise<CLOBOrder | null> {
    try {
      const response = await graphqlRequest<{
        placedOrders: { items: any[] };
        routerPlacedOrders: { items: any[] };
        cancellations: { items: any[] };
        fills: { items: any[] };
      }>(this.graphQLEndpoint, GET_ORDER_BY_ID_EVENTS, {
        orderId: orderId as `0x${string}`,
      });

      const raw =
        response.placedOrders?.items?.[0] ||
        response.routerPlacedOrders?.items?.[0];
      if (!raw) return null;

      const cancellation = response.cancellations?.items?.[0];
      const latestFill = response.fills?.items?.[0];

      const isCancelled = !!cancellation;
      const filledAmount = latestFill?.cumulative_filled
        ? BigInt(latestFill.cumulative_filled)
        : BigInt(0);
      const originalAmount = BigInt(raw.amount || '0');
      const isFullyFilled =
        filledAmount > BigInt(0) && filledAmount >= originalAmount;

      let status = CLOBOrderStatus.OPEN;
      if (isCancelled) status = CLOBOrderStatus.CANCELLED;
      else if (isFullyFilled) status = CLOBOrderStatus.FILLED;
      else if (filledAmount > BigInt(0)) status = CLOBOrderStatus.PARTIAL;

      const mapped = this.mapOrderToDomain(raw);
      mapped.status = status;
      mapped.filledAmount = filledAmount.toString();
      const remaining = BigInt(raw.amount || '0') - filledAmount;
      mapped.remainingAmount =
        remaining >= BigInt(0) ? remaining.toString() : '0';
      return mapped;
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get order by id:', error);
      return null;
    }
  }

  async getOpenOrders(
    baseToken: string,
    baseTokenId: string,
    limit: number = 50,
  ): Promise<CLOBOrder[]> {
    try {
      const response = await graphqlRequest<{
        placedOrders: { items: any[] };
        routerPlacedOrders: { items: any[] };
        cancelledOrders: { items: any[] };
        filledOrders: { items: any[] };
      }>(this.graphQLEndpoint, GET_ORDER_BOOK_EVENTS, {
        baseToken: baseToken.toLowerCase(),
        baseTokenId,
        limit: 100,
      });

      // Combine direct and router placed orders
      const placedOrders = [
        ...(response.placedOrders?.items || []),
        ...(response.routerPlacedOrders?.items || []),
      ];
      const cancelledOrders = response.cancelledOrders?.items || [];
      const filledOrders = response.filledOrders?.items || [];

      const cancelledOrderIds = new Set(
        cancelledOrders.map((c: any) => c.order_id),
      );
      const remainingAmounts = new Map<string, bigint>();

      for (const fill of filledOrders) {
        const orderId = fill.order_id;
        if (orderId) {
          remainingAmounts.set(orderId, BigInt(fill.remaining_amount || 0));
        }
      }

      const openOrders = placedOrders.filter((order: any) => {
        const orderId = order.order_id;
        if (cancelledOrderIds.has(orderId)) return false;
        if (remainingAmounts.has(orderId)) {
          return remainingAmounts.get(orderId)! > 0n;
        }
        return true;
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
        routerPlacedOrders: { items: any[] };
        cancellations: { items: any[] };
      }>(this.graphQLEndpoint, GET_USER_ORDER_EVENTS, {
        maker: userAddress.toLowerCase(),
        limit,
      });

      // Combine direct and router placed orders
      const placedOrders = [
        ...(response.placedOrders?.items || []),
        ...(response.routerPlacedOrders?.items || []),
      ];
      const cancellations = response.cancellations?.items || [];
      const cancelledOrderIds = new Set(
        cancellations.map((c: any) => c.order_id),
      );

      let orders = placedOrders.filter(
        (o: any) => !cancelledOrderIds.has(o.order_id),
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
    try {
      const response = await graphqlRequest<{
        trades: { items: any[] };
      }>(this.graphQLEndpoint, GET_TRADE_BY_ID_EVENTS, {
        tradeId: tradeId as `0x${string}`,
      });
      const raw = response.trades?.items?.[0];
      if (!raw) return null;
      return this.mapTradeToDomain(raw);
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get trade by id:', error);
      return null;
    }
  }

  async getTrades(
    baseToken: string,
    baseTokenId: string,
    limit: number = 50,
  ): Promise<CLOBTrade[]> {
    try {
      const response = await graphqlRequest<{
        trades: { items: any[] };
      }>(this.graphQLEndpoint, GET_TRADES_EVENTS, { limit });

      return (response.trades?.items || []).map((t: any) =>
        this.mapTradeToDomain(t, baseToken, baseTokenId),
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
          Number(b.timestamp || b.block_timestamp) -
          Number(a.timestamp || a.block_timestamp),
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
    try {
      const response = await graphqlRequest<{
        markets: { items: any[] };
      }>(this.graphQLEndpoint, GET_MARKET_BY_ID_EVENTS, {
        marketId: marketId as `0x${string}`,
      });
      const raw = response.markets?.items?.[0];
      if (!raw) return null;
      return this.mapMarketToDomain(raw);
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get market:', error);
      return null;
    }
  }

  async getAllMarkets(): Promise<CLOBMarket[]> {
    try {
      const response = await graphqlRequest<{
        markets: { items: any[] };
      }>(this.graphQLEndpoint, GET_MARKETS_EVENTS, { limit: 100 });
      return (response.markets?.items || []).map((m: any) =>
        this.mapMarketToDomain(m),
      );
    } catch (error) {
      console.error('[CLOBV2Repository] Failed to get all markets:', error);
      return [];
    }
  }

  /**
   * Returns a map of baseTokenId → total trade volume (sum of quote_amount)
   * across all markets. Used by the platform provider to show per-class volumes.
   */
  async getVolumeByBaseTokenId(): Promise<Map<string, bigint>> {
    try {
      // Fetch all markets to build marketId → baseTokenId mapping
      const markets = await this.getAllMarkets();
      const marketToBaseTokenId = new Map<string, string>();
      for (const market of markets) {
        marketToBaseTokenId.set(market.id, market.baseTokenId);
      }

      // Fetch recent trades
      const response = await graphqlRequest<{
        trades: { items: any[] };
      }>(this.graphQLEndpoint, GET_TRADES_EVENTS, { limit: 1000 });

      const volumeMap = new Map<string, bigint>();
      for (const raw of response.trades?.items || []) {
        const baseTokenId = marketToBaseTokenId.get(raw.market_id);
        if (!baseTokenId) continue;
        const quoteAmount = BigInt(raw.quote_amount || 0);
        volumeMap.set(
          baseTokenId,
          (volumeMap.get(baseTokenId) ?? 0n) + quoteAmount,
        );
      }
      return volumeMap;
    } catch (error) {
      console.error(
        '[CLOBV2Repository] Failed to get volume by base token id:',
        error,
      );
      return new Map();
    }
  }

  private mapMarketToDomain(raw: any): CLOBMarket {
    return {
      id: raw.market_id || raw.id,
      baseToken: raw.base_token || '',
      baseTokenId: raw.base_token_id?.toString() || '0',
      quoteToken: raw.quote_token || '',
      active: true,
      createdAt: Number(raw.block_timestamp || 0) * 1000,
      lastTradePrice: '0',
      bidCount: 0,
      askCount: 0,
    };
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
    // Query the most recent CircuitBreakerConfigured event for this market
    // Then overlay the most recent CircuitBreakerTripped event (if any) to determine status
    const query = `
      query GetCircuitBreaker($marketId: String!) {
        configured: diamondCircuitBreakerConfiguredEventss(
          where: { market_id: $marketId }
          orderBy: "block_timestamp"
          orderDirection: "desc"
          limit: 1
        ) {
          items {
            market_id
            price_change_threshold
            cooldown_period
            is_enabled
            block_timestamp
          }
        }
        tripped: diamondCircuitBreakerTrippedEventss(
          where: { market_id: $marketId }
          orderBy: "block_timestamp"
          orderDirection: "desc"
          limit: 1
        ) {
          items {
            market_id
            trigger_price
            previous_price
            change_percent
            cooldown_until
            block_timestamp
          }
        }
        reset: diamondCircuitBreakerResetEventss(
          where: { market_id: $marketId }
          orderBy: "block_timestamp"
          orderDirection: "desc"
          limit: 1
        ) {
          items {
            market_id
            reset_at
            block_timestamp
          }
        }
      }
    `;

    const data = await graphqlRequest<{
      configured: {
        items: Array<{
          market_id: string;
          price_change_threshold: string;
          cooldown_period: string;
          is_enabled: boolean;
          block_timestamp: string;
        }>;
      };
      tripped: {
        items: Array<{
          market_id: string;
          trigger_price: string;
          previous_price: string;
          change_percent: string;
          cooldown_until: string;
          block_timestamp: string;
        }>;
      };
      reset: {
        items: Array<{
          market_id: string;
          reset_at: string;
          block_timestamp: string;
        }>;
      };
    }>(NEXT_PUBLIC_AURUM_SUBGRAPH_URL, query, { marketId });

    const configuredItem = data.configured.items[0];
    if (!configuredItem) return null;

    const trippedItem = data.tripped.items[0];
    const resetItem = data.reset.items[0];

    // Determine current status:
    // If no trip event: NORMAL
    // If trip event exists and no reset after it: TRIPPED (unless cooldown expired)
    // If reset event exists after trip: NORMAL
    let status = CircuitBreakerStatus.ACTIVE;
    let tripTimestamp = 0;
    let lastPrice = '0';

    if (trippedItem) {
      const tripTs = Number(trippedItem.block_timestamp);
      const resetTs = resetItem ? Number(resetItem.block_timestamp) : 0;
      const cooldownUntil = Number(trippedItem.cooldown_until);
      const nowMs = Date.now();

      if (resetTs > tripTs) {
        status = CircuitBreakerStatus.ACTIVE;
      } else if (cooldownUntil * 1000 > nowMs) {
        status = CircuitBreakerStatus.TRIPPED;
      } else {
        status = CircuitBreakerStatus.COOLDOWN;
      }
      tripTimestamp = tripTs;
      lastPrice = trippedItem.trigger_price;
    }

    return {
      marketId: configuredItem.market_id,
      lastPrice,
      priceChangeThreshold: Number(configuredItem.price_change_threshold),
      cooldownPeriod: Number(configuredItem.cooldown_period),
      tripTimestamp,
      status,
      isEnabled: configuredItem.is_enabled,
    };
  }

  // ============================================================================
  // COMMITMENT QUERIES
  // ============================================================================

  async getCommitment(commitmentId: string): Promise<CommittedOrder | null> {
    const query = `
      query GetCommitment($commitmentId: String!) {
        committed: diamondOrderCommittedEventss(
          where: { commitment_id: $commitmentId }
          limit: 1
        ) {
          items {
            commitment_id
            committer
            commit_block
            block_timestamp
          }
        }
        revealed: diamondOrderRevealedEventss(
          where: { commitment_id: $commitmentId }
          limit: 1
        ) {
          items {
            commitment_id
            order_id
          }
        }
      }
    `;

    const data = await graphqlRequest<{
      committed: {
        items: Array<{
          commitment_id: string;
          committer: string;
          commit_block: string;
          block_timestamp: string;
        }>;
      };
      revealed: { items: Array<{ commitment_id: string; order_id: string }> };
    }>(NEXT_PUBLIC_AURUM_SUBGRAPH_URL, query, { commitmentId });

    const item = data.committed.items[0];
    if (!item) return null;

    const revealedItem = data.revealed.items[0];
    // MEV protection reveal window: typically 10 blocks. Mark expired if not yet revealed after ~250 blocks.
    const REVEAL_DEADLINE_BLOCKS = 10;
    const commitBlock = Number(item.commit_block);

    return {
      id: item.commitment_id,
      commitment: item.commitment_id,
      commitBlock,
      committer: item.committer,
      revealed: !!revealedItem,
      expired: false, // cannot determine without current block number; UI can infer
      revealDeadline: commitBlock + REVEAL_DEADLINE_BLOCKS,
    };
  }

  async getUserCommitments(userAddress: string): Promise<CommittedOrder[]> {
    const query = `
      query GetUserCommitments($committer: String!) {
        committed: diamondOrderCommittedEventss(
          where: { committer: $committer }
          orderBy: "block_timestamp"
          orderDirection: "desc"
          limit: 100
        ) {
          items {
            commitment_id
            committer
            commit_block
            block_timestamp
          }
        }
        revealed: diamondOrderRevealedEventss(
          orderBy: "block_timestamp"
          orderDirection: "desc"
          limit: 1000
        ) {
          items {
            commitment_id
            order_id
          }
        }
      }
    `;

    const data = await graphqlRequest<{
      committed: {
        items: Array<{
          commitment_id: string;
          committer: string;
          commit_block: string;
          block_timestamp: string;
        }>;
      };
      revealed: { items: Array<{ commitment_id: string; order_id: string }> };
    }>(NEXT_PUBLIC_AURUM_SUBGRAPH_URL, query, {
      committer: userAddress.toLowerCase(),
    });

    const revealedSet = new Set(
      data.revealed.items.map((r) => r.commitment_id),
    );
    const REVEAL_DEADLINE_BLOCKS = 10;

    return data.committed.items.map((item) => {
      const commitBlock = Number(item.commit_block);
      return {
        id: item.commitment_id,
        commitment: item.commitment_id,
        commitBlock,
        committer: item.committer,
        revealed: revealedSet.has(item.commitment_id),
        expired: false,
        revealDeadline: commitBlock + REVEAL_DEADLINE_BLOCKS,
      };
    });
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
      // Amount is the original order amount (use remaining if available from fill tracking)
      const remaining = BigInt(order.amount || 0);

      if (priceMap.has(price)) {
        const existing = priceMap.get(price)!;
        existing.quantity += remaining;
        existing.count++;
      } else {
        priceMap.set(price, {
          quantity: remaining,
          count: 1,
          timestamp: Number(order.block_timestamp || 0),
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
    // Handle both snake_case (from Ponder) and camelCase (legacy) field names
    return {
      id: order.order_id || order.orderId || order.id,
      maker: order.maker,
      baseToken: order.base_token || order.baseToken || '',
      baseTokenId: order.base_token_id || order.baseTokenId || '0',
      quoteToken: order.quote_token || order.quoteToken || '',
      price: order.price || '0',
      amount: order.amount || '0',
      filledAmount: '0', // Would need fill aggregation
      remainingAmount: order.amount || '0',
      isBuy: order.is_buy ?? order.isBuy ?? true,
      orderType: this.numberToOrderType(
        Number(order.order_type || order.orderType || 0),
      ),
      status: CLOBOrderStatus.OPEN, // Would need status aggregation
      timeInForce: TimeInForce.GTC,
      expiry: 0,
      createdAt: Number(order.block_timestamp || 0) * 1000,
      updatedAt: Number(order.block_timestamp || 0) * 1000,
      marketId: order.base_token_id || order.baseTokenId || '',
      nonce: '0',
    };
  }

  private mapTradeToDomain(
    trade: any,
    baseToken: string = '',
    baseTokenId: string = '0',
  ): CLOBTrade {
    // Handle snake_case field names from Ponder
    return {
      id: trade.trade_id || trade.tradeId || trade.id,
      takerOrderId: trade.taker_order_id || trade.takerOrderId,
      makerOrderId: trade.maker_order_id || trade.makerOrderId,
      taker: trade.taker,
      maker: trade.maker,
      baseToken: baseToken,
      baseTokenId: baseTokenId,
      quoteToken: '',
      price: trade.price || '0',
      amount: trade.amount || '0',
      quoteAmount: trade.quote_amount || trade.quoteAmount || '0',
      takerFee: trade.taker_fee || '0',
      makerFee: trade.maker_fee || '0',
      timestamp: Number(trade.timestamp || trade.block_timestamp || 0) * 1000,
      transactionHash: trade.transaction_hash || '',
      takerIsBuy: trade.taker_is_buy ?? true,
      marketId: trade.market_id || baseTokenId,
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
