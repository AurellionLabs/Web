import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  RWYOpportunityWithDynamicData,
  RWYStake,
  RWYOperatorStats,
  Address,
  BigNumberString,
} from '../domain/rwy';
import { RWYRepository } from '../infrastructure/repositories/rwy-repository';
import {
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_RPC_URL_84532,
} from '../chain-constants';

// RWY Staking is now part of the Diamond - use Diamond address
const RWY_CONTRACT_ADDRESS = NEXT_PUBLIC_DIAMOND_ADDRESS;

/**
 * Hook to fetch a single RWY opportunity with dynamic data
 */
export function useRWYOpportunity(opportunityId: string | undefined) {
  const [opportunity, setOpportunity] =
    useState<RWYOpportunityWithDynamicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunity = useCallback(async () => {
    if (!opportunityId || !RWY_CONTRACT_ADDRESS) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = window.ethereum
        ? new ethers.BrowserProvider(window.ethereum as any)
        : new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

      const repository = new RWYRepository(RWY_CONTRACT_ADDRESS, provider);
      const opp = await repository.getOpportunityWithDynamicData(opportunityId);

      setOpportunity(opp);
    } catch (err) {
      console.error('Error fetching opportunity:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch opportunity',
      );
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    fetchOpportunity();
  }, [fetchOpportunity]);

  return {
    opportunity,
    loading,
    error,
    refetch: fetchOpportunity,
  };
}

/**
 * Hook to fetch user's stake in an opportunity
 */
export function useRWYStake(
  opportunityId: string | undefined,
  userAddress: Address | undefined,
) {
  const [stake, setStake] = useState<RWYStake | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStake = useCallback(async () => {
    if (!opportunityId || !userAddress || !RWY_CONTRACT_ADDRESS) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = window.ethereum
        ? new ethers.BrowserProvider(window.ethereum as any)
        : new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

      const repository = new RWYRepository(RWY_CONTRACT_ADDRESS, provider);
      const userStake = await repository.getStake(opportunityId, userAddress);

      setStake(userStake);
    } catch (err) {
      console.error('Error fetching stake:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stake');
    } finally {
      setLoading(false);
    }
  }, [opportunityId, userAddress]);

  useEffect(() => {
    fetchStake();
  }, [fetchStake]);

  return {
    stake,
    loading,
    error,
    refetch: fetchStake,
  };
}

/**
 * Hook to fetch all stakers for an opportunity
 */
export function useRWYOpportunityStakers(opportunityId: string | undefined) {
  const [stakers, setStakers] = useState<RWYStake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStakers = useCallback(async () => {
    if (!opportunityId || !RWY_CONTRACT_ADDRESS) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = window.ethereum
        ? new ethers.BrowserProvider(window.ethereum as any)
        : new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

      const repository = new RWYRepository(RWY_CONTRACT_ADDRESS, provider);
      const oppStakers = await repository.getOpportunityStakers(opportunityId);

      setStakers(oppStakers);
    } catch (err) {
      console.error('Error fetching stakers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stakers');
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    fetchStakers();
  }, [fetchStakers]);

  return {
    stakers,
    loading,
    error,
    refetch: fetchStakers,
  };
}

/**
 * Hook to fetch operator statistics
 */
export function useRWYOperatorStats(operatorAddress: Address | undefined) {
  const [stats, setStats] = useState<RWYOperatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!operatorAddress || !RWY_CONTRACT_ADDRESS) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = window.ethereum
        ? new ethers.BrowserProvider(window.ethereum as any)
        : new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

      const repository = new RWYRepository(RWY_CONTRACT_ADDRESS, provider);
      const operatorStats = await repository.getOperatorStats(operatorAddress);

      setStats(operatorStats);
    } catch (err) {
      console.error('Error fetching operator stats:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch operator stats',
      );
    } finally {
      setLoading(false);
    }
  }, [operatorAddress]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

/**
 * Hook to calculate expected profit for a potential stake
 */
