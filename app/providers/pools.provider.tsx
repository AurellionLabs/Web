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
  Address,
  BigNumberString,
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
  getPoolCapacity: (poolId: string) => Promise<{
    targetAmount: string;
    stakedAmount: string;
    remainingCapacity: string;
    fundingDeadline: number;
    status: number;
    isFunding: boolean;
  }>;
  validateStakeAmount: (
    poolId: string,
    amount: BigNumberString,
  ) => Promise<{
    isValid: boolean;
    error?: string;
    remainingCapacity?: string;
    userBalance?: string;
  }>;

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

// Dummy data has been removed - now using actual repository and service

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

  // Repository and Service instances
  const poolRepository = RepositoryContext.getInstance().getPoolRepository();
  const poolService = ServiceContext.getInstance().getPoolService();

  // Helper function removed - now using repository for pool dynamics calculation

  // Load all pools
  const loadAllPools = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!poolRepository) {
        throw new Error('Pool repository not available');
      }

      // Get all pools with dynamic data from repository
      const allPools = await poolRepository.getAllPoolsWithDynamicData();
      setPools(allPools);
    } catch (err) {
      console.error('[PoolsProvider] Error in loadAllPools:', err);
      setError(err instanceof Error ? err : new Error('Failed to load pools'));
      setPools([]);
    } finally {
      setLoading(false);
    }
  }, [poolRepository]);

  // Load user pools (pools where user has staked)
  const loadUserPools = useCallback(
    async (userAddress?: string) => {
      const targetAddress = userAddress ?? address;
      if (!targetAddress) {
        return;
      }
      setLoading(true);
      setError(null);

      try {
        if (!poolRepository) {
          throw new Error('Pool repository not available');
        }

        // Get user pools with dynamic data from repository
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
    [address, poolRepository],
  );

  // Load provider pools (pools created by the provider)
  const loadProviderPools = useCallback(
    async (providerAddress?: string) => {
      const targetAddress = providerAddress ?? address;
      if (!targetAddress) {
        return;
      }
      setLoading(true);
      setError(null);

      try {
        if (!poolRepository) {
          throw new Error('Pool repository not available');
        }

        // Get provider pools with dynamic data from repository
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
    [address, poolRepository],
  );

  // Get pool by ID
  const getPoolById = useCallback(
    async (id: string): Promise<Pool | null> => {
      try {
        if (!poolRepository) {
          throw new Error('Pool repository not available');
        }

        // Get pool from repository
        const pool = await poolRepository.getPoolById(id);
        return pool;
      } catch (err) {
        console.error('[PoolsProvider] Error in getPoolById:', err);
        setError(err instanceof Error ? err : new Error('Failed to get pool'));
        return null;
      }
    },
    [poolRepository],
  );

  // Get pool with dynamic data
  const getPoolWithDynamicData = useCallback(
    async (id: string): Promise<(Pool & PoolDynamicData) | null> => {
      try {
        if (!poolRepository) {
          throw new Error('Pool repository not available');
        }

        // Get pool with dynamic data from repository
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
    [poolRepository],
  );

  // Select pool
  const selectPool = useCallback((pool: Pool) => {
    setSelectedPool(pool);
  }, []);

  // Clear selected pool
  const clearSelectedPool = useCallback(() => {
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

      if (!poolService) {
        throw new Error('Pool service not available');
      }
      setLoading(true);
      setError(null);

      try {
        // Use pool service to create pool
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
    [address, poolService, loadAllPools, loadProviderPools],
  );

  // Close pool
  const closePool = useCallback(
    async (poolId: string): Promise<string> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (!poolService) {
        throw new Error('Pool service not available');
      }
      setLoading(true);
      setError(null);

      try {
        // Use pool service to close pool
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
    [address, poolService, loadAllPools, loadProviderPools],
  );

  // Stake in pool
  const stake = useCallback(
    async (poolId: string, amount: BigNumberString): Promise<string> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (!poolService) {
        throw new Error('Pool service not available');
      }
      setLoading(true);
      setError(null);

      try {
        // Use pool service to stake
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
    [address, poolService, loadAllPools, loadUserPools],
  );

  // Claim reward
  const claimReward = useCallback(
    async (poolId: string): Promise<string> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (!poolService) {
        throw new Error('Pool service not available');
      }
      setLoading(true);
      setError(null);

      try {
        // Use pool service to claim reward
        const transactionHash = await poolService.claimReward(
          poolId,
          address as Address,
        );
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
    [address, poolService],
  );

  // Unlock reward (for providers)
  const unlockReward = useCallback(
    async (poolId: string): Promise<string> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (!poolService) {
        throw new Error('Pool service not available');
      }
      setLoading(true);
      setError(null);

      try {
        // Use pool service to unlock reward
        const transactionHash = await poolService.unlockReward(
          poolId,
          address as Address,
        );

        // Refresh pools after unlocking
        await loadAllPools();
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
    [address, poolService, loadAllPools, loadProviderPools],
  );

  // Get pool capacity information
  const getPoolCapacity = useCallback(
    async (poolId: string) => {
      if (!poolService) {
        throw new Error('Pool service not available');
      }

      try {
        const capacity = await poolService.getPoolCapacity(poolId);
        return capacity;
      } catch (err) {
        console.error('[PoolsProvider] Error in getPoolCapacity:', err);
        throw err;
      }
    },
    [poolService],
  );

  // Validate stake amount before submitting
  const validateStakeAmount = useCallback(
    async (poolId: string, amount: BigNumberString) => {
      if (!poolService) {
        throw new Error('Pool service not available');
      }

      try {
        const validation = await poolService.validateStakeAmount(
          poolId,
          amount,
        );
        return validation;
      } catch (err) {
        console.error('[PoolsProvider] Error in validateStakeAmount:', err);
        return {
          isValid: false,
          error: `Validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        };
      }
    },
    [poolService],
  );

  // Load stake history for a pool
  const loadStakeHistory = useCallback(
    async (poolId: string) => {
      // Prevent duplicate calls for the same pool
      if (stakeHistoryLoading && loadingStakeHistoryFor === poolId) {
        return;
      }
      setStakeHistoryLoading(true);
      setLoadingStakeHistoryFor(poolId);
      setError(null);

      try {
        if (!poolRepository) {
          throw new Error('Pool repository not available');
        }

        // Get stake history from repository
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
    [stakeHistoryLoading, loadingStakeHistoryFor, poolRepository],
  );

  // Get grouped stake history
  const getGroupedStakeHistory = useCallback(
    async (poolId: string, interval: '1H' | '1D' | '1W' | '1M' | '1Y') => {
      try {
        if (!poolRepository) {
          throw new Error('Pool repository not available');
        }

        // Get grouped stake history from repository
        const groupedData = await poolRepository.getGroupedStakeHistory(
          poolId,
          interval,
        );
        return groupedData;
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
    [poolRepository],
  );

  // Calculate pool dynamics
  const calculatePoolDynamics = useCallback(
    async (pool: Pool): Promise<PoolDynamicData> => {
      try {
        if (!poolRepository) {
          throw new Error('Pool repository not available');
        }

        // Use repository to calculate pool dynamics
        const dynamics = await poolRepository.calculatePoolDynamicData(pool);
        return dynamics;
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
    [poolRepository],
  );

  // Refresh all pools
  const refreshPools = useCallback(async () => {
    await Promise.all([
      loadAllPools(),
      address ? loadUserPools(address) : Promise.resolve(),
      address ? loadProviderPools(address) : Promise.resolve(),
    ]);
  }, [loadAllPools, loadUserPools, loadProviderPools, address]);

  // Auto-load pools when address changes
  useEffect(() => {
    if (address) {
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
    getPoolCapacity,
    validateStakeAmount,

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
