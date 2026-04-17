/**
 * @file test/services/CLOBMEVService.test.ts
 * @description Vitest unit tests for CLOBV2Service MEV protection methods:
 *   commitOrder, revealOrder, placeMarketOrder (slippage logic)
 */

import { describe, it, expect, vi } from 'vitest';
import { ethers } from 'ethers';

// ─── Hoisted mock objects ─────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const DIAMOND_ADDR = '0xd1a0000000000000000000000000000000000001';
  const QUOTE_ADDR = '0xa100000000000000000000000000000000000001';
  const BASE_TOKEN = '0xba5e000000000000000000000000000000000001';
  const coreContract = {
    commitOrder: vi.fn(),
    revealOrder: vi.fn(),
    placeLimitOrder: vi.fn(),
    cancelOrder: vi.fn(),
    connect: vi.fn(),
  };
  const adminContract = {
    getFeeConfig: vi.fn(),
    getMEVConfig: vi.fn(),
    isPaused: vi.fn(),
    connect: vi.fn(),
  };
  const quoteToken = {
    allowance: vi.fn(),
    approve: vi.fn(),
    connect: vi.fn(),
  };
  const baseToken = {
    isApprovedForAll: vi.fn(),
    setApprovalForAll: vi.fn(),
    connect: vi.fn(),
  };
  const getOrderBook = vi.fn();

  return {
    coreContract,
    adminContract,
    quoteToken,
    baseToken,
    getOrderBook,
    DIAMOND_ADDR,
    QUOTE_ADDR,
    BASE_TOKEN,
  };
});

vi.mock('@/infrastructure/diamond', () => ({
  getDiamondSigner: () => ({
    getAddress: vi
      .fn()
      .mockResolvedValue('0x1111111111111111111111111111111111111111'),
  }),
  getDiamondProvider: () => ({ getBlockNumber: vi.fn() }),
  getDiamondSignerAddress: vi
    .fn()
    .mockResolvedValue('0x1111111111111111111111111111111111111111'),
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_CLOB_V2_DIAMOND_ADDRESS:
    '0xd1a0000000000000000000000000000000000001',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xd1a0000000000000000000000000000000000001',
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0xa100000000000000000000000000000000000001',
}));

vi.mock('@/infrastructure/repositories/clob-v2-repository', () => ({
  clobV2Repository: {
    getOrderBook: mocks.getOrderBook,
    getBestPrices: vi.fn(),
  },
}));

vi.mock('ethers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ethers')>();

  const MockContract = vi
    .fn()
    .mockImplementation((addr: string, abi: unknown[]) => {
      if (addr === '0xa100000000000000000000000000000000000001') {
        mocks.quoteToken.connect = vi.fn().mockReturnValue(mocks.quoteToken);
        return mocks.quoteToken;
      }
      if (addr === '0xba5e000000000000000000000000000000000001') {
        mocks.baseToken.connect = vi.fn().mockReturnValue(mocks.baseToken);
        return mocks.baseToken;
      }
      const abiStr = JSON.stringify(abi);
      if (abiStr.includes('getFeeConfig')) {
        mocks.adminContract.connect = vi
          .fn()
          .mockReturnValue(mocks.adminContract);
        return mocks.adminContract;
      }
      mocks.coreContract.connect = vi.fn().mockReturnValue(mocks.coreContract);
      return mocks.coreContract;
    });

  return { ...actual, ethers: { ...actual.ethers, Contract: MockContract } };
});

// ─── Import after mocks ───────────────────────────────────────────────────────
import { CLOBV2Service } from '@/infrastructure/services/clob-v2-service';
import { TimeInForce } from '@/domain/clob/clob';

// Destructure address constants for use in test bodies
const { DIAMOND_ADDR, QUOTE_ADDR, BASE_TOKEN } = mocks;

// Valid 32-byte hex constants (0x + 64 valid hex chars)
const COMMITMENT_ID = '0x' + 'ab'.repeat(32);
const ORDER_ID = '0x' + 'cd'.repeat(32);
const MARKET_ID = ('0x' + 'ef'.repeat(32)) as `0x${string}`;
const SALT = ('0x' + '00'.repeat(31) + '01') as `0x${string}`;

// ─── Factory helper ───────────────────────────────────────────────────────────

