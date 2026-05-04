/**
 * @file test/services/PoolService.test.ts
 * @description Vitest unit tests for PoolService
 *
 * Covers:
 *  - constructor (throws on missing address, instantiates correctly)
 *  - createPool (success, all validation errors, contract error wrapping)
 *  - closePool (success, address mismatch)
 *  - stake (success ERC20 path, invalid amount, signer mismatch, pool not found, exceeds capacity)
 *  - getPoolCapacity (success, pool not found)
 *  - validateStakeAmount (valid, zero amount, not funding, exceeds capacity)
 *  - claimReward (success, signer mismatch)
 *  - unlockReward (success, signer mismatch)
 *  - getPoolWithDynamicData (found, not found)
 *  - getAllPoolsWithDynamicData (empty, multiple)
 *  - getUserPoolsWithDynamicData (success, empty)
 *  - getProviderPoolsWithDynamicData (success)
 *  - getGroupedStakeHistory (all 5 intervals, accumulation, empty)
 *  - calculatePoolDynamicData (progress, time remaining, 24h volume, caps at 100)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mock objects ─────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const stakingContract = {
    createOpportunity: vi.fn(),
    unlockReward: vi.fn(),
    stake: vi.fn(),
    getOpportunity: vi.fn(),
    claimProfits: vi.fn(),
    getAddress: vi.fn().mockResolvedValue('0xDiamond'),
    interface: {
      getEvent: vi.fn().mockReturnValue({ topicHash: '0xTopicHash' }),
      parseLog: vi.fn(),
    },
  };

  const erc20Contract = {
    balanceOf: vi.fn(),
    allowance: vi.fn(),
    approve: vi.fn(),
  };

  const erc1155Contract = {
    balanceOf: vi.fn(),
    isApprovedForAll: vi.fn(),
    setApprovalForAll: vi.fn(),
  };

  const mockSigner = {
    getAddress: vi.fn().mockResolvedValue('0xSigner'),
  };

  const poolRepo = {
    getPoolById: vi.fn(),
    getPoolStakeHistory: vi.fn().mockResolvedValue([]),
    getAllPools: vi.fn().mockResolvedValue([]),
    findPoolsByInvestor: vi.fn().mockResolvedValue([]),
    findPoolsByProvider: vi.fn().mockResolvedValue([]),
  };

  return {
    stakingContract,
    erc20Contract,
    erc1155Contract,
    mockSigner,
    poolRepo,
  };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/contracts', () => ({
  RWYStakingFacet__factory: {
    connect: vi.fn().mockReturnValue(mocks.stakingContract),
  },
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xDiamond',
}));

vi.mock('ethers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ethers')>();

  const MockContract = vi
    .fn()
    .mockImplementation((_addr: string, abi: unknown[]) => {
      if (
        Array.isArray(abi) &&
        abi.some((f) => typeof f === 'string' && f.includes('isApprovedForAll'))
      ) {
        return mocks.erc1155Contract;
      }
      return mocks.erc20Contract;
    });

  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: MockContract,
    },
  };
});

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { PoolService } from '@/infrastructure/services/pool.service';
import { PoolStatus } from '@/domain/pool';
import type { Pool, StakeEvent } from '@/domain/pool';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIAMOND = '0xDiamond';
const SIGNER_ADDR = '0xSigner';
const OTHER_ADDR = '0xOtherAddress';
const POOL_ID = '0x' + 'ab'.repeat(32);
const TX_HASH = '0xTransactionHash';

const validCreationData = {
  name: 'Test Pool',
  description: 'A test pool',
  assetName: 'Gold',
  tokenAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  fundingGoal: '100',
  durationDays: 30,
  rewardRate: '500',
  assetPrice: '2000',
  minSalePrice: '1800',
  collateralAmount: '10',
};

function makePool(overrides: Partial<Pool> = {}): Pool {
  return {
    id: POOL_ID,
    name: 'Test Pool',
    description: 'A test pool',
    assetName: 'Gold',
    tokenAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    providerAddress: SIGNER_ADDR as `0x${string}`,
    fundingGoal: '100000000000000000000',
    totalValueLocked: '50000000000000000000',
    startDate: Math.floor(Date.now() / 1000) - 3600,
    durationDays: 30,
    rewardRate: 5.0,
    assetPrice: '1',
    status: PoolStatus.ACTIVE,
    ...overrides,
  };
}

function makeTxReceipt(logs: unknown[] = []): {
  hash: string;
  logs: unknown[];
} {
  return { hash: TX_HASH, logs };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PoolService', () => {
  let service: PoolService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockSigner.getAddress.mockResolvedValue(SIGNER_ADDR);
    service = new PoolService(
      {} as any,
      mocks.mockSigner as any,
      mocks.poolRepo as any,
      DIAMOND,
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // constructor
  // ═══════════════════════════════════════════════════════════════════════════

  describe('constructor', () => {
    it('throws if contractAddress is empty', () => {
      expect(
        () =>
          new PoolService(
            {} as any,
            mocks.mockSigner as any,
            mocks.poolRepo as any,
            '',
          ),
      ).toThrow('[PoolService] Pool contract address is undefined');
    });

    it('instantiates correctly with a valid address', () => {
      expect(service).toBeInstanceOf(PoolService);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createPool
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createPool()', () => {
    it('creates a pool and returns poolId and transactionHash', async () => {
      const receipt = makeTxReceipt([{ topics: ['0xTopicHash'], data: '0x' }]);
      mocks.stakingContract.createOpportunity.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });
      mocks.stakingContract.interface.parseLog.mockReturnValue({
        args: { id: POOL_ID },
      });

      const result = await service.createPool(
        validCreationData,
        SIGNER_ADDR as `0x${string}`,
      );

      expect(result.poolId).toBe(POOL_ID);
      expect(result.transactionHash).toBe(TX_HASH);
      expect(mocks.stakingContract.createOpportunity).toHaveBeenCalledOnce();
    });

    it('throws when pool name is missing', async () => {
      await expect(
        service.createPool(
          { ...validCreationData, name: '' },
          SIGNER_ADDR as `0x${string}`,
        ),
      ).rejects.toThrow('Failed to create pool: Pool name is required');
    });

    it('throws when description is missing', async () => {
      await expect(
        service.createPool(
          { ...validCreationData, description: '' },
          SIGNER_ADDR as `0x${string}`,
        ),
      ).rejects.toThrow('Failed to create pool: Pool description is required');
    });

    it('throws when assetName is missing', async () => {
      await expect(
        service.createPool(
          { ...validCreationData, assetName: '' },
          SIGNER_ADDR as `0x${string}`,
        ),
      ).rejects.toThrow('Failed to create pool: Asset name is required');
    });

    it('throws when tokenAddress is invalid', async () => {
      await expect(
        service.createPool(
          {
            ...validCreationData,
            tokenAddress: 'not-an-address' as `0x${string}`,
          },
          SIGNER_ADDR as `0x${string}`,
        ),
      ).rejects.toThrow(
        'Failed to create pool: Valid token address is required',
      );
    });

    it('throws when fundingGoal is zero', async () => {
      await expect(
        service.createPool(
          { ...validCreationData, fundingGoal: '0' },
          SIGNER_ADDR as `0x${string}`,
        ),
      ).rejects.toThrow(
        'Failed to create pool: Funding goal must be greater than 0',
      );
    });

    it('throws when assetPrice is zero', async () => {
      await expect(
        service.createPool(
          { ...validCreationData, assetPrice: '0' },
          SIGNER_ADDR as `0x${string}`,
        ),
      ).rejects.toThrow(
        'Failed to create pool: Asset price must be greater than 0',
      );
    });

    it('throws when durationDays is zero', async () => {
      await expect(
        service.createPool(
          { ...validCreationData, durationDays: 0 },
          SIGNER_ADDR as `0x${string}`,
        ),
      ).rejects.toThrow(
        'Failed to create pool: Duration must be greater than 0 days',
      );
    });

    it('throws when rewardRate exceeds 10000 bps', async () => {
      await expect(
        service.createPool(
          { ...validCreationData, rewardRate: '10001' },
          SIGNER_ADDR as `0x${string}`,
        ),
      ).rejects.toThrow(
        'Failed to create pool: Reward rate must be between 0 and 10000 basis points',
      );
    });

    it('wraps contract errors in a descriptive message', async () => {
      mocks.stakingContract.createOpportunity.mockRejectedValue(
        new Error('execution reverted'),
      );

      await expect(
        service.createPool(validCreationData, SIGNER_ADDR as `0x${string}`),
      ).rejects.toThrow('Failed to create pool: execution reverted');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // closePool
  // ═══════════════════════════════════════════════════════════════════════════

  describe('closePool()', () => {
    it('returns the transaction hash on success', async () => {
      const receipt = makeTxReceipt();
      mocks.stakingContract.unlockReward.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const hash = await service.closePool(
        POOL_ID,
        SIGNER_ADDR as `0x${string}`,
      );

      expect(hash).toBe(TX_HASH);
      expect(mocks.stakingContract.unlockReward).toHaveBeenCalledWith(POOL_ID);
    });

    it('throws when signer does not match providerAddress', async () => {
      await expect(
        service.closePool(POOL_ID, OTHER_ADDR as `0x${string}`),
      ).rejects.toThrow(
        'Failed to close pool: Only the pool provider can close the pool',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // stake
  // ═══════════════════════════════════════════════════════════════════════════

  describe('stake()', () => {
    const mockOpportunity = {
      id: POOL_ID,
      targetAmount: BigInt('1000000000000000000000'),
      stakedAmount: BigInt('100000000000000000000'),
      inputToken: '0x1234567890123456789012345678901234567890',
      inputTokenId: 0n,
    };

    beforeEach(() => {
      mocks.stakingContract.getOpportunity.mockResolvedValue(mockOpportunity);
      mocks.erc20Contract.balanceOf.mockResolvedValue(
        BigInt('500000000000000000000'),
      );
      mocks.erc20Contract.allowance.mockResolvedValue(BigInt('0'));
      mocks.erc20Contract.approve.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(undefined),
      });
    });

    it('stakes successfully via ERC20 path and returns tx hash', async () => {
      const receipt = makeTxReceipt();
      mocks.stakingContract.stake.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const hash = await service.stake(
        POOL_ID,
        '1.0',
        SIGNER_ADDR as `0x${string}`,
      );

      expect(hash).toBe(TX_HASH);
      expect(mocks.stakingContract.stake).toHaveBeenCalledOnce();
    });

    it('throws when amount is zero', async () => {
      await expect(
        service.stake(POOL_ID, '0', SIGNER_ADDR as `0x${string}`),
      ).rejects.toThrow('Invalid stake amount');
    });

    it('throws when signer does not match investor address', async () => {
      await expect(
        service.stake(POOL_ID, '1.0', OTHER_ADDR as `0x${string}`),
      ).rejects.toThrow('Signer must match investor address');
    });

    it('throws when pool is not found (zero hash)', async () => {
      mocks.stakingContract.getOpportunity.mockResolvedValue({
        id: '0x0000000000000000000000000000000000000000000000000000000000000000',
      });

      await expect(
        service.stake(POOL_ID, '1.0', SIGNER_ADDR as `0x${string}`),
      ).rejects.toThrow('Pool not found');
    });

    it('throws when stake amount exceeds remaining capacity', async () => {
      mocks.stakingContract.getOpportunity.mockResolvedValue({
        ...mockOpportunity,
        targetAmount: BigInt('100000000000000000000'),
        stakedAmount: BigInt('99000000000000000000'),
      });

      await expect(
        service.stake(POOL_ID, '2.0', SIGNER_ADDR as `0x${string}`),
      ).rejects.toThrow('Stake amount exceeds remaining pool capacity');
    });

    it('approves ERC20 tokens when allowance is insufficient', async () => {
      const receipt = makeTxReceipt();
      mocks.stakingContract.stake.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      await service.stake(POOL_ID, '1.0', SIGNER_ADDR as `0x${string}`);

      expect(mocks.erc20Contract.approve).toHaveBeenCalledOnce();
    });

    it('skips ERC20 approval when allowance is already sufficient', async () => {
      mocks.erc20Contract.allowance.mockResolvedValue(
        BigInt('999000000000000000000'),
      );
      const receipt = makeTxReceipt();
      mocks.stakingContract.stake.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      await service.stake(POOL_ID, '1.0', SIGNER_ADDR as `0x${string}`);

      expect(mocks.erc20Contract.approve).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getPoolCapacity
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getPoolCapacity()', () => {
    it('returns correct capacity data for a valid pool', async () => {
      mocks.stakingContract.getOpportunity.mockResolvedValue({
        id: POOL_ID,
        targetAmount: BigInt('1000000000000000000000'),
        stakedAmount: BigInt('400000000000000000000'),
        fundingDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        status: 1n,
      });

      const capacity = await service.getPoolCapacity(POOL_ID);

      expect(capacity.targetAmount).toBe('1000000000000000000000');
      expect(capacity.stakedAmount).toBe('400000000000000000000');
      expect(capacity.remainingCapacity).toBe('600000000000000000000');
      expect(capacity.isFunding).toBe(true);
      expect(capacity.status).toBe(1);
    });

    it('returns isFunding=false when status is not 1', async () => {
      mocks.stakingContract.getOpportunity.mockResolvedValue({
        id: POOL_ID,
        targetAmount: BigInt('1000000000000000000000'),
        stakedAmount: BigInt('1000000000000000000000'),
        fundingDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        status: 2n,
      });

      const capacity = await service.getPoolCapacity(POOL_ID);

      expect(capacity.isFunding).toBe(false);
    });

    it('throws when pool is not found', async () => {
      mocks.stakingContract.getOpportunity.mockResolvedValue({
        id: '0x0000000000000000000000000000000000000000000000000000000000000000',
      });

      await expect(service.getPoolCapacity(POOL_ID)).rejects.toThrow(
        'Failed to get pool capacity: Pool not found',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // validateStakeAmount
  // ═══════════════════════════════════════════════════════════════════════════

  describe('validateStakeAmount()', () => {
    // The service does BigInt(Date.now() / 1000) which requires the result to be
    // an integer. We pin Date.now() to an exact multiple of 1000 to avoid the
    // "cannot convert float to BigInt" RangeError.
    const PINNED_NOW_MS = 1_700_000_000_000; // 1,700,000,000 seconds — an integer when divided by 1000
    const FUTURE_DEADLINE = 1_700_000_000 + 86_400; // 1 day after pinned time

    beforeEach(() => {
      vi.spyOn(Date, 'now').mockReturnValue(PINNED_NOW_MS);
      mocks.stakingContract.getOpportunity.mockResolvedValue({
        id: POOL_ID,
        targetAmount: BigInt('1000000000000000000000'),
        stakedAmount: BigInt('100000000000000000000'),
        fundingDeadline: BigInt(FUTURE_DEADLINE),
        status: 1n,
      });
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('returns isValid=true for a valid amount within capacity', async () => {
      const result = await service.validateStakeAmount(POOL_ID, '1.0');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns isValid=false for zero amount', async () => {
      const result = await service.validateStakeAmount(POOL_ID, '0');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch('Invalid stake amount');
    });

    it('returns isValid=false when pool is not in funding status', async () => {
      mocks.stakingContract.getOpportunity.mockResolvedValue({
        id: POOL_ID,
        targetAmount: BigInt('1000000000000000000000'),
        stakedAmount: BigInt('100000000000000000000'),
        fundingDeadline: BigInt(FUTURE_DEADLINE),
        status: 2n,
      });

      const result = await service.validateStakeAmount(POOL_ID, '1.0');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch('not accepting stakes');
    });

    it('returns isValid=false when funding deadline has passed', async () => {
      mocks.stakingContract.getOpportunity.mockResolvedValue({
        id: POOL_ID,
        targetAmount: BigInt('1000000000000000000000'),
        stakedAmount: BigInt('100000000000000000000'),
        fundingDeadline: BigInt(1_700_000_000 - 1), // 1 second in the past
        status: 1n,
      });

      const result = await service.validateStakeAmount(POOL_ID, '1.0');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch('deadline has passed');
    });

    it('returns isValid=false when stake exceeds remaining capacity', async () => {
      // remaining = 1000 - 100 = 900 ETH; request 1000 ETH → exceeds
      const result = await service.validateStakeAmount(POOL_ID, '1000.0');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch('exceeds remaining pool capacity');
    });

    it('includes remainingCapacity in the response for a valid amount', async () => {
      const result = await service.validateStakeAmount(POOL_ID, '1.0');
      expect(result.remainingCapacity).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // claimReward
  // ═══════════════════════════════════════════════════════════════════════════

  describe('claimReward()', () => {
    it('returns tx hash on success', async () => {
      const receipt = makeTxReceipt();
      mocks.stakingContract.claimProfits.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const hash = await service.claimReward(
        POOL_ID,
        SIGNER_ADDR as `0x${string}`,
      );

      expect(hash).toBe(TX_HASH);
      expect(mocks.stakingContract.claimProfits).toHaveBeenCalledWith(POOL_ID);
    });

    it('throws when signer does not match claimant address', async () => {
      await expect(
        service.claimReward(POOL_ID, OTHER_ADDR as `0x${string}`),
      ).rejects.toThrow(
        'Failed to claim reward: Signer must match claimant address',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // unlockReward
  // ═══════════════════════════════════════════════════════════════════════════

  describe('unlockReward()', () => {
    beforeEach(() => {
      mocks.stakingContract.getOpportunity.mockResolvedValue({
        id: POOL_ID,
        targetAmount: BigInt('1000000000000000000000'),
        inputToken: '0x1234567890123456789012345678901234567890',
      });
      mocks.erc20Contract.allowance.mockResolvedValue(BigInt('0'));
      mocks.erc20Contract.approve.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(undefined),
      });
    });

    it('throws when signer does not match providerAddress', async () => {
      await expect(
        service.unlockReward(POOL_ID, OTHER_ADDR as `0x${string}`),
      ).rejects.toThrow(
        'Failed to unlock reward: Only the pool provider can unlock rewards',
      );
    });

    it('returns tx hash on success', async () => {
      const receipt = makeTxReceipt();
      mocks.stakingContract.unlockReward.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const hash = await service.unlockReward(
        POOL_ID,
        SIGNER_ADDR as `0x${string}`,
      );

      expect(hash).toBe(TX_HASH);
      expect(mocks.stakingContract.unlockReward).toHaveBeenCalledWith(POOL_ID);
    });

    it('throws when pool is not found', async () => {
      mocks.stakingContract.getOpportunity.mockResolvedValue({
        id: '0x0000000000000000000000000000000000000000000000000000000000000000',
      });

      await expect(
        service.unlockReward(POOL_ID, SIGNER_ADDR as `0x${string}`),
      ).rejects.toThrow('Failed to unlock reward: Pool not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getPoolWithDynamicData
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getPoolWithDynamicData()', () => {
    it('returns null when pool does not exist in repository', async () => {
      mocks.poolRepo.getPoolById.mockResolvedValue(null);

      const result = await service.getPoolWithDynamicData('nonexistent');

      expect(result).toBeNull();
    });

    it('returns pool merged with dynamic data', async () => {
      const pool = makePool();
      mocks.poolRepo.getPoolById.mockResolvedValue(pool);
      mocks.poolRepo.getPoolStakeHistory.mockResolvedValue([]);

      const result = await service.getPoolWithDynamicData(POOL_ID);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(POOL_ID);
      expect(result).toHaveProperty('progressPercentage');
      expect(result).toHaveProperty('timeRemainingSeconds');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getAllPoolsWithDynamicData
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getAllPoolsWithDynamicData()', () => {
    it('returns empty array when no pools exist', async () => {
      mocks.poolRepo.getAllPools.mockResolvedValue([]);

      const result = await service.getAllPoolsWithDynamicData();

      expect(result).toEqual([]);
    });

    it('returns all pools each enriched with dynamic data', async () => {
      const pools = [makePool({ id: '0x01' }), makePool({ id: '0x02' })];
      mocks.poolRepo.getAllPools.mockResolvedValue(pools);
      mocks.poolRepo.getPoolStakeHistory.mockResolvedValue([]);

      const result = await service.getAllPoolsWithDynamicData();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('progressPercentage');
      expect(result[1]).toHaveProperty('timeRemainingSeconds');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getUserPoolsWithDynamicData
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getUserPoolsWithDynamicData()', () => {
    it('returns pools for a given investor address', async () => {
      const pools = [makePool()];
      mocks.poolRepo.findPoolsByInvestor.mockResolvedValue(pools);
      mocks.poolRepo.getPoolStakeHistory.mockResolvedValue([]);

      const result = await service.getUserPoolsWithDynamicData(
        SIGNER_ADDR as `0x${string}`,
      );

      expect(result).toHaveLength(1);
      expect(mocks.poolRepo.findPoolsByInvestor).toHaveBeenCalledWith(
        SIGNER_ADDR,
      );
    });

    it('returns empty array when investor has no pools', async () => {
      mocks.poolRepo.findPoolsByInvestor.mockResolvedValue([]);

      const result = await service.getUserPoolsWithDynamicData(
        SIGNER_ADDR as `0x${string}`,
      );

      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getProviderPoolsWithDynamicData
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getProviderPoolsWithDynamicData()', () => {
    it('returns pools for a given provider address', async () => {
      const pools = [makePool()];
      mocks.poolRepo.findPoolsByProvider.mockResolvedValue(pools);
      mocks.poolRepo.getPoolStakeHistory.mockResolvedValue([]);

      const result = await service.getProviderPoolsWithDynamicData(
        SIGNER_ADDR as `0x${string}`,
      );

      expect(result).toHaveLength(1);
      expect(mocks.poolRepo.findPoolsByProvider).toHaveBeenCalledWith(
        SIGNER_ADDR,
      );
    });

    it('returns empty array when provider has no pools', async () => {
      mocks.poolRepo.findPoolsByProvider.mockResolvedValue([]);

      const result = await service.getProviderPoolsWithDynamicData(
        SIGNER_ADDR as `0x${string}`,
      );

      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getGroupedStakeHistory
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getGroupedStakeHistory()', () => {
    const now = Math.floor(Date.now() / 1000);
    const stakeEvents: StakeEvent[] = [
      {
        poolId: POOL_ID,
        stakerAddress: SIGNER_ADDR as `0x${string}`,
        amount: '1000000000000000000',
        timestamp: now - 3600,
      },
      {
        poolId: POOL_ID,
        stakerAddress: SIGNER_ADDR as `0x${string}`,
        amount: '2000000000000000000',
        timestamp: now - 7200,
      },
    ];

    beforeEach(() => {
      mocks.poolRepo.getPoolStakeHistory.mockResolvedValue(stakeEvents);
    });

    it('groups stakes by hour for 1H interval', async () => {
      const grouped = await service.getGroupedStakeHistory(POOL_ID, '1H');
      expect(grouped.hourly).toBeDefined();
      expect(Object.keys(grouped.hourly!).length).toBeGreaterThanOrEqual(1);
    });

    it('groups stakes by day for 1D interval', async () => {
      const grouped = await service.getGroupedStakeHistory(POOL_ID, '1D');
      expect(grouped.daily).toBeDefined();
      expect(Object.keys(grouped.daily!).length).toBeGreaterThanOrEqual(1);
    });

    it('groups stakes by week for 1W interval', async () => {
      const grouped = await service.getGroupedStakeHistory(POOL_ID, '1W');
      expect(grouped.weekly).toBeDefined();
    });

    it('groups stakes by month for 1M interval', async () => {
      const grouped = await service.getGroupedStakeHistory(POOL_ID, '1M');
      expect(grouped.monthly).toBeDefined();
    });

    it('groups stakes by year for 1Y interval', async () => {
      const grouped = await service.getGroupedStakeHistory(POOL_ID, '1Y');
      expect(grouped.yearly).toBeDefined();
    });

    it('returns empty grouped object when no stake history', async () => {
      mocks.poolRepo.getPoolStakeHistory.mockResolvedValue([]);

      const grouped = await service.getGroupedStakeHistory(POOL_ID, '1D');

      expect(grouped.daily).toBeUndefined();
    });

    it('accumulates amounts for multiple stakes in the same day', async () => {
      const todayTs = Math.floor(Date.now() / 1000);
      const todayStakes: StakeEvent[] = [
        {
          poolId: POOL_ID,
          stakerAddress: SIGNER_ADDR as `0x${string}`,
          amount: '1000',
          timestamp: todayTs - 100,
        },
        {
          poolId: POOL_ID,
          stakerAddress: SIGNER_ADDR as `0x${string}`,
          amount: '2000',
          timestamp: todayTs - 200,
        },
      ];
      mocks.poolRepo.getPoolStakeHistory.mockResolvedValue(todayStakes);

      const grouped = await service.getGroupedStakeHistory(POOL_ID, '1D');
      const key = new Date(todayTs * 1000).toISOString().substring(0, 10);

      expect(grouped.daily![key]).toBe('3000');
    });

    it('queries the repository with the correct poolId', async () => {
      await service.getGroupedStakeHistory(POOL_ID, '1D');
      expect(mocks.poolRepo.getPoolStakeHistory).toHaveBeenCalledWith(POOL_ID);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // calculatePoolDynamicData
  // ═══════════════════════════════════════════════════════════════════════════

  describe('calculatePoolDynamicData()', () => {
    it('calculates positive progress percentage', async () => {
      const pool = makePool({
        fundingGoal: '100',
        totalValueLocked: '50000000000000000000',
        assetPrice: '1',
      });

      const result = await service.calculatePoolDynamicData(pool, []);

      expect(result.progressPercentage).toBeGreaterThanOrEqual(0);
      expect(result.progressPercentage).toBeLessThanOrEqual(100);
    });

    it('returns positive timeRemainingSeconds for active pool', async () => {
      const pool = makePool({
        startDate: Math.floor(Date.now() / 1000) - 3600,
        durationDays: 30,
      });

      const result = await service.calculatePoolDynamicData(pool, []);

      expect(result.timeRemainingSeconds).toBeGreaterThan(0);
    });

    it('returns 0 timeRemainingSeconds when pool has ended', async () => {
      const pool = makePool({
        startDate: Math.floor(Date.now() / 1000) - 35 * 24 * 3600,
        durationDays: 30,
      });

      const result = await service.calculatePoolDynamicData(pool, []);

      expect(result.timeRemainingSeconds).toBe(0);
    });

    it('calculates 24h volume from recent stake history', async () => {
      const nowTs = Math.floor(Date.now() / 1000);
      const recentStakes: StakeEvent[] = [
        {
          poolId: POOL_ID,
          stakerAddress: SIGNER_ADDR as `0x${string}`,
          amount: '1000',
          timestamp: nowTs - 3600,
        },
        {
          poolId: POOL_ID,
          stakerAddress: SIGNER_ADDR as `0x${string}`,
          amount: '500',
          timestamp: nowTs - 7200,
        },
      ];

      const result = await service.calculatePoolDynamicData(
        makePool(),
        recentStakes,
      );

      expect(result.volume24h).toBe('1500');
    });

    it('fetches stake history from repository when not provided', async () => {
      mocks.poolRepo.getPoolStakeHistory.mockResolvedValue([]);
      const pool = makePool();

      await service.calculatePoolDynamicData(pool);

      expect(mocks.poolRepo.getPoolStakeHistory).toHaveBeenCalledWith(pool.id);
    });

    it('caps progressPercentage at 100 when TVL far exceeds goal', async () => {
      const pool = makePool({
        fundingGoal: '1',
        totalValueLocked: '999000000000000000000',
        assetPrice: '10',
      });

      const result = await service.calculatePoolDynamicData(pool, []);

      expect(result.progressPercentage).toBe(100);
    });

    it('returns tvl and fundingGoal from pool entity', async () => {
      const pool = makePool();

      const result = await service.calculatePoolDynamicData(pool, []);

      expect(result.tvl).toBe(pool.totalValueLocked);
      expect(result.fundingGoal).toBe(pool.fundingGoal);
    });

    it('returns reward matching pool rewardRate', async () => {
      const pool = makePool({ rewardRate: 7.5 });

      const result = await service.calculatePoolDynamicData(pool, []);

      expect(result.reward).toBe(7.5);
    });
  });
});
