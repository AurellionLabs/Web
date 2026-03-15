// Auto-generated from OrderRouterFacet.sol - DO NOT EDIT
// Generated at: 2026-03-10T19:30:30.101Z

export const OrderRouterFacetABI = [
  {
    inputs: [],
    name: 'InsufficientNodeBalance',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidAmount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidPrice',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidTimeInForce',
    type: 'error',
  },
  {
    inputs: [],
    name: 'MarketPaused',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NoLiquidityForMarketOrder',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotNodeOperator',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotNodeOwner',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OrderExpired',
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
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'maker',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'orderSource',
        type: 'uint8',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isBuy',
        type: 'bool',
      },
    ],
    name: 'OrderRouted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'maker',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'remainingAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'reason',
        type: 'uint8',
      },
    ],
    name: 'RouterOrderCancelled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
      {
        indexed: true,
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
      {
        indexed: false,
        internalType: 'bool',
        name: 'isBuy',
        type: 'bool',
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'orderType',
        type: 'uint8',
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'timeInForce',
        type: 'uint8',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'expiry',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
    ],
    name: 'RouterOrderCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'maker',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'baseToken',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'baseTokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'quoteToken',
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
      {
        indexed: false,
        internalType: 'bool',
        name: 'isBuy',
        type: 'bool',
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'orderType',
        type: 'uint8',
      },
    ],
    name: 'RouterOrderPlaced',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'tradeId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'takerOrderId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'makerOrderId',
        type: 'bytes32',
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
      {
        indexed: false,
        internalType: 'uint256',
        name: 'quoteAmount',
        type: 'uint256',
      },
    ],
    name: 'RouterTradeExecuted',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    name: 'cancelOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32[]',
        name: 'orderIds',
        type: 'bytes32[]',
      },
    ],
    name: 'cancelOrders',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
    ],
    name: 'getBestPrices',
    outputs: [
      {
        internalType: 'uint96',
        name: 'bestBid',
        type: 'uint96',
      },
      {
        internalType: 'uint96',
        name: 'bestBidSize',
        type: 'uint96',
      },
      {
        internalType: 'uint96',
        name: 'bestAsk',
        type: 'uint96',
      },
      {
        internalType: 'uint96',
        name: 'bestAskSize',
        type: 'uint96',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    name: 'getOrder',
    outputs: [
      {
        internalType: 'address',
        name: 'maker',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
      {
        internalType: 'uint96',
        name: 'price',
        type: 'uint96',
      },
      {
        internalType: 'uint96',
        name: 'amount',
        type: 'uint96',
      },
      {
        internalType: 'uint64',
        name: 'filledAmount',
        type: 'uint64',
      },
      {
        internalType: 'bool',
        name: 'isBuy',
        type: 'bool',
      },
      {
        internalType: 'uint8',
        name: 'status',
        type: 'uint8',
      },
      {
        internalType: 'uint8',
        name: 'timeInForce',
        type: 'uint8',
      },
      {
        internalType: 'uint40',
        name: 'expiry',
        type: 'uint40',
      },
      {
        internalType: 'uint40',
        name: 'createdAt',
        type: 'uint40',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'baseToken',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'baseTokenId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'quoteToken',
        type: 'address',
      },
      {
        internalType: 'uint96',
        name: 'price',
        type: 'uint96',
      },
      {
        internalType: 'uint96',
        name: 'amount',
        type: 'uint96',
      },
    ],
    name: 'placeBuyOrder',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'baseToken',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'baseTokenId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'quoteToken',
        type: 'address',
      },
      {
        internalType: 'uint96',
        name: 'amount',
        type: 'uint96',
      },
      {
        internalType: 'bool',
        name: 'isBuy',
        type: 'bool',
      },
      {
        internalType: 'uint16',
        name: 'maxSlippageBps',
        type: 'uint16',
      },
    ],
    name: 'placeMarketOrder',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'nodeOwner',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'baseToken',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'baseTokenId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'quoteToken',
        type: 'address',
      },
      {
        internalType: 'uint96',
        name: 'price',
        type: 'uint96',
      },
      {
        internalType: 'uint96',
        name: 'amount',
        type: 'uint96',
      },
      {
        internalType: 'uint8',
        name: 'timeInForce',
        type: 'uint8',
      },
      {
        internalType: 'uint40',
        name: 'expiry',
        type: 'uint40',
      },
    ],
    name: 'placeNodeSellOrder',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'baseToken',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'baseTokenId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'quoteToken',
        type: 'address',
      },
      {
        internalType: 'uint96',
        name: 'price',
        type: 'uint96',
      },
      {
        internalType: 'uint96',
        name: 'amount',
        type: 'uint96',
      },
      {
        internalType: 'bool',
        name: 'isBuy',
        type: 'bool',
      },
      {
        internalType: 'uint8',
        name: 'timeInForce',
        type: 'uint8',
      },
      {
        internalType: 'uint40',
        name: 'expiry',
        type: 'uint40',
      },
    ],
    name: 'placeOrder',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'baseToken',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'baseTokenId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'quoteToken',
        type: 'address',
      },
      {
        internalType: 'uint96',
        name: 'price',
        type: 'uint96',
      },
      {
        internalType: 'uint96',
        name: 'amount',
        type: 'uint96',
      },
    ],
    name: 'placeSellOrder',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const OrderRouterFacetEvents = [
  {
    name: 'OrderRouted',
    signature: 'OrderRouted(bytes32,address,uint8,bool)',
    signatureHash: '0x138298a5',
  },
  {
    name: 'RouterOrderCancelled',
    signature: 'RouterOrderCancelled(bytes32,address,uint256,uint8)',
    signatureHash: '0x8f112c49',
  },
  {
    name: 'RouterOrderCreated',
    signature:
      'RouterOrderCreated(bytes32,bytes32,address,uint256,uint256,bool,uint8,uint8,uint256,uint256)',
    signatureHash: '0x7398300e',
  },
  {
    name: 'RouterOrderPlaced',
    signature:
      'RouterOrderPlaced(bytes32,address,address,uint256,address,uint256,uint256,bool,uint8)',
    signatureHash: '0x0e2e2fa3',
  },
  {
    name: 'RouterTradeExecuted',
    signature:
      'RouterTradeExecuted(bytes32,bytes32,bytes32,uint256,uint256,uint256)',
    signatureHash: '0x54931e7e',
  },
] as const;