function freshService() {
  // Clear call history on per-test contract methods
  mocks.coreContract.commitOrder.mockClear();
  mocks.coreContract.revealOrder.mockClear();
  mocks.coreContract.placeLimitOrder.mockClear();
  mocks.adminContract.getFeeConfig.mockClear();
  mocks.adminContract.getMEVConfig.mockClear();
  mocks.adminContract.isPaused.mockClear();
  mocks.getOrderBook.mockClear();
  mocks.quoteToken.allowance.mockClear();
  mocks.quoteToken.approve.mockClear();
  // Re-establish connect() on each service creation
  mocks.coreContract.connect = vi.fn().mockReturnValue(mocks.coreContract);
  mocks.adminContract.connect = vi.fn().mockReturnValue(mocks.adminContract);
  mocks.quoteToken.connect = vi.fn().mockReturnValue(mocks.quoteToken);
  mocks.baseToken.connect = vi.fn().mockReturnValue(mocks.baseToken);
  // Default: already approved (set allowance high enough to cover max uint96 * amount)
  mocks.quoteToken.allowance.mockResolvedValue(BigInt(2) ** BigInt(128) - 1n);
  mocks.quoteToken.approve.mockResolvedValue({
    wait: vi.fn().mockResolvedValue({}),
  });
  mocks.baseToken.isApprovedForAll.mockResolvedValue(true);
  return new CLOBV2Service();
}

