// @ts-nocheck - Test file with type issues
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useCLOBV2,
  useOrderBookDepth,
  useUserCLOBOrders,
  useMarketTrades,
  calculateMarketId,
} from '@/hooks/useCLOBV2';
import {
  CLOBOrderStatus,
  TimeInForce,
  CLOBOrderType,
  CircuitBreakerStatus,
} from '@/domain/clob/clob';

// =============================================================================
// TEST CONSTANTS
// =============================================================================

const BASE_TOKEN = '0x742d35cc6634c0532925a3b844bc9e7595f0ab12';
const BASE_TOKEN_ID = '1';
const QUOTE_TOKEN = '0xa100000000000000000000000000000000000001';
const USER_ADDRESS = '0x742d35cc6634c0532925a3b844bc9e7595f0ab14';
const TAKER_ADDRESS = '0x742d35cc6634c0532925a3b844bc9e7595f0ab15';
const MAKER_ADDRESS = '0x742d35cc6634c0532925a3b844bc9e7595f0ab16';
const ORDER_ID_1 =
  '0x6f7264657231000000000000000000000000000000000000000000000000000000';
const ORDER_ID_2 =
  '0x6f7264657232000000000000000000000000000000000000000000000000000000';
const NEW_ORDER_ID =
  '0x6e65776f7264657200000000000000000000000000000000000000000000000000';

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
    {
      price: '1000000000000000000',
      quantity: '1000000000000000000',
      orderCount: 5,
      cumulativeQuantity: '1000000000000000000',
      depthPercent: 50,
    },
  ],
  asks: [
    {
      price: '1050000000000000000',
      quantity: '1000000000000000000',
      orderCount: 5,
      cumulativeQuantity: '1000000000000000000',
      depthPercent: 50,
    },
  ],
  ...overrides,
});

const mockTrade = (overrides = {}) => ({
  id: '0xtrade1',
  orderId: ORDER_ID_1,
  baseToken: BASE_TOKEN,
  baseTokenId: BASE_TOKEN_ID,
  quoteToken: QUOTE_TOKEN,
  price: '1000000000000000000',
  amount: '1000000000000000000',
  takerIsBuy: true,
  taker: TAKER_ADDRESS,
  maker: MAKER_ADDRESS,
  timestamp: Date.now(),
  transactionHash: '0xtxhash',
  ...overrides,
});

const mockOrder = (overrides = {}) => ({
  id: ORDER_ID_1,
  maker: MAKER_ADDRESS,
  baseToken: BASE_TOKEN,
  baseTokenId: BASE_TOKEN_ID,
  quoteToken: QUOTE_TOKEN,
  price: '1000000000000000000',
  amount: '1000000000000000000',
  filledAmount: '0',
  remainingAmount: '1000000000000000000',
  isBuy: true,
  orderType: CLOBOrderType.LIMIT,
  status: CLOBOrderStatus.OPEN,
  timeInForce: TimeInForce.GTC,
  expiry: 0,
  createdAt: Date.now() - 60000,
  updatedAt: Date.now(),
  ...overrides,
});

const mockMarketStats = (overrides = {}) => ({
  marketId: '0x1234',
  lastPrice: '1000000000000000000',
  lastPriceChange24h: 5.5,
  volume24h: '100000000000000000000',
  tradeCount24h: 100,
  openInterest: '500000000000000000000',
  ...overrides,
});

const mockCircuitBreaker = (overrides = {}) => ({
  marketId: '0x1234',
  status: CircuitBreakerStatus.ACTIVE,
  triggerPrice: '1500000000000000000',
  cooldownEndTime: 0,
  ...overrides,
});

// =============================================================================
// HOISTED MOCKS
// =============================================================================

