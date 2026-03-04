import { graphqlRequest } from './shared/graph';
import {
  GET_ORDER_PLACED_EVENTS,
  GET_ORDER_FILLED_EVENTS,
  GET_ORDER_CANCELLED_EVENTS,
  GET_ORDER_EXPIRED_EVENTS,
  GET_TRADE_EVENTS,
  GET_USER_ORDER_EVENTS,
  GET_USER_TRADE_EVENTS,
  GET_CLOB_BEST_PRICES,
  type OrderPlacedEventsResponse,
  type OrderFilledEventsResponse,
  type OrderCancelledEventsResponse,
  type OrderExpiredEventsResponse,
  type TradeEventsResponse,
  type UserOrderEventsResponse,
  type UserTradeEventsResponse,
  type BestPricesEventsResponse,
  type OrderPlacedEventGraphResponse,
  type TradeExecutedEventGraphResponse,
} from './shared/graph-queries';
import {
  aggregateOrders,
  filterOrdersByStatus,
  type OrderEventSources,
} from '@/infrastructure/shared/event-aggregators';
import type {
  OrderPlacedWithTokensEvent,
  RouterOrderPlacedEvent,
  CLOBOrderFilledEvent,
  CLOBOrderCancelledEvent,
  OrderExpiredEvent,
  AggregatedOrder,
} from '@/infrastructure/shared/indexer-types';
import {
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
  NEXT_PUBLIC_DIAMOND_ADDRESS,
} from '@/chain-constants';
import { getCurrentIndexerUrl } from '@/infrastructure/config/indexer-endpoint';
import type { CLOBTrade as DomainCLOBTrade } from '@/domain/clob/clob';
// NEXT_PUBLIC_CLOB_ADDRESS no longer needed - CLOB is internal to Diamond
import { formatEther, parseEther } from 'viem';
import { ethers } from 'ethers';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';

/**
 * Order side type
 */
export type OrderSide = 'buy' | 'sell';

/**
 * Order type
 */
export type OrderType = 'limit' | 'market';

/**
 * Order status
 */
export type OrderStatus = 'open' | 'partial' | 'filled' | 'cancelled';

/**
 * CLOB Order domain model
 */
export interface CLOBOrder {
  id: string;
  maker: string;
  baseToken: string;
  baseTokenId: string;
  quoteToken: string;
  price: number;
  amount: number;
  filledAmount: number;
  remainingAmount: number;
  isBuy: boolean;
  orderType: OrderType;
  status: OrderStatus;
  createdAt: number;
}

/**
 * CLOB Trade domain model — re-exported from domain for backwards compat
 */
export type CLOBTrade = DomainCLOBTrade;

/**
 * Order book side data
 */
export interface OrderBookSide {
  price: number;
  quantity: number;
  total: number;
}

/**
 * Aggregated order book data
 */
export interface OrderBookData {
  bids: OrderBookSide[];
  asks: OrderBookSide[];
  spread: number;
  spreadPercent: number;
  midPrice: number;
  lastUpdate: number;
}

/**
 * Market statistics
 */
export interface MarketStats {
  baseToken: string;
  baseTokenId: string;
  lastPrice: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  totalVolume: number;
  tradeCount: number;
}

/**
 * Parameters for placing a limit order
 */
export interface PlaceLimitOrderParams {
  baseToken: string;
  baseTokenId: string;
  quoteToken: string;
  price: bigint; // Price per unit in wei
  amount: bigint; // Amount of base tokens
  isBuy: boolean; // true for buy order, false for sell order
}

/**
 * Parameters for placing a market order
 */
export interface PlaceMarketOrderParams {
  baseToken: string;
  baseTokenId: string;
  quoteToken: string;
  amount: bigint; // Amount of base tokens
  isBuy: boolean; // true for buy order, false for sell order
  maxSlippageBps?: number; // Maximum slippage in basis points (e.g., 100 = 1%). Defaults to 100 (1%)
}

/**
 * Result of order placement
 */
