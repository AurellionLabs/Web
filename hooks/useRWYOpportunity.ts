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
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '../chain-constants';

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

      const provider = window.ethereum
        ? new ethers.BrowserProvider(window.ethereum as any)
        : new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

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
