'use client';

import { AuStake } from '@/typechain-types';
import { BigNumberish, BytesLike, ContractTransactionReceipt } from 'ethers';
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';
import { useWallet } from '@/hooks/useWallet'; // Assuming useWallet is available
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';

// Re-exporting for convenience if needed by consumers, otherwise can be kept internal
export { StakingOperationStatus } from '@/domain/austake';
export type StakingOperation = AuStake.OperationStructOutput; // Using the struct from typechain

// Define the shape of the context
interface PoolsContextType {
  // State
  allPools: StakingOperation[]; // All available staking operations/pools
  selectedPoolDetails: StakingOperation | undefined; // Details of a specific pool
  userStakeInSelectedPool: BigNumberish | undefined; // User's stake amount in the selected pool
  userRewardsInSelectedPool: BigNumberish | undefined; // User's claimable rewards in the selected pool
  loadingPools: boolean;
  loadingSelectedPool: boolean;
  loadingStakeAction: boolean;
  loadingClaimAction: boolean;
  loadingCreateOperation: boolean;
  loadingUnlockRewards: boolean;
  error: Error | null;
  errorCreateOperation: Error | null;
  errorUnlockRewards: Error | null;

  // Functions
  fetchAllPools: () => Promise<void>;
  fetchPoolDetails: (operationId: BytesLike) => Promise<void>;
  // TODO: Add getUserStake and getUserRewards if separate calls are needed,
  // or integrate into fetchPoolDetails if data comes with it.

  stakeTokens: (
    operationId: BytesLike,
    amount: BigNumberish,
    tokenAddress: string, // Assuming token address is known or can be derived
  ) => Promise<ContractTransactionReceipt | undefined>;

  claimRewards: (
    operationId: BytesLike,
    tokenAddress: string, // Assuming token address is known
  ) => Promise<ContractTransactionReceipt | undefined>;

  // Provider/Admin specific (can be expanded)
  createOperation: (
    name: string,
    description: string,
    token: string,
    deadline: BigNumberish,
    reward: BigNumberish,
    rwaName: string,
    fundingGoal: BigNumberish,
    assetPrice: BigNumberish,
  ) => Promise<ContractTransactionReceipt | undefined>;

  unlockOperationRewards: (
    operationId: BytesLike,
    tokenAddress: string,
  ) => Promise<ContractTransactionReceipt | undefined>;

  // Clearing selection
  clearSelectedPool: () => void;
}

// Create the context
const PoolsContext = createContext<PoolsContextType | undefined>(undefined);

