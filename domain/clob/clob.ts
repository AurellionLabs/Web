/**
 * @module domain/clob
 * @description CLOB V2 Domain Interfaces
 *
 * Central Limit Order Book domain types and interfaces.
 * These interfaces define the contract between frontend and backend,
 * enabling clean separation of concerns and type-safe data flow.
 *
 * Key Features:
 * - Production-ready order management (GTC, IOC, FOK, GTD)
 * - MEV protection via commit-reveal
 * - Circuit breaker support
 * - Comprehensive trading statistics
 */

// =============================================================================
// ENUMS - Status and Type Definitions
// =============================================================================

/**
 * Order status enum - matches CLOBLib contract constants
 * Uses string values for frontend readability
 */
export enum CLOBOrderStatus {
  OPEN = 'open', // Order is active and can be filled (contract: 0)
  PARTIAL = 'partial', // Order is partially filled (contract: 1)
  FILLED = 'filled', // Order is completely filled (contract: 2)
  CANCELLED = 'cancelled', // Order was cancelled by user (contract: 3)
  EXPIRED = 'expired', // Order expired (GTD orders) (contract: 4)
}

/**
 * Time-in-force options for orders
 */
export enum TimeInForce {
  GTC = 'GTC', // Good Till Cancel - stays open until filled or cancelled
  IOC = 'IOC', // Immediate Or Cancel - fills immediately, cancels remainder
  FOK = 'FOK', // Fill Or Kill - must fill completely or revert
  GTD = 'GTD', // Good Till Date - expires at specified time
}

/**
 * Order type
 */
export enum CLOBOrderType {
  LIMIT = 'limit', // Limit order with specified price (contract: 0)
  MARKET = 'market', // Market order with slippage protection (contract: 1)
}

/**
 * Order side
 */
export type OrderSide = 'buy' | 'sell';

/**
 * Circuit breaker status
 */
export enum CircuitBreakerStatus {
  ACTIVE = 'active', // Trading is normal
  TRIPPED = 'tripped', // Circuit breaker triggered, trading halted
  COOLDOWN = 'cooldown', // In cooldown period after trip
}

// =============================================================================
// CORE DOMAIN ENTITIES
// =============================================================================

/**
 * CLOB Order entity - represents an order in the order book
 */
export interface CLOBOrder {
  /** Unique order identifier (bytes32) */
  id: string;
  /** Order maker address */
  maker: string;
  /** Base token address (ERC1155) */
  baseToken: string;
  /** Base token ID */
  baseTokenId: string;
  /** Quote token address (ERC20) */
  quoteToken: string;
  /** Order price per unit (in wei, formatted as string) */
  price: string;
  /** Original order amount */
  amount: string;
  /** Amount already filled */
  filledAmount: string;
  /** Remaining amount to fill */
  remainingAmount: string;
  /** True if buy order, false if sell */
  isBuy: boolean;
  /** Order type (limit/market) */
  orderType: CLOBOrderType;
  /** Current order status */
  status: CLOBOrderStatus;
  /** Time-in-force setting */
  timeInForce: TimeInForce;
  /** Expiry timestamp (for GTD orders, 0 otherwise) */
  expiry: number;
  /** Order creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Market identifier */
  marketId: string;
  /** Order nonce for uniqueness */
  nonce: string;
}

/**
 * CLOB Trade entity - represents an executed trade
 */
export interface CLOBTrade {
  /** Unique trade identifier (bytes32) */
  id: string;
  /** Taker order ID */
  takerOrderId: string;
  /** Maker order ID */
  makerOrderId: string;
  /** Taker address */
  taker: string;
  /** Maker address */
  maker: string;
  /** Base token address */
  baseToken: string;
  /** Base token ID */
  baseTokenId: string;
  /** Quote token address */
  quoteToken: string;
  /** Execution price */
  price: string;
  /** Trade amount (base tokens) */
  amount: string;
  /** Quote amount (quote tokens) */
  quoteAmount: string;
  /** Taker fee paid */
  takerFee: string;
  /** Maker fee paid */
  makerFee: string;
  /** Trade timestamp */
  timestamp: number;
  /** Transaction hash */
  transactionHash: string;
  /** Whether taker was buying */
  takerIsBuy: boolean;
  /** Market identifier */
  marketId: string;
}

/**
 * Market entity - represents a trading pair
 */
