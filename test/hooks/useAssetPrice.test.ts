// @ts-nocheck - Test file with type issues
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useAssetPrice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrderBook.mockResolvedValue(mockOrderBook());
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

      // Wait for loading to be false
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Give time for the async operation to complete
      await act(async () => {
        await new Promise((r) => setTimeout(r, 200));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.priceData).toEqual({
        price: 1.05,
        bestBid: 1.0,
        bestAsk: 1.1,
        spread: 0.1,
        spreadPercent: 9.523809523809524,
        lastUpdate: expect.any(Number),
      });
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
        await new Promise((r) => setTimeout(r, 200));
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
        await new Promise((r) => setTimeout(r, 200));
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
        await new Promise((r) => setTimeout(r, 200));
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
        await new Promise((r) => setTimeout(r, 200));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error');
      expect(result.current.priceData).toBe(null);
    });

    it('should handle non-Error exceptions', async () => {
      mocks.getOrderBook.mockRejectedValue('String error');

      const { result } = renderHook(() => useAssetPrice('1'));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 200));
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
        await new Promise((r) => setTimeout(r, 100));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.priceData).toBe(null);
      expect(mocks.getOrderBook).not.toHaveBeenCalled();
    });

    it('should handle tokenId "0"', async () => {
      const { result } = renderHook(() => useAssetPrice('0'));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.priceData).toBe(null);
      expect(mocks.getOrderBook).not.toHaveBeenCalled();
    });

    it('should handle null tokenId', async () => {
      const { result } = renderHook(() => useAssetPrice(null as any));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
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
        await new Promise((r) => setTimeout(r, 200));
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
        await new Promise((r) => setTimeout(r, 200));
      });

      expect(mocks.getOrderBook).toHaveBeenCalledWith(
        '0xCustomBaseToken',
        '1',
        '0xa100000000000000000000000000000000000001',
        5,
      );
    });
  });
});

describe('useAssetPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrderBook.mockResolvedValue(mockOrderBook());
  });

  describe('initialization', () => {
    it('should set isLoading to true initially', () => {
      const { result } = renderHook(() => useAssetPrices(['1', '2']));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.prices.size).toBe(0);
      expect(result.current.error).toBe(null);
    });
  });

  describe('successful multi-token fetch', () => {
    it('should fetch prices for all tokenIds', async () => {
      const { result } = renderHook(() => useAssetPrices(['1', '2', '3']));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 500));
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
      const { result } = renderHook(() => useAssetPrices([]));

      // Should set isLoading false immediately for empty array
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });

      expect(result.current.prices.size).toBe(0);
      expect(mocks.getOrderBook).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle API errors', async () => {
      mocks.getOrderBook.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAssetPrices(['1']));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 200));
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.prices.size).toBe(0);
    });

    it('should handle partial failures with Promise.allSettled', async () => {
      mocks.getOrderBook
        .mockResolvedValueOnce(mockOrderBook())
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(mockOrderBook());

      const { result } = renderHook(() => useAssetPrices(['1', '2', '3']));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 500));
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
      const { result } = renderHook(() => useAssetPrices(['1']));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 200));
      });

      const initialCallCount = mocks.getOrderBook.mock.calls.length;

      await act(async () => {
        await result.current.refetch();
      });

      expect(mocks.getOrderBook.mock.calls.length).toBe(initialCallCount + 1);
    });
  });
});
