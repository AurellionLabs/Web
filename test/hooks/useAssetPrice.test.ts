import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAssetPrice, useAssetPrices } from '@/hooks/useAssetPrice';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockOrderBook = (overrides = {}) => ({
  bestBid: '1000000000000000000', // 1 ETH
  bestAsk: '1050000000000000000', // 1.05 ETH
  bids: [],
  asks: [],
  ...overrides,
});

// ─── Hoisted mocks ───────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const getOrderBook = vi.fn();

  return { getOrderBook };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/infrastructure/repositories/clob-v2-repository', () => ({
  clobV2Repository: {
    getOrderBook: mocks.getOrderBook,
  },
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xd1a0000000000000000000000000000000000001',
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0xa100000000000000000000000000000000000001',
}));

const DIAMOND_ADDRESS = '0xd1a0000000000000000000000000000000000001';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useAssetPrice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Ensure document is visible so the polling interval fires
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });

    mocks.getOrderBook.mockResolvedValue(mockOrderBook());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should set isLoading to true initially', () => {
      const { result } = renderHook(() => useAssetPrice('1'));

      // Initial state should have isLoading true
      expect(result.current.isLoading).toBe(true);
      expect(result.current.priceData).toBe(null);
      expect(result.current.error).toBe(null);
    });
  });

  describe('successful price fetch', () => {
    it('should return correct price data with spread calculations', async () => {
      mocks.getOrderBook.mockResolvedValue(
        mockOrderBook({
          bestBid: '1000000000000000000', // 1.0
          bestAsk: '1100000000000000000', // 1.1
        }),
      );

      const { result } = renderHook(() => useAssetPrice('1'));

      // Flush the initial async fetch
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      // Use closeTo for spread/spreadPercent — floating-point imprecision (1.1-1.0 = 0.10000000000000009)
      expect(result.current.priceData).toMatchObject({
        price: 1.05,
        bestBid: 1.0,
        bestAsk: 1.1,
        lastUpdate: expect.any(Number),
      });
      expect(result.current.priceData!.spread).toBeCloseTo(0.1, 10);
      expect(result.current.priceData!.spreadPercent).toBeCloseTo(
        9.523809523809524,
        8,
      );
      expect(result.current.error).toBe(null);
    });

    it('should handle only bid available', async () => {
      mocks.getOrderBook.mockResolvedValue(
        mockOrderBook({
          bestBid: '1000000000000000000',
          bestAsk: null,
        }),
      );

      const { result } = renderHook(() => useAssetPrice('1'));

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.priceData).toEqual({
        price: 1.0,
        bestBid: 1.0,
        bestAsk: 0,
        spread: -1.0,
        spreadPercent: -100,
        lastUpdate: expect.any(Number),
      });
    });

    it('should handle only ask available', async () => {
      mocks.getOrderBook.mockResolvedValue(
        mockOrderBook({
          bestBid: null,
          bestAsk: '1050000000000000000',
        }),
      );

      const { result } = renderHook(() => useAssetPrice('1'));

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.priceData).toEqual({
        price: 1.05,
        bestBid: 0,
        bestAsk: 1.05,
        spread: 1.05,
        spreadPercent: 100,
        lastUpdate: expect.any(Number),
      });
    });

    it('should handle null bestBid and bestAsk', async () => {
      mocks.getOrderBook.mockResolvedValue(
        mockOrderBook({
          bestBid: null,
          bestAsk: null,
        }),
      );

      const { result } = renderHook(() => useAssetPrice('1'));

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.priceData).toEqual({
        price: 0,
        bestBid: 0,
        bestAsk: 0,
        spread: 0,
        spreadPercent: 0,
        lastUpdate: expect.any(Number),
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors', async () => {
      mocks.getOrderBook.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAssetPrice('1'));

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error');
      expect(result.current.priceData).toBe(null);
    });

    it('should handle non-Error exceptions', async () => {
      mocks.getOrderBook.mockRejectedValue('String error');

      const { result } = renderHook(() => useAssetPrice('1'));

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch price');
    });
  });

  describe('invalid tokenId', () => {
    it('should handle empty tokenId', async () => {
      const { result } = renderHook(() => useAssetPrice(''));

      // For empty token, isLoading becomes false immediately (synchronously in useEffect)
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.priceData).toBe(null);
      expect(mocks.getOrderBook).not.toHaveBeenCalled();
    });

    it('should handle tokenId "0"', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { result } = renderHook(() => useAssetPrice('0'));

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.priceData).toBe(null);
      expect(mocks.getOrderBook).not.toHaveBeenCalled();
    });

    it('should handle null tokenId', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { result } = renderHook(() => useAssetPrice(null as any));

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.priceData).toBe(null);
      expect(mocks.getOrderBook).not.toHaveBeenCalled();
    });
  });

  describe('refetch', () => {
    it('should expose refetch function that fetches new price', async () => {
      mocks.getOrderBook.mockResolvedValue(mockOrderBook());

      const { result } = renderHook(() => useAssetPrice('1'));

      await act(async () => {
        await Promise.resolve();
      });

      const initialCallCount = mocks.getOrderBook.mock.calls.length;
      expect(initialCallCount).toBeGreaterThanOrEqual(1);

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(mocks.getOrderBook.mock.calls.length).toBe(initialCallCount + 1);
    });
  });

  describe('custom parameters', () => {
    it('should use custom baseToken when provided', async () => {
      mocks.getOrderBook.mockResolvedValue(mockOrderBook());

      renderHook(() => useAssetPrice('1', '0xCustomBaseToken', 10000));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mocks.getOrderBook).toHaveBeenCalledWith(
        '0xCustomBaseToken',
        '1',
        '0xa100000000000000000000000000000000000001',
        5,
      );
    });
  });

  // ─── Polling tests (fake timers) ──────────────────────────────────────────

  describe('polling', () => {
    it('should poll at the specified interval when document is visible', async () => {
      renderHook(() => useAssetPrice('1', DIAMOND_ADDRESS, 5000));

      // Flush initial fetch
      await act(async () => {
        await Promise.resolve();
      });

      const callsAfterMount = mocks.getOrderBook.mock.calls.length;
      expect(callsAfterMount).toBeGreaterThanOrEqual(1);

      // Advance by one poll interval — interval callback fires and calls fetchPrice
      await act(async () => {
        vi.advanceTimersByTime(5000);
        await Promise.resolve();
      });

      expect(mocks.getOrderBook.mock.calls.length).toBeGreaterThan(
        callsAfterMount,
      );
    });

    it('should poll multiple times over multiple intervals', async () => {
      renderHook(() => useAssetPrice('1', DIAMOND_ADDRESS, 3000));

      await act(async () => {
        await Promise.resolve();
      });

      const callsAfterMount = mocks.getOrderBook.mock.calls.length;

      // Advance by 3 intervals
      await act(async () => {
        vi.advanceTimersByTime(9000);
        await Promise.resolve();
      });

      expect(mocks.getOrderBook.mock.calls.length).toBeGreaterThanOrEqual(
        callsAfterMount + 3,
      );
    });

    it('should not set up interval when pollInterval is 0', async () => {
      renderHook(() => useAssetPrice('1', DIAMOND_ADDRESS, 0));

      await act(async () => {
        await Promise.resolve();
      });

      const callsAfterMount = mocks.getOrderBook.mock.calls.length;
      expect(callsAfterMount).toBeGreaterThanOrEqual(1);

      // Advance a long time — no interval should fire
      await act(async () => {
        vi.advanceTimersByTime(60000);
        await Promise.resolve();
      });

      expect(mocks.getOrderBook.mock.calls.length).toBe(callsAfterMount);
    });

    it('should stop polling after unmount', async () => {
      const { unmount } = renderHook(() =>
        useAssetPrice('1', DIAMOND_ADDRESS, 5000),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const callsAfterMount = mocks.getOrderBook.mock.calls.length;

      unmount();

      // Advance past poll interval — interval should have been cleared on unmount
      await act(async () => {
        vi.advanceTimersByTime(10000);
        await Promise.resolve();
      });

      expect(mocks.getOrderBook.mock.calls.length).toBe(callsAfterMount);
    });

    it('should not poll when document is hidden', async () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });

      renderHook(() => useAssetPrice('1', DIAMOND_ADDRESS, 3000));

      await act(async () => {
        await Promise.resolve();
      });

      // Initial fetch fires immediately (not guarded by visibilityState at call site)
      const callsAfterMount = mocks.getOrderBook.mock.calls.length;

      // Advance 3 intervals — interval callbacks check visibilityState and skip
      await act(async () => {
        vi.advanceTimersByTime(9000);
        await Promise.resolve();
      });

      expect(mocks.getOrderBook.mock.calls.length).toBe(callsAfterMount);
    });

    it('should update priceData on each successful poll cycle', async () => {
      mocks.getOrderBook
        .mockResolvedValueOnce(
          mockOrderBook({
            bestBid: '1000000000000000000', // 1.0
            bestAsk: '1100000000000000000', // 1.1
          }),
        )
        .mockResolvedValueOnce(
          mockOrderBook({
            bestBid: '2000000000000000000', // 2.0
            bestAsk: '2200000000000000000', // 2.2
          }),
        );

      const { result } = renderHook(() =>
        useAssetPrice('1', DIAMOND_ADDRESS, 5000),
      );

      // First fetch
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.priceData?.price).toBe(1.05);

      // Advance to trigger second fetch (poll)
      await act(async () => {
        vi.advanceTimersByTime(5000);
        await Promise.resolve();
      });

      expect(result.current.priceData?.price).toBe(2.1);
    });
  });
});

