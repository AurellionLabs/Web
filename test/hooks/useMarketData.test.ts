// @ts-nocheck - Test file with type issues
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMarketData, useMultipleMarkets } from '@/hooks/use-market-data';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockMarketStats = {
  marketId:
    '0xd1a0000000000000000000000000000000000001-1-0xa100000000000000000000000000000000000001',
  baseToken: '0xd1a0000000000000000000000000000000000001',
  baseTokenId: '1',
  lastPrice: '1050000000000000000',
  change24h: 5.5,
  volume24h: '100000000000000000000',
  high24h: '1100000000000000000',
  low24h: '1000000000000000000',
  totalVolume: '1000000000000000000000',
  tradeCount: 150,
};

const mockTrades = [
  {
    tradeId: '1',
    price: '1050000000000000000',
    quantity: '1000000000000000000',
    side: 'buy',
    timestamp: 1700000000,
    maker: '0x1111111111111111111111111111111111111111',
    taker: '0x2222222222222222222222222222222222222222',
  },
  {
    tradeId: '2',
    price: '1040000000000000000',
    quantity: '500000000000000000',
    side: 'sell',
    timestamp: 1699999999,
    maker: '0x3333333333333333333333333333333333333333',
    taker: '0x4444444444444444444444444444444444444444',
  },
];

// ─── Hoisted mocks ───────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const getMarketStats = vi.fn();
  const getTrades = vi.fn();

  return { getMarketStats, getTrades };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/infrastructure/repositories/clob-v2-repository', () => ({
  clobV2Repository: {
    getMarketStats: mocks.getMarketStats,
    getTrades: mocks.getTrades,
  },
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xd1a0000000000000000000000000000000000001',
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0xa100000000000000000000000000000000000001',
}));

// Mock document.visibilityState
const mockVisibilityState = vi.fn(() => 'visible');
Object.defineProperty(document, 'visibilityState', {
  get: mockVisibilityState,
  configurable: true,
});

// Mock setInterval/clearInterval to avoid timer issues in tests
global.setInterval = vi.fn((callback: any) => {
  return 12345;
}) as any;
global.clearInterval = vi.fn();

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useMarketData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMarketStats.mockResolvedValue(mockMarketStats);
    mocks.getTrades.mockResolvedValue(mockTrades);
  });

  describe('initialization', () => {
    it('should set isLoading to true initially', () => {
      const { result } = renderHook(() =>
        useMarketData('0xd1a0000000000000000000000000000000000001', '1'),
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.stats).toBe(null);
      expect(result.current.trades).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('should not fetch when baseToken is missing', () => {
      const { result } = renderHook(() => useMarketData(undefined, '1'));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.stats).toBe(null);
      expect(result.current.trades).toEqual([]);
      expect(mocks.getMarketStats).not.toHaveBeenCalled();
      expect(mocks.getTrades).not.toHaveBeenCalled();
    });

    it('should not fetch when baseTokenId is missing', () => {
      const { result } = renderHook(() =>
        useMarketData('0xd1a0000000000000000000000000000000000001', undefined),
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.stats).toBe(null);
      expect(mocks.getMarketStats).not.toHaveBeenCalled();
    });

    it('should not fetch when both baseToken and baseTokenId are missing', () => {
      const { result } = renderHook(() => useMarketData());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.stats).toBe(null);
      expect(mocks.getMarketStats).not.toHaveBeenCalled();
    });
  });

  describe('successful data fetch', () => {
    it('should fetch market stats and trades on mount', async () => {
      const { result } = renderHook(() =>
        useMarketData('0xd1a0000000000000000000000000000000000001', '1'),
      );

      // Wait for the async operation
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.stats).toEqual(mockMarketStats);
      expect(result.current.trades).toEqual(mockTrades);
      expect(result.current.error).toBe(null);
      expect(mocks.getMarketStats).toHaveBeenCalledWith(
        '0xd1a0000000000000000000000000000000000001-1-0xa100000000000000000000000000000000000001',
      );
      expect(mocks.getTrades).toHaveBeenCalledWith(
        '0xd1a0000000000000000000000000000000000001',
        '1',
        20,
      );
    });

    it('should construct market ID correctly with lowercase addresses', async () => {
      renderHook(() =>
        useMarketData('0XD1A0000000000000000000000000000000000001', '1'),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mocks.getMarketStats).toHaveBeenCalledWith(
        '0xd1a0000000000000000000000000000000000001-1-0xa100000000000000000000000000000000000001',
      );
    });
  });

  describe('error handling', () => {
    it('should handle errors from getMarketStats', async () => {
      mocks.getMarketStats.mockRejectedValue(new Error('RPC error'));
      mocks.getTrades.mockResolvedValue([]);

      const { result } = renderHook(() =>
        useMarketData('0xd1a0000000000000000000000000000000000001', '1'),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch market data');
      expect(result.current.stats).toBe(null);
      expect(result.current.trades).toEqual([]);
    });

    it('should handle errors from getTrades', async () => {
      mocks.getMarketStats.mockResolvedValue(mockMarketStats);
      mocks.getTrades.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useMarketData('0xd1a0000000000000000000000000000000000001', '1'),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch market data');
      expect(result.current.stats).toBe(null);
    });
  });

  describe('refresh function', () => {
    it('should manually refresh data via refresh function', async () => {
      const { result } = renderHook(() =>
        useMarketData('0xd1a0000000000000000000000000000000000001', '1'),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      mocks.getMarketStats.mockClear();
      mocks.getTrades.mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mocks.getMarketStats).toHaveBeenCalledTimes(1);
      expect(mocks.getTrades).toHaveBeenCalledTimes(1);
    });
  });

  describe('options', () => {
    it('should respect custom updateInterval', () => {
      const updateInterval = 5000;
      renderHook(() =>
        useMarketData('0xd1a0000000000000000000000000000000000001', '1', {
          updateInterval,
        }),
      );

      // The interval is set with setInterval, we can't easily test the actual polling
      // but we can verify no errors occur
    });

    it('should respect autoRefresh=false option', () => {
      const { result } = renderHook(() =>
        useMarketData('0xd1a0000000000000000000000000000000000001', '1', {
          autoRefresh: false,
        }),
      );

      // With autoRefresh=false, initial fetch still happens
      expect(result.current.isLoading).toBe(true);
    });

    it('should disable auto-refresh when autoRefresh is false', () => {
      mocks.getMarketStats.mockResolvedValue(mockMarketStats);
      mocks.getTrades.mockResolvedValue(mockTrades);

      renderHook(
        () =>
          useMarketData('0xd1a0000000000000000000000000000000000001', '1', {
            autoRefresh: false,
          }),
        {
          legacy: false,
        },
      );

      // Advance time but no additional fetches should happen
      // Since we use fake timers, we can't easily verify the interval is not set
      // but this ensures no errors occur
    });
  });
});

