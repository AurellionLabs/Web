// Auto-generated Diamond ABI - DO NOT EDIT
// Generated at: 2026-01-13T22:55:31.502Z
//
// This file combines ABIs from all facets with events deduplicated by signature hash.
// For per-facet ABIs, import from the individual files.

export { NodesFacetABI, NodesFacetEvents } from './NodesFacet';
export { BridgeFacetABI, BridgeFacetEvents } from './BridgeFacet';
export { StakingFacetABI, StakingFacetEvents } from './StakingFacet';
export { DiamondCutFacetABI, DiamondCutFacetEvents } from './DiamondCutFacet';
export { OwnershipFacetABI, OwnershipFacetEvents } from './OwnershipFacet';
export { RWYVaultABI, RWYVaultEvents } from './RWYVault';
export { AuraAssetABI, AuraAssetEvents } from './AuraAsset';

// Combined ABI for Diamond contract (deduplicated events)
export const DiamondABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'clobAddress',
        type: 'address',
      },
    ],
    name: 'ClobApprovalGranted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'clobAddress',
        type: 'address',
      },
    ],
    name: 'ClobApprovalRevoked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint64',
        name: 'version',
        type: 'uint64',
      },
    ],
    name: 'Initialized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256[]',
        name: 'quantities',
        type: 'uint256[]',
      },
    ],
    name: 'NodeCapacityUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
    ],
    name: 'NodeDeactivated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'nodeType',
        type: 'string',
      },
    ],
    name: 'NodeRegistered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'nodeType',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'capacity',
        type: 'uint256',
      },
    ],
    name: 'NodeUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'price',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'capacity',
        type: 'uint256',
      },
    ],
    name: 'SupportedAssetAdded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'count',
        type: 'uint256',
      },
    ],
    name: 'SupportedAssetsUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'depositor',
        type: 'address',
      },
    ],
    name: 'TokensDepositedToNode',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'minter',
        type: 'address',
      },
    ],
    name: 'TokensMintedToNode',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'fromNode',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'toNode',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'TokensTransferredBetweenNodes',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
    ],
    name: 'TokensWithdrawnFromNode',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'string',
        name: 'addressName',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'lat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'lng',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'node',
        type: 'bytes32',
      },
    ],
    name: 'UpdateLocation',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'node',
        type: 'bytes32',
      },
    ],
    name: 'UpdateOwner',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes1',
        name: 'status',
        type: 'bytes1',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'node',
        type: 'bytes32',
      },
    ],
    name: 'UpdateStatus',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'unifiedOrderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'BountyPaid',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'oldRecipient',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newRecipient',
        type: 'address',
      },
    ],
    name: 'FeeRecipientUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'unifiedOrderId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'phase',
        type: 'uint8',
      },
    ],
    name: 'JourneyStatusUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'unifiedOrderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'ausysOrderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes32[]',
        name: 'journeyIds',
        type: 'bytes32[]',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'bounty',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'node',
        type: 'address',
      },
    ],
    name: 'LogisticsOrderCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'unifiedOrderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'previousStatus',
        type: 'uint8',
      },
    ],
    name: 'OrderCancelled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'unifiedOrderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'seller',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'sellerAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'driver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'driverAmount',
        type: 'uint256',
      },
    ],
    name: 'OrderSettled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'unifiedOrderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'clobTradeId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'clobOrderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'maker',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'price',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'TradeMatched',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'unifiedOrderId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'clobOrderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'buyer',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'seller',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'quantity',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'price',
        type: 'uint256',
      },
    ],
    name: 'UnifiedOrderCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'oldRate',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newRate',
        type: 'uint256',
      },
    ],
    name: 'RewardRateUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'RewardsClaimed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Staked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Withdrawn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'facetAddress',
            type: 'address',
          },
          {
            internalType: 'enum IDiamondCut.FacetCutAction',
            name: 'action',
            type: 'uint8',
          },
          {
            internalType: 'bytes4[]',
            name: 'functionSelectors',
            type: 'bytes4[]',
          },
        ],
        indexed: false,
        internalType: 'struct IDiamondCut.FacetCut[]',
        name: '_diamondCut',
        type: 'tuple[]',
      },
      {
        indexed: false,
        internalType: 'address',
        name: '_init',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: '_calldata',
        type: 'bytes',
      },
    ],
    name: 'DiamondCut',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'staker',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'totalStaked',
        type: 'uint256',
      },
    ],
    name: 'CommodityStaked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'staker',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'CommodityUnstaked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'deliveredAmount',
        type: 'uint256',
      },
    ],
    name: 'DeliveryConfirmed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
    ],
    name: 'DeliveryStarted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'OperatorApproved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'OperatorRevoked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'slashedAmount',
        type: 'uint256',
      },
    ],
    name: 'OperatorSlashed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'reason',
        type: 'string',
      },
    ],
    name: 'OpportunityCancelled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'inputToken',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'inputTokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'targetAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'promisedYieldBps',
        type: 'uint256',
      },
    ],
    name: 'OpportunityCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'totalAmount',
        type: 'uint256',
      },
    ],
    name: 'OpportunityFunded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'Paused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'outputAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'outputTokenId',
        type: 'uint256',
      },
    ],
    name: 'ProcessingCompleted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
    ],
    name: 'ProcessingStarted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'staker',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'principal',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'profit',
        type: 'uint256',
      },
    ],
    name: 'ProfitDistributed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'clobOrderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'price',
        type: 'uint256',
      },
    ],
    name: 'SaleOrderCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'Unpaused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'approved',
        type: 'bool',
      },
    ],
    name: 'ApprovalForAll',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'hash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'attributeIndex',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string[]',
        name: 'values',
        type: 'string[]',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'description',
        type: 'string',
      },
    ],
    name: 'AssetAttributeAdded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'hash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'assetClass',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'className',
        type: 'string',
      },
    ],
    name: 'MintedAsset',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
      {
        indexed: false,
        internalType: 'uint256[]',
        name: 'values',
        type: 'uint256[]',
      },
    ],
    name: 'TransferBatch',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'TransferSingle',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'string',
        name: 'value',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'URI',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: '_token',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_price',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_capacity',
        type: 'uint256',
      },
    ],
    name: 'addSupportedAsset',
    outputs: [
      {
        internalType: 'uint256',
        name: 'assetId',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: '_clobAddress',
        type: 'address',
      },
    ],
    name: 'approveClobForTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'creditNodeTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_nodeHash',
        type: 'bytes32',
      },
    ],
    name: 'deactivateNode',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'debitNodeTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'depositTokensToNode',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAuraAssetAddress',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_nodeHash',
        type: 'bytes32',
      },
    ],
    name: 'getNode',
    outputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'nodeType',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'capacity',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'createdAt',
        type: 'uint256',
      },
      {
        internalType: 'bool',
        name: 'active',
        type: 'bool',
      },
      {
        internalType: 'bool',
        name: 'validNode',
        type: 'bool',
      },
      {
        internalType: 'bytes32',
        name: 'assetHash',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: 'addressName',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'lat',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'lng',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
    ],
    name: 'getNodeAssets',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'token',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'tokenId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'price',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'capacity',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'createdAt',
            type: 'uint256',
          },
          {
            internalType: 'bool',
            name: 'active',
            type: 'bool',
          },
        ],
        internalType: 'struct DiamondStorage.NodeAsset[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
    ],
    name: 'getNodeInventory',
    outputs: [
      {
        internalType: 'uint256[]',
        name: 'tokenIds',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: 'balances',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_node',
        type: 'address',
      },
    ],
    name: 'getNodeStatus',
    outputs: [
      {
        internalType: 'bytes1',
        name: '',
        type: 'bytes1',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'getNodeTokenBalance',
    outputs: [
      {
        internalType: 'uint256',
        name: 'balance',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
    ],
    name: 'getNodeTokenIds',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
    ],
    name: 'getOwnerNodes',
    outputs: [
      {
        internalType: 'bytes32[]',
        name: '',
        type: 'bytes32[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
    ],
    name: 'getTotalNodeAssets',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalNodes',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_clobAddress',
        type: 'address',
      },
    ],
    name: 'isClobApproved',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '_nodeType',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: '_capacity',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: '_assetHash',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: '_addressName',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_lat',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_lng',
        type: 'string',
      },
    ],
    name: 'registerNode',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: '_clobAddress',
        type: 'address',
      },
    ],
    name: 'revokeClobApproval',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_auraAsset',
        type: 'address',
      },
    ],
    name: 'setAuraAssetAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_fromNode',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_toNode',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'transferTokensBetweenNodes',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_nodeHash',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: '_nodeType',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: '_capacity',
        type: 'uint256',
      },
    ],
    name: 'updateNode',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
      {
        internalType: 'uint256[]',
        name: '_quantities',
        type: 'uint256[]',
      },
    ],
    name: 'updateNodeCapacity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '_addressName',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_lat',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_lng',
        type: 'string',
      },
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
    ],
    name: 'updateNodeLocation',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
    ],
    name: 'updateNodeOwner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes1',
        name: '_status',
        type: 'bytes1',
      },
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
    ],
    name: 'updateNodeStatus',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
      {
        internalType: 'address[]',
        name: '_tokens',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: '_tokenIds',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: '_prices',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: '_capacities',
        type: 'uint256[]',
      },
    ],
    name: 'updateSupportedAssets',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'bytes32[]',
        name: '_nodeHashes',
        type: 'bytes32[]',
      },
    ],
    name: 'verifyTokenAccounting',
    outputs: [
      {
        internalType: 'uint256',
        name: 'diamondBalance',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'sumNodeBalances',
        type: 'uint256',
      },
      {
        internalType: 'bool',
        name: 'isBalanced',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'withdrawTokensFromNode',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'BOUNTY_PERCENTAGE',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'PROTOCOL_FEE_PERCENTAGE',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_unifiedOrderId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_clobTradeId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_ausysOrderId',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: '_seller',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_token',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'bridgeTradeToLogistics',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_unifiedOrderId',
        type: 'bytes32',
      },
    ],
    name: 'cancelUnifiedOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_unifiedOrderId',
        type: 'bytes32',
      },
    ],
    name: 'createLogisticsOrder',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_clobOrderId',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: '_sellerNode',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_price',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_quantity',
        type: 'uint256',
      },
    ],
    name: 'createUnifiedOrder',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'unifiedOrderId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeRecipient',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalUnifiedOrders',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_orderId',
        type: 'bytes32',
      },
    ],
    name: 'getUnifiedOrder',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'clobOrderId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'clobTradeId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'ausysOrderId',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'buyer',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'seller',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'sellerNode',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'tokenQuantity',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'price',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'bounty',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'status',
        type: 'string',
      },
      {
        internalType: 'uint8',
        name: 'logisticsStatus',
        type: 'uint8',
      },
      {
        internalType: 'uint256',
        name: 'createdAt',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'matchedAt',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'deliveredAt',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'settledAt',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_newRecipient',
        type: 'address',
      },
    ],
    name: 'setFeeRecipient',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_unifiedOrderId',
        type: 'bytes32',
      },
    ],
    name: 'settleOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_journeyId',
        type: 'bytes32',
      },
      {
        internalType: 'uint8',
        name: '_phase',
        type: 'uint8',
      },
    ],
    name: 'updateJourneyStatus',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'REWARD_DURATION',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimRewards',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_account',
        type: 'address',
      },
    ],
    name: 'earned',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getRewardRate',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'getStake',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'earnedRewards',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'stakedAt',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalStaked',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_newRate',
        type: 'uint256',
      },
    ],
    name: 'setRewardRate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'stake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'facetAddress',
            type: 'address',
          },
          {
            internalType: 'enum IDiamondCut.FacetCutAction',
            name: 'action',
            type: 'uint8',
          },
          {
            internalType: 'bytes4[]',
            name: 'functionSelectors',
            type: 'bytes4[]',
          },
        ],
        internalType: 'struct IDiamondCut.FacetCut[]',
        name: '_diamondCut',
        type: 'tuple[]',
      },
      {
        internalType: 'address',
        name: '_init',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: '_calldata',
        type: 'bytes',
      },
    ],
    name: 'diamondCut',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'acceptOwnership',
    outputs: [],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'approveOperator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'approvedOperators',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'stakeAmount',
        type: 'uint256',
      },
    ],
    name: 'calculateExpectedProfit',
    outputs: [
      {
        internalType: 'uint256',
        name: 'expectedProfit',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'userShareBps',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: 'reason',
        type: 'string',
      },
    ],
    name: 'cancelOpportunity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
    ],
    name: 'claimProfits',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'clobAddress',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'outputTokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'actualOutputAmount',
        type: 'uint256',
      },
    ],
    name: 'completeProcessing',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'deliveredAmount',
        type: 'uint256',
      },
    ],
    name: 'confirmDelivery',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'description',
        type: 'string',
      },
      {
        internalType: 'address',
        name: 'inputToken',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'inputTokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'targetAmount',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'outputToken',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'expectedOutputAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'promisedYieldBps',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'operatorFeeBps',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'minSalePrice',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'fundingDays',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'processingDays',
        type: 'uint256',
      },
    ],
    name: 'createOpportunity',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'defaultProcessingDays',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
    ],
    name: 'emergencyClaim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: 'reason',
        type: 'string',
      },
    ],
    name: 'forceCancel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAllOpportunities',
    outputs: [
      {
        internalType: 'bytes32[]',
        name: '',
        type: 'bytes32[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'getOperatorStats',
    outputs: [
      {
        internalType: 'bool',
        name: 'approved',
        type: 'bool',
      },
      {
        internalType: 'uint256',
        name: 'reputation',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'successfulOps',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'totalValueProcessed',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
    ],
    name: 'getOpportunity',
    outputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'id',
            type: 'bytes32',
          },
          {
            internalType: 'address',
            name: 'operator',
            type: 'address',
          },
          {
            internalType: 'string',
            name: 'name',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'description',
            type: 'string',
          },
          {
            internalType: 'address',
            name: 'inputToken',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'inputTokenId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'targetAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'stakedAmount',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'outputToken',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'outputTokenId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'expectedOutputAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'promisedYieldBps',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'operatorFeeBps',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'minSalePrice',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'fundingDeadline',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'processingDeadline',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'createdAt',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'fundedAt',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'completedAt',
            type: 'uint256',
          },
          {
            internalType: 'enum IRWYVault.OpportunityStatus',
            name: 'status',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'operatorCollateral',
            type: 'uint256',
          },
        ],
        internalType: 'struct IRWYVault.Opportunity',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getOpportunityCount',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
    ],
    name: 'getOpportunityStakers',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'isApprovedOperator',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'isStaker',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxYieldBps',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'minOperatorCollateralBps',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes',
      },
    ],
    name: 'onERC1155BatchReceived',
    outputs: [
      {
        internalType: 'bytes4',
        name: '',
        type: 'bytes4',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes',
      },
    ],
    name: 'onERC1155Received',
    outputs: [
      {
        internalType: 'bytes4',
        name: '',
        type: 'bytes4',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'operatorReputation',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'operatorSuccessfulOps',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'operatorTotalValueProcessed',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'opportunities',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'id',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'description',
        type: 'string',
      },
      {
        internalType: 'address',
        name: 'inputToken',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'inputTokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'targetAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'stakedAmount',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'outputToken',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'outputTokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'expectedOutputAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'promisedYieldBps',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'operatorFeeBps',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'minSalePrice',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'fundingDeadline',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'processingDeadline',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'createdAt',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'fundedAt',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'completedAt',
        type: 'uint256',
      },
      {
        internalType: 'enum IRWYVault.OpportunityStatus',
        name: 'status',
        type: 'uint8',
      },
      {
        internalType: 'uint256',
        name: 'operatorCollateral',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'opportunityCounter',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'opportunityIds',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'opportunityStakers',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'proceedsFinalized',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'protocolFeeBps',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'quoteToken',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'proceeds',
        type: 'uint256',
      },
    ],
    name: 'recordSaleProceeds',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'revokeOperator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'saleProceeds',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_clob',
        type: 'address',
      },
    ],
    name: 'setCLOBAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_days',
        type: 'uint256',
      },
    ],
    name: 'setDefaultProcessingDays',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'bps',
        type: 'uint256',
      },
    ],
    name: 'setMaxYieldBps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'bps',
        type: 'uint256',
      },
    ],
    name: 'setMinCollateralBps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'bps',
        type: 'uint256',
      },
    ],
    name: 'setProtocolFeeBps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_quoteToken',
        type: 'address',
      },
    ],
    name: 'setQuoteToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'slashOperator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'stakes',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'stakedAt',
        type: 'uint256',
      },
      {
        internalType: 'bool',
        name: 'claimed',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
    ],
    name: 'startDelivery',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: 'interfaceId',
        type: 'bytes4',
      },
    ],
    name: 'supportsInterface',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'unstake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'className',
        type: 'string',
      },
    ],
    name: 'addSupportedClass',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: 'accounts',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
    ],
    name: 'balanceOfBatch',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: 'values',
        type: 'uint256[]',
      },
    ],
    name: 'burnBatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'exists',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'hashToClass',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'hashToTokenID',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'ipfsID',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'isApprovedForAll',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'isClassActive',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'name',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'assetClass',
            type: 'string',
          },
          {
            components: [
              {
                internalType: 'string',
                name: 'name',
                type: 'string',
              },
              {
                internalType: 'string[]',
                name: 'values',
                type: 'string[]',
              },
              {
                internalType: 'string',
                name: 'description',
                type: 'string',
              },
            ],
            internalType: 'struct AuraAsset.Attribute[]',
            name: 'attributes',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct AuraAsset.Asset',
        name: 'asset',
        type: 'tuple',
      },
    ],
    name: 'lookupHash',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'mintBatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    name: 'nameToSupportedAssetIndex',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    name: 'nameToSupportedAssets',
    outputs: [
      {
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'assetClass',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    name: 'nameToSupportedClass',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    name: 'nameToSupportedClassIndex',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        components: [
          {
            internalType: 'string',
            name: 'name',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'assetClass',
            type: 'string',
          },
          {
            components: [
              {
                internalType: 'string',
                name: 'name',
                type: 'string',
              },
              {
                internalType: 'string[]',
                name: 'values',
                type: 'string[]',
              },
              {
                internalType: 'string',
                name: 'description',
                type: 'string',
              },
            ],
            internalType: 'struct AuraAsset.Attribute[]',
            name: 'attributes',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct AuraAsset.Asset',
        name: 'asset',
        type: 'tuple',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'className',
        type: 'string',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'nodeMint',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'hash',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'tokenID',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'name',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'assetClass',
            type: 'string',
          },
          {
            components: [
              {
                internalType: 'string',
                name: 'name',
                type: 'string',
              },
              {
                internalType: 'string[]',
                name: 'values',
                type: 'string[]',
              },
              {
                internalType: 'string',
                name: 'description',
                type: 'string',
              },
            ],
            internalType: 'struct AuraAsset.Attribute[]',
            name: 'attributes',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct AuraAsset.Asset',
        name: 'asset',
        type: 'tuple',
      },
    ],
    name: 'removeSupportedAsset',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'className',
        type: 'string',
      },
    ],
    name: 'removeSupportedClass',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'safeBatchTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'approved',
        type: 'bool',
      },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'contract IAurumNodeManager',
        name: '_NodeManager',
        type: 'address',
      },
    ],
    name: 'setNodeManager',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'newuri',
        type: 'string',
      },
    ],
    name: 'setURI',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'supportedAssets',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'supportedClasses',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'totalSupply',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'uri',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Event signature registry for disambiguation
