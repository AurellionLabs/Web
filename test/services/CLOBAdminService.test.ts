/**
 * @file test/services/CLOBAdminService.test.ts
 * @description Vitest unit tests for CLOBV2Service admin/config methods:
 *   getFeeConfig, getMEVConfig, isPaused, requiresCommitReveal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ethers } from 'ethers';

// ─── Hoisted mock objects ─────────────────────────────────────────────────────
// Use vi.hoisted so these are available in vi.mock() factory callbacks

const mocks = vi.hoisted(() => {
  const adminContract = {
    getFeeConfig: vi.fn(),
    getMEVConfig: vi.fn(),
    isPaused: vi.fn(),
    connect: vi.fn(),
  };
  const coreContract = {
    placeLimitOrder: vi.fn(),
    cancelOrder: vi.fn(),
    connect: vi.fn(),
  };
  const repoCtx = {
    getSigner: vi.fn(),
    getProvider: vi.fn(),
    getSignerAddress: vi.fn(),
  };
  return { adminContract, coreContract, repoCtx };
});

vi.mock('@/infrastructure/contexts/repository-context', () => ({
  RepositoryContext: {
    getInstance: () => mocks.repoCtx,
  },
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_CLOB_V2_DIAMOND_ADDRESS:
    '0xd1a0000000000000000000000000000000000001',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xd1a0000000000000000000000000000000000001',
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0xa100000000000000000000000000000000000001',
}));

vi.mock('@/infrastructure/repositories/clob-v2-repository', () => ({
  clobV2Repository: { getOrderBook: vi.fn(), getBestPrices: vi.fn() },
}));

vi.mock('ethers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ethers')>();
  const MockContract = vi
    .fn()
    .mockImplementation((_addr: string, abi: unknown[]) => {
      const isAdmin =
        Array.isArray(abi) &&
        abi.some((f) => typeof f === 'string' && f.includes('getFeeConfig'));
      const inst = isAdmin ? mocks.adminContract : mocks.coreContract;
      inst.connect = vi.fn().mockReturnValue(inst);
      return inst;
    });
  return { ...actual, ethers: { ...actual.ethers, Contract: MockContract } };
});

// ─── Import after mocks ───────────────────────────────────────────────────────
import { CLOBV2Service } from '@/infrastructure/services/clob-v2-service';

// ─────────────────────────────────────────────────────────────────────────────

function freshService() {
  mocks.repoCtx.getSigner.mockReturnValue({
    getAddress: vi
      .fn()
      .mockResolvedValue('0x1111111111111111111111111111111111111111'),
  });
  mocks.repoCtx.getProvider.mockReturnValue({
    getBlockNumber: vi.fn().mockResolvedValue(100),
  });
  mocks.repoCtx.getSignerAddress.mockResolvedValue(
    '0x1111111111111111111111111111111111111111',
  );
  mocks.adminContract.connect = vi.fn().mockReturnValue(mocks.adminContract);
  mocks.coreContract.connect = vi.fn().mockReturnValue(mocks.coreContract);
  return new CLOBV2Service();
}

describe('CLOBV2Service — Admin / Config', () => {
  // ── getFeeConfig ────────────────────────────────────────────────────────────

  describe('getFeeConfig()', () => {
    it('returns parsed fee config from contract', async () => {
      const service = freshService();
      mocks.adminContract.getFeeConfig.mockResolvedValue([
        30n,
        10n,
        20n,
        '0xFeeRecipient',
      ]);

      const config = await service.getFeeConfig();

      expect(config.takerFeeBps).toBe(30);
      expect(config.makerFeeBps).toBe(10);
      expect(config.lpFeeBps).toBe(20);
      expect(config.feeRecipient).toBe('0xFeeRecipient');
    });

    it('returns hardcoded fallback defaults when contract call fails', async () => {
      const service = freshService();
      mocks.adminContract.getFeeConfig.mockRejectedValue(
        new Error('RPC error'),
      );

      const config = await service.getFeeConfig();

      expect(config.takerFeeBps).toBe(30);
      expect(config.makerFeeBps).toBe(10);
      expect(config.lpFeeBps).toBe(20);
      expect(config.feeRecipient).toBe(ethers.ZeroAddress);
    });

    it('converts BigInt values to Number', async () => {
      const service = freshService();
      mocks.adminContract.getFeeConfig.mockResolvedValue([
        50n,
        25n,
        15n,
        '0xAbc',
      ]);

      const config = await service.getFeeConfig();

      expect(typeof config.takerFeeBps).toBe('number');
      expect(typeof config.makerFeeBps).toBe('number');
      expect(typeof config.lpFeeBps).toBe('number');
    });
  });

  // ── getMEVConfig ────────────────────────────────────────────────────────────

  describe('getMEVConfig()', () => {
    it('returns parsed MEV config from contract', async () => {
      const service = freshService();
      const threshold = BigInt(10000) * BigInt(10 ** 18);
      mocks.adminContract.getMEVConfig.mockResolvedValue([2n, threshold]);

      const config = await service.getMEVConfig();

      expect(config.minRevealDelay).toBe(2);
      expect(config.commitmentThreshold).toBe(threshold.toString());
    });

    it('returns fallback defaults when contract call fails', async () => {
      const service = freshService();
      mocks.adminContract.getMEVConfig.mockRejectedValue(
        new Error('network error'),
      );

      const config = await service.getMEVConfig();

      expect(config.minRevealDelay).toBe(2);
      expect(config.commitmentThreshold).toBe(
        (BigInt(10000) * BigInt(10 ** 18)).toString(),
      );
    });

    it('converts BigInt minRevealDelay to number', async () => {
      const service = freshService();
      mocks.adminContract.getMEVConfig.mockResolvedValue([5n, 1000n]);

      const config = await service.getMEVConfig();

      expect(typeof config.minRevealDelay).toBe('number');
      expect(config.minRevealDelay).toBe(5);
    });
  });

  // ── isPaused ────────────────────────────────────────────────────────────────

  describe('isPaused()', () => {
    it('returns true when contract reports paused', async () => {
      const service = freshService();
      mocks.adminContract.isPaused.mockResolvedValue(true);

      expect(await service.isPaused()).toBe(true);
    });

    it('returns false when contract reports unpaused', async () => {
      const service = freshService();
      mocks.adminContract.isPaused.mockResolvedValue(false);

      expect(await service.isPaused()).toBe(false);
    });

    it('returns false (safe default) when contract call fails', async () => {
      const service = freshService();
      mocks.adminContract.isPaused.mockRejectedValue(new Error('timeout'));

      expect(await service.isPaused()).toBe(false);
    });
  });

  // ── requiresCommitReveal ────────────────────────────────────────────────────

  describe('requiresCommitReveal(quoteAmount)', () => {
    it('returns true when quoteAmount >= commitmentThreshold', async () => {
      const service = freshService();
      const threshold = BigInt(10000) * BigInt(10 ** 18);
      mocks.adminContract.getMEVConfig.mockResolvedValue([2n, threshold]);

      expect(await service.requiresCommitReveal(threshold)).toBe(true);
    });

    it('returns true when quoteAmount > threshold', async () => {
      const service = freshService();
      const threshold = BigInt(10000) * BigInt(10 ** 18);
      mocks.adminContract.getMEVConfig.mockResolvedValue([2n, threshold]);

      expect(await service.requiresCommitReveal(threshold + 1n)).toBe(true);
    });

    it('returns false when quoteAmount < commitmentThreshold', async () => {
      const service = freshService();
      const threshold = BigInt(10000) * BigInt(10 ** 18);
      mocks.adminContract.getMEVConfig.mockResolvedValue([2n, threshold]);

      expect(await service.requiresCommitReveal(threshold - 1n)).toBe(false);
    });

    it('uses fallback threshold (10,000 tokens) when getMEVConfig fails', async () => {
      const service = freshService();
      mocks.adminContract.getMEVConfig.mockRejectedValue(new Error('rpc down'));

      const fallback = BigInt(10000) * BigInt(10 ** 18);

      expect(await service.requiresCommitReveal(fallback - 1n)).toBe(false);
      expect(await service.requiresCommitReveal(fallback)).toBe(true);
    });
  });
});
