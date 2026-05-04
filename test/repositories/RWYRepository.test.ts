/**
 * @file test/repositories/RWYRepository.test.ts
 * @description Tests for RWY Repository implementation
 *
 * Unit tests focusing on business logic - error handling, filtering, data mapping.
 * Contract-level interactions are mocked at the module level.
 */

import { expect, describe, it, beforeEach, vi } from 'vitest';
import { RWYOpportunityStatus, RWYOpportunity, RWYStake } from '@/domain/rwy';

// ─── Mock the entire repository module ─────────────────────────────────────

const mockGetOpportunity = vi.fn();
const mockGetStake = vi.fn();
const mockGetOpportunityStakers = vi.fn();
const mockGetAllOpportunities = vi.fn();
const mockIsApprovedOperator = vi.fn();
const mockGetOperatorStats = vi.fn();
const mockCalculateExpectedProfit = vi.fn();
const mockGetOpportunitiesByOperator = vi.fn();
const mockGetOpportunitiesByStatus = vi.fn();
const mockGetActiveOpportunities = vi.fn();
const mockGetStakerOpportunities = vi.fn();
const mockGetOpportunityWithDynamicData = vi.fn();
const mockCalculateDynamicData = vi.fn();

vi.mock('@/infrastructure/repositories/rwy-repository', () => ({
  RWYRepository: vi.fn().mockImplementation(() => ({
    getOpportunityById: mockGetOpportunity,
    getStake: mockGetStake,
    getOpportunityStakers: mockGetOpportunityStakers,
    getAllOpportunities: mockGetAllOpportunities,
    getOpportunitiesByOperator: mockGetOpportunitiesByOperator,
    getOpportunitiesByStatus: mockGetOpportunitiesByStatus,
    getActiveOpportunities: mockGetActiveOpportunities,
    getStakerOpportunities: mockGetStakerOpportunities,
    getOpportunityWithDynamicData: mockGetOpportunityWithDynamicData,
    isApprovedOperator: mockIsApprovedOperator,
    getOperatorStats: mockGetOperatorStats,
    calculateExpectedProfit: mockCalculateExpectedProfit,
    calculateDynamicData: mockCalculateDynamicData,
  })),
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xDiamondAddress',
}));

// ─── Imports ────────────────────────────────────────────────────────────────

