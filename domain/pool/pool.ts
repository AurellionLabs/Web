/**
 * Represents an Ethereum address.
 */
export type Address = `0x${string}`;

/**
 * Represents the status of a pool.
 * The numeric values should correspond to the values used in the smart contract.
 */
export enum PoolStatus {
  PENDING = 0, // Placeholder value, confirm with contract
  ACTIVE = 1, // Placeholder value, confirm with contract
  COMPLETE = 2, // Based on constants used in app/customer/pools/[id]/page.tsx
  PAID = 3, // Based on constants used in app/customer/pools/[id]/page.tsx
}

/**
 * Represents a large numerical value, like token amounts or goals, stored as a string
 * to avoid precision issues and handle BigInt compatibility across layers.
 */
export type BigNumberString = string;

/**
 * Represents the core Pool entity.
 */
export interface Pool {
  id: string; // Unique identifier from the smart contract (operation ID)
  name: string;
  description: string;
  assetName: string; // Name of the underlying asset (e.g., "Real Estate Fund X", "Goat")
  tokenAddress: Address; // The address of the token used for staking/funding
  providerAddress: Address; // The address that created and manages the pool
  fundingGoal: BigNumberString; // The target amount for the pool in the specified token
  totalValueLocked: BigNumberString; // The current amount funded/staked in the pool
  startDate: number; // Unix timestamp (in seconds) when the pool operation began or will begin
  durationDays: number; // The intended duration of the pool operation in days
  /**
   * Reward rate, potentially stored in basis points (e.g., 500 for 5.00%).
   * The exact interpretation (permille, basis points, etc.) depends on the contract implementation.
   */
  rewardRate: number;
  status: PoolStatus;
}

/**
 * Represents data required to create a new Pool.
 */
export interface PoolCreationData {
  name: string;
  description: string;
  assetName: string;
  tokenAddress: Address;
  // providerAddress might be implicit (msg.sender in contract)
  fundingGoal: BigNumberString;
  durationDays: number;
  rewardRate: number;
  assetPrice: BigNumberString; // Price of the underlying asset at creation
}

/**
 * Represents a single staking event associated with a Pool.
 */
export interface StakeEvent {
  poolId: string; // ID of the pool the stake belongs to
  stakerAddress: Address; // Address of the user who staked
  amount: BigNumberString; // Amount of tokens staked
  timestamp: number; // Unix timestamp (in seconds) of the stake event
  transactionHash?: string; // Optional: Transaction hash of the stake event
}

/**
 * Represents dynamic data calculated for a pool, often for display purposes.
 * This is not part of the core Pool entity state but derived from it and potentially StakeEvents.
 */
export interface PoolDynamicData {
  progressPercentage: number; // Funding progress or time progress (0-100)
  timeRemainingSeconds: number; // Remaining time until the pool duration ends
  volume24h?: BigNumberString; // Trading or staking volume in the last 24 hours
  volumeChangePercentage?: string; // e.g., "+5.2%" or "-1.0%"
  apy?: number; // Calculated Annual Percentage Yield (if applicable)
  tvlFormatted: string; // Total Value Locked, formatted as currency string
  fundingGoalFormatted: string; // Funding Goal, formatted as currency string
  rewardFormatted: string; // Reward Rate, formatted as percentage string
}

/**
 * Represents stake amounts grouped by time intervals (e.g., daily, weekly)
 * Keys are typically date strings (e.g., "YYYY-MM-DD").
 */
export interface GroupedStakes {
  hourly?: { [hourKey: string]: BigNumberString };
  daily?: { [dayKey: string]: BigNumberString };
  weekly?: { [weekKey: string]: BigNumberString };
  monthly?: { [monthKey: string]: BigNumberString };
  yearly?: { [yearKey: string]: BigNumberString };
}

/**
 * Defines the contract for data persistence and retrieval operations for Pools.
 * Implementations will handle the specifics of interacting with the data source
 * (e.g., blockchain node, database, API).
 */
export interface IPoolRepository {
  /**
   * Retrieves a single Pool's core data by its unique identifier.
   * Corresponds to functions like `getOperation`.
   * @param id The unique ID of the pool (operation ID from the contract).
   * @returns A Promise resolving to the Pool object or null if not found.
   */
  getPoolById(id: string): Promise<Pool | null>;

  /**
   * Retrieves a list of all Pool IDs.
   * Corresponds to functions like `getOperationList`.
   * Often more efficient than fetching all pool data if only IDs are needed.
   * @returns A Promise resolving to an array of pool IDs (strings).
   */
  getAllPoolIds(): Promise<string[]>;

  /**
   * Retrieves the history of staking events for a specific pool.
   * Corresponds to functions like `getStakeHistory`.
   * @param poolId The ID of the pool.
   * @returns A Promise resolving to an array of StakeEvent objects.
   */
  getPoolStakeHistory(poolId: string): Promise<StakeEvent[]>;

  /**
   * Retrieves pools associated with a specific staker address.
   * Useful for "My Positions" views.
   * @param stakerAddress The address of the staker.
   * @returns A Promise resolving to an array of Pools the user has staked in.
   */
  findPoolsByStaker(stakerAddress: Address): Promise<Pool[]>;

