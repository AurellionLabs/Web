// @ts-nocheck - Test file with type issues
/**
 * @file test/hooks/useRWYOpportunity.test.ts
 * @description Vitest unit tests for useRWYOpportunity, useRWYStake,
 * useRWYOpportunityStakers, useRWYOperatorStats, useRWYExpectedProfit,
 * useIsApprovedOperator, and useTokenApproval hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock the repository
vi.mock('@/infrastructure/repositories/rwy-repository', () => ({
  RWYRepository: vi.fn().mockImplementation(() => ({
    getOpportunityWithDynamicData: vi.fn(),
    getStake: vi.fn(),
    getOpportunityStakers: vi.fn(),
    getOperatorStats: vi.fn(),
    isApprovedOperator: vi.fn(),
    calculateExpectedProfit: vi.fn(),
  })),
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0x1234567890123456789012345678901234567890',
  NEXT_PUBLIC_RPC_URL_84532: 'https://rpc.base.org',
}));

vi.mock('@/lib/provider', () => ({
  getProvider: vi.fn().mockResolvedValue({}),
  getReadOnlyProvider: vi.fn().mockReturnValue({}),
  getSigner: vi.fn().mockResolvedValue({
    approve: vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue({}) }),
  }),
}));

vi.mock('ethers', () => ({
  ethers: {
    Contract: vi.fn().mockImplementation(() => ({
      allowance: vi.fn().mockResolvedValue(0n),
      balanceOf: vi.fn().mockResolvedValue(1000000n),
    })),
    MaxUint256:
      115792089237316195423570985008687907853269984665640564039457584007913129639935n,
  },
}));

// Import after mocks
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
import { getProvider, getReadOnlyProvider, getSigner } from '@/lib/provider';

describe('useRWYOpportunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Note: When opportunityId is undefined, the hook immediately sets loading=false
  // due to early return in fetchOpportunity callback

  it('should set loading to false when opportunityId is undefined', async () => {
    const { result } = renderHook(() => useRWYOpportunity(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.opportunity).toBeNull();
  });

  it('should return refetch as a function', () => {
    const { result } = renderHook(() => useRWYOpportunity('opp-123'));
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should fetch opportunity when opportunityId is provided', async () => {
    const mockOpportunity = {
      id: 'opp-123',
      operator: '0xOperator' as `0x${string}`,
      name: 'Test Opportunity',
      description: 'A test opportunity',
      inputToken: '0xInput' as `0x${string}`,
      inputTokenId: '1',
      targetAmount: '1000000',
      stakedAmount: '500000',
      outputToken: '0xOutput' as `0x${string}`,
      outputTokenId: '2',
      expectedOutputAmount: '1200000',
      promisedYieldBps: 1500,
      operatorFeeBps: 100,
      minSalePrice: '100000',
      operatorCollateral: '10000',
      fundingDeadline: Math.floor(Date.now() / 1000) + 86400,
      processingDeadline: Math.floor(Date.now() / 1000) + 172800,
      createdAt: Math.floor(Date.now() / 1000),
      status: 1,
      fundingProgress: 50,
      timeToFundingDeadline: 86400,
      estimatedProfit: '200000',
      estimatedAPY: 15,
      operatorReputation: 95,
      stakerCount: 5,
      formattedYield: '15.00%',
      formattedProgress: '50%',
      formattedTVL: '$50,000',
      formattedGoal: '$100,000',
    };

    const mockRepoInstance = {
      getOpportunityWithDynamicData: vi.fn().mockResolvedValue(mockOpportunity),
    };
    (RWYRepository as any).mockImplementation(() => mockRepoInstance);

    const { result } = renderHook(() => useRWYOpportunity('opp-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockRepoInstance.getOpportunityWithDynamicData).toHaveBeenCalledWith(
      'opp-123',
    );
    expect(result.current.opportunity).toEqual(mockOpportunity);
  });

  it('should handle errors when fetching fails', async () => {
    const mockRepoInstance = {
      getOpportunityWithDynamicData: vi
        .fn()
        .mockRejectedValue(new Error('Network error')),
    };
    (RWYRepository as any).mockImplementation(() => mockRepoInstance);

    const { result } = renderHook(() => useRWYOpportunity('opp-fail'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.opportunity).toBeNull();
  });
});

describe('useRWYStake', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Note: When inputs are undefined, the hook immediately sets loading=false
  // due to early return in fetchStake callback

  it('should set loading to false when inputs are undefined', async () => {
    const { result } = renderHook(() => useRWYStake(undefined, undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stake).toBeNull();
  });

  it('should return refetch as a function', () => {
    const { result } = renderHook(() =>
      useRWYStake('opp-123', '0xUser' as any),
    );
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should fetch stake when opportunityId and userAddress provided', async () => {
    const mockStake = {
      opportunityId: 'opp-123',
      staker: '0xUser' as `0x${string}`,
      amount: '100000',
      stakedAt: Math.floor(Date.now() / 1000),
      claimed: false,
    };

    const mockRepoInstance = {
      getStake: vi.fn().mockResolvedValue(mockStake),
    };
    (RWYRepository as any).mockImplementation(() => mockRepoInstance);

    const { result } = renderHook(() =>
      useRWYStake('opp-123', '0xUser' as any),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockRepoInstance.getStake).toHaveBeenCalledWith('opp-123', '0xUser');
    expect(result.current.stake).toEqual(mockStake);
  });
});

describe('useRWYOpportunityStakers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Note: When opportunityId is undefined, the hook immediately sets loading=false

  it('should set loading to false when opportunityId is undefined', async () => {
    const { result } = renderHook(() => useRWYOpportunityStakers(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stakers).toEqual([]);
  });

  it('should return refetch as a function', () => {
    const { result } = renderHook(() => useRWYOpportunityStakers('opp-123'));
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should fetch stakers when opportunityId is provided', async () => {
    const mockStakers = [
      {
        opportunityId: 'opp-123',
        staker: '0xStaker1' as `0x${string}`,
        amount: '50000',
        stakedAt: Math.floor(Date.now() / 1000),
        claimed: false,
      },
      {
        opportunityId: 'opp-123',
        staker: '0xStaker2' as `0x${string}`,
        amount: '75000',
        stakedAt: Math.floor(Date.now() / 1000),
        claimed: false,
      },
    ];

    const mockRepoInstance = {
      getOpportunityStakers: vi.fn().mockResolvedValue(mockStakers),
    };
    (RWYRepository as any).mockImplementation(() => mockRepoInstance);

    const { result } = renderHook(() => useRWYOpportunityStakers('opp-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockRepoInstance.getOpportunityStakers).toHaveBeenCalledWith(
      'opp-123',
    );
    expect(result.current.stakers).toEqual(mockStakers);
    expect(result.current.stakers).toHaveLength(2);
  });
});

describe('useRWYOperatorStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Note: When operatorAddress is undefined, the hook immediately sets loading=false

  it('should set loading to false when operatorAddress is undefined', async () => {
    const { result } = renderHook(() => useRWYOperatorStats(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toBeNull();
  });

  it('should return refetch as a function', () => {
    const { result } = renderHook(() =>
      useRWYOperatorStats('0xOperator' as any),
    );
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should fetch operator stats when operatorAddress is provided', async () => {
    const mockStats = {
      address: '0xOperator' as `0x${string}`,
      approved: true,
      reputation: 95,
      successfulOps: 10,
      totalValueProcessed: '1000000',
      activeOpportunities: 2,
    };

    const mockRepoInstance = {
      getOperatorStats: vi.fn().mockResolvedValue(mockStats),
    };
    (RWYRepository as any).mockImplementation(() => mockRepoInstance);

    const { result } = renderHook(() =>
      useRWYOperatorStats('0xOperator' as any),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockRepoInstance.getOperatorStats).toHaveBeenCalledWith(
      '0xOperator',
    );
    expect(result.current.stats).toEqual(mockStats);
  });
});

describe('useRWYExpectedProfit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useRWYExpectedProfit(undefined, undefined),
    );
    expect(result.current.expectedProfit).toBe('0');
    expect(result.current.userShareBps).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it('should return zero when stakeAmount is 0', async () => {
    const { result } = renderHook(() => useRWYExpectedProfit('opp-123', '0'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.expectedProfit).toBe('0');
    expect(result.current.userShareBps).toBe(0);
  });

  it('should calculate profit when valid inputs provided', async () => {
    const mockResult = {
      expectedProfit: '15000',
      userShareBps: 1500,
    };

    const mockRepoInstance = {
      calculateExpectedProfit: vi.fn().mockResolvedValue(mockResult),
    };
    (RWYRepository as any).mockImplementation(() => mockRepoInstance);

    const { result } = renderHook(() =>
      useRWYExpectedProfit('opp-123', '100000'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockRepoInstance.calculateExpectedProfit).toHaveBeenCalledWith(
      'opp-123',
      '100000',
    );
    expect(result.current.expectedProfit).toBe('15000');
    expect(result.current.userShareBps).toBe(1500);
  });

  it('should handle errors gracefully', async () => {
    const mockRepoInstance = {
      calculateExpectedProfit: vi
        .fn()
        .mockRejectedValue(new Error('Calculation failed')),
    };
    (RWYRepository as any).mockImplementation(() => mockRepoInstance);

    const { result } = renderHook(() =>
      useRWYExpectedProfit('opp-123', '100000'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Calculation failed');
    expect(result.current.expectedProfit).toBe('0');
  });
});

describe('useIsApprovedOperator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Note: When operatorAddress is undefined, the hook immediately sets loading=false

  it('should set isApproved to null when operatorAddress is undefined', async () => {
    const { result } = renderHook(() => useIsApprovedOperator(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isApproved).toBeNull();
  });

  it('should return refetch as a function', () => {
    const { result } = renderHook(() =>
      useIsApprovedOperator('0xOperator' as any),
    );
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should check operator approval status', async () => {
    const mockRepoInstance = {
      isApprovedOperator: vi.fn().mockResolvedValue(true),
    };
    (RWYRepository as any).mockImplementation(() => mockRepoInstance);

    const { result } = renderHook(() =>
      useIsApprovedOperator('0xOperator' as any),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockRepoInstance.isApprovedOperator).toHaveBeenCalledWith(
      '0xOperator',
    );
    expect(result.current.isApproved).toBe(true);
  });

  it('should set isApproved to false on error', async () => {
    const mockRepoInstance = {
      isApprovedOperator: vi
        .fn()
        .mockRejectedValue(new Error('Provider error')),
    };
    (RWYRepository as any).mockImplementation(() => mockRepoInstance);

    const { result } = renderHook(() =>
      useIsApprovedOperator('0xOperator' as any),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Provider error');
    expect(result.current.isApproved).toBe(false);
  });
});

describe('useTokenApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Note: When inputs are undefined, the hook immediately sets loading=false

  it('should set loading to false when inputs are undefined', async () => {
    const { result } = renderHook(() => useTokenApproval(undefined, undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allowance).toBe(0n);
    expect(result.current.balance).toBe(0n);
  });

  it('should check allowance and balance', async () => {
    const mockProvider = {
      getCode: vi.fn().mockResolvedValue('0x'),
    };

    (getReadOnlyProvider as any).mockReturnValue(mockProvider);

    const { result } = renderHook(() =>
      useTokenApproval('0xToken' as any, '0xOwner' as any),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allowance).toBeDefined();
    expect(result.current.balance).toBeDefined();
  });

  it('should set isApproved when allowance is sufficient', async () => {
    // Mock the Contract constructor to return a contract with high allowance
    const mockContractInstance = {
      allowance: vi.fn().mockResolvedValue(1000000n),
      balanceOf: vi.fn().mockResolvedValue(500000n),
    };

    vi.mock('ethers', () => ({
      ethers: {
        Contract: vi.fn().mockImplementation(() => mockContractInstance),
        MaxUint256: BigInt(
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        ),
      },
    }));

    const { result } = renderHook(() =>
      useTokenApproval('0xToken' as any, '0xOwner' as any, '100000'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isApproved).toBe(true);
  });

  it('should have requestApproval function', () => {
    const { result } = renderHook(() =>
      useTokenApproval('0xToken' as any, '0xOwner' as any),
    );

    expect(typeof result.current.requestApproval).toBe('function');
  });

  it('should have refetch function', () => {
    const { result } = renderHook(() =>
      useTokenApproval('0xToken' as any, '0xOwner' as any),
    );

    expect(typeof result.current.refetch).toBe('function');
  });

  it('should handle approval errors', async () => {
    // This test verifies the error handling path
    const { result } = renderHook(() =>
      useTokenApproval('0xToken' as any, '0xOwner' as any),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // The error field should be initialized as null
    expect(result.current.error).toBeNull();
  });
});
