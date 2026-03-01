// Auto-generated from BridgeFacet.sol - DO NOT EDIT
// Generated at: 2026-03-01T14:56:42.080Z

export const BridgeFacetABI = [
  {
    inputs: [],
    name: 'InvalidInitialization',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotInitializing',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
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
    name: 'BridgeFeeRecipientUpdated',
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
    name: 'BridgeOrderCancelled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'buyer',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'FundsEscrowed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'FundsRefunded',
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
      {
        components: [
          {
            components: [
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
            internalType: 'struct DiamondStorage.Location',
            name: 'startLocation',
            type: 'tuple',
          },
          {
            components: [
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
            internalType: 'struct DiamondStorage.Location',
            name: 'endLocation',
            type: 'tuple',
          },
          {
            internalType: 'string',
            name: 'startName',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'endName',
            type: 'string',
          },
        ],
        internalType: 'struct DiamondStorage.ParcelData',
        name: '_deliveryData',
        type: 'tuple',
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
    inputs: [
      {
        internalType: 'address',
        name: 'buyer',
        type: 'address',
      },
    ],
    name: 'getBuyerOrders',
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
        name: 'seller',
        type: 'address',
      },
    ],
    name: 'getSellerOrders',
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
        internalType: 'bytes32',
        name: 'clobOrderId',
        type: 'bytes32',
      },
    ],
    name: 'getUnifiedOrderFromClobOrder',
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
        name: 'clobTradeId',
        type: 'bytes32',
      },
    ],
    name: 'getUnifiedOrderFromClobTrade',
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
    inputs: [],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_percentage',
        type: 'uint256',
      },
    ],
    name: 'setBountyPercentage',
    outputs: [],
    stateMutability: 'nonpayable',
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
        internalType: 'uint256',
        name: '_percentage',
        type: 'uint256',
      },
    ],
    name: 'setProtocolFeePercentage',
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
    name: 'setQuoteTokenAddress',
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
        internalType: 'address',
        name: '_ausys',
        type: 'address',
      },
    ],
    name: 'updateAusysAddress',
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
    name: 'updateClobAddress',
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
] as const;

export const BridgeFacetEvents = [
  {
    name: 'BountyPaid',
    signature: 'BountyPaid(bytes32,uint256)',
    signatureHash: '0x8e7bc4ed',
  },
  {
    name: 'BridgeFeeRecipientUpdated',
    signature: 'BridgeFeeRecipientUpdated(address,address)',
    signatureHash: '0xd240f26b',
  },
  {
    name: 'BridgeOrderCancelled',
    signature: 'BridgeOrderCancelled(bytes32,uint8)',
    signatureHash: '0xfb630ff8',
  },
  {
    name: 'FundsEscrowed',
    signature: 'FundsEscrowed(address,uint256)',
    signatureHash: '0x4fbba82c',
  },
  {
    name: 'FundsRefunded',
    signature: 'FundsRefunded(address,uint256)',
    signatureHash: '0xbada1a1b',
  },
  {
    name: 'Initialized',
    signature: 'Initialized(uint64)',
    signatureHash: '0xc7f505b2',
  },
  {
    name: 'JourneyStatusUpdated',
    signature: 'JourneyStatusUpdated(bytes32,bytes32,uint8)',
    signatureHash: '0xf7da2d1a',
  },
  {
    name: 'LogisticsOrderCreated',
    signature:
      'LogisticsOrderCreated(bytes32,bytes32,bytes32[],uint256,address)',
    signatureHash: '0x9c831fa4',
  },
  {
    name: 'OrderSettled',
    signature: 'OrderSettled(bytes32,address,uint256,address,uint256)',
    signatureHash: '0xe72627b4',
  },
  {
    name: 'TradeMatched',
    signature: 'TradeMatched(bytes32,bytes32,bytes32,address,uint256,uint256)',
    signatureHash: '0x51d0a1e6',
  },
  {
    name: 'UnifiedOrderCreated',
    signature:
      'UnifiedOrderCreated(bytes32,bytes32,address,address,address,uint256,uint256,uint256)',
    signatureHash: '0xc8b6af07',
  },
] as const;
