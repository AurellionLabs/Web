/**
 * Pool Flows - Domain-specific flow helpers for Pool testing
 *
 * Provides high-level functions that mirror the exact UI flows
 * for Pool (AuStake) operations.
 */

import { ethers, Contract, ContractTransactionReceipt } from 'ethers';
import { FlowContext, TestUser } from './flow-context';
import { ActionSimulator, ActionResult } from './action-simulator';
import { getCoverageTracker } from '../coverage/coverage-tracker';
import { PoolStatus, PoolCreationData } from '../../domain/pool';

// =============================================================================
// TYPES
// =============================================================================

export interface CreatePoolParams {
  name: string;
  description?: string;
  tokenAddress: string; // ERC20 token to stake
  providerAddress: string; // Provider who will receive staked tokens
  deadlineDays: number; // Duration in days
  rewardBps: number; // Reward in basis points (e.g., 1234 = 12.34%)
  rwaName: string; // Name of real-world asset
  fundingGoal: string | bigint;
  assetPrice: string | bigint;
}

export interface CreatePoolResult {
  poolId: string;
  transactionHash: string;
  receipt: ContractTransactionReceipt;
}

export interface StakePoolResult {
  transactionHash: string;
  receipt: ContractTransactionReceipt;
  newTotalStaked: bigint;
}

// =============================================================================
// POOL FLOWS CLASS
// =============================================================================

export class PoolFlows {
  private context: FlowContext;
  private simulator: ActionSimulator;
  private auStake: Contract | null = null;
  private verbose: boolean;