export interface OrderPlacementResult {
  success: boolean;
  orderId?: string;
  transactionHash?: string;
  error?: string;
}

/**
 * CLOB Repository - Manages CLOB trading data from Ponder indexer
 * and handles on-chain order placement via CLOB smart contract
 */
export class CLOBRepository {
  private get graphQLEndpoint() {
    return getCurrentIndexerUrl();
  }
  private repositoryContext: RepositoryContext;
  private diamondAddress: string;
  private quoteTokenAddress: string;

  constructor() {
    this.repositoryContext = RepositoryContext.getInstance();
    // Diamond address - all CLOB operations go through Diamond CLOBFacet
    this.diamondAddress = NEXT_PUBLIC_DIAMOND_ADDRESS;
    this.quoteTokenAddress =
      NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS ||
      '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  }

  /**
   * Get open orders for a market
   * Fetches raw events and aggregates them to compute current order state
   */
  async getOpenOrders(
    baseToken: string,
    baseTokenId: string,
    limit = 50,
  ): Promise<CLOBOrder[]> {
    try {
      // Step 1: Fetch order placement events
      const placedResponse = await graphqlRequest<OrderPlacedEventsResponse>(
        this.graphQLEndpoint,
        GET_ORDER_PLACED_EVENTS,
        {
          baseToken: baseToken.toLowerCase(),
          baseTokenId,
          limit: limit * 2, // Fetch more since some may be filled/cancelled
        },
      );

      const directPlaced =
        placedResponse.diamondOrderPlacedWithTokensEventss?.items || [];
      const routerPlaced =
        placedResponse.diamondRouterOrderPlacedEventss?.items || [];

      // Convert to event types
      const placedEvents: OrderPlacedWithTokensEvent[] = directPlaced.map(
        this.mapGraphToPlacedEvent,
      );
      const routerEvents: RouterOrderPlacedEvent[] = routerPlaced.map(
        this.mapGraphToRouterPlacedEvent,
      );

      // If no orders, return empty
      if (placedEvents.length === 0 && routerEvents.length === 0) {
        return [];
      }

      // Step 2: Get order IDs to fetch fill/cancel events
      const orderIds = [
        ...placedEvents.map((e) => e.order_id),
        ...routerEvents.map((e) => e.order_id),
      ];

      // Step 3: Fetch fill, cancel, and expire events in parallel
      const [filledResponse, cancelledResponse, expiredResponse] =
        await Promise.all([
          graphqlRequest<OrderFilledEventsResponse>(
            this.graphQLEndpoint,
            GET_ORDER_FILLED_EVENTS,
            { orderIds, limit: limit * 5 },
          ).catch(() => ({ diamondCLOBOrderFilledEventss: { items: [] } })),
          graphqlRequest<OrderCancelledEventsResponse>(
            this.graphQLEndpoint,
            GET_ORDER_CANCELLED_EVENTS,
            { orderIds, limit: limit * 2 },
          ).catch(() => ({ diamondCLOBOrderCancelledEventss: { items: [] } })),
          graphqlRequest<OrderExpiredEventsResponse>(
            this.graphQLEndpoint,
            GET_ORDER_EXPIRED_EVENTS,
            { orderIds, limit: limit * 2 },
          ).catch(() => ({ diamondOrderExpiredEventss: { items: [] } })),
        ]);

      const filledEvents: CLOBOrderFilledEvent[] = (
        filledResponse.diamondCLOBOrderFilledEventss?.items || []
      ).map(this.mapGraphToFilledEvent);
      const cancelledEvents: CLOBOrderCancelledEvent[] = (
        cancelledResponse.diamondCLOBOrderCancelledEventss?.items || []
      ).map(this.mapGraphToCancelledEvent);
      const expiredEvents: OrderExpiredEvent[] = (
        expiredResponse.diamondOrderExpiredEventss?.items || []
      ).map(this.mapGraphToExpiredEvent);

      // Step 4: Aggregate events into order state
      const eventSources: OrderEventSources = {
        placed: placedEvents,
        routerPlaced: routerEvents,
        filled: filledEvents,
        cancelled: cancelledEvents,
        expired: expiredEvents,
      };

      const aggregatedOrders = aggregateOrders(eventSources);

      // Step 5: Filter to open/partial orders only and convert to domain
      const openOrders = filterOrdersByStatus(aggregatedOrders, [
        'open',
        'partial',
      ]);

      return openOrders.slice(0, limit).map(this.mapAggregatedToDomain);
    } catch (error) {
      console.error('[CLOBRepository] Failed to get open orders:', error);
      return [];
    }
  }

  /**
   * Get recent trades for a market
   * Note: Currently fetches all trades - filtering by market would require market_id mapping
   */
  async getTrades(
    baseToken: string,
    baseTokenId: string,
    limit: number = 50,
  ): Promise<CLOBTrade[]> {
    try {
      const response = await graphqlRequest<TradeEventsResponse>(
        this.graphQLEndpoint,
        GET_TRADE_EVENTS,
        { limit },
      );

      const trades = response.diamondCLOBTradeExecutedEventss?.items || [];

      // Map to domain and include baseToken info
      return trades.map((trade) =>
        this.mapTradeEventToDomain(trade, baseToken, baseTokenId),
      );
    } catch (error) {
      console.error('[CLOBRepository] Failed to get trades:', error);
      return [];
    }
  }

  /**
   * Get user's order history
   * Fetches raw events and aggregates them to compute current order state
   */
  async getUserOrders(maker: string, limit: number = 50): Promise<CLOBOrder[]> {
    try {
      // Step 1: Fetch user's order placement events
      const placedResponse = await graphqlRequest<UserOrderEventsResponse>(
        this.graphQLEndpoint,
        GET_USER_ORDER_EVENTS,
        {
          maker: maker.toLowerCase(),
          limit: limit * 2,
        },
      );

      const directPlaced =
        placedResponse.diamondOrderPlacedWithTokensEventss?.items || [];
      const routerPlaced =
        placedResponse.diamondRouterOrderPlacedEventss?.items || [];

      // Convert to event types
      const placedEvents: OrderPlacedWithTokensEvent[] = directPlaced.map(
        this.mapGraphToPlacedEvent,
      );
      const routerEvents: RouterOrderPlacedEvent[] = routerPlaced.map(
        this.mapGraphToRouterPlacedEvent,
      );

      if (placedEvents.length === 0 && routerEvents.length === 0) {
        return [];
      }

      // Step 2: Get order IDs to fetch fill/cancel events
      const orderIds = [
        ...placedEvents.map((e) => e.order_id),
        ...routerEvents.map((e) => e.order_id),
      ];

      // Step 3: Fetch fill, cancel, and expire events
      const [filledResponse, cancelledResponse, expiredResponse] =
        await Promise.all([
          graphqlRequest<OrderFilledEventsResponse>(
            this.graphQLEndpoint,
            GET_ORDER_FILLED_EVENTS,
            { orderIds, limit: limit * 5 },
          ).catch(() => ({ diamondCLOBOrderFilledEventss: { items: [] } })),
          graphqlRequest<OrderCancelledEventsResponse>(
            this.graphQLEndpoint,
            GET_ORDER_CANCELLED_EVENTS,
            { orderIds, limit: limit * 2 },
          ).catch(() => ({ diamondCLOBOrderCancelledEventss: { items: [] } })),
          graphqlRequest<OrderExpiredEventsResponse>(
            this.graphQLEndpoint,
            GET_ORDER_EXPIRED_EVENTS,
            { orderIds, limit: limit * 2 },
          ).catch(() => ({ diamondOrderExpiredEventss: { items: [] } })),
        ]);

      const filledEvents: CLOBOrderFilledEvent[] = (
        filledResponse.diamondCLOBOrderFilledEventss?.items || []
      ).map(this.mapGraphToFilledEvent);
      const cancelledEvents: CLOBOrderCancelledEvent[] = (
        cancelledResponse.diamondCLOBOrderCancelledEventss?.items || []
      ).map(this.mapGraphToCancelledEvent);
      const expiredEvents: OrderExpiredEvent[] = (
        expiredResponse.diamondOrderExpiredEventss?.items || []
      ).map(this.mapGraphToExpiredEvent);

      // Step 4: Aggregate events into order state
      const eventSources: OrderEventSources = {
        placed: placedEvents,
        routerPlaced: routerEvents,
        filled: filledEvents,
        cancelled: cancelledEvents,
        expired: expiredEvents,
      };

      const aggregatedOrders = aggregateOrders(eventSources);

      return aggregatedOrders.slice(0, limit).map(this.mapAggregatedToDomain);
    } catch (error) {
      console.error('[CLOBRepository] Failed to get user orders:', error);
      return [];
    }
  }

  /**
   * Get user's trade history
   */
  async getUserTrades(user: string, limit: number = 50): Promise<CLOBTrade[]> {
    try {
      const response = await graphqlRequest<UserTradeEventsResponse>(
        this.graphQLEndpoint,
        GET_USER_TRADE_EVENTS,
        {
          user: user.toLowerCase(),
          limit,
        },
      );

      const trades = response.diamondCLOBTradeExecutedEventss?.items || [];

      return trades.map((trade) => this.mapTradeEventToDomain(trade, '', ''));
    } catch (error) {
      console.error('[CLOBRepository] Failed to get user trades:', error);
      return [];
    }
  }

  /**
   * Get best bid and ask for a market
   * Fetches order events and computes best prices from open orders
   */
  async getBestPrices(
    baseToken: string,
    baseTokenId: string,
  ): Promise<{ bestBid: OrderBookSide | null; bestAsk: OrderBookSide | null }> {
    try {
      // Get open orders and find best bid/ask
      const openOrders = await this.getOpenOrders(baseToken, baseTokenId, 100);

      // Find best bid (highest buy price)
      const bids = openOrders
        .filter((o) => o.isBuy)
        .sort((a, b) => b.price - a.price);
      const bestBidOrder = bids[0];

      // Find best ask (lowest sell price)
      const asks = openOrders
        .filter((o) => !o.isBuy)
        .sort((a, b) => a.price - b.price);
      const bestAskOrder = asks[0];

      return {
        bestBid: bestBidOrder
          ? {
              price: bestBidOrder.price,
              quantity: bestBidOrder.remainingAmount,
              total: bestBidOrder.remainingAmount,
            }
          : null,
        bestAsk: bestAskOrder
          ? {
              price: bestAskOrder.price,
              quantity: bestAskOrder.remainingAmount,
              total: bestAskOrder.remainingAmount,
            }
          : null,
      };
    } catch (error) {
      console.error('[CLOBRepository] Failed to get best prices:', error);
      return { bestBid: null, bestAsk: null };
    }
  }

  /**
   * Get aggregated order book for a market
   */
  async getOrderBook(
    baseToken: string,
    baseTokenId: string,
    levels: number = 10,
  ): Promise<OrderBookData> {
    try {
      const orders = await this.getOpenOrders(baseToken, baseTokenId, 100);

      // Separate bids and asks
      const bids = orders
        .filter((o) => o.isBuy)
        .sort((a, b) => b.price - a.price)
        .slice(0, levels);
      const asks = orders
        .filter((o) => !o.isBuy)
        .sort((a, b) => a.price - b.price)
        .slice(0, levels);

      // Calculate cumulative totals
      let bidTotal = 0;
      const bidsWithTotal = bids.map((bid) => {
        bidTotal += bid.remainingAmount;
        return {
          price: bid.price,
          quantity: bid.remainingAmount,
          total: bidTotal,
        };
      });

      let askTotal = 0;
      const asksWithTotal = asks.map((ask) => {
        askTotal += ask.remainingAmount;
        return {
          price: ask.price,
          quantity: ask.remainingAmount,
          total: askTotal,
        };
      });

      // Calculate spread and mid price
      const bestBid = bidsWithTotal[0]?.price || 0;
      const bestAsk = asksWithTotal[0]?.price || 0;
      const spread = bestAsk - bestBid;
      const midPrice =
        bestBid > 0 && bestAsk > 0
          ? (bestBid + bestAsk) / 2
          : bestBid || bestAsk || 0;
      const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

      return {
        bids: bidsWithTotal,
        asks: asksWithTotal,
        spread,
        spreadPercent,
        midPrice,
        lastUpdate: Date.now(),
      };
    } catch (error) {
      console.error('[CLOBRepository] Failed to get order book:', error);
      return {
        bids: [],
        asks: [],
        spread: 0,
        spreadPercent: 0,
        midPrice: 0,
        lastUpdate: Date.now(),
      };
    }
  }

  /**
   * Get market statistics
   */
  async getMarketStats(
    baseToken: string,
    baseTokenId: string,
  ): Promise<MarketStats> {
    try {
      const trades = await this.getTrades(baseToken, baseTokenId, 100);

      if (trades.length === 0) {
        return {
          baseToken,
          baseTokenId,
          lastPrice: 0,
          change24h: 0,
          volume24h: 0,
          high24h: 0,
          low24h: 0,
          totalVolume: 0,
          tradeCount: 0,
        };
      }

      // Calculate statistics from recent trades
      let high24h = 0;
      let low24h = Infinity;
      let totalVolume = 0;
      let totalQuoteVolume = 0;

      trades.forEach((trade) => {
        const p = parseFloat(String(trade.price));
        const a = parseFloat(String(trade.amount));
        const qa = parseFloat(String(trade.quoteAmount));
        if (p > high24h) high24h = p;
        if (p < low24h) low24h = p;
        totalVolume += a;
        totalQuoteVolume += qa;
      });

      const lastPrice = parseFloat(String(trades[0].price));
      const oldestPrice = parseFloat(String(trades[trades.length - 1].price));
      const change24h =
        oldestPrice > 0 ? ((lastPrice - oldestPrice) / oldestPrice) * 100 : 0;

      return {
        baseToken,
        baseTokenId,
        lastPrice,
        change24h,
        volume24h: totalVolume,
        high24h,
        low24h: low24h === Infinity ? lastPrice : low24h,
        totalVolume: totalQuoteVolume,
        tradeCount: trades.length,
      };
    } catch (error) {
      console.error('[CLOBRepository] Failed to get market stats:', error);
      return {
        baseToken,
        baseTokenId,
        lastPrice: 0,
        change24h: 0,
        volume24h: 0,
        high24h: 0,
        low24h: 0,
        totalVolume: 0,
        tradeCount: 0,
      };
    }
  }

  // ============================================================================
  // WRITE METHODS - On-chain order operations
  // ============================================================================

  /**
   * Get the Diamond contract instance with signer for CLOB operations
   * All CLOB functionality is now in the Diamond's CLOBFacet
   */
  private async getContractWithSigner(): Promise<ethers.Contract> {
    const signer = this.repositoryContext.getSigner();
    const provider = this.repositoryContext.getProvider();

    // Import Diamond ABI from generated file (single source of truth)
    // DIAMOND_ABI includes all facet functions including OrderRouterFacet
    const { DIAMOND_ABI } = await import(
      '@/infrastructure/contracts/diamond-abi.generated'
    );

    const diamondContract = new ethers.Contract(
      this.diamondAddress,
      DIAMOND_ABI,
      provider,
    );

    return diamondContract.connect(signer) as ethers.Contract;
  }

  /**
   * Get quote token contract with signer
   */
  private async getQuoteTokenWithSigner(): Promise<ethers.Contract> {
    const signer = this.repositoryContext.getSigner();
    const provider = this.repositoryContext.getProvider();

    const erc20ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) external view returns (uint256)',
      'function balanceOf(address account) external view returns (uint256)',
    ];

