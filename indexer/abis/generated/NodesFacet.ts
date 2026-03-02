// Auto-generated from NodesFacet.sol - DO NOT EDIT
// Generated at: 2026-03-02T05:05:48.545Z

export const NodesFacetABI = [
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
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
    ],
    name: 'NodeAdminRevoked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
    ],
    name: 'NodeAdminSet',
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
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
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
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    name: 'NodeSellOrderPlaced',
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
        indexed: false,
        internalType: 'string',
        name: 'url',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'title',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'description',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'documentType',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isFrozen',
        type: 'bool',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'addedBy',
        type: 'address',
      },
    ],
    name: 'SupportingDocumentAdded',
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
        name: 'url',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'removedBy',
        type: 'address',
      },
    ],
    name: 'SupportingDocumentRemoved',
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
    inputs: [
      {
        internalType: 'bytes32',
        name: '_nodeHash',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: '_itemOwner',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
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
            internalType: 'struct DiamondStorage.Attribute[]',
            name: 'attributes',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct DiamondStorage.AssetDefinition',
        name: '_asset',
        type: 'tuple',
      },
      {
        internalType: 'string',
        name: '_className',
        type: 'string',
      },
      {
        internalType: 'bytes',
        name: '_data',
        type: 'bytes',
      },
    ],
    name: 'addNodeItem',
    outputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
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
        name: '_nodeHash',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: '_url',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_title',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_description',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_documentType',
        type: 'string',
      },
    ],
    name: 'addSupportingDocument',
    outputs: [
      {
        internalType: 'bool',
        name: 'isFrozen',
        type: 'bool',
      },
    ],
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
    name: 'approveAusysForTokens',
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
    inputs: [
      {
        internalType: 'bytes32',
        name: '_nodeHash',
        type: 'bytes32',
      },
    ],
    name: 'getActiveSupportingDocuments',
    outputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'url',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'title',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'description',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'documentType',
            type: 'string',
          },
          {
            internalType: 'bool',
            name: 'isFrozen',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isRemoved',
            type: 'bool',
          },
          {
            internalType: 'uint256',
            name: 'addedAt',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'removedAt',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'addedBy',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'removedBy',
            type: 'address',
          },
        ],
        internalType: 'struct DiamondStorage.SupportingDocument[]',
        name: 'documents',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
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
    inputs: [],
    name: 'getClobAddress',
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
        internalType: 'bytes32',
        name: '_node',
        type: 'bytes32',
      },
    ],
    name: 'getNodeInventoryWithMetadata',
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
            name: 'balance',
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
        internalType: 'struct NodesFacet.AssetWithBalance[]',
        name: 'assets',
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
    name: 'getNodeSellableAssets',
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
            name: 'balance',
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
        internalType: 'struct NodesFacet.AssetWithBalance[]',
        name: 'assets',
        type: 'tuple[]',
      },
      {
        internalType: 'uint256',
        name: 'count',
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
        name: '_nodeHash',
        type: 'bytes32',
      },
    ],
    name: 'getSupportingDocumentCount',
    outputs: [
      {
        internalType: 'uint256',
        name: 'total',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'active',
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
        name: '_nodeHash',
        type: 'bytes32',
      },
    ],
    name: 'getSupportingDocuments',
    outputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'url',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'title',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'description',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'documentType',
            type: 'string',
          },
          {
            internalType: 'bool',
            name: 'isFrozen',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isRemoved',
            type: 'bool',
          },
          {
            internalType: 'uint256',
            name: 'addedAt',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'removedAt',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'addedBy',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'removedBy',
            type: 'address',
          },
        ],
        internalType: 'struct DiamondStorage.SupportingDocument[]',
        name: 'documents',
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
        name: '',
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
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_admin',
        type: 'address',
      },
    ],
    name: 'isNodeAdmin',
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
        name: '_nodeHash',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_journeyId',
        type: 'bytes32',
      },
    ],
    name: 'nodeHandOn',
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
        internalType: 'bytes32',
        name: '_journeyId',
        type: 'bytes32',
      },
    ],
    name: 'nodeHandoff',
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
        internalType: 'bytes32',
        name: '_journeyId',
        type: 'bytes32',
      },
    ],
    name: 'nodeSign',
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
        internalType: 'address',
        name: '_quoteToken',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_price',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'placeSellOrderFromNode',
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
        internalType: 'bytes32',
        name: '_nodeHash',
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
        name: '_quantityToReduce',
        type: 'uint256',
      },
    ],
    name: 'reduceCapacityForOrder',
    outputs: [],
    stateMutability: 'nonpayable',
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
        name: '_nodeHash',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: '_url',
        type: 'string',
      },
    ],
    name: 'removeSupportingDocument',
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
    name: 'revokeAusysApproval',
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
        name: '_admin',
        type: 'address',
      },
    ],
    name: 'revokeNodeAdmin',
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
        internalType: 'address',
        name: '_clobAddress',
        type: 'address',
      },
    ],
    name: 'setClobAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_admin',
        type: 'address',
      },
    ],
    name: 'setNodeAdmin',
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
] as const;

