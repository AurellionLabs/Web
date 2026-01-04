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
  assetName: string;
  tokenAddress: string;
  fundingGoal: string | bigint;
  durationDays: number;
  rewardRate: number; // In basis points (e.g., 500 = 5%)
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
   * Create a new pool
   * Mirrors: IPoolService.createPool
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

    // Create the pool
    const tx = await auStake.createOperation(
      params.name,
      params.description ?? '',
      params.assetName,
      params.tokenAddress,
      fundingGoal,
      params.durationDays,
      params.rewardRate,
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
   */
  async unlockReward(
    provider: TestUser,
    poolId: string,
  ): Promise<ActionResult> {
    this.log(`🔓 ${provider.name} unlocking rewards for pool ${poolId}`);

    const result = await this.simulator.executeWrite(
      'AuStake',
      'unlockReward',
      [poolId],
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
   */
  async stake(
    investor: TestUser,
    poolId: string,
    amount: string | bigint,
  ): Promise<ActionResult<StakePoolResult>> {
    this.log(`💰 ${investor.name} staking in pool ${poolId}`);

    const stakeAmount =
      typeof amount === 'string' ? ethers.parseEther(amount) : amount;

    const result = await this.simulator.executeWrite(
      'AuStake',
      'stake',
      [poolId, stakeAmount],
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
   */
  async claimReward(investor: TestUser, poolId: string): Promise<ActionResult> {
    this.log(`💵 ${investor.name} claiming reward from pool ${poolId}`);

    const result = await this.simulator.executeWrite(
      'AuStake',
      'triggerReward',
      [poolId],
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
   * Mirrors: IPoolRepository.getAllPools
   */
  async getAllPools(): Promise<any[]> {
    const auStake = this.getAuStake();
    const poolIds = await auStake.getAllOperationIds();
    const pools = await Promise.all(
      poolIds.map((id: string) => auStake.getOperation(id)),
    );

    getCoverageTracker().mark('IPoolRepository', 'getAllPools');

    return pools;
  }

  /**
   * Get stake history for a pool
   * Mirrors: IPoolRepository.getPoolStakeHistory
   */
  async getPoolStakeHistory(poolId: string): Promise<any[]> {
    const auStake = this.getAuStake();
    const history = await auStake.getStakeHistory(poolId);

    getCoverageTracker().mark('IPoolRepository', 'getPoolStakeHistory');

    return history;
  }

  /**
   * Get pools by investor
   * Mirrors: IPoolRepository.findPoolsByInvestor
   */
  async findPoolsByInvestor(investorAddress: string): Promise<any[]> {
    const auStake = this.getAuStake();
    const poolIds = await auStake.getInvestorOperations(investorAddress);
    const pools = await Promise.all(
      poolIds.map((id: string) => auStake.getOperation(id)),
    );

    getCoverageTracker().mark('IPoolRepository', 'findPoolsByInvestor');

    return pools;
  }

  /**
   * Get pools by provider
   * Mirrors: IPoolRepository.findPoolsByProvider
   */
  async findPoolsByProvider(providerAddress: string): Promise<any[]> {
    const auStake = this.getAuStake();
    const poolIds = await auStake.getProviderOperations(providerAddress);
    const pools = await Promise.all(
      poolIds.map((id: string) => auStake.getOperation(id)),
    );

    getCoverageTracker().mark('IPoolRepository', 'findPoolsByProvider');

    return pools;
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
   */
  async getInvestorStake(
    poolId: string,
    investorAddress: string,
  ): Promise<bigint> {
    const auStake = this.getAuStake();
    return auStake.getStake(poolId, investorAddress);
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
