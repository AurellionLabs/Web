// AurumNodeManager Contract ABI - Events for indexing
export const AurumNodeManagerAbi = [
  // NodeRegistered event
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'nodeAddress',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'NodeRegistered',
    type: 'event',
  },
  // NodeCapacityUpdated event
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'node', type: 'address' },
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
  // SupportedAssetAdded event
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'node', type: 'address' },
      {
        indexed: false,
        internalType: 'tuple',
        name: 'asset',
        type: 'tuple',
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'uint256', name: 'price', type: 'uint256' },
          { internalType: 'uint256', name: 'capacity', type: 'uint256' },
        ],
      },
    ],
    name: 'SupportedAssetAdded',
    type: 'event',
  },
  // SupportedAssetsUpdated event
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'node', type: 'address' },
      {
        indexed: false,
        internalType: 'tuple[]',
        name: 'supportedAssets',
        type: 'tuple[]',
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'uint256', name: 'price', type: 'uint256' },
          { internalType: 'uint256', name: 'capacity', type: 'uint256' },
        ],
      },
    ],
    name: 'SupportedAssetsUpdated',
    type: 'event',
  },
  // eventUpdateLocation event
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'string',
        name: 'addressName',
        type: 'string',
      },
      { indexed: false, internalType: 'string', name: 'lat', type: 'string' },
      { indexed: false, internalType: 'string', name: 'lng', type: 'string' },
      {
        indexed: false,
        internalType: 'address',
        name: 'node',
        type: 'address',
      },
    ],
    name: 'eventUpdateLocation',
    type: 'event',
  },
  // eventUpdateOwner event
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'node',
        type: 'address',
      },
    ],
    name: 'eventUpdateOwner',
    type: 'event',
  },
  // eventUpdateStatus event
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes1',
        name: 'status',
        type: 'bytes1',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'node',
        type: 'address',
      },
    ],
    name: 'eventUpdateStatus',
    type: 'event',
  },
  // Read functions for contract calls
  {
    inputs: [{ internalType: 'address', name: 'nodeAddress', type: 'address' }],
    name: 'getNode',
    outputs: [
      {
        components: [
          {
            components: [
              { internalType: 'string', name: 'addressName', type: 'string' },
              {
                components: [
                  { internalType: 'string', name: 'lat', type: 'string' },
                  { internalType: 'string', name: 'lng', type: 'string' },
                ],
                internalType: 'struct AurumNodeManager.Location',
                name: 'location',
                type: 'tuple',
              },
            ],
            internalType: 'struct AurumNodeManager.NodeLocationData',
            name: 'location',
            type: 'tuple',
          },
          { internalType: 'bytes1', name: 'validNode', type: 'bytes1' },
          { internalType: 'address', name: 'owner', type: 'address' },
          {
            components: [
              { internalType: 'address', name: 'token', type: 'address' },
              { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
              { internalType: 'uint256', name: 'price', type: 'uint256' },
              { internalType: 'uint256', name: 'capacity', type: 'uint256' },
            ],
            internalType: 'struct AurumNodeManager.Asset[]',
            name: 'supportedAssets',
            type: 'tuple[]',
          },
          { internalType: 'bytes1', name: 'status', type: 'bytes1' },
        ],
        internalType: 'struct AurumNodeManager.Node',
        name: 'node',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