export interface CLOBMarket {
  /** Market identifier (keccak256 of baseToken, baseTokenId, quoteToken) */
  id: string;
  /** Base token address */
  baseToken: string;
  /** Base token ID */
  baseTokenId: string;
  /** Quote token address */
  quoteToken: string;
  /** Whether market is active for trading */
  active: boolean;
  /** Market creation timestamp */
  createdAt: number;
  /** Last trade price */
  lastTradePrice: string;
  /** Total bid price levels */
  bidCount: number;
  /** Total ask price levels */
  askCount: number;
}

/**
 * Price level in the order book
 */
export interface PriceLevel {
  /** Price at this level */
  price: string;
  /** Total quantity at this level */
  quantity: string;
  /** Number of orders at this level */
  orderCount: number;
  /** Cumulative quantity from best price */
  cumulativeQuantity: string;
  /** Depth percentage for visualization */
  depthPercent: number;
}

/**
 * Order book snapshot
 */
export interface OrderBook {
  /** Market identifier */
  marketId: string;
  /** Bid levels (highest to lowest) */
  bids: PriceLevel[];
  /** Ask levels (lowest to highest) */
  asks: PriceLevel[];
  /** Best bid price */
  bestBid: string | null;
  /** Best ask price */
  bestAsk: string | null;
  /** Spread in quote tokens */
  spread: string;
  /** Spread as percentage */
  spreadPercent: number;
  /** Mid price */
  midPrice: string;
  /** Snapshot timestamp */
  timestamp: number;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreaker {
  /** Market identifier */
  marketId: string;
  /** Last recorded price */
  lastPrice: string;
  /** Price change threshold (basis points) */
  priceChangeThreshold: number;
  /** Cooldown period in seconds */
  cooldownPeriod: number;
  /** Timestamp when tripped */
  tripTimestamp: number;
  /** Current status */
  status: CircuitBreakerStatus;
  /** Whether circuit breaker is enabled */
  isEnabled: boolean;
}

/**
 * Committed order for MEV protection
 */
export interface CommittedOrder {
  /** Commitment identifier */
  id: string;
  /** Commitment hash */
  commitment: string;
  /** Block number when committed */
  commitBlock: number;
  /** Committer address */
  committer: string;
  /** Whether order has been revealed */
  revealed: boolean;
  /** Whether commitment has expired */
  expired: boolean;
  /** Deadline block for reveal */
  revealDeadline: number;
}

/**
 * User trading statistics
 */
export interface UserTradingStats {
  /** User address */
  user: string;
  /** Total orders placed */
  totalOrdersPlaced: string;
  /** Total orders filled */
  totalOrdersFilled: string;
  /** Total orders cancelled */
  totalOrdersCancelled: string;
  /** Total trades as maker */
  totalTradesAsMaker: string;
  /** Total trades as taker */
  totalTradesAsTaker: string;
  /** Total volume in quote tokens */
  totalVolumeQuote: string;
  /** Total fees paid */
  totalFeesPaid: string;
  /** First trade timestamp */
  firstTradeAt: number;
  /** Last trade timestamp */
  lastTradeAt: number;
}

/**
 * Market statistics
 */
export interface MarketStats {
  /** Market identifier */
  marketId: string;
  /** Base token address */
  baseToken: string;
  /** Base token ID */
  baseTokenId: string;
  /** Last trade price */
  lastPrice: string;
  /** 24h price change percentage */
  change24h: number;
  /** 24h volume in base tokens */
  volume24h: string;
  /** 24h high price */
  high24h: string;
  /** 24h low price */
  low24h: string;
  /** Total volume in quote tokens */
  totalVolume: string;
  /** Total number of trades */
  tradeCount: number;
  /** Number of open orders */
  openOrderCount: number;
}

// =============================================================================
// ORDER PLACEMENT PARAMETERS
// =============================================================================

/**
 * Parameters for placing a limit order
 */
export interface PlaceLimitOrderParams {
  /** Base token address (ERC1155) */
  baseToken: string;
  /** Base token ID */
  baseTokenId: string;
  /** Quote token address (ERC20) */
  quoteToken: string;
  /** Price per unit in wei */
  price: bigint;
  /** Amount of base tokens */
  amount: bigint;
  /** True for buy, false for sell */
  isBuy: boolean;
  /** Time-in-force setting */
  timeInForce: TimeInForce;
  /** Expiry timestamp for GTD orders (0 otherwise) */
  expiry?: number;
}

/**
 * Parameters for placing a market order
 */
export interface PlaceMarketOrderParams {
  /** Base token address */
  baseToken: string;
  /** Base token ID */
  baseTokenId: string;
  /** Quote token address */
  quoteToken: string;
  /** Amount of base tokens */
  amount: bigint;
  /** True for buy, false for sell */
  isBuy: boolean;
  /** Maximum slippage in basis points */
  maxSlippageBps: number;
}

/**
 * Parameters for commit-reveal order placement (MEV protection)
 */
export interface CommitOrderParams {
  /** Market identifier */
  marketId: string;
  /** Order price */
  price: bigint;
  /** Order amount */
  amount: bigint;
  /** True for buy */
  isBuy: boolean;
  /** Time-in-force */
  timeInForce: TimeInForce;
  /** Expiry (for GTD) */
  expiry?: number;
  /** Random salt for commitment */
  salt: string;
}

/**
 * Parameters for revealing a committed order
 */
export interface RevealOrderParams {
  /** Commitment ID from commitOrder */
  commitmentId: string;
  /** Base token address */
  baseToken: string;
  /** Base token ID */
  baseTokenId: string;
  /** Quote token address */
  quoteToken: string;
  /** Order price */
  price: bigint;
  /** Order amount */
  amount: bigint;
  /** True for buy */
  isBuy: boolean;
  /** Time-in-force */
  timeInForce: TimeInForce;
  /** Expiry */
  expiry?: number;
  /** Salt used in commitment */
  salt: string;
}

/**
 * Result of order placement
 */
export interface OrderPlacementResult {
  /** Whether placement succeeded */
  success: boolean;
  /** Order ID if successful */
  orderId?: string;
  /** Transaction hash */
  transactionHash?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Result of order cancellation
 */
export interface OrderCancellationResult {
  /** Whether cancellation succeeded */
  success: boolean;
  /** Transaction hash */
  transactionHash?: string;
  /** Refunded amount */
  refundedAmount?: string;
  /** Error message if failed */
  error?: string;
}

// =============================================================================
// REPOSITORY INTERFACE
// =============================================================================

/**
 * CLOB Repository Interface
 *
 * Defines data access methods for CLOB trading.
 * Implementations handle the specifics of data retrieval
 * from indexer (Ponder) and on-chain contract calls.
 */
export interface ICLOBRepository {
  // ============ Order Book Queries ============