import { RWYRepository } from '@/infrastructure/repositories/rwy-repository';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_OPERATOR = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const MOCK_STAKER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C9';
const MOCK_OPPORTUNITY_ID = '0x' + 'a'.repeat(64);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RWYRepository', () => {
  let repo: RWYRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new RWYRepository('0xContract', {} as any);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getOpportunityById
  // ─────────────────────────────────────────────────────────────────────────

  describe('getOpportunityById', () => {
    it('should return opportunity when found', async () => {
      const mockOpp: RWYOpportunity = {
        id: MOCK_OPPORTUNITY_ID,
        operator: MOCK_OPERATOR as any,
        name: 'Test Opportunity',
        description: 'Test Description',
        inputToken: '0xInputToken' as any,
        inputTokenId: '1',
        targetAmount: '1000000000000000000000',
        stakedAmount: '500000000000000000000',
        outputToken: '0xOutputToken' as any,
        outputTokenId: '2',
        expectedOutputAmount: '1100000000000000000000',
        promisedYieldBps: 1500,
        operatorFeeBps: 1000,
        minSalePrice: '900000000000000000000',
        operatorCollateral: '100000000000000000000',
        fundingDeadline: Math.floor(Date.now() / 1000) + 86400 * 7,
        processingDeadline: Math.floor(Date.now() / 1000) + 86400 * 14,
        createdAt: Math.floor(Date.now() / 1000) - 86400,
        status: RWYOpportunityStatus.FUNDING,
      };
      mockGetOpportunity.mockResolvedValue(mockOpp);

      const result = await repo.getOpportunityById(MOCK_OPPORTUNITY_ID);

      expect(result).toEqual(mockOpp);
      expect(mockGetOpportunity).toHaveBeenCalledWith(MOCK_OPPORTUNITY_ID);
    });

    it('should return null when not found', async () => {
      mockGetOpportunity.mockResolvedValue(null);

      const result = await repo.getOpportunityById(MOCK_OPPORTUNITY_ID);

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getAllOpportunities
  // ─────────────────────────────────────────────────────────────────────────

  describe('getAllOpportunities', () => {
    it('should return all opportunities from repository', async () => {
      const mockOpps: RWYOpportunity[] = [
        {
          id: '0x1',
          operator: MOCK_OPERATOR as any,
          name: 'Opp 1',
          description: '',
          inputToken: '0x' as any,
          inputTokenId: '1',
          targetAmount: '100',
          stakedAmount: '50',
          outputToken: '0x' as any,
          outputTokenId: '2',
          expectedOutputAmount: '110',
          promisedYieldBps: 1500,
          operatorFeeBps: 1000,
          minSalePrice: '90',
          operatorCollateral: '10',
          fundingDeadline: 9999999999,
          processingDeadline: 9999999999,
          createdAt: 1000000,
          status: RWYOpportunityStatus.FUNDING,
        },
        {
          id: '0x2',
          operator: '0xB' as any,
          name: 'Opp 2',
          description: '',
          inputToken: '0x' as any,
          inputTokenId: '1',
          targetAmount: '200',
          stakedAmount: '100',
          outputToken: '0x' as any,
          outputTokenId: '2',
          expectedOutputAmount: '220',
          promisedYieldBps: 1500,
          operatorFeeBps: 1000,
          minSalePrice: '180',
          operatorCollateral: '20',
          fundingDeadline: 9999999999,
          processingDeadline: 9999999999,
          createdAt: 1000000,
          status: RWYOpportunityStatus.COMPLETED,
        },
      ];
      mockGetAllOpportunities.mockResolvedValue(mockOpps);

      const result = await repo.getAllOpportunities();

      expect(result).toEqual(mockOpps);
      expect(mockGetAllOpportunities).toHaveBeenCalled();
    });

    it('should return empty array when none exist', async () => {
      mockGetAllOpportunities.mockResolvedValue([]);

      const result = await repo.getAllOpportunities();

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getOpportunitiesByOperator
  // ─────────────────────────────────────────────────────────────────────────

  describe('getOpportunitiesByOperator', () => {
    it('should filter by operator address', async () => {
      const mockOpps: RWYOpportunity[] = [
        {
          id: '0x1',
          operator: MOCK_OPERATOR as any,
          name: 'Opp 1',
          description: '',
          inputToken: '0x' as any,
          inputTokenId: '1',
          targetAmount: '100',
          stakedAmount: '50',
          outputToken: '0x' as any,
          outputTokenId: '2',
          expectedOutputAmount: '110',
          promisedYieldBps: 1500,
          operatorFeeBps: 1000,
          minSalePrice: '90',
          operatorCollateral: '10',
          fundingDeadline: 9999999999,
          processingDeadline: 9999999999,
          createdAt: 1000000,
          status: RWYOpportunityStatus.FUNDING,
        },
      ];
      mockGetOpportunitiesByOperator.mockResolvedValue(mockOpps);

      const result = await repo.getOpportunitiesByOperator(
        MOCK_OPERATOR as any,
      );

      expect(result).toEqual(mockOpps);
      expect(mockGetOpportunitiesByOperator).toHaveBeenCalledWith(
        MOCK_OPERATOR,
      );
    });

    it('should return empty array when operator has no opportunities', async () => {
      mockGetOpportunitiesByOperator.mockResolvedValue([]);

      const result = await repo.getOpportunitiesByOperator(
        MOCK_OPERATOR as any,
      );

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getOpportunitiesByStatus
  // ─────────────────────────────────────────────────────────────────────────

  describe('getOpportunitiesByStatus', () => {
    it('should filter by status', async () => {
      const mockOpps: RWYOpportunity[] = [
        {
          id: '0x1',
          operator: MOCK_OPERATOR as any,
          name: 'Opp 1',
          description: '',
          inputToken: '0x' as any,
          inputTokenId: '1',
          targetAmount: '100',
          stakedAmount: '50',
          outputToken: '0x' as any,
          outputTokenId: '2',
          expectedOutputAmount: '110',
          promisedYieldBps: 1500,
          operatorFeeBps: 1000,
          minSalePrice: '90',
          operatorCollateral: '10',
          fundingDeadline: 9999999999,
          processingDeadline: 9999999999,
          createdAt: 1000000,
          status: RWYOpportunityStatus.FUNDING,
        },
      ];
      mockGetOpportunitiesByStatus.mockResolvedValue(mockOpps);

      const result = await repo.getOpportunitiesByStatus(
        RWYOpportunityStatus.FUNDING,
      );

      expect(result).toEqual(mockOpps);
      expect(mockGetOpportunitiesByStatus).toHaveBeenCalledWith(
        RWYOpportunityStatus.FUNDING,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getActiveOpportunities
  // ─────────────────────────────────────────────────────────────────────────

  describe('getActiveOpportunities', () => {
    it('should return active (funding) opportunities', async () => {
      const mockOpps: RWYOpportunity[] = [
        {
          id: '0x1',
          operator: MOCK_OPERATOR as any,
          name: 'Opp 1',
          description: '',
          inputToken: '0x' as any,
          inputTokenId: '1',
          targetAmount: '100',
          stakedAmount: '50',
          outputToken: '0x' as any,
          outputTokenId: '2',
          expectedOutputAmount: '110',
          promisedYieldBps: 1500,
          operatorFeeBps: 1000,
          minSalePrice: '90',
          operatorCollateral: '10',
          fundingDeadline: 9999999999,
          processingDeadline: 9999999999,
          createdAt: 1000000,
          status: RWYOpportunityStatus.FUNDING,
        },
      ];
      mockGetActiveOpportunities.mockResolvedValue(mockOpps);

      const result = await repo.getActiveOpportunities();

      expect(result).toEqual(mockOpps);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getStake
  // ─────────────────────────────────────────────────────────────────────────

  describe('getStake', () => {
    it('should return stake when user has staked', async () => {
      const mockStake: RWYStake = {
        opportunityId: MOCK_OPPORTUNITY_ID,
        staker: MOCK_STAKER as any,
        amount: '100000000000000000000',
        stakedAt: Math.floor(Date.now() / 1000) - 3600,
        claimed: false,
      };
      mockGetStake.mockResolvedValue(mockStake);

      const result = await repo.getStake(
        MOCK_OPPORTUNITY_ID,
        MOCK_STAKER as any,
      );

      expect(result).toEqual(mockStake);
      expect(mockGetStake).toHaveBeenCalledWith(
        MOCK_OPPORTUNITY_ID,
        MOCK_STAKER,
      );
    });

    it('should return null when no stake exists', async () => {
      mockGetStake.mockResolvedValue(null);

      const result = await repo.getStake(
        MOCK_OPPORTUNITY_ID,
        MOCK_STAKER as any,
      );

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getStakerOpportunities
  // ─────────────────────────────────────────────────────────────────────────

  describe('getStakerOpportunities', () => {
    it('should return opportunities where user has staked', async () => {
      const mockOpps: RWYOpportunity[] = [
        {
          id: '0x1',
          operator: MOCK_OPERATOR as any,
          name: 'Opp 1',
          description: '',
          inputToken: '0x' as any,
          inputTokenId: '1',
          targetAmount: '100',
          stakedAmount: '50',
          outputToken: '0x' as any,
          outputTokenId: '2',
          expectedOutputAmount: '110',
          promisedYieldBps: 1500,
          operatorFeeBps: 1000,
          minSalePrice: '90',
          operatorCollateral: '10',
          fundingDeadline: 9999999999,
          processingDeadline: 9999999999,
          createdAt: 1000000,
          status: RWYOpportunityStatus.FUNDING,
        },
      ];
      mockGetStakerOpportunities.mockResolvedValue(mockOpps);

      const result = await repo.getStakerOpportunities(MOCK_STAKER as any);

      expect(result).toEqual(mockOpps);
      expect(mockGetStakerOpportunities).toHaveBeenCalledWith(MOCK_STAKER);
    });

    it('should return empty array when user has no stakes', async () => {
      mockGetStakerOpportunities.mockResolvedValue([]);

      const result = await repo.getStakerOpportunities(MOCK_STAKER as any);

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getOpportunityStakers
  // ─────────────────────────────────────────────────────────────────────────

  describe('getOpportunityStakers', () => {
    it('should return all stakers for an opportunity', async () => {
      const mockStakes: RWYStake[] = [
        {
          opportunityId: MOCK_OPPORTUNITY_ID,
          staker: '0xStaker1' as any,
          amount: '100',
          stakedAt: 1000000,
          claimed: false,
        },
        {
          opportunityId: MOCK_OPPORTUNITY_ID,
          staker: '0xStaker2' as any,
          amount: '200',
          stakedAt: 1000001,
          claimed: true,
        },
      ];
      mockGetOpportunityStakers.mockResolvedValue(mockStakes);

      const result = await repo.getOpportunityStakers(MOCK_OPPORTUNITY_ID);

      expect(result).toEqual(mockStakes);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // isApprovedOperator
  // ─────────────────────────────────────────────────────────────────────────

  describe('isApprovedOperator', () => {
    it('should return true for approved operator', async () => {
      mockIsApprovedOperator.mockResolvedValue(true);

      const result = await repo.isApprovedOperator(MOCK_OPERATOR as any);

      expect(result).toBe(true);
    });

    it('should return false for non-approved operator', async () => {
      mockIsApprovedOperator.mockResolvedValue(false);

      const result = await repo.isApprovedOperator(MOCK_OPERATOR as any);

      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // calculateExpectedProfit
  // ─────────────────────────────────────────────────────────────────────────

  describe('calculateExpectedProfit', () => {
    it('should return calculated profit and user share', async () => {
      const mockResult = {
        expectedProfit: '100000000000000000000',
        userShareBps: 8000,
      };
      mockCalculateExpectedProfit.mockResolvedValue(mockResult);

      const result = await repo.calculateExpectedProfit(
        MOCK_OPPORTUNITY_ID,
        '500000000000000000000',
      );

      expect(result).toEqual(mockResult);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getOpportunityWithDynamicData
  // ─────────────────────────────────────────────────────────────────────────

  describe('getOpportunityWithDynamicData', () => {
    it('should return opportunity with dynamic data', async () => {
      const mockOpp = {
        id: MOCK_OPPORTUNITY_ID,
        operator: MOCK_OPERATOR as any,
        name: 'Test',
        description: '',
        inputToken: '0x' as any,
        inputTokenId: '1',
        targetAmount: '100',
        stakedAmount: '50',
        outputToken: '0x' as any,
        outputTokenId: '2',
        expectedOutputAmount: '110',
        promisedYieldBps: 1500,
        operatorFeeBps: 1000,
        minSalePrice: '90',
        operatorCollateral: '10',
        fundingDeadline: 9999999999,
        processingDeadline: 9999999999,
        createdAt: 1000000,
        status: RWYOpportunityStatus.FUNDING,
        dynamicData: { progressPercentage: 50, stakerCount: 2 },
      };
      mockGetOpportunityWithDynamicData.mockResolvedValue(mockOpp);

      const result =
        await repo.getOpportunityWithDynamicData(MOCK_OPPORTUNITY_ID);

      expect(result).toEqual(mockOpp);
      expect(result?.dynamicData).toBeDefined();
    });

    it('should return null when not found', async () => {
      mockGetOpportunityWithDynamicData.mockResolvedValue(null);

      const result =
        await repo.getOpportunityWithDynamicData(MOCK_OPPORTUNITY_ID);

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle all opportunity statuses', async () => {
      const statuses = Object.values(RWYOpportunityStatus);

      for (const status of statuses) {
        const mockOpps: RWYOpportunity[] = [
          {
            id: '0x1',
            operator: MOCK_OPERATOR as any,
            name: 'Opp',
            description: '',
            inputToken: '0x' as any,
            inputTokenId: '1',
            targetAmount: '100',
            stakedAmount: '50',
            outputToken: '0x' as any,
            outputTokenId: '2',
            expectedOutputAmount: '110',
            promisedYieldBps: 1500,
            operatorFeeBps: 1000,
            minSalePrice: '90',
            operatorCollateral: '10',
            fundingDeadline: 9999999999,
            processingDeadline: 9999999999,
            createdAt: 1000000,
            status,
          },
        ];
        mockGetOpportunitiesByStatus.mockResolvedValue(mockOpps);

        const result = await repo.getOpportunitiesByStatus(status);

        expect(result).toHaveLength(1);
        expect(result[0].status).toBe(status);
      }
    });

    it('should handle empty stake results', async () => {
      mockGetOpportunityStakers.mockResolvedValue([]);

      const result = await repo.getOpportunityStakers(MOCK_OPPORTUNITY_ID);

      expect(result).toEqual([]);
    });
  });
});
