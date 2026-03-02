'use client';

import { CLOBRepository, CLOBTrade } from '../repositories/clob-repository';
import { clobV2Repository } from '../repositories/clob-v2-repository';

/**
 * Time period for candlestick charts
 */
export type TimePeriod = '1h' | '1d' | '1w' | '1m' | '1y';

/**
 * OHLCV Candlestick data structure
 * Compatible with lightweight-charts library
 */
export interface OHLCVCandle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Price history data for charts
 */
export interface PriceHistoryData {
  candles: OHLCVCandle[];
  lastPrice: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

/**
 * Time intervals for each period (in seconds)
 * These determine how trades are aggregated into candles
 */
const PERIOD_INTERVALS: Record<TimePeriod, number> = {
  '1h': 5 * 60, // 5-minute candles for 1-hour view
  '1d': 60 * 60, // 1-hour candles for 1-day view
  '1w': 4 * 60 * 60, // 4-hour candles for 1-week view
  '1m': 24 * 60 * 60, // 1-day candles for 1-month view
  '1y': 7 * 24 * 60 * 60, // 1-week candles for 1-year view
};

/**
 * How many intervals to fetch for each period
 */
const PERIOD_CANDLE_COUNTS: Record<TimePeriod, number> = {
  '1h': 12, // 12 x 5min = 1 hour
  '1d': 24, // 24 x 1hr = 1 day
  '1w': 42, // 42 x 4hr = 1 week
  '1m': 30, // 30 x 1day = 1 month
  '1y': 52, // 52 x 1week = 1 year
};

/**
 * PriceHistoryService - Aggregates CLOB trades into OHLCV candlestick data
 *
 * Features:
 * - Fetches trades from the indexer
 * - Aggregates into time-bucketed candles
 * - Calculates 24h statistics
 * - Handles empty data gracefully
 */
export class PriceHistoryService {
  private clobRepository: CLOBRepository;

  constructor() {
    this.clobRepository = new CLOBRepository();
  }

  /**
   * Get candlestick data for a market
   *
   * @param baseToken - The ERC1155 token address
   * @param baseTokenId - The token ID
   * @param period - Time period for the chart
   * @returns OHLCV candle array
   */
  async getCandlestickData(
    baseToken: string,
    baseTokenId: string,
    period: TimePeriod,
  ): Promise<OHLCVCandle[]> {
    try {
      // Calculate how far back we need to fetch trades
      const intervalSeconds = PERIOD_INTERVALS[period];
      const candleCount = PERIOD_CANDLE_COUNTS[period];
      const timeRangeSeconds = intervalSeconds * candleCount;

      // Fetch trades (limit based on expected density)
      const [v1Trades, v2Trades] = await Promise.all([
        this.clobRepository.getTrades(baseToken, baseTokenId, 500),
        clobV2Repository
          .getTrades(baseToken, baseTokenId, 500)
          .catch(() => [] as CLOBTrade[]),
      ]);
      const trades: CLOBTrade[] = [
        ...v1Trades,
        ...(v2Trades as unknown as CLOBTrade[]),
      ].sort((a, b) => a.timestamp - b.timestamp);

      if (trades.length === 0) {
        return [];
      }

      // Filter trades within our time range
      const now = Date.now();
      const cutoffTime = now - timeRangeSeconds * 1000;
      const relevantTrades = trades.filter((t) => t.timestamp >= cutoffTime);

      if (relevantTrades.length === 0) {
        // If no recent trades, use all trades but limit to period
        return this.aggregateTrades(trades.slice(0, 100), intervalSeconds);
      }

      return this.aggregateTrades(relevantTrades, intervalSeconds);
    } catch (error) {
      console.error(
        '[PriceHistoryService] Failed to get candlestick data:',
        error,
      );
      return [];
    }
  }

  /**
   * Get full price history data including statistics
   *
   * @param baseToken - The ERC1155 token address
   * @param baseTokenId - The token ID
   * @param period - Time period for the chart
   * @returns Price history with candles and statistics
   */
  async getPriceHistory(
    baseToken: string,
    baseTokenId: string,
    period: TimePeriod,
  ): Promise<PriceHistoryData> {
    try {
      const [candles, stats] = await Promise.all([
        this.getCandlestickData(baseToken, baseTokenId, period),
        this.clobRepository.getMarketStats(baseToken, baseTokenId),
      ]);

      return {
        candles,
        lastPrice: stats.lastPrice,
        change24h: stats.change24h,
        changePercent24h: stats.change24h,
        high24h: stats.high24h,
        low24h: stats.low24h,
        volume24h: stats.volume24h,
      };
    } catch (error) {
      console.error(
        '[PriceHistoryService] Failed to get price history:',
        error,
      );
      return {
        candles: [],
        lastPrice: 0,
        change24h: 0,
        changePercent24h: 0,
        high24h: 0,
        low24h: 0,
        volume24h: 0,
      };
    }
  }

  /**
   * Aggregate trades into OHLCV candles
   *
   * @param trades - Array of trades to aggregate
   * @param intervalSeconds - Time interval for each candle in seconds
   * @returns Array of OHLCV candles
   */
  private aggregateTrades(
    trades: CLOBTrade[],
    intervalSeconds: number,
  ): OHLCVCandle[] {
    if (trades.length === 0) {
      return [];
    }

    // Sort trades by timestamp (oldest first)
    const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);

    // Group trades into time buckets
    const buckets = new Map<
      number,
      { open: number; high: number; low: number; close: number; volume: number }
    >();

    for (const trade of sortedTrades) {
      // Convert timestamp to seconds and round to bucket
      const timestampSeconds = Math.floor(trade.timestamp / 1000);
      const bucketTime =
        Math.floor(timestampSeconds / intervalSeconds) * intervalSeconds;

      const existing = buckets.get(bucketTime);

      if (existing) {
        // Update existing bucket
        existing.high = Math.max(existing.high, trade.price);
        existing.low = Math.min(existing.low, trade.price);
        existing.close = trade.price; // Last trade in bucket becomes close
        existing.volume += trade.amount;
      } else {
        // Create new bucket
        buckets.set(bucketTime, {
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price,
          volume: trade.amount,
        });
      }
    }

    // Convert buckets to candle array
    const candles: OHLCVCandle[] = [];
    const sortedBuckets = Array.from(buckets.entries()).sort(
      (a, b) => a[0] - b[0],
    );

    // Fill in missing candles with previous close
    let lastClose = sortedBuckets[0]?.[1].close || 0;

    for (let i = 0; i < sortedBuckets.length; i++) {
      const [time, data] = sortedBuckets[i];

      // If there's a gap, fill with flat candles
      if (i > 0) {
        const prevTime = sortedBuckets[i - 1][0];
        const gapCandles = Math.floor((time - prevTime) / intervalSeconds) - 1;

        for (let j = 1; j <= Math.min(gapCandles, 10); j++) {
          // Limit gap filling
          candles.push({
            time: prevTime + j * intervalSeconds,
            open: lastClose,
            high: lastClose,
            low: lastClose,
            close: lastClose,
            volume: 0,
          });
        }
      }

      candles.push({
        time,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume,
      });

      lastClose = data.close;
    }

    return candles;
  }

  /**
   * Get the interval in seconds for a given period
   */
  getIntervalSeconds(period: TimePeriod): number {
    return PERIOD_INTERVALS[period];
  }

  /**
   * Get expected candle count for a period
   */
  getCandleCount(period: TimePeriod): number {
    return PERIOD_CANDLE_COUNTS[period];
  }
}

// Export singleton instance
export const priceHistoryService = new PriceHistoryService();

export default PriceHistoryService;
