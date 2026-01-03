'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  clobRepository,
  type OrderBookData,
} from '@/infrastructure/repositories/clob-repository';

/**
 * Order level data structure
 */
export interface OrderLevel {
  /** Price at this level */
  price: number;
  /** Quantity at this level */
  quantity: number;
  /** Cumulative total quantity */
  total: number;
  /** Depth percentage for visualization */
  depthPercent: number;
}

/**
 * Configuration options for the order book hook
 */
export interface UseOrderBookOptions {
  /** Number of price levels to display on each side */
  levels?: number;
  /** Update interval in milliseconds */
  updateInterval?: number;
  /** Base token address */
  baseToken?: string;
  /** Base token ID */
  baseTokenId?: string;
  /** Base price for mock data generation */
  basePrice?: number;
}

/**
 * Generate mock order book data (fallback when no real data)
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
 * Extended order book data with depth percentages
 */
export interface ExtendedOrderBookData {
  bids: OrderLevel[];
  asks: OrderLevel[];
  spread: number;
  spreadPercent: number;
  midPrice: number;
  lastUpdate: number;
}

/**
 * Convert CLOB repository order book to hook format with depth percentages
 */
const convertToHookFormat = (
  repoOrderBook: OrderBookData,
  levels: number,
): ExtendedOrderBookData => {
  // Take only the requested number of levels
  const rawBids = repoOrderBook.bids.slice(0, levels);
  const rawAsks = repoOrderBook.asks.slice(0, levels);

  // Calculate depth percentages
  const maxBid = rawBids[rawBids.length - 1]?.total || 0;
  const maxAsk = rawAsks[rawAsks.length - 1]?.total || 0;
  const maxTotal = Math.max(maxBid, maxAsk);

  const bids: OrderLevel[] = rawBids.map((bid) => ({
    ...bid,
    depthPercent: maxTotal > 0 ? (bid.total / maxTotal) * 100 : 0,
  }));

  const asks: OrderLevel[] = rawAsks.map((ask) => ({
    ...ask,
    depthPercent: maxTotal > 0 ? (ask.total / maxTotal) * 100 : 0,
  }));

  return {
    ...repoOrderBook,
    bids,
    asks,
  };
};

/**
 * useOrderBook - Hook for fetching and managing order book data
 *
 * Fetches real order book data from CLOB repository with:
 * - Bid and ask levels from Ponder indexer
 * - Spread calculation
 * - Depth visualization data
 * - Auto-updates at specified interval
 * - Mock data fallback when no real data available
 *
 * @param assetId - The asset identifier (baseToken-baseTokenId)
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const { orderBook, isLoading, refresh } = useOrderBook('0x...-123', {
 *   levels: 10,
 *   updateInterval: 5000,
 *   baseToken: '0x...',
 *   baseTokenId: '123',
 * });
 * ```
 */
export function useOrderBook(
  assetId: string,
  options: UseOrderBookOptions = {},
) {
  const {
    levels = 10,
    updateInterval = 5000,
    baseToken,
    baseTokenId,
    basePrice = 100,
  } = options;

  const [orderBook, setOrderBook] = useState<ExtendedOrderBookData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch and update order book data
   */
  const updateOrderBook = useCallback(async () => {
    try {
      // If we have real market data, fetch from repository
      if (baseToken && baseTokenId) {
        const repoOrderBook = await clobRepository.getOrderBook(
          baseToken,
          baseTokenId,
          levels * 2, // Fetch extra levels for better aggregation
        );

        // Check if we have real data
        const hasRealData =
          repoOrderBook.bids.length > 0 || repoOrderBook.asks.length > 0;

        if (hasRealData) {
          const formatted = convertToHookFormat(repoOrderBook, levels);
          setOrderBook(formatted);
          setIsLoading(false);
          setError(null);
          return;
        }
      }

      // Fallback to mock data if no real data available
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
      console.error('[useOrderBook] Failed to update order book:', err);
      setError('Failed to fetch order book data');
      setIsLoading(false);
    }
  }, [baseToken, baseTokenId, levels, basePrice]);

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
export function useOrderBookStats(orderBook: ExtendedOrderBookData | null) {
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