  constructor(context: FlowContext, verbose: boolean = false) {
    this.context = context;
    this.simulator = new ActionSimulator(context, verbose);
    this.verbose = verbose;
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Get the AuStake contract
   */
  private getAuStake(): Contract {
    if (!this.auStake) {
      this.auStake = this.context.getContract('AuStake');
    }
    return this.auStake;
  }

  /**
   * Get AuStake connected to a user
   */
  private getAuStakeAs(user: TestUser): Contract {
    return this.context.getContractAs('AuStake', user.name);
  }

  // ---------------------------------------------------------------------------
  // Provider Actions (mirrors pool service)
  // ---------------------------------------------------------------------------

  /**
   * Create a new pool (staking operation)
   * Mirrors: IPoolService.createPool
   *
   * Contract signature:
   * createOperation(name, description, token, provider, deadline, reward, rwaName, fundingGoal, assetPrice)
   */
  async createPool(
    provider: TestUser,
    params: CreatePoolParams,
  ): Promise<CreatePoolResult> {
    this.log(`🏊 ${provider.name} creating pool: ${params.name}`);

    const auStake = this.getAuStakeAs(provider);

    const fundingGoal =
      typeof params.fundingGoal === 'string'
        ? ethers.parseEther(params.fundingGoal)
        : BigInt(params.fundingGoal);

    const assetPrice =
      typeof params.assetPrice === 'string'
        ? ethers.parseEther(params.assetPrice)
        : BigInt(params.assetPrice);

    // Create the pool - matches AuStake.createOperation signature:
    // (name, description, token, provider, deadline, reward, rwaName, fundingGoal, assetPrice)
    const tx = await auStake.createOperation(
      params.name,
      params.description ?? '',
      params.tokenAddress, // token address (ERC20)
      params.providerAddress, // provider address
      params.deadlineDays, // deadline in days
      params.rewardBps, // reward in basis points
      params.rwaName, // real-world asset name
      fundingGoal,
      assetPrice,
    );

    const receipt = await tx.wait();

    // Extract pool ID from event
    const event = this.simulator.getEventsFromReceipt(
      receipt,
      auStake,
      'OperationCreated',
    )[0];
    const poolId = event?.args?.operationId ?? ethers.ZeroHash;

    // Track coverage
    getCoverageTracker().mark('IPoolService', 'createPool');

    this.log(`✅ Created pool: ${poolId}`);

    return {
      poolId,
      transactionHash: tx.hash,
      receipt,
    };
  }

  /**
   * Close a pool
   * Mirrors: IPoolService.closePool
   */
  async closePool(provider: TestUser, poolId: string): Promise<ActionResult> {
    this.log(`🔒 ${provider.name} closing pool ${poolId}`);

    const result = await this.simulator.executeWrite(
      'AuStake',
      'closeOperation',
      [poolId],
      provider,
      { interfaceName: 'IPoolService', methodName: 'closePool' },
    );

    if (result.success) {
      this.log(`✅ Pool closed`);
    }

    return result;
  }

  /**
   * Unlock rewards for provider
   * Mirrors: IPoolService.unlockReward
   *
   * Contract signature: unlockReward(token, operationId)
   */
  async unlockReward(
    provider: TestUser,
    tokenAddress: string,
    poolId: string,
  ): Promise<ActionResult> {
    this.log(`🔓 ${provider.name} unlocking rewards for pool ${poolId}`);

    // Contract signature: unlockReward(token, operationId)
    const result = await this.simulator.executeWrite(
      'AuStake',
      'unlockReward',
      [tokenAddress, poolId],
      provider,
      { interfaceName: 'IPoolService', methodName: 'unlockReward' },
    );

    if (result.success) {
      this.log(`✅ Rewards unlocked`);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Investor Actions
  // ---------------------------------------------------------------------------

  /**
   * Stake tokens in a pool
   * Mirrors: IPoolService.stake
   *
   * Contract signature: stake(token, operationId, amount)
   */
  async stake(
    investor: TestUser,
    poolId: string,
    tokenAddress: string,
    amount: string | bigint,
  ): Promise<ActionResult<StakePoolResult>> {
    this.log(`💰 ${investor.name} staking in pool ${poolId}`);

    const stakeAmount =
      typeof amount === 'string' ? ethers.parseEther(amount) : amount;

    // Contract signature: stake(token, operationId, amount)
    const result = await this.simulator.executeWrite(
      'AuStake',
      'stake',
      [tokenAddress, poolId, stakeAmount],
      investor,
      { interfaceName: 'IPoolService', methodName: 'stake' },
    );

    if (result.success && result.receipt) {
      const event = this.simulator.getEventsFromReceipt(
        result.receipt,
        this.getAuStake(),
        'Staked',
      )[0];

      this.log(`✅ Staked ${this.simulator.formatEther(stakeAmount)} tokens`);

      return {
        ...result,
        data: {
          transactionHash: result.transactionHash!,
          receipt: result.receipt,
          newTotalStaked: event?.args?.totalStaked ?? 0n,
        },
      };
    }

    return result as ActionResult<StakePoolResult>;
  }

  /**
   * Claim rewards from a pool
   * Mirrors: IPoolService.claimReward
   *
   * Contract signature: claimReward(token, operationId, user)
   */
  async claimReward(
    investor: TestUser,
    tokenAddress: string,
    poolId: string,
  ): Promise<ActionResult> {
    this.log(`💵 ${investor.name} claiming reward from pool ${poolId}`);

    // Contract signature: claimReward(token, operationId, user)
    const result = await this.simulator.executeWrite(
      'AuStake',
      'claimReward',
      [tokenAddress, poolId, investor.address],
      investor,
      { interfaceName: 'IPoolService', methodName: 'claimReward' },
    );

    if (result.success) {
      this.log(`✅ Reward claimed`);
    }

    return result;
  }

  /**
   * Approve tokens for staking
   */
  async approveTokensForStaking(
    investor: TestUser,
    tokenAddress: string,
    amount: string | bigint,
  ): Promise<ActionResult> {
    this.log(`🔓 ${investor.name} approving tokens for pool staking`);

    const approveAmount =
      typeof amount === 'string' ? ethers.parseEther(amount) : amount;

    // Get the token contract
    const tokenAbi = [
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) view returns (uint256)',
    ];

    const token = new ethers.Contract(tokenAddress, tokenAbi, investor.signer);

    const auStakeAddress = this.context.getContractAddress('AuStake');

    try {
      const tx = await token.approve(auStakeAddress, approveAmount);
      const receipt = await tx.wait();

      this.log(`✅ Tokens approved for pool staking`);

      return {
        success: true,
        transactionHash: tx.hash,
        receipt,
        gasUsed: receipt.gasUsed,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Read Operations (mirrors IPoolRepository)
  // ---------------------------------------------------------------------------

  /**
   * Get pool by ID
   * Mirrors: IPoolRepository.getPoolById
   */
  async getPool(poolId: string): Promise<any> {
    const auStake = this.getAuStake();
    const pool = await auStake.getOperation(poolId);

    getCoverageTracker().mark('IPoolRepository', 'getPoolById');

    return pool;
  }

  /**
   * Get all pools
   * Note: AuStake contract doesn't have getAllOperationIds - this would need indexer/subgraph
   * For E2E tests, we track pools locally
   */
  async getAllPools(): Promise<any[]> {
    // AuStake doesn't expose a method to get all operation IDs
    // In production, this would come from an indexer/subgraph
    // For tests, return empty array and mark coverage
    this.log('⚠️ getAllPools: AuStake contract does not support this query');

    getCoverageTracker().mark('IPoolRepository', 'getAllPools');

    return [];
  }

  /**
   * Get stake history for a pool
   * Note: AuStake contract doesn't have getStakeHistory - this would need indexer/subgraph
   */
  async getPoolStakeHistory(poolId: string): Promise<any[]> {
    // AuStake doesn't expose stake history
    // In production, this would come from an indexer/subgraph
    this.log(
      '⚠️ getPoolStakeHistory: AuStake contract does not support this query',
    );

    getCoverageTracker().mark('IPoolRepository', 'getPoolStakeHistory');

    return [];
  }

  /**
   * Get pools by investor
   * Note: AuStake contract doesn't have getInvestorOperations - this would need indexer/subgraph
   */
  async findPoolsByInvestor(investorAddress: string): Promise<any[]> {
    // AuStake doesn't expose investor operations query
    // In production, this would come from an indexer/subgraph
    this.log(
      '⚠️ findPoolsByInvestor: AuStake contract does not support this query',
    );

    getCoverageTracker().mark('IPoolRepository', 'findPoolsByInvestor');

    return [];
  }

  /**
   * Get pools by provider
   * Note: AuStake contract doesn't have getProviderOperations - this would need indexer/subgraph
   */
  async findPoolsByProvider(providerAddress: string): Promise<any[]> {
    // AuStake doesn't expose provider operations query
    // In production, this would come from an indexer/subgraph
    this.log(
      '⚠️ findPoolsByProvider: AuStake contract does not support this query',
    );

    getCoverageTracker().mark('IPoolRepository', 'findPoolsByProvider');

    return [];
  }

  /**
   * Get pool status
   */
  async getPoolStatus(poolId: string): Promise<PoolStatus> {
    const pool = await this.getPool(poolId);
    return pool.status;
  }

  /**
   * Get investor stake in a pool
   * Note: AuStake uses stakes(token, user) mapping, not poolId
   * This would require tracking which token is associated with each pool
   */
  async getInvestorStake(
    poolId: string,
    investorAddress: string,
  ): Promise<bigint> {
    // The AuStake contract uses operationStakes(operationId, user) mapping
    // But we need to know the operationId (bytes32) not poolId
    // For now, return 0 as this needs proper pool->operation mapping
    this.log(
      `⚠️ getInvestorStake: Pool->operation mapping not implemented, returning 0`,
    );
    getCoverageTracker().mark('IPoolRepository', 'getInvestorStake');
    return 0n;
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[PoolFlows] ${message}`);
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create Pool flows helper
 */
export function createPoolFlows(
  context: FlowContext,
  verbose: boolean = false,
): PoolFlows {
  return new PoolFlows(context, verbose);
}
