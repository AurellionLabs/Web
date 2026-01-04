import { ethers, Contract, Provider } from 'ethers';
import {
  IRWYRepository,
  RWYOpportunity,
  RWYOpportunityStatus,
  RWYStake,
  RWYOperatorStats,
  RWYOpportunityWithDynamicData,
  Address,
  BigNumberString,
  calculateFundingProgress,
  calculateTimeRemaining,
  bpsToPercent,
  formatTimeRemaining,
} from '../../domain/rwy';

// ABI for RWYVault contract (minimal required functions)
const RWY_VAULT_ABI = [
  'function getOpportunity(bytes32 opportunityId) view returns (tuple(bytes32 id, address operator, string name, string description, address inputToken, uint256 inputTokenId, uint256 targetAmount, uint256 stakedAmount, address outputToken, uint256 outputTokenId, uint256 expectedOutputAmount, uint256 promisedYieldBps, uint256 operatorFeeBps, uint256 minSalePrice, uint256 fundingDeadline, uint256 processingDeadline, uint256 createdAt, uint256 fundedAt, uint256 completedAt, uint8 status, uint256 operatorCollateral))',
  'function getStake(bytes32 opportunityId, address staker) view returns (tuple(uint256 amount, uint256 stakedAt, bool claimed))',
  'function getOpportunityStakers(bytes32 opportunityId) view returns (address[])',
  'function getOpportunityCount() view returns (uint256)',
  'function getAllOpportunities() view returns (bytes32[])',
  'function isApprovedOperator(address operator) view returns (bool)',
  'function getOperatorStats(address operator) view returns (bool approved, uint256 reputation, uint256 successfulOps, uint256 totalValueProcessed)',
  'function calculateExpectedProfit(bytes32 opportunityId, uint256 stakeAmount) view returns (uint256 expectedProfit, uint256 userShareBps)',
  'function approvedOperators(address) view returns (bool)',
  'function operatorReputation(address) view returns (uint256)',
  'function operatorSuccessfulOps(address) view returns (uint256)',
  'function operatorTotalValueProcessed(address) view returns (uint256)',
];

/**
 * Repository implementation for RWY Vault data access
 */
export class RWYRepository implements IRWYRepository {
  private contract: Contract;
  private provider: Provider;

  constructor(contractAddress: string, provider: Provider) {
    this.provider = provider;
    this.contract = new ethers.Contract(
      contractAddress,
      RWY_VAULT_ABI,
      provider,
    );
  }

  /**
   * Get a single opportunity by ID
   */
  async getOpportunityById(id: string): Promise<RWYOpportunity | null> {
    try {
      const opp = await this.contract.getOpportunity(id);
      return this.mapContractOpportunity(opp);
    } catch (error) {
      console.error('Error fetching opportunity:', error);
      return null;
    }
  }

  /**
   * Get all opportunities
   */
  async getAllOpportunities(): Promise<RWYOpportunity[]> {
    try {
      const ids: string[] = await this.contract.getAllOpportunities();
      const opportunities = await Promise.all(
        ids.map((id) => this.getOpportunityById(id)),
      );
      return opportunities.filter((o): o is RWYOpportunity => o !== null);
    } catch (error) {
      console.error('Error fetching all opportunities:', error);
      return [];
    }
  }

  /**
   * Get opportunities by operator address
   */
  async getOpportunitiesByOperator(
    operator: Address,
  ): Promise<RWYOpportunity[]> {
    const all = await this.getAllOpportunities();
    return all.filter(
      (o) => o.operator.toLowerCase() === operator.toLowerCase(),
    );
  }

  /**
   * Get opportunities filtered by status
   */
  async getOpportunitiesByStatus(
    status: RWYOpportunityStatus,
  ): Promise<RWYOpportunity[]> {
    const all = await this.getAllOpportunities();
    return all.filter((o) => o.status === status);
  }

