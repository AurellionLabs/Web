/**
 * @file Unified hook for CLOB trading data.
 * @description Provides both price and order book data from a single RPC call,
 * eliminating redundant network requests when both are needed.
 *
 * This hook solves the issue where useAssetPrice and useOrderBook were both
 * independently polling the CLOB order book, causing duplicate RPC calls.
 *
 * Before: 2 RPC calls per poll interval (every 5-10s)
 * After: 1 RPC call per poll interval
 * Savings: ~50% reduction in RPC calls for trading pages
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { clobV2Repository } from '@/infrastructure/repositories/clob-v2-repository';
import { NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS } from '@/chain-constants';

/**
 * A single price level in the order book.
 */
export interface OrderLevel {
  price: number;
  quantity: number;
  total: number;
  depthPercent: number;
}

/**
 * Price data derived from order book.
 */
export interface UnifiedPriceData {
  price: number;
  bestBid: number;
  bestAsk: number;
  spread: number;
  spreadPercent: number;
  lastUpdate: number;
}

/**
 * Full order book data.
 */
export interface UnifiedOrderBookData {
  bids: OrderLevel[];
  asks: OrderLevel[];
  spread: number;
  spreadPercent: number;
  midPrice: number;
  lastUpdate: number;
}

/**
 * Combined return type with both price and order book.
 */
export interface UseUnifiedCLOBData {
  priceData: UnifiedPriceData | null;
  orderBook: UnifiedOrderBookData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseUnifiedCLOBOptions {
  levels?: number;
  updateInterval?: number;
  baseToken?: string;
  baseTokenId?: string;
  basePrice?: number;
}

/**
 * Converts raw order book entries to aggregated price levels.
 */
const toOrderLevels = (
  raw: {
    price: string | number;
    size?: string | number;
    quantity?: string | number;
    total?: string | number;
  }[],
  descending: boolean,
  maxLevels: number,
): OrderLevel[] => {
  const map = new Map<number, number>();
  raw.forEach((lvl) => {
    const p = parseFloat(String(lvl.price)) / 1e18;
    const q = parseFloat(String(lvl.size ?? lvl.quantity ?? 0)) / 1e18;
    if (!isNaN(p) && !isNaN(q) && q > 0) {
      map.set(p, (map.get(p) || 0) + q);
    }
  });

  const sorted = [...map.entries()]
    .sort((a, b) => (descending ? b[0] - a[0] : a[0] - b[0]))
    .slice(0, maxLevels);

  let cumulative = 0;
  const levels: OrderLevel[] = sorted.map(([price, quantity]) => {
    cumulative += quantity;
    return { price, quantity, total: cumulative, depthPercent: 0 };
  });

  const maxTotal = levels[levels.length - 1]?.total || 1;
  levels.forEach((lvl) => {
    lvl.depthPercent = (lvl.total / maxTotal) * 100;
  });
  return levels;
};

/**
 * Unified hook that fetches order book once and provides both price and order book data.
 *
 * This eliminates redundant RPC calls when both useAssetPrice and useOrderBook are needed.
 * Previously, a trading page would make 2 RPC calls per poll interval - now it makes 1.
 *
 * @param assetId - The asset identifier (tokenId)
 * @param options - Configuration options
 * @param options.levels - Number of price levels to fetch (default 10)
 * @param options.updateInterval - Polling interval in ms (default 5000)
 * @param options.baseToken - Base token address
 * @param options.baseTokenId - Base token ID
 * @param options.basePrice - Fallback price if order book is empty
 * @returns Price data, order book, loading state, error, and refetch function
 *
 * @example
 * const { priceData, orderBook, isLoading, error, refetch } = useUnifiedCLOB('1', {
 *   levels: 10,
 *   updateInterval: 5000,
 *   baseToken: '0x...',
 *   baseTokenId: '1',
 * });
 *
 * if (priceData) {
 *   console.log(`Price: $${priceData.price}, Spread: ${priceData.spreadPercent.toFixed(2)}%`);
 * }
 * if (orderBook) {
 *   console.log('Bids:', orderBook.bids.length, 'Asks:', orderBook.asks.length);
 * }
 */
export function useUnifiedCLOB(
  assetId: string,
  options: UseUnifiedCLOBOptions = {},
): UseUnifiedCLOBData {
  const {
    levels = 10,
    updateInterval = 5000,
    baseToken,
    baseTokenId,
    basePrice = 100,
  } = options;

  const [priceData, setPriceData] = useState<UnifiedPriceData | null>(null);
  const [orderBook, setOrderBook] = useState<UnifiedOrderBookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // If no valid assetId, set empty state
    if (!baseToken || !baseTokenId || assetId === '' || assetId === '0') {
      setPriceData(null);
      setOrderBook(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      // Single RPC call to get order book
      const book = await clobV2Repository.getOrderBook(
        baseToken,
        baseTokenId,
        NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
        levels * 2,
      );

      // Process price data
      const bestBid = book.bestBid
        ? parseFloat(String(book.bestBid)) / 1e18
        : 0;
      const bestAsk = book.bestAsk
        ? parseFloat(String(book.bestAsk)) / 1e18
        : 0;
      const midPrice =
        bestBid && bestAsk
          ? (bestBid + bestAsk) / 2
          : bestBid || bestAsk || basePrice;
      const spread = bestAsk - bestBid;
      const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

      setPriceData({
        price: midPrice,
        bestBid,
        bestAsk,
        spread,
        spreadPercent,
        lastUpdate: Date.now(),
      });

      // Process full order book
      const bids = toOrderLevels(book.bids, true, levels);
      const asks = toOrderLevels(book.asks, false, levels);

      const bookSpread = bestAsk - bestBid;
      const bookSpreadPercent =
        midPrice > 0 ? (bookSpread / midPrice) * 100 : 0;

      setOrderBook({
        bids,
        asks,
        spread: bookSpread,
        spreadPercent: bookSpreadPercent,
        midPrice,
        lastUpdate: Date.now(),
      });

      setError(null);
    } catch (err) {
      console.error('[useUnifiedCLOB] Failed to fetch data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch CLOB data',
      );
    } finally {
      setIsLoading(false);
    }
  }, [assetId, baseToken, baseTokenId, levels, basePrice]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    // Only poll when page is visible to save bandwidth
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, updateInterval);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, updateInterval]);

  return { priceData, orderBook, isLoading, error, refetch };
}

export default useUnifiedCLOB;
