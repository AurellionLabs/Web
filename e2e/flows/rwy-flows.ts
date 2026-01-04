/**
 * RWY Flows - Domain-specific flow helpers for RWY testing
 *
 * Provides high-level functions that mirror the exact UI flows
 * for RWY (Real World Yield) operations.
 */

import { ethers, Contract, ContractTransactionReceipt } from 'ethers';
import { FlowContext, TestUser } from './flow-context';
import { ActionSimulator, ActionResult } from './action-simulator';
import { getCoverageTracker } from '../coverage/coverage-tracker';
import {
  RWYOpportunityStatus,
  RWYOpportunityCreationData,
  RWYOpportunity,
  RWYStake,
} from '../../domain/rwy';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateOpportunityParams {
  name: string;
  description?: string;
  inputToken: string;
  inputTokenId: string | bigint;
  targetAmount: string | bigint;
  outputToken?: string;
  expectedOutputAmount?: string | bigint;
  promisedYieldBps?: number;
  operatorFeeBps?: number;
  minSalePrice?: string | bigint;
  fundingDays?: number;
  processingDays?: number;
  collateralAmount?: string | bigint;
}

export interface CreateOpportunityResult {
  opportunityId: string;
  transactionHash: string;
  receipt: ContractTransactionReceipt;
}

export interface StakeResult {
  transactionHash: string;
  receipt: ContractTransactionReceipt;
  newStakedAmount: bigint;
}

// =============================================================================
// RWY FLOWS CLASS
// =============================================================================

export class RWYFlows {
  private context: FlowContext;
  private simulator: ActionSimulator;
  private rwyVault: Contract | null = null;
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
   * Get the RWY Vault contract
   */
  private getVault(): Contract {
    if (!this.rwyVault) {
      this.rwyVault = this.context.getContract('RWYVault');
    }
    return this.rwyVault;
  }

  /**
   * Get vault connected to a user
   */
  private getVaultAs(user: TestUser): Contract {
    return this.context.getContractAs('RWYVault', user.name);
  }

  // ---------------------------------------------------------------------------
  // Operator Actions (mirrors useRWYOperatorActions)
  // ---------------------------------------------------------------------------

  /**
   * Create a new RWY opportunity
   * Mirrors: useRWYOperatorActions.createOpportunity
   */
  async createOpportunity(
    operator: TestUser,
    params: CreateOpportunityParams,
  ): Promise<CreateOpportunityResult> {
    this.log(`🏭 ${operator.name} creating RWY opportunity: ${params.name}`);

    const vault = this.getVaultAs(operator);

    // Set defaults
    const inputTokenId = BigInt(params.inputTokenId);
    const targetAmount =
      typeof params.targetAmount === 'string'
        ? ethers.parseEther(params.targetAmount)
        : BigInt(params.targetAmount);
    const expectedOutputAmount = params.expectedOutputAmount
      ? typeof params.expectedOutputAmount === 'string'
        ? ethers.parseEther(params.expectedOutputAmount)
        : BigInt(params.expectedOutputAmount)
      : targetAmount;
    const minSalePrice = params.minSalePrice
      ? typeof params.minSalePrice === 'string'
        ? ethers.parseEther(params.minSalePrice)
        : BigInt(params.minSalePrice)
      : ethers.parseEther('1');
    const collateralAmount = params.collateralAmount
      ? typeof params.collateralAmount === 'string'
        ? ethers.parseEther(params.collateralAmount)
        : BigInt(params.collateralAmount)
      : 0n;

    const tx = await vault.createOpportunity(
      params.name,
      params.description ?? '',
      params.inputToken,
      inputTokenId,
      targetAmount,
      params.outputToken ?? params.inputToken,
      expectedOutputAmount,
      params.promisedYieldBps ?? 1000, // 10%
      params.operatorFeeBps ?? 500, // 5%
      minSalePrice,
      params.fundingDays ?? 30,
      params.processingDays ?? 60,
      { value: collateralAmount },
    );

    const receipt = await tx.wait();

    // Extract opportunity ID from event
    const event = this.simulator.getEventsFromReceipt(
      receipt,
      vault,
      'OpportunityCreated',
    )[0];
    const opportunityId = event?.args?.opportunityId ?? ethers.ZeroHash;

    // Track coverage
    getCoverageTracker().mark('IRWYService', 'createOpportunity');

    this.log(`✅ Created opportunity: ${opportunityId}`);

    return {
      opportunityId,
      transactionHash: tx.hash,
      receipt,
    };
  }

