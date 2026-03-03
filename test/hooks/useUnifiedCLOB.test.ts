// @ts-nocheck - Test file with type issues
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUnifiedCLOB } from '@/hooks/useUnifiedCLOB';

// Mock document.visibilityState
Object.defineProperty(document, 'visibilityState', {
  writable: true,
  value: 'visible',
});

Object.defineProperty(document, 'hidden', {
  writable: true,
  value: false,
});

// =============================================================================
// TEST CONSTANTS
// =============================================================================

const BASE_TOKEN = '0x742d35cc6634c0532925a3b844bc9e7595f0ab12';
const BASE_TOKEN_ID = '1';
const QUOTE_TOKEN = '0xa100000000000000000000000000000000000001';

// =============================================================================
// MOCK DATA
// =============================================================================

const mockOrderBook = (overrides = {}) => ({
  marketId: '0x1234',
  bestBid: '1000000000000000000',
  bestAsk: '1050000000000000000',
  spread: '50000000000000000',
  spreadPercent: 5,
  midPrice: '1025000000000000000',
  timestamp: Date.now(),
  bids: [
    { price: '1000000000000000000', quantity: '1000000000000000000' },
    { price: '990000000000000000', quantity: '200000000000000000' },
    { price: '980000000000000000', quantity: '300000000000000000' },
  ],
  asks: [
    { price: '1050000000000000000', quantity: '1000000000000000000' },
    { price: '1060000000000000000', quantity: '200000000000000000' },
    { price: '1070000000000000000', quantity: '300000000000000000' },
  ],
  ...overrides,
});

// =============================================================================
// MOCKS
// =============================================================================

vi.mock('@/infrastructure/repositories/clob-v2-repository', () => ({
  clobV2Repository: {
    getOrderBook: vi.fn(),
  },
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0xa100000000000000000000000000000000000001',
}));

import { clobV2Repository } from '@/infrastructure/repositories/clob-v2-repository';

