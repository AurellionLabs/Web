// Auto-generated from CLOBMEVFacet.sol - DO NOT EDIT
// Generated at: 2026-03-03T07:50:03.651Z

export const CLOBMEVFacetABI = [
  {
    inputs: [],
    name: 'CircuitBreakerTrippedError',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CommitmentAlreadyRevealed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CommitmentNotFound',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidAmount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidCommitment',
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
    name: 'NotOrderMaker',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OrderExpiredError',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
    type: 'error',
  },
  {
    inputs: [],
    name: 'RevealTooEarly',
    type: 'error',
  },
  {
    inputs: [],
    name: 'RevealTooLate',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'commitmentId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'committer',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'commitBlock',
        type: 'uint256',
      },
    ],
    name: 'OrderCommitted',
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
    name: 'OrderCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'commitmentId',
        type: 'bytes32',
      },
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
    ],
    name: 'OrderRevealed',
    type: 'event',
  },
  {
    inputs: [],
    name: 'BASIS_POINTS',
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
    name: 'MAX_REVEAL_DELAY',
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
        name: 'commitment',
        type: 'bytes32',
      },
    ],
    name: 'commitOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCommitmentThreshold',
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
    stateMutability: 'pure',
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
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'quoteAmount',
        type: 'uint256',
      },
    ],
    name: 'requiresCommitReveal',
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
        name: 'commitmentId',
        type: 'bytes32',
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
      {
        internalType: 'bytes32',
        name: 'salt',
        type: 'bytes32',
      },
    ],
    name: 'revealOrder',
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

export const CLOBMEVFacetEvents = [
  {
    name: 'OrderCommitted',
    signature: 'OrderCommitted(bytes32,address,uint256)',
    signatureHash: '0x25cd9c95',
  },
  {
    name: 'OrderCreated',
    signature:
      'OrderCreated(bytes32,bytes32,address,uint256,uint256,bool,uint8,uint8,uint256,uint256)',
    signatureHash: '0x43fe20c0',
  },
  {
    name: 'OrderRevealed',
    signature: 'OrderRevealed(bytes32,bytes32,address)',
    signatureHash: '0x73609089',
  },
] as const;
