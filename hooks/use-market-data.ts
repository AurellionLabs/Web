'use client';

import { useState, useEffect, useCallback } from 'react';
import { clobV2Repository } from '@/infrastructure/repositories/clob-v2-repository';
import type { MarketStats, CLOBTrade } from '@/domain/clob/clob';
import { NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS } from '@/chain-constants';

export interface UseMarketDataOptions {
  updateInterval?: number;
  autoRefresh?: boolean;
}

export interface UseMarketDataReturn {
  stats: MarketStats | null;
  trades: CLOBTrade[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMarketData(
  baseToken?: string,
  baseTokenId?: string,
  options: UseMarketDataOptions = {},
) {
  const { updateInterval = 10000, autoRefresh = true } = options;

  const [stats, setStats] = useState<MarketStats | null>(null);
  const [trades, setTrades] = useState<CLOBTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!baseToken || !baseTokenId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const marketId = `${baseToken.toLowerCase()}-${baseTokenId}-${NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS.toLowerCase()}`;

      const [statsData, tradesData] = await Promise.all([
        clobV2Repository.getMarketStats(marketId),
        clobV2Repository.getTrades(baseToken, baseTokenId, 20),
      ]);

      setStats(statsData);
      setTrades(tradesData);
    } catch (err) {
      console.error('[useMarketData] Failed to fetch market data:', err);
      setError('Failed to fetch market data');
    } finally {
      setIsLoading(false);
    }
  }, [baseToken, baseTokenId]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    if (autoRefresh) {
      // Only poll when page is visible to save bandwidth and reduce RPC load
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
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        );
      };
    }
  }, [fetchData, autoRefresh, updateInterval]);

  return { stats, trades, isLoading, error, refresh };
}

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

      await Promise.all(
        markets.map(async (market) => {
          const key = `${market.baseToken}-${market.baseTokenId}`;
          const marketId = `${market.baseToken.toLowerCase()}-${market.baseTokenId}-${NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS.toLowerCase()}`;
          const s = await clobV2Repository.getMarketStats(marketId);
          newStats.set(key, s);
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
      // Only poll when page is visible to save bandwidth and reduce RPC load
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchAllData();
        }
      };

      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchAllData();
        }
      }, updateInterval);

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        clearInterval(interval);
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        );
      };
    }
  }, [fetchAllData, autoRefresh, updateInterval]);

  return { allStats, isLoading, error, refresh };
}

export default useMarketData;
