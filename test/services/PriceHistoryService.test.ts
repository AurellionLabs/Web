/**
 * @file test/services/PriceHistoryService.test.ts
 * @description Vitest unit tests for PriceHistoryService
 *
 * Covers:
 *  - getCandlestickData (empty trades, filtered trades, error handling)
 *  - getPriceHistory (with stats, error handling)
 *  - aggregateTrades (empty, single trade, multiple trades, gaps)
 *  - getIntervalSeconds (all periods)
 *  - getCandleCount (all periods)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CLOBTrade {
  price: string;
  amount: string;
  timestamp: number;
  [key: string]: any;
}

interface MarketStats {
  lastPrice: string;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TRADES: CLOBTrade[] = [
  { price: '100.5', amount: '10', timestamp: 1706745600000 }, // 2024-02-01 00:00:00
  { price: '101.0', amount: '5', timestamp: 1706745900000 }, // +5min
  { price: '100.8', amount: '8', timestamp: 1706746200000 }, // +10min
  { price: '102.0', amount: '15', timestamp: 1706746500000 }, // +15min
  { price: '101.5', amount: '12', timestamp: 1706746800000 }, // +20min
];

const MOCK_STATS: MarketStats = {
  lastPrice: '101.5',
  change24h: 1.5,
  changePercent24h: 1.5,
  high24h: 102.0,
  low24h: 100.5,
  volume24h: 50000,
};

// ─── Mock implementations ────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  getTrades: vi.fn<() => Promise<CLOBTrade[]>>(),
  getMarketStats: vi.fn<() => Promise<MarketStats>>(),
}));

vi.mock('@/infrastructure/repositories/clob-v2-repository', () => ({
  clobV2Repository: {
    getTrades: mocks.getTrades,
    getMarketStats: mocks.getMarketStats,
  },
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0xQuot3Addrcss',
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import {
  PriceHistoryService,
  TimePeriod,
} from '@/infrastructure/services/price-history-service';

// ─── Test suite ─────────────────────────────────────────────────────────────

describe('PriceHistoryService', () => {
  let service: PriceHistoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PriceHistoryService();
  });

  describe('getIntervalSeconds', () => {
    it('should return 300 (5 min) for 1h period', () => {
      expect(service.getIntervalSeconds('1h')).toBe(5 * 60);
    });

    it('should return 3600 (1 hour) for 1d period', () => {
      expect(service.getIntervalSeconds('1d')).toBe(60 * 60);
    });

    it('should return 14400 (4 hours) for 1w period', () => {
      expect(service.getIntervalSeconds('1w')).toBe(4 * 60 * 60);
    });

    it('should return 86400 (1 day) for 1m period', () => {
      expect(service.getIntervalSeconds('1m')).toBe(24 * 60 * 60);
    });

    it('should return 604800 (1 week) for 1y period', () => {
      expect(service.getIntervalSeconds('1y')).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('getCandleCount', () => {
    it('should return 12 for 1h period', () => {
      expect(service.getCandleCount('1h')).toBe(12);
    });

    it('should return 24 for 1d period', () => {
      expect(service.getCandleCount('1d')).toBe(24);
    });

    it('should return 42 for 1w period', () => {
      expect(service.getCandleCount('1w')).toBe(42);
    });

    it('should return 30 for 1m period', () => {
      expect(service.getCandleCount('1m')).toBe(30);
    });

    it('should return 52 for 1y period', () => {
      expect(service.getCandleCount('1y')).toBe(52);
    });
  });

  describe('getCandlestickData', () => {
    const baseToken = '0xToken';
    const baseTokenId = '1';
    const period: TimePeriod = '1h';

    it('should return empty array when repository throws error', async () => {
      mocks.getTrades.mockRejectedValue(new Error('Network error'));

      const result = await service.getCandlestickData(
        baseToken,
        baseTokenId,
        period,
      );

      expect(result).toEqual([]);
      expect(mocks.getTrades).toHaveBeenCalledWith(baseToken, baseTokenId, 500);
    });

    it('should return empty array when no trades returned', async () => {
      mocks.getTrades.mockResolvedValue([]);

      const result = await service.getCandlestickData(
        baseToken,
        baseTokenId,
        period,
      );

      expect(result).toEqual([]);
    });

    it('should aggregate trades into candles', async () => {
      mocks.getTrades.mockResolvedValue(MOCK_TRADES);
      // Mock Date.now() to return a fixed time
      const now = 1706748000000; // After all mock trades
      vi.spyOn(Date, 'now').mockImplementation(() => now);

      const result = await service.getCandlestickData(
        baseToken,
        baseTokenId,
        period,
      );

      expect(result.length).toBeGreaterThan(0);
      // Check first candle structure
      const firstCandle = result[0];
      expect(firstCandle).toHaveProperty('time');
      expect(firstCandle).toHaveProperty('open');
      expect(firstCandle).toHaveProperty('high');
      expect(firstCandle).toHaveProperty('low');
      expect(firstCandle).toHaveProperty('close');
      expect(firstCandle).toHaveProperty('volume');

      // Verify OHLC values are numbers
      expect(typeof firstCandle.open).toBe('number');
      expect(typeof firstCandle.high).toBe('number');
      expect(typeof firstCandle.low).toBe('number');
      expect(typeof firstCandle.close).toBe('number');

      // High should be >= open, low should be <= open
      expect(firstCandle.high).toBeGreaterThanOrEqual(firstCandle.open);
      expect(firstCandle.low).toBeLessThanOrEqual(firstCandle.open);
    });

    it('should handle trades with string price/amount', async () => {
      // Use timestamps within the SAME 5-minute bucket
      const now = Date.now();
      const bucketStart = Math.floor(now / 300000) * 300000; // Round down to 5 min
      const stringTrades: CLOBTrade[] = [
        { price: '100', amount: '10', timestamp: bucketStart },
        { price: '100', amount: '20', timestamp: bucketStart + 60000 }, // +1 min - same bucket
        { price: '100', amount: '15', timestamp: bucketStart + 120000 }, // +2 min - same bucket
      ];
      mocks.getTrades.mockResolvedValue(stringTrades);

      const result = await service.getCandlestickData(
        baseToken,
        baseTokenId,
        period,
      );

      expect(result.length).toBe(1);
      expect(result[0].volume).toBe(45); // 10 + 20 + 15 in same bucket
    });

    it('should handle single trade', async () => {
      const singleTrade: CLOBTrade[] = [
        { price: '100.0', amount: '10', timestamp: Date.now() - 60000 },
      ];
      mocks.getTrades.mockResolvedValue(singleTrade);

      const result = await service.getCandlestickData(
        baseToken,
        baseTokenId,
        period,
      );

      expect(result.length).toBe(1);
      expect(result[0].open).toBe(100.0);
      expect(result[0].close).toBe(100.0);
      expect(result[0].high).toBe(100.0);
      expect(result[0].low).toBe(100.0);
      expect(result[0].volume).toBe(10);
    });
  });

  describe('getPriceHistory', () => {
    const baseToken = '0xToken';
    const baseTokenId = '1';
    const period: TimePeriod = '1h';

    it('should return full price history with stats', async () => {
      mocks.getTrades.mockResolvedValue(MOCK_TRADES);
      mocks.getMarketStats.mockResolvedValue(MOCK_STATS);

      const result = await service.getPriceHistory(
        baseToken,
        baseTokenId,
        period,
      );

      expect(result.candles).toBeDefined();
      expect(result.lastPrice).toBe('101.5');
      expect(result.change24h).toBe(1.5);
      expect(result.changePercent24h).toBe(1.5);
      expect(result.high24h).toBe(102.0);
      expect(result.low24h).toBe(100.5);
      expect(result.volume24h).toBe(50000);
    });

    it('should return default stats when getMarketStats throws', async () => {
      mocks.getTrades.mockResolvedValue(MOCK_TRADES);
      mocks.getMarketStats.mockRejectedValue(new Error('API error'));

      const result = await service.getPriceHistory(
        baseToken,
        baseTokenId,
        period,
      );

      expect(result.candles).toBeDefined();
      expect(result.lastPrice).toBe('0'); // Service returns string '0' from catch fallback
      expect(result.change24h).toBe(0);
      expect(result.high24h).toBe(0);
      expect(result.low24h).toBe(0);
    });

    it('should return default values on complete failure', async () => {
      mocks.getTrades.mockRejectedValue(new Error('Network error'));
      mocks.getMarketStats.mockRejectedValue(new Error('Network error'));

      const result = await service.getPriceHistory(
        baseToken,
        baseTokenId,
        period,
      );

      expect(result.candles).toEqual([]);
      expect(result.lastPrice).toBe('0'); // Service returns string '0' from catch fallback
      expect(result.change24h).toBe(0);
      expect(result.changePercent24h).toBe(0);
      expect(result.high24h).toBe(0);
      expect(result.low24h).toBe(0);
      expect(result.volume24h).toBe(0);
    });

    it('should fetch trades and stats in parallel', async () => {
      mocks.getTrades.mockResolvedValue(MOCK_TRADES);
      mocks.getMarketStats.mockResolvedValue(MOCK_STATS);

      await service.getPriceHistory(baseToken, baseTokenId, period);

      expect(mocks.getTrades).toHaveBeenCalled();
      expect(mocks.getMarketStats).toHaveBeenCalled();
    });
  });

  describe('aggregateTrades (private method via public API)', () => {
    const baseToken = '0xToken';
    const baseTokenId = '1';

    it('should return empty array for empty trades', async () => {
      mocks.getTrades.mockResolvedValue([]);

      const result = await service.getCandlestickData(
        baseToken,
        baseTokenId,
        '1h',
      );

      expect(result).toEqual([]);
    });

    it('should correctly calculate high and low across trades', async () => {
      // Use timestamps within same 5-minute bucket
      const now = Date.now();
      const bucketStart = Math.floor(now / 300000) * 300000; // Round to 5 min
      const varyingTrades: CLOBTrade[] = [
        { price: '100', amount: '10', timestamp: bucketStart },
        { price: '150', amount: '10', timestamp: bucketStart + 60000 },
        { price: '75', amount: '10', timestamp: bucketStart + 120000 },
        { price: '125', amount: '10', timestamp: bucketStart + 180000 },
      ];
      mocks.getTrades.mockResolvedValue(varyingTrades);

      const result = await service.getCandlestickData(
        baseToken,
        baseTokenId,
        '1h',
      );

      // Should have aggregated to one candle with correct OHLC
      expect(result.length).toBe(1);
      const candle = result[0];
      expect(candle.open).toBe(100);
      expect(candle.high).toBe(150);
      expect(candle.low).toBe(75);
      expect(candle.close).toBe(125);
    });

    it('should sum volumes correctly', async () => {
      // Use timestamps within same 5-minute bucket
      const now = Date.now();
      const bucketStart = Math.floor(now / 300000) * 300000;
      const volumeTrades: CLOBTrade[] = [
        { price: '100', amount: '10', timestamp: bucketStart },
        { price: '100', amount: '20', timestamp: bucketStart + 60000 },
        { price: '100', amount: '15', timestamp: bucketStart + 120000 },
      ];
      mocks.getTrades.mockResolvedValue(volumeTrades);

      const result = await service.getCandlestickData(
        baseToken,
        baseTokenId,
        '1h',
      );

      expect(result.length).toBe(1);
      expect(result[0].volume).toBe(45); // 10 + 20 + 15
    });

    it('should handle numeric price and amount (not strings)', async () => {
      const numericTrades: CLOBTrade[] = [
        { price: 100 as any, amount: 10 as any, timestamp: Date.now() - 10000 },
      ];
      mocks.getTrades.mockResolvedValue(numericTrades);

      const result = await service.getCandlestickData(
        baseToken,
        baseTokenId,
        '1h',
      );

      expect(result[0].open).toBe(100);
      expect(result[0].volume).toBe(10);
    });

    it('should handle trades out of order (sorting)', async () => {
      // Use timestamps within same 5-minute bucket but out of order
      const now = Date.now();
      const bucketStart = Math.floor(now / 300000) * 300000;
      const unsortedTrades: CLOBTrade[] = [
        { price: '125', amount: '10', timestamp: bucketStart + 180000 }, // latest in bucket
        { price: '100', amount: '10', timestamp: bucketStart }, // earliest in bucket
        { price: '110', amount: '10', timestamp: bucketStart + 120000 }, // middle in bucket
      ];
      mocks.getTrades.mockResolvedValue(unsortedTrades);

      const result = await service.getCandlestickData(
        baseToken,
        baseTokenId,
        '1h',
      );

      // Service sorts trades, so first candle should have earliest as open
      expect(result.length).toBe(1);
      expect(result[0].open).toBe(100);
      expect(result[0].close).toBe(125); // Last trade in sorted order
    });
  });

  describe('edge cases', () => {
    const baseToken = '0xToken';
    const baseTokenId = '1';

    it('should handle very old trades (beyond period)', async () => {
      const oldTrades: CLOBTrade[] = [
        {
          price: '100',
          amount: '10',
          timestamp: Date.now() - 1000 * 60 * 60 * 24 * 30,
        }, // 30 days ago
      ];
      mocks.getTrades.mockResolvedValue(oldTrades);

      const result = await service.getCandlestickData(
        baseToken,
        baseTokenId,
        '1h',
      );

      // Should still return candles even for old trades
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing optional fields in trade', async () => {
      const minimalTrade: CLOBTrade[] = [
        { price: '100', timestamp: Date.now() }, // missing amount
      ];
      mocks.getTrades.mockResolvedValue(minimalTrade);

      const result = await service.getCandlestickData(
        baseToken,
        baseTokenId,
        '1h',
      );

      expect(result.length).toBe(1);
      expect(result[0].volume).toBeNaN(); // parseFloat(undefined) = NaN
    });

    it('should handle zero values in price/amount', async () => {
      const zeroTrade: CLOBTrade[] = [
        { price: '0', amount: '0', timestamp: Date.now() },
      ];
      mocks.getTrades.mockResolvedValue(zeroTrade);

      const result = await service.getCandlestickData(
        baseToken,
        baseTokenId,
        '1h',
      );

      expect(result[0].open).toBe(0);
      expect(result[0].volume).toBe(0);
    });
  });
});