describe('useAssetPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.getOrderBook.mockResolvedValue(mockOrderBook());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should set isLoading to true initially', () => {
      // Hoist array outside callback — inline literals create a new reference each render,
      // causing useCallback([tokenIds]) to re-fire and loop indefinitely.
      const tokenIds = ['1', '2'];
      const { result } = renderHook(() => useAssetPrices(tokenIds));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.prices.size).toBe(0);
      expect(result.current.error).toBe(null);
    });
  });

  describe('successful multi-token fetch', () => {
    it('should fetch prices for all tokenIds', async () => {
      const tokenIds = ['1', '2', '3'];
      const { result } = renderHook(() => useAssetPrices(tokenIds));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mocks.getOrderBook).toHaveBeenCalledTimes(3);
      expect(result.current.prices.size).toBe(3);
      expect(result.current.prices.has('1')).toBe(true);
      expect(result.current.prices.has('2')).toBe(true);
      expect(result.current.prices.has('3')).toBe(true);
      expect(result.current.error).toBe(null);
    });
  });

  describe('empty array', () => {
    it('should handle empty tokenIds array', async () => {
      const tokenIds: string[] = [];
      const { result } = renderHook(() => useAssetPrices(tokenIds));

      await act(async () => {
        await Promise.resolve();
      });

      // React 18 flushes effects synchronously inside renderHook/act, so the early-return
      // path runs immediately and isLoading is false by the time we assert.
      expect(result.current.isLoading).toBe(false);
      expect(result.current.prices.size).toBe(0);
      expect(mocks.getOrderBook).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle API errors', async () => {
      mocks.getOrderBook.mockRejectedValue(new Error('Network error'));

      const tokenIds = ['1'];
      const { result } = renderHook(() => useAssetPrices(tokenIds));

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.prices.size).toBe(0);
    });

    it('should handle partial failures with Promise.allSettled', async () => {
      mocks.getOrderBook
        .mockResolvedValueOnce(mockOrderBook())
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(mockOrderBook());

      const tokenIds = ['1', '2', '3'];
      const { result } = renderHook(() => useAssetPrices(tokenIds));

      await act(async () => {
        await Promise.resolve();
      });

      // Should have prices for successful calls
      expect(result.current.prices.size).toBe(2);
      expect(result.current.prices.has('1')).toBe(true);
      expect(result.current.prices.has('3')).toBe(true);
      expect(result.current.prices.has('2')).toBe(false);
      // Error is set but prices from successful calls are still returned
      expect(result.current.error).toBe('Failed');
    });
  });

  describe('refetch', () => {
    it('should expose refetch function', async () => {
      const tokenIds = ['1'];
      const { result } = renderHook(() => useAssetPrices(tokenIds));

      await act(async () => {
        await Promise.resolve();
      });

      const initialCallCount = mocks.getOrderBook.mock.calls.length;

      await act(async () => {
        await result.current.refetch();
      });

      expect(mocks.getOrderBook.mock.calls.length).toBe(initialCallCount + 1);
    });
  });
});
