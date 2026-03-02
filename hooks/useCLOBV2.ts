'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  type CLOBOrder,
  type CLOBTrade,
  type OrderBook,
  type PriceLevel,
  type MarketStats,
  type UserTradingStats,
  type CircuitBreaker,
  type PlaceLimitOrderParams,
  type PlaceMarketOrderParams,
  type OrderPlacementResult,
  type OrderCancellationResult,
  CLOBOrderStatus,
  TimeInForce,
  CLOBOrderType,
  CircuitBreakerStatus,
} from '@/domain/clob/clob';
import { clobV2Repository } from '@/infrastructure/repositories/clob-v2-repository';
import { clobV2Service } from '@/infrastructure/services/clob-v2-service';
import { keccak256, encodePacked } from 'viem';

/**
 * CLOB V2 Hook Configuration
 */
export interface UseCLOBV2Options {
  /** Base token address */
  baseToken: string;
  /** Base token ID */
  baseTokenId: string;
  /** Quote token address */
  quoteToken: string;
  /** Number of order book levels to display */
  levels?: number;
  /** Auto-refresh interval in ms */
  refreshInterval?: number;
  /** Enable auto-refresh */
  autoRefresh?: boolean;
}

/**
 * Order book with computed display values
 */
export interface DisplayOrderBook extends OrderBook {
  /** Whether order book has data */
  hasData: boolean;
  /** Total bid volume */
  totalBidVolume: string;
  /** Total ask volume */
  totalAskVolume: string;
  /** Bid/ask volume ratio */
  volumeRatio: number;
  /** Market imbalance indicator (-1 to 1) */
  imbalance: number;
}

/**
 * Order with display helpers
 */
export interface DisplayOrder extends CLOBOrder {
  /** Formatted price for display */
  displayPrice: string;
  /** Formatted amount for display */
  displayAmount: string;
  /** Fill percentage */
  fillPercent: number;
  /** Time since creation */
  age: string;
  /** Status color class */
  statusColor: string;
  /** Status label */
  statusLabel: string;
  /** Can be cancelled */
  canCancel: boolean;
}

/**
 * Trade with display helpers
 */
