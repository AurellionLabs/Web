// =============================================================================
// TYPE DEFINITIONS FOR CONTRACT RETURN VALUES
// These types match the ABI outputs from Diamond and other contracts
// =============================================================================

// =============================================================================
// DIAMOND CONTRACT TYPES
// =============================================================================

/**
 * Diamond getNode return type
 * From DiamondABI.ts lines 440-455
 */
export type DiamondNodeData = {
  owner: `0x${string}`;
  nodeType: string;
  capacity: bigint;
  createdAt: bigint;
  active: boolean;
  validNode: boolean;
  assetHash: `0x${string}`;
  addressName: string;
  lat: string;
  lng: string;
};

/**
 * Diamond CLOB getOrder return type
 * From DiamondABI.ts lines 1774-1788
 */
export type DiamondClobOrderData = {
  maker: `0x${string}`;
  marketId: `0x${string}`;
  price: bigint;
  amount: bigint;
  filledAmount: bigint;
  isBuy: boolean;
  orderType: number;
  status: number;
  createdAt: bigint;
  updatedAt: bigint;
};

/**
 * Diamond Orders Facet getOrder return type
 * From DiamondABI.ts lines 830-842
 */
export type DiamondOrderData = {
  buyer: `0x${string}`;
  seller: `0x${string}`;
  price: bigint;
  amount: bigint;
  status: string;
  createdAt: bigint;
};

/**
 * Diamond getTrade return type
 * From DiamondABI.ts lines 1791-1806
 */
export type DiamondTradeData = {
  takerOrderId: `0x${string}`;
  makerOrderId: `0x${string}`;
  taker: `0x${string}`;
  maker: `0x${string}`;
  marketId: `0x${string}`;
  price: bigint;
  amount: bigint;
  quoteAmount: bigint;
  timestamp: bigint;
};

/**
 * Diamond getPool return type
 * From DiamondABI.ts lines 1808-1821
 */
export type DiamondPoolData = {
  baseToken: string;
  baseTokenId: bigint;
  quoteToken: string;
  baseReserve: bigint;
  quoteReserve: bigint;
  totalLpTokens: bigint;
  isActive: boolean;
};

/**
 * Diamond getMarket return type
 * From DiamondABI.ts lines 1823-1830
 */
export type DiamondMarketData = {
  baseToken: string;
  baseTokenId: bigint;
  quoteToken: string;
  active: boolean;
};

/**
 * Diamond getUnifiedOrder return type
 * From DiamondABI.ts lines 1297-1320
 */
export type DiamondUnifiedOrderData = {
  clobOrderId: `0x${string}`;
  clobTradeId: `0x${string}`;
  ausysOrderId: `0x${string}`;
  buyer: `0x${string}`;
  seller: `0x${string}`;
  sellerNode: `0x${string}`;
  token: `0x${string}`;
  tokenId: bigint;
  tokenQuantity: bigint;
  price: bigint;
  bounty: bigint;
  status: string;
  logisticsStatus: number;
  createdAt: bigint;
  matchedAt: bigint;
  deliveredAt: bigint;
  settledAt: bigint;
};

/**
 * Diamond getStake return type
 * From DiamondABI.ts StakingFacet
 */
export type DiamondStakeData = {
  amount: bigint;
  earnedRewards: bigint;
  stakedAt: bigint;
};

// =============================================================================
// RWY VAULT CONTRACT TYPES
// =============================================================================

/**
 * RWYVault getOpportunity return type
 * From RWYVault.ts lines 122-154
 */
export type RwyOpportunityData = {
  id: `0x${string}`;
  operator: `0x${string}`;
  name: string;
  description: string;
  inputToken: `0x${string}`;
  inputTokenId: bigint;
  targetAmount: bigint;
  stakedAmount: bigint;
  outputToken: `0x${string}`;
  outputTokenId: bigint;
  expectedOutputAmount: bigint;
  promisedYieldBps: bigint;
  operatorFeeBps: bigint;
  minSalePrice: bigint;
  fundingDeadline: bigint;
  processingDeadline: bigint;
  createdAt: bigint;
  fundedAt: bigint;
  completedAt: bigint;
  status: number;
  operatorCollateral: bigint;
};

/**
 * RWYVault getStake return type
 * From RWYVault.ts lines 155-173
 */
export type RwyStakeData = {
  amount: bigint;
  stakedAt: bigint;
  claimed: boolean;
};

// =============================================================================
// AUSYS CONTRACT TYPES
// =============================================================================

/**
 * AuSys getJourney return type
 */
export type AusysJourneyData = {
  bounty: bigint;
  ETA: bigint;
  parcelData: {
    startLocation: { lat: string; lng: string };
    endLocation: { lat: string; lng: string };
    startName: string;
    endName: string;
  };
};

/**
 * AuSys getOrder return type
 */
export type AusysOrderData = {
  price: bigint;
  txFee: bigint;
};

// =============================================================================
// AUSTAKE CONTRACT TYPES
// =============================================================================

/**
 * AuStake getOperation return type
 */
export type AustakeOperationData = {
  description: string;
  provider: `0x${string}`;
  deadline: bigint;
  startDate: bigint;
  rwaName: string;
  reward: bigint;
  tokenTvl: bigint;
  operationStatus: number;
  fundingGoal: bigint;
  assetPrice: bigint;
};

// =============================================================================
// CONSTANTS
// =============================================================================

export const ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000' as `0x${string}`;
export const ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

// =============================================================================
// STATUS ENUMS
// =============================================================================

export const OrderStatus = {
  Open: 0,
  PartialFill: 1,
  Filled: 2,
  Cancelled: 3,
  Expired: 4,
} as const;

export const JourneyStatus = {
  Pending: 0,
  InTransit: 1,
  Delivered: 2,
  Canceled: 3,
} as const;

export const RwyOpportunityStatus = {
  Funding: 1,
  InTransit: 2,
  Processing: 3,
  Selling: 4,
  Distributing: 5,
  Completed: 6,
  Cancelled: 7,
} as const;

export const AustakeOperationStatus = {
  INACTIVE: 0,
  ACTIVE: 1,
  COMPLETE: 2,
  PAID: 3,
} as const;
