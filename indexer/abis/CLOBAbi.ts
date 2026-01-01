// CLOB Contract ABI - Events for indexing
export const CLOBAbi = [
  // OrderPlaced event
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
      { indexed: false, internalType: 'bool', name: 'isBuy', type: 'bool' },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'orderType',
        type: 'uint8',
      },
    ],
    name: 'OrderPlaced',
    type: 'event',
  },
  // OrderMatched event
  {
    anonymous: false,
    inputs: [
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
        indexed: true,
        internalType: 'bytes32',
        name: 'tradeId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'fillAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'fillPrice',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'quoteAmount',
        type: 'uint256',
      },
    ],
    name: 'OrderMatched',
    type: 'event',
  },
  // OrderCancelled event
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
    ],
    name: 'OrderCancelled',
    type: 'event',
  },
  // OrderUpdated event
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
        indexed: false,
        internalType: 'uint8',
        name: 'newStatus',
        type: 'uint8',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'filledAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'remainingAmount',
        type: 'uint256',
      },
    ],
    name: 'OrderUpdated',
    type: 'event',
  },
  // TradeExecuted event
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
        internalType: 'address',
        name: 'taker',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'maker',
        type: 'address',
      },
      {
        indexed: false,
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
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'TradeExecuted',
    type: 'event',
  },
  // LiquidityAdded event
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'poolId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'provider',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'baseAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'quoteAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'lpTokensMinted',
        type: 'uint256',
      },
    ],
    name: 'LiquidityAdded',
    type: 'event',
  },
  // LiquidityRemoved event
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'poolId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'provider',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'baseAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'quoteAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'lpTokensBurned',
        type: 'uint256',
      },
    ],
    name: 'LiquidityRemoved',
    type: 'event',
  },
  // PoolCreated event
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'poolId',
        type: 'bytes32',
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
        indexed: true,
        internalType: 'address',
        name: 'quoteToken',
        type: 'address',
      },
    ],
    name: 'PoolCreated',
    type: 'event',
  },
  // FeesCollected event
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
        indexed: false,
        internalType: 'uint256',
        name: 'takerFeeAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'makerFeeAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'lpFeeAmount',
        type: 'uint256',
      },
    ],
    name: 'FeesCollected',
    type: 'event',
  },
  // Read functions
  {
    inputs: [{ internalType: 'bytes32', name: 'orderId', type: 'bytes32' }],
    name: 'getOrder',
    outputs: [
      {
        components: [
          { internalType: 'bytes32', name: 'id', type: 'bytes32' },
          { internalType: 'address', name: 'maker', type: 'address' },
          { internalType: 'address', name: 'baseToken', type: 'address' },
          { internalType: 'uint256', name: 'baseTokenId', type: 'uint256' },
          { internalType: 'address', name: 'quoteToken', type: 'address' },
          { internalType: 'uint256', name: 'price', type: 'uint256' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'filledAmount', type: 'uint256' },
          { internalType: 'bool', name: 'isBuy', type: 'bool' },
          { internalType: 'uint8', name: 'orderType', type: 'uint8' },
          { internalType: 'uint8', name: 'status', type: 'uint8' },
          { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
          { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
        ],
        internalType: 'struct CLOB.Order',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'tradeId', type: 'bytes32' }],
    name: 'getTrade',
    outputs: [
      {
        components: [
          { internalType: 'bytes32', name: 'id', type: 'bytes32' },
          { internalType: 'bytes32', name: 'takerOrderId', type: 'bytes32' },
          { internalType: 'bytes32', name: 'makerOrderId', type: 'bytes32' },
          { internalType: 'address', name: 'taker', type: 'address' },
          { internalType: 'address', name: 'maker', type: 'address' },
          { internalType: 'address', name: 'baseToken', type: 'address' },
          { internalType: 'uint256', name: 'baseTokenId', type: 'uint256' },
          { internalType: 'address', name: 'quoteToken', type: 'address' },
          { internalType: 'uint256', name: 'price', type: 'uint256' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'quoteAmount', type: 'uint256' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        internalType: 'struct CLOB.Trade',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPool',
    outputs: [
      {
        components: [
          { internalType: 'bytes32', name: 'id', type: 'bytes32' },
          { internalType: 'address', name: 'baseToken', type: 'address' },
          { internalType: 'uint256', name: 'baseTokenId', type: 'uint256' },
          { internalType: 'address', name: 'quoteToken', type: 'address' },
          { internalType: 'uint256', name: 'baseReserve', type: 'uint256' },
          { internalType: 'uint256', name: 'quoteReserve', type: 'uint256' },
          { internalType: 'uint256', name: 'totalLpTokens', type: 'uint256' },
          { internalType: 'bool', name: 'isActive', type: 'bool' },
        ],
        internalType: 'struct CLOB.LiquidityPool',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
