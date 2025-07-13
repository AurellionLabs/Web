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

// Dummy data for testing
const DUMMY_POOLS: Pool[] = [
  {
    id: 'pool-1',
    name: 'Premium Livestock Fund',
    description:
      'High-yield livestock investment pool focusing on premium cattle and sheep',
    assetName: 'Cattle',
    tokenAddress: '0x1234567890123456789012345678901234567890' as Address,
    providerAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address,
    fundingGoal: '1000000',
    totalValueLocked: '750000',
    startDate: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60, // 30 days ago
    durationDays: 90,
    rewardRate: 1200, // 12%
    status: PoolStatus.ACTIVE,
    supportingDocuments: [
      {
        name: 'Livestock_Investment_Prospectus.pdf',
        type: 'application/pdf',
        size: 2048576, // 2MB
        ipfsHash: 'QmTzQ2JRKQqgcKVHLxhGNwLxhGNwLxhGNwLxhGNwLxhGNwLx',
      },
      {
        name: 'Cattle_Farm_Photos.jpg',
        type: 'image/jpeg',
        size: 1536000, // 1.5MB
        ipfsHash: 'QmRzQ2JRKQqgcKVHLxhGNwLxhGNwLxhGNwLxhGNwLxhGNwLy',
      },
      {
        name: 'Financial_Projections.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 512000, // 500KB
        ipfsHash: 'QmSzQ2JRKQqgcKVHLxhGNwLxhGNwLxhGNwLxhGNwLxhGNwLz',
      },
    ],
  },
  {
    id: 'pool-2',
    name: 'Sustainable Agriculture Pool',
    description:
      'Investment in sustainable farming practices and organic produce',
    assetName: 'Organic Crops',
    tokenAddress: '0x2234567890123456789012345678901234567891' as Address,
    providerAddress: '0xbcdefabcdefabcdefabcdefabcdefabcdefabcde' as Address,
    fundingGoal: '500000',
    totalValueLocked: '500000',
    startDate: Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60, // 90 days ago
    durationDays: 90,
    rewardRate: 800, // 8%
    status: PoolStatus.COMPLETE,
    supportingDocuments: [
      {
        name: 'Organic_Certification.pdf',
        type: 'application/pdf',
        size: 1024000, // 1MB
        ipfsHash: 'QmUzQ2JRKQqgcKVHLxhGNwLxhGNwLxhGNwLxhGNwLxhGNwLa',
      },
      {
        name: 'Crop_Yield_Analysis.png',
        type: 'image/png',
        size: 2048000, // 2MB
        ipfsHash: 'QmVzQ2JRKQqgcKVHLxhGNwLxhGNwLxhGNwLxhGNwLxhGNwLb',
      },
    ],
  },
  {
    id: 'pool-3',
    name: 'Poultry Excellence Fund',
    description:
      'Premium poultry farming with focus on free-range chickens and ducks',
    assetName: 'Poultry',
    tokenAddress: '0x3334567890123456789012345678901234567892' as Address,
    providerAddress: '0xcdefabcdefabcdefabcdefabcdefabcdefabcdef' as Address,
    fundingGoal: '2000000',
    totalValueLocked: '450000',
    startDate: Math.floor(Date.now() / 1000) - 10 * 24 * 60 * 60, // 10 days ago
    durationDays: 120,
    rewardRate: 1500, // 15%
    status: PoolStatus.ACTIVE,
    supportingDocuments: [
      {
        name: 'Poultry_Farm_Business_Plan.pdf',
        type: 'application/pdf',
        size: 3072000, // 3MB
        ipfsHash: 'QmWzQ2JRKQqgcKVHLxhGNwLxhGNwLxhGNwLxhGNwLxhGNwLc',
      },
      {
        name: 'Farm_License_Document.doc',
        type: 'application/msword',
        size: 256000, // 256KB
        ipfsHash: 'QmXzQ2JRKQqgcKVHLxhGNwLxhGNwLxhGNwLxhGNwLxhGNwLd',
      },
      {
        name: 'Recent_Upload_Processing.gif',
        type: 'image/gif',
        size: 1024000, // 1MB
        // No ipfsHash to test "Processing..." state
      },
    ],
  },
  {
    id: 'pool-4',
    name: 'Goat Farming Initiative',
    description:
      'Traditional goat farming with modern techniques for maximum yield',
    assetName: 'Goats',
    tokenAddress: '0x4434567890123456789012345678901234567893' as Address,
    providerAddress: '0xdefabcdefabcdefabcdefabcdefabcdefabcdef0' as Address,
    fundingGoal: '800000',
    totalValueLocked: '200000',
    startDate: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days from now
    durationDays: 60,
    rewardRate: 1000, // 10%
    status: PoolStatus.PENDING,
  },
  {
    id: 'pool-5',
    name: 'Sheep Wool Production',
    description: 'Premium wool production from high-quality sheep breeds',
    assetName: 'Sheep',
    tokenAddress: '0x5534567890123456789012345678901234567894' as Address,
    providerAddress: '0xefabcdefabcdefabcdefabcdefabcdefabcdef01' as Address,
    fundingGoal: '1500000',
    totalValueLocked: '1500000',
    startDate: Math.floor(Date.now() / 1000) - 120 * 24 * 60 * 60, // 120 days ago
    durationDays: 120,
    rewardRate: 900, // 9%
    status: PoolStatus.PAID,
  },
];

