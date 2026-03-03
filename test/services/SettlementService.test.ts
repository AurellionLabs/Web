/**
 * @file test/services/SettlementService.test.ts
 * @description Vitest unit tests for SettlementService
 *
 * Covers:
 *  - getTokenBalance (default + custom token address)
 *  - isApprovedForAll (view call)
 *  - setApprovalForAll (write call, awaits tx.wait())
 *  - getPendingOrders (filters zero bytes32)
 *  - selectDestination (burn path, node path, validation error)
 *  - getCustodyBreakdown (empty nodes, balanceOfBatch, fallback to balanceOf)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mock objects ─────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const erc1155Contract = {
    balanceOf: vi.fn(),
    balanceOfBatch: vi.fn(),
  };
  const approvalContract = {
    isApprovedForAll: vi.fn(),
    setApprovalForAll: vi.fn(),
  };
  const settlementContract = {
    getPendingTokenDestinations: vi.fn(),
    selectTokenDestination: vi.fn(),
  };
  const repoCtx = {
    getSigner: vi.fn(),
    getProvider: vi.fn(),
  };
  return { erc1155Contract, approvalContract, settlementContract, repoCtx };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/infrastructure/contexts/repository-context', () => ({
  RepositoryContext: {
    getInstance: () => mocks.repoCtx,
  },
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xDiamondAddress',
}));

vi.mock('ethers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ethers')>();

  const MockContract = vi
    .fn()
    .mockImplementation((_addr: string, abi: unknown[]) => {
      if (!Array.isArray(abi)) return mocks.erc1155Contract;

      const isSettlement = abi.some(
        (f) => typeof f === 'string' && f.includes('selectTokenDestination'),
      );
      const isApproval = abi.some(
        (f) => typeof f === 'string' && f.includes('isApprovedForAll'),
      );

      if (isSettlement) return mocks.settlementContract;
      if (isApproval) return mocks.approvalContract;
      return mocks.erc1155Contract;
    });

  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: MockContract,
    },
  };
});

// ─── Import after mocks ───────────────────────────────────────────────────────

import { SettlementService } from '@/infrastructure/services/settlement-service';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIAMOND = '0xDiamondAddress';
const ACCOUNT = '0x1111111111111111111111111111111111111111';
const OPERATOR = '0x2222222222222222222222222222222222222222';
const TOKEN_ADDRESS = '0x3333333333333333333333333333333333333333';
const ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const ORDER_ID_A = '0x' + 'aa'.repeat(32);
const ORDER_ID_B = '0x' + 'bb'.repeat(32);
const NODE_ID = '0x' + 'cc'.repeat(32);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SettlementService', () => {
  let service: SettlementService;

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.repoCtx.getProvider.mockReturnValue({});
    mocks.repoCtx.getSigner.mockReturnValue({});

    service = new SettlementService();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getTokenBalance
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getTokenBalance()', () => {
    it('returns ERC1155 balance using default Diamond address', async () => {
      mocks.erc1155Contract.balanceOf.mockResolvedValue(100n);

      const balance = await service.getTokenBalance(ACCOUNT, '42');

      expect(balance).toBe(100n);
      expect(mocks.erc1155Contract.balanceOf).toHaveBeenCalledWith(
        ACCOUNT,
        42n,
      );
    });

    it('uses custom tokenAddress when provided', async () => {
      mocks.erc1155Contract.balanceOf.mockResolvedValue(50n);

      const balance = await service.getTokenBalance(
        ACCOUNT,
        '7',
        TOKEN_ADDRESS,
      );

      expect(balance).toBe(50n);
      expect(mocks.erc1155Contract.balanceOf).toHaveBeenCalledWith(ACCOUNT, 7n);
    });

    it('returns 0n for zero balance', async () => {
      mocks.erc1155Contract.balanceOf.mockResolvedValue(0n);

      const balance = await service.getTokenBalance(ACCOUNT, '1');

      expect(balance).toBe(0n);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // isApprovedForAll
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isApprovedForAll()', () => {
    it('returns true when operator is approved', async () => {
      mocks.approvalContract.isApprovedForAll.mockResolvedValue(true);

      const approved = await service.isApprovedForAll(
        ACCOUNT,
        TOKEN_ADDRESS,
        OPERATOR,
      );

      expect(approved).toBe(true);
      expect(mocks.approvalContract.isApprovedForAll).toHaveBeenCalledWith(
        ACCOUNT,
        OPERATOR,
      );
    });

    it('returns false when operator is not approved', async () => {
      mocks.approvalContract.isApprovedForAll.mockResolvedValue(false);

      const approved = await service.isApprovedForAll(
        ACCOUNT,
        TOKEN_ADDRESS,
        OPERATOR,
      );

      expect(approved).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // setApprovalForAll
  // ═══════════════════════════════════════════════════════════════════════════

  describe('setApprovalForAll()', () => {
    it('calls setApprovalForAll with operator and true, then awaits tx.wait()', async () => {
      const waitFn = vi.fn().mockResolvedValue(undefined);
      mocks.approvalContract.setApprovalForAll.mockResolvedValue({
        wait: waitFn,
      });

      await service.setApprovalForAll(TOKEN_ADDRESS, OPERATOR);

      expect(mocks.approvalContract.setApprovalForAll).toHaveBeenCalledWith(
        OPERATOR,
        true,
      );
      expect(waitFn).toHaveBeenCalledOnce();
    });

    it('propagates errors from the contract call', async () => {
      mocks.approvalContract.setApprovalForAll.mockRejectedValue(
        new Error('user rejected'),
      );

      await expect(
        service.setApprovalForAll(TOKEN_ADDRESS, OPERATOR),
      ).rejects.toThrow('user rejected');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getPendingOrders
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getPendingOrders()', () => {
    it('returns order IDs filtering out zero bytes32', async () => {
      mocks.settlementContract.getPendingTokenDestinations.mockResolvedValue([
        ORDER_ID_A,
        ZERO_BYTES32,
        ORDER_ID_B,
        ZERO_BYTES32,
      ]);

      const orders = await service.getPendingOrders(ACCOUNT);

      expect(orders).toEqual([ORDER_ID_A, ORDER_ID_B]);
      expect(
        mocks.settlementContract.getPendingTokenDestinations,
      ).toHaveBeenCalledWith(ACCOUNT);
    });

    it('returns empty array when all entries are zero bytes32', async () => {
      mocks.settlementContract.getPendingTokenDestinations.mockResolvedValue([
        ZERO_BYTES32,
        ZERO_BYTES32,
      ]);

      const orders = await service.getPendingOrders(ACCOUNT);

      expect(orders).toEqual([]);
    });

    it('returns empty array when contract returns empty array', async () => {
      mocks.settlementContract.getPendingTokenDestinations.mockResolvedValue(
        [],
      );

      const orders = await service.getPendingOrders(ACCOUNT);

      expect(orders).toEqual([]);
    });

    it('returns all order IDs when none are zero bytes32', async () => {
      mocks.settlementContract.getPendingTokenDestinations.mockResolvedValue([
        ORDER_ID_A,
        ORDER_ID_B,
      ]);

      const orders = await service.getPendingOrders(ACCOUNT);

      expect(orders).toEqual([ORDER_ID_A, ORDER_ID_B]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // selectDestination
  // ═══════════════════════════════════════════════════════════════════════════

  describe('selectDestination()', () => {
    it('sends burn=true with zero bytes32 as nodeId', async () => {
      const waitFn = vi.fn().mockResolvedValue(undefined);
      mocks.settlementContract.selectTokenDestination.mockResolvedValue({
        wait: waitFn,
      });

      await service.selectDestination(ORDER_ID_A, null, true);

      expect(
        mocks.settlementContract.selectTokenDestination,
      ).toHaveBeenCalledWith(ORDER_ID_A, ZERO_BYTES32, true);
      expect(waitFn).toHaveBeenCalledOnce();
    });

    it('sends burn=false with provided nodeId', async () => {
      const waitFn = vi.fn().mockResolvedValue(undefined);
      mocks.settlementContract.selectTokenDestination.mockResolvedValue({
        wait: waitFn,
      });

      await service.selectDestination(ORDER_ID_A, NODE_ID, false);

      expect(
        mocks.settlementContract.selectTokenDestination,
      ).toHaveBeenCalledWith(ORDER_ID_A, NODE_ID, false);
      expect(waitFn).toHaveBeenCalledOnce();
    });

    it('throws when burn=false and nodeId is null', async () => {
      await expect(
        service.selectDestination(ORDER_ID_A, null, false),
      ).rejects.toThrow('Node ID is required when not burning');
    });

    it('accepts burn=true even when nodeId is provided (uses zero bytes32)', async () => {
      const waitFn = vi.fn().mockResolvedValue(undefined);
      mocks.settlementContract.selectTokenDestination.mockResolvedValue({
        wait: waitFn,
      });

      await service.selectDestination(ORDER_ID_A, NODE_ID, true);

      expect(
        mocks.settlementContract.selectTokenDestination,
      ).toHaveBeenCalledWith(ORDER_ID_A, ZERO_BYTES32, true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getCustodyBreakdown
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getCustodyBreakdown()', () => {
    it('returns walletBalance as inWallet when nodes array is empty', async () => {
      const result = await service.getCustodyBreakdown('1', 500n, []);

      expect(result).toEqual({
        inWallet: 500n,
        nodes: [],
        totalBalance: 500n,
      });
    });

    it('uses balanceOfBatch to fetch node balances', async () => {
      mocks.erc1155Contract.balanceOfBatch.mockResolvedValue([100n, 200n]);

      const nodes = [
        { address: '0xNodeA', location: 'Singapore' },
        { address: '0xNodeB', location: 'London' },
      ];

      const result = await service.getCustodyBreakdown('42', 500n, nodes);

      expect(mocks.erc1155Contract.balanceOfBatch).toHaveBeenCalledWith(
        ['0xNodeA', '0xNodeB'],
        [42n, 42n],
      );
      expect(result.nodes).toEqual([
        { nodeAddress: '0xNodeA', nodeLocation: 'Singapore', amount: 100n },
        { nodeAddress: '0xNodeB', nodeLocation: 'London', amount: 200n },
      ]);
      expect(result.inWallet).toBe(200n); // 500 - 300
      expect(result.totalBalance).toBe(500n);
    });

    it('falls back to individual balanceOf when balanceOfBatch throws', async () => {
      mocks.erc1155Contract.balanceOfBatch.mockRejectedValue(
        new Error('method not found'),
      );
      mocks.erc1155Contract.balanceOf
        .mockResolvedValueOnce(50n)
        .mockResolvedValueOnce(75n);

      const nodes = [
        { address: '0xNodeA', location: 'US-East' },
        { address: '0xNodeB', location: 'US-West' },
      ];

      const result = await service.getCustodyBreakdown('10', 200n, nodes);

      expect(mocks.erc1155Contract.balanceOf).toHaveBeenCalledTimes(2);
      expect(mocks.erc1155Contract.balanceOf).toHaveBeenCalledWith(
        '0xNodeA',
        10n,
      );
      expect(mocks.erc1155Contract.balanceOf).toHaveBeenCalledWith(
        '0xNodeB',
        10n,
      );
      expect(result.nodes).toEqual([
        { nodeAddress: '0xNodeA', nodeLocation: 'US-East', amount: 50n },
        { nodeAddress: '0xNodeB', nodeLocation: 'US-West', amount: 75n },
      ]);
      expect(result.inWallet).toBe(75n); // 200 - 125
      expect(result.totalBalance).toBe(200n);
    });

    it('excludes nodes with zero balance from the result', async () => {
      mocks.erc1155Contract.balanceOfBatch.mockResolvedValue([100n, 0n, 50n]);

      const nodes = [
        { address: '0xNodeA', location: 'Singapore' },
        { address: '0xNodeB', location: 'London' },
        { address: '0xNodeC', location: 'Tokyo' },
      ];

      const result = await service.getCustodyBreakdown('5', 300n, nodes);

      expect(result.nodes).toHaveLength(2);
      expect(result.nodes).toEqual([
        { nodeAddress: '0xNodeA', nodeLocation: 'Singapore', amount: 100n },
        { nodeAddress: '0xNodeC', nodeLocation: 'Tokyo', amount: 50n },
      ]);
      expect(result.inWallet).toBe(150n); // 300 - 150
    });

    it('returns inWallet as 0n when node custody exceeds walletBalance', async () => {
      mocks.erc1155Contract.balanceOfBatch.mockResolvedValue([300n, 400n]);

      const nodes = [
        { address: '0xNodeA', location: 'Singapore' },
        { address: '0xNodeB', location: 'London' },
      ];

      const result = await service.getCustodyBreakdown('1', 200n, nodes);

      expect(result.inWallet).toBe(0n);
      expect(result.totalBalance).toBe(200n);
    });

    it('handles single node correctly', async () => {
      mocks.erc1155Contract.balanceOfBatch.mockResolvedValue([80n]);

      const nodes = [{ address: '0xNodeA', location: 'NYC' }];

      const result = await service.getCustodyBreakdown('99', 100n, nodes);

      expect(result.nodes).toEqual([
        { nodeAddress: '0xNodeA', nodeLocation: 'NYC', amount: 80n },
      ]);
      expect(result.inWallet).toBe(20n);
      expect(result.totalBalance).toBe(100n);
    });
  });
});