  /**
   * Get opportunities currently accepting stakes
   */
  async getActiveOpportunities(): Promise<RWYOpportunity[]> {
    const all = await this.getAllOpportunities();
    const now = Math.floor(Date.now() / 1000);
    return all.filter(
      (o) =>
        o.status === RWYOpportunityStatus.FUNDING &&
        o.fundingDeadline > now &&
        BigInt(o.stakedAmount) < BigInt(o.targetAmount),
    );
  }

  /**
   * Get a user's stake in an opportunity
   */
  async getStake(
    opportunityId: string,
    staker: Address,
  ): Promise<RWYStake | null> {
    try {
      const stake = await this.contract.getStake(opportunityId, staker);

      // Check if stake exists (amount > 0)
      if (BigInt(stake.amount) === 0n) {
        return null;
      }

      return {
        opportunityId,
        staker,
        amount: stake.amount.toString(),
        stakedAt: Number(stake.stakedAt),
        claimed: stake.claimed,
      };
    } catch (error) {
      console.error('Error fetching stake:', error);
      return null;
    }
  }

  /**
   * Get all opportunities a user has staked in
   */
  async getStakerOpportunities(staker: Address): Promise<RWYOpportunity[]> {
    const all = await this.getAllOpportunities();
    const stakerOpps: RWYOpportunity[] = [];

    for (const opp of all) {
      const stake = await this.getStake(opp.id, staker);
      if (stake && BigInt(stake.amount) > 0n) {
        stakerOpps.push(opp);
      }
    }

    return stakerOpps;
  }

  /**
   * Get all stakes for an opportunity
   */
  async getOpportunityStakers(opportunityId: string): Promise<RWYStake[]> {
    try {
      const stakers: string[] =
        await this.contract.getOpportunityStakers(opportunityId);
      const stakes: RWYStake[] = [];

      for (const staker of stakers) {
        const stake = await this.getStake(opportunityId, staker as Address);
        if (stake) stakes.push(stake);
      }

      return stakes;
    } catch (error) {
      console.error('Error fetching opportunity stakers:', error);
      return [];
    }
  }

  /**
   * Get operator statistics
   */
  async getOperatorStats(operator: Address): Promise<RWYOperatorStats | null> {
    try {
      const [approved, reputation, successfulOps, totalValueProcessed] =
        await this.contract.getOperatorStats(operator);

      // Count active opportunities
      const opps = await this.getOpportunitiesByOperator(operator);
      const activeOpportunities = opps.filter(
        (o) =>
          o.status !== RWYOpportunityStatus.COMPLETED &&
          o.status !== RWYOpportunityStatus.CANCELLED,
      ).length;

      return {
        address: operator,
        approved,
        reputation: Number(reputation),
        successfulOps: Number(successfulOps),
        totalValueProcessed: totalValueProcessed.toString(),
        activeOpportunities,
      };
    } catch (error) {
      console.error('Error fetching operator stats:', error);
      return null;
    }
  }

  /**
   * Check if an address is an approved operator
   */
  async isApprovedOperator(operator: Address): Promise<boolean> {
    try {
      return await this.contract.isApprovedOperator(operator);
    } catch (error) {
      console.error('Error checking operator approval:', error);
      return false;
    }
  }

  /**
   * Calculate expected profit for a potential stake
   */
  async calculateExpectedProfit(
    opportunityId: string,
    stakeAmount: BigNumberString,
  ): Promise<{ expectedProfit: BigNumberString; userShareBps: number }> {
    try {
      const result = await this.contract.calculateExpectedProfit(
        opportunityId,
        stakeAmount,
      );
      return {
        expectedProfit: result.expectedProfit.toString(),
        userShareBps: Number(result.userShareBps),
      };
    } catch (error) {
      console.error('Error calculating expected profit:', error);
      return { expectedProfit: '0', userShareBps: 0 };
    }
  }