// Provider component
export const PoolsProvider = ({ children }: { children: ReactNode }) => {
  const [allPools, setAllPools] = useState<StakingOperation[]>([]);
  const [selectedPoolDetails, setSelectedPoolDetails] = useState<
    StakingOperation | undefined
  >();
  const [userStakeInSelectedPool, setUserStakeInSelectedPool] = useState<
    BigNumberish | undefined
  >();
  const [userRewardsInSelectedPool, setUserRewardsInSelectedPool] = useState<
    BigNumberish | undefined
  >();

  const [loadingPools, setLoadingPools] = useState(false);
  const [loadingSelectedPool, setLoadingSelectedPool] = useState(false);
  const [loadingStakeAction, setLoadingStakeAction] = useState(false);
  const [loadingClaimAction, setLoadingClaimAction] = useState(false);
  const [loadingCreateOperation, setLoadingCreateOperation] = useState(false);
  const [loadingUnlockRewards, setLoadingUnlockRewards] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorCreateOperation, setErrorCreateOperation] =
    useState<Error | null>(null);
  const [errorUnlockRewards, setErrorUnlockRewards] = useState<Error | null>(
    null,
  );

  const { address: walletAddress } = useWallet(); // For user-specific actions

  const auStakeRepository =
    RepositoryContext.getInstance().getAuStakeRepository();
  const auStakeService = ServiceContext.getInstance(
    RepositoryContext.getInstance(),
  ).getAuStakeService();

  const fetchAllPools = useCallback(async () => {
    console.log('[PoolsProvider] Fetching all pools...');
    setLoadingPools(true);
    setError(null);
    try {
      // Assumption: The repository needs a way to get *all* operation IDs or operations.
      // This might require an update to IAuStakeRepository or a new method.
      // For now, let's assume a placeholder method `getAllOperationIds` exists on the repo
      // or `getAllOperations` that returns StakingOperation[]
      // If not, this part needs to be adapted based on actual repository capabilities.

      // Placeholder: if your repository can return all operations directly:
      // const pools = await auStakeRepository.getAllOperations();
      // setAllPools(pools);

      // If it can only fetch by ID, you need a mechanism to get all IDs first.
      // This is a common challenge, often solved by an index or a contract view function.
      // For this example, we'll assume there's a way to get them or this will be adapted.
      // Let's log a warning for now.
      console.warn(
        '[PoolsProvider] fetchAllPools: Actual implementation depends on how all operation IDs/details are retrieved from the repository/contract.',
      );
      // To make it runnable, we'll set it to empty.
      // In a real scenario, you'd fetch these from the auStakeRepository.
      // e.g. const operationIds = await auStakeRepository.getAllOperationIds();
      // const poolDetailsPromises = operationIds.map(id => auStakeRepository.getOperation(id));
      // const pools = (await Promise.all(poolDetailsPromises)).filter(p => p) as StakingOperation[];
      setAllPools([]); // Replace with actual fetching logic
    } catch (err) {
      console.error('[PoolsProvider] Error fetching all pools:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch pools'));
      setAllPools([]);
    } finally {
      setLoadingPools(false);
    }
  }, [auStakeRepository]); // Add other dependencies if they arise

  const fetchPoolDetails = useCallback(
    async (operationId: BytesLike) => {
      console.log(`[PoolsProvider] Fetching details for pool: ${operationId}`);
      setLoadingSelectedPool(true);
      setError(null);
      setSelectedPoolDetails(undefined); // Clear previous
      setUserStakeInSelectedPool(undefined);
      setUserRewardsInSelectedPool(undefined);
      try {
        const poolData = await auStakeRepository.getOperation(operationId);
        setSelectedPoolDetails(poolData);

        // TODO: Fetch user-specific stake and rewards for this pool.
        // This might involve new service/repository methods like:
        // const stake = await auStakeService.getUserStake(operationId, walletAddress);
        // const rewards = await auStakeService.getUserRewards(operationId, walletAddress);
        // setUserStakeInSelectedPool(stake);
        // setUserRewardsInSelectedPool(rewards);
        console.warn(
          '[PoolsProvider] fetchPoolDetails: User stake and rewards fetching not yet implemented.',
        );
      } catch (err) {
        console.error(
          `[PoolsProvider] Error fetching pool details for ${operationId}:`,
          err,
        );
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to fetch pool details'),
        );
      } finally {
        setLoadingSelectedPool(false);
      }
    },
    [auStakeRepository /*, walletAddress, auStakeService */],
  ); // Add walletAddress and auStakeService if used for user data

  const stakeTokens = useCallback(
    async (
      operationId: BytesLike,
      amount: BigNumberish,
      tokenAddress: string,
    ) => {
      if (!walletAddress) {
        setError(new Error('Wallet not connected for staking.'));
        return undefined;
      }
      console.log(
        `[PoolsProvider] Staking ${amount.toString()} tokens in pool ${operationId} for token ${tokenAddress}`,
      );
      setLoadingStakeAction(true);
      setError(null);
      try {
        const txReceipt = await auStakeService.stake(
          tokenAddress,
          operationId,
          amount,
        );
        // Optionally, refresh pool details or user stake after successful staking
        if (txReceipt && selectedPoolDetails?.id === operationId) {
          // This assumes 'id' is the correct field for operationId in StakingOperation
          await fetchPoolDetails(operationId);
        }
        return txReceipt;
      } catch (err) {
        console.error('[PoolsProvider] Error staking tokens:', err);
        setError(
          err instanceof Error ? err : new Error('Failed to stake tokens'),
        );
        return undefined;
      } finally {
        setLoadingStakeAction(false);
      }
    },
    [auStakeService, walletAddress, fetchPoolDetails, selectedPoolDetails],
  );

  const claimRewards = useCallback(
    async (operationId: BytesLike, tokenAddress: string) => {
      if (!walletAddress) {
        setError(new Error('Wallet not connected for claiming rewards.'));
        return undefined;
      }
      console.log(
        `[PoolsProvider] Claiming rewards from pool ${operationId} for token ${tokenAddress}`,
      );
      setLoadingClaimAction(true);
      setError(null);
      try {
        // The service.claimReward expects user address, which is walletAddress here
        const txReceipt = await auStakeService.claimReward(
          tokenAddress,
          operationId,
          walletAddress,
        );
        // Optionally, refresh pool details or user rewards after successful claim
        if (txReceipt && selectedPoolDetails?.id === operationId) {
          await fetchPoolDetails(operationId);
        }
        return txReceipt;
      } catch (err) {
        console.error('[PoolsProvider] Error claiming rewards:', err);
        setError(
          err instanceof Error ? err : new Error('Failed to claim rewards'),
        );
        return undefined;
      } finally {
        setLoadingClaimAction(false);
      }
    },
    [auStakeService, walletAddress, fetchPoolDetails, selectedPoolDetails],
  );

  const createOperation = useCallback(
    async (
      name: string,
      description: string,
      token: string, // address
      deadline: BigNumberish,
      reward: BigNumberish, // basis points
      rwaName: string,
      fundingGoal: BigNumberish,
      assetPrice: BigNumberish,
    ): Promise<ContractTransactionReceipt | undefined> => {
      if (!walletAddress) {
        setErrorCreateOperation(
          new Error('Wallet not connected for creating operation.'),
        );
        return undefined;
      }
      console.log(`[PoolsProvider] Creating operation: ${name}`);
      setLoadingCreateOperation(true);
      setErrorCreateOperation(null);
      setError(null);
      try {
        const txReceipt = await auStakeService.createOperation(
          name,
          description,
          token,
          walletAddress,
          deadline,
          reward,
          rwaName,
          fundingGoal,
          assetPrice,
        );
        await fetchAllPools();
        return txReceipt;
      } catch (err) {
        console.error('[PoolsProvider] Error creating operation:', err);
        const opError =
          err instanceof Error ? err : new Error('Failed to create operation');
        setErrorCreateOperation(opError);
        setError(opError);
        return undefined;
      } finally {
        setLoadingCreateOperation(false);
      }
    },
    [auStakeService, walletAddress, fetchAllPools],
  );

  const unlockOperationRewards = useCallback(
    async (operationId: BytesLike, tokenAddress: string) => {
      console.log(
        `[PoolsProvider] Unlocking rewards for operation ${operationId}`,
      );
      setLoadingUnlockRewards(true);
      setErrorUnlockRewards(null);
      setError(null);
      try {
        const txReceipt = await auStakeService.unlockOperationRewards(
          tokenAddress,
          operationId,
        );
        if (txReceipt && selectedPoolDetails?.id === operationId) {
          await fetchPoolDetails(operationId);
        }
        return txReceipt;
      } catch (err) {
        console.error(
          '[PoolsProvider] Error unlocking operation rewards:',
          err,
        );
        const unlockError =
          err instanceof Error ? err : new Error('Failed to unlock rewards');
        setErrorUnlockRewards(unlockError);
        setError(unlockError);
        return undefined;
      } finally {
        setLoadingUnlockRewards(false);
      }
    },
    [auStakeService, fetchPoolDetails, selectedPoolDetails],
  );

  const clearSelectedPool = () => {
    setSelectedPoolDetails(undefined);
    setUserStakeInSelectedPool(undefined);
    setUserRewardsInSelectedPool(undefined);
  };

  // Effect to fetch all pools on mount, if desired
  useEffect(() => {
    // fetchAllPools(); // Decide if pools should be loaded automatically
  }, [fetchAllPools]);

  const value: PoolsContextType = {
    allPools,
    selectedPoolDetails,
    userStakeInSelectedPool,
    userRewardsInSelectedPool,
    loadingPools,
    loadingSelectedPool,
    loadingStakeAction,
    loadingClaimAction,
    loadingCreateOperation,
    loadingUnlockRewards,
    error,
    errorCreateOperation,
    errorUnlockRewards,
    fetchAllPools,
    fetchPoolDetails,
    stakeTokens,
    claimRewards,
    createOperation,
    unlockOperationRewards,
    clearSelectedPool,
  };

  return (
    <PoolsContext.Provider value={value}>{children}</PoolsContext.Provider>
  );
};

// Custom hook for consuming the context
export const usePools = () => {
  // Renamed from usePoolsProvider to usePools for brevity
  const context = useContext(PoolsContext);
  if (!context) {
    throw new Error('usePools must be used within a PoolsProvider');
  }
  return context;
};
