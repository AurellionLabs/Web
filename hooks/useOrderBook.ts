'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Represents a single order level in the order book
 */
export interface OrderLevel {
  /** Price at this level */
  price: number;
  /** Total quantity at this price */
  quantity: number;
  /** Cumulative quantity from best price to this level */
  total: number;
  /** Percentage of max quantity (for depth bar visualization) */
  depthPercent: number;
}

/**
 * Order book data structure
 */
export interface OrderBookData {
  /** Bid (buy) orders sorted by price descending */
  bids: OrderLevel[];
  /** Ask (sell) orders sorted by price ascending */
  asks: OrderLevel[];
  /** Current spread between best bid and ask */
  spread: number;
  /** Spread as a percentage of mid price */
  spreadPercent: number;
  /** Mid price between best bid and ask */
  midPrice: number;
  /** Last update timestamp */
  lastUpdate: number;
}

/**
 * Configuration options for the order book hook
 */
export interface UseOrderBookOptions {
  /** Number of price levels to display on each side */
  levels?: number;
  /** Update interval in milliseconds */
  updateInterval?: number;
  /** Base price for generating mock data */
  basePrice?: number;
}

/**
 * Generate mock order book data
 */
const generateMockOrderBook = (
  basePrice: number,
  levels: number,
): { bids: OrderLevel[]; asks: OrderLevel[] } => {
  const priceStep = basePrice * 0.001; // 0.1% price increments

  // Generate bids (buy orders) - descending from just below mid price
  const bids: OrderLevel[] = [];
  let bidTotal = 0;
  for (let i = 0; i < levels; i++) {
    const price = basePrice - (i + 1) * priceStep;
    const quantity = Math.random() * 100 + 10;
    bidTotal += quantity;
    bids.push({
      price,
      quantity,
      total: bidTotal,
      depthPercent: 0, // Will be calculated later
    });
  }

  // Generate asks (sell orders) - ascending from just above mid price
  const asks: OrderLevel[] = [];
  let askTotal = 0;
  for (let i = 0; i < levels; i++) {
    const price = basePrice + (i + 1) * priceStep;
    const quantity = Math.random() * 100 + 10;
    askTotal += quantity;
    asks.push({
      price,
      quantity,
      total: askTotal,
      depthPercent: 0,
    });
  }

  // Calculate depth percentages
  const maxTotal = Math.max(bidTotal, askTotal);
  bids.forEach((bid) => {
    bid.depthPercent = (bid.total / maxTotal) * 100;
  });
  asks.forEach((ask) => {
    ask.depthPercent = (ask.total / maxTotal) * 100;
  });

  return { bids, asks };
};

/**
 * useOrderBook - Hook for managing order book state
 *
 * Provides real-time (mocked) order book data with:
 * - Bid and ask levels
 * - Spread calculation
 * - Depth visualization data
 * - Auto-updates at specified interval
 *
 * @param assetId - The asset to get order book for
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const { orderBook, isLoading, refresh } = useOrderBook('asset-123', {
 *   levels: 10,
 *   updateInterval: 1000,
 *   basePrice: 100,
 * });
 * ```
 */
export function useOrderBook(
  assetId: string,
  options: UseOrderBookOptions = {},
) {
  const { levels = 10, updateInterval = 2000, basePrice = 100 } = options;

  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate and set order book data
   */
  const updateOrderBook = useCallback(() => {
    try {
      const { bids, asks } = generateMockOrderBook(basePrice, levels);

      const bestBid = bids[0]?.price || 0;
      const bestAsk = asks[0]?.price || 0;
      const spread = bestAsk - bestBid;
      const midPrice = (bestBid + bestAsk) / 2;
      const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

      setOrderBook({
        bids,
        asks,
        spread,
        spreadPercent,
        midPrice,
        lastUpdate: Date.now(),
      });
      setIsLoading(false);
      setError(null);
    } catch (err) {
      setError('Failed to update order book');
      setIsLoading(false);
    }
  }, [basePrice, levels]);

  /**
   * Refresh order book data manually
   */
  const refresh = useCallback(() => {
    setIsLoading(true);
    updateOrderBook();
  }, [updateOrderBook]);

  // Initial load and periodic updates
  useEffect(() => {
    updateOrderBook();

    const interval = setInterval(updateOrderBook, updateInterval);

    return () => clearInterval(interval);
  }, [assetId, updateOrderBook, updateInterval]);

  return {
    orderBook,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for getting aggregated order book stats
 */
export function useOrderBookStats(orderBook: OrderBookData | null) {
  return useMemo(() => {
    if (!orderBook) {
      return {
        totalBidVolume: 0,
        totalAskVolume: 0,
        bidAskRatio: 0,
        averageBidPrice: 0,
        averageAskPrice: 0,
      };
    }

    const totalBidVolume = orderBook.bids.reduce(
      (sum, b) => sum + b.quantity,
      0,
    );
    const totalAskVolume = orderBook.asks.reduce(
      (sum, a) => sum + a.quantity,
      0,
    );

    const bidAskRatio =
      totalAskVolume > 0 ? totalBidVolume / totalAskVolume : 0;

    const averageBidPrice =
      totalBidVolume > 0
        ? orderBook.bids.reduce((sum, b) => sum + b.price * b.quantity, 0) /
          totalBidVolume
        : 0;

    const averageAskPrice =
      totalAskVolume > 0
        ? orderBook.asks.reduce((sum, a) => sum + a.price * a.quantity, 0) /
          totalAskVolume
        : 0;

    return {
      totalBidVolume,
      totalAskVolume,
      bidAskRatio,
      averageBidPrice,
      averageAskPrice,
    };
  }, [orderBook]);
}

export default useOrderBook;