  /**
   * Retrieves pools managed by a specific provider address.
   * Useful for provider-specific views.
   * @param providerAddress The address of the provider.
   * @returns A Promise resolving to an array of Pools managed by the provider.
   */
  findPoolsByProvider(providerAddress: Address): Promise<Pool[]>;

  /**
   * Retrieves the number of decimals for a given ERC20 token.
   * Corresponds to functions like `getDecimal`. Used for formatting values.
   * @param tokenAddress The address of the ERC20 token contract.
   * @returns A Promise resolving to the number of decimals.
   */
  getTokenDecimals(tokenAddress: Address): Promise<number>;

  // Note: getAllPools() might be redundant if the common pattern is getAllPoolIds() -> getPoolById() loop.
  // Keep it for now, but could be removed if unused.
  /**
   * Retrieves a list of all available Pools (full data).
   * @returns A Promise resolving to an array of Pool objects.
   */
  getAllPools(): Promise<Pool[]>;
}

/**
 * Defines the contract for business logic operations related to Pools.
 * Implementations will orchestrate interactions with repositories, smart contracts,
 * and potentially other services.
 */
export interface IPoolService {
  /**
   * Creates a new Pool via the smart contract.
   * Corresponds to functions like `createOperation`.
   * @param data Data required to create the pool.
   * @param creatorAddress The address initiating the creation (often msg.sender).
   * @returns A Promise resolving to the new Pool's ID or transaction hash upon successful initiation.
   */
  createPool(
    data: PoolCreationData,
    creatorAddress: Address,
  ): Promise<{ poolId: string; transactionHash: string } | string>; // Return ID or txHash

  /**
   * Performs a staking action on a specific pool via the smart contract.
   * @param poolId The ID of the pool to stake in.
   * @param amount The amount of tokens to stake (as a string for BigNumber).
   * @param stakerAddress The address performing the stake.
   * @returns A Promise resolving to the transaction hash upon successful initiation.
   */
  stake(
    poolId: string,
    amount: BigNumberString,
    stakerAddress: Address,
  ): Promise<string>; // Return txHash

  /**
   * Initiates the reward claim process for a completed pool (for stakers) via the smart contract.
   * Corresponds to functions like `triggerReward`.
   * @param poolId The ID of the pool.
   * @param claimantAddress The address claiming the reward.
   * @returns A Promise resolving to the transaction hash upon successful initiation.
   */
  claimReward(poolId: string, claimantAddress: Address): Promise<string>; // Return txHash

  /**
   * Initiates the reward unlocking process for a completed pool (for the provider) via the smart contract.
   * Corresponds to functions like `unlockReward`.
   * @param poolId The ID of the pool.
   * @param providerAddress The address of the provider unlocking the reward.
   * @returns A Promise resolving to the transaction hash upon successful initiation.
   */
  unlockReward(poolId: string, providerAddress: Address): Promise<string>; // Return txHash

  /**
   * Retrieves a single pool by ID, including calculated dynamic data for display.
   * Combines repository calls and calculations needed for the pool details page.
   * @param id The ID of the pool.
   * @returns A Promise resolving to the Pool object merged with its PoolDynamicData, or null if not found.
   */
  getPoolWithDynamicData(id: string): Promise<(Pool & PoolDynamicData) | null>;

  /**
   * Retrieves all pools along with their calculated dynamic data.
   * Useful for displaying pool lists with real-time information (e.g., `pools/page.tsx`).
   * @returns A Promise resolving to an array of Pool objects merged with their PoolDynamicData.
   */
  getAllPoolsWithDynamicData(): Promise<(Pool & PoolDynamicData)[]>;

  /**
   * Retrieves pools for a specific user (staker) along with dynamic data.
   * @param stakerAddress The address of the staker.
   * @returns A Promise resolving to an array of Pool objects (where the user staked) merged with their PoolDynamicData.
   */
  getUserPoolsWithDynamicData(
    stakerAddress: Address,
  ): Promise<(Pool & PoolDynamicData)[]>;

  /**
   * Retrieves pools managed by a specific provider along with dynamic data.
   * @param providerAddress The address of the provider.
   * @returns A Promise resolving to an array of Pool objects (managed by the provider) merged with their PoolDynamicData.
   */
  getProviderPoolsWithDynamicData(
    providerAddress: Address,
  ): Promise<(Pool & PoolDynamicData)[]>;

  /**
   * Groups historical staking events by a specified time interval.
   * Corresponds to functionality like `groupStakesByInterval`. Used for charts.
   * @param poolId The ID of the pool whose history is needed.
   * @param interval The time interval for grouping ('1H', '1D', '1W', '1M', '1Y').
   * @returns A Promise resolving to the GroupedStakes object.
   */
  getGroupedStakeHistory(
    poolId: string,
    interval: '1H' | '1D' | '1W' | '1M' | '1Y',
  ): Promise<GroupedStakes>;

  /**
   * Calculates dynamic data fields (progress, time remaining, formatted values, etc.) for a given pool.
   * This is likely called internally by other service methods like `getPoolWithDynamicData`.
   * It may fetch stake history or use provided history.
   * @param pool The Pool object.
   * @param stakeHistory Optional: Pre-fetched stake history to optimize.
   * @returns A Promise resolving to the PoolDynamicData object.
   */
  calculatePoolDynamicData(
    pool: Pool,
    stakeHistory?: StakeEvent[],
  ): Promise<PoolDynamicData>;
}
