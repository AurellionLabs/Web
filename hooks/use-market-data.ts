'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  clobRepository,
  type MarketStats,
} from '@/infrastructure/repositories/clob-repository';
import { clobV2Repository } from '@/infrastructure/repositories/clob-v2-repository';
import { NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS } from '@/chain-constants';

/**
 * Configuration options for the market data hook
 */
export interface UseMarketDataOptions {
  /** Update interval in milliseconds */
  updateInterval?: number;
  /** Auto-refresh enabled */
  autoRefresh?: boolean;
}

/**
 * Market data return type
 */
export interface UseMarketDataReturn {
  /** Current market statistics */
  stats: MarketStats | null;
  /** Recent trades */
  trades: Awaited<ReturnType<typeof clobRepository.getTrades>>;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh data manually */
  refresh: () => Promise<void>;
}

/**
 * useMarketData - Hook for fetching market data and statistics
 *
 * Provides real-time market data from CLOB repository with:
 * - Market statistics (price, volume, change, etc.)
 * - Recent trades
 * - Auto-refresh capability
 *
 * @param baseToken - Base token address
 * @param baseTokenId - Base token ID
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const { stats, trades, isLoading, refresh } = useMarketData('0x...', '123', {
 *   updateInterval: 10000,
 *   autoRefresh: true,
 * });
 * ```
 */
export function useMarketData(
  baseToken?: string,
  baseTokenId?: string,
  options: UseMarketDataOptions = {},
) {
  const { updateInterval = 10000, autoRefresh = true } = options;

  const [stats, setStats] = useState<MarketStats | null>(null);
  const [trades, setTrades] = useState<
    Awaited<ReturnType<typeof clobRepository.getTrades>>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch market data
   */
  const fetchData = useCallback(async () => {
    if (!baseToken || !baseTokenId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch data from both V1 and V2 in parallel
      const [statsData, v1Trades, v2Trades] = await Promise.all([
        clobRepository.getMarketStats(baseToken, baseTokenId),
        clobRepository.getTrades(baseToken, baseTokenId, 20),
        clobV2Repository.getTrades(baseToken, baseTokenId, 20).catch(() => []),
      ]);

      // Merge trades, sort by timestamp desc, take most recent 20
      const mergedTrades = [...v1Trades, ...v2Trades]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20);

      setStats(statsData);
      setTrades(mergedTrades);
    } catch (err) {
      console.error('[useMarketData] Failed to fetch market data:', err);
      setError('Failed to fetch market data');
    } finally {
      setIsLoading(false);
    }
  }, [baseToken, baseTokenId]);

  /**
   * Refresh data manually
   */
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Initial load and periodic updates
  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, updateInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh, updateInterval]);

  return {
    stats,
    trades,
    isLoading,
    error,
    refresh,
  };
}

/**
 * useMultipleMarkets - Hook for fetching data for multiple markets
 *
 * @param markets - Array of { baseToken, baseTokenId } pairs
 * @param options - Configuration options
 */
export function useMultipleMarkets(
  markets: Array<{ baseToken: string; baseTokenId: string }>,
  options: UseMarketDataOptions = {},
) {
  const { updateInterval = 30000, autoRefresh = true } = options;

  const [allStats, setAllStats] = useState<Map<string, MarketStats>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const newStats = new Map<string, MarketStats>();

      // Fetch all markets in parallel
      await Promise.all(
        markets.map(async (market) => {
          const key = `${market.baseToken}-${market.baseTokenId}`;
          const stats = await clobRepository.getMarketStats(
            market.baseToken,
            market.baseTokenId,
          );
          newStats.set(key, stats);
        }),
      );

      setAllStats(newStats);
    } catch (err) {
      console.error('[useMultipleMarkets] Failed to fetch markets:', err);
      setError('Failed to fetch market data');
    } finally {
      setIsLoading(false);
    }
  }, [markets]);

  const refresh = useCallback(async () => {
    await fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    fetchAllData();

    if (autoRefresh) {
      const interval = setInterval(fetchAllData, updateInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAllData, autoRefresh, updateInterval]);

  return {
    allStats,
    isLoading,
    error,
    refresh,
  };
}

export default useMarketData;