function makeReceipt(topicSig: string, firstTopic: string, txHash = '0xhash') {
  return {
    hash: txHash,
    logs: [{ topics: [ethers.id(topicSig), firstTopic] }],
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('CLOBV2Service — MEV Protection', () => {
  // ── commitOrder ─────────────────────────────────────────────────────────────

  describe('commitOrder()', () => {
    const commitParams = {
      marketId: MARKET_ID,
      price: 1000000000000000000n,
      amount: 10n,
      isBuy: true,
      timeInForce: TimeInForce.GTC,
      expiry: 0,
      salt: SALT,
    };

    it('returns commitmentId extracted from OrderCommitted event', async () => {
      const service = freshService();
      const receipt = makeReceipt(
        'OrderCommitted(bytes32,address,uint256)',
        COMMITMENT_ID,
      );
      mocks.coreContract.commitOrder.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const result = await service.commitOrder(commitParams);

      expect(result.commitmentId).toBe(COMMITMENT_ID);
    });

    it('calls contract.commitOrder with a 32-byte keccak256 hash', async () => {
      const service = freshService();
      const receipt = makeReceipt(
        'OrderCommitted(bytes32,address,uint256)',
        COMMITMENT_ID,
      );
      mocks.coreContract.commitOrder.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      await service.commitOrder(commitParams);

      const [commitment] = mocks.coreContract.commitOrder.mock.calls[0];
      expect(commitment).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    it('throws when receipt contains no OrderCommitted event', async () => {
      const service = freshService();
      const receipt = { hash: '0xhash', logs: [] };
      mocks.coreContract.commitOrder.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      await expect(service.commitOrder(commitParams)).rejects.toThrow(
        'Commitment ID not found',
      );
    });

    it('throws when contract call fails', async () => {
      const service = freshService();
      mocks.coreContract.commitOrder.mockRejectedValue(
        new Error('execution reverted'),
      );

      await expect(service.commitOrder(commitParams)).rejects.toThrow(
        'execution reverted',
      );
    });
  });

  // ── revealOrder ─────────────────────────────────────────────────────────────

  describe('revealOrder()', () => {
    const revealParams = {
      commitmentId: '0x' + 'cc'.repeat(32),
      baseToken: BASE_TOKEN,
      baseTokenId: 1n,
      quoteToken: QUOTE_ADDR,
      price: 1000000000000000000n,
      amount: 5n,
      isBuy: false,
      timeInForce: TimeInForce.GTC,
      expiry: 0,
      salt: '0x' + '11'.repeat(32),
    };

    it('returns success with orderId from OrderCreated event', async () => {
      const service = freshService();
      const receipt = makeReceipt(
        'OrderCreated(bytes32,bytes32,address,uint256,uint256,bool,uint8,uint8,uint256,uint256)',
        ORDER_ID,
        '0xtxhash',
      );
      mocks.coreContract.revealOrder.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const result = await service.revealOrder(revealParams);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(ORDER_ID);
      expect(result.transactionHash).toBe('0xtxhash');
    });

    it('falls back to tx hash when no OrderCreated event in receipt', async () => {
      const service = freshService();
      const receipt = { hash: '0xfallback', logs: [] };
      mocks.coreContract.revealOrder.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const result = await service.revealOrder(revealParams);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('0xfallback');
    });

    it('returns failure when contract call throws', async () => {
      const service = freshService();
      mocks.coreContract.revealOrder.mockRejectedValue(
        new Error('RevealTooEarly'),
      );

      const result = await service.revealOrder(revealParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('RevealTooEarly');
    });
  });

  // ── placeMarketOrder slippage ───────────────────────────────────────────────

  describe('placeMarketOrder() — slippage logic', () => {
    const baseParams = {
      baseToken: BASE_TOKEN,
      baseTokenId: 1n,
      quoteToken: QUOTE_ADDR,
      amount: 5n,
      isBuy: true,
      maxSlippageBps: 500,
    };

    function mockLimitOrderSuccess(service: CLOBV2Service) {
      void service; // ensure service is created before calling this
      const receipt = makeReceipt(
        'OrderCreated(bytes32,bytes32,address,uint256,uint256,bool,uint8,uint8,uint256,uint256)',
        ORDER_ID,
        '0xmarkettx',
      );
      mocks.coreContract.placeLimitOrder.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });
    }

    it('BUY: uses bestAsk price with slippage applied', async () => {
      const service = freshService();
      mocks.getOrderBook.mockResolvedValue({
        bids: [],
        asks: [{ price: '1000000000000000000' }],
      });
      mockLimitOrderSuccess(service);

      const result = await service.placeMarketOrder(baseParams);

      expect(result.success).toBe(true);
      const [, , , priceArg] = mocks.coreContract.placeLimitOrder.mock.calls[0];
      expect(priceArg).toBe((1000000000000000000n * 10500n) / 10000n);
    });

    it('SELL: uses bestBid price minus slippage', async () => {
      const service = freshService();
      mocks.getOrderBook.mockResolvedValue({
        bids: [{ price: '2000000000000000000' }],
        asks: [],
      });
      mockLimitOrderSuccess(service);

      const result = await service.placeMarketOrder({
        ...baseParams,
        isBuy: false,
      });

      expect(result.success).toBe(true);
      const [, , , priceArg] = mocks.coreContract.placeLimitOrder.mock.calls[0];
      expect(priceArg).toBe((2000000000000000000n * 9500n) / 10000n);
    });

    it('BUY: falls back to max uint96 when no asks', async () => {
      const service = freshService();
      mocks.getOrderBook.mockResolvedValue({ bids: [], asks: [] });
      mockLimitOrderSuccess(service);

      await service.placeMarketOrder(baseParams);

      const [, , , priceArg] = mocks.coreContract.placeLimitOrder.mock.calls[0];
      expect(priceArg).toBe(BigInt(2) ** BigInt(96) - 1n);
    });

    it('SELL: falls back to price=1 when no bids', async () => {
      const service = freshService();
      mocks.getOrderBook.mockResolvedValue({ bids: [], asks: [] });
      mockLimitOrderSuccess(service);

      await service.placeMarketOrder({ ...baseParams, isBuy: false });

      const [, , , priceArg] = mocks.coreContract.placeLimitOrder.mock.calls[0];
      expect(priceArg).toBe(1n);
    });

    it('falls back gracefully when getOrderBook throws', async () => {
      const service = freshService();
      mocks.getOrderBook.mockRejectedValue(new Error('indexer down'));
      mockLimitOrderSuccess(service);

      const result = await service.placeMarketOrder(baseParams);

      expect(result.success).toBe(true);
    });

    it('uses default 10% slippage when maxSlippageBps is omitted', async () => {
      const service = freshService();
      mocks.getOrderBook.mockResolvedValue({
        bids: [],
        asks: [{ price: '1000000000000000000' }],
      });
      mockLimitOrderSuccess(service);

      await service.placeMarketOrder({
        ...baseParams,
        maxSlippageBps: undefined,
      });

      const [, , , priceArg] = mocks.coreContract.placeLimitOrder.mock.calls[0];
      expect(priceArg).toBe((1000000000000000000n * 11000n) / 10000n);
    });
  });
});
