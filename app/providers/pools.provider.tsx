'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Pool,
  PoolCreationData,
  PoolDynamicData,
  StakeEvent,
  PoolStatus,
  Address,
  BigNumberString,
  IPoolRepository,
  IPoolService,
} from '@/domain/pool';
import { useWallet } from '@/hooks/useWallet';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { useMainProvider } from './main.provider';

type PoolContextType = {
  // State
  pools: Pool[];
  selectedPool: Pool | null;
  userPools: Pool[];
  providerPools: Pool[];
  stakeHistory: StakeEvent[];
  loading: boolean;
  error: Error | null;

  // Stake history loading state
  stakeHistoryLoading: boolean;
  loadingStakeHistoryFor: string | null;

  // Pool operations
  loadAllPools: () => Promise<void>;
  loadUserPools: (address?: string) => Promise<void>;
  loadProviderPools: (address?: string) => Promise<void>;
  getPoolById: (id: string) => Promise<Pool | null>;
  getPoolWithDynamicData: (
    id: string,
  ) => Promise<(Pool & PoolDynamicData) | null>;
  selectPool: (pool: Pool) => void;
  clearSelectedPool: () => void;

  // Pool creation and management
  createPool: (
    data: PoolCreationData,
  ) => Promise<{ poolId: string; transactionHash: string }>;
  closePool: (poolId: string) => Promise<string>;

  // Staking operations
  stake: (poolId: string, amount: BigNumberString) => Promise<string>;
  claimReward: (poolId: string) => Promise<string>;
  unlockReward: (poolId: string) => Promise<string>;

  // Stake history
  loadStakeHistory: (poolId: string) => Promise<void>;
  getGroupedStakeHistory: (
    poolId: string,
    interval: '1H' | '1D' | '1W' | '1M' | '1Y',
  ) => Promise<any>;

  // Utility
  refreshPools: () => Promise<void>;
  calculatePoolDynamics: (pool: Pool) => Promise<PoolDynamicData>;
};

const PoolContext = createContext<PoolContextType | undefined>(undefined);