export const EventSignatureRegistry = {
  '0xd5126df4': {
    name: 'ClobApprovalGranted',
    facet: 'NodesFacet',
    signature: 'ClobApprovalGranted(bytes32,address)',
  },
  '0xbdd45b26': {
    name: 'ClobApprovalRevoked',
    facet: 'NodesFacet',
    signature: 'ClobApprovalRevoked(bytes32,address)',
  },
  '0xc7f505b2': {
    name: 'Initialized',
    facet: 'NodesFacet',
    signature: 'Initialized(uint64)',
  },
  '0x0ba8897d': {
    name: 'NodeCapacityUpdated',
    facet: 'NodesFacet',
    signature: 'NodeCapacityUpdated(bytes32,uint256[])',
  },
  '0x62b30865': {
    name: 'NodeDeactivated',
    facet: 'NodesFacet',
    signature: 'NodeDeactivated(bytes32)',
  },
  '0x8326de45': {
    name: 'NodeRegistered',
    facet: 'NodesFacet',
    signature: 'NodeRegistered(bytes32,address,string)',
  },
  '0x9c97a401': {
    name: 'NodeUpdated',
    facet: 'NodesFacet',
    signature: 'NodeUpdated(bytes32,string,uint256)',
  },
  '0x9f0a9fa6': {
    name: 'SupportedAssetAdded',
    facet: 'NodesFacet',
    signature: 'SupportedAssetAdded(bytes32,address,uint256,uint256,uint256)',
  },
  '0x1af735b1': {
    name: 'SupportedAssetsUpdated',
    facet: 'NodesFacet',
    signature: 'SupportedAssetsUpdated(bytes32,uint256)',
  },
  '0x9d994707': {
    name: 'TokensDepositedToNode',
    facet: 'NodesFacet',
    signature: 'TokensDepositedToNode(bytes32,uint256,uint256,address)',
  },
  '0x1177d829': {
    name: 'TokensMintedToNode',
    facet: 'NodesFacet',
    signature: 'TokensMintedToNode(bytes32,uint256,uint256,address)',
  },
  '0x5cee2a26': {
    name: 'TokensTransferredBetweenNodes',
    facet: 'NodesFacet',
    signature: 'TokensTransferredBetweenNodes(bytes32,bytes32,uint256,uint256)',
  },
  '0x59947f68': {
    name: 'TokensWithdrawnFromNode',
    facet: 'NodesFacet',
    signature: 'TokensWithdrawnFromNode(bytes32,uint256,uint256,address)',
  },
  '0x6d4f5fd0': {
    name: 'UpdateLocation',
    facet: 'NodesFacet',
    signature: 'UpdateLocation(string,string,string,bytes32)',
  },
  '0xea9df86c': {
    name: 'UpdateOwner',
    facet: 'NodesFacet',
    signature: 'UpdateOwner(address,bytes32)',
  },
  '0xcf4e8a63': {
    name: 'UpdateStatus',
    facet: 'NodesFacet',
    signature: 'UpdateStatus(bytes1,bytes32)',
  },
  '0x8e7bc4ed': {
    name: 'BountyPaid',
    facet: 'BridgeFacet',
    signature: 'BountyPaid(bytes32,uint256)',
  },
  '0xaaebcf1b': {
    name: 'FeeRecipientUpdated',
    facet: 'BridgeFacet',
    signature: 'FeeRecipientUpdated(address,address)',
  },
  '0xf7da2d1a': {
    name: 'JourneyStatusUpdated',
    facet: 'BridgeFacet',
    signature: 'JourneyStatusUpdated(bytes32,bytes32,uint8)',
  },
  '0x9c831fa4': {
    name: 'LogisticsOrderCreated',
    facet: 'BridgeFacet',
    signature:
      'LogisticsOrderCreated(bytes32,bytes32,bytes32[],uint256,address)',
  },
  '0xe3bb8b6a': {
    name: 'OrderCancelled',
    facet: 'BridgeFacet',
    signature: 'OrderCancelled(bytes32,uint8)',
  },
  '0xe72627b4': {
    name: 'OrderSettled',
    facet: 'BridgeFacet',
    signature: 'OrderSettled(bytes32,address,uint256,address,uint256)',
  },
  '0x51d0a1e6': {
    name: 'TradeMatched',
    facet: 'BridgeFacet',
    signature: 'TradeMatched(bytes32,bytes32,bytes32,address,uint256,uint256)',
  },
  '0xc8b6af07': {
    name: 'UnifiedOrderCreated',
    facet: 'BridgeFacet',
    signature:
      'UnifiedOrderCreated(bytes32,bytes32,address,address,address,uint256,uint256,uint256)',
  },
  '0xc390a98a': {
    name: 'RewardRateUpdated',
    facet: 'StakingFacet',
    signature: 'RewardRateUpdated(uint256,uint256)',
  },
  '0xfc30cdde': {
    name: 'RewardsClaimed',
    facet: 'StakingFacet',
    signature: 'RewardsClaimed(address,uint256)',
  },
  '0x9e71bc8e': {
    name: 'Staked',
    facet: 'StakingFacet',
    signature: 'Staked(address,uint256)',
  },
  '0x7084f547': {
    name: 'Withdrawn',
    facet: 'StakingFacet',
    signature: 'Withdrawn(address,uint256)',
  },
  '0xe785b7d4': {
    name: 'DiamondCut',
    facet: 'DiamondCutFacet',
    signature: 'DiamondCut(tuple[],address,bytes)',
  },
  '0x8be0079c': {
    name: 'OwnershipTransferred',
    facet: 'OwnershipFacet',
    signature: 'OwnershipTransferred(address,address)',
  },
  '0xdbd49b34': {
    name: 'CommodityStaked',
    facet: 'RWYVault',
    signature: 'CommodityStaked(bytes32,address,uint256,uint256)',
  },
  '0x24b492cf': {
    name: 'CommodityUnstaked',
    facet: 'RWYVault',
    signature: 'CommodityUnstaked(bytes32,address,uint256)',
  },
  '0x1c0fcf44': {
    name: 'DeliveryConfirmed',
    facet: 'RWYVault',
    signature: 'DeliveryConfirmed(bytes32,uint256)',
  },
  '0xec8d4528': {
    name: 'DeliveryStarted',
    facet: 'RWYVault',
    signature: 'DeliveryStarted(bytes32,bytes32)',
  },
  '0xf338da91': {
    name: 'OperatorApproved',
    facet: 'RWYVault',
    signature: 'OperatorApproved(address)',
  },
  '0xa5f3b762': {
    name: 'OperatorRevoked',
    facet: 'RWYVault',
    signature: 'OperatorRevoked(address)',
  },
  '0x4674c0ba': {
    name: 'OperatorSlashed',
    facet: 'RWYVault',
    signature: 'OperatorSlashed(bytes32,address,uint256)',
  },
  '0xd3955fc1': {
    name: 'OpportunityCancelled',
    facet: 'RWYVault',
    signature: 'OpportunityCancelled(bytes32,string)',
  },
  '0x1e5c8915': {
    name: 'OpportunityCreated',
    facet: 'RWYVault',
    signature:
      'OpportunityCreated(bytes32,address,address,uint256,uint256,uint256)',
  },
  '0xef294796': {
    name: 'OpportunityFunded',
    facet: 'RWYVault',
    signature: 'OpportunityFunded(bytes32,uint256)',
  },
  '0x62e78cea': {
    name: 'Paused',
    facet: 'RWYVault',
    signature: 'Paused(address)',
  },
  '0x85ee5e30': {
    name: 'ProcessingCompleted',
    facet: 'RWYVault',
    signature: 'ProcessingCompleted(bytes32,uint256,uint256)',
  },
  '0xcc013089': {
    name: 'ProcessingStarted',
    facet: 'RWYVault',
    signature: 'ProcessingStarted(bytes32)',
  },
  '0x275d0197': {
    name: 'ProfitDistributed',
    facet: 'RWYVault',
    signature: 'ProfitDistributed(bytes32,address,uint256,uint256)',
  },
  '0xfd82109e': {
    name: 'SaleOrderCreated',
    facet: 'RWYVault',
    signature: 'SaleOrderCreated(bytes32,bytes32,uint256,uint256)',
  },
  '0x5db9ee0a': {
    name: 'Unpaused',
    facet: 'RWYVault',
    signature: 'Unpaused(address)',
  },
  '0x17307eab': {
    name: 'ApprovalForAll',
    facet: 'AuraAsset',
    signature: 'ApprovalForAll(address,address,bool)',
  },
  '0xee7669d5': {
    name: 'AssetAttributeAdded',
    facet: 'AuraAsset',
    signature: 'AssetAttributeAdded(bytes32,uint256,string,string[],string)',
  },
  '0xda6f2bc5': {
    name: 'MintedAsset',
    facet: 'AuraAsset',
    signature: 'MintedAsset(address,bytes32,uint256,string,string,string)',
  },
  '0x4a39dc06': {
    name: 'TransferBatch',
    facet: 'AuraAsset',
    signature: 'TransferBatch(address,address,address,uint256[],uint256[])',
  },
  '0xc3d58168': {
    name: 'TransferSingle',
    facet: 'AuraAsset',
    signature: 'TransferSingle(address,address,address,uint256,uint256)',
  },
  '0x6bb7ff70': {
    name: 'URI',
    facet: 'AuraAsset',
    signature: 'URI(string,uint256)',
  },
} as const;