  /**
   * Get opportunity with calculated dynamic data
   */
  async getOpportunityWithDynamicData(
    id: string,
  ): Promise<RWYOpportunityWithDynamicData | null> {
    const opp = await this.getOpportunityById(id);
    if (!opp) return null;

    const stakers = await this.getOpportunityStakers(id);
    const dynamicData = this.calculateDynamicData(opp, stakers.length);

    return { ...opp, ...dynamicData };
  }

  /**
   * Get all opportunities with dynamic data
   */
  async getAllOpportunitiesWithDynamicData(): Promise<
    RWYOpportunityWithDynamicData[]
  > {
    const opps = await this.getAllOpportunities();
    const results: RWYOpportunityWithDynamicData[] = [];

    for (const opp of opps) {
      const stakers = await this.getOpportunityStakers(opp.id);
      const dynamicData = this.calculateDynamicData(opp, stakers.length);
      results.push({ ...opp, ...dynamicData });
    }

    return results;
  }

  /**
   * Map contract opportunity to domain model
   */
  private mapContractOpportunity(opp: any): RWYOpportunity {
    return {
      id: opp.id,
      operator: opp.operator as Address,
      name: opp.name,
      description: opp.description,
      inputToken: opp.inputToken as Address,
      inputTokenId: opp.inputTokenId.toString(),
      targetAmount: opp.targetAmount.toString(),
      stakedAmount: opp.stakedAmount.toString(),
      outputToken: opp.outputToken as Address,
      outputTokenId: opp.outputTokenId.toString(),
      expectedOutputAmount: opp.expectedOutputAmount.toString(),
      promisedYieldBps: Number(opp.promisedYieldBps),
      operatorFeeBps: Number(opp.operatorFeeBps),
      minSalePrice: opp.minSalePrice.toString(),
      operatorCollateral: opp.operatorCollateral.toString(),
      fundingDeadline: Number(opp.fundingDeadline),
      processingDeadline: Number(opp.processingDeadline),
      createdAt: Number(opp.createdAt),
      fundedAt: opp.fundedAt > 0 ? Number(opp.fundedAt) : undefined,
      completedAt: opp.completedAt > 0 ? Number(opp.completedAt) : undefined,
      status: Number(opp.status) as RWYOpportunityStatus,
    };
  }

  /**
   * Calculate dynamic data for an opportunity
   */
  private calculateDynamicData(
    opp: RWYOpportunity,
    stakerCount: number,
  ): Omit<RWYOpportunityWithDynamicData, keyof RWYOpportunity> {
    const fundingProgress = calculateFundingProgress(opp);
    const timeToFundingDeadline = calculateTimeRemaining(opp.fundingDeadline);
    const timeToProcessingDeadline = opp.processingDeadline
      ? calculateTimeRemaining(opp.processingDeadline)
      : undefined;

    // Calculate estimated profit based on promised yield
    const stakedBigInt = BigInt(opp.stakedAmount);
    const yieldMultiplier = BigInt(opp.promisedYieldBps);
    const estimatedProfit = (
      (stakedBigInt * yieldMultiplier) /
      10000n
    ).toString();

    // Calculate APY (annualized)
    // Assuming average processing time of 30 days
    const processingDays = 30;
    const annualizedYield = (opp.promisedYieldBps * 365) / processingDays;
    const estimatedAPY = annualizedYield / 100; // Convert bps to percent

    // Format values for display
    const formattedYield = bpsToPercent(opp.promisedYieldBps);
    const formattedProgress = `${fundingProgress}%`;

    // Format TVL and Goal (assuming 18 decimals)
    const formatAmount = (amount: string): string => {
      const value = BigInt(amount);
      const formatted = Number(value) / 1e18;
      return formatted.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    };

    return {
      fundingProgress,
      timeToFundingDeadline,
      timeToProcessingDeadline,
      estimatedProfit,
      estimatedAPY,
      operatorReputation: 0, // Will be fetched separately if needed
      stakerCount,
      formattedYield,
      formattedProgress,
      formattedTVL: formatAmount(opp.stakedAmount),
      formattedGoal: formatAmount(opp.targetAmount),
    };
  }
}
