// @ts-nocheck - Test file with type issues
/**
 * @file test/hooks/useRWYOpportunity.test.ts
 * @description Vitest unit tests for useRWYOpportunity hook
 *
 * Covers:
 *  - useRWYOpportunity: initialization, guards, error handling, refetch
 *  - useRWYStake: initialization, guards, error handling
 *  - useRWYOpportunityStakers: initialization, guards
 *  - useRWYOperatorStats: initialization, guards
 *  - useRWYExpectedProfit: calculation logic
 *  - useIsApprovedOperator: approval check
 *  - useTokenApproval: allowance, balance, approval flow
 *
 * Note: Full contract call testing requires integration-level mocking
 * that is covered by e2e tests. Unit tests focus on hook logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock dependencies
vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi.fn(),
    JsonRpcProvider: vi.fn(),
    Contract: vi.fn(),
    MaxUint256:
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  },
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0x1234567890123456789012345678901234567890',
  NEXT_PUBLIC_RPC_URL_84532: 'https://base-sepolia.rpc.example.com',
}));

// Mock the provider utility
vi.mock('@/lib/provider', () => ({
  getProvider: vi.fn().mockResolvedValue({
    getOpportunityWithDynamicData: vi.fn(),
    getStake: vi.fn(),
    getOpportunityStakers: vi.fn(),
    getOperatorStats: vi.fn(),
    calculateExpectedProfit: vi.fn(),
    isApprovedOperator: vi.fn(),
  }),
  getReadOnlyProvider: vi.fn().mockReturnValue({
    getOpportunityWithDynamicData: vi.fn(),
    getStake: vi.fn(),
    getOpportunityStakers: vi.fn(),
    getOperatorStats: vi.fn(),
    calculateExpectedProfit: vi.fn(),
    isApprovedOperator: vi.fn(),
  }),
  getSigner: vi
    .fn()
    .mockRejectedValue(
      new Error('No wallet detected. Please connect your wallet.'),
    ),
}));

// Mock RWYRepository
vi.mock('@/infrastructure/repositories/rwy-repository', () => ({
  RWYRepository: vi.fn().mockImplementation(() => ({
    getOpportunityWithDynamicData: vi.fn(),
    getStake: vi.fn(),
    getOpportunityStakers: vi.fn(),
    getOperatorStats: vi.fn(),
    calculateExpectedProfit: vi.fn(),
    isApprovedOperator: vi.fn(),
  })),
}));

// Mock window.ethereum
Object.defineProperty(window, 'ethereum', {
  value: undefined,
  writable: true,
});

// Import after mocks
import { ethers } from 'ethers';
import { getSigner } from '@/lib/provider';
import {
  useRWYOpportunity,
  useRWYStake,
  useRWYOpportunityStakers,
  useRWYOperatorStats,
  useRWYExpectedProfit,
  useIsApprovedOperator,
  useTokenApproval,
} from '@/hooks/useRWYOpportunity';
import { RWYRepository } from '@/infrastructure/repositories/rwy-repository';

describe('useRWYOpportunity', () => {
  const mockRWYRepository = RWYRepository as ReturnType<typeof vi.fn>;
  const mockGetOpportunityWithDynamicData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOpportunityWithDynamicData.mockResolvedValue({
      id: '0xabc123',
      name: 'Test Opportunity',
      status: 'Active',
    });
    mockRWYRepository.mockImplementation(() => ({
      getOpportunityWithDynamicData: mockGetOpportunityWithDynamicData,
      getStake: vi.fn(),
      getOpportunityStakers: vi.fn(),
      getOperatorStats: vi.fn(),
      calculateExpectedProfit: vi.fn(),
      isApprovedOperator: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with null opportunity when no opportunityId', () => {
      const { result } = renderHook(() => useRWYOpportunity(undefined));

      expect(result.current.opportunity).toBeNull();
      // When opportunityId is undefined, loading immediately becomes false (guard clause)
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should have refetch function available', () => {
      const { result } = renderHook(() => useRWYOpportunity(undefined));
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('guards', () => {
    it('should not fetch when opportunityId is undefined', async () => {
      renderHook(() => useRWYOpportunity(undefined));

      await waitFor(() => {
        expect(mockGetOpportunityWithDynamicData).not.toHaveBeenCalled();
      });
    });

    it('should not fetch when opportunityId is empty string', async () => {
      const { result } = renderHook(() => useRWYOpportunity(''));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetOpportunityWithDynamicData).not.toHaveBeenCalled();
    });

    it('should fetch when opportunityId is provided', async () => {
      const { result } = renderHook(() => useRWYOpportunity('0xabc123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetOpportunityWithDynamicData).toHaveBeenCalledWith(
        '0xabc123',
      );
    });
  });

  describe('error handling', () => {
    it('should handle repository errors', async () => {
      mockGetOpportunityWithDynamicData.mockRejectedValue(
        new Error('Contract call failed'),
      );

      const { result } = renderHook(() => useRWYOpportunity('0xabc123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Contract call failed');
      expect(result.current.opportunity).toBeNull();
    });
  });

  describe('refetch', () => {
    it('should be able to manually refetch', async () => {
      const { result } = renderHook(() => useRWYOpportunity('0xabc123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockGetOpportunityWithDynamicData.mockClear();
      await result.current.refetch();

      expect(mockGetOpportunityWithDynamicData).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useRWYStake', () => {
  const mockGetStake = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStake.mockResolvedValue({
      amount: '1000000',
      stakedAt: Date.now(),
      claimed: false,
    });
    RWYRepository.mockImplementation(() => ({
      getOpportunityWithDynamicData: vi.fn(),
      getStake: mockGetStake,
      getOpportunityStakers: vi.fn(),
      getOperatorStats: vi.fn(),
      calculateExpectedProfit: vi.fn(),
      isApprovedOperator: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('guards', () => {
    it('should not fetch when opportunityId is undefined', async () => {
      const { result } = renderHook(() => useRWYStake(undefined, undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetStake).not.toHaveBeenCalled();
    });

    it('should not fetch when userAddress is undefined', async () => {
      const { result } = renderHook(() => useRWYStake('0xabc123', undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetStake).not.toHaveBeenCalled();
    });
  });

  describe('fetching', () => {
    it('should fetch stake when both params provided', async () => {
      const { result } = renderHook(() =>
        useRWYStake('0xabc123', '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12'),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetStake).toHaveBeenCalledWith(
        '0xabc123',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
      );
    });
  });
});

describe('useRWYOpportunityStakers', () => {
  const mockGetOpportunityStakers = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOpportunityStakers.mockResolvedValue([
      { amount: '1000000', staker: '0x111', claimed: false },
      { amount: '2000000', staker: '0x222', claimed: true },
    ]);
    RWYRepository.mockImplementation(() => ({
      getOpportunityWithDynamicData: vi.fn(),
      getStake: vi.fn(),
      getOpportunityStakers: mockGetOpportunityStakers,
      getOperatorStats: vi.fn(),
      calculateExpectedProfit: vi.fn(),
      isApprovedOperator: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('guards', () => {
    it('should not fetch when opportunityId is undefined', async () => {
      const { result } = renderHook(() => useRWYOpportunityStakers(undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetOpportunityStakers).not.toHaveBeenCalled();
    });
  });

  describe('fetching', () => {
    it('should fetch stakers when opportunityId is provided', async () => {
      const { result } = renderHook(() => useRWYOpportunityStakers('0xabc123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetOpportunityStakers).toHaveBeenCalledWith('0xabc123');
      expect(result.current.stakers).toHaveLength(2);
    });
  });
});

describe('useRWYOperatorStats', () => {
  const mockGetOperatorStats = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOperatorStats.mockResolvedValue({
      approved: true,
      reputation: 1000,
      successfulOps: 5,
      totalValueProcessed: '1000000000',
    });
    RWYRepository.mockImplementation(() => ({
      getOpportunityWithDynamicData: vi.fn(),
      getStake: vi.fn(),
      getOpportunityStakers: vi.fn(),
      getOperatorStats: mockGetOperatorStats,
      calculateExpectedProfit: vi.fn(),
      isApprovedOperator: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('guards', () => {
    it('should not fetch when operatorAddress is undefined', async () => {
      const { result } = renderHook(() => useRWYOperatorStats(undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetOperatorStats).not.toHaveBeenCalled();
    });
  });

  describe('fetching', () => {
    it('should fetch operator stats when address provided', async () => {
      const { result } = renderHook(() =>
        useRWYOperatorStats('0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12'),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetOperatorStats).toHaveBeenCalledWith(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
      );
      expect(result.current.stats?.approved).toBe(true);
    });
  });
});

describe('useRWYExpectedProfit', () => {
  const mockCalculateExpectedProfit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCalculateExpectedProfit.mockResolvedValue({
      expectedProfit: '500000',
      userShareBps: 1000,
    });
    RWYRepository.mockImplementation(() => ({
      getOpportunityWithDynamicData: vi.fn(),
      getStake: vi.fn(),
      getOpportunityStakers: vi.fn(),
      getOperatorStats: vi.fn(),
      calculateExpectedProfit: mockCalculateExpectedProfit,
      isApprovedOperator: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('guards', () => {
    it('should not calculate when opportunityId is undefined', async () => {
      const { result } = renderHook(() =>
        useRWYExpectedProfit(undefined, '1000000'),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockCalculateExpectedProfit).not.toHaveBeenCalled();
      expect(result.current.expectedProfit).toBe('0');
    });

    it('should not calculate when stakeAmount is undefined', async () => {
      const { result } = renderHook(() =>
        useRWYExpectedProfit('0xabc123', undefined),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockCalculateExpectedProfit).not.toHaveBeenCalled();
    });

    it('should not calculate when stakeAmount is 0', async () => {
      const { result } = renderHook(() =>
        useRWYExpectedProfit('0xabc123', '0'),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockCalculateExpectedProfit).not.toHaveBeenCalled();
    });
  });

  describe('calculation', () => {
    it('should calculate profit when valid params provided', async () => {
      const { result } = renderHook(() =>
        useRWYExpectedProfit('0xabc123', '1000000'),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockCalculateExpectedProfit).toHaveBeenCalledWith(
        '0xabc123',
        '1000000',
      );
      expect(result.current.expectedProfit).toBe('500000');
      expect(result.current.userShareBps).toBe(1000);
    });
  });
});

describe('useIsApprovedOperator', () => {
  const mockIsApprovedOperator = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsApprovedOperator.mockResolvedValue(true);
    RWYRepository.mockImplementation(() => ({
      getOpportunityWithDynamicData: vi.fn(),
      getStake: vi.fn(),
      getOpportunityStakers: vi.fn(),
      getOperatorStats: vi.fn(),
      calculateExpectedProfit: vi.fn(),
      isApprovedOperator: mockIsApprovedOperator,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('guards', () => {
    it('should not check when operatorAddress is undefined', async () => {
      const { result } = renderHook(() => useIsApprovedOperator(undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockIsApprovedOperator).not.toHaveBeenCalled();
      expect(result.current.isApproved).toBeNull();
    });
  });

  describe('approval check', () => {
    it('should check operator approval status', async () => {
      const { result } = renderHook(() =>
        useIsApprovedOperator('0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12'),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockIsApprovedOperator).toHaveBeenCalledWith(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
      );
      expect(result.current.isApproved).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockIsApprovedOperator.mockRejectedValue(new Error('Provider error'));

      const { result } = renderHook(() =>
        useIsApprovedOperator('0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12'),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isApproved).toBe(false);
      expect(result.current.error).toBeDefined();
    });
  });
});

describe('useTokenApproval', () => {
  const mockAllowance = vi.fn();
  const mockBalanceOf = vi.fn();
  const mockApprove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAllowance.mockResolvedValue('0');
    mockBalanceOf.mockResolvedValue('1000000000');
    mockApprove.mockResolvedValue({ wait: vi.fn() });

    // Mock Contract constructor
    vi.mocked(ethers.Contract).mockImplementation(
      () =>
        ({
          allowance: mockAllowance,
          balanceOf: mockBalanceOf,
          approve: mockApprove,
        }) as any,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default values when params undefined', () => {
      const { result } = renderHook(() =>
        useTokenApproval(undefined, undefined),
      );

      // When params are undefined, loading becomes false immediately (guard)
      expect(result.current.loading).toBe(false);
      expect(result.current.allowance).toBe(0n);
      expect(result.current.balance).toBe(0n);
      expect(result.current.isApproved).toBe(false);
    });
  });

  describe('allowance check', () => {
    it('should check allowance when token and owner provided', async () => {
      const { result } = renderHook(() =>
        useTokenApproval('0xtoken123', '0xowner123'),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockAllowance).toHaveBeenCalled();
      // Contract returns string in mock, but BigInt in real code
      expect(BigInt(result.current.balance)).toBe(1000000000n);
    });

    it('should set isApproved true when allowance >= requiredAmount', async () => {
      mockAllowance.mockResolvedValue('10000000000');

      const { result } = renderHook(() =>
        useTokenApproval('0xtoken123', '0xowner123', '5000000'),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isApproved).toBe(true);
    });

    it('should set isApproved true when allowance is unlimited (> 10^50)', async () => {
      mockAllowance.mockResolvedValue(
        '100000000000000000000000000000000000000000000',
      );

      const { result } = renderHook(() =>
        useTokenApproval('0xtoken123', '0xowner123', '5000000'),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isApproved).toBe(true);
    });
  });

  describe('requestApproval', () => {
    beforeEach(() => {
      vi.mocked(getSigner).mockRejectedValue(
        new Error('No wallet detected. Please connect your wallet.'),
      );
    });

    it('should throw when no window.ethereum', async () => {
      window.ethereum = undefined;

      const { result } = renderHook(() =>
        useTokenApproval('0xtoken123', '0xowner123'),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.requestApproval()).rejects.toThrow(
        'No wallet detected',
      );
    });

    it('should throw when token address missing', async () => {
      const { result } = renderHook(() =>
        useTokenApproval(undefined, '0xowner123'),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.requestApproval()).rejects.toThrow(
        'Token or owner address not set',
      );
    });
  });
});
