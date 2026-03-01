// Auto-generated from RWYStakingFacet.sol - DO NOT EDIT
// Generated at: 2026-03-01T14:56:42.080Z

export const RWYStakingFacetABI = [
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
    name: 'ContractPaused',
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
    name: 'NotAuthorized',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotContractOwner',
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
    inputs: [],
    name: 'ReentrancyGuard',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
    ],
    name: 'SafeERC20FailedOperation',
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
        name: 'operator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'CollateralReturned',
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
        internalType: 'string',
        name: 'param',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'oldValue',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newValue',
        type: 'uint256',
      },
    ],
    name: 'ConfigUpdated',
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
        name: 'documentUri',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'proofType',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'submitter',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'CustodyProofSubmitted',
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
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isInsured',
        type: 'bool',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'documentUri',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'coverageAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'expiryDate',
        type: 'uint256',
      },
    ],
    name: 'InsuranceUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'id',
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
        indexed: false,
        internalType: 'uint256',
        name: 'totalProceeds',
        type: 'uint256',
      },
    ],
    name: 'OpportunityCompleted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'id',
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
        name: 'id',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'totalStaked',
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
        name: 'stakedAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'profitShare',
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
        indexed: false,
        internalType: 'uint256',
        name: 'proceeds',
        type: 'uint256',
      },
    ],
    name: 'SaleProceedsRecorded',
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
        name: 'documentUri',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'submitter',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'TokenizationProofSubmitted',
    type: 'event',
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
        name: '',
        type: 'uint256',
      },
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
      {
        internalType: 'address',
        name: 'collateralToken',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'collateralTokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'collateralAmount',
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
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
    ],
    name: 'getCustodyProofCount',
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
    name: 'getCustodyProofs',
    outputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'documentUri',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'timestamp',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'submitter',
            type: 'address',
          },
          {
            internalType: 'string',
            name: 'proofType',
            type: 'string',
          },
        ],
        internalType: 'struct RWYStorage.CustodyProof[]',
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
        name: 'opportunityId',
        type: 'bytes32',
      },
    ],
    name: 'getInsurance',
    outputs: [
      {
        components: [
          {
            internalType: 'bool',
            name: 'isInsured',
            type: 'bool',
          },
          {
            internalType: 'string',
            name: 'documentUri',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'coverageAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'expiryDate',
            type: 'uint256',
          },
        ],
        internalType: 'struct RWYStorage.InsuranceInfo',
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
            internalType: 'enum RWYStorage.OpportunityStatus',
            name: 'status',
            type: 'uint8',
          },
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
                name: 'amount',
                type: 'uint256',
              },
            ],
            internalType: 'struct RWYStorage.CollateralInfo',
            name: 'collateral',
            type: 'tuple',
          },
          {
            components: [
              {
                internalType: 'bool',
                name: 'isInsured',
                type: 'bool',
              },
              {
                internalType: 'string',
                name: 'documentUri',
                type: 'string',
              },
              {
                internalType: 'uint256',
                name: 'coverageAmount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'expiryDate',
                type: 'uint256',
              },
            ],
            internalType: 'struct RWYStorage.InsuranceInfo',
            name: 'insurance',
            type: 'tuple',
          },
        ],
        internalType: 'struct RWYStorage.Opportunity',
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
    inputs: [],
    name: 'getRWYCLOBAddress',
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
    name: 'getRWYConfig',
    outputs: [
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
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
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
    name: 'getRWYFeeRecipient',
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
    name: 'getRWYQuoteToken',
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
        internalType: 'address',
        name: 'staker',
        type: 'address',
      },
    ],
    name: 'getRWYStake',
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
        internalType: 'struct RWYStorage.RWYStake',
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
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
    ],
    name: 'getSaleProceeds',
    outputs: [
      {
        internalType: 'uint256',
        name: 'proceeds',
        type: 'uint256',
      },
      {
        internalType: 'bool',
        name: 'finalized',
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
    ],
    name: 'getTokenizationProof',
    outputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'documentUri',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'timestamp',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'submitter',
            type: 'address',
          },
        ],
        internalType: 'struct RWYStorage.TokenizationProof',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'initializeRWYStaking',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isRWYPaused',
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
    name: 'pauseRWY',
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
        internalType: 'uint256',
        name: 'days_',
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
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: 'documentUri',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'coverageAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'expiryDate',
        type: 'uint256',
      },
    ],
    name: 'setInsurance',
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
        name: '_clob',
        type: 'address',
      },
    ],
    name: 'setRWYCLOBAddress',
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
    name: 'setRWYFeeRecipient',
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
    name: 'setRWYQuoteToken',
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
        internalType: 'bytes32',
        name: 'opportunityId',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: 'documentUri',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'proofType',
        type: 'string',
      },
    ],
    name: 'submitCustodyProof',
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
        name: 'documentUri',
        type: 'string',
      },
    ],
    name: 'submitTokenizationProof',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpauseRWY',
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
] as const;

export const RWYStakingFacetEvents = [
  {
    name: 'CollateralReturned',
    signature: 'CollateralReturned(bytes32,address,uint256)',
    signatureHash: '0x8606a781',
  },
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
    name: 'ConfigUpdated',
    signature: 'ConfigUpdated(string,uint256,uint256)',
    signatureHash: '0xd7474166',
  },
  {
    name: 'CustodyProofSubmitted',
    signature: 'CustodyProofSubmitted(bytes32,string,string,address,uint256)',
    signatureHash: '0x51d9b1fc',
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
    name: 'InsuranceUpdated',
    signature: 'InsuranceUpdated(bytes32,bool,string,uint256,uint256)',
    signatureHash: '0xaf953efb',
  },
  {
    name: 'OpportunityCancelled',
    signature: 'OpportunityCancelled(bytes32,string)',
    signatureHash: '0xd3955fc1',
  },
  {
    name: 'OpportunityCompleted',
    signature: 'OpportunityCompleted(bytes32,uint256)',
    signatureHash: '0x5d494cc2',
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
    name: 'SaleProceedsRecorded',
    signature: 'SaleProceedsRecorded(bytes32,uint256)',
    signatureHash: '0x4f6725f3',
  },
  {
    name: 'TokenizationProofSubmitted',
    signature: 'TokenizationProofSubmitted(bytes32,string,address,uint256)',
    signatureHash: '0x979c2cf4',
  },
] as const;
