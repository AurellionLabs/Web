/**
 * @file test/services/CLOBV2Service.test.ts
 * @description Vitest unit tests for CLOBV2Service
 *
 * Covers:
 *  - placeLimitOrder (buy + sell, approval flows, receipt parsing, error paths)
 *  - placeMarketOrder (buy + sell, slippage, order-book fallback, error path)
 *  - placeNodeSellOrder (happy path + error)
 *  - cancelOrder / cancelOrders (happy path + error)
 *  - commitOrder (happy path, commitment-ID extraction, error throw)
 *  - revealOrder (buy + sell approvals, orderId extraction, error)
 *  - calculateQuoteAmount
 *  - requiresCommitReveal (above/below threshold, getMEVConfig failure fallback)
 *  - getFeeConfig (happy path + fallback)
 *  - getMEVConfig (happy path + fallback)
 *  - isPaused (true / false / error fallback)
 *  - timeInForceToNumber mapping (GTC / IOC / FOK / GTD)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ethers } from 'ethers';
import { TimeInForce } from '@/domain/clob/clob';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const coreContract = {
    placeLimitOrder: vi.fn(),
    placeNodeSellOrderV2: vi.fn(),
    cancelOrder: vi.fn(),
    cancelOrders: vi.fn(),
    commitOrder: vi.fn(),
    revealOrder: vi.fn(),
    connect: vi.fn(),
  };
  const adminContract = {
    getFeeConfig: vi.fn(),
    getMEVConfig: vi.fn(),
    isPaused: vi.fn(),
    connect: vi.fn(),
  };
  const quoteTokenContract = {
    allowance: vi.fn(),
    approve: vi.fn(),
    connect: vi.fn(),
  };
  const baseTokenContract = {
    isApprovedForAll: vi.fn(),
    setApprovalForAll: vi.fn(),
    connect: vi.fn(),
  };
  const repoCtx = {
    getSigner: vi.fn(),
    getProvider: vi.fn(),
    getSignerAddress: vi.fn(),
  };
  const orderBookRepo = {
    getOrderBook: vi.fn(),
  };
  return {
    coreContract,
    adminContract,
    quoteTokenContract,
    baseTokenContract,
    repoCtx,
    orderBookRepo,
  };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/infrastructure/contexts/repository-context', () => ({
  RepositoryContext: {
    getInstance: () => mocks.repoCtx,
  },
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_CLOB_V2_DIAMOND_ADDRESS:
    '0xd1a0000000000000000000000000000000000001',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xd1a0000000000000000000000000000000000001',
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0xa100000000000000000000000000000000000001',
}));

vi.mock('@/infrastructure/repositories/clob-v2-repository', () => ({
  clobV2Repository: mocks.orderBookRepo,
}));

// Viem keccak/encodePacked — keep real implementations
vi.mock('viem', async (importOriginal) => {
  return await importOriginal<typeof import('viem')>();
});

// Ethers mock — route Contract calls to the right mock based on ABI shape
vi.mock('ethers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ethers')>();

  const MockContract = vi
    .fn()
    .mockImplementation((_addr: string, abi: unknown[]) => {
      if (!Array.isArray(abi)) return mocks.coreContract;

      const isAdmin = abi.some(
        (f) => typeof f === 'string' && f.includes('getFeeConfig'),
      );
      const isERC20 = abi.some(
        (f) => typeof f === 'string' && f.includes('allowance'),
      );
      const isERC1155 = abi.some(
        (f) => typeof f === 'string' && f.includes('isApprovedForAll'),
      );

      if (isAdmin) {
        mocks.adminContract.connect = vi
          .fn()
          .mockReturnValue(mocks.adminContract);
        return mocks.adminContract;
      }
      if (isERC20) {
        mocks.quoteTokenContract.connect = vi
          .fn()
          .mockReturnValue(mocks.quoteTokenContract);
        return mocks.quoteTokenContract;
      }
      if (isERC1155) {
        mocks.baseTokenContract.connect = vi
          .fn()
          .mockReturnValue(mocks.baseTokenContract);
        return mocks.baseTokenContract;
      }
      mocks.coreContract.connect = vi.fn().mockReturnValue(mocks.coreContract);
      return mocks.coreContract;
    });

  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: MockContract,
      ZeroAddress: actual.ethers.ZeroAddress,
      id: actual.ethers.id,
    },
  };
});

// ─── Import after mocks ───────────────────────────────────────────────────────

import { CLOBV2Service } from '@/infrastructure/services/clob-v2-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_TOKEN = '0x742D35cC6634C0532925a3B844bc454Ed0d2114A';
const QUOTE_TOKEN = '0xa100000000000000000000000000000000000001';
const DIAMOND = '0xd1a0000000000000000000000000000000000001';
const SIGNER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const ORDER_ID = '0x' + 'ab'.repeat(32);
const TX_HASH = '0x' + 'cc'.repeat(32);
const COMMITMENT_ID = '0x' + 'dd'.repeat(32);

/** Build a fake OrderCreated log */
function makeOrderCreatedLog(orderId: string) {
  const topic0 = ethers.id(
    'OrderCreated(bytes32,bytes32,address,uint256,uint256,bool,uint8,uint8,uint256,uint256)',
  );
  return {
    topics: [topic0, orderId, '0x' + '00'.repeat(32), SIGNER_ADDRESS],
    data: '0x',
    address: DIAMOND,
  };
}

