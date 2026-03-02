'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { clobV2Repository } from '@/infrastructure/repositories/clob-v2-repository';
import {
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
} from '@/chain-constants';

interface AssetPriceData {
  price: number;
  bestBid: number;
  bestAsk: number;
  spread: number;
  spreadPercent: number;
  lastUpdate: number;
}

interface UseAssetPriceReturn {
  priceData: AssetPriceData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const toNum = (v: string | number | null | undefined) =>
  v ? parseFloat(String(v)) / 1e18 : 0;

export function useAssetPrice(
  tokenId: string,
  baseToken: string = NEXT_PUBLIC_DIAMOND_ADDRESS,
  pollInterval: number = 10000,
): UseAssetPriceReturn {
  const [priceData, setPriceData] = useState<AssetPriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPrice = useCallback(async () => {
    if (!tokenId || tokenId === '0') {
      setPriceData(null);
      setIsLoading(false);
      return;
    }

    try {
      const book = await clobV2Repository.getOrderBook(
        baseToken,
        tokenId,
        NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
        5,
      );

      const bestBid = toNum(book.bestBid);
      const bestAsk = toNum(book.bestAsk);
      const midPrice =
        bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;
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
      setError(null);
    } catch (err) {
      console.error('[useAssetPrice] Failed to fetch price:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
    } finally {
      setIsLoading(false);
    }
  }, [tokenId, baseToken]);

  useEffect(() => {
    fetchPrice();
    if (pollInterval > 0) {
      // Only poll when page is visible to save bandwidth and reduce RPC load
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchPrice();
        }
      };

      intervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchPrice();
        }
      }, pollInterval);

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        );
      };
    }
  }, [fetchPrice, pollInterval]);

  return { priceData, isLoading, error, refetch: fetchPrice };
}

export function useAssetPrices(
  tokenIds: string[],
  baseToken: string = NEXT_PUBLIC_DIAMOND_ADDRESS,
): {
  prices: Map<string, AssetPriceData>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [prices, setPrices] = useState<Map<string, AssetPriceData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    if (!tokenIds.length) {
      setPrices(new Map());
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      const newPrices = new Map<string, AssetPriceData>();
      const results = await Promise.allSettled(
        tokenIds.map(async (tokenId) => {
          const book = await clobV2Repository.getOrderBook(
            baseToken,
            tokenId,
            NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
            5,
          );
          const bestBid = toNum(book.bestBid);
          const bestAsk = toNum(book.bestAsk);
          const midPrice =
            bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;
          const spread = bestAsk - bestBid;
          const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;
          return {
            tokenId,
            priceData: {
              price: midPrice,
              bestBid,
              bestAsk,
              spread,
              spreadPercent,
              lastUpdate: Date.now(),
            },
          };
        }),
      );
      for (const result of results) {
        if (result.status === 'fulfilled')
          newPrices.set(result.value.tokenId, result.value.priceData);
      }
      setPrices(newPrices);
      setError(null);
    } catch (err) {
      console.error('[useAssetPrices] Failed to fetch prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setIsLoading(false);
    }
  }, [tokenIds, baseToken]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  return { prices, isLoading, error, refetch: fetchPrices };
}

export default useAssetPrice;
