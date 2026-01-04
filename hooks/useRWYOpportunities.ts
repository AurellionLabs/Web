import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  RWYOpportunity,
  RWYOpportunityWithDynamicData,
  RWYOpportunityStatus,
  Address,
} from '../domain/rwy';
import { RWYRepository } from '../infrastructure/repositories/rwy-repository';

// Contract address - should come from environment/config
const RWY_VAULT_ADDRESS = process.env.NEXT_PUBLIC_RWY_VAULT_ADDRESS || '';

/**
 * Hook to fetch and manage RWY opportunities
 */
export function useRWYOpportunities() {
  const [opportunities, setOpportunities] = useState<
    RWYOpportunityWithDynamicData[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    if (!RWY_VAULT_ADDRESS) {
      setError('RWY Vault address not configured');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use window.ethereum or a default provider
      const provider = window.ethereum
        ? new ethers.BrowserProvider(window.ethereum)
        : new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

      const repository = new RWYRepository(RWY_VAULT_ADDRESS, provider);
      const opps = await repository.getAllOpportunitiesWithDynamicData();

      setOpportunities(opps);
    } catch (err) {
      console.error('Error fetching opportunities:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch opportunities',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  return {
    opportunities,
    loading,
    error,
    refetch: fetchOpportunities,
  };
}

/**
 * Hook to fetch active (funding) opportunities only
 */
export function useActiveRWYOpportunities() {
  const { opportunities, loading, error, refetch } = useRWYOpportunities();

  const activeOpportunities = opportunities.filter(
    (opp) =>
      opp.status === RWYOpportunityStatus.FUNDING &&
      opp.timeToFundingDeadline > 0 &&
      BigInt(opp.stakedAmount) < BigInt(opp.targetAmount),
  );

  return {
    opportunities: activeOpportunities,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch opportunities by operator
 */
export function useOperatorRWYOpportunities(operator: Address | undefined) {
  const [opportunities, setOpportunities] = useState<
    RWYOpportunityWithDynamicData[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    if (!operator || !RWY_VAULT_ADDRESS) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = window.ethereum
        ? new ethers.BrowserProvider(window.ethereum)
        : new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

      const repository = new RWYRepository(RWY_VAULT_ADDRESS, provider);
      const allOpps = await repository.getAllOpportunitiesWithDynamicData();
      const operatorOpps = allOpps.filter(
        (opp) => opp.operator.toLowerCase() === operator.toLowerCase(),
      );

      setOpportunities(operatorOpps);
    } catch (err) {
      console.error('Error fetching operator opportunities:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch opportunities',
      );
    } finally {
      setLoading(false);
    }
  }, [operator]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  return {
    opportunities,
    loading,
    error,
    refetch: fetchOpportunities,
  };
}

/**
 * Hook to fetch opportunities a user has staked in
 */
export function useUserRWYStakes(userAddress: Address | undefined) {
  const [opportunities, setOpportunities] = useState<
    RWYOpportunityWithDynamicData[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStakes = useCallback(async () => {
    if (!userAddress || !RWY_VAULT_ADDRESS) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = window.ethereum
        ? new ethers.BrowserProvider(window.ethereum)
        : new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

      const repository = new RWYRepository(RWY_VAULT_ADDRESS, provider);
      const stakerOpps = await repository.getStakerOpportunities(userAddress);

      // Get dynamic data for each
      const oppsWithData: RWYOpportunityWithDynamicData[] = [];
      for (const opp of stakerOpps) {
        const withData = await repository.getOpportunityWithDynamicData(opp.id);
        if (withData) oppsWithData.push(withData);
      }

      setOpportunities(oppsWithData);
    } catch (err) {
      console.error('Error fetching user stakes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stakes');
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchStakes();
  }, [fetchStakes]);

  return {
    opportunities,
    loading,
    error,
    refetch: fetchStakes,
  };
}