const mocks = vi.hoisted(() => ({
  // Repository mocks
  getOrderBook: vi.fn(),
  getUserActiveOrders: vi.fn(),
  getUserOrders: vi.fn(),
  getTrades: vi.fn(),
  getMarketStats: vi.fn(),
  getCircuitBreaker: vi.fn(),

  // Service mocks
  placeLimitOrder: vi.fn(),
  placeMarketOrder: vi.fn(),
  cancelOrder: vi.fn(),

  // Constants
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xd1a0000000000000000000000000000000000001',
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0xa100000000000000000000000000000000000001',
}));

// =============================================================================
// MODULE MOCKS
// =============================================================================

vi.mock('@/infrastructure/repositories/clob-v2-repository', () => ({
  clobV2Repository: {
    getOrderBook: mocks.getOrderBook,
    getUserActiveOrders: mocks.getUserActiveOrders,
    getUserOrders: mocks.getUserOrders,
    getTrades: mocks.getTrades,
    getMarketStats: mocks.getMarketStats,
    getCircuitBreaker: mocks.getCircuitBreaker,
  },
}));

vi.mock('@/infrastructure/services/clob-v2-service', () => ({
  clobV2Service: {
    placeLimitOrder: mocks.placeLimitOrder,
    placeMarketOrder: mocks.placeMarketOrder,
    cancelOrder: mocks.cancelOrder,
  },
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_DIAMOND_ADDRESS: mocks.NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: mocks.NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
}));

// Mock document.visibilityState
const mockVisibilityState = vi.hoisted(() => ({
  state: 'visible',
  setState: vi.fn(),
}));

Object.defineProperty(document, 'visibilityState', {
  get: () => mockVisibilityState.state,
  set: (val) => mockVisibilityState.setState(val),
});

Object.defineProperty(document, 'hidden', {
  get: () => mockVisibilityState.state !== 'visible',
});

// =============================================================================
// TESTS
// =============================================================================