  /**
   * Get order book for a market
   * @param baseToken Base token address
   * @param baseTokenId Base token ID
   * @param quoteToken Quote token address
   * @param levels Number of price levels to return
   */
  getOrderBook(
    baseToken: string,
    baseTokenId: string,
    quoteToken: string,
    levels?: number,
  ): Promise<OrderBook>;

  /**
   * Get best bid and ask prices
   * @param marketId Market identifier
   */
  getBestPrices(
    marketId: string,
  ): Promise<{ bestBid: PriceLevel | null; bestAsk: PriceLevel | null }>;

  /**
   * Get orders at a specific price level
   * @param marketId Market identifier
   * @param price Price level
   * @param isBid True for bid side
   * @param limit Maximum orders to return
   */
  getOrdersAtPrice(
    marketId: string,
    price: string,
    isBid: boolean,
    limit?: number,
  ): Promise<CLOBOrder[]>;

  // ============ Order Queries ============

  /**
   * Get order by ID
   * @param orderId Order identifier
   */
  getOrderById(orderId: string): Promise<CLOBOrder | null>;

  /**
   * Get open orders for a market
   * @param baseToken Base token address
   * @param baseTokenId Base token ID
   * @param limit Maximum orders to return
   */
  getOpenOrders(
    baseToken: string,
    baseTokenId: string,
    limit?: number,
  ): Promise<CLOBOrder[]>;

  /**
   * Get user's orders
   * @param userAddress User address
   * @param status Optional status filter
   * @param limit Maximum orders to return
   */
  getUserOrders(
    userAddress: string,
    status?: CLOBOrderStatus,
    limit?: number,
  ): Promise<CLOBOrder[]>;

  /**
   * Get user's active orders (open + partial)
   * @param userAddress User address
   */
  getUserActiveOrders(userAddress: string): Promise<CLOBOrder[]>;

  // ============ Trade Queries ============

  /**
   * Get trade by ID
   * @param tradeId Trade identifier
   */
  getTradeById(tradeId: string): Promise<CLOBTrade | null>;

