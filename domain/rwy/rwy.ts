import { BigNumberish, BytesLike, ContractTransactionReceipt } from 'ethers';

/**
 * Represents an Ethereum address.
 */
export type Address = `0x${string}`;

/**
 * Represents a large numerical value as string for BigInt compatibility.
 */
export type BigNumberString = string;

/**
 * RWY Opportunity status enum matching the smart contract
 */
export enum RWYOpportunityStatus {
  PENDING = 0,
  FUNDING = 1,
  FUNDED = 2,
  IN_TRANSIT = 3,
  PROCESSING = 4,
  SELLING = 5,
  DISTRIBUTING = 6,
  COMPLETED = 7,
  CANCELLED = 8,
}

/**
 * Status labels for display
 */
export const RWYStatusLabels: Record<RWYOpportunityStatus, string> = {
  [RWYOpportunityStatus.PENDING]: 'Pending',
  [RWYOpportunityStatus.FUNDING]: 'Accepting Stakes',
  [RWYOpportunityStatus.FUNDED]: 'Fully Funded',
  [RWYOpportunityStatus.IN_TRANSIT]: 'In Transit',
  [RWYOpportunityStatus.PROCESSING]: 'Processing',
  [RWYOpportunityStatus.SELLING]: 'Selling',
  [RWYOpportunityStatus.DISTRIBUTING]: 'Distributing Profits',
  [RWYOpportunityStatus.COMPLETED]: 'Completed',
  [RWYOpportunityStatus.CANCELLED]: 'Cancelled',
};

/**
 * Status colors for UI
 */
export const RWYStatusColors: Record<RWYOpportunityStatus, string> = {
  [RWYOpportunityStatus.PENDING]: 'gray',
  [RWYOpportunityStatus.FUNDING]: 'blue',
  [RWYOpportunityStatus.FUNDED]: 'green',
  [RWYOpportunityStatus.IN_TRANSIT]: 'yellow',
  [RWYOpportunityStatus.PROCESSING]: 'orange',
  [RWYOpportunityStatus.SELLING]: 'purple',
  [RWYOpportunityStatus.DISTRIBUTING]: 'cyan',
  [RWYOpportunityStatus.COMPLETED]: 'emerald',
  [RWYOpportunityStatus.CANCELLED]: 'red',
};

/**
 * Core RWY Opportunity entity
 */
export interface RWYOpportunity {
  id: string;
  operator: Address;
  name: string;
  description: string;

  // Input commodity (what stakers provide)
  inputToken: Address;
  inputTokenId: string;
  inputTokenName?: string; // Resolved from AuraAsset
  targetAmount: BigNumberString;
  stakedAmount: BigNumberString;

  // Output commodity (what operator produces)
  outputToken: Address;
  outputTokenId: string;
  outputTokenName?: string; // Resolved from AuraAsset
  expectedOutputAmount: BigNumberString;

  // Economics
  promisedYieldBps: number; // Basis points (1500 = 15%)
  operatorFeeBps: number;
  minSalePrice: BigNumberString;
  operatorCollateral: BigNumberString;

  // Timeline
  fundingDeadline: number; // Unix timestamp
  processingDeadline: number;
  createdAt: number;
  fundedAt?: number;
  completedAt?: number;

  // Status
  status: RWYOpportunityStatus;
}

/**
 * User stake in an RWY opportunity
 */
export interface RWYStake {
  opportunityId: string;
  staker: Address;
  amount: BigNumberString;
  stakedAt: number;
  claimed: boolean;
}

/**
 * Data required to create a new RWY opportunity
 */
export interface RWYOpportunityCreationData {
  name: string;
  description: string;
  inputToken: Address;
  inputTokenId: string;
  targetAmount: BigNumberString;
  outputToken: Address;
  expectedOutputAmount: BigNumberString;
  promisedYieldBps: number;
  operatorFeeBps: number;
  minSalePrice: BigNumberString;
  fundingDays: number;
  processingDays: number;
  collateralAmount: BigNumberString;
}

/**
 * Dynamic/calculated data for display
 */
export interface RWYDynamicData {
  fundingProgress: number; // 0-100 percentage
  timeToFundingDeadline: number; // Seconds remaining
  timeToProcessingDeadline?: number;
  estimatedProfit: BigNumberString;
  estimatedAPY: number;
  operatorReputation: number;
  stakerCount: number;
  formattedYield: string; // e.g., "15.00%"
  formattedProgress: string; // e.g., "75%"
  formattedTVL: string; // e.g., "$125,000"
  formattedGoal: string; // e.g., "$500,000"
}

/**
 * Combined opportunity with dynamic data for UI
 */
export interface RWYOpportunityWithDynamicData
  extends RWYOpportunity,
    RWYDynamicData {}

/**
 * Operator statistics
 */
export interface RWYOperatorStats {
  address: Address;
  approved: boolean;
  reputation: number;
  successfulOps: number;
  totalValueProcessed: BigNumberString;
  activeOpportunities: number;
}

/**
 * Repository interface for RWY data access
 */
export interface IRWYRepository {
  /**
   * Get a single opportunity by ID
   */
  getOpportunityById(id: string): Promise<RWYOpportunity | null>;