  /**
   * Start delivery process
   * Mirrors: useRWYOperatorActions.startDelivery
   */
  async startDelivery(
    operator: TestUser,
    opportunityId: string,
    journeyId: string,
  ): Promise<ActionResult> {
    this.log(`🚚 ${operator.name} starting delivery for ${opportunityId}`);

    const result = await this.simulator.executeWrite(
      'RWYVault',
      'startDelivery',
      [opportunityId, journeyId],
      operator,
      { interfaceName: 'IRWYService', methodName: 'startDelivery' },
    );

    if (result.success) {
      this.log(`✅ Delivery started`);
    }

    return result;
  }

  /**
   * Confirm delivery of commodities
   * Mirrors: useRWYOperatorActions.confirmDelivery
   */
  async confirmDelivery(
    operator: TestUser,
    opportunityId: string,
    deliveredAmount: string | bigint,
  ): Promise<ActionResult> {
    this.log(`📦 ${operator.name} confirming delivery for ${opportunityId}`);

    const amount =
      typeof deliveredAmount === 'string'
        ? ethers.parseEther(deliveredAmount)
        : deliveredAmount;

    const result = await this.simulator.executeWrite(
      'RWYVault',
      'confirmDelivery',
      [opportunityId, amount],
      operator,
      { interfaceName: 'IRWYService', methodName: 'confirmDelivery' },
    );

    if (result.success) {
      this.log(`✅ Delivery confirmed`);
    }

    return result;
  }

  /**
   * Complete processing
   * Mirrors: useRWYOperatorActions.completeProcessing
   */
  async completeProcessing(
    operator: TestUser,
    opportunityId: string,
    outputTokenId: string | bigint,
    actualOutputAmount: string | bigint,
  ): Promise<ActionResult> {
    this.log(`⚙️ ${operator.name} completing processing for ${opportunityId}`);

    const tokenId = BigInt(outputTokenId);
    const amount =
      typeof actualOutputAmount === 'string'
        ? ethers.parseEther(actualOutputAmount)
        : actualOutputAmount;

    const result = await this.simulator.executeWrite(
      'RWYVault',
      'completeProcessing',
      [opportunityId, tokenId, amount],
      operator,
      { interfaceName: 'IRWYService', methodName: 'completeProcessing' },
    );

    if (result.success) {
      this.log(`✅ Processing completed`);
    }

    return result;
  }