  /**
   * Get recent trades for a market
   * @param baseToken Base token address
   * @param baseTokenId Base token ID
   * @param limit Maximum trades to return
   */
  getTrades(
    baseToken: string,
    baseTokenId: string,
    limit?: number,
  ): Promise<CLOBTrade[]>;

  /**
   * Get user's trade history
   * @param userAddress User address
   * @param limit Maximum trades to return
   */
  getUserTrades(userAddress: string, limit?: number): Promise<CLOBTrade[]>;

  // ============ Market Queries ============

  /**
   * Get market by ID
   * @param marketId Market identifier
   */
  getMarket(marketId: string): Promise<CLOBMarket | null>;

  /**
   * Get all active markets
   */
  getAllMarkets(): Promise<CLOBMarket[]>;

  /**
   * Get market statistics
   * @param marketId Market identifier
   */
  getMarketStats(marketId: string): Promise<MarketStats>;

  /**
   * Calculate market ID from token parameters
   * @param baseToken Base token address
   * @param baseTokenId Base token ID
   * @param quoteToken Quote token address
   */
  getMarketId(
    baseToken: string,
    baseTokenId: string,
    quoteToken: string,
  ): string;

  // ============ User Statistics ============

  /**
   * Get user trading statistics
   * @param userAddress User address
   */
  getUserTradingStats(userAddress: string): Promise<UserTradingStats | null>;

  // ============ Circuit Breaker ============

  /**
   * Get circuit breaker status for a market
   * @param marketId Market identifier
   */
  getCircuitBreaker(marketId: string): Promise<CircuitBreaker | null>;

  // ============ Commitment Queries ============

  /**
   * Get commitment by ID
   * @param commitmentId Commitment identifier
   */
  getCommitment(commitmentId: string): Promise<CommittedOrder | null>;

  /**
   * Get user's pending commitments
   * @param userAddress User address
   */
  getUserCommitments(userAddress: string): Promise<CommittedOrder[]>;
}

// =============================================================================
// SERVICE INTERFACE
// =============================================================================

/**
 * CLOB Service Interface
 *
 * Defines business logic operations for CLOB trading.
 * Implementations handle order placement, cancellation,
 * and other trading operations via smart contracts.
 */
export interface ICLOBService {
  // ============ Order Placement ============

  /**
   * Place a limit order
   * @param params Order parameters
   */
  placeLimitOrder(params: PlaceLimitOrderParams): Promise<OrderPlacementResult>;

  /**
   * Place a market order
   * @param params Order parameters
   */
  placeMarketOrder(
    params: PlaceMarketOrderParams,
  ): Promise<OrderPlacementResult>;

  /**
   * Place a sell order from node inventory
   * @param nodeHash Node identifier
   * @param params Order parameters
   */
  placeNodeSellOrder(
    nodeHash: string,
    params: PlaceLimitOrderParams,
  ): Promise<OrderPlacementResult>;

  // ============ Order Management ============

  /**
   * Cancel an order
   * @param orderId Order to cancel
   */
  cancelOrder(orderId: string): Promise<OrderCancellationResult>;

  /**
   * Cancel multiple orders
   * @param orderIds Orders to cancel
   */
  cancelOrders(orderIds: string[]): Promise<OrderCancellationResult[]>;

  // ============ MEV Protection ============

  /**
   * Commit to placing an order (for large orders)
   * @param params Commitment parameters
   */
  commitOrder(params: CommitOrderParams): Promise<{ commitmentId: string }>;

  /**
   * Reveal and execute a committed order
   * @param params Reveal parameters
   */
  revealOrder(params: RevealOrderParams): Promise<OrderPlacementResult>;

  // ============ Quote Calculation ============

  /**
   * Calculate quote amount for an order
   * @param price Price per unit
   * @param amount Amount of base tokens
   */
  calculateQuoteAmount(price: bigint, amount: bigint): bigint;

  /**
   * Check if order requires commit-reveal (MEV protection)
   * @param quoteAmount Total quote amount
   */
  requiresCommitReveal(quoteAmount: bigint): Promise<boolean>;

  // ============ Configuration ============

  /**
   * Get fee configuration
   */
  getFeeConfig(): Promise<{
    takerFeeBps: number;
    makerFeeBps: number;
    lpFeeBps: number;
    feeRecipient: string;
  }>;

  /**
   * Get MEV protection configuration
   */
  getMEVConfig(): Promise<{
    minRevealDelay: number;
    commitmentThreshold: string;
  }>;

  /**
   * Check if system is paused
   */
  isPaused(): Promise<boolean>;
}