    return new ethers.Contract(
      this.quoteTokenAddress,
      erc20ABI,
      provider,
    ).connect(signer) as ethers.Contract;
  }

  /**
   * Ensure quote token allowance for Diamond contract (CLOBFacet)
   */
  private async ensureQuoteTokenApproval(
    quoteToken: ethers.Contract,
    amount: bigint,
  ): Promise<void> {
    const signerAddress = await this.repositoryContext.getSignerAddress();

    const currentAllowance = await quoteToken.allowance(
      signerAddress,
      this.diamondAddress,
    );

    if (BigInt(currentAllowance.toString()) < amount) {
      // Approve unlimited (MaxUint256) to avoid needing to approve for every transaction
      const tx = await quoteToken.approve(
        this.diamondAddress,
        ethers.MaxUint256,
      );
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) {
        throw new Error('Quote token approval transaction failed');
      }
    } else {
    }
  }

  /**
   * Ensure ERC1155 base token approval for CLOB contract (needed for sell orders)
   */
  private async ensureBaseTokenApproval(baseToken: string): Promise<void> {
    const signer = this.repositoryContext.getSigner();
    const provider = this.repositoryContext.getProvider();
    const signerAddress = await this.repositoryContext.getSignerAddress();

    const erc1155ABI = [
      'function setApprovalForAll(address operator, bool approved) external',
      'function isApprovedForAll(address account, address operator) external view returns (bool)',
    ];

    const baseTokenContract = new ethers.Contract(
      baseToken,
      erc1155ABI,
      provider,
    ).connect(signer) as ethers.Contract;

    // Approve Diamond to transfer base tokens (for sell orders)
    const isApproved = await baseTokenContract.isApprovedForAll(
      signerAddress,
      this.diamondAddress,
    );

    if (!isApproved) {
      const tx = await baseTokenContract.setApprovalForAll(
        this.diamondAddress,
        true,
      );
      await tx.wait();
    }
  }

  /**
   * Place a limit order on the Diamond CLOB
   * NOTE: For SELL orders, use DiamondProvider.placeSellOrderFromNode() instead
   * This method is primarily for BUY orders via Diamond CLOBFacet
   * @param params Order placement parameters
   * @returns Order placement result
   */
  async placeLimitOrder(
    params: PlaceLimitOrderParams,
  ): Promise<OrderPlacementResult> {
    try {
      // Sell orders should go through DiamondProvider.placeSellOrderFromNode()
      // which handles node inventory management
      if (!params.isBuy) {
        console.warn(
          '[CLOBRepository] Sell orders should use DiamondProvider.placeSellOrderFromNode()',
        );
        return {
          success: false,
          error:
            'Sell orders must be placed through DiamondProvider.placeSellOrderFromNode()',
        };
      }

      const [diamondContract, quoteToken] = await Promise.all([
        this.getContractWithSigner(),
        this.getQuoteTokenWithSigner(),
      ]);

      const diamondContractAddress = await diamondContract.getAddress();
      const quoteTokenContractAddress = await quoteToken.getAddress();

      // For buy orders: approve quote token (ERC20) for Diamond
      const totalCost = params.price * params.amount;
      await this.ensureQuoteTokenApproval(quoteToken, totalCost);

      // Place the buy order via Diamond CLOBFacet
      const tx = await diamondContract.placeBuyOrder(
        params.baseToken,
        params.baseTokenId,
        params.quoteToken,
        params.price,
        params.amount,
      );

      const receipt = await tx.wait();

      // Parse order ID from transaction logs
      const orderId = this.extractOrderIdFromTransaction(receipt, params.isBuy);

      return {
        success: true,
        orderId,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('[CLOBRepository] Failed to place buy order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Place a market order on the CLOB
   * @param params Order placement parameters
   * @returns Order placement result
   */
  async placeMarketOrder(
    params: PlaceMarketOrderParams,
  ): Promise<OrderPlacementResult> {
    try {
      // Default slippage to 1% (100 basis points) if not specified
      const maxSlippageBps = params.maxSlippageBps ?? 100;

      const [clobContract, quoteToken] = await Promise.all([
        this.getContractWithSigner(),
        this.getQuoteTokenWithSigner(),
      ]);

      // For market orders, we need to estimate the cost based on order book
      // For now, approve a large amount (MaxUint256 already approved in most cases)
      if (params.isBuy) {
        // For buy orders, we need quote token approval
        // Use MaxUint256 since we don't know the exact fill price for market orders
        await this.ensureQuoteTokenApproval(quoteToken, ethers.MaxUint256);
      } else {
        // Sell order - need to approve the ERC1155 base token
        await this.ensureBaseTokenApproval(params.baseToken);
      }

      // Place the order
      const tx = await clobContract.placeMarketOrder(
        params.baseToken,
        params.baseTokenId,
        params.quoteToken,
        params.amount,
        params.isBuy,
        maxSlippageBps, // uint16 - basis points (e.g., 100 = 1%)
      );

      const receipt = await tx.wait();

      const orderId = this.extractOrderIdFromTransaction(receipt, params.isBuy);

      return {
        success: true,
        orderId,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('[CLOBRepository] Failed to place market order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel an existing order on the Diamond CLOB
   * @param orderId The order ID to cancel
   * @returns Cancellation result
   */
  async cancelOrder(
    orderId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const diamondContract = await this.getContractWithSigner();
      const tx = await diamondContract.cancelCLOBOrder(orderId);
      const receipt = await tx.wait();

      return { success: true };
    } catch (error) {
      console.error('[CLOBRepository] Failed to cancel order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract order ID from transaction receipt
   * @param receipt Transaction receipt
   * @param isBuy Whether this was a buy order
   * @returns Order ID as hex string
   */
  private extractOrderIdFromTransaction(
    receipt: ethers.TransactionReceipt,
    isBuy: boolean,
  ): string {
    // Diamond CLOBFacet emits OrderPlacedWithTokens event with this signature:
    // OrderPlacedWithTokens(bytes32 indexed orderId, address indexed maker, address indexed baseToken,
    //                       uint256 baseTokenId, address quoteToken, uint256 price, uint256 amount, bool isBuy, uint8 orderType)
    const orderPlacedSignature =
      'OrderPlacedWithTokens(bytes32,address,address,uint256,address,uint256,uint256,bool,uint8)';
    const orderPlacedTopic = ethers.id(orderPlacedSignature);

    for (const log of receipt.logs) {
      if (log.topics[0] === orderPlacedTopic && log.topics.length >= 2) {
        // Order ID is in topics[1] (first indexed param)
        return log.topics[1];
      }
    }

    // Fallback: use transaction hash as a pseudo-ID
    // The indexer will have the real orderId from the event
    console.warn(
      '[CLOBRepository] Could not extract order ID from logs, using tx hash fallback',
    );
    return receipt.hash;
  }

  // ============================================================================
  // Mapping Methods - GraphQL Response to Event Types
  // ============================================================================

  /**
   * Map GraphQL order placed response to OrderPlacedWithTokensEvent
   */
  private mapGraphToPlacedEvent(
    event: OrderPlacedEventGraphResponse,
  ): OrderPlacedWithTokensEvent {
    return {
      id: event.id,
      order_id: event.order_id,
      maker: event.maker,
      base_token: event.base_token,
      base_token_id: event.base_token_id,
      quote_token: event.quote_token,
      price: event.price,
      amount: event.amount,
      is_buy: event.is_buy,
      order_type: event.order_type,
      block_number: '0', // Not used in aggregation
      block_timestamp: event.block_timestamp,
      transaction_hash: event.transaction_hash,
    };
  }

  /**
   * Map GraphQL router order placed response to RouterOrderPlacedEvent
   */
  private mapGraphToRouterPlacedEvent(
    event: OrderPlacedEventGraphResponse,
  ): RouterOrderPlacedEvent {
    return {
      id: event.id,
      order_id: event.order_id,
      maker: event.maker,
      base_token: event.base_token,
      base_token_id: event.base_token_id,
      quote_token: event.quote_token,
      price: event.price,
      amount: event.amount,
      is_buy: event.is_buy,
      order_type: event.order_type,
      block_number: '0',
      block_timestamp: event.block_timestamp,
      transaction_hash: event.transaction_hash,
    };
  }

  /**
   * Map GraphQL filled event response to CLOBOrderFilledEvent
   */
  private mapGraphToFilledEvent(event: {
    id: string;
    order_id: string;
    trade_id: string;
    fill_amount: string;
    fill_price: string;
    remaining_amount: string;
    cumulative_filled: string;
    block_timestamp: string;
    transaction_hash: string;
  }): CLOBOrderFilledEvent {
    return {
      id: event.id,
      order_id: event.order_id,
      trade_id: event.trade_id,
      fill_amount: event.fill_amount,
      fill_price: event.fill_price,
      remaining_amount: event.remaining_amount,
      cumulative_filled: event.cumulative_filled,
      block_number: '0',
      block_timestamp: event.block_timestamp,
      transaction_hash: event.transaction_hash,
    };
  }

  /**
   * Map GraphQL cancelled event response to CLOBOrderCancelledEvent
   */
  private mapGraphToCancelledEvent(event: {
    id: string;
    order_id: string;
    maker: string;
    remaining_amount: string;
    reason: string;
    block_timestamp: string;
    transaction_hash: string;
  }): CLOBOrderCancelledEvent {
    return {
      id: event.id,
      order_id: event.order_id,
      maker: event.maker,
      remaining_amount: event.remaining_amount,
      reason: event.reason,
      block_number: '0',
      block_timestamp: event.block_timestamp,
      transaction_hash: event.transaction_hash,
    };
  }

  /**
   * Map GraphQL expired event response to OrderExpiredEvent
   */
  private mapGraphToExpiredEvent(event: {
    id: string;
    order_id: string;
    expired_at: string;
    block_timestamp: string;
    transaction_hash: string;
  }): OrderExpiredEvent {
    return {
      id: event.id,
      order_id: event.order_id,
      expired_at: event.expired_at,
      block_number: '0',
      block_timestamp: event.block_timestamp,
      transaction_hash: event.transaction_hash,
    };
  }

  // ============================================================================
  // Mapping Methods - Aggregated/Event to Domain
  // ============================================================================

  /**
   * Map AggregatedOrder to CLOBOrder domain model
   */
  private mapAggregatedToDomain(agg: AggregatedOrder): CLOBOrder {
    return {
      id: agg.orderId,
      maker: agg.maker,
      baseToken: agg.baseToken,
      baseTokenId: agg.baseTokenId,
      quoteToken: agg.quoteToken,
      price: Number(agg.price) / 1e18, // Convert from wei
      amount: Number(agg.originalAmount),
      filledAmount: Number(agg.cumulativeFilled),
      remainingAmount: Number(agg.remainingAmount),
      isBuy: agg.isBuy,
      orderType: agg.orderType === '0' ? 'limit' : 'market',
      status: agg.status === 'expired' ? 'cancelled' : agg.status,
      createdAt: Number(agg.createdAt) * 1000,
    };
  }

  /**
   * Map trade executed event to CLOBTrade domain model
   */
  private mapTradeEventToDomain(
    trade: TradeExecutedEventGraphResponse,
    baseToken: string,
    baseTokenId: string,
  ): CLOBTrade {
    return {
      id: trade.trade_id,
      takerOrderId: trade.taker_order_id,
      makerOrderId: trade.maker_order_id,
      taker: trade.taker,
      maker: trade.maker,
      baseToken: baseToken,
      baseTokenId: baseTokenId,
      quoteToken: '', // Not available in trade event
      marketId: `${baseToken}-${baseTokenId}`,
      price: String(Number(trade.price) / 1e18),
      amount: String(Number(trade.amount)),
      quoteAmount: String(Number(trade.quote_amount) / 1e18),
      takerFee: '0',
      makerFee: '0',
      takerIsBuy: true,
      timestamp: Number(trade.timestamp) * 1000,
      transactionHash: trade.transaction_hash,
    };
  }
}

// Export singleton instance
export const clobRepository = new CLOBRepository();