/** Build a fake OrderCommitted log */
function makeOrderCommittedLog(commitmentId: string) {
  const topic0 = ethers.id('OrderCommitted(bytes32,address,uint256)');
  return {
    topics: [topic0, commitmentId, SIGNER_ADDRESS],
    data: '0x',
    address: DIAMOND,
  };
}

/** Build a fake TransactionReceipt-like object */
function makeReceipt(logs: unknown[] = [], hash = TX_HASH) {
  return { hash, logs };
}

/** Default fake tx that returns a receipt */
function makeTx(receipt: ReturnType<typeof makeReceipt>) {
  return { hash: TX_HASH, wait: vi.fn().mockResolvedValue(receipt) };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CLOBV2Service', () => {
  let service: CLOBV2Service;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default repo-ctx stubs
    mocks.repoCtx.getSigner.mockReturnValue({ address: SIGNER_ADDRESS });
    mocks.repoCtx.getProvider.mockReturnValue({});
    mocks.repoCtx.getSignerAddress.mockResolvedValue(SIGNER_ADDRESS);

    // Default ERC20 allowance: already sufficient (no approval needed)
    mocks.quoteTokenContract.allowance.mockResolvedValue(BigInt(2) ** 128n);
    mocks.quoteTokenContract.approve.mockResolvedValue(makeTx(makeReceipt()));

    // Default ERC1155: already approved
    mocks.baseTokenContract.isApprovedForAll.mockResolvedValue(true);
    mocks.baseTokenContract.setApprovalForAll.mockResolvedValue(
      makeTx(makeReceipt()),
    );

    service = new CLOBV2Service();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // placeLimitOrder
  // ═══════════════════════════════════════════════════════════════════════════

  describe('placeLimitOrder', () => {
    it('places a GTC buy limit order and returns orderId from log', async () => {
      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      const result = await service.placeLimitOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        price: 1000n,
        amount: 5n,
        isBuy: true,
        timeInForce: TimeInForce.GTC,
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(ORDER_ID);
      expect(result.transactionHash).toBe(TX_HASH);
      expect(mocks.coreContract.placeLimitOrder).toHaveBeenCalledWith(
        BASE_TOKEN,
        1n,
        QUOTE_TOKEN,
        1000n,
        5n,
        true,
        0, // GTC = 0
        0, // no expiry
      );
    });

    it('places a GTC sell limit order and returns orderId from log', async () => {
      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      const result = await service.placeLimitOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 2n,
        quoteToken: QUOTE_TOKEN,
        price: 500n,
        amount: 10n,
        isBuy: false,
        timeInForce: TimeInForce.GTC,
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(ORDER_ID);
    });

    it('falls back to tx hash when no OrderCreated log present', async () => {
      const receipt = makeReceipt([]); // empty logs
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      const result = await service.placeLimitOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        price: 100n,
        amount: 1n,
        isBuy: true,
        timeInForce: TimeInForce.GTC,
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(TX_HASH); // fallback
    });

    it('triggers ERC20 approval when allowance insufficient (buy)', async () => {
      mocks.quoteTokenContract.allowance.mockResolvedValue(0n);
      const approveTx = makeTx(makeReceipt());
      mocks.quoteTokenContract.approve.mockResolvedValue(approveTx);

      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      await service.placeLimitOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        price: 1000n,
        amount: 5n,
        isBuy: true,
        timeInForce: TimeInForce.GTC,
      });

      expect(mocks.quoteTokenContract.approve).toHaveBeenCalled();
    });

    it('does NOT call ERC20 approve when allowance is sufficient', async () => {
      mocks.quoteTokenContract.allowance.mockResolvedValue(BigInt(2) ** 100n);

      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      await service.placeLimitOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        price: 100n,
        amount: 1n,
        isBuy: true,
        timeInForce: TimeInForce.GTC,
      });

      expect(mocks.quoteTokenContract.approve).not.toHaveBeenCalled();
    });

    it('triggers ERC1155 setApprovalForAll when not yet approved (sell)', async () => {
      mocks.baseTokenContract.isApprovedForAll.mockResolvedValue(false);
      mocks.baseTokenContract.setApprovalForAll.mockResolvedValue(
        makeTx(makeReceipt()),
      );

      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      await service.placeLimitOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        price: 500n,
        amount: 2n,
        isBuy: false,
        timeInForce: TimeInForce.GTC,
      });

      expect(mocks.baseTokenContract.setApprovalForAll).toHaveBeenCalledWith(
        DIAMOND,
        true,
      );
    });

    it('does NOT call setApprovalForAll when already approved (sell)', async () => {
      mocks.baseTokenContract.isApprovedForAll.mockResolvedValue(true);

      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      await service.placeLimitOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        price: 500n,
        amount: 2n,
        isBuy: false,
        timeInForce: TimeInForce.GTC,
      });

      expect(mocks.baseTokenContract.setApprovalForAll).not.toHaveBeenCalled();
    });

    it('returns success:false on contract error', async () => {
      mocks.coreContract.placeLimitOrder.mockRejectedValue(
        new Error('revert: insufficient balance'),
      );

      const result = await service.placeLimitOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        price: 100n,
        amount: 1n,
        isBuy: true,
        timeInForce: TimeInForce.GTC,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('insufficient balance');
    });

    it('passes IOC timeInForce as numeric 1', async () => {
      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      await service.placeLimitOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        price: 100n,
        amount: 1n,
        isBuy: true,
        timeInForce: TimeInForce.IOC,
      });

      expect(mocks.coreContract.placeLimitOrder).toHaveBeenCalledWith(
        BASE_TOKEN,
        1n,
        QUOTE_TOKEN,
        100n,
        1n,
        true,
        1, // IOC = 1
        0,
      );
    });

    it('passes FOK timeInForce as numeric 2', async () => {
      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      await service.placeLimitOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        price: 100n,
        amount: 1n,
        isBuy: true,
        timeInForce: TimeInForce.FOK,
      });

      expect(mocks.coreContract.placeLimitOrder).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        2, // FOK = 2
        0,
      );
    });

    it('passes GTD timeInForce as numeric 3 with expiry', async () => {
      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      await service.placeLimitOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        price: 100n,
        amount: 1n,
        isBuy: true,
        timeInForce: TimeInForce.GTD,
        expiry: 9999999,
      });

      expect(mocks.coreContract.placeLimitOrder).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        3, // GTD = 3
        9999999,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // placeMarketOrder
  // ═══════════════════════════════════════════════════════════════════════════

  describe('placeMarketOrder', () => {
    it('buy market order uses best ask + slippage as limit price', async () => {
      mocks.orderBookRepo.getOrderBook.mockResolvedValue({
        asks: [{ price: '1000', amount: '5' }],
        bids: [],
      });
      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      const result = await service.placeMarketOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        amount: 2n,
        isBuy: true,
        maxSlippageBps: 500, // 5%
      });

      expect(result.success).toBe(true);
      // price should be 1000 * (10000 + 500) / 10000 = 1050
      const call = mocks.coreContract.placeLimitOrder.mock.calls[0];
      expect(call[3]).toBe(1050n);
      expect(call[6]).toBe(1); // IOC
    });

    it('sell market order uses best bid - slippage as limit price', async () => {
      mocks.orderBookRepo.getOrderBook.mockResolvedValue({
        asks: [],
        bids: [{ price: '2000', amount: '3' }],
      });
      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      await service.placeMarketOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        amount: 1n,
        isBuy: false,
        maxSlippageBps: 200, // 2%
      });

      // price = 2000 * (10000 - 200) / 10000 = 1960
      const call = mocks.coreContract.placeLimitOrder.mock.calls[0];
      expect(call[3]).toBe(1960n);
    });

    it('buy market order uses max uint96-like price when no asks', async () => {
      mocks.orderBookRepo.getOrderBook.mockResolvedValue({
        asks: [],
        bids: [],
      });
      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      await service.placeMarketOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        amount: 1n,
        isBuy: true,
      });

      const call = mocks.coreContract.placeLimitOrder.mock.calls[0];
      // 2^96 - 1
      expect(call[3]).toBe(BigInt(2) ** 96n - 1n);
    });

    it('sell market order uses price 1n when no bids', async () => {
      mocks.orderBookRepo.getOrderBook.mockResolvedValue({
        asks: [],
        bids: [],
      });
      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      await service.placeMarketOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        amount: 1n,
        isBuy: false,
      });

      const call = mocks.coreContract.placeLimitOrder.mock.calls[0];
      expect(call[3]).toBe(1n);
    });

    it('buy market order falls back to max price when orderBook throws', async () => {
      mocks.orderBookRepo.getOrderBook.mockRejectedValue(
        new Error('network error'),
      );
      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeLimitOrder.mockResolvedValue(makeTx(receipt));

      const result = await service.placeMarketOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        amount: 1n,
        isBuy: true,
      });

      expect(result.success).toBe(true);
      const call = mocks.coreContract.placeLimitOrder.mock.calls[0];
      expect(call[3]).toBe(BigInt(2) ** 96n - 1n);
    });

    it('returns success:false on contract error', async () => {
      mocks.orderBookRepo.getOrderBook.mockResolvedValue({
        asks: [{ price: '1000', amount: '1' }],
        bids: [],
      });
      mocks.coreContract.placeLimitOrder.mockRejectedValue(
        new Error('execution reverted'),
      );

      const result = await service.placeMarketOrder({
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        amount: 1n,
        isBuy: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('execution reverted');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // placeNodeSellOrder
  // ═══════════════════════════════════════════════════════════════════════════

  describe('placeNodeSellOrder', () => {
    it('places a node sell order with the signer as nodeOwner', async () => {
      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.placeNodeSellOrderV2.mockResolvedValue(
        makeTx(receipt),
      );

      const result = await service.placeNodeSellOrder('0xnodehash', {
        baseToken: BASE_TOKEN,
        baseTokenId: 3n,
        quoteToken: QUOTE_TOKEN,
        price: 750n,
        amount: 4n,
        isBuy: false,
        timeInForce: TimeInForce.GTC,
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(ORDER_ID);
      expect(mocks.coreContract.placeNodeSellOrderV2).toHaveBeenCalledWith(
        SIGNER_ADDRESS,
        BASE_TOKEN,
        3n,
        QUOTE_TOKEN,
        750n,
        4n,
        0, // GTC
        0,
      );
    });

    it('returns success:false on revert', async () => {
      mocks.coreContract.placeNodeSellOrderV2.mockRejectedValue(
        new Error('not a node owner'),
      );

      const result = await service.placeNodeSellOrder('0xnodehash', {
        baseToken: BASE_TOKEN,
        baseTokenId: 1n,
        quoteToken: QUOTE_TOKEN,
        price: 100n,
        amount: 1n,
        isBuy: false,
        timeInForce: TimeInForce.GTC,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a node owner');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // cancelOrder / cancelOrders
  // ═══════════════════════════════════════════════════════════════════════════

  describe('cancelOrder', () => {
    it('cancels a single order and returns transaction hash', async () => {
      const receipt = makeReceipt();
      mocks.coreContract.cancelOrder.mockResolvedValue(makeTx(receipt));

      const result = await service.cancelOrder(ORDER_ID);

      expect(result.success).toBe(true);
      expect(result.transactionHash).toBe(TX_HASH);
      expect(mocks.coreContract.cancelOrder).toHaveBeenCalledWith(ORDER_ID);
    });

    it('returns success:false on revert', async () => {
      mocks.coreContract.cancelOrder.mockRejectedValue(
        new Error('order not found'),
      );

      const result = await service.cancelOrder(ORDER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toContain('order not found');
    });
  });

  describe('cancelOrders', () => {
    it('cancels multiple orders and returns one result per id', async () => {
      const ids = [ORDER_ID, '0x' + 'ee'.repeat(32)];
      mocks.coreContract.cancelOrders.mockResolvedValue(makeTx(makeReceipt()));

      const results = await service.cancelOrders(ids);

      expect(results).toHaveLength(2);
      results.forEach((r) => {
        expect(r.success).toBe(true);
        expect(r.transactionHash).toBe(TX_HASH);
      });
    });

    it('returns all failures on revert', async () => {
      const ids = [ORDER_ID, '0x' + 'ee'.repeat(32)];
      mocks.coreContract.cancelOrders.mockRejectedValue(
        new Error('batch cancel failed'),
      );

      const results = await service.cancelOrders(ids);

      results.forEach((r) => {
        expect(r.success).toBe(false);
        expect(r.error).toContain('batch cancel failed');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // commitOrder
  // ═══════════════════════════════════════════════════════════════════════════

  describe('commitOrder', () => {
    it('commits an order and extracts commitmentId from event log', async () => {
      const receipt = makeReceipt([makeOrderCommittedLog(COMMITMENT_ID)]);
      mocks.coreContract.commitOrder.mockResolvedValue(makeTx(receipt));

      const MARKET_ID = '0x' + 'aa'.repeat(32);
      const SALT = '0x' + 'bb'.repeat(32);

      const result = await service.commitOrder({
        marketId: MARKET_ID,
        price: 1000n,
        amount: 5n,
        isBuy: true,
        timeInForce: TimeInForce.GTC,
        salt: SALT,
      });

      expect(result.commitmentId).toBe(COMMITMENT_ID);
      expect(mocks.coreContract.commitOrder).toHaveBeenCalledOnce();
    });

    it('throws when no OrderCommitted event in receipt', async () => {
      const receipt = makeReceipt([]); // no logs
      mocks.coreContract.commitOrder.mockResolvedValue(makeTx(receipt));

      await expect(
        service.commitOrder({
          marketId: '0x' + 'aa'.repeat(32),
          price: 100n,
          amount: 1n,
          isBuy: true,
          timeInForce: TimeInForce.GTC,
          salt: '0x' + 'bb'.repeat(32),
        }),
      ).rejects.toThrow('Commitment ID not found in receipt');
    });

    it('throws on contract error', async () => {
      mocks.coreContract.commitOrder.mockRejectedValue(
        new Error('commitment already exists'),
      );

      await expect(
        service.commitOrder({
          marketId: '0x' + 'aa'.repeat(32),
          price: 100n,
          amount: 1n,
          isBuy: true,
          timeInForce: TimeInForce.GTC,
          salt: '0x' + 'bb'.repeat(32),
        }),
      ).rejects.toThrow('commitment already exists');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // revealOrder
  // ═══════════════════════════════════════════════════════════════════════════

  describe('revealOrder', () => {
    const revealParams = {
      commitmentId: COMMITMENT_ID,
      baseToken: BASE_TOKEN,
      baseTokenId: 1n,
      quoteToken: QUOTE_TOKEN,
      price: 1000n,
      amount: 5n,
      isBuy: true,
      timeInForce: TimeInForce.GTC,
      salt: '0x' + 'ff'.repeat(32),
    };

    it('reveals a buy order and returns orderId', async () => {
      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.revealOrder.mockResolvedValue(makeTx(receipt));

      const result = await service.revealOrder(revealParams);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(ORDER_ID);
    });

    it('triggers ERC1155 approval for sell reveal when not approved', async () => {
      mocks.baseTokenContract.isApprovedForAll.mockResolvedValue(false);
      mocks.baseTokenContract.setApprovalForAll.mockResolvedValue(
        makeTx(makeReceipt()),
      );
      const receipt = makeReceipt([makeOrderCreatedLog(ORDER_ID)]);
      mocks.coreContract.revealOrder.mockResolvedValue(makeTx(receipt));

      await service.revealOrder({ ...revealParams, isBuy: false });

      expect(mocks.baseTokenContract.setApprovalForAll).toHaveBeenCalledWith(
        DIAMOND,
        true,
      );
    });

    it('returns success:false on revert', async () => {
      mocks.coreContract.revealOrder.mockRejectedValue(
        new Error('reveal window expired'),
      );

      const result = await service.revealOrder(revealParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('reveal window expired');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // calculateQuoteAmount
  // ═══════════════════════════════════════════════════════════════════════════

  describe('calculateQuoteAmount', () => {
    it('correctly calculates price * amount / 1e18', () => {
      const price = 1000n * 10n ** 18n; // 1000 tokens in 18-dec units
      const amount = 5n;
      expect(service.calculateQuoteAmount(price, amount)).toBe(5000n);
    });

    it('returns 0 for zero price', () => {
      expect(service.calculateQuoteAmount(0n, 100n)).toBe(0n);
    });

    it('returns 0 for zero amount', () => {
      expect(service.calculateQuoteAmount(1000n, 0n)).toBe(0n);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // requiresCommitReveal
  // ═══════════════════════════════════════════════════════════════════════════

  describe('requiresCommitReveal', () => {
    it('returns true when quote amount >= contract threshold', async () => {
      const threshold = (BigInt(5000) * 10n ** 18n).toString();
      mocks.adminContract.getMEVConfig.mockResolvedValue([2, threshold]);

      const bigAmount = BigInt(5000) * 10n ** 18n;
      expect(await service.requiresCommitReveal(bigAmount)).toBe(true);
    });

    it('returns false when quote amount < contract threshold', async () => {
      const threshold = (BigInt(10000) * 10n ** 18n).toString();
      mocks.adminContract.getMEVConfig.mockResolvedValue([2, threshold]);

      const smallAmount = 1n;
      expect(await service.requiresCommitReveal(smallAmount)).toBe(false);
    });

    it('falls back to 10,000 token default threshold when getMEVConfig fails', async () => {
      mocks.adminContract.getMEVConfig.mockRejectedValue(
        new Error('not initialised'),
      );

      const aboveDefault = BigInt(10001) * 10n ** 18n;
      expect(await service.requiresCommitReveal(aboveDefault)).toBe(true);

      const belowDefault = BigInt(9999) * 10n ** 18n;
      expect(await service.requiresCommitReveal(belowDefault)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getFeeConfig
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getFeeConfig', () => {
    it('returns parsed fee config from contract', async () => {
      mocks.adminContract.getFeeConfig.mockResolvedValue([
        30,
        10,
        20,
        '0xfeeRecipient',
      ]);

      const config = await service.getFeeConfig();

      expect(config.takerFeeBps).toBe(30);
      expect(config.makerFeeBps).toBe(10);
      expect(config.lpFeeBps).toBe(20);
      expect(config.feeRecipient).toBe('0xfeeRecipient');
    });

    it('returns hardcoded defaults on contract failure', async () => {
      mocks.adminContract.getFeeConfig.mockRejectedValue(new Error('reverted'));

      const config = await service.getFeeConfig();

      expect(config.takerFeeBps).toBe(30);
      expect(config.makerFeeBps).toBe(10);
      expect(config.lpFeeBps).toBe(20);
      expect(config.feeRecipient).toBe(ethers.ZeroAddress);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getMEVConfig
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getMEVConfig', () => {
    it('returns parsed MEV config from contract', async () => {
      const threshold = (BigInt(50000) * 10n ** 18n).toString();
      mocks.adminContract.getMEVConfig.mockResolvedValue([3, threshold]);

      const config = await service.getMEVConfig();

      expect(config.minRevealDelay).toBe(3);
      expect(config.commitmentThreshold).toBe(threshold);
    });

    it('returns defaults when contract call fails', async () => {
      mocks.adminContract.getMEVConfig.mockRejectedValue(new Error('paused'));

      const config = await service.getMEVConfig();

      expect(config.minRevealDelay).toBe(2);
      expect(config.commitmentThreshold).toBe(
        (BigInt(10000) * 10n ** 18n).toString(),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // isPaused
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isPaused', () => {
    it('returns true when contract is paused', async () => {
      mocks.adminContract.isPaused.mockResolvedValue(true);
      expect(await service.isPaused()).toBe(true);
    });

    it('returns false when contract is not paused', async () => {
      mocks.adminContract.isPaused.mockResolvedValue(false);
      expect(await service.isPaused()).toBe(false);
    });

    it('returns false on contract error (safe default)', async () => {
      mocks.adminContract.isPaused.mockRejectedValue(new Error('not init'));
      expect(await service.isPaused()).toBe(false);
    });
  });
});