  /**
   * Cancel an opportunity
   * Mirrors: useRWYOperatorActions.cancelOpportunity
   */
  async cancelOpportunity(
    operator: TestUser,
    opportunityId: string,
    reason: string,
  ): Promise<ActionResult> {
    this.log(`❌ ${operator.name} cancelling opportunity ${opportunityId}`);

    const result = await this.simulator.executeWrite(
      'RWYVault',
      'cancelOpportunity',
      [opportunityId, reason],
      operator,
      { interfaceName: 'IRWYService', methodName: 'cancelOpportunity' },
    );

    if (result.success) {
      this.log(`✅ Opportunity cancelled`);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Staker Actions (mirrors useRWYStakeActions)
  // ---------------------------------------------------------------------------

  /**
   * Stake commodities into an opportunity
   * Mirrors: useRWYStakeActions.stake
   */
  async stake(
    staker: TestUser,
    opportunityId: string,
    amount: string | bigint,
  ): Promise<ActionResult<StakeResult>> {
    this.log(`💰 ${staker.name} staking in ${opportunityId}`);

    const stakeAmount =
      typeof amount === 'string' ? ethers.parseEther(amount) : amount;

    const result = await this.simulator.executeWrite(
      'RWYVault',
      'stake',
      [opportunityId, stakeAmount],
      staker,
      { interfaceName: 'IRWYService', methodName: 'stake' },
    );

    if (result.success && result.receipt) {
      const event = this.simulator.getEventsFromReceipt(
        result.receipt,
        this.getVault(),
        'CommodityStaked',
      )[0];

      this.log(`✅ Staked ${this.simulator.formatEther(stakeAmount)} tokens`);

      return {
        ...result,
        data: {
          transactionHash: result.transactionHash!,
          receipt: result.receipt,
          newStakedAmount: event?.args?.totalStaked ?? 0n,
        },
      };
    }

    return result as ActionResult<StakeResult>;
  }

  /**
   * Unstake commodities from an opportunity
   * Mirrors: useRWYStakeActions.unstake
   */
  async unstake(
    staker: TestUser,
    opportunityId: string,
    amount: string | bigint,
  ): Promise<ActionResult> {
    this.log(`📤 ${staker.name} unstaking from ${opportunityId}`);

    const unstakeAmount =
      typeof amount === 'string' ? ethers.parseEther(amount) : amount;

    const result = await this.simulator.executeWrite(
      'RWYVault',
      'unstake',
      [opportunityId, unstakeAmount],
      staker,
      { interfaceName: 'IRWYService', methodName: 'unstake' },
    );

    if (result.success) {
      this.log(
        `✅ Unstaked ${this.simulator.formatEther(unstakeAmount)} tokens`,
      );
    }

    return result;
  }

  /**
   * Claim profits after opportunity completion
   * Mirrors: useRWYStakeActions.claimProfits
   */
  async claimProfits(
    staker: TestUser,
    opportunityId: string,
  ): Promise<ActionResult> {
    this.log(`💵 ${staker.name} claiming profits from ${opportunityId}`);

    const result = await this.simulator.executeWrite(
      'RWYVault',
      'claimProfits',
      [opportunityId],
      staker,
      { interfaceName: 'IRWYService', methodName: 'claimProfits' },
    );

    if (result.success) {
      this.log(`✅ Profits claimed`);
    }

    return result;
  }

  /**
   * Emergency claim for cancelled opportunities
   * Mirrors: useRWYStakeActions.emergencyClaim
   */
  async emergencyClaim(
    staker: TestUser,
    opportunityId: string,
  ): Promise<ActionResult> {
    this.log(`🚨 ${staker.name} emergency claiming from ${opportunityId}`);

    const result = await this.simulator.executeWrite(
      'RWYVault',
      'emergencyClaim',
      [opportunityId],
      staker,
      { interfaceName: 'IRWYService', methodName: 'emergencyClaim' },
    );

    if (result.success) {
      this.log(`✅ Emergency claim successful`);
    }

    return result;
  }

  /**
   * Approve tokens for staking
   * Mirrors: useRWYStakeActions.approveTokens
   */
  async approveTokensForStaking(
    staker: TestUser,
    tokenAddress: string,
  ): Promise<ActionResult> {
    this.log(`🔓 ${staker.name} approving tokens for staking`);

    // Get the token contract
    const tokenAbi = [
      'function setApprovalForAll(address operator, bool approved) external',
      'function isApprovedForAll(address owner, address operator) view returns (bool)',
    ];

    const token = new ethers.Contract(tokenAddress, tokenAbi, staker.signer);

    const vaultAddress = this.context.getContractAddress('RWYVault');

    try {
      const tx = await token.setApprovalForAll(vaultAddress, true);
      const receipt = await tx.wait();

      getCoverageTracker().mark('IRWYService', 'approveTokensForStaking');

      this.log(`✅ Tokens approved for staking`);

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

  /**
   * Check if tokens are approved for staking
   * Mirrors: useRWYStakeActions.checkApproval
   */
  async isApprovedForStaking(
    tokenAddress: string,
    owner: string,
  ): Promise<boolean> {
    const tokenAbi = [
      'function isApprovedForAll(address owner, address operator) view returns (bool)',
    ];

    const token = new ethers.Contract(
      tokenAddress,
      tokenAbi,
      this.context.getProvider(),
    );

    const vaultAddress = this.context.getContractAddress('RWYVault');

    const isApproved = await token.isApprovedForAll(owner, vaultAddress);

    getCoverageTracker().mark('IRWYService', 'isApprovedForStaking');

    return isApproved;
  }

  // ---------------------------------------------------------------------------
  // Read Operations (mirrors useRWYOpportunities, useRWYOpportunity)
  // ---------------------------------------------------------------------------

  /**
   * Get opportunity by ID
   * Mirrors: useRWYOpportunity hook
   */
  async getOpportunity(opportunityId: string): Promise<any> {
    const vault = this.getVault();
    const opp = await vault.getOpportunity(opportunityId);

    getCoverageTracker().mark('IRWYRepository', 'getOpportunityById');

    return opp;
  }

  /**
   * Get stake for a user in an opportunity
   */
  async getStake(opportunityId: string, stakerAddress: string): Promise<any> {
    const vault = this.getVault();
    const stake = await vault.stakes(opportunityId, stakerAddress);

    getCoverageTracker().mark('IRWYRepository', 'getStake');

    return stake;
  }

  /**
   * Get opportunity status
   */
  async getOpportunityStatus(
    opportunityId: string,
  ): Promise<RWYOpportunityStatus> {
    const opp = await this.getOpportunity(opportunityId);
    return opp.status;
  }

  /**
   * Check if address is approved operator
   */
  async isApprovedOperator(address: string): Promise<boolean> {
    const vault = this.getVault();
    const isApproved = await vault.approvedOperators(address);

    getCoverageTracker().mark('IRWYRepository', 'isApprovedOperator');

    return isApproved;
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[RWYFlows] ${message}`);
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create RWY flows helper
 */
export function createRWYFlows(
  context: FlowContext,
  verbose: boolean = false,
): RWYFlows {
  return new RWYFlows(context, verbose);
}
