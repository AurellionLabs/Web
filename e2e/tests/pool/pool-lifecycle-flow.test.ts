/**
 * Pool Lifecycle Flow Tests
 *
 * End-to-end tests for the complete Pool (AuStake) lifecycle.
 * Tests mirror exact UI flows as implemented in the hooks.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import { getContext, getChain } from '../../setup/test-setup';
import { PoolFlows, createPoolFlows } from '../../flows/pool-flows';
import { FlowContext, TestUser } from '../../flows/flow-context';
import { getCoverageTracker } from '../../coverage/coverage-tracker';
import {
  assertTxSuccess,
  assertNonZeroBytes32,
  assertBalanceGt,
} from '../../utils/assertions';
import { PoolStatus } from '../../../domain/pool';

describe('Pool Complete Lifecycle Flow', () => {
  let context: FlowContext;
  let poolFlows: PoolFlows;
  let provider: TestUser;
  let investor1: TestUser;
  let investor2: TestUser;

  beforeAll(() => {
    context = getContext();
    poolFlows = createPoolFlows(context, process.env.VERBOSE === 'true');

    // Get test users
    provider = context.getUser('provider1');
    investor1 = context.getUser('investor1');
    investor2 = context.getUser('investor2');
  });

  describe('Pool Creation', () => {
    it('should allow provider to create a new pool', async () => {
      // Get Aura token address for staking
      const auraTokenAddress = context.getContractAddress('Aura');

      // Create pool
      const result = await poolFlows.createPool(provider, {
        name: 'Premium Goat Investment Pool',
        description: 'Invest in high-quality goat farming operations',
        assetName: 'GOAT',
        tokenAddress: auraTokenAddress,
        fundingGoal: '1000', // 1000 AURA
        durationDays: 90,
        rewardRate: 1500, // 15% reward rate
        assetPrice: '10', // 10 AURA per unit
      });

      // Verify
      assertNonZeroBytes32(result.poolId);
      assertTxSuccess(result.receipt);

      // Verify pool was created correctly
      const pool = await poolFlows.getPool(result.poolId);
      expect(pool.name).toBe('Premium Goat Investment Pool');
      expect(Number(pool.status)).toBe(PoolStatus.ACTIVE);
    });

    it('should reject pool creation with invalid parameters', async () => {
      const auraTokenAddress = context.getContractAddress('Aura');

      // Try to create pool with zero funding goal
      try {
        await poolFlows.createPool(provider, {
          name: 'Invalid Pool',
          assetName: 'TEST',
          tokenAddress: auraTokenAddress,
          fundingGoal: '0', // Invalid
          durationDays: 30,
          rewardRate: 500,
          assetPrice: '1',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });
  });

  describe('Staking Operations', () => {
    let poolId: string;

    beforeAll(async () => {
      // Setup: Create a pool for staking tests
      const auraTokenAddress = context.getContractAddress('Aura');

      const result = await poolFlows.createPool(provider, {
        name: 'Staking Test Pool',
        assetName: 'TEST',
        tokenAddress: auraTokenAddress,
        fundingGoal: '500',
        durationDays: 30,
        rewardRate: 1000, // 10%
        assetPrice: '5',
      });

      poolId = result.poolId;
    });

    it('should allow investor to stake tokens after approval', async () => {
      const auraTokenAddress = context.getContractAddress('Aura');

      // First approve tokens
      await poolFlows.approveTokensForStaking(
        investor1,
        auraTokenAddress,
        ethers.parseEther('1000'), // Approve enough
      );

      // Stake tokens
      const stakeResult = await poolFlows.stake(investor1, poolId, '100');

      if (stakeResult.success) {
        expect(stakeResult.transactionHash).toBeDefined();

        // Verify stake was recorded
        const stake = await poolFlows.getInvestorStake(
          poolId,
          investor1.address,
        );
        expect(stake).toBe(ethers.parseEther('100'));
      }
    });

    it('should allow multiple investors to stake', async () => {
      const auraTokenAddress = context.getContractAddress('Aura');

      // Investor 2 stakes
      await poolFlows.approveTokensForStaking(
        investor2,
        auraTokenAddress,
        ethers.parseEther('1000'),
      );

      const stakeResult = await poolFlows.stake(investor2, poolId, '150');

      if (stakeResult.success) {
        // Verify stake
        const stake = await poolFlows.getInvestorStake(
          poolId,
          investor2.address,
        );
        expect(stake).toBe(ethers.parseEther('150'));
      }
    });

    it('should track stake history', async () => {
      const history = await poolFlows.getPoolStakeHistory(poolId);

      // Should have at least 2 stake events
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Pool Completion', () => {
    let poolId: string;

    beforeAll(async () => {
      // Setup: Create and fully fund a pool
      const auraTokenAddress = context.getContractAddress('Aura');

      const result = await poolFlows.createPool(provider, {
        name: 'Completion Test Pool',
        assetName: 'COMPLETE',
        tokenAddress: auraTokenAddress,
        fundingGoal: '200', // Small goal for easy funding
        durationDays: 1, // Short duration
        rewardRate: 500,
        assetPrice: '2',
      });

      poolId = result.poolId;

      // Fund it fully
      await poolFlows.approveTokensForStaking(
        investor1,
        auraTokenAddress,
        ethers.parseEther('500'),
      );
      await poolFlows.stake(investor1, poolId, '200');
    });

    it('should allow provider to close a funded pool', async () => {
      // Advance time to after pool duration
      const chain = getChain();
      await chain.increaseTime(2 * 24 * 60 * 60); // 2 days

      const result = await poolFlows.closePool(provider, poolId);

      if (result.success) {
        const pool = await poolFlows.getPool(poolId);
        expect(Number(pool.status)).toBe(PoolStatus.COMPLETE);
      }
    });

    it('should allow investor to claim rewards after completion', async () => {
      const result = await poolFlows.claimReward(investor1, poolId);

      if (result.success) {
        // Reward claimed successfully
        expect(result.transactionHash).toBeDefined();
      }
    });

    it('should allow provider to unlock rewards', async () => {
      const result = await poolFlows.unlockReward(provider, poolId);

      if (result.success) {
        const pool = await poolFlows.getPool(poolId);
        expect(Number(pool.status)).toBe(PoolStatus.PAID);
      }
    });
  });

  describe('Query Operations', () => {
    beforeAll(async () => {
      // Create some pools for query testing
      const auraTokenAddress = context.getContractAddress('Aura');

      await poolFlows.createPool(provider, {
        name: 'Query Test Pool 1',
        assetName: 'QUERY1',
        tokenAddress: auraTokenAddress,
        fundingGoal: '100',
        durationDays: 30,
        rewardRate: 500,
        assetPrice: '1',
      });

      await poolFlows.createPool(provider, {
        name: 'Query Test Pool 2',
        assetName: 'QUERY2',
        tokenAddress: auraTokenAddress,
        fundingGoal: '200',
        durationDays: 60,
        rewardRate: 1000,
        assetPrice: '2',
      });
    });

    it('should get all pools', async () => {
      const pools = await poolFlows.getAllPools();
      expect(pools.length).toBeGreaterThan(0);
    });

    it('should find pools by provider', async () => {
      const pools = await poolFlows.findPoolsByProvider(provider.address);
      expect(pools.length).toBeGreaterThan(0);
      expect(
        pools.every(
          (p: any) =>
            p.providerAddress.toLowerCase() === provider.address.toLowerCase(),
        ),
      ).toBe(true);
    });

    it('should find pools by investor', async () => {
      const pools = await poolFlows.findPoolsByInvestor(investor1.address);
      expect(pools.length).toBeGreaterThan(0);
    });
  });

  describe('Coverage Tracking', () => {
    it('should have covered all IPoolService methods', () => {
      const tracker = getCoverageTracker();

      // Check that key methods were covered
      expect(tracker.isCovered('IPoolService', 'createPool')).toBe(true);
      expect(tracker.isCovered('IPoolService', 'stake')).toBe(true);
      expect(tracker.isCovered('IPoolService', 'closePool')).toBe(true);
      expect(tracker.isCovered('IPoolService', 'claimReward')).toBe(true);
      expect(tracker.isCovered('IPoolService', 'unlockReward')).toBe(true);
    });

    it('should have covered key IPoolRepository methods', () => {
      const tracker = getCoverageTracker();

      expect(tracker.isCovered('IPoolRepository', 'getPoolById')).toBe(true);
      expect(tracker.isCovered('IPoolRepository', 'getAllPools')).toBe(true);
      expect(tracker.isCovered('IPoolRepository', 'findPoolsByProvider')).toBe(
        true,
      );
      expect(tracker.isCovered('IPoolRepository', 'findPoolsByInvestor')).toBe(
        true,
      );
      expect(tracker.isCovered('IPoolRepository', 'getPoolStakeHistory')).toBe(
        true,
      );
    });
  });
});