const DUMMY_STAKE_EVENTS: StakeEvent[] = [
  {
    poolId: 'pool-1',
    stakerAddress: '0x1111111111111111111111111111111111111111' as Address,
    amount: '50000',
    timestamp: Math.floor(Date.now() / 1000) - 24 * 60 * 60, // 1 day ago
    transactionHash: '0xabc123def456789012345678901234567890abcd',
  },
  {
    poolId: 'pool-1',
    stakerAddress: '0x2222222222222222222222222222222222222222' as Address,
    amount: '100000',
    timestamp: Math.floor(Date.now() / 1000) - 12 * 60 * 60, // 12 hours ago
    transactionHash: '0xdef456789012345678901234567890abcdef12',
  },
  {
    poolId: 'pool-2',
    stakerAddress: '0x3333333333333333333333333333333333333333' as Address,
    amount: '75000',
    timestamp: Math.floor(Date.now() / 1000) - 48 * 60 * 60, // 2 days ago
    transactionHash: '0x789012345678901234567890abcdef123456',
  },
  // Add transactions for pool-3 (Poultry Excellence Fund)
  {
    poolId: 'pool-3',
    stakerAddress: '0x4444444444444444444444444444444444444444' as Address,
    amount: '25000',
    timestamp: Math.floor(Date.now() / 1000) - 3 * 60 * 60, // 3 hours ago
    transactionHash: '0x111222333444555666777888999aaabbbcccdd',
  },
  {
    poolId: 'pool-3',
    stakerAddress: '0x5555555555555555555555555555555555555555' as Address,
    amount: '150000',
    timestamp: Math.floor(Date.now() / 1000) - 6 * 60 * 60, // 6 hours ago
    transactionHash: '0x222333444555666777888999aaabbbcccdddee',
  },
  {
    poolId: 'pool-3',
    stakerAddress: '0x6666666666666666666666666666666666666666' as Address,
    amount: '80000',
    timestamp: Math.floor(Date.now() / 1000) - 18 * 60 * 60, // 18 hours ago
    transactionHash: '0x333444555666777888999aaabbbcccdddeeff1',
  },
  {
    poolId: 'pool-3',
    stakerAddress: '0x7777777777777777777777777777777777777777' as Address,
    amount: '200000',
    timestamp: Math.floor(Date.now() / 1000) - 36 * 60 * 60, // 36 hours ago
    transactionHash: '0x444555666777888999aaabbbcccdddeeff1122',
  },
  // Add some transactions for pool-4 and pool-5 as well
  {
    poolId: 'pool-4',
    stakerAddress: '0x8888888888888888888888888888888888888888' as Address,
    amount: '120000',
    timestamp: Math.floor(Date.now() / 1000) - 8 * 60 * 60, // 8 hours ago
    transactionHash: '0x555666777888999aaabbbcccdddeeff112233',
  },
  {
    poolId: 'pool-5',
    stakerAddress: '0x9999999999999999999999999999999999999999' as Address,
    amount: '300000',
    timestamp: Math.floor(Date.now() / 1000) - 72 * 60 * 60, // 3 days ago
    transactionHash: '0x666777888999aaabbbcccdddeeff11223344',
  },
];

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

  // Helper function to calculate pool dynamics
  const calculatePoolDynamicsInternal = (pool: Pool): PoolDynamicData => {
    const now = Math.floor(Date.now() / 1000);
    const endTime = pool.startDate + pool.durationDays * 24 * 60 * 60;
    const timeRemainingSeconds = Math.max(0, endTime - now);

    const tvlNum = parseFloat(pool.totalValueLocked);
    const goalNum = parseFloat(pool.fundingGoal);
    const progressPercentage = Math.min(100, (tvlNum / goalNum) * 100);

    const formatCurrency = (amount: number) => {
      if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(2)}M`;
      } else if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(1)}K`;
      } else {
        return `$${amount.toFixed(2)}`;
      }
    };

    // Generate random volume data for demo purposes
    const volume24h = (Math.random() * 100000).toString();
    const volumeChangePercentage = `${(Math.random() * 20 - 10).toFixed(2)}%`;

    return {
      progressPercentage,
      timeRemainingSeconds,
      volume24h,
      volumeChangePercentage,
      apy: pool.rewardRate / 100,
      tvlFormatted: formatCurrency(tvlNum),
      fundingGoalFormatted: formatCurrency(goalNum),
      rewardFormatted: `${(pool.rewardRate / 100).toFixed(2)}%`,
    };
  };

  // Load all pools
  const loadAllPools = useCallback(async () => {
    console.log('[PoolsProvider] loadAllPools called');
    setLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      setPools(DUMMY_POOLS);
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
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        const userPoolsWithDynamicData = DUMMY_POOLS.slice(0, 2); // Return first 2 pools for demo
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
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        const providerPoolsWithDynamicData = DUMMY_POOLS.filter(
          (pool) =>
            pool.providerAddress.toLowerCase() === targetAddress.toLowerCase(),
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
    [address],
  );

  // Get pool by ID
  const getPoolById = useCallback(async (id: string): Promise<Pool | null> => {
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      const pool = DUMMY_POOLS.find((p) => p.id === id);
      return pool || null;
    } catch (err) {
      console.error('[PoolsProvider] Error in getPoolById:', err);
      setError(err instanceof Error ? err : new Error('Failed to get pool'));
      return null;
    }
  }, []);

  // Get pool with dynamic data
  const getPoolWithDynamicData = useCallback(
    async (id: string): Promise<(Pool & PoolDynamicData) | null> => {
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        const pool = DUMMY_POOLS.find((p) => p.id === id);
        if (pool) {
          const dynamics = calculatePoolDynamicsInternal(pool);
          return { ...pool, ...dynamics };
        }
        return null;
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

      console.log('[PoolsProvider] Creating pool with data:', data);
      setLoading(true);
      setError(null);

      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const newPoolId = `dummy-pool-${Date.now()}`;
        const transactionHash = `0x${Math.random().toString(16).slice(2, 10)}`;

        const newPool: Pool = {
          id: newPoolId,
          name: data.name,
          description: data.description,
          assetName: data.assetName,
          tokenAddress: data.tokenAddress,
          providerAddress: address as Address,
          fundingGoal: data.fundingGoal,
          totalValueLocked: '0',
          startDate: Math.floor(Date.now() / 1000),
          durationDays: data.durationDays,
          rewardRate: data.rewardRate,
          status: PoolStatus.ACTIVE,
        };

        DUMMY_POOLS.push(newPool);

        // Refresh pools after creation
        await loadAllPools();
        await loadProviderPools();

        return { poolId: newPoolId, transactionHash };
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
    [address, loadAllPools, loadProviderPools],
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
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const index = DUMMY_POOLS.findIndex((p) => p.id === poolId);
        if (index === -1) {
          throw new Error(`Pool with ID ${poolId} not found`);
        }
        DUMMY_POOLS[index].status = PoolStatus.COMPLETE;

        // Refresh pools after closing
        await loadAllPools();
        await loadProviderPools();

        return '0x0'; // Simulate transaction hash
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
    [address, loadAllPools, loadProviderPools],
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
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const index = DUMMY_POOLS.findIndex((p) => p.id === poolId);
        if (index === -1) {
          throw new Error(`Pool with ID ${poolId} not found`);
        }
        const currentTvl = parseFloat(DUMMY_POOLS[index].totalValueLocked);
        DUMMY_POOLS[index].totalValueLocked = (
          currentTvl + parseFloat(amount)
        ).toString();

        // Add stake event
        const newStakeEvent: StakeEvent = {
          poolId,
          stakerAddress: address as Address,
          amount,
          timestamp: Math.floor(Date.now() / 1000),
          transactionHash: '0x' + Math.random().toString(16).substr(2, 8),
        };
        DUMMY_STAKE_EVENTS.push(newStakeEvent);

        // Refresh pools and user pools after staking
        await loadAllPools();
        await loadUserPools();

        return newStakeEvent.transactionHash!;
      } catch (err) {
        console.error('[PoolsProvider] Error in stake:', err);
        setError(err instanceof Error ? err : new Error('Failed to stake'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [address, loadAllPools, loadUserPools],
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
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log(`[PoolsProvider] Claiming reward for pool: ${poolId}`);
        return '0x' + Math.random().toString(16).substr(2, 8);
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
    [address],
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
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1500));
        console.log(`[PoolsProvider] Unlocking reward for pool: ${poolId}`);

        // Update pool status to COMPLETE
        const poolIndex = DUMMY_POOLS.findIndex((p) => p.id === poolId);
        if (poolIndex !== -1) {
          DUMMY_POOLS[poolIndex].status = PoolStatus.COMPLETE;
          setPools([...DUMMY_POOLS]);
        }

        return '0x' + Math.random().toString(16).substr(2, 8);
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
    [address, loadProviderPools],
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
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        const history = DUMMY_STAKE_EVENTS.filter(
          (event) => event.poolId === poolId,
        );
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
    [stakeHistoryLoading, loadingStakeHistoryFor],
  );

  // Get grouped stake history
  const getGroupedStakeHistory = useCallback(
    async (poolId: string, interval: '1H' | '1D' | '1W' | '1M' | '1Y') => {
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Generate dummy grouped data
        const today = new Date();
        const groupedData: any = {
          daily: {},
          hourly: {},
          weekly: {},
          monthly: {},
          yearly: {},
        };

        // Generate last 30 days of data
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateKey = date.toISOString().split('T')[0];
          groupedData.daily[dateKey] = Math.random() * 50000;
        }

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
    [],
  );

  // Calculate pool dynamics
  const calculatePoolDynamics = useCallback(
    async (pool: Pool): Promise<PoolDynamicData> => {
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        return calculatePoolDynamicsInternal(pool);
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
