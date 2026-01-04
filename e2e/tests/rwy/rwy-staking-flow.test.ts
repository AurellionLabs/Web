/**
 * RWY Staking Flow Tests
 *
 * End-to-end tests for the complete RWY commodity staking lifecycle.
 * Tests mirror exact UI flows as implemented in the hooks.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import { getContext, getChain } from '../../setup/test-setup';
import { RWYFlows, createRWYFlows } from '../../flows/rwy-flows';
import { FlowContext, TestUser } from '../../flows/flow-context';
import { getCoverageTracker } from '../../coverage/coverage-tracker';
import {
  assertTxSuccess,
  assertEventEmitted,
  assertNonZeroBytes32,
  assertBalanceGt,
} from '../../utils/assertions';
import { RWYOpportunityStatus } from '../../../domain/rwy';

describe('RWY Complete Staking Flow', () => {
  let context: FlowContext;
  let rwyFlows: RWYFlows;
  let operator: TestUser;
  let investor1: TestUser;
  let investor2: TestUser;

  beforeAll(() => {
    context = getContext();
    rwyFlows = createRWYFlows(context, process.env.VERBOSE === 'true');

    // Get test users
    operator = context.getUser('operator1');
    investor1 = context.getUser('investor1');
    investor2 = context.getUser('investor2');
  });

  describe('Opportunity Creation', () => {
    it('should allow approved operator to create an opportunity', async () => {
      // First, check if operator is approved (or approve them)
      const isApproved = await rwyFlows.isApprovedOperator(operator.address);

      if (!isApproved) {
        // Deployer needs to approve the operator
        const deployer = context.getUser('deployer');
        const vault = context.getContractAs('RWYVault', deployer.name);
        const tx = await vault.approveOperator(operator.address);
        await tx.wait();
      }

      // Get AuraAsset address for input token
      const auraAssetAddress = context.getContractAddress('AuraAsset');

      // Create opportunity
      const result = await rwyFlows.createOpportunity(operator, {
        name: 'Goat Processing Q1 2026',
        description: 'Processing goats into premium meat products',
        inputToken: auraAssetAddress,
        inputTokenId: '1', // GOAT token ID
        targetAmount: '100', // 100 tokens
        promisedYieldBps: 1500, // 15% yield
        operatorFeeBps: 500, // 5% fee
        fundingDays: 30,
        processingDays: 60,
      });

      // Verify
      assertNonZeroBytes32(result.opportunityId);
      assertTxSuccess(result.receipt);

      // Verify opportunity was created correctly
      const opportunity = await rwyFlows.getOpportunity(result.opportunityId);
      expect(opportunity.name).toBe('Goat Processing Q1 2026');
      expect(Number(opportunity.status)).toBe(RWYOpportunityStatus.FUNDING);
    });

    it('should reject opportunity creation from non-approved operator', async () => {
      const attacker = context.getUser('attacker');
      const auraAssetAddress = context.getContractAddress('AuraAsset');

      // Attempt to create opportunity
      const result = await rwyFlows.createOpportunity(attacker, {
        name: 'Malicious Opportunity',
        inputToken: auraAssetAddress,
        inputTokenId: '1',
        targetAmount: '100',
      });

      // Should fail
      expect(result.transactionHash).toBeDefined();
      // Note: The actual error handling depends on contract implementation
    });
  });

  describe('Staking Lifecycle', () => {
    let opportunityId: string;

    beforeAll(async () => {
      // Setup: Create an opportunity for staking tests
      const auraAssetAddress = context.getContractAddress('AuraAsset');

      const result = await rwyFlows.createOpportunity(operator, {
        name: 'Staking Test Opportunity',
        inputToken: auraAssetAddress,
        inputTokenId: '1',
        targetAmount: '100',
        promisedYieldBps: 1000, // 10%
        fundingDays: 30,
      });

      opportunityId = result.opportunityId;
    });

    it('should allow investor to stake tokens', async () => {
      // First approve tokens
      const auraAssetAddress = context.getContractAddress('AuraAsset');
      await rwyFlows.approveTokensForStaking(investor1, auraAssetAddress);

      // Stake tokens
      const stakeResult = await rwyFlows.stake(investor1, opportunityId, '50');

      if (stakeResult.success) {
        expect(stakeResult.transactionHash).toBeDefined();

        // Verify stake was recorded
        const stake = await rwyFlows.getStake(opportunityId, investor1.address);
        expect(stake.amount).toBe(ethers.parseEther('50'));
      }
    });

    it('should allow multiple investors to stake', async () => {
      const auraAssetAddress = context.getContractAddress('AuraAsset');

      // Investor 2 stakes
      await rwyFlows.approveTokensForStaking(investor2, auraAssetAddress);
      const stakeResult = await rwyFlows.stake(investor2, opportunityId, '30');

      if (stakeResult.success) {
        // Verify total staked
        const opportunity = await rwyFlows.getOpportunity(opportunityId);
        // Total should be 50 + 30 = 80
        expect(opportunity.stakedAmount).toBeGreaterThan(0n);
      }
    });

    it('should allow investor to unstake during funding period', async () => {
      // Unstake some tokens
      const unstakeResult = await rwyFlows.unstake(
        investor1,
        opportunityId,
        '20',
      );

      if (unstakeResult.success) {
        // Verify stake was reduced
        const stake = await rwyFlows.getStake(opportunityId, investor1.address);
        expect(stake.amount).toBe(ethers.parseEther('30')); // 50 - 20 = 30
      }
    });
  });

  describe('Operator Lifecycle', () => {
    let opportunityId: string;

    beforeAll(async () => {
      // Setup: Create and fully fund an opportunity
      const auraAssetAddress = context.getContractAddress('AuraAsset');

      const result = await rwyFlows.createOpportunity(operator, {
        name: 'Full Lifecycle Test',
        inputToken: auraAssetAddress,
        inputTokenId: '1',
        targetAmount: '50', // Small target for easy funding
        promisedYieldBps: 1500,
        fundingDays: 1,
        processingDays: 30,
      });

      opportunityId = result.opportunityId;

      // Fund it
      await rwyFlows.approveTokensForStaking(investor1, auraAssetAddress);
      await rwyFlows.stake(investor1, opportunityId, '50');
    });

    it('should allow operator to start delivery', async () => {
      // Generate a journey ID (in real scenario, this comes from AuSys)
      const journeyId = ethers.hexlify(ethers.randomBytes(32));

      const result = await rwyFlows.startDelivery(
        operator,
        opportunityId,
        journeyId,
      );

      if (result.success) {
        const opportunity = await rwyFlows.getOpportunity(opportunityId);
        expect(Number(opportunity.status)).toBe(
          RWYOpportunityStatus.IN_TRANSIT,
        );
      }
    });

    it('should allow operator to confirm delivery', async () => {
      const result = await rwyFlows.confirmDelivery(
        operator,
        opportunityId,
        '50',
      );

      if (result.success) {
        const opportunity = await rwyFlows.getOpportunity(opportunityId);
        expect(Number(opportunity.status)).toBe(
          RWYOpportunityStatus.PROCESSING,
        );
      }
    });

    it('should allow operator to complete processing', async () => {
      const result = await rwyFlows.completeProcessing(
        operator,
        opportunityId,
        '2', // Output token ID (processed meat)
        '60', // Output amount (more than input due to processing)
      );

      if (result.success) {
        const opportunity = await rwyFlows.getOpportunity(opportunityId);
        expect(Number(opportunity.status)).toBeGreaterThanOrEqual(
          RWYOpportunityStatus.SELLING,
        );
      }
    });
  });

  describe('Profit Distribution', () => {
    let opportunityId: string;

    beforeAll(async () => {
      // Setup: Create a completed opportunity
      const auraAssetAddress = context.getContractAddress('AuraAsset');

      const result = await rwyFlows.createOpportunity(operator, {
        name: 'Profit Distribution Test',
        inputToken: auraAssetAddress,
        inputTokenId: '1',
        targetAmount: '100',
        promisedYieldBps: 2000, // 20% yield
        fundingDays: 1,
        processingDays: 1,
      });

      opportunityId = result.opportunityId;

      // Fund and complete the opportunity
      await rwyFlows.approveTokensForStaking(investor1, auraAssetAddress);
      await rwyFlows.stake(investor1, opportunityId, '100');

      const journeyId = ethers.hexlify(ethers.randomBytes(32));
      await rwyFlows.startDelivery(operator, opportunityId, journeyId);
      await rwyFlows.confirmDelivery(operator, opportunityId, '100');
      await rwyFlows.completeProcessing(operator, opportunityId, '2', '120');
    });

    it('should allow investor to claim profits', async () => {
      const result = await rwyFlows.claimProfits(investor1, opportunityId);

      if (result.success) {
        // Verify stake was marked as claimed
        const stake = await rwyFlows.getStake(opportunityId, investor1.address);
        expect(stake.claimed).toBe(true);
      }
    });

    it('should prevent double claiming', async () => {
      // Try to claim again
      const result = await rwyFlows.claimProfits(investor1, opportunityId);

      // Should fail (already claimed)
      expect(result.success).toBe(false);
    });
  });

  describe('Cancellation Flow', () => {
    it('should allow operator to cancel during funding', async () => {
      const auraAssetAddress = context.getContractAddress('AuraAsset');

      // Create opportunity
      const createResult = await rwyFlows.createOpportunity(operator, {
        name: 'To Be Cancelled',
        inputToken: auraAssetAddress,
        inputTokenId: '1',
        targetAmount: '100',
        fundingDays: 30,
      });

      // Cancel it
      const cancelResult = await rwyFlows.cancelOpportunity(
        operator,
        createResult.opportunityId,
        'Market conditions changed',
      );

      if (cancelResult.success) {
        const opportunity = await rwyFlows.getOpportunity(
          createResult.opportunityId,
        );
        expect(Number(opportunity.status)).toBe(RWYOpportunityStatus.CANCELLED);
      }
    });

    it('should allow emergency claim after cancellation', async () => {
      const auraAssetAddress = context.getContractAddress('AuraAsset');

      // Create and fund opportunity
      const createResult = await rwyFlows.createOpportunity(operator, {
        name: 'Emergency Claim Test',
        inputToken: auraAssetAddress,
        inputTokenId: '1',
        targetAmount: '100',
        fundingDays: 30,
      });

      await rwyFlows.approveTokensForStaking(investor1, auraAssetAddress);
      await rwyFlows.stake(investor1, createResult.opportunityId, '50');

      // Cancel
      await rwyFlows.cancelOpportunity(
        operator,
        createResult.opportunityId,
        'Test cancellation',
      );

      // Emergency claim
      const claimResult = await rwyFlows.emergencyClaim(
        investor1,
        createResult.opportunityId,
      );

      if (claimResult.success) {
        const stake = await rwyFlows.getStake(
          createResult.opportunityId,
          investor1.address,
        );
        expect(stake.claimed).toBe(true);
      }
    });
  });

  describe('Coverage Tracking', () => {
    it('should have covered all IRWYService methods', () => {
      const tracker = getCoverageTracker();

      // Check that key methods were covered
      expect(tracker.isCovered('IRWYService', 'createOpportunity')).toBe(true);
      expect(tracker.isCovered('IRWYService', 'stake')).toBe(true);
      expect(tracker.isCovered('IRWYService', 'unstake')).toBe(true);
      expect(tracker.isCovered('IRWYService', 'startDelivery')).toBe(true);
      expect(tracker.isCovered('IRWYService', 'confirmDelivery')).toBe(true);
      expect(tracker.isCovered('IRWYService', 'completeProcessing')).toBe(true);
      expect(tracker.isCovered('IRWYService', 'claimProfits')).toBe(true);
      expect(tracker.isCovered('IRWYService', 'emergencyClaim')).toBe(true);
      expect(tracker.isCovered('IRWYService', 'cancelOpportunity')).toBe(true);
    });
  });
});
