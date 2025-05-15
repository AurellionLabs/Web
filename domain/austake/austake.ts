import { BigNumberish, BytesLike, ContractTransactionReceipt } from 'ethers';

// From AuStake.sol: OperationStatus
export enum StakingOperationStatus {
  INACTIVE,
  ACTIVE,
  COMPLETE,
  PAID,
}

// Domain model for a Staking Operation
export interface StakingOperation {
  id: BytesLike;
  name: string;
  description: string;
  token: string; // address
  provider: string; // address
  deadline: bigint; // Duration in days originally, but contract getter returns it as uint256
  startDate: bigint;
  rwaName: string;
  reward: bigint; // Percentage in basis points (1234 = 12.34%)
  tokenTvl: bigint;
  operationStatus: StakingOperationStatus;
  fundingGoal: bigint; // In wei (18 decimals)
  assetPrice: bigint; // In wei (18 decimals)
}

// Simplified Stake details for some operations, if needed at domain level
export interface StakeDetails {
  amount: BigNumberish;
  // timestamp: bigint; // Consider if needed for domain logic beyond contract
  // isActive: boolean; // Consider if needed for domain logic beyond contract
}

export interface IAuStakeService {
  /**
   * Creates a new staking operation.
   * @param name Operation name
   * @param description Operation description
   * @param token Token address being staked
   * @param provider Provider address of the operation
   * @param deadline Deadline in days (or timestamp as per contract needs)
   * @param reward Reward percentage in basis points
   * @param rwaName Name of the real-world asset
   * @param fundingGoal Funding goal in wei
   * @param assetPrice Asset price in wei
   * @returns A promise that resolves to the transaction receipt.
   */
  createOperation(
    name: string,
    description: string,
    token: string,
    provider: string,
    deadline: BigNumberish, // Solidity type is uint256, controller used bigint
    reward: BigNumberish, // Solidity type is uint256, controller used bigint
    rwaName: string,
    fundingGoal: BigNumberish, // Solidity type is uint256, controller used bigint
    assetPrice: BigNumberish, // Solidity type is uint256, controller used bigint
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Allows a user to stake tokens in an operation.
   * @param tokenAddress The address of the token to stake.
   * @param operationId The ID of the staking operation.
   * @param amount The amount of tokens to stake.
   * @returns A promise that resolves to the transaction receipt.
   */
  stake(
    tokenAddress: string, // Added for clarity, though contract might infer from operationId
    operationId: BytesLike,
    amount: BigNumberish,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Retrieves the details of a staking operation.
   * @param operationId The ID of the operation.
   * @returns A promise that resolves to the StakingOperation details.
   */
  getOperation(operationId: BytesLike): Promise<StakingOperation | undefined>;

  /**
   * Allows a user to claim their stake plus reward.
   * @param token Address of the token.
   * @param operationId ID of the operation.
   * @param user Address of the user claiming the reward.
   * @returns A promise that resolves to the transaction receipt.
   */
  claimReward(
    token: string,
    operationId: BytesLike,
    user: string, // User is msg.sender in contract, but controller takes it as param
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Allows the current user (provider) to trigger reward claim for themselves. (This seems to be what triggerReward in controller does)
   * This might need to be re-evaluated as `triggerReward` in the controller calls `contract.claimReward` with `walletAddress`
   * The actual contract `claimReward` is external and can be called by anyone for a given user.
   * `unlockReward` is the provider-specific action to make rewards available.
   * @param token Address of the token.
   * @param operationId ID of the operation.
   * @returns A promise that resolves to the transaction receipt.
   */
  triggerSelfRewardClaim( // Renamed for clarity from controller's `triggerReward`
    token: string,
    operationId: BytesLike,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Allows the provider to unlock rewards for an operation, making them available for users to claim.
   * @param token Address of the token.
   * @param operationId ID of the operation.
   * @returns A promise that resolves to the transaction receipt.
   */
  unlockOperationRewards(
    token: string,
    operationId: BytesLike,
  ): Promise<ContractTransactionReceipt | undefined>;

  // Admin functions
  /**
   * Sets the reward percentage for an operation. (Admin only)
   * @param operationId ID of the operation.
   * @param amount New reward percentage in basis points.
   * @returns A promise that resolves to the transaction receipt.
   */
  setOperationReward(
    operationId: BytesLike,
    amount: BigNumberish, // Solidity type is uint256, controller used bigint
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Sets the lock period for staking. (Owner only)
   * @param lockPeriod The new lock period.
   * @returns A promise that resolves to the transaction receipt.
   */
  setLockPeriod(
    lockPeriod: BigNumberish,
  ): Promise<ContractTransactionReceipt | undefined>; // Solidity type is uint256, controller used bigint

  /**
   * Sets admin status for a user. (Owner only)
   * @param user Address of the user.
   * @param status True to grant admin, false to revoke.
   * @returns A promise that resolves to the transaction receipt.
   */
  setAdmin(
    user: string,
    status: boolean,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Sets the project wallet address. (Owner only)
   * @param projectWallet Address of the new project wallet.
   * @returns A promise that resolves to the transaction receipt.
   */
  setProjectWallet(
    projectWallet: string,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Burns staked tokens for a user in an operation. (Admin only)
   * @param token Address of the token.
   * @param user Address of the user whose tokens are to be burned.
   * @param operationId ID of the operation.
   * @returns A promise that resolves to the transaction receipt.
   */
  burnStake(
    token: string,
    user: string,
    operationId: BytesLike,
  ): Promise<ContractTransactionReceipt | undefined>;
}