export interface DisplayTrade extends CLOBTrade {
  /** Formatted price */
  displayPrice: string;
  /** Formatted amount */
  displayAmount: string;
  /** Trade direction color */
  directionColor: string;
  /** Time since trade */
  age: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate market ID from token parameters
 */
export function calculateMarketId(
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

/**
 * Format wei value to display string
 */
function formatWei(value: string, decimals: number = 18): string {
  const num = BigInt(value);
  const divisor = BigInt(10 ** decimals);
  const whole = num / divisor;
  const fraction = num % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4);
  return `${whole}.${fractionStr}`;
}

/**
 * Format time ago
 */
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * Get status color class
 */
function getStatusColor(status: CLOBOrderStatus): string {
  switch (status) {
    case CLOBOrderStatus.OPEN:
      return 'text-blue-500';
    case CLOBOrderStatus.PARTIAL:
      return 'text-yellow-500';
    case CLOBOrderStatus.FILLED:
      return 'text-green-500';
    case CLOBOrderStatus.CANCELLED:
      return 'text-red-500';
    case CLOBOrderStatus.EXPIRED:
      return 'text-gray-500';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get status label
 */
function getStatusLabel(status: CLOBOrderStatus): string {
  switch (status) {
    case CLOBOrderStatus.OPEN:
      return 'Open';
    case CLOBOrderStatus.PARTIAL:
      return 'Partial';
    case CLOBOrderStatus.FILLED:
      return 'Filled';
    case CLOBOrderStatus.CANCELLED:
      return 'Cancelled';
    case CLOBOrderStatus.EXPIRED:
      return 'Expired';
    default:
      return 'Unknown';
  }
}

/**
 * Enhance order with display properties
 */
function enhanceOrder(order: CLOBOrder): DisplayOrder {
  const amount = BigInt(order.amount);
  const filledAmount = BigInt(order.filledAmount);
  const fillPercent = amount > 0n ? Number((filledAmount * 100n) / amount) : 0;

  return {
    ...order,
    displayPrice: formatWei(order.price),
    displayAmount: order.amount,
    fillPercent,
    age: formatTimeAgo(order.createdAt),
    statusColor: getStatusColor(order.status),
    statusLabel: getStatusLabel(order.status),
    canCancel:
      order.status === CLOBOrderStatus.OPEN ||
      order.status === CLOBOrderStatus.PARTIAL,
  };
}

/**
 * Enhance trade with display properties
 */
function enhanceTrade(trade: CLOBTrade): DisplayTrade {
  return {
    ...trade,
    displayPrice: formatWei(trade.price),
    displayAmount: trade.amount,
    directionColor: trade.takerIsBuy ? 'text-green-500' : 'text-red-500',
    age: formatTimeAgo(trade.timestamp),
  };
}

// =============================================================================
// MOCK DATA FOR DEVELOPMENT
// =============================================================================

function createMockOrderBook(
  marketId: string,
  levels: number,
): DisplayOrderBook {
  const basePrice = 1000000000000000000n; // 1 ETH
  const priceStep = 10000000000000000n; // 0.01 ETH

  const bids: PriceLevel[] = [];
  const asks: PriceLevel[] = [];
  let bidCumulative = 0n;
  let askCumulative = 0n;

  for (let i = 0; i < levels; i++) {
    const bidPrice = basePrice - priceStep * BigInt(i + 1);
    const askPrice = basePrice + priceStep * BigInt(i + 1);
    const quantity = BigInt(Math.floor(Math.random() * 100) + 10);

    bidCumulative += quantity;
    askCumulative += quantity;

    bids.push({
      price: bidPrice.toString(),
      quantity: quantity.toString(),
      orderCount: Math.floor(Math.random() * 5) + 1,
      cumulativeQuantity: bidCumulative.toString(),
      depthPercent: 0,
    });

    asks.push({
      price: askPrice.toString(),
      quantity: quantity.toString(),
      orderCount: Math.floor(Math.random() * 5) + 1,
      cumulativeQuantity: askCumulative.toString(),
      depthPercent: 0,
    });
  }

  // Calculate depth percentages
  const maxCumulative =
    bidCumulative > askCumulative ? bidCumulative : askCumulative;
  bids.forEach((level) => {
    level.depthPercent = Number(
      (BigInt(level.cumulativeQuantity) * 100n) / maxCumulative,
    );
  });
  asks.forEach((level) => {
    level.depthPercent = Number(
      (BigInt(level.cumulativeQuantity) * 100n) / maxCumulative,
    );
  });

  const bestBid = bids[0]?.price || null;
  const bestAsk = asks[0]?.price || null;
  const spread =
    bestBid && bestAsk ? (BigInt(bestAsk) - BigInt(bestBid)).toString() : '0';
  const midPrice =
    bestBid && bestAsk
      ? ((BigInt(bestBid) + BigInt(bestAsk)) / 2n).toString()
      : '0';
  const spreadPercent =
    midPrice !== '0' ? (Number(spread) / Number(midPrice)) * 100 : 0;

  const totalBidVolume = bidCumulative.toString();
  const totalAskVolume = askCumulative.toString();
  const volumeRatio =
    askCumulative > 0n
      ? Number((bidCumulative * 100n) / askCumulative) / 100
      : 0;
  const imbalance =
    bidCumulative + askCumulative > 0n
      ? Number(
          ((bidCumulative - askCumulative) * 100n) /
            (bidCumulative + askCumulative),
        ) / 100
      : 0;

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
    hasData: true,
    totalBidVolume,
    totalAskVolume,
    volumeRatio,
    imbalance,
  };
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * useCLOBV2 - Main hook for CLOB V2 trading functionality
 *
 * Provides:
 * - Order book data with depth visualization
 * - Order placement (limit, market, node sell)
 * - Order management (cancel, track)
 * - Trade history
 * - Market statistics
 * - Circuit breaker status
 *
 * @example
 * ```tsx
 * const {
 *   orderBook,
 *   userOrders,
 *   trades,
 *   marketStats,
 *   placeLimitOrder,
 *   cancelOrder,
 *   isLoading,
 * } = useCLOBV2({
 *   baseToken: '0x...',
 *   baseTokenId: '1',
 *   quoteToken: '0x...',
 *   levels: 15,
 * });
 * ```
 */
export function useCLOBV2(options: UseCLOBV2Options) {
  const {
    baseToken,
    baseTokenId,
    quoteToken,
    levels = 10,
    refreshInterval = 5000,
    autoRefresh = true,
  } = options;

  // State
  const [orderBook, setOrderBook] = useState<DisplayOrderBook | null>(null);
  const [userOrders, setUserOrders] = useState<DisplayOrder[]>([]);
  const [trades, setTrades] = useState<DisplayTrade[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [userStats, setUserStats] = useState<UserTradingStats | null>(null);
  const [circuitBreaker, setCircuitBreaker] = useState<CircuitBreaker | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Computed market ID
  const marketId = useMemo(
    () => calculateMarketId(baseToken, baseTokenId, quoteToken),
    [baseToken, baseTokenId, quoteToken],
  );

  // ============ Data Fetching ============

  /**
   * Fetch order book data
   */
  const fetchOrderBook = useCallback(async () => {
    try {
      const data = await clobV2Repository.getOrderBook(
        baseToken,
        baseTokenId,
        quoteToken,
        levels,
      );

      // Convert to display format
      const displayData: DisplayOrderBook = {
        ...data,
        hasData: data.bids.length > 0 || data.asks.length > 0,
        totalBidVolume: data.bids.reduce(
          (sum, b) => (BigInt(sum) + BigInt(b.quantity)).toString(),
          '0',
        ),
        totalAskVolume: data.asks.reduce(
          (sum, a) => (BigInt(sum) + BigInt(a.quantity)).toString(),
          '0',
        ),
        volumeRatio: 0,
        imbalance: 0,
      };

      // Calculate ratios
      const bidVol = BigInt(displayData.totalBidVolume);
      const askVol = BigInt(displayData.totalAskVolume);
      if (askVol > 0n) {
        displayData.volumeRatio = Number((bidVol * 100n) / askVol) / 100;
      }
      if (bidVol + askVol > 0n) {
        displayData.imbalance =
          Number(((bidVol - askVol) * 100n) / (bidVol + askVol)) / 100;
      }

      setOrderBook(displayData);
    } catch (err) {
      console.error('[useCLOBV2] Failed to fetch order book:', err);
      // Fall back to mock data for development
      const mockData = createMockOrderBook(marketId, levels);
      setOrderBook(mockData);
    }
  }, [baseToken, baseTokenId, quoteToken, marketId, levels]);

  /**
   * Fetch user orders
   */
  const fetchUserOrders = useCallback(async (userAddress: string) => {
    try {
      const orders = await clobV2Repository.getUserActiveOrders(userAddress);
      setUserOrders(orders.map(enhanceOrder));
    } catch (err) {
      console.error('[useCLOBV2] Failed to fetch user orders:', err);
      setUserOrders([]);
    }
  }, []);

  /**
   * Fetch recent trades
   */
  const fetchTrades = useCallback(async () => {
    try {
      const tradeData = await clobV2Repository.getTrades(
        baseToken,
        baseTokenId,
        50,
      );
      setTrades(tradeData.map(enhanceTrade));
    } catch (err) {
      console.error('[useCLOBV2] Failed to fetch trades:', err);
      setTrades([]);
    }
  }, [baseToken, baseTokenId]);

  /**
   * Fetch market statistics
   */
  const fetchMarketStats = useCallback(async () => {
    try {
      const stats = await clobV2Repository.getMarketStats(marketId);
      setMarketStats(stats);
    } catch (err) {
      console.error('[useCLOBV2] Failed to fetch market stats:', err);
    }
  }, [marketId]);

  /**
   * Fetch circuit breaker status
   */
  const fetchCircuitBreaker = useCallback(async () => {
    try {
      const cb = await clobV2Repository.getCircuitBreaker(marketId);
      if (cb !== null) setCircuitBreaker(cb);
    } catch (err) {
      console.error('[useCLOBV2] Failed to fetch circuit breaker:', err);
    }
  }, [marketId]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchOrderBook(),
        fetchTrades(),
        fetchMarketStats(),
        fetchCircuitBreaker(),
      ]);
    } catch (err) {
      console.error('[useCLOBV2] Failed to refresh:', err);
      setError('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchOrderBook, fetchTrades, fetchMarketStats, fetchCircuitBreaker]);

  // ============ Order Actions ============

  /**
   * Place a limit order
   */
  const placeLimitOrder = useCallback(
    async (
      price: bigint,
      amount: bigint,
      isBuy: boolean,
      timeInForce: TimeInForce = TimeInForce.GTC,
      expiry?: number,
    ): Promise<OrderPlacementResult> => {
      try {
        const result = await clobV2Service.placeLimitOrder({
          baseToken,
          baseTokenId,
          quoteToken,
          price,
          amount,
          isBuy,
          timeInForce,
          expiry,
        });

        if (result.success) {
          await refresh();
        }

        return result;
      } catch (err) {
        console.error('[useCLOBV2] Failed to place limit order:', err);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [baseToken, baseTokenId, quoteToken, refresh],
  );

  /**
   * Place a market order
   */
  const placeMarketOrder = useCallback(
    async (
      amount: bigint,
      isBuy: boolean,
      maxSlippageBps: number = 100,
    ): Promise<OrderPlacementResult> => {
      try {
        const result = await clobV2Service.placeMarketOrder({
          baseToken,
          baseTokenId,
          quoteToken,
          amount,
          isBuy,
          maxSlippageBps,
        });

        if (result.success) {
          await refresh();
        }

        return result;
      } catch (err) {
        console.error('[useCLOBV2] Failed to place market order:', err);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [baseToken, baseTokenId, quoteToken, refresh],
  );

  /**
   * Cancel an order
   */
  const cancelOrder = useCallback(
    async (orderId: string): Promise<OrderCancellationResult> => {
      try {
        const result = await clobV2Service.cancelOrder(orderId);

        if (result.success) {
          await refresh();
        }

        return result;
      } catch (err) {
        console.error('[useCLOBV2] Failed to cancel order:', err);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [refresh],
  );

  /**
   * Cancel multiple orders
   */
  const cancelOrders = useCallback(
    async (orderIds: string[]): Promise<OrderCancellationResult[]> => {
      return Promise.all(orderIds.map(cancelOrder));
    },
    [cancelOrder],
  );

  // ============ Effects ============

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchOrderBook();
      fetchTrades();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchOrderBook, fetchTrades]);

  // ============ Computed Values ============

  const isCircuitBreakerTripped = useMemo(
    () => circuitBreaker?.status === CircuitBreakerStatus.TRIPPED,
    [circuitBreaker],
  );

  const canTrade = useMemo(
    () => !isLoading && !isCircuitBreakerTripped && !error,
    [isLoading, isCircuitBreakerTripped, error],
  );

  // ============ Return ============

  return {
    // Data
    orderBook,
    userOrders,
    trades,
    marketStats,
    userStats,
    circuitBreaker,
    marketId,

    // State
    isLoading,
    error,
    canTrade,
    isCircuitBreakerTripped,

    // Actions
    refresh,
    fetchUserOrders,
    placeLimitOrder,
    placeMarketOrder,
    cancelOrder,
    cancelOrders,

    // Utilities
    calculateMarketId,
  };
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * useOrderBookDepth - Focused hook for order book visualization
 */
export function useOrderBookDepth(options: UseCLOBV2Options) {
  const { orderBook, isLoading, refresh } = useCLOBV2(options);

  const depthData = useMemo(() => {
    if (!orderBook) return { bids: [], asks: [], maxDepth: 0 };

    const bids = orderBook.bids.map((level) => ({
      price: Number(formatWei(level.price)),
      quantity: Number(level.quantity),
      cumulative: Number(level.cumulativeQuantity),
      percent: level.depthPercent,
    }));

    const asks = orderBook.asks.map((level) => ({
      price: Number(formatWei(level.price)),
      quantity: Number(level.quantity),
      cumulative: Number(level.cumulativeQuantity),
      percent: level.depthPercent,
    }));

    const maxDepth = Math.max(
      bids[bids.length - 1]?.cumulative || 0,
      asks[asks.length - 1]?.cumulative || 0,
    );

    return { bids, asks, maxDepth };
  }, [orderBook]);

  return {
    ...depthData,
    spread: orderBook?.spread || '0',
    spreadPercent: orderBook?.spreadPercent || 0,
    midPrice: orderBook?.midPrice || '0',
    imbalance: orderBook?.imbalance || 0,
    isLoading,
    refresh,
  };
}

/**
 * useUserCLOBOrders - Hook for user's CLOB orders
 */
export function useUserCLOBOrders(
  userAddress: string | undefined,
  options: Partial<UseCLOBV2Options> = {},
) {
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!userAddress) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userOrders = await clobV2Repository.getUserOrders(userAddress);
      setOrders(userOrders.map(enhanceOrder));
    } catch (err) {
      console.error('[useUserCLOBOrders] Failed to fetch orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === CLOBOrderStatus.OPEN ||
          o.status === CLOBOrderStatus.PARTIAL,
      ),
    [orders],
  );

  const filledOrders = useMemo(
    () => orders.filter((o) => o.status === CLOBOrderStatus.FILLED),
    [orders],
  );

  const cancelledOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === CLOBOrderStatus.CANCELLED ||
          o.status === CLOBOrderStatus.EXPIRED,
      ),
    [orders],
  );

  return {
    orders,
    activeOrders,
    filledOrders,
    cancelledOrders,
    isLoading,
    refresh: fetchOrders,
  };
}

/**
 * useMarketTrades - Hook for market trade history
 */
export function useMarketTrades(options: UseCLOBV2Options) {
  const { trades, isLoading, refresh } = useCLOBV2(options);

  const tradeStats = useMemo(() => {
    if (trades.length === 0) {
      return {
        lastPrice: '0',
        volume24h: '0',
        buyVolume: '0',
        sellVolume: '0',
        tradeCount: 0,
      };
    }

    let buyVolume = 0n;
    let sellVolume = 0n;

    trades.forEach((trade) => {
      const amount = BigInt(trade.amount);
      if (trade.takerIsBuy) {
        buyVolume += amount;
      } else {
        sellVolume += amount;
      }
    });

    return {
      lastPrice: trades[0]?.price || '0',
      volume24h: (buyVolume + sellVolume).toString(),
      buyVolume: buyVolume.toString(),
      sellVolume: sellVolume.toString(),
      tradeCount: trades.length,
    };
  }, [trades]);

  return {
    trades,
    ...tradeStats,
    isLoading,
    refresh,
  };
}

export default useCLOBV2;
