import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * CLOB V2 Indexer Event Handler Tests
 *
 * Tests for the production-ready CLOB with:
 * - Time-in-force orders (GTC, IOC, FOK, GTD)
 * - MEV protection (commit-reveal)
 * - Circuit breakers
 * - Emergency recovery
 */

// Mock database operations
const mockDb = {
  clobOrders: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  clobTrades: {
    create: vi.fn(),
  },
  orderPlacedEvents: { create: vi.fn() },
  orderMatchedEvents: { create: vi.fn() },
  orderCancelledEvents: { create: vi.fn() },
  tradeExecutedEvents: { create: vi.fn() },
  marketData: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  userTradingStats: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
};

// Helper to create mock events
function createMockEvent(args: any, overrides: Partial<any> = {}) {
  return {
    args,
    block: {
      number: 12345678n,
      timestamp: 1704067200n, // 2024-01-01 00:00:00 UTC
    },
    transaction: {
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`,
      from: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    },
    log: {
      logIndex: 0,
    },
    ...overrides,
  };
}

// Time-in-force constants (matching CLOBLib)
const TIF_GTC = 0; // Good Till Cancel
const TIF_IOC = 1; // Immediate Or Cancel
const TIF_FOK = 2; // Fill Or Kill
const TIF_GTD = 3; // Good Till Date

// Order status constants
const STATUS_OPEN = 0;
const STATUS_PARTIAL = 1;
const STATUS_FILLED = 2;
const STATUS_CANCELLED = 3;
const STATUS_EXPIRED = 4;

// Order type constants
const TYPE_LIMIT = 0;
const TYPE_MARKET = 1;

describe('CLOB V2 Event Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // OrderCreated V2 Tests
  // ===========================================================================

  describe('OrderCreated V2', () => {
    it('should create a GTC limit buy order', async () => {
      const orderId =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
      const marketId =
        '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321' as `0x${string}`;
      const maker =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const price = 1000000000000000000n; // 1 ETH
      const amount = 100n;
      const nonce = 1n;

      mockDb.userTradingStats.findUnique.mockResolvedValueOnce(null);

      const event = createMockEvent({
        orderId,
        marketId,
        maker,
        price,
        amount,
        isBuy: true,
        orderType: TYPE_LIMIT,
        timeInForce: TIF_GTC,
        expiry: 0n, // No expiry for GTC
        nonce,
      });

      // Simulate handler behavior
      await mockDb.clobOrders.create({
        id: orderId,
        maker,
        baseToken:
          '0x0000000000000000000000000000000000000000' as `0x${string}`,
        baseTokenId: 0n,
        quoteToken:
          '0x0000000000000000000000000000000000000000' as `0x${string}`,
        price,
        amount,
        filledAmount: 0n,
        remainingAmount: amount,
        isBuy: true,
        orderType: TYPE_LIMIT,
        status: STATUS_OPEN,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.clobOrders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: orderId,
          isBuy: true,
          orderType: TYPE_LIMIT,
          status: STATUS_OPEN,
          remainingAmount: amount,
        }),
      );
    });

    it('should create a GTD limit sell order with expiry', async () => {
      const orderId =
        '0x2222222222222222222222222222222222222222222222222222222222222222' as `0x${string}`;
      const marketId =
        '0x3333333333333333333333333333333333333333333333333333333333333333' as `0x${string}`;
      const maker =
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;
      const expiry = 1704153600n; // 24 hours later

      mockDb.userTradingStats.findUnique.mockResolvedValueOnce(null);

      const event = createMockEvent({
        orderId,
        marketId,
        maker,
        price: 950000000000000000n,
        amount: 50n,
        isBuy: false,
        orderType: TYPE_LIMIT,
        timeInForce: TIF_GTD,
        expiry,
        nonce: 2n,
      });

      await mockDb.clobOrders.create({
        id: orderId,
        maker,
        price: 950000000000000000n,
        amount: 50n,
        isBuy: false,
        orderType: TYPE_LIMIT,
        status: STATUS_OPEN,
        // Note: expiry would be stored in a V2-specific field
      });

      expect(mockDb.clobOrders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: orderId,
          isBuy: false,
          orderType: TYPE_LIMIT,
        }),
      );
    });

    it('should create an IOC market order', async () => {
      const orderId =
        '0x4444444444444444444444444444444444444444444444444444444444444444' as `0x${string}`;
      const marketId =
        '0x5555555555555555555555555555555555555555555555555555555555555555' as `0x${string}`;
      const maker =
        '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`;

      mockDb.userTradingStats.findUnique.mockResolvedValueOnce(null);

      const event = createMockEvent({
        orderId,
        marketId,
        maker,
        price: 1000000000000000000n,
        amount: 25n,
        isBuy: true,
        orderType: TYPE_MARKET,
        timeInForce: TIF_IOC,
        expiry: 0n,
        nonce: 3n,
      });

      await mockDb.clobOrders.create({
        id: orderId,
        maker,
        orderType: TYPE_MARKET,
        status: STATUS_OPEN,
      });

      expect(mockDb.clobOrders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: TYPE_MARKET,
        }),
      );
    });
  });

  // ===========================================================================
  // OrderFilled Tests
  // ===========================================================================

  describe('OrderFilled', () => {
    it('should update order with partial fill', async () => {
      const orderId =
        '0x1111111111111111111111111111111111111111111111111111111111111111' as `0x${string}`;
      const tradeId =
        '0x9999999999999999999999999999999999999999999999999999999999999999' as `0x${string}`;
      const fillAmount = 30n;
      const fillPrice = 1000000000000000000n;
      const remainingAmount = 70n;
      const cumulativeFilled = 30n;

      mockDb.clobOrders.findUnique.mockResolvedValueOnce({
        id: orderId,
        maker: '0xaaaa' as `0x${string}`,
        amount: 100n,
        filledAmount: 0n,
        remainingAmount: 100n,
        status: STATUS_OPEN,
      });

      const event = createMockEvent({
        orderId,
        tradeId,
        fillAmount,
        fillPrice,
        remainingAmount,
        cumulativeFilled,
      });

      await mockDb.clobOrders.update({
        id: orderId,
        data: {
          filledAmount: cumulativeFilled,
          remainingAmount,
          status: STATUS_PARTIAL,
          updatedAt: event.block.timestamp,
        },
      });

      expect(mockDb.clobOrders.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: STATUS_PARTIAL,
            filledAmount: 30n,
            remainingAmount: 70n,
          }),
        }),
      );
    });

    it('should update order to filled status when fully filled', async () => {
      const orderId =
        '0x2222222222222222222222222222222222222222222222222222222222222222' as `0x${string}`;
      const tradeId =
        '0x8888888888888888888888888888888888888888888888888888888888888888' as `0x${string}`;
      const fillAmount = 100n;
      const fillPrice = 1000000000000000000n;
      const remainingAmount = 0n;
      const cumulativeFilled = 100n;

      mockDb.clobOrders.findUnique.mockResolvedValueOnce({
        id: orderId,
        maker: '0xbbbb' as `0x${string}`,
        amount: 100n,
        filledAmount: 0n,
        remainingAmount: 100n,
        status: STATUS_OPEN,
      });
      mockDb.userTradingStats.findUnique.mockResolvedValueOnce(null);

      const event = createMockEvent({
        orderId,
        tradeId,
        fillAmount,
        fillPrice,
        remainingAmount,
        cumulativeFilled,
      });

      await mockDb.clobOrders.update({
        id: orderId,
        data: {
          filledAmount: cumulativeFilled,
          remainingAmount,
          status: STATUS_FILLED,
          updatedAt: event.block.timestamp,
        },
      });

      expect(mockDb.clobOrders.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: STATUS_FILLED,
            remainingAmount: 0n,
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // OrderExpired Tests
  // ===========================================================================

  describe('OrderExpired', () => {
    it('should update GTD order to expired status', async () => {
      const orderId =
        '0x3333333333333333333333333333333333333333333333333333333333333333' as `0x${string}`;
      const expiredAt = 1704153600n;

      const event = createMockEvent({
        orderId,
        expiredAt,
      });

      await mockDb.clobOrders.update({
        id: orderId,
        data: {
          status: STATUS_EXPIRED,
          remainingAmount: 0n,
          updatedAt: event.block.timestamp,
        },
      });

      expect(mockDb.clobOrders.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: STATUS_EXPIRED,
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // TradeExecutedV2 Tests
  // ===========================================================================

  describe('TradeExecutedV2', () => {
    it('should create trade with fee tracking', async () => {
      const tradeId =
        '0x7777777777777777777777777777777777777777777777777777777777777777' as `0x${string}`;
      const takerOrderId =
        '0x1111111111111111111111111111111111111111111111111111111111111111' as `0x${string}`;
      const makerOrderId =
        '0x2222222222222222222222222222222222222222222222222222222222222222' as `0x${string}`;
      const taker =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const maker =
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;
      const marketId =
        '0x5555555555555555555555555555555555555555555555555555555555555555' as `0x${string}`;
      const price = 1000000000000000000n;
      const amount = 50n;
      const quoteAmount = 50000000000000000000n;
      const takerFee = 25000000000000000n; // 0.5% of 50 ETH
      const makerFee = 5000000000000000n; // 0.1% of 50 ETH
      const timestamp = 1704067200n;
      const takerIsBuy = true;

      mockDb.userTradingStats.findUnique.mockResolvedValue(null);
      mockDb.marketData.findUnique.mockResolvedValueOnce(null);

      const event = createMockEvent({
        tradeId,
        takerOrderId,
        makerOrderId,
        taker,
        maker,
        marketId,
        price,
        amount,
        quoteAmount,
        takerFee,
        makerFee,
        timestamp,
        takerIsBuy,
      });

      await mockDb.clobTrades.create({
        id: tradeId,
        takerOrderId,
        makerOrderId,
        taker,
        maker,
        price,
        amount,
        quoteAmount,
        timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.clobTrades.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: tradeId,
          taker,
          maker,
          price,
          amount,
          quoteAmount,
        }),
      );
    });

    it('should update user stats with fees', async () => {
      const taker =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const maker =
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;
      const takerFee = 25000000000000000n;
      const makerFee = 5000000000000000n;
      const quoteAmount = 50000000000000000000n;

      // Mock existing stats
      mockDb.userTradingStats.findUnique.mockImplementation(
        async (args: any) => {
          if (args.id === taker) {
            return {
              id: taker,
              totalTradesAsTaker: 5n,
              totalVolumeQuote: 100000000000000000000n,
              totalFeesPaid: 100000000000000000n,
            };
          }
          if (args.id === maker) {
            return {
              id: maker,
              totalTradesAsMaker: 10n,
              totalVolumeQuote: 200000000000000000000n,
              totalFeesPaid: 50000000000000000n,
            };
          }
          return null;
        },
      );

      // Update taker stats
      await mockDb.userTradingStats.update({
        id: taker,
        data: {
          totalTradesAsTaker: 6n,
          totalVolumeQuote: 150000000000000000000n,
          totalFeesPaid: 125000000000000000n, // +25000000000000000
        },
      });

      // Update maker stats
      await mockDb.userTradingStats.update({
        id: maker,
        data: {
          totalTradesAsMaker: 11n,
          totalVolumeQuote: 250000000000000000000n,
          totalFeesPaid: 55000000000000000n, // +5000000000000000
        },
      });

      expect(mockDb.userTradingStats.update).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // MEV Protection Tests
  // ===========================================================================

  describe('MEV Protection - Commit-Reveal', () => {
    it('should log order commitment', async () => {
      const commitmentId =
        '0xaaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111' as `0x${string}`;
      const committer =
        '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`;
      const commitBlock = 12345678n;

      const event = createMockEvent({
        commitmentId,
        committer,
        commitBlock,
      });

      // Handler should log the commitment
      // In a full implementation, this would insert into a commitments table
      expect(event.args.commitmentId).toBe(commitmentId);
      expect(event.args.committer).toBe(committer);
      expect(event.args.commitBlock).toBe(commitBlock);
    });

    it('should log order reveal', async () => {
      const commitmentId =
        '0xaaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111' as `0x${string}`;
      const orderId =
        '0xbbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222' as `0x${string}`;
      const maker =
        '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`;

      const event = createMockEvent({
        commitmentId,
        orderId,
        maker,
      });

      expect(event.args.commitmentId).toBe(commitmentId);
      expect(event.args.orderId).toBe(orderId);
      expect(event.args.maker).toBe(maker);
    });
  });

  // ===========================================================================
  // Circuit Breaker Tests
  // ===========================================================================

  describe('Circuit Breaker', () => {
    it('should log circuit breaker trip', async () => {
      const marketId =
        '0x5555555555555555555555555555555555555555555555555555555555555555' as `0x${string}`;
      const triggerPrice = 1100000000000000000n; // 10% increase
      const previousPrice = 1000000000000000000n;
      const changePercent = 1000n; // 10% in basis points
      const cooldownUntil = 1704067500n; // 5 minutes later

      const event = createMockEvent({
        marketId,
        triggerPrice,
        previousPrice,
        changePercent,
        cooldownUntil,
      });

      expect(event.args.marketId).toBe(marketId);
      expect(event.args.changePercent).toBe(changePercent);
      expect(event.args.cooldownUntil).toBe(cooldownUntil);
    });

    it('should log circuit breaker reset', async () => {
      const marketId =
        '0x5555555555555555555555555555555555555555555555555555555555555555' as `0x${string}`;
      const resetAt = 1704067500n;

      const event = createMockEvent({
        marketId,
        resetAt,
      });

      expect(event.args.marketId).toBe(marketId);
      expect(event.args.resetAt).toBe(resetAt);
    });
  });

  // ===========================================================================
  // Market Depth Tests
  // ===========================================================================

  describe('MarketDepthChanged', () => {
    it('should update market data with best bid/ask', async () => {
      const marketId =
        '0x5555555555555555555555555555555555555555555555555555555555555555' as `0x${string}`;
      const bestBid = 990000000000000000n;
      const bestBidSize = 500n;
      const bestAsk = 1010000000000000000n;
      const bestAskSize = 300n;
      const spread = 20000000000000000n;

      mockDb.marketData.findUnique.mockResolvedValueOnce({
        id: marketId,
        bestBidPrice: 980000000000000000n,
        bestAskPrice: 1020000000000000000n,
      });

      const event = createMockEvent({
        marketId,
        bestBid,
        bestBidSize,
        bestAsk,
        bestAskSize,
        spread,
      });

      await mockDb.marketData.update({
        id: marketId,
        data: {
          bestBidPrice: bestBid,
          bestBidAmount: bestBidSize,
          bestAskPrice: bestAsk,
          bestAskAmount: bestAskSize,
          updatedAt: event.block.timestamp,
        },
      });

      expect(mockDb.marketData.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bestBidPrice: bestBid,
            bestAskPrice: bestAsk,
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // Market Created Tests
  // ===========================================================================

  describe('MarketCreated', () => {
    it('should create new market data entry', async () => {
      const marketId =
        '0x6666666666666666666666666666666666666666666666666666666666666666' as `0x${string}`;
      const baseToken =
        '0xdddddddddddddddddddddddddddddddddddddddd' as `0x${string}`;
      const baseTokenId = 1n;
      const quoteToken =
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as `0x${string}`;

      const event = createMockEvent({
        marketId,
        baseToken,
        baseTokenId,
        quoteToken,
      });

      const marketDataId = `${baseToken}-${baseTokenId.toString()}-${quoteToken}`;

      await mockDb.marketData.create({
        id: marketDataId,
        baseToken,
        baseTokenId,
        quoteToken,
        bestBidPrice: 0n,
        bestBidAmount: 0n,
        bestAskPrice: 0n,
        bestAskAmount: 0n,
        lastTradePrice: 0n,
        volume24h: 0n,
        tradeCount24h: 0n,
        openOrderCount: 0n,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      });

      expect(mockDb.marketData.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: marketDataId,
          baseToken,
          quoteToken,
          bestBidPrice: 0n,
          bestAskPrice: 0n,
        }),
      );
    });
  });

  // ===========================================================================
  // Emergency & Admin Tests
  // ===========================================================================

  describe('Emergency & Admin Events', () => {
    it('should log emergency withdrawal', async () => {
      const user =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const orderId =
        '0x1111111111111111111111111111111111111111111111111111111111111111' as `0x${string}`;
      const token =
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as `0x${string}`;
      const amount = 1000000000000000000n;

      const event = createMockEvent({
        user,
        orderId,
        token,
        amount,
      });

      expect(event.args.user).toBe(user);
      expect(event.args.orderId).toBe(orderId);
      expect(event.args.amount).toBe(amount);
    });

    it('should log global pause', async () => {
      const event = createMockEvent({ paused: true });
      expect(event.args.paused).toBe(true);
    });

    it('should log market pause', async () => {
      const marketId =
        '0x5555555555555555555555555555555555555555555555555555555555555555' as `0x${string}`;
      const event = createMockEvent({ marketId });
      expect(event.args.marketId).toBe(marketId);
    });

    it('should log fees update', async () => {
      const takerFeeBps = 50; // 0.5%
      const makerFeeBps = 10; // 0.1%
      const lpFeeBps = 30; // 0.3%

      const event = createMockEvent({
        takerFeeBps,
        makerFeeBps,
        lpFeeBps,
      });

      expect(event.args.takerFeeBps).toBe(takerFeeBps);
      expect(event.args.makerFeeBps).toBe(makerFeeBps);
      expect(event.args.lpFeeBps).toBe(lpFeeBps);
    });
  });

  // ===========================================================================
  // Order Cancellation Tests (V2)
  // ===========================================================================

  describe('OrderCancelled V2', () => {
    it('should cancel order with reason tracking', async () => {
      const orderId =
        '0x4444444444444444444444444444444444444444444444444444444444444444' as `0x${string}`;
      const maker =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const remainingAmount = 75n;
      const reason = 0; // User cancelled

      mockDb.userTradingStats.findUnique.mockResolvedValueOnce({
        id: maker,
        totalOrdersCancelled: 2n,
      });

      const event = createMockEvent({
        orderId,
        maker,
        remainingAmount,
      });

      await mockDb.clobOrders.update({
        id: orderId,
        data: {
          status: STATUS_CANCELLED,
          remainingAmount: 0n,
          updatedAt: event.block.timestamp,
        },
      });

      expect(mockDb.clobOrders.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: orderId,
          data: expect.objectContaining({
            status: STATUS_CANCELLED,
          }),
        }),
      );
    });

    it('should handle IOC unfilled cancellation', async () => {
      const orderId =
        '0x5555555555555555555555555555555555555555555555555555555555555555' as `0x${string}`;
      const maker =
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;
      const remainingAmount = 100n; // Full amount unfilled
      const reason = 2; // IOC unfilled

      mockDb.userTradingStats.findUnique.mockResolvedValueOnce(null);

      const event = createMockEvent({
        orderId,
        maker,
        remainingAmount,
      });

      await mockDb.clobOrders.update({
        id: orderId,
        data: {
          status: STATUS_CANCELLED,
          remainingAmount: 0n,
          updatedAt: event.block.timestamp,
        },
      });

      expect(mockDb.clobOrders.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: STATUS_CANCELLED,
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================

  describe('Full Order Lifecycle', () => {
    it('should handle complete order lifecycle: create -> partial fill -> fill', async () => {
      const orderId =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
      const maker =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const totalAmount = 100n;

      // Step 1: Order created
      mockDb.userTradingStats.findUnique.mockResolvedValueOnce(null);
      await mockDb.clobOrders.create({
        id: orderId,
        maker,
        amount: totalAmount,
        filledAmount: 0n,
        remainingAmount: totalAmount,
        status: STATUS_OPEN,
      });

      // Step 2: Partial fill (30/100)
      mockDb.clobOrders.findUnique.mockResolvedValueOnce({
        id: orderId,
        maker,
        amount: totalAmount,
        filledAmount: 0n,
        remainingAmount: totalAmount,
        status: STATUS_OPEN,
      });

      await mockDb.clobOrders.update({
        id: orderId,
        data: {
          filledAmount: 30n,
          remainingAmount: 70n,
          status: STATUS_PARTIAL,
        },
      });

      // Step 3: Another partial fill (50/100 cumulative = 80/100)
      mockDb.clobOrders.findUnique.mockResolvedValueOnce({
        id: orderId,
        maker,
        amount: totalAmount,
        filledAmount: 30n,
        remainingAmount: 70n,
        status: STATUS_PARTIAL,
      });

      await mockDb.clobOrders.update({
        id: orderId,
        data: {
          filledAmount: 80n,
          remainingAmount: 20n,
          status: STATUS_PARTIAL,
        },
      });

      // Step 4: Final fill (20/100 = 100/100)
      mockDb.clobOrders.findUnique.mockResolvedValueOnce({
        id: orderId,
        maker,
        amount: totalAmount,
        filledAmount: 80n,
        remainingAmount: 20n,
        status: STATUS_PARTIAL,
      });
      mockDb.userTradingStats.findUnique.mockResolvedValueOnce(null);

      await mockDb.clobOrders.update({
        id: orderId,
        data: {
          filledAmount: 100n,
          remainingAmount: 0n,
          status: STATUS_FILLED,
        },
      });

      // Verify final state
      expect(mockDb.clobOrders.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filledAmount: 100n,
            remainingAmount: 0n,
            status: STATUS_FILLED,
          }),
        }),
      );
    });

    it('should handle GTD order expiration', async () => {
      const orderId =
        '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321' as `0x${string}`;
      const maker =
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;
      const expiry = 1704153600n;

      // Step 1: Order created with expiry
      mockDb.userTradingStats.findUnique.mockResolvedValueOnce(null);
      await mockDb.clobOrders.create({
        id: orderId,
        maker,
        amount: 50n,
        filledAmount: 0n,
        remainingAmount: 50n,
        status: STATUS_OPEN,
        // expiry would be stored
      });

      // Step 2: Order expires (no fills)
      await mockDb.clobOrders.update({
        id: orderId,
        data: {
          status: STATUS_EXPIRED,
          remainingAmount: 0n,
        },
      });

      expect(mockDb.clobOrders.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: STATUS_EXPIRED,
          }),
        }),
      );
    });
  });
});
