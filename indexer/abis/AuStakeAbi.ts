// AuStake Contract ABI - Events for indexing
export const AuStakeAbi = [
  // OperationCreated event
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'operationId',
        type: 'bytes32',
      },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
      {
        indexed: false,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
    ],
    name: 'OperationCreated',
    type: 'event',
  },
  // Staked event
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'operationId',
        type: 'bytes32',
      },
      { indexed: false, internalType: 'string', name: 'eType', type: 'string' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'time',
        type: 'uint256',
      },
    ],
    name: 'Staked',
    type: 'event',
  },
  // Unstaked event
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'operationId',
        type: 'bytes32',
      },
      { indexed: false, internalType: 'string', name: 'eType', type: 'string' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'time',
        type: 'uint256',
      },
    ],
    name: 'Unstaked',
    type: 'event',
  },
  // RewardPaid event
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'operationId',
        type: 'bytes32',
      },
    ],
    name: 'RewardPaid',
    type: 'event',
  },
  // AdminStatusChanged event
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
      { indexed: false, internalType: 'bool', name: 'status', type: 'bool' },
    ],
    name: 'AdminStatusChanged',
    type: 'event',
  },
  // Read functions
  {
    inputs: [{ internalType: 'bytes32', name: 'operationId', type: 'bytes32' }],
    name: 'getOperation',
    outputs: [
      {
        components: [
          { internalType: 'string', name: 'name', type: 'string' },
          { internalType: 'string', name: 'description', type: 'string' },
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'address', name: 'provider', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'startDate', type: 'uint256' },
          { internalType: 'string', name: 'rwaName', type: 'string' },
          { internalType: 'uint256', name: 'reward', type: 'uint256' },
          { internalType: 'uint256', name: 'tokenTvl', type: 'uint256' },
          { internalType: 'uint8', name: 'operationStatus', type: 'uint8' },
          { internalType: 'uint256', name: 'fundingGoal', type: 'uint256' },
          { internalType: 'uint256', name: 'assetPrice', type: 'uint256' },
        ],
        internalType: 'struct AuStake.Operation',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