export const NodesFacetEvents = [
  {
    name: 'ClobApprovalGranted',
    signature: 'ClobApprovalGranted(bytes32,address)',
    signatureHash: '0xd5126df4',
  },
  {
    name: 'ClobApprovalRevoked',
    signature: 'ClobApprovalRevoked(bytes32,address)',
    signatureHash: '0xbdd45b26',
  },
  {
    name: 'Initialized',
    signature: 'Initialized(uint64)',
    signatureHash: '0xc7f505b2',
  },
  {
    name: 'NodeAdminRevoked',
    signature: 'NodeAdminRevoked(address)',
    signatureHash: '0xd75e887b',
  },
  {
    name: 'NodeAdminSet',
    signature: 'NodeAdminSet(address)',
    signatureHash: '0x73fad87b',
  },
  {
    name: 'NodeCapacityUpdated',
    signature: 'NodeCapacityUpdated(bytes32,uint256[])',
    signatureHash: '0x0ba8897d',
  },
  {
    name: 'NodeDeactivated',
    signature: 'NodeDeactivated(bytes32)',
    signatureHash: '0x62b30865',
  },
  {
    name: 'NodeRegistered',
    signature: 'NodeRegistered(bytes32,address,string)',
    signatureHash: '0x8326de45',
  },
  {
    name: 'NodeSellOrderPlaced',
    signature:
      'NodeSellOrderPlaced(bytes32,uint256,address,uint256,uint256,bytes32)',
    signatureHash: '0x3de5f088',
  },
  {
    name: 'NodeUpdated',
    signature: 'NodeUpdated(bytes32,string,uint256)',
    signatureHash: '0x9c97a401',
  },
  {
    name: 'SupportedAssetAdded',
    signature: 'SupportedAssetAdded(bytes32,address,uint256,uint256,uint256)',
    signatureHash: '0x9f0a9fa6',
  },
  {
    name: 'SupportedAssetsUpdated',
    signature: 'SupportedAssetsUpdated(bytes32,uint256)',
    signatureHash: '0x1af735b1',
  },
  {
    name: 'SupportingDocumentAdded',
    signature:
      'SupportingDocumentAdded(bytes32,string,string,string,string,bool,uint256,address)',
    signatureHash: '0xb9819508',
  },
  {
    name: 'SupportingDocumentRemoved',
    signature: 'SupportingDocumentRemoved(bytes32,string,uint256,address)',
    signatureHash: '0x69399cc3',
  },
  {
    name: 'TokensDepositedToNode',
    signature: 'TokensDepositedToNode(bytes32,uint256,uint256,address)',
    signatureHash: '0x9d994707',
  },
  {
    name: 'TokensMintedToNode',
    signature: 'TokensMintedToNode(bytes32,uint256,uint256,address)',
    signatureHash: '0x1177d829',
  },
  {
    name: 'TokensTransferredBetweenNodes',
    signature: 'TokensTransferredBetweenNodes(bytes32,bytes32,uint256,uint256)',
    signatureHash: '0x5cee2a26',
  },
  {
    name: 'TokensWithdrawnFromNode',
    signature: 'TokensWithdrawnFromNode(bytes32,uint256,uint256,address)',
    signatureHash: '0x59947f68',
  },
  {
    name: 'UpdateLocation',
    signature: 'UpdateLocation(string,string,string,bytes32)',
    signatureHash: '0x6d4f5fd0',
  },
  {
    name: 'UpdateOwner',
    signature: 'UpdateOwner(address,bytes32)',
    signatureHash: '0xea9df86c',
  },
  {
    name: 'UpdateStatus',
    signature: 'UpdateStatus(bytes1,bytes32)',
    signatureHash: '0xcf4e8a63',
  },
] as const;