describe('calculateMarketId', () => {
  it('should calculate consistent market ID for same inputs', () => {
    const marketId1 = calculateMarketId(BASE_TOKEN, BASE_TOKEN_ID, QUOTE_TOKEN);
    const marketId2 = calculateMarketId(BASE_TOKEN, BASE_TOKEN_ID, QUOTE_TOKEN);
    expect(marketId1).toBe(marketId2);
    expect(marketId1).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it('should calculate different market ID for different base tokens', () => {
    const marketId1 = calculateMarketId(
      '0x742d35cc6634c0532925a3b844bc9e7595f0ab11',
      BASE_TOKEN_ID,
      QUOTE_TOKEN,
    );
    const marketId2 = calculateMarketId(
      '0x742d35cc6634c0532925a3b844bc9e7595f0ab12',
      BASE_TOKEN_ID,
      QUOTE_TOKEN,
    );
    expect(marketId1).not.toBe(marketId2);
  });

  it('should calculate different market ID for different token IDs', () => {
    const marketId1 = calculateMarketId(BASE_TOKEN, '1', QUOTE_TOKEN);
    const marketId2 = calculateMarketId(BASE_TOKEN, '2', QUOTE_TOKEN);
    expect(marketId1).not.toBe(marketId2);
  });

  it('should calculate different market ID for different quote tokens', () => {
    const marketId1 = calculateMarketId(
      BASE_TOKEN,
      BASE_TOKEN_ID,
      '0xa100000000000000000000000000000000000001',
    );
    const marketId2 = calculateMarketId(
      BASE_TOKEN,
      BASE_TOKEN_ID,
      '0xa100000000000000000000000000000000000002',
    );
    expect(marketId1).not.toBe(marketId2);
  });
});

describe('useCLOBV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockVisibilityState.state = 'visible';

    // Default mock implementations
    mocks.getOrderBook.mockResolvedValue(mockOrderBook());
    mocks.getTrades.mockResolvedValue([mockTrade()]);
    mocks.getMarketStats.mockResolvedValue(mockMarketStats());
    mocks.getCircuitBreaker.mockResolvedValue(mockCircuitBreaker());
    mocks.placeLimitOrder.mockResolvedValue({
      success: true,
      orderId: NEW_ORDER_ID,
    });
    mocks.placeMarketOrder.mockResolvedValue({
      success: true,
      orderId: NEW_ORDER_ID,
    });
    mocks.cancelOrder.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should set isLoading to true initially', () => {
      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
          levels: 10,
        }),
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('should have null initial state for data', () => {
      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      expect(result.current.orderBook).toBe(null);
      expect(result.current.userOrders).toEqual([]);
      expect(result.current.trades).toEqual([]);
      expect(result.current.marketStats).toBe(null);
      expect(result.current.circuitBreaker).toBe(null);
    });

    it('should compute marketId from tokens', () => {
      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      expect(result.current.marketId).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });

  describe('data fetching', () => {
    it('should fetch order book on mount', async () => {
      renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mocks.getOrderBook).toHaveBeenCalledWith(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
        10,
      );
    });

    it('should fetch trades on mount', async () => {
      renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mocks.getTrades).toHaveBeenCalledWith(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        50,
      );
    });

    it('should fetch market stats on mount', async () => {
      renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mocks.getMarketStats).toHaveBeenCalled();
    });

    it('should fetch circuit breaker on mount', async () => {
      renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mocks.getCircuitBreaker).toHaveBeenCalled();
    });

    it('should set isLoading to false after data fetch completes', async () => {
      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should populate orderBook with display data', async () => {
      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.orderBook).not.toBeNull();
      expect(result.current.orderBook?.hasData).toBe(true);
      expect(result.current.orderBook?.totalBidVolume).toBeDefined();
      expect(result.current.orderBook?.totalAskVolume).toBeDefined();
    });

    it('should populate trades with enhanced display data', async () => {
      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.trades.length).toBeGreaterThan(0);
      expect(result.current.trades[0]).toHaveProperty('displayPrice');
      expect(result.current.trades[0]).toHaveProperty('displayAmount');
      expect(result.current.trades[0]).toHaveProperty('directionColor');
    });

    it('should handle fetch errors gracefully', async () => {
      mocks.getOrderBook.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Should fallback to mock data on error
      expect(result.current.orderBook).not.toBeNull();
      expect(result.current.orderBook?.hasData).toBe(true);
    });
  });

  describe('order actions', () => {
    it('should place limit order successfully', async () => {
      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      let orderResult: any;
      await act(async () => {
        orderResult = await result.current.placeLimitOrder(
          1000000000000000000n,
          1000000000000000000n,
          true,
          TimeInForce.GTC,
        );
      });

      expect(mocks.placeLimitOrder).toHaveBeenCalledWith({
        baseToken: BASE_TOKEN,
        baseTokenId: BASE_TOKEN_ID,
        quoteToken: QUOTE_TOKEN,
        price: 1000000000000000000n,
        amount: 1000000000000000000n,
        isBuy: true,
        timeInForce: TimeInForce.GTC,
        expiry: undefined,
      });
      expect(orderResult.success).toBe(true);
    });

    it('should handle limit order failure', async () => {
      mocks.placeLimitOrder.mockResolvedValue({
        success: false,
        error: 'Insufficient balance',
      });

      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      let orderResult: any;
      await act(async () => {
        orderResult = await result.current.placeLimitOrder(
          1000000000000000000n,
          1000000000000000000n,
          true,
        );
      });

      expect(orderResult.success).toBe(false);
      expect(orderResult.error).toBe('Insufficient balance');
    });

    it('should place market order successfully', async () => {
      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      let orderResult: any;
      await act(async () => {
        orderResult = await result.current.placeMarketOrder(
          1000000000000000000n,
          true,
          100,
        );
      });

      expect(mocks.placeMarketOrder).toHaveBeenCalledWith({
        baseToken: BASE_TOKEN,
        baseTokenId: BASE_TOKEN_ID,
        quoteToken: QUOTE_TOKEN,
        amount: 1000000000000000000n,
        isBuy: true,
        maxSlippageBps: 100,
      });
      expect(orderResult.success).toBe(true);
    });

    it('should cancel order successfully', async () => {
      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      let cancelResult: any;
      await act(async () => {
        cancelResult = await result.current.cancelOrder(ORDER_ID_1);
      });

      expect(mocks.cancelOrder).toHaveBeenCalledWith(ORDER_ID_1);
      expect(cancelResult.success).toBe(true);
    });

    it('should cancel multiple orders', async () => {
      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      let cancelResults: any[];
      await act(async () => {
        cancelResults = await result.current.cancelOrders([
          ORDER_ID_1,
          ORDER_ID_2,
        ]);
      });

      expect(mocks.cancelOrder).toHaveBeenCalledTimes(2);
      expect(cancelResults.length).toBe(2);
      expect(cancelResults.every((r) => r.success)).toBe(true);
    });
  });

  describe('refresh', () => {
    it('should refresh all data on refresh call', async () => {
      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Clear mock call counts
      mocks.getOrderBook.mockClear();
      mocks.getTrades.mockClear();
      mocks.getMarketStats.mockClear();
      mocks.getCircuitBreaker.mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mocks.getOrderBook).toHaveBeenCalled();
      expect(mocks.getTrades).toHaveBeenCalled();
      expect(mocks.getMarketStats).toHaveBeenCalled();
      expect(mocks.getCircuitBreaker).toHaveBeenCalled();
    });
  });

  describe('circuit breaker', () => {
    it('should detect when circuit breaker is tripped', async () => {
      mocks.getCircuitBreaker.mockResolvedValue(
        mockCircuitBreaker({ status: CircuitBreakerStatus.TRIPPED }),
      );

      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.isCircuitBreakerTripped).toBe(true);
      expect(result.current.canTrade).toBe(false);
    });

    it('should allow trading when circuit breaker is active', async () => {
      mocks.getCircuitBreaker.mockResolvedValue(
        mockCircuitBreaker({ status: CircuitBreakerStatus.ACTIVE }),
      );

      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.isCircuitBreakerTripped).toBe(false);
      expect(result.current.canTrade).toBe(true);
    });
  });

  describe('fetchUserOrders', () => {
    it('should fetch user orders with address', async () => {
      mocks.getUserActiveOrders.mockResolvedValue([mockOrder()]);

      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      mocks.getUserActiveOrders.mockResolvedValue([mockOrder()]);

      await act(async () => {
        await result.current.fetchUserOrders(USER_ADDRESS);
      });

      expect(mocks.getUserActiveOrders).toHaveBeenCalledWith(USER_ADDRESS);
      expect(result.current.userOrders.length).toBe(1);
    });

    it('should handle user orders with enhanced display properties', async () => {
      mocks.getUserActiveOrders.mockResolvedValue([
        mockOrder({ status: CLOBOrderStatus.OPEN }),
        mockOrder({
          id: ORDER_ID_2,
          status: CLOBOrderStatus.PARTIAL,
          filledAmount: '500000000000000000',
        }),
        mockOrder({
          id: '0x6f7264657233000000000000000000000000000000000000000000000000000000',
          status: CLOBOrderStatus.FILLED,
        }),
      ]);

      const { result } = renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      await act(async () => {
        await result.current.fetchUserOrders(USER_ADDRESS);
      });

      // Check enhanced properties
      const openOrder = result.current.userOrders.find(
        (o) => o.status === CLOBOrderStatus.OPEN,
      );
      expect(openOrder?.canCancel).toBe(true);
      expect(openOrder?.statusColor).toBe('text-blue-500');
      expect(openOrder?.statusLabel).toBe('Open');

      const partialOrder = result.current.userOrders.find(
        (o) => o.status === CLOBOrderStatus.PARTIAL,
      );
      expect(partialOrder?.canCancel).toBe(true);
      expect(partialOrder?.fillPercent).toBe(50);
    });
  });

  describe('auto-refresh', () => {
    it('should auto-refresh when enabled', async () => {
      renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
          autoRefresh: true,
          refreshInterval: 5000,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      mocks.getOrderBook.mockClear();
      mocks.getTrades.mockClear();

      // Advance past refresh interval
      await act(async () => {
        vi.advanceTimersByTime(6000);
      });

      expect(mocks.getOrderBook).toHaveBeenCalled();
      expect(mocks.getTrades).toHaveBeenCalled();
    });

    it('should not auto-refresh when disabled', async () => {
      renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
          autoRefresh: false,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      mocks.getOrderBook.mockClear();
      mocks.getTrades.mockClear();

      await act(async () => {
        vi.advanceTimersByTime(6000);
      });

      expect(mocks.getOrderBook).not.toHaveBeenCalled();
      expect(mocks.getTrades).not.toHaveBeenCalled();
    });

    it('should respect visibility change for auto-refresh', async () => {
      renderHook(() =>
        useCLOBV2({
          baseToken: BASE_TOKEN,
          baseTokenId: BASE_TOKEN_ID,
          quoteToken: QUOTE_TOKEN,
          autoRefresh: true,
          refreshInterval: 5000,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      mocks.getOrderBook.mockClear();

      // Page becomes hidden
      mockVisibilityState.state = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));

      await act(async () => {
        vi.advanceTimersByTime(6000);
      });

      // Should NOT fetch when hidden
      expect(mocks.getOrderBook).not.toHaveBeenCalled();

      // Page becomes visible
      mockVisibilityState.state = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Should fetch immediately on visibility change
      expect(mocks.getOrderBook).toHaveBeenCalled();
    });
  });
});

