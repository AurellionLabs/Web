import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  RWYOpportunity,
  RWYOpportunityWithDynamicData,
  RWYOpportunityStatus,
  Address,
} from '../domain/rwy';
import { RWYRepository } from '../infrastructure/repositories/rwy-repository';
import { useWallet } from './useWallet';

// RWY Staking is now part of the Diamond - use Diamond address
const RWY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DIAMOND_ADDRESS || '';

/**
 * Hook to fetch and manage RWY opportunities
 */
export function useRWYOpportunities() {
  const { isConnected, repository: walletRepository } = useWallet();
  const [opportunities, setOpportunities] = useState<
    RWYOpportunityWithDynamicData[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    if (!RWY_CONTRACT_ADDRESS) {
      setError('Diamond address not configured');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider =
        isConnected && walletRepository
          ? await walletRepository.getProvider()
          : new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

      const repository = new RWYRepository(RWY_CONTRACT_ADDRESS, provider);
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
  }, [isConnected, walletRepository]);

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
  const { isConnected, repository: walletRepository } = useWallet();
  const [opportunities, setOpportunities] = useState<
    RWYOpportunityWithDynamicData[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    if (!operator || !RWY_CONTRACT_ADDRESS) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider =
        isConnected && walletRepository
          ? await walletRepository.getProvider()
          : new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

      const repository = new RWYRepository(RWY_CONTRACT_ADDRESS, provider);
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
  }, [operator, isConnected, walletRepository]);

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
  const { isConnected, repository: walletRepository } = useWallet();
  const [opportunities, setOpportunities] = useState<
    RWYOpportunityWithDynamicData[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStakes = useCallback(async () => {
    if (!userAddress || !RWY_CONTRACT_ADDRESS) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider =
        isConnected && walletRepository
          ? await walletRepository.getProvider()
          : new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

      const repository = new RWYRepository(RWY_CONTRACT_ADDRESS, provider);
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
  }, [userAddress, isConnected, walletRepository]);

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
