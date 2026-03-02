'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { clobV2Repository } from '@/infrastructure/repositories/clob-v2-repository';
import { NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS } from '@/chain-constants';
import type { OrderBookData } from '@/infrastructure/repositories/clob-repository';

export interface OrderLevel {
  price: number;
  quantity: number;
  total: number;
  depthPercent: number;
}

export interface UseOrderBookOptions {
  levels?: number;
  updateInterval?: number;
  baseToken?: string;
  baseTokenId?: string;
  basePrice?: number;
}

export interface ExtendedOrderBookData {
  bids: OrderLevel[];
  asks: OrderLevel[];
  spread: number;
  spreadPercent: number;
  midPrice: number;
  lastUpdate: number;
}

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
  // Aggregate by price
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

  const updateOrderBook = useCallback(async () => {
    try {
      if (baseToken && baseTokenId) {
        const book = await clobV2Repository.getOrderBook(
          baseToken,
          baseTokenId,
          NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
          levels * 2,
        );

        const bids = toOrderLevels(book.bids, true, levels);
        const asks = toOrderLevels(book.asks, false, levels);

        const bestBid = bids[0]?.price || 0;
        const bestAsk = asks[0]?.price || 0;
        const spread = bestAsk - bestBid;
        const midPrice =
          bestBid && bestAsk ? (bestBid + bestAsk) / 2 : basePrice;
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
        return;
      }

      setOrderBook({
        bids: [],
        asks: [],
        spread: 0,
        spreadPercent: 0,
        midPrice: basePrice,
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

  const refresh = useCallback(() => {
    setIsLoading(true);
    updateOrderBook();
  }, [updateOrderBook]);

  useEffect(() => {
    updateOrderBook();
    const interval = setInterval(updateOrderBook, updateInterval);
    return () => clearInterval(interval);
  }, [assetId, updateOrderBook, updateInterval]);

  return { orderBook, isLoading, error, refresh };
}

export function useOrderBookStats(orderBook: ExtendedOrderBookData | null) {
  return useMemo(() => {
    if (!orderBook)
      return {
        totalBidVolume: 0,
        totalAskVolume: 0,
        bidAskRatio: 0,
        averageBidPrice: 0,
        averageAskPrice: 0,
      };

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