export function useRWYExpectedProfit(
  opportunityId: string | undefined,
  stakeAmount: BigNumberString | undefined,
) {
  const [expectedProfit, setExpectedProfit] = useState<BigNumberString>('0');
  const [userShareBps, setUserShareBps] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateProfit = useCallback(async () => {
    if (
      !opportunityId ||
      !stakeAmount ||
      !RWY_CONTRACT_ADDRESS ||
      BigInt(stakeAmount) === 0n
    ) {
      setExpectedProfit('0');
      setUserShareBps(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = window.ethereum
        ? new ethers.BrowserProvider(window.ethereum as any)
        : new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

      const repository = new RWYRepository(RWY_CONTRACT_ADDRESS, provider);
      const result = await repository.calculateExpectedProfit(
        opportunityId,
        stakeAmount,
      );

      setExpectedProfit(result.expectedProfit);
      setUserShareBps(result.userShareBps);
    } catch (err) {
      console.error('Error calculating profit:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to calculate profit',
      );
    } finally {
      setLoading(false);
    }
  }, [opportunityId, stakeAmount]);

  useEffect(() => {
    calculateProfit();
  }, [calculateProfit]);

  return {
    expectedProfit,
    userShareBps,
    loading,
    error,
  };
}

/**
 * Simple hook to check if an address is an approved operator
 * More lightweight than useRWYOperatorStats - just checks approval status
 * Uses JSON RPC provider directly (read-only, no wallet interaction needed)
 */
export function useIsApprovedOperator(operatorAddress: Address | undefined) {
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkApproval = useCallback(async () => {
    if (!operatorAddress || !RWY_CONTRACT_ADDRESS) {
      setLoading(false);
      setIsApproved(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use JSON RPC provider directly - this is a read-only call, no wallet needed
      const provider = new ethers.JsonRpcProvider(NEXT_PUBLIC_RPC_URL_84532);

      const repository = new RWYRepository(RWY_CONTRACT_ADDRESS, provider);
      const approved = await repository.isApprovedOperator(operatorAddress);

      setIsApproved(approved);
    } catch (err) {
      console.error('Error checking operator approval:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to check operator status',
      );
      setIsApproved(false);
    } finally {
      setLoading(false);
    }
  }, [operatorAddress]);

  useEffect(() => {
    checkApproval();
  }, [checkApproval]);

  return {
    isApproved,
    loading,
    error,
    refetch: checkApproval,
  };
}

// ERC20 ABI for token approval
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

/**
 * Hook to check and request ERC20 token approval for the Diamond contract
 * Used before creating pools to ensure collateral can be transferred
 */
export function useTokenApproval(
  tokenAddress: Address | undefined,
  ownerAddress: Address | undefined,
  requiredAmount?: BigNumberString,
) {
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [balance, setBalance] = useState<bigint>(0n);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spenderAddress = NEXT_PUBLIC_DIAMOND_ADDRESS;

  // Check current allowance and balance
  const checkAllowance = useCallback(async () => {
    if (!tokenAddress || !ownerAddress || !spenderAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use JSON RPC provider for read-only calls
      const provider = new ethers.JsonRpcProvider(NEXT_PUBLIC_RPC_URL_84532);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        provider,
      );

      const [currentAllowance, currentBalance] = await Promise.all([
        tokenContract.allowance(ownerAddress, spenderAddress),
        tokenContract.balanceOf(ownerAddress),
      ]);

      setAllowance(currentAllowance);
      setBalance(currentBalance);

      // Check if approved for required amount (or unlimited if no amount specified)
      const required = requiredAmount ? BigInt(requiredAmount) : 0n;
      setIsApproved(
        currentAllowance >= required || currentAllowance > 10n ** 50n,
      );
    } catch (err) {
      console.error('Error checking token allowance:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to check allowance',
      );
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, ownerAddress, spenderAddress, requiredAmount]);

  // Request approval from user's wallet
  const requestApproval = useCallback(
    async (amount?: BigNumberString) => {
      if (!tokenAddress || !ownerAddress || !spenderAddress) {
        throw new Error('Token or owner address not set');
      }

      if (!window.ethereum) {
        throw new Error('No wallet detected');
      }

      try {
        setApproving(true);
        setError(null);

        const provider = new ethers.BrowserProvider(window.ethereum as any);
        const signer = await provider.getSigner();
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ERC20_ABI,
          signer,
        );

        // Approve unlimited amount by default, or specific amount if provided
        const approvalAmount = amount ? BigInt(amount) : ethers.MaxUint256;
        const tx = await tokenContract.approve(spenderAddress, approvalAmount);
        await tx.wait();

        // Refresh allowance after approval
        await checkAllowance();

        return tx.hash;
      } catch (err: any) {
        console.error('Error requesting token approval:', err);
        const errorMessage =
          err?.reason || err?.message || 'Failed to approve tokens';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setApproving(false);
      }
    },
    [tokenAddress, ownerAddress, spenderAddress, checkAllowance],
  );

  useEffect(() => {
    checkAllowance();
  }, [checkAllowance]);

  return {
    allowance,
    balance,
    isApproved,
    loading,
    approving,
    error,
    requestApproval,
    refetch: checkAllowance,
  };
}