export const PoolsProvider = ({ children }: { children: ReactNode }) => {
  // State
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [userPools, setUserPools] = useState<Pool[]>([]);
  const [providerPools, setProviderPools] = useState<Pool[]>([]);
  const [stakeHistory, setStakeHistory] = useState<StakeEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Separate loading state for stake history to prevent conflicts
  const [stakeHistoryLoading, setStakeHistoryLoading] = useState(false);
  const [loadingStakeHistoryFor, setLoadingStakeHistoryFor] = useState<
    string | null
  >(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { address } = useWallet();
  const { currentUserRole } = useMainProvider();

  // Get service instances
  const getPoolService = useCallback((): IPoolService => {
    try {
      const repositoryContext = RepositoryContext.getInstance();
      const serviceContext = ServiceContext.getInstance(repositoryContext);
      return serviceContext.getPoolService();
    } catch (err) {
      console.error('[PoolsProvider] Error getting pool service:', err);
      throw new Error(
        'Pool service not available. Please check your wallet connection.',
      );
    }
  }, []);

  const getPoolRepository = useCallback((): IPoolRepository => {
    try {
      const repositoryContext = RepositoryContext.getInstance();
      return repositoryContext.getPoolRepository();
    } catch (err) {
      console.error('[PoolsProvider] Error getting pool repository:', err);
      throw new Error(
        'Pool repository not available. Please check your wallet connection.',
      );
    }
  }, []);

  // Load all pools
  const loadAllPools = useCallback(async () => {
    console.log('[PoolsProvider] loadAllPools called');
    setLoading(true);
    setError(null);

    try {
      const poolRepository = getPoolRepository();
      const poolsWithDynamicData =
        await poolRepository.getAllPoolsWithDynamicData();
      setPools(poolsWithDynamicData);
    } catch (err) {
      console.error('[PoolsProvider] Error in loadAllPools:', err);
      setError(err instanceof Error ? err : new Error('Failed to load pools'));
      setPools([]);
    } finally {
      setLoading(false);
    }
  }, [getPoolRepository]);

  // Load user pools (pools where user has staked)
  const loadUserPools = useCallback(
    async (userAddress?: string) => {
      const targetAddress = userAddress ?? address;
      if (!targetAddress) {
        console.log('[PoolsProvider] No address provided for loadUserPools');
        return;
      }

      console.log(
        `[PoolsProvider] loadUserPools called for address: ${targetAddress}`,
      );
      setLoading(true);
      setError(null);

      try {
        const poolRepository = getPoolRepository();
        const userPoolsWithDynamicData =
          await poolRepository.getUserPoolsWithDynamicData(
            targetAddress as Address,
          );
        setUserPools(userPoolsWithDynamicData);
      } catch (err) {
        console.error('[PoolsProvider] Error in loadUserPools:', err);
        setError(
          err instanceof Error ? err : new Error('Failed to load user pools'),
        );
        setUserPools([]);
      } finally {
        setLoading(false);
      }
    },
    [address, getPoolRepository],
  );

  // Load provider pools (pools created by the provider)
  const loadProviderPools = useCallback(
    async (providerAddress?: string) => {
      const targetAddress = providerAddress ?? address;
      if (!targetAddress) {
        console.log(
          '[PoolsProvider] No address provided for loadProviderPools',
        );
        return;
      }

      console.log(
        `[PoolsProvider] loadProviderPools called for address: ${targetAddress}`,
      );
      setLoading(true);
      setError(null);

      try {
        const poolRepository = getPoolRepository();
        const providerPoolsWithDynamicData =
          await poolRepository.getProviderPoolsWithDynamicData(
            targetAddress as Address,
          );
        setProviderPools(providerPoolsWithDynamicData);
      } catch (err) {
        console.error('[PoolsProvider] Error in loadProviderPools:', err);
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to load provider pools'),
        );
        setProviderPools([]);
      } finally {
        setLoading(false);
      }
    },
    [address, getPoolRepository],
  );

  // Get pool by ID
  const getPoolById = useCallback(
    async (id: string): Promise<Pool | null> => {
      try {
        const poolRepository = getPoolRepository();
        const pool = await poolRepository.getPoolById(id);
        return pool;
      } catch (err) {
        console.error('[PoolsProvider] Error in getPoolById:', err);
        setError(err instanceof Error ? err : new Error('Failed to get pool'));
        return null;
      }
    },
    [getPoolRepository],
  );

  // Get pool with dynamic data
  const getPoolWithDynamicData = useCallback(
    async (id: string): Promise<(Pool & PoolDynamicData) | null> => {
      try {
        const poolRepository = getPoolRepository();
        const poolWithDynamicData =
          await poolRepository.getPoolWithDynamicData(id);
        return poolWithDynamicData;
      } catch (err) {
        console.error('[PoolsProvider] Error in getPoolWithDynamicData:', err);
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to get pool with dynamic data'),
        );
        return null;
      }
    },
    [getPoolRepository],
  );

  // Select pool
  const selectPool = useCallback((pool: Pool) => {
    console.log(`[PoolsProvider] Selecting pool: ${pool.id}`);
    setSelectedPool(pool);
  }, []);

  // Clear selected pool
  const clearSelectedPool = useCallback(() => {
    console.log('[PoolsProvider] Clearing selected pool');
    setSelectedPool(null);
  }, []);

  // Create pool
  const createPool = useCallback(
    async (
      data: PoolCreationData,
    ): Promise<{ poolId: string; transactionHash: string }> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      console.log('[PoolsProvider] Creating pool with data:', data);
      setLoading(true);
      setError(null);

      try {
        const poolService = getPoolService();
        const result = await poolService.createPool(data, address as Address);

        // Refresh pools after creation
        await loadAllPools();
        await loadProviderPools();

        return result;
      } catch (err) {
        console.error('[PoolsProvider] Error in createPool:', err);
        setError(
          err instanceof Error ? err : new Error('Failed to create pool'),
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [address, getPoolService, loadAllPools, loadProviderPools],
  );

  // Close pool
  const closePool = useCallback(
    async (poolId: string): Promise<string> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      console.log(`[PoolsProvider] Closing pool: ${poolId}`);
      setLoading(true);
      setError(null);

      try {
        const poolService = getPoolService();
        const transactionHash = await poolService.closePool(
          poolId,
          address as Address,
        );

        // Refresh pools after closing
        await loadAllPools();
        await loadProviderPools();

        return transactionHash;
      } catch (err) {
        console.error('[PoolsProvider] Error in closePool:', err);
        setError(
          err instanceof Error ? err : new Error('Failed to close pool'),
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [address, getPoolService, loadAllPools, loadProviderPools],
  );

  // Stake in pool
  const stake = useCallback(
    async (poolId: string, amount: BigNumberString): Promise<string> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      console.log(`[PoolsProvider] Staking ${amount} in pool: ${poolId}`);
      setLoading(true);
      setError(null);

      try {
        const poolService = getPoolService();
        const transactionHash = await poolService.stake(
          poolId,
          amount,
          address as Address,
        );

        // Refresh pools and user pools after staking
        await loadAllPools();
        await loadUserPools();

        return transactionHash;
      } catch (err) {
        console.error('[PoolsProvider] Error in stake:', err);
        setError(err instanceof Error ? err : new Error('Failed to stake'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [address, getPoolService, loadAllPools, loadUserPools],
  );

  // Claim reward
  const claimReward = useCallback(
    async (poolId: string): Promise<string> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      console.log(`[PoolsProvider] Claiming reward for pool: ${poolId}`);
      setLoading(true);
      setError(null);

      try {
        const poolService = getPoolService();
        const transactionHash = await poolService.claimReward(
          poolId,
          address as Address,
        );

        // Refresh user pools after claiming reward
        await loadUserPools();

        return transactionHash;
      } catch (err) {
        console.error('[PoolsProvider] Error in claimReward:', err);
        setError(
          err instanceof Error ? err : new Error('Failed to claim reward'),
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [address, getPoolService, loadUserPools],
  );

  // Unlock reward (for providers)
  const unlockReward = useCallback(
    async (poolId: string): Promise<string> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      console.log(`[PoolsProvider] Unlocking reward for pool: ${poolId}`);
      setLoading(true);
      setError(null);

      try {
        const poolService = getPoolService();
        const transactionHash = await poolService.unlockReward(
          poolId,
          address as Address,
        );

        // Refresh provider pools after unlocking reward
        await loadProviderPools();

        return transactionHash;
      } catch (err) {
        console.error('[PoolsProvider] Error in unlockReward:', err);
        setError(
          err instanceof Error ? err : new Error('Failed to unlock reward'),
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [address, getPoolService, loadProviderPools],
  );

  // Load stake history for a pool
  const loadStakeHistory = useCallback(
    async (poolId: string) => {
      // Prevent duplicate calls for the same pool
      if (stakeHistoryLoading && loadingStakeHistoryFor === poolId) {
        console.log(
          `[PoolsProvider] Already loading stake history for pool: ${poolId}, skipping...`,
        );
        return;
      }

      console.log(`[PoolsProvider] Loading stake history for pool: ${poolId}`);
      setStakeHistoryLoading(true);
      setLoadingStakeHistoryFor(poolId);
      setError(null);

      try {
        const poolRepository = getPoolRepository();
        const history = await poolRepository.getPoolStakeHistory(poolId);
        setStakeHistory(history);
      } catch (err) {
        console.error('[PoolsProvider] Error loading stake history:', err);
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to load stake history'),
        );
        setStakeHistory([]);
      } finally {
        setStakeHistoryLoading(false);
        setLoadingStakeHistoryFor(null);
      }
    },
    [getPoolRepository, stakeHistoryLoading, loadingStakeHistoryFor],
  );

  // Get grouped stake history
  const getGroupedStakeHistory = useCallback(
    async (poolId: string, interval: '1H' | '1D' | '1W' | '1M' | '1Y') => {
      try {
        const poolRepository = getPoolRepository();
        const groupedHistory = await poolRepository.getGroupedStakeHistory(
          poolId,
          interval,
        );
        return groupedHistory;
      } catch (err) {
        console.error(
          '[PoolsProvider] Error getting grouped stake history:',
          err,
        );
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to get grouped stake history'),
        );
        return {};
      }
    },
    [getPoolRepository],
  );

  // Calculate pool dynamics
  const calculatePoolDynamics = useCallback(
    async (pool: Pool): Promise<PoolDynamicData> => {
      try {
        const poolRepository = getPoolRepository();
        const dynamicData = await poolRepository.calculatePoolDynamicData(pool);
        return dynamicData;
      } catch (err) {
        console.error('[PoolsProvider] Error calculating pool dynamics:', err);
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to calculate pool dynamics'),
        );
        throw err;
      }
    },
    [getPoolRepository],
  );

  // Refresh all pools
  const refreshPools = useCallback(async () => {
    console.log('[PoolsProvider] Refreshing all pools...');
    await Promise.all([
      loadAllPools(),
      address ? loadUserPools(address) : Promise.resolve(),
      address ? loadProviderPools(address) : Promise.resolve(),
    ]);
  }, [loadAllPools, loadUserPools, loadProviderPools, address]);

  // Auto-load pools when address changes
  useEffect(() => {
    if (address) {
      console.log(
        `[PoolsProvider] Address changed to ${address}, loading pools...`,
      );
      refreshPools();
    }
  }, [address, refreshPools]);

  const contextValue: PoolContextType = {
    // State
    pools,
    selectedPool,
    userPools,
    providerPools,
    stakeHistory,
    loading,
    error,

    // Stake history loading state
    stakeHistoryLoading,
    loadingStakeHistoryFor,

    // Pool operations
    loadAllPools,
    loadUserPools,
    loadProviderPools,
    getPoolById,
    getPoolWithDynamicData,
    selectPool,
    clearSelectedPool,

    // Pool creation and management
    createPool,
    closePool,

    // Staking operations
    stake,
    claimReward,
    unlockReward,

    // Stake history
    loadStakeHistory,
    getGroupedStakeHistory,

    // Utility
    refreshPools,
    calculatePoolDynamics,
  };

  return (
    <PoolContext.Provider value={contextValue}>{children}</PoolContext.Provider>
  );
};

export function usePoolsProvider() {
  const context = useContext(PoolContext);
  if (!context) {
    throw new Error('usePoolsProvider must be used within a PoolsProvider');
  }
  return context;
}