describe('useOrderBookDepth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockVisibilityState.state = 'visible';

    mocks.getOrderBook.mockResolvedValue(mockOrderBook());
    mocks.getTrades.mockResolvedValue([mockTrade()]);
    mocks.getMarketStats.mockResolvedValue(mockMarketStats());
    mocks.getCircuitBreaker.mockResolvedValue(mockCircuitBreaker());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return depth data from order book', async () => {
    const { result } = renderHook(() =>
      useOrderBookDepth({
        baseToken: BASE_TOKEN,
        baseTokenId: BASE_TOKEN_ID,
        quoteToken: QUOTE_TOKEN,
        levels: 10,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.bids.length).toBeGreaterThan(0);
    expect(result.current.asks.length).toBeGreaterThan(0);
    expect(result.current.spread).toBeDefined();
    expect(result.current.midPrice).toBeDefined();
    expect(result.current.imbalance).toBeDefined();
  });

  it('should calculate max depth', async () => {
    const { result } = renderHook(() =>
      useOrderBookDepth({
        baseToken: BASE_TOKEN,
        baseTokenId: BASE_TOKEN_ID,
        quoteToken: QUOTE_TOKEN,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.maxDepth).toBeGreaterThan(0);
  });

  it('should forward isLoading and refresh', async () => {
    const { result } = renderHook(() =>
      useOrderBookDepth({
        baseToken: BASE_TOKEN,
        baseTokenId: BASE_TOKEN_ID,
        quoteToken: QUOTE_TOKEN,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.refresh).toBe('function');
  });
});

describe('useUserCLOBOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mocks.getUserOrders.mockResolvedValue([
      mockOrder({ status: CLOBOrderStatus.OPEN }),
      mockOrder({
        id: ORDER_ID_2,
        status: CLOBOrderStatus.PARTIAL,
        filledAmount: '500000000000000000',
      }),
      mockOrder({
        id: '0x6f7264657233000000000000000000000000000000000000000000000000000000',
        status: CLOBOrderStatus.FILLED,
      }),
      mockOrder({
        id: '0x6f7264657234000000000000000000000000000000000000000000000000000000',
        status: CLOBOrderStatus.CANCELLED,
      }),
      mockOrder({
        id: '0x6f7264657235000000000000000000000000000000000000000000000000000000',
        status: CLOBOrderStatus.EXPIRED,
      }),
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should fetch orders for valid user address', async () => {
    const { result } = renderHook(() => useUserCLOBOrders(USER_ADDRESS, {}));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mocks.getUserOrders).toHaveBeenCalledWith(USER_ADDRESS);
    expect(result.current.orders.length).toBe(5);
  });

  it('should return empty when user address is undefined', async () => {
    const { result } = renderHook(() => useUserCLOBOrders(undefined));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mocks.getUserOrders).not.toHaveBeenCalled();
    expect(result.current.orders).toEqual([]);
  });

  it('should filter active orders', async () => {
    const { result } = renderHook(() => useUserCLOBOrders(USER_ADDRESS));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.activeOrders.length).toBe(2); // OPEN and PARTIAL
    expect(
      result.current.activeOrders.every(
        (o) =>
          o.status === CLOBOrderStatus.OPEN ||
          o.status === CLOBOrderStatus.PARTIAL,
      ),
    ).toBe(true);
  });

  it('should filter filled orders', async () => {
    const { result } = renderHook(() => useUserCLOBOrders(USER_ADDRESS));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.filledOrders.length).toBe(1);
    expect(result.current.filledOrders[0].status).toBe(CLOBOrderStatus.FILLED);
  });

  it('should filter cancelled orders', async () => {
    const { result } = renderHook(() => useUserCLOBOrders(USER_ADDRESS));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.cancelledOrders.length).toBe(2); // CANCELLED and EXPIRED
  });

  it('should provide refresh function', async () => {
    const { result } = renderHook(() => useUserCLOBOrders(USER_ADDRESS));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    mocks.getUserOrders.mockClear();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mocks.getUserOrders).toHaveBeenCalled();
  });
});

