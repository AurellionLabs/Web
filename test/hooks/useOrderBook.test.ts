// @ts-nocheck - Test file with type issues
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// =============================================================================
// MODULE MOCKS
// =============================================================================

const mocks = vi.hoisted(() => ({
  getOrderBook: vi.fn(),
}));

vi.mock('@/infrastructure/repositories/clob-v2-repository', () => ({
  clobV2Repository: {
    getOrderBook: mocks.getOrderBook,
  },
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0xQuote00000000000000000000000000000001',
}));

// =============================================================================
// IMPORTS AFTER MOCKS
// =============================================================================

import { useOrderBook, useOrderBookStats } from '@/hooks/useOrderBook';

// =============================================================================
// CONSTANTS & HELPERS
// =============================================================================

const BASE_TOKEN = '0xBase0000000000000000000000000000000001';
const BASE_TOKEN_ID = '7';
const PRICE_1E18 = (n: number) => String(BigInt(Math.round(n * 1e18)));

/** Build a raw order level (as returned by clobV2Repository) */
const rawLevel = (price: number, size: number) => ({
  price: PRICE_1E18(price),
  size: PRICE_1E18(size),
});

const makeOrderBook = (overrides = {}) => ({
  bids: [rawLevel(1.0, 5), rawLevel(0.9, 3)],
  asks: [rawLevel(1.1, 4), rawLevel(1.2, 2)],
  bestBid: PRICE_1E18(1.0),
  bestAsk: PRICE_1E18(1.1),
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('useOrderBook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default: document is visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });

    mocks.getOrderBook.mockResolvedValue(makeOrderBook());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // No baseToken / baseTokenId — fallback path
  // ---------------------------------------------------------------------------

  describe('without baseToken / baseTokenId', () => {
    it('resolves immediately with empty order book using basePrice as midPrice', async () => {
      const { result } = renderHook(() => useOrderBook('1', { basePrice: 50 }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.orderBook).not.toBeNull();
      expect(result.current.orderBook?.bids).toEqual([]);
      expect(result.current.orderBook?.asks).toEqual([]);
      expect(result.current.orderBook?.midPrice).toBe(50);
      expect(mocks.getOrderBook).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // With baseToken + baseTokenId — real fetch path
  // ---------------------------------------------------------------------------

  describe('with baseToken and baseTokenId', () => {
    const defaultOptions = {
      baseToken: BASE_TOKEN,
      baseTokenId: BASE_TOKEN_ID,
      levels: 5,
    };

    it('starts in loading state', () => {
      mocks.getOrderBook.mockReturnValue(new Promise(() => {})); // never resolves

      const { result } = renderHook(() => useOrderBook('1', defaultOptions));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.orderBook).toBeNull();
    });

    it('populates orderBook after successful fetch', async () => {
      mocks.getOrderBook.mockResolvedValue(makeOrderBook());

      const { result } = renderHook(() => useOrderBook('1', defaultOptions));

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      const ob = result.current.orderBook;
      expect(ob).not.toBeNull();
      expect(ob?.bids.length).toBeGreaterThan(0);
      expect(ob?.asks.length).toBeGreaterThan(0);
      // spread = bestAsk - bestBid = 1.1 - 1.0
      expect(ob?.spread).toBeCloseTo(0.1, 5);
      expect(ob?.midPrice).toBeCloseTo(1.05, 5);
      expect(ob?.lastUpdate).toBeGreaterThan(0);
    });

    it('calls clobV2Repository.getOrderBook with correct args', async () => {
      mocks.getOrderBook.mockResolvedValue(makeOrderBook());

      renderHook(() => useOrderBook('1', { ...defaultOptions, levels: 8 }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mocks.getOrderBook).toHaveBeenCalledWith(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        '0xQuote00000000000000000000000000000001',
        16, // levels * 2
      );
    });

    it('handles empty bids / asks gracefully', async () => {
      mocks.getOrderBook.mockResolvedValue({ bids: [], asks: [] });

      const { result } = renderHook(() => useOrderBook('1', defaultOptions));

      await act(async () => {
        await Promise.resolve();
      });

      const ob = result.current.orderBook;
      expect(ob?.bids).toEqual([]);
      expect(ob?.asks).toEqual([]);
      // midPrice falls back to basePrice default (100)
      expect(ob?.midPrice).toBe(100);
      expect(ob?.spread).toBe(0);
    });

    it('computes depthPercent correctly for bid levels', async () => {
      mocks.getOrderBook.mockResolvedValue(
        makeOrderBook({
          bids: [rawLevel(1.0, 10), rawLevel(0.9, 10)],
          asks: [rawLevel(1.1, 5)],
        }),
      );

      const { result } = renderHook(() => useOrderBook('1', defaultOptions));

      await act(async () => {
        await Promise.resolve();
      });

      const bids = result.current.orderBook?.bids ?? [];
      expect(bids.length).toBeGreaterThan(0);
      // Last level should always be 100%
      expect(bids[bids.length - 1].depthPercent).toBeCloseTo(100, 1);
    });

    it('sets isLoading false and error on fetch failure', async () => {
      mocks.getOrderBook.mockRejectedValue(new Error('fetch failed'));

      const { result } = renderHook(() => useOrderBook('1', defaultOptions));

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch order book data');
      expect(result.current.orderBook).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // refresh()
  // ---------------------------------------------------------------------------

  describe('refresh', () => {
    it('re-fetches data when refresh is called', async () => {
      mocks.getOrderBook.mockResolvedValue(makeOrderBook());

      const { result } = renderHook(() =>
        useOrderBook('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const callsBefore = mocks.getOrderBook.mock.calls.length;

      act(() => {
        result.current.refresh();
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mocks.getOrderBook.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it('sets isLoading to true when refresh is called', () => {
      mocks.getOrderBook.mockReturnValue(new Promise(() => {})); // never resolves

      const { result } = renderHook(() =>
        useOrderBook('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      act(() => {
        result.current.refresh();
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Polling
  // ---------------------------------------------------------------------------

  describe('polling', () => {
    it('polls at the configured interval when visible', async () => {
      mocks.getOrderBook.mockResolvedValue(makeOrderBook());

      renderHook(() =>
        useOrderBook('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          updateInterval: 3000,
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const callsAfterMount = mocks.getOrderBook.mock.calls.length;

      await act(async () => {
        vi.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      expect(mocks.getOrderBook.mock.calls.length).toBeGreaterThan(
        callsAfterMount,
      );
    });

    it('does not poll when document is hidden', async () => {
      mocks.getOrderBook.mockResolvedValue(makeOrderBook());

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });

      renderHook(() =>
        useOrderBook('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          updateInterval: 3000,
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const callsAfterMount = mocks.getOrderBook.mock.calls.length;

      await act(async () => {
        vi.advanceTimersByTime(9000); // 3 intervals
        await Promise.resolve();
      });

      // Should not have polled since page is hidden
      expect(mocks.getOrderBook.mock.calls.length).toBe(callsAfterMount);
    });
  });

  // ---------------------------------------------------------------------------
  // Level aggregation & sorting
  // ---------------------------------------------------------------------------

  describe('order level processing', () => {
    it('aggregates duplicate price levels', async () => {
      mocks.getOrderBook.mockResolvedValue({
        bids: [rawLevel(1.0, 5), rawLevel(1.0, 3)], // same price
        asks: [rawLevel(1.1, 4)],
      });

      const { result } = renderHook(() =>
        useOrderBook('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      // Two bids at 1.0 should be merged
      const bids = result.current.orderBook?.bids ?? [];
      expect(bids).toHaveLength(1);
      expect(bids[0].quantity).toBeCloseTo(8, 5);
    });

    it('bids are sorted descending by price', async () => {
      mocks.getOrderBook.mockResolvedValue({
        bids: [rawLevel(0.8, 1), rawLevel(1.0, 2), rawLevel(0.9, 3)],
        asks: [],
      });

      const { result } = renderHook(() =>
        useOrderBook('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const prices = result.current.orderBook?.bids.map((b) => b.price) ?? [];
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    });

    it('asks are sorted ascending by price', async () => {
      mocks.getOrderBook.mockResolvedValue({
        bids: [],
        asks: [rawLevel(1.3, 1), rawLevel(1.1, 2), rawLevel(1.2, 3)],
      });

      const { result } = renderHook(() =>
        useOrderBook('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const prices = result.current.orderBook?.asks.map((a) => a.price) ?? [];
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });
  });
});

// =============================================================================
// useOrderBookStats
// =============================================================================

describe('useOrderBookStats', () => {
  it('returns zeroed stats when orderBook is null', () => {
    const { result } = renderHook(() => useOrderBookStats(null));

    expect(result.current).toEqual({
      totalBidVolume: 0,
      totalAskVolume: 0,
      bidAskRatio: 0,
      averageBidPrice: 0,
      averageAskPrice: 0,
    });
  });

  it('computes stats from a populated order book', () => {
    const orderBook = {
      bids: [
        { price: 1.0, quantity: 10, total: 10, depthPercent: 50 },
        { price: 0.9, quantity: 10, total: 20, depthPercent: 100 },
      ],
      asks: [{ price: 1.1, quantity: 5, total: 5, depthPercent: 100 }],
      spread: 0.1,
      spreadPercent: 9.52,
      midPrice: 1.05,
      lastUpdate: Date.now(),
    };

    const { result } = renderHook(() => useOrderBookStats(orderBook));

    expect(result.current.totalBidVolume).toBeCloseTo(20, 5);
    expect(result.current.totalAskVolume).toBeCloseTo(5, 5);
    expect(result.current.bidAskRatio).toBeCloseTo(4, 5); // 20 / 5
    expect(result.current.averageBidPrice).toBeCloseTo(0.95, 5); // (1*10 + 0.9*10) / 20
    expect(result.current.averageAskPrice).toBeCloseTo(1.1, 5);
  });

  it('handles zero ask volume (bidAskRatio = 0)', () => {
    const orderBook = {
      bids: [{ price: 1.0, quantity: 5, total: 5, depthPercent: 100 }],
      asks: [],
      spread: 0,
      spreadPercent: 0,
      midPrice: 1.0,
      lastUpdate: Date.now(),
    };

    const { result } = renderHook(() => useOrderBookStats(orderBook));

    expect(result.current.bidAskRatio).toBe(0);
    expect(result.current.totalAskVolume).toBe(0);
  });

  it('recomputes when orderBook changes', () => {
    const initialBook = {
      bids: [{ price: 1.0, quantity: 10, total: 10, depthPercent: 100 }],
      asks: [],
      spread: 0,
      spreadPercent: 0,
      midPrice: 1.0,
      lastUpdate: Date.now(),
    };

    const { result, rerender } = renderHook(
      ({ book }) => useOrderBookStats(book),
      { initialProps: { book: initialBook } },
    );

    expect(result.current.totalBidVolume).toBeCloseTo(10, 5);

    const updatedBook = {
      ...initialBook,
      bids: [{ price: 1.0, quantity: 20, total: 20, depthPercent: 100 }],
    };

    rerender({ book: updatedBook });

    expect(result.current.totalBidVolume).toBeCloseTo(20, 5);
  });
});
