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
  console.log('[PoolsProvider] Provider rendering...');

  // State
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [userPools, setUserPools] = useState<Pool[]>([]);
  const [providerPools, setProviderPools] = useState<Pool[]>([]);
  const [stakeHistory, setStakeHistory] = useState<StakeEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { address } = useWallet();
  const { currentUserRole } = useMainProvider();

  console.log(`[PoolsProvider] Address from useWallet on render: ${address}`);

  // Get repository and service instances
  // Uncomment these when the methods are implemented in the contexts
  // const poolRepository = RepositoryContext.getInstance().getPoolRepository();
  // const poolService = ServiceContext.getInstance().getPoolService();

  // Load all pools
  const loadAllPools = useCallback(async () => {
    console.log('[PoolsProvider] loadAllPools called');
    setLoading(true);
    setError(null);

    try {
      // TODO: Uncomment when pool repository is implemented
      // const poolRepository = RepositoryContext.getInstance().getPoolRepository();
      // const allPools = await poolRepository.getAllPools();
      // setPools(allPools);
      console.log('[PoolsProvider] Pool repository not yet implemented');
      setPools([]);
    } catch (err) {
      console.error('[PoolsProvider] Error in loadAllPools:', err);
      setError(err instanceof Error ? err : new Error('Failed to load pools'));
      setPools([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
        // TODO: Uncomment when pool repository is implemented
        // const poolRepository = RepositoryContext.getInstance().getPoolRepository();
        // const pools = await poolRepository.findPoolsByInvestor(targetAddress as Address);
        // setUserPools(pools);
        console.log('[PoolsProvider] Pool repository not yet implemented');
        setUserPools([]);
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
    [address],
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
        // TODO: Uncomment when pool repository is implemented
        // const poolRepository = RepositoryContext.getInstance().getPoolRepository();
        // const pools = await poolRepository.findPoolsByProvider(targetAddress as Address);
        // setProviderPools(pools);
        console.log('[PoolsProvider] Pool repository not yet implemented');
        setProviderPools([]);
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
    [address],
  );

  // Get pool by ID
  const getPoolById = useCallback(async (id: string): Promise<Pool | null> => {
    try {
      // TODO: Uncomment when pool repository is implemented
      // const poolRepository = RepositoryContext.getInstance().getPoolRepository();
      // return await poolRepository.getPoolById(id);
      console.log('[PoolsProvider] Pool repository not yet implemented');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get pool'));
      return null;
    }
  }, []);

  // Get pool with dynamic data
  const getPoolWithDynamicData = useCallback(
    async (id: string): Promise<(Pool & PoolDynamicData) | null> => {
      try {
        // TODO: Uncomment when pool repository is implemented
        // const poolRepository = RepositoryContext.getInstance().getPoolRepository();
        // return await poolRepository.getPoolWithDynamicData(id);
        console.log('[PoolsProvider] Pool repository not yet implemented');
        return null;
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to get pool with dynamic data'),
        );
        return null;
      }
    },
    [],
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

      setLoading(true);
      setError(null);

      try {
        // TODO: Uncomment when pool service is implemented
        // const poolService = ServiceContext.getInstance().getPoolService();
        // const result = await poolService.createPool(data, address as Address);
        // await refreshPools(); // Refresh pools after creation
        // return result;
        console.log('[PoolsProvider] Pool service not yet implemented');
        throw new Error('Pool service not yet implemented');
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to create pool'),
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [address],
  );

  // Close pool
  const closePool = useCallback(
    async (poolId: string): Promise<string> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        // TODO: Uncomment when pool service is implemented
        // const poolService = ServiceContext.getInstance().getPoolService();
        // const txHash = await poolService.closePool(poolId, address as Address);
        // await refreshPools(); // Refresh pools after closing
        // return txHash;
        console.log('[PoolsProvider] Pool service not yet implemented');
        throw new Error('Pool service not yet implemented');
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to close pool'),
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [address],
  );

  // Stake in pool
  const stake = useCallback(
    async (poolId: string, amount: BigNumberString): Promise<string> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        // TODO: Uncomment when pool service is implemented
        // const poolService = ServiceContext.getInstance().getPoolService();
        // const txHash = await poolService.stake(poolId, amount, address as Address);
        // await refreshPools(); // Refresh pools after staking
        // return txHash;
        console.log('[PoolsProvider] Pool service not yet implemented');
        throw new Error('Pool service not yet implemented');
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to stake'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [address],
  );

  // Claim reward
  const claimReward = useCallback(
    async (poolId: string): Promise<string> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        // TODO: Uncomment when pool service is implemented
        // const poolService = ServiceContext.getInstance().getPoolService();
        // const txHash = await poolService.claimReward(poolId, address as Address);
        // await refreshPools(); // Refresh pools after claiming
        // return txHash;
        console.log('[PoolsProvider] Pool service not yet implemented');
        throw new Error('Pool service not yet implemented');
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to claim reward'),
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [address],
  );

  // Unlock reward (for providers)
  const unlockReward = useCallback(
    async (poolId: string): Promise<string> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        // TODO: Uncomment when pool service is implemented
        // const poolService = ServiceContext.getInstance().getPoolService();
        // const txHash = await poolService.unlockReward(poolId, address as Address);
        // await refreshPools(); // Refresh pools after unlocking
        // return txHash;
        console.log('[PoolsProvider] Pool service not yet implemented');
        throw new Error('Pool service not yet implemented');
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to unlock reward'),
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [address],
  );

  // Load stake history for a pool
  const loadStakeHistory = useCallback(async (poolId: string) => {
    console.log(`[PoolsProvider] Loading stake history for pool: ${poolId}`);
    setLoading(true);
    setError(null);

    try {
      // TODO: Uncomment when pool repository is implemented
      // const poolRepository = RepositoryContext.getInstance().getPoolRepository();
      // const history = await poolRepository.getPoolStakeHistory(poolId);
      // setStakeHistory(history);
      console.log('[PoolsProvider] Pool repository not yet implemented');
      setStakeHistory([]);
    } catch (err) {
      console.error('[PoolsProvider] Error loading stake history:', err);
      setError(
        err instanceof Error ? err : new Error('Failed to load stake history'),
      );
      setStakeHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get grouped stake history
  const getGroupedStakeHistory = useCallback(
    async (poolId: string, interval: '1H' | '1D' | '1W' | '1M' | '1Y') => {
      try {
        // TODO: Uncomment when pool repository is implemented
        // const poolRepository = RepositoryContext.getInstance().getPoolRepository();
        // return await poolRepository.getGroupedStakeHistory(poolId, interval);
        console.log('[PoolsProvider] Pool repository not yet implemented');
        return {};
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to get grouped stake history'),
        );
        return {};
      }
    },
    [],
  );

  // Calculate pool dynamics
  const calculatePoolDynamics = useCallback(
    async (pool: Pool): Promise<PoolDynamicData> => {
      try {
        // TODO: Uncomment when pool repository is implemented
        // const poolRepository = RepositoryContext.getInstance().getPoolRepository();
        // return await poolRepository.calculatePoolDynamicData(pool);
        console.log('[PoolsProvider] Pool repository not yet implemented');

        // Return default values for now
        return {
          progressPercentage: 0,
          timeRemainingSeconds: 0,
          tvlFormatted: '0',
          fundingGoalFormatted: '0',
          rewardFormatted: '0%',
        };
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to calculate pool dynamics'),
        );
        throw err;
      }
    },
    [],
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
