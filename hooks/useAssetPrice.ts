'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CLOBRepository } from '@/infrastructure/repositories/clob-repository';
import {
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_INDEXER_URL,
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

const DEFAULT_PRICE_DATA: AssetPriceData = {
  price: 0,
  bestBid: 0,
  bestAsk: 0,
  spread: 0,
  spreadPercent: 0,
  lastUpdate: 0,
};

/**
 * Hook to fetch real-time price data from the CLOB orderbook
 *
 * @param tokenId - The token ID to fetch price for
 * @param baseToken - The base token address (defaults to Diamond ERC1155)
 * @param pollInterval - How often to refresh price data in ms (default: 10000)
 *
 * @example
 * ```tsx
 * const { priceData, isLoading, error } = useAssetPrice('12345');
 *
 * if (priceData) {
 *   console.log(`Current price: $${priceData.price.toFixed(2)}`);
 * }
 * ```
 */
export function useAssetPrice(
  tokenId: string,
  baseToken: string = NEXT_PUBLIC_DIAMOND_ADDRESS,
  pollInterval: number = 10000,
): UseAssetPriceReturn {
  const [priceData, setPriceData] = useState<AssetPriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clobRepositoryRef = useRef(new CLOBRepository());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPrice = useCallback(async () => {
    if (!tokenId || tokenId === '0') {
      setPriceData(null);
      setIsLoading(false);
      return;
    }

    try {
      const orderBook = await clobRepositoryRef.current.getOrderBook(
        baseToken,
        tokenId,
      );

      const newPriceData: AssetPriceData = {
        price: orderBook.midPrice || 0,
        bestBid: orderBook.bids[0]?.price || 0,
        bestAsk: orderBook.asks[0]?.price || 0,
        spread: orderBook.spread,
        spreadPercent: orderBook.spreadPercent,
        lastUpdate: orderBook.lastUpdate,
      };

      setPriceData(newPriceData);
      setError(null);
    } catch (err) {
      console.error('[useAssetPrice] Failed to fetch price:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
    } finally {
      setIsLoading(false);
    }
  }, [tokenId, baseToken]);

  // Initial fetch and polling
  useEffect(() => {
    fetchPrice();

    // Set up polling
    if (pollInterval > 0) {
      intervalRef.current = setInterval(fetchPrice, pollInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrice, pollInterval]);

  return {
    priceData,
    isLoading,
    error,
    refetch: fetchPrice,
  };
}

/**
 * Hook to fetch prices for multiple assets at once
 *
 * @param tokenIds - Array of token IDs to fetch prices for
 * @param baseToken - The base token address
 *
 * @returns Map of tokenId -> AssetPriceData
 */
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

  const clobRepositoryRef = useRef(new CLOBRepository());

  const fetchPrices = useCallback(async () => {
    if (!tokenIds.length) {
      setPrices(new Map());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const newPrices = new Map<string, AssetPriceData>();

      // Fetch prices in parallel
      const results = await Promise.allSettled(
        tokenIds.map(async (tokenId) => {
          const orderBook = await clobRepositoryRef.current.getOrderBook(
            baseToken,
            tokenId,
          );
          return {
            tokenId,
            priceData: {
              price: orderBook.midPrice || 0,
              bestBid: orderBook.bids[0]?.price || 0,
              bestAsk: orderBook.asks[0]?.price || 0,
              spread: orderBook.spread,
              spreadPercent: orderBook.spreadPercent,
              lastUpdate: orderBook.lastUpdate,
            },
          };
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          newPrices.set(result.value.tokenId, result.value.priceData);
        }
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

  return {
    prices,
    isLoading,
    error,
    refetch: fetchPrices,
  };
}

export default useAssetPrice;