  /**
   * Get all opportunities
   */
  getAllOpportunities(): Promise<RWYOpportunity[]>;

  /**
   * Get opportunities by operator address
   */
  getOpportunitiesByOperator(operator: Address): Promise<RWYOpportunity[]>;

  /**
   * Get opportunities filtered by status
   */
  getOpportunitiesByStatus(
    status: RWYOpportunityStatus,
  ): Promise<RWYOpportunity[]>;

  /**
   * Get opportunities currently accepting stakes
   */
  getActiveOpportunities(): Promise<RWYOpportunity[]>;

  /**
   * Get a user's stake in an opportunity
   */
  getStake(opportunityId: string, staker: Address): Promise<RWYStake | null>;

  /**
   * Get all opportunities a user has staked in
   */
  getStakerOpportunities(staker: Address): Promise<RWYOpportunity[]>;

  /**
   * Get all stakes for an opportunity
   */
  getOpportunityStakers(opportunityId: string): Promise<RWYStake[]>;

  /**
   * Get operator statistics
   */
  getOperatorStats(operator: Address): Promise<RWYOperatorStats | null>;

  /**
   * Check if an address is an approved operator
   */
  isApprovedOperator(operator: Address): Promise<boolean>;

  /**
   * Calculate expected profit for a potential stake
   */
  calculateExpectedProfit(
    opportunityId: string,
    stakeAmount: BigNumberString,
  ): Promise<{ expectedProfit: BigNumberString; userShareBps: number }>;

  /**
   * Get opportunity with calculated dynamic data
   */
  getOpportunityWithDynamicData(
    id: string,
  ): Promise<RWYOpportunityWithDynamicData | null>;

  /**
   * Get all opportunities with dynamic data
   */
  getAllOpportunitiesWithDynamicData(): Promise<
    RWYOpportunityWithDynamicData[]
  >;
}

/**
 * Service interface for RWY business logic
 */
export interface IRWYService {
  /**
   * Create a new RWY opportunity (operator only)
   */
  createOpportunity(
    data: RWYOpportunityCreationData,
    operator: Address,
  ): Promise<{ opportunityId: string; transactionHash: string }>;

  /**
   * Stake commodities into an opportunity
   */
  stake(
    opportunityId: string,
    amount: BigNumberString,
    staker: Address,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Unstake commodities (only during funding or after cancellation)
   */
  unstake(
    opportunityId: string,
    amount: BigNumberString,
    staker: Address,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Start delivery process (operator only)
   */
  startDelivery(
    opportunityId: string,
    journeyId: string,
    operator: Address,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Confirm delivery of commodities (operator only)
   */
  confirmDelivery(
    opportunityId: string,
    deliveredAmount: BigNumberString,
    operator: Address,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Complete processing and mint output tokens (operator only)
   */
  completeProcessing(
    opportunityId: string,
    outputTokenId: string,
    actualOutputAmount: BigNumberString,
    operator: Address,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Claim profits after opportunity completion
   */
  claimProfits(
    opportunityId: string,
    staker: Address,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Emergency claim for cancelled opportunities
   */
  emergencyClaim(
    opportunityId: string,
    staker: Address,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Cancel an opportunity (operator only, during funding)
   */
  cancelOpportunity(
    opportunityId: string,
    reason: string,
    operator: Address,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Approve ERC1155 tokens for staking
   */
  approveTokensForStaking(
    tokenAddress: Address,
    staker: Address,
  ): Promise<ContractTransactionReceipt | undefined>;

  /**
   * Check if tokens are approved for staking
   */
  isApprovedForStaking(tokenAddress: Address, owner: Address): Promise<boolean>;
}

/**
 * Helper to convert basis points to percentage string
 */
export function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2) + '%';
}

/**
 * Helper to convert percentage to basis points
 */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

/**
 * Helper to check if opportunity is stakeable
 */
export function isOpportunityStakeable(opp: RWYOpportunity): boolean {
  return (
    opp.status === RWYOpportunityStatus.FUNDING &&
    Date.now() / 1000 < opp.fundingDeadline &&
    BigInt(opp.stakedAmount) < BigInt(opp.targetAmount)
  );
}

/**
 * Helper to check if user can unstake
 */
export function canUnstake(opp: RWYOpportunity): boolean {
  return (
    opp.status === RWYOpportunityStatus.FUNDING ||
    opp.status === RWYOpportunityStatus.CANCELLED
  );
}

/**
 * Helper to check if user can claim profits
 */
export function canClaimProfits(opp: RWYOpportunity): boolean {
  return opp.status === RWYOpportunityStatus.DISTRIBUTING;
}

/**
 * Helper to calculate funding progress
 */
export function calculateFundingProgress(opp: RWYOpportunity): number {
  const staked = BigInt(opp.stakedAmount);
  const target = BigInt(opp.targetAmount);
  if (target === 0n) return 0;
  return Number((staked * 100n) / target);
}

/**
 * Helper to calculate time remaining
 */
export function calculateTimeRemaining(deadline: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, deadline - now);
}

/**
 * Format time remaining as human readable
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expired';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