describe('useUnifiedCLOB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should set empty state when assetId is empty', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockOrderBook());

      const { result } = renderHook(() =>
        useUnifiedCLOB('', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      // Allow effect to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.priceData).toBeNull();
      expect(result.current.orderBook).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(clobV2Repository.getOrderBook).not.toHaveBeenCalled();
    });

    it('should set empty state when assetId is "0"', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockOrderBook());

      const { result } = renderHook(() =>
        useUnifiedCLOB('0', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.priceData).toBeNull();
      expect(result.current.orderBook).toBeNull();
      expect(clobV2Repository.getOrderBook).not.toHaveBeenCalled();
    });

    it('should set empty state when baseToken is missing', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockOrderBook());

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.priceData).toBeNull();
      expect(result.current.orderBook).toBeNull();
      expect(clobV2Repository.getOrderBook).not.toHaveBeenCalled();
    });
  });

  describe('data fetching', () => {
    it('should fetch and process order book data successfully', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockOrderBook());

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(clobV2Repository.getOrderBook).toHaveBeenCalledWith(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
        20, // levels * 2 (default 10 * 2)
      );

      expect(result.current.priceData).not.toBeNull();
      expect(result.current.priceData?.price).toBeCloseTo(1.025, 2);
      expect(result.current.priceData?.bestBid).toBeCloseTo(1.0, 2);
      expect(result.current.priceData?.bestAsk).toBeCloseTo(1.05, 2);
      expect(result.current.priceData?.spread).toBeCloseTo(0.05, 2);
      expect(result.current.priceData?.spreadPercent).toBeCloseTo(4.878, 1);

      expect(result.current.orderBook).not.toBeNull();
      expect(result.current.orderBook?.bids.length).toBeGreaterThan(0);
      expect(result.current.orderBook?.asks.length).toBeGreaterThan(0);

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle empty order book gracefully', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        marketId: '0x1234',
        bestBid: null,
        bestAsk: null,
        bids: [],
        asks: [],
        timestamp: Date.now(),
      });

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          basePrice: 100,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should use basePrice when order book is empty
      expect(result.current.priceData?.price).toBe(100);
      expect(result.current.priceData?.bestBid).toBe(0);
      expect(result.current.priceData?.bestAsk).toBe(0);
      expect(result.current.orderBook?.bids).toEqual([]);
      expect(result.current.orderBook?.asks).toEqual([]);
    });

    it('should handle error gracefully', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error('RPC Error: Unable to fetch order book'));

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe(
        'RPC Error: Unable to fetch order book',
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.priceData).toBeNull();
      expect(result.current.orderBook).toBeNull();
    });

    it('should handle non-Error thrown', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockRejectedValue('Something went wrong');

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe('Failed to fetch CLOB data');
    });
  });

  describe('options', () => {
    it('should respect custom levels option', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockOrderBook());

      renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          levels: 5,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(clobV2Repository.getOrderBook).toHaveBeenCalledWith(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
        10, // 5 * 2
      );
    });

    it('should respect custom basePrice option', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        marketId: '0x1234',
        bestBid: null,
        bestAsk: null,
        bids: [],
        asks: [],
        timestamp: Date.now(),
      });

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          basePrice: 150.5,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.priceData?.price).toBe(150.5);
    });
  });

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockOrderBook());

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('order book processing', () => {
    it('should aggregate bids by price', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        marketId: '0x1234',
        bestBid: '1000000000000000000',
        bestAsk: '1050000000000000000',
        bids: [
          { price: '1000000000000000000', quantity: '1000000000000000000' },
          { price: '1000000000000000000', quantity: '500000000000000000' }, // Same price
          { price: '990000000000000000', quantity: '200000000000000000' },
        ],
        asks: [
          { price: '1050000000000000000', quantity: '1000000000000000000' },
        ],
        timestamp: Date.now(),
      });

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          levels: 10,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // First bid should have aggregated quantity (1 + 0.5 = 1.5 ETH)
      expect(result.current.orderBook?.bids[0].quantity).toBeCloseTo(1.5, 1);
      expect(result.current.orderBook?.bids[0].price).toBeCloseTo(1.0, 2);
    });

    it('should calculate depthPercent correctly', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        marketId: '0x1234',
        bestBid: '1000000000000000000',
        bestAsk: '1050000000000000000',
        bids: [
          { price: '1000000000000000000', quantity: '1000000000000000000' },
          { price: '990000000000000000', quantity: '1000000000000000000' },
        ],
        asks: [
          { price: '1050000000000000000', quantity: '1000000000000000000' },
        ],
        timestamp: Date.now(),
      });

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          levels: 10,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // First bid has cumulative 1, second has 2
      // First should be 50%, second 100%
      expect(result.current.orderBook?.bids[0].depthPercent).toBeCloseTo(50, 0);
      expect(result.current.orderBook?.bids[1].depthPercent).toBeCloseTo(
        100,
        0,
      );
    });

    it('should limit order book levels', async () => {
      const manyBids = Array.from({ length: 20 }, (_, i) => ({
        price: `${(1000 - i * 10) * 1e18}`,
        quantity: '1000000000000000000',
      }));

      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        marketId: '0x1234',
        bestBid: '1000000000000000000',
        bestAsk: '1050000000000000000',
        bids: manyBids,
        asks: [],
        timestamp: Date.now(),
      });

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          levels: 5, // Request only 5 levels
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should only have 5 levels despite 20 in response
      expect(result.current.orderBook?.bids.length).toBe(5);
    });

    it('should sort bids descending', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        marketId: '0x1234',
        bestBid: '1000000000000000000',
        bestAsk: '1050000000000000000',
        bids: [
          { price: '980000000000000000', quantity: '1000000000000000000' },
          { price: '1000000000000000000', quantity: '1000000000000000000' },
          { price: '990000000000000000', quantity: '1000000000000000000' },
        ],
        asks: [],
        timestamp: Date.now(),
      });

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Bids should be sorted high to low
      expect(result.current.orderBook?.bids[0].price).toBeCloseTo(1.0, 2);
      expect(result.current.orderBook?.bids[1].price).toBeCloseTo(0.99, 2);
      expect(result.current.orderBook?.bids[2].price).toBeCloseTo(0.98, 2);
    });

    it('should sort asks ascending', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        marketId: '0x1234',
        bestBid: '1000000000000000000',
        bestAsk: '1050000000000000000',
        bids: [],
        asks: [
          { price: '1070000000000000000', quantity: '1000000000000000000' },
          { price: '1050000000000000000', quantity: '1000000000000000000' },
          { price: '1060000000000000000', quantity: '1000000000000000000' },
        ],
        timestamp: Date.now(),
      });

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Asks should be sorted low to high
      expect(result.current.orderBook?.asks[0].price).toBeCloseTo(1.05, 2);
      expect(result.current.orderBook?.asks[1].price).toBeCloseTo(1.06, 2);
      expect(result.current.orderBook?.asks[2].price).toBeCloseTo(1.07, 2);
    });

    it('should filter out zero quantity entries', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        marketId: '0x1234',
        bestBid: '1000000000000000000',
        bestAsk: '1050000000000000000',
        bids: [
          { price: '1000000000000000000', quantity: '0' },
          { price: '990000000000000000', quantity: '1000000000000000000' },
          { price: '980000000000000000', quantity: '0' },
        ],
        asks: [],
        timestamp: Date.now(),
      });

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Zero quantity entries should be filtered out
      expect(result.current.orderBook?.bids.length).toBe(1);
      expect(result.current.orderBook?.bids[0].price).toBeCloseTo(0.99, 2);
    });
  });

  describe('price data calculation', () => {
    it('should calculate correct spread', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue(
        mockOrderBook({
          bestBid: '1000000000000000000',
          bestAsk: '1100000000000000000',
        }),
      );

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Spread should be 0.1 (1.1 - 1.0)
      expect(result.current.priceData?.spread).toBeCloseTo(0.1, 2);
      // Spread percent should be 9.52% (0.1 / 1.05 * 100)
      expect(result.current.priceData?.spreadPercent).toBeCloseTo(9.52, 1);
    });

    it('should use bestBid when only bid exists', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        marketId: '0x1234',
        bestBid: '1000000000000000000',
        bestAsk: null,
        bids: [
          { price: '1000000000000000000', quantity: '1000000000000000000' },
        ],
        asks: [],
        timestamp: Date.now(),
      });

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          basePrice: 100,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.priceData?.price).toBeCloseTo(1.0, 2);
      expect(result.current.priceData?.bestAsk).toBe(0);
    });

    it('should use bestAsk when only ask exists', async () => {
      (
        clobV2Repository.getOrderBook as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        marketId: '0x1234',
        bestBid: null,
        bestAsk: '1050000000000000000',
        bids: [],
        asks: [
          { price: '1050000000000000000', quantity: '1000000000000000000' },
        ],
        timestamp: Date.now(),
      });

      const { result } = renderHook(() =>
        useUnifiedCLOB('1', {
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          basePrice: 100,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.priceData?.price).toBeCloseTo(1.05, 2);
      expect(result.current.priceData?.bestBid).toBe(0);
    });
  });
});
