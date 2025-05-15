import { BigNumberish, BytesLike, ContractTransactionReceipt } from 'ethers';
import { StakingOperation, StakeDetails } from './austake';

export interface IAuStakeRepository {
  /**
   * Retrieves a staking operation by its ID from the blockchain.
   * @param operationId The ID of the operation.
   * @returns A promise that resolves to the StakingOperation details or undefined if not found.
   */
  findOperationById(
    operationId: BytesLike,
  ): Promise<StakingOperation | undefined>;

  /**
   * Persists a new staking operation to the blockchain.
   * (Corresponds to calling the createOperation transaction on the smart contract)
   *
   * @param name Operation name
   * @param description Operation description
   * @param token Token address being staked
   * @param provider Provider address of the operation
   * @param deadline Deadline for the operation
   * @param reward Reward percentage in basis points
   * @param rwaName Name of the real-world asset
   * @param fundingGoal Funding goal in wei
   * @param assetPrice Asset price in wei
   * @returns A promise that resolves to the transaction receipt, including the new operation ID.
   */
  createOperation(
    name: string,
    description: string,
    token: string,
    provider: string,
    deadline: BigNumberish,
    reward: BigNumberish,
    rwaName: string,
    fundingGoal: BigNumberish,
    assetPrice: BigNumberish,
  ): Promise<
    | { txReceipt: ContractTransactionReceipt; operationId: BytesLike }
    | undefined
  >;

  /**
   * Persists a user's stake to the blockchain for a given operation.
   * (Corresponds to calling the stake transaction on the smart contract)
   *
   * @param tokenAddress The address of the token to stake.
   * @param operationId The ID of the staking operation.
   * @param amount The amount of tokens to stake.
   * @returns A promise that resolves to the transaction receipt.
   */
  addStake(
    tokenAddress: string,
    operationId: BytesLike,
    amount: BigNumberish,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Processes a reward claim on the blockchain.
   * (Corresponds to calling the claimReward transaction on the smart contract)
   *
   * @param token Address of the token.
   * @param operationId ID of the operation.
   * @param user Address of the user claiming the reward.
   * @returns A promise that resolves to the transaction receipt.
   */
  claimReward(
    token: string,
    operationId: BytesLike,
    user: string,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Processes the unlocking of rewards for an operation on the blockchain.
   * (Corresponds to calling the unlockReward transaction on the smart contract by the provider)
   *
   * @param token Address of the token.
   * @param operationId ID of the operation.
   * @returns A promise that resolves to the transaction receipt.
   */
  unlockRewards(
    token: string,
    operationId: BytesLike,
  ): Promise<ContractTransactionReceipt | undefined>;

  // Admin-related data persistence/transactions
  /**
   * Updates the reward for an operation on the blockchain. (Admin only)
   * @param operationId ID of the operation.
   * @param amount New reward percentage in basis points.
   * @returns A promise that resolves to the transaction receipt.
   */
  updateOperationReward(
    operationId: BytesLike,
    amount: BigNumberish,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Updates the lock period on the blockchain. (Owner only)
   * @param lockPeriod The new lock period.
   * @returns A promise that resolves to the transaction receipt.
   */
  updateLockPeriod(
    lockPeriod: BigNumberish,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Updates admin status for a user on the blockchain. (Owner only)
   * @param user Address of the user.
   * @param status True to grant admin, false to revoke.
   * @returns A promise that resolves to the transaction receipt.
   */
  updateAdminStatus(
    user: string,
    status: boolean,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Updates the project wallet address on the blockchain. (Owner only)
   * @param projectWallet Address of the new project wallet.
   * @returns A promise that resolves to the transaction receipt.
   */
  updateProjectWallet(
    projectWallet: string,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Processes the burning of staked tokens on the blockchain. (Admin only)
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