describe('useMarketTrades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockVisibilityState.state = 'visible';

    mocks.getOrderBook.mockResolvedValue(mockOrderBook());
    mocks.getTrades.mockResolvedValue([
      mockTrade({ takerIsBuy: true, amount: '1000000000000000000' }),
      mockTrade({ takerIsBuy: false, amount: '2000000000000000000' }),
      mockTrade({ takerIsBuy: true, amount: '500000000000000000' }),
    ]);
    mocks.getMarketStats.mockResolvedValue(mockMarketStats());
    mocks.getCircuitBreaker.mockResolvedValue(mockCircuitBreaker());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return trades and stats', async () => {
    const { result } = renderHook(() =>
      useMarketTrades({
        baseToken: BASE_TOKEN,
        baseTokenId: BASE_TOKEN_ID,
        quoteToken: QUOTE_TOKEN,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.trades.length).toBe(3);
    expect(result.current.lastPrice).toBeDefined();
    expect(result.current.volume24h).toBeDefined();
    expect(result.current.tradeCount).toBe(3);
  });

  it('should calculate buy and sell volume', async () => {
    const { result } = renderHook(() =>
      useMarketTrades({
        baseToken: BASE_TOKEN,
        baseTokenId: BASE_TOKEN_ID,
        quoteToken: QUOTE_TOKEN,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // First and third trades are buys (1500000000000000000 total)
    expect(BigInt(result.current.buyVolume)).toBe(1500000000000000000n);
    // Second trade is sell (2000000000000000000)
    expect(BigInt(result.current.sellVolume)).toBe(2000000000000000000n);
  });

  it('should handle empty trades', async () => {
    mocks.getTrades.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useMarketTrades({
        baseToken: BASE_TOKEN,
        baseTokenId: BASE_TOKEN_ID,
        quoteToken: QUOTE_TOKEN,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.trades).toEqual([]);
    expect(result.current.lastPrice).toBe('0');
    expect(result.current.volume24h).toBe('0');
    expect(result.current.tradeCount).toBe(0);
  });

  it('should forward isLoading and refresh', async () => {
    const { result } = renderHook(() =>
      useMarketTrades({
        baseToken: BASE_TOKEN,
        baseTokenId: BASE_TOKEN_ID,
        quoteToken: QUOTE_TOKEN,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.refresh).toBe('function');
  });
});
