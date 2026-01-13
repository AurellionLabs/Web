// Auto-generated from RWYVault.sol - DO NOT EDIT
// Generated at: 2026-01-13T22:55:31.501Z

export const RWYVaultABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_feeRecipient',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_clobAddress',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_quoteToken',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'AlreadyClaimed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CannotUnstake',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ExceedsTarget',
    type: 'error',
  },
  {
    inputs: [],
    name: 'FundingDeadlinePassed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InsufficientCollateral',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InsufficientStake',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidAmount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidStatus',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidTimeline',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidYield',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NoStake',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotApprovedOperator',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotOperator',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OpportunityNotFound',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ProcessingDeadlinePassed',
    type: 'error',
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
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'staker',
        type: 'address',
      },
    ],
    name: 'getStake',
    outputs: [
      {
        components: [
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
        internalType: 'struct IRWYVault.Stake',
        name: '',
        type: 'tuple',
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
        internalType: 'address',
        name: '_feeRecipient',
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
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'amount',
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
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
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
    stateMutability: 'payable',
    type: 'receive',
  },
] as const;

export const RWYVaultEvents = [
  {
    name: 'CommodityStaked',
    signature: 'CommodityStaked(bytes32,address,uint256,uint256)',
    signatureHash: '0xdbd49b34',
  },
  {
    name: 'CommodityUnstaked',
    signature: 'CommodityUnstaked(bytes32,address,uint256)',
    signatureHash: '0x24b492cf',
  },
  {
    name: 'DeliveryConfirmed',
    signature: 'DeliveryConfirmed(bytes32,uint256)',
    signatureHash: '0x1c0fcf44',
  },
  {
    name: 'DeliveryStarted',
    signature: 'DeliveryStarted(bytes32,bytes32)',
    signatureHash: '0xec8d4528',
  },
  {
    name: 'OperatorApproved',
    signature: 'OperatorApproved(address)',
    signatureHash: '0xf338da91',
  },
  {
    name: 'OperatorRevoked',
    signature: 'OperatorRevoked(address)',
    signatureHash: '0xa5f3b762',
  },
  {
    name: 'OperatorSlashed',
    signature: 'OperatorSlashed(bytes32,address,uint256)',
    signatureHash: '0x4674c0ba',
  },
  {
    name: 'OpportunityCancelled',
    signature: 'OpportunityCancelled(bytes32,string)',
    signatureHash: '0xd3955fc1',
  },
  {
    name: 'OpportunityCreated',
    signature:
      'OpportunityCreated(bytes32,address,address,uint256,uint256,uint256)',
    signatureHash: '0x1e5c8915',
  },
  {
    name: 'OpportunityFunded',
    signature: 'OpportunityFunded(bytes32,uint256)',
    signatureHash: '0xef294796',
  },
  {
    name: 'OwnershipTransferred',
    signature: 'OwnershipTransferred(address,address)',
    signatureHash: '0x8be0079c',
  },
  {
    name: 'Paused',
    signature: 'Paused(address)',
    signatureHash: '0x62e78cea',
  },
  {
    name: 'ProcessingCompleted',
    signature: 'ProcessingCompleted(bytes32,uint256,uint256)',
    signatureHash: '0x85ee5e30',
  },
  {
    name: 'ProcessingStarted',
    signature: 'ProcessingStarted(bytes32)',
    signatureHash: '0xcc013089',
  },
  {
    name: 'ProfitDistributed',
    signature: 'ProfitDistributed(bytes32,address,uint256,uint256)',
    signatureHash: '0x275d0197',
  },
  {
    name: 'SaleOrderCreated',
    signature: 'SaleOrderCreated(bytes32,bytes32,uint256,uint256)',
    signatureHash: '0xfd82109e',
  },
  {
    name: 'Unpaused',
    signature: 'Unpaused(address)',
    signatureHash: '0x5db9ee0a',
  },
] as const;
