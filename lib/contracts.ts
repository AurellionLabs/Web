/**
 * Contract addresses and ABIs for frontend integration
 */

import {
  NEXT_PUBLIC_AUSTAKE_ADDRESS,
  NEXT_PUBLIC_AURA_TOKEN_ADDRESS,
  NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
  NEXT_PUBLIC_AUSYS_ADDRESS,
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  NEXT_PUBLIC_CLOB_ADDRESS,
  NEXT_PUBLIC_ORDER_BRIDGE_ADDRESS,
  NEXT_PUBLIC_RWY_STAKING_FACET_ADDRESS,
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
  NEXT_PUBLIC_DIAMOND_ADDRESS,
} from '../chain-constants';

// Re-export typechain types for contract interaction
// Note: Legacy contracts - now handled via Diamond pattern
export type { OrderBridge } from '@/typechain-types/contracts/OrderBridge';
export type AuraAsset = any;
export type Ausys = any;
export type AurumNode = any;
export type AurumNodeManager = any;
export type AuraGoatRed = any;
export type AuStake = any;
export type CLOB = any;
export type Diamond = any;

// Re-export factories for contract instantiation
export { OrderBridge__factory } from '@/typechain-types/factories/contracts/OrderBridge__factory';
export const AuraAsset__factory = {} as any;
export const Ausys__factory = {} as any;
export const AurumNode__factory = {} as any;
export const AurumNodeManager__factory = {} as any;
export const AuraGoatRed__factory = {} as any;
export const AuStake__factory = {} as any;
export const CLOB__factory = {} as any;
export const Diamond__factory = {} as any;

// Re-export addresses for easy access
export const auStakeAddress = NEXT_PUBLIC_AUSTAKE_ADDRESS as `0x${string}`;
export const auraTokenAddress = NEXT_PUBLIC_AURA_TOKEN_ADDRESS as `0x${string}`;
export const aurumNodeManagerAddress = NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS as `0x${string}`;
export const auSysAddress = NEXT_PUBLIC_AUSYS_ADDRESS as `0x${string}`;
export const auraAssetAddress = NEXT_PUBLIC_AURA_ASSET_ADDRESS as `0x${string}`;
export const clobAddress = NEXT_PUBLIC_CLOB_ADDRESS as `0x${string}`;
export const orderBridgeAddress = NEXT_PUBLIC_ORDER_BRIDGE_ADDRESS as `0x${string}`;
export const rwyStakingFacetAddress = NEXT_PUBLIC_RWY_STAKING_FACET_ADDRESS as `0x${string}`;
export const rwyVaultAddress = rwyStakingFacetAddress; // Alias for backwards compatibility
export const quoteTokenAddress = NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS as `0x${string}`;
export const diamondAddress = NEXT_PUBLIC_DIAMOND_ADDRESS as `0x${string}`;

// RWY Vault ABI (subset for frontend use)
export const rwyVaultABI = [
  // Events
  {
    type: 'event',
    name: 'OpportunityCreated',
    inputs: [
      { name: 'opportunityId', type: 'bytes32', indexed: true },
      { name: 'operator', type: 'address', indexed: true },
      { name: 'inputToken', type: 'address', indexed: false },
      { name: 'inputTokenId', type: 'uint256', indexed: false },
      { name: 'targetAmount', type: 'uint256', indexed: false },
      { name: 'promisedYieldBps', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'CommodityStaked',
    inputs: [
      { name: 'opportunityId', type: 'bytes32', indexed: true },
      { name: 'staker', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'totalStaked', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ProfitDistributed',
    inputs: [
      { name: 'opportunityId', type: 'bytes32', indexed: true },
      { name: 'staker', type: 'address', indexed: true },
      { name: 'principal', type: 'uint256', indexed: false },
      { name: 'profit', type: 'uint256', indexed: false },
    ],
  },
  // Read functions
  {
    type: 'function',
    name: 'getOpportunity',
    stateMutability: 'view',
    inputs: [{ name: 'opportunityId', type: 'bytes32' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'id', type: 'bytes32' },
          { name: 'operator', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'inputToken', type: 'address' },
          { name: 'inputTokenId', type: 'uint256' },
          { name: 'targetAmount', type: 'uint256' },
          { name: 'stakedAmount', type: 'uint256' },
          { name: 'outputToken', type: 'address' },
          { name: 'outputTokenId', type: 'uint256' },
          { name: 'expectedOutputAmount', type: 'uint256' },
          { name: 'promisedYieldBps', type: 'uint256' },
          { name: 'operatorFeeBps', type: 'uint256' },
          { name: 'minSalePrice', type: 'uint256' },
          { name: 'fundingDeadline', type: 'uint256' },
          { name: 'processingDeadline', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'fundedAt', type: 'uint256' },
          { name: 'completedAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'operatorCollateral', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getStake',
    stateMutability: 'view',
    inputs: [
      { name: 'opportunityId', type: 'bytes32' },
      { name: 'staker', type: 'address' },
    ],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'amount', type: 'uint256' },
          { name: 'stakedAt', type: 'uint256' },
          { name: 'claimed', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getOpportunityStakers',
    stateMutability: 'view',
    inputs: [{ name: 'opportunityId', type: 'bytes32' }],
    outputs: [{ type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'getAllOpportunities',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bytes32[]' }],
  },
  {
    type: 'function',
    name: 'getOperatorStats',
    stateMutability: 'view',
    inputs: [{ name: 'operator', type: 'address' }],
    outputs: [
      { name: 'approved', type: 'bool' },
      { name: 'reputation', type: 'uint256' },
      { name: 'successfulOps', type: 'uint256' },
      { name: 'totalValueProcessed', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'calculateExpectedProfit',
    stateMutability: 'view',
    inputs: [
      { name: 'opportunityId', type: 'bytes32' },
      { name: 'stakeAmount', type: 'uint256' },
    ],
    outputs: [
      { name: 'expectedProfit', type: 'uint256' },
      { name: 'userShareBps', type: 'uint256' },
    ],
  },
  // Write functions
  {
    type: 'function',
    name: 'createOpportunity',
    stateMutability: 'payable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'inputToken', type: 'address' },
      { name: 'inputTokenId', type: 'uint256' },
      { name: 'targetAmount', type: 'uint256' },
      { name: 'outputToken', type: 'address' },
      { name: 'expectedOutputAmount', type: 'uint256' },
      { name: 'promisedYieldBps', type: 'uint256' },
      { name: 'operatorFeeBps', type: 'uint256' },
      { name: 'minSalePrice', type: 'uint256' },
      { name: 'fundingDays', type: 'uint256' },
      { name: 'processingDays', type: 'uint256' },
    ],
    outputs: [{ type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'stake',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'opportunityId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'unstake',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'opportunityId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claimProfits',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'opportunityId', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'startDelivery',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'opportunityId', type: 'bytes32' },
      { name: 'journeyId', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'confirmDelivery',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'opportunityId', type: 'bytes32' },
      { name: 'deliveredAmount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'completeProcessing',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'opportunityId', type: 'bytes32' },
      { name: 'outputTokenId', type: 'uint256' },
      { name: 'actualOutputAmount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'cancelOpportunity',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'opportunityId', type: 'bytes32' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
  },
] as const;

// ERC1155 ABI (for approval checks)
export const erc1155ABI = [
  {
    type: 'function',
    name: 'setApprovalForAll',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'isApprovedForAll',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