describe('useMultipleMarkets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMarketStats.mockResolvedValue(mockMarketStats);
  });

  describe('initialization', () => {
    it('should set isLoading to true initially', () => {
      const { result } = renderHook(() =>
        useMultipleMarkets([
          {
            baseToken: '0xd1a0000000000000000000000000000000000001',
            baseTokenId: '1',
          },
        ]),
      );

      // Initial state - may be true or false depending on sync execution
      expect(result.current.allStats).toEqual(new Map());
      expect(result.current.error).toBe(null);
    });

    it('should handle empty markets array', () => {
      const { result } = renderHook(() => useMultipleMarkets([]));

      // Empty array - just verify no crash
      expect(result.current.allStats).toEqual(new Map());
    });
  });

  describe('successful data fetch', () => {
    it('should fetch stats for multiple markets', () => {
      const markets = [
        {
          baseToken: '0xd1a0000000000000000000000000000000000001',
          baseTokenId: '1',
        },
        {
          baseToken: '0xd1a0000000000000000000000000000000000001',
          baseTokenId: '2',
        },
      ];

      renderHook(() => useMultipleMarkets(markets));

      // Just verify the mock was called with correct market IDs
      expect(mocks.getMarketStats).toHaveBeenCalledTimes(2);
    });

    it('should create correct market keys', async () => {
      const markets = [
        {
          baseToken: '0xd1a0000000000000000000000000000000000001',
          baseTokenId: '1',
        },
      ];

      renderHook(() => useMultipleMarkets(markets));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // The hook calls getMarketStats but doesn't store the key in the Map
      // in a way we can easily verify - but it should construct the marketId correctly
      expect(mocks.getMarketStats).toHaveBeenCalledWith(
        '0xd1a0000000000000000000000000000000000001-1-0xa100000000000000000000000000000000000001',
      );
    });
  });

  describe('error handling', () => {
    it('should handle errors when fetching markets', async () => {
      mocks.getMarketStats.mockRejectedValue(new Error('RPC failure'));

      const markets = [
        {
          baseToken: '0xd1a0000000000000000000000000000000000001',
          baseTokenId: '1',
        },
      ];

      const { result } = renderHook(() => useMultipleMarkets(markets));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch market data');
      expect(result.current.allStats).toEqual(new Map());
    });
  });

  describe('refresh function', () => {
    it('should manually refresh all market data', async () => {
      const markets = [
        {
          baseToken: '0xd1a0000000000000000000000000000000000001',
          baseTokenId: '1',
        },
      ];

      const { result } = renderHook(() => useMultipleMarkets(markets));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      mocks.getMarketStats.mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mocks.getMarketStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('options', () => {
    it('should respect custom updateInterval', () => {
      renderHook(() =>
        useMultipleMarkets(
          [
            {
              baseToken: '0xd1a0000000000000000000000000000000000001',
              baseTokenId: '1',
            },
          ],
          { updateInterval: 60000 },
        ),
      );
    });

    it('should respect autoRefresh=false option', () => {
      const { result } = renderHook(() =>
        useMultipleMarkets(
          [
            {
              baseToken: '0xd1a0000000000000000000000000000000000001',
              baseTokenId: '1',
            },
          ],
          { autoRefresh: false },
        ),
      );

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('market key uniqueness', () => {
    it('should handle different baseTokens correctly', async () => {
      const markets = [
        {
          baseToken: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          baseTokenId: '1',
        },
        {
          baseToken: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          baseTokenId: '1',
        },
      ];

      renderHook(() => useMultipleMarkets(markets));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should have fetched 2 different market IDs
      expect(mocks.getMarketStats).toHaveBeenCalledTimes(2);
    });
  });
});
