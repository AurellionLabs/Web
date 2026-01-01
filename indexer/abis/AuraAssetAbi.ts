// AuraAsset Contract ABI - Events for indexing
export const AuraAssetAbi = [
  // MintedAsset event
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      { indexed: true, internalType: 'bytes32', name: 'hash', type: 'bytes32' },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
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
  // AssetAttributeAdded event
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'hash', type: 'bytes32' },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'attributeIndex',
        type: 'uint256',
      },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
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
  // TransferSingle event (ERC1155)
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'id', type: 'uint256' },
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
  // TransferBatch event (ERC1155)
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
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
  // ApprovalForAll event (ERC1155)
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
      { indexed: false, internalType: 'bool', name: 'approved', type: 'bool' },
    ],
    name: 'ApprovalForAll',
    type: 'event',
  },
  // Read functions
  {
    inputs: [{ internalType: 'bytes32', name: 'hash', type: 'bytes32' }],
    name: 'hashToAsset',
    outputs: [
      {
        components: [
          { internalType: 'string', name: 'name', type: 'string' },
          { internalType: 'string', name: 'assetClass', type: 'string' },
          { internalType: 'string', name: 'className', type: 'string' },
          {
            components: [
              { internalType: 'string', name: 'name', type: 'string' },
              { internalType: 'string[]', name: 'values', type: 'string[]' },
              { internalType: 'string', name: 'description', type: 'string' },
            ],
            internalType: 'struct AuraAsset.AssetAttribute[]',
            name: 'attributes',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct AuraAsset.Asset',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
