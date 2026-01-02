import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock database
const mockDb = {
  clobOrders: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  clobTrades: {
    create: vi.fn(),
  },
  clobPools: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  clobLiquidityPositions: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  orderPlacedEvents: { create: vi.fn() },
  orderMatchedEvents: { create: vi.fn() },
  orderCancelledEvents: { create: vi.fn() },
  tradeExecutedEvents: { create: vi.fn() },
  liquidityAddedEvents: { create: vi.fn() },
  liquidityRemovedEvents: { create: vi.fn() },
  poolCreatedEvents: { create: vi.fn() },
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

function createMockEvent(args: any, overrides: Partial<any> = {}) {
  return {
    args,
    block: {
      number: 12345678n,
      timestamp: 1704067200n,
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

describe('CLOB Event Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OrderPlaced', () => {
    it('should create a limit buy order', async () => {
      const orderId =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
      const maker =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const baseToken =
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;
      const baseTokenId = 1n;
      const quoteToken =
        '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`;
      const price = 1000000n; // 1 USDT
      const amount = 100n;

      mockDb.userTradingStats.findUnique.mockResolvedValueOnce(null);
      mockDb.marketData.findUnique.mockResolvedValueOnce(null);

      const event = createMockEvent({
        orderId,
        maker,
        baseToken,
        baseTokenId,
        quoteToken,
        price,
        amount,
        isBuy: true,
        orderType: 0, // Limit
      });

      await mockDb.clobOrders.create({
        id: orderId,
        maker,
        baseToken,
        baseTokenId,
        quoteToken,
        price,
        amount,
        filledAmount: 0n,
        remainingAmount: amount,
        isBuy: true,
        orderType: 0,
        status: 0, // Open
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.clobOrders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: orderId,
          isBuy: true,
          orderType: 0,
          status: 0,
          remainingAmount: amount,
        }),
      );
    });

    it('should create a market sell order', async () => {
      const orderId = '0xfedcba' as `0x${string}`;
      const maker = '0xaaaa' as `0x${string}`;

      mockDb.userTradingStats.findUnique.mockResolvedValueOnce(null);
      mockDb.marketData.findUnique.mockResolvedValueOnce(null);

      const event = createMockEvent({
        orderId,
        maker,
        baseToken: '0xbbbb' as `0x${string}`,
        baseTokenId: 1n,
        quoteToken: '0xcccc' as `0x${string}`,
        price: 950000n,
        amount: 50n,
        isBuy: false,
        orderType: 1, // Market
      });

      await mockDb.clobOrders.create({
        id: orderId,
        maker,
        baseToken: '0xbbbb' as `0x${string}`,
        baseTokenId: 1n,
        quoteToken: '0xcccc' as `0x${string}`,
        price: 950000n,
        amount: 50n,
        filledAmount: 0n,
        remainingAmount: 50n,
        isBuy: false,
        orderType: 1,
        status: 0,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.clobOrders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isBuy: false,
          orderType: 1,
        }),
      );
    });
  });

  describe('OrderMatched', () => {
    it('should create order matched event', async () => {
      const takerOrderId = '0x1111' as `0x${string}`;
      const makerOrderId = '0x2222' as `0x${string}`;
      const tradeId = '0x3333' as `0x${string}`;
      const fillAmount = 50n;
      const fillPrice = 1000000n;
      const quoteAmount = 50000000n;

      const event = createMockEvent({
        takerOrderId,
        makerOrderId,
        tradeId,
        fillAmount,
        fillPrice,
        quoteAmount,
      });

      await mockDb.orderMatchedEvents.create({
        id: `${event.transaction.hash}-${event.log.logIndex}`,
        takerOrderId,
        makerOrderId,
        tradeId,
        fillAmount,
        fillPrice,
        quoteAmount,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.orderMatchedEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fillAmount: 50n,
          fillPrice: 1000000n,
          quoteAmount: 50000000n,
        }),
      );
    });
  });

  describe('OrderCancelled', () => {
    it('should cancel order and return remaining amount', async () => {
      const orderId = '0x1234' as `0x${string}`;
      const maker = '0xaaaa' as `0x${string}`;
      const remainingAmount = 75n;

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
          status: 3, // Cancelled
          remainingAmount: 0n,
          updatedAt: event.block.timestamp,
        },
      });

      await mockDb.orderCancelledEvents.create({
        id: `${event.transaction.hash}-${event.log.logIndex}`,
        orderId,
        maker,
        remainingAmount,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.clobOrders.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: orderId,
          data: expect.objectContaining({
            status: 3,
            remainingAmount: 0n,
          }),
        }),
      );
    });
  });

  describe('OrderUpdated', () => {
    it('should update order status to partial fill', async () => {
      const orderId = '0x1234' as `0x${string}`;
      const newStatus = 1; // PartialFill
      const filledAmount = 30n;
      const remainingAmount = 70n;

      mockDb.clobOrders.findUnique.mockResolvedValueOnce({
        id: orderId,
        maker: '0xaaaa',
      });

      const event = createMockEvent({
        orderId,
        newStatus,
        filledAmount,
        remainingAmount,
      });

      await mockDb.clobOrders.update({
        id: orderId,
        data: {
          status: newStatus,
          filledAmount,
          remainingAmount,
          updatedAt: event.block.timestamp,
        },
      });

      expect(mockDb.clobOrders.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 1,
            filledAmount: 30n,
            remainingAmount: 70n,
          }),
        }),
      );
    });

    it('should update order status to filled', async () => {
      const orderId = '0x1234' as `0x${string}`;
      const newStatus = 2; // Filled
      const filledAmount = 100n;
      const remainingAmount = 0n;

      mockDb.clobOrders.findUnique.mockResolvedValueOnce({
        id: orderId,
        maker: '0xaaaa' as `0x${string}`,
      });
      mockDb.userTradingStats.findUnique.mockResolvedValueOnce(null);

      const event = createMockEvent({
        orderId,
        newStatus,
        filledAmount,
        remainingAmount,
      });

      await mockDb.clobOrders.update({
        id: orderId,
        data: {
          status: newStatus,
          filledAmount,
          remainingAmount,
          updatedAt: event.block.timestamp,
        },
      });

      expect(mockDb.clobOrders.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 2,
            filledAmount: 100n,
            remainingAmount: 0n,
          }),
        }),
      );
    });
  });

  describe('TradeExecuted', () => {
    it('should create trade and update user stats', async () => {
      const tradeId = '0x3333' as `0x${string}`;
      const taker = '0xaaaa' as `0x${string}`;
      const maker = '0xbbbb' as `0x${string}`;
      const baseToken = '0xcccc' as `0x${string}`;
      const baseTokenId = 1n;
      const price = 1000000n;
      const amount = 50n;
      const quoteAmount = 50000000n;
      const timestamp = 1704067200n;

      mockDb.userTradingStats.findUnique.mockResolvedValue(null);
      mockDb.marketData.findUnique.mockResolvedValueOnce(null);

      const event = createMockEvent({
        tradeId,
        taker,
        maker,
        baseToken,
        baseTokenId,
        price,
        amount,
        quoteAmount,
        timestamp,
      });

      await mockDb.clobTrades.create({
        id: tradeId,
        takerOrderId:
          '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        makerOrderId:
          '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        taker,
        maker,
        baseToken,
        baseTokenId,
        quoteToken:
          '0x0000000000000000000000000000000000000000' as `0x${string}`,
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
        }),
      );
    });
  });

  describe('PoolCreated', () => {
    it('should create new liquidity pool', async () => {
      const poolId = '0x1234' as `0x${string}`;
      const baseToken = '0xaaaa' as `0x${string}`;
      const baseTokenId = 1n;
      const quoteToken = '0xbbbb' as `0x${string}`;

      const event = createMockEvent({
        poolId,
        baseToken,
        baseTokenId,
        quoteToken,
      });

      await mockDb.clobPools.create({
        id: poolId,
        baseToken,
        baseTokenId,
        quoteToken,
        baseReserve: 0n,
        quoteReserve: 0n,
        totalLpTokens: 0n,
        isActive: true,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.clobPools.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: poolId,
          isActive: true,
          baseReserve: 0n,
          quoteReserve: 0n,
        }),
      );
    });
  });

  describe('LiquidityAdded', () => {
    it('should add liquidity and mint LP tokens', async () => {
      const poolId = '0x1234' as `0x${string}`;
      const provider = '0xaaaa' as `0x${string}`;
      const baseAmount = 1000n;
      const quoteAmount = 1000000n;
      const lpTokensMinted = 1000n;

      const positionId = `${poolId}-${provider.toLowerCase()}`;

      mockDb.clobPools.findUnique.mockResolvedValueOnce({
        id: poolId,
        baseReserve: 0n,
        quoteReserve: 0n,
        totalLpTokens: 0n,
      });
      mockDb.clobLiquidityPositions.findUnique.mockResolvedValueOnce(null);

      const event = createMockEvent({
        poolId,
        provider,
        baseAmount,
        quoteAmount,
        lpTokensMinted,
      });

      await mockDb.clobPools.update({
        id: poolId,
        data: {
          baseReserve: baseAmount,
          quoteReserve: quoteAmount,
          totalLpTokens: lpTokensMinted,
          updatedAt: event.block.timestamp,
        },
      });

      await mockDb.clobLiquidityPositions.create({
        id: positionId,
        poolId,
        provider,
        lpTokens: lpTokensMinted,
        depositedAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      });

      expect(mockDb.clobPools.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            baseReserve: 1000n,
            quoteReserve: 1000000n,
          }),
        }),
      );

      expect(mockDb.clobLiquidityPositions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lpTokens: 1000n,
        }),
      );
    });

    it('should add to existing liquidity position', async () => {
      const poolId = '0x1234' as `0x${string}`;
      const provider = '0xaaaa' as `0x${string}`;

      const positionId = `${poolId}-${provider.toLowerCase()}`;

      mockDb.clobPools.findUnique.mockResolvedValueOnce({
        id: poolId,
        baseReserve: 1000n,
        quoteReserve: 1000000n,
        totalLpTokens: 1000n,
      });
      mockDb.clobLiquidityPositions.findUnique.mockResolvedValueOnce({
        id: positionId,
        lpTokens: 1000n,
      });

      const event = createMockEvent({
        poolId,
        provider,
        baseAmount: 500n,
        quoteAmount: 500000n,
        lpTokensMinted: 500n,
      });

      await mockDb.clobLiquidityPositions.update({
        id: positionId,
        data: {
          lpTokens: 1500n,
          updatedAt: event.block.timestamp,
        },
      });

      expect(mockDb.clobLiquidityPositions.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lpTokens: 1500n }),
        }),
      );
    });
  });

  describe('LiquidityRemoved', () => {
    it('should remove liquidity and burn LP tokens', async () => {
      const poolId = '0x1234' as `0x${string}`;
      const provider = '0xaaaa' as `0x${string}`;
      const baseAmount = 500n;
      const quoteAmount = 500000n;
      const lpTokensBurned = 500n;

      const positionId = `${poolId}-${provider.toLowerCase()}`;

      mockDb.clobPools.findUnique.mockResolvedValueOnce({
        id: poolId,
        baseReserve: 1000n,
        quoteReserve: 1000000n,
        totalLpTokens: 1000n,
      });
      mockDb.clobLiquidityPositions.findUnique.mockResolvedValueOnce({
        id: positionId,
        lpTokens: 1000n,
      });

      const event = createMockEvent({
        poolId,
        provider,
        baseAmount,
        quoteAmount,
        lpTokensBurned,
      });

      await mockDb.clobPools.update({
        id: poolId,
        data: {
          baseReserve: 500n,
          quoteReserve: 500000n,
          totalLpTokens: 500n,
          updatedAt: event.block.timestamp,
        },
      });

      await mockDb.clobLiquidityPositions.update({
        id: positionId,
        data: {
          lpTokens: 500n,
          updatedAt: event.block.timestamp,
        },
      });

      expect(mockDb.clobPools.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            baseReserve: 500n,
            totalLpTokens: 500n,
          }),
        }),
      );
    });
  });
});
