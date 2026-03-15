/**
 * Auto-generated Diamond ABI for frontend
 *
 * DO NOT EDIT MANUALLY - This file is generated from Hardhat artifacts
 * Run: npm run contract:gen
 *
 * Generated: 2026-03-10T19:30:29.232Z
 * Facets: NodesFacet, AuSysFacet, AuSysAdminFacet, AuSysViewFacet, OrderRouterFacet, CLOBFacetV2, CLOBMatchingFacet, DiamondLoupeFacet, OwnershipFacet, ERC1155ReceiverFacet, OperatorFacet, CLOBLogisticsFacet, AssetsFacet
 * Total items: 286
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DIAMOND_ABI: any[] = [
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
        internalType: 'address',
        name: 'registrar',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'enabled',
        type: 'bool',
      },
    ],
    name: 'NodeRegistrarUpdated',
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
    inputs: [],
    name: 'NODE_REGISTRAR_ROLE',
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
    name: 'getAllowedNodeRegistrars',
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
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'hasNodeRole',
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
        internalType: 'uint256',
        name: 'cap',
        type: 'uint256',
      },
    ],
    name: 'setMaxNodesPerRegistrar',
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
        internalType: 'address',
        name: 'registrar',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'enable',
        type: 'bool',
      },
    ],
    name: 'setNodeRegistrar',
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
    name: 'AuSysAdminRevoked',
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
    name: 'AuSysAdminSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'uint8',
        name: 'newStatus',
        type: 'uint8',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'receiver',
        type: 'address',
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
        name: 'bounty',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'ETA',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'journeyStart',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'journeyEnd',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startName',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endName',
        type: 'string',
      },
    ],
    name: 'AuSysJourneyStatusUpdated',
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
        name: 'buyer',
        type: 'address',
      },
      {
        indexed: true,
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
        name: 'tokenQuantity',
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
        name: 'txFee',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'currentStatus',
        type: 'uint8',
      },
      {
        indexed: false,
        internalType: 'address[]',
        name: 'nodes',
        type: 'address[]',
      },
    ],
    name: 'AuSysOrderCreated',
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
    ],
    name: 'AuSysOrderSettled',
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
        indexed: false,
        internalType: 'uint8',
        name: 'newStatus',
        type: 'uint8',
      },
    ],
    name: 'AuSysOrderStatusUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'driver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'bounty',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'ETA',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startName',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endName',
        type: 'string',
      },
    ],
    name: 'DriverAssigned',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'id',
        type: 'bytes32',
      },
    ],
    name: 'EmitSig',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
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
        name: 'to',
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
        indexed: true,
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'receiver',
        type: 'address',
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
        name: 'refundedAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'bounty',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startName',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endName',
        type: 'string',
      },
    ],
    name: 'JourneyCanceled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'receiver',
        type: 'address',
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
        name: 'bounty',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'ETA',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startName',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endName',
        type: 'string',
      },
    ],
    name: 'JourneyCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint16',
        name: 'oldBps',
        type: 'uint16',
      },
      {
        indexed: false,
        internalType: 'uint16',
        name: 'newBps',
        type: 'uint16',
      },
    ],
    name: 'NodeFeeBpsUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'node',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'NodeFeeDistributed',
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
        indexed: false,
        internalType: 'uint256',
        name: 'oldQuantity',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newQuantity',
        type: 'uint256',
      },
    ],
    name: 'OrderQuantityCorrected',
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
        name: 'acceptor',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isSellerInitiated',
        type: 'bool',
      },
    ],
    name: 'P2POfferAccepted',
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
        name: 'creator',
        type: 'address',
      },
    ],
    name: 'P2POfferCanceled',
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
        name: 'creator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isSellerInitiated',
        type: 'bool',
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
        name: 'tokenQuantity',
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
        internalType: 'address',
        name: 'targetCounterparty',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'expiresAt',
        type: 'uint256',
      },
    ],
    name: 'P2POfferCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'seller',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'SellerPaid',
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
        name: 'buyer',
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
    ],
    name: 'TokenDestinationPending',
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
        indexed: false,
        internalType: 'address',
        name: 'destination',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'nodeId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'burned',
        type: 'bool',
      },
    ],
    name: 'TokenDestinationSelected',
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
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'TreasuryFeeAccrued',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint16',
        name: 'oldBps',
        type: 'uint16',
      },
      {
        indexed: false,
        internalType: 'uint16',
        name: 'newBps',
        type: 'uint16',
      },
    ],
    name: 'TreasuryFeeBpsUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'TreasuryFeeClaimed',
    type: 'event',
  },
  {
    inputs: [],
    name: 'ADMIN_ROLE',
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
    name: 'DISPATCHER_ROLE',
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
    name: 'DRIVER_ROLE',
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
    name: 'MAX_DRIVER_JOURNEYS',
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
    name: 'MAX_JOURNEYS_PER_ORDER',
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
    name: 'MAX_NODES_PER_ORDER',
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
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    name: 'acceptP2POffer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'pickupNodeRef',
        type: 'bytes32',
      },
    ],
    name: 'acceptP2POfferWithPickupNode',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'driver',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
    ],
    name: 'assignDriverToJourney',
    outputs: [],
    stateMutability: 'nonpayable',
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
    name: 'cancelP2POffer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'id',
            type: 'bytes32',
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
            name: 'txFee',
            type: 'uint256',
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
            internalType: 'bytes32[]',
            name: 'journeyIds',
            type: 'bytes32[]',
          },
          {
            internalType: 'address[]',
            name: 'nodes',
            type: 'address[]',
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
            name: 'locationData',
            type: 'tuple',
          },
          {
            internalType: 'uint8',
            name: 'currentStatus',
            type: 'uint8',
          },
          {
            internalType: 'bytes32',
            name: 'contractualAgreement',
            type: 'bytes32',
          },
          {
            internalType: 'bool',
            name: 'isSellerInitiated',
            type: 'bool',
          },
          {
            internalType: 'address',
            name: 'targetCounterparty',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'expiresAt',
            type: 'uint256',
          },
          {
            internalType: 'uint16',
            name: 'snapshotTreasuryBps',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'snapshotNodeBps',
            type: 'uint16',
          },
          {
            internalType: 'bytes32',
            name: 'sellerNode',
            type: 'bytes32',
          },
        ],
        internalType: 'struct DiamondStorage.AuSysOrder',
        name: 'order',
        type: 'tuple',
      },
    ],
    name: 'createAuSysOrder',
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
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'receiver',
        type: 'address',
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
        name: '_data',
        type: 'tuple',
      },
      {
        internalType: 'uint256',
        name: 'bounty',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'ETA',
        type: 'uint256',
      },
    ],
    name: 'createJourney',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'receiver',
        type: 'address',
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
        name: '_data',
        type: 'tuple',
      },
      {
        internalType: 'uint256',
        name: 'bounty',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'ETA',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'tokenQuantity',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'assetId',
        type: 'uint256',
      },
    ],
    name: 'createOrderJourney',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'id',
        type: 'bytes32',
      },
    ],
    name: 'handOff',
    outputs: [
      {
        internalType: 'bool',
        name: '',
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
        name: 'id',
        type: 'bytes32',
      },
    ],
    name: 'handOn',
    outputs: [
      {
        internalType: 'bool',
        name: '',
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
        name: 'id',
        type: 'bytes32',
      },
    ],
    name: 'packageSign',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'maxIterations',
        type: 'uint256',
      },
    ],
    name: 'pruneExpiredOffers',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'nodeId',
        type: 'bytes32',
      },
      {
        internalType: 'bool',
        name: 'burn',
        type: 'bool',
      },
    ],
    name: 'selectTokenDestination',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'canceledBy',
        type: 'address',
      },
    ],
    name: 'JourneyCanceled',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
    ],
    name: 'adminRecoverEscrow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
    ],
    name: 'claimTreasuryFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'correctQuantity',
        type: 'uint256',
      },
    ],
    name: 'correctOrderTokenQuantity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
    ],
    name: 'emergencyCancelJourney',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTreasuryAccrued',
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
    name: 'initAuSysFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
    ],
    name: 'revokeAuSysAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'accepted',
        type: 'bool',
      },
    ],
    name: 'setAcceptedTokenContract',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
    ],
    name: 'setAuSysAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'dispatcher',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'enable',
        type: 'bool',
      },
    ],
    name: 'setDispatcher',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'driver',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'enable',
        type: 'bool',
      },
    ],
    name: 'setDriver',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bool',
        name: 'enabled',
        type: 'bool',
      },
    ],
    name: 'setERC1155WhitelistEnabled',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint16',
        name: 'bps',
        type: 'uint16',
      },
    ],
    name: 'setNodeFeeBps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_payToken',
        type: 'address',
      },
    ],
    name: 'setPayToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint16',
        name: 'bps',
        type: 'uint16',
      },
    ],
    name: 'setTreasuryFeeBps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'signer',
        type: 'address',
      },
    ],
    name: 'setTrustedP2PSigner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'domainSeparator',
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
    name: 'getAllowedDrivers',
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
        name: 'id',
        type: 'bytes32',
      },
    ],
    name: 'getAuSysOrder',
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
            name: 'txFee',
            type: 'uint256',
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
            internalType: 'bytes32[]',
            name: 'journeyIds',
            type: 'bytes32[]',
          },
          {
            internalType: 'address[]',
            name: 'nodes',
            type: 'address[]',
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
            name: 'locationData',
            type: 'tuple',
          },
          {
            internalType: 'uint8',
            name: 'currentStatus',
            type: 'uint8',
          },
          {
            internalType: 'bytes32',
            name: 'contractualAgreement',
            type: 'bytes32',
          },
          {
            internalType: 'bool',
            name: 'isSellerInitiated',
            type: 'bool',
          },
          {
            internalType: 'address',
            name: 'targetCounterparty',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'expiresAt',
            type: 'uint256',
          },
          {
            internalType: 'uint16',
            name: 'snapshotTreasuryBps',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'snapshotNodeBps',
            type: 'uint16',
          },
          {
            internalType: 'bytes32',
            name: 'sellerNode',
            type: 'bytes32',
          },
        ],
        internalType: 'struct DiamondStorage.AuSysOrder',
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
        name: 'driver',
        type: 'address',
      },
    ],
    name: 'getDriverJourneyCount',
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
        name: 'id',
        type: 'bytes32',
      },
    ],
    name: 'getJourney',
    outputs: [
      {
        components: [
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
            name: 'parcelData',
            type: 'tuple',
          },
          {
            internalType: 'bytes32',
            name: 'journeyId',
            type: 'bytes32',
          },
          {
            internalType: 'uint8',
            name: 'currentStatus',
            type: 'uint8',
          },
          {
            internalType: 'address',
            name: 'sender',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'receiver',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'driver',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'journeyStart',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'journeyEnd',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'bounty',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'ETA',
            type: 'uint256',
          },
        ],
        internalType: 'struct DiamondStorage.AuSysJourney',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getOpenP2POffers',
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
    name: 'getPayToken',
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
    name: 'getPendingTokenDestinations',
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
        name: 'user',
        type: 'address',
      },
    ],
    name: 'getUserP2POffers',
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
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'hasAuSysRole',
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
    name: 'CLOBOrderCancelled',
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
        name: 'remainingAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'cumulativeFilled',
        type: 'uint256',
      },
    ],
    name: 'CLOBOrderFilled',
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
        internalType: 'address',
        name: 'taker',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'maker',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'marketId',
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
      {
        indexed: false,
        internalType: 'uint256',
        name: 'takerFee',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'makerFee',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'takerIsBuy',
        type: 'bool',
      },
    ],
    name: 'CLOBTradeExecuted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'marketId',
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
    name: 'MarketCreated',
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
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'expiredAt',
        type: 'uint256',
      },
    ],
    name: 'OrderExpired',
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
    name: 'OrderPlacedWithTokens',
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
    inputs: [
      {
        internalType: 'uint16',
        name: '_takerFeeBps',
        type: 'uint16',
      },
      {
        internalType: 'uint16',
        name: '_makerFeeBps',
        type: 'uint16',
      },
      {
        internalType: 'uint256',
        name: '_defaultPriceChangeThreshold',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_defaultCooldownPeriod',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_emergencyTimelock',
        type: 'uint256',
      },
    ],
    name: 'initializeCLOBV2',
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
    name: 'placeLimitOrder',
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
        internalType: 'uint256',
        name: 'maxSlippageBps',
        type: 'uint256',
      },
    ],
    name: 'placeMarketOrder',
    outputs: [
      {
        internalType: 'uint96',
        name: 'filledAmount',
        type: 'uint96',
      },
      {
        internalType: 'uint256',
        name: 'avgPrice',
        type: 'uint256',
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
    name: 'placeNodeSellOrderV2',
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
        internalType: 'uint16',
        name: 'bps',
        type: 'uint16',
      },
    ],
    name: 'setCLOBLpFeeBps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint16',
        name: 'bps',
        type: 'uint16',
      },
    ],
    name: 'setCLOBMakerFeeBps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint16',
        name: 'bps',
        type: 'uint16',
      },
    ],
    name: 'setCLOBTakerFeeBps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'bestBid',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'bestBidSize',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'bestAsk',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'bestAskSize',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'spread',
        type: 'uint256',
      },
    ],
    name: 'MarketDepthChanged',
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
        name: 'remainingAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'cumulativeFilled',
        type: 'uint256',
      },
    ],
    name: 'MatchingOrderFilled',
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
        internalType: 'address',
        name: 'taker',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'maker',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'marketId',
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
      {
        indexed: false,
        internalType: 'uint256',
        name: 'takerFee',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'makerFee',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'takerIsBuy',
        type: 'bool',
      },
    ],
    name: 'TradeExecuted',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
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
    ],
    name: 'matchOrder',
    outputs: [
      {
        internalType: 'uint256',
        name: 'totalFilled',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: '_selector',
        type: 'bytes4',
      },
    ],
    name: 'facetAddress',
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
    name: 'facetAddresses',
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
        internalType: 'address',
        name: '_facetAddress',
        type: 'address',
      },
    ],
    name: 'facetFunctionSelectors',
    outputs: [
      {
        internalType: 'bytes4[]',
        name: '',
        type: 'bytes4[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'facets',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'facetAddress',
            type: 'address',
          },
          {
            internalType: 'bytes4[]',
            name: 'functionSelectors',
            type: 'bytes4[]',
          },
          {
            internalType: 'uint16[]',
            name: 'selectorIndices',
            type: 'uint16[]',
          },
          {
            internalType: 'string[]',
            name: 'facetURI',
            type: 'string[]',
          },
        ],
        internalType: 'struct IDiamondLoupe.Facet[]',
        name: 'facets_',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: '_selector',
        type: 'bytes4',
      },
    ],
    name: 'selectorToFacetAndPosition',
    outputs: [
      {
        internalType: 'address',
        name: 'facetAddr_',
        type: 'address',
      },
      {
        internalType: 'uint16',
        name: 'selectorPos_',
        type: 'uint16',
      },
    ],
    stateMutability: 'view',
    type: 'function',
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
    name: 'OwnershipTransferStarted',
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
    inputs: [],
    name: 'RENOUNCE_DELAY',
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
    name: 'acceptOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'cancelRenounceOwnership',
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
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
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
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
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
    stateMutability: 'pure',
    type: 'function',
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
      {
        indexed: false,
        internalType: 'uint256',
        name: 'oldReputation',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newReputation',
        type: 'uint256',
      },
    ],
    name: 'OperatorReputationUpdated',
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
        internalType: 'address',
        name: 'collateralToken',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'collateralTokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
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
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'successfulOps',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'totalValueProcessed',
        type: 'uint256',
      },
    ],
    name: 'OperatorStatsUpdated',
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
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'getOperatorReputation',
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
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'getOperatorSuccessfulOps',
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
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'getOperatorTotalValueProcessed',
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
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'newReputation',
        type: 'uint256',
      },
    ],
    name: 'setOperatorReputation',
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
        name: 'driver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'estimatedPickupTime',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'estimatedDeliveryTime',
        type: 'uint256',
      },
    ],
    name: 'DeliveryAccepted',
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
        name: 'driver',
        type: 'address',
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
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'driver',
        type: 'address',
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
    ],
    name: 'DeliveryLocationUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'driver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isAvailable',
        type: 'bool',
      },
    ],
    name: 'DriverAvailabilityUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'driver',
        type: 'address',
      },
    ],
    name: 'DriverDeactivated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'driver',
        type: 'address',
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
    ],
    name: 'DriverLocationUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'driver',
        type: 'address',
      },
    ],
    name: 'DriverRegistered',
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
        indexed: false,
        internalType: 'string',
        name: 'reason',
        type: 'string',
      },
    ],
    name: 'LogisticsOrderCancelled',
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
        name: 'tradeId',
        type: 'bytes32',
      },
      {
        indexed: true,
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
        internalType: 'uint256',
        name: 'quantity',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'driverBounty',
        type: 'uint256',
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
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'reason',
        type: 'string',
      },
    ],
    name: 'LogisticsOrderDisputed',
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
        indexed: false,
        internalType: 'uint256',
        name: 'driverPayout',
        type: 'uint256',
      },
    ],
    name: 'LogisticsOrderSettled',
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
        name: 'driver',
        type: 'address',
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
    ],
    name: 'PickupConfirmed',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'estimatedPickupTime',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'estimatedDeliveryTime',
        type: 'uint256',
      },
    ],
    name: 'acceptDelivery',
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
    name: 'authorizedLogisticsCreators',
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
        name: 'orderId',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: 'reason',
        type: 'string',
      },
    ],
    name: 'cancelLogisticsOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'deadline',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'buyerSignature',
        type: 'bytes',
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
        name: 'location',
        type: 'tuple',
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
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'deadline',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'sellerSignature',
        type: 'bytes',
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
        name: 'location',
        type: 'tuple',
      },
    ],
    name: 'confirmPickup',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'tradeId',
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
        name: 'quantity',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'totalPrice',
        type: 'uint256',
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
        name: 'pickupLocation',
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
        name: 'deliveryLocation',
        type: 'tuple',
      },
    ],
    name: 'createLogisticsOrder',
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
        name: 'driver',
        type: 'address',
      },
    ],
    name: 'deactivateDriver',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: 'reason',
        type: 'string',
      },
    ],
    name: 'disputeOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAllDrivers',
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
    name: 'getAllLogisticsOrders',
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
    name: 'getAvailableDrivers',
    outputs: [
      {
        internalType: 'address[]',
        name: 'drivers',
        type: 'address[]',
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
        name: 'driver',
        type: 'address',
      },
    ],
    name: 'getDriverInfo',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'driver',
            type: 'address',
          },
          {
            internalType: 'bool',
            name: 'isActive',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isAvailable',
            type: 'bool',
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
            name: 'currentLocation',
            type: 'tuple',
          },
          {
            internalType: 'uint256',
            name: 'totalDeliveries',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'completedDeliveries',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'totalEarnings',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'rating',
            type: 'uint256',
          },
        ],
        internalType: 'struct DiamondStorage.DriverInfo',
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
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    name: 'getLogisticsOrder',
    outputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'orderId',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 'tradeId',
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
            name: 'quantity',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'totalPrice',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'escrowedAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'driverBounty',
            type: 'uint256',
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
            name: 'pickupLocation',
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
            name: 'deliveryLocation',
            type: 'tuple',
          },
          {
            internalType: 'uint8',
            name: 'status',
            type: 'uint8',
          },
          {
            internalType: 'address',
            name: 'assignedDriver',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'createdAt',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'deliveredAt',
            type: 'uint256',
          },
        ],
        internalType: 'struct DiamondStorage.LogisticsOrder',
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
        name: 'node',
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
    ],
    name: 'getNodeInventory',
    outputs: [
      {
        internalType: 'uint256',
        name: 'available',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'reserved',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'price',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'registerDriver',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bool',
        name: 'isAvailable',
        type: 'bool',
      },
    ],
    name: 'setDriverAvailability',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'creator',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'authorized',
        type: 'bool',
      },
    ],
    name: 'setLogisticsCreatorAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
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
    name: 'settleLogisticsOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
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
        name: 'location',
        type: 'tuple',
      },
    ],
    name: 'updateDeliveryLocation',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
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
        name: 'location',
        type: 'tuple',
      },
    ],
    name: 'updateDriverLocation',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
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
      {
        indexed: false,
        internalType: 'bool',
        name: 'approved',
        type: 'bool',
      },
    ],
    name: 'ApprovalForAll',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'hash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'attributeIndex',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
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
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'custodian',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'CustodyEstablished',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'custodian',
        type: 'address',
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
        name: 'redeemer',
        type: 'address',
      },
    ],
    name: 'CustodyReleased',
    type: 'event',
  },
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
        internalType: 'bytes32',
        name: 'hash',
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
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
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
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'classNameHash',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'className',
        type: 'string',
      },
    ],
    name: 'SupportedClassAdded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'classNameHash',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'className',
        type: 'string',
      },
    ],
    name: 'SupportedClassRemoved',
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
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
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
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
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
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'string',
        name: 'value',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'URI',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '_name',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_assetClass',
        type: 'string',
      },
      {
        internalType: 'string[]',
        name: '_attributes',
        type: 'string[]',
      },
    ],
    name: 'addAsset',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'assetHash',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '_class',
        type: 'string',
      },
    ],
    name: 'addAssetClass',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
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
        name: 'asset',
        type: 'tuple',
      },
    ],
    name: 'addSupportedAsset',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'className',
        type: 'string',
      },
    ],
    name: 'addSupportedClass',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'balanceOf',
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
        internalType: 'address[]',
        name: 'accounts',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
    ],
    name: 'balanceOfBatch',
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
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'exists',
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
        internalType: 'uint256',
        name: '_id',
        type: 'uint256',
      },
    ],
    name: 'getAsset',
    outputs: [
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
        internalType: 'string[]',
        name: 'attributes',
        type: 'string[]',
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
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_assetHash',
        type: 'bytes32',
      },
    ],
    name: 'getAssetByHash',
    outputs: [
      {
        internalType: 'uint256',
        name: 'id',
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
        name: 'tokenId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'custodian',
        type: 'address',
      },
    ],
    name: 'getCustodyInfo',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amount',
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
        name: 'tokenId',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
    ],
    name: 'getNodeCustodyInfo',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amount',
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
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
    ],
    name: 'getNodeSellableAmount',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amount',
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
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'getOwnerNodeSellableBalances',
    outputs: [
      {
        internalType: 'bytes32[]',
        name: 'nodeHashes',
        type: 'bytes32[]',
      },
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getSupportedAssets',
    outputs: [
      {
        internalType: 'string[]',
        name: '',
        type: 'string[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getSupportedClasses',
    outputs: [
      {
        internalType: 'string[]',
        name: '',
        type: 'string[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalAssets',
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
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'getTotalCustodyAmount',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amount',
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
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'isApprovedForAll',
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
        internalType: 'string',
        name: 'className',
        type: 'string',
      },
    ],
    name: 'isClassActive',
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
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'isInCustody',
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
        name: 'asset',
        type: 'tuple',
      },
    ],
    name: 'lookupHash',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
      {
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'mintBatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
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
        name: 'asset',
        type: 'tuple',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'className',
        type: 'string',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'nodeMint',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'hash',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'tokenID',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
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
        name: 'asset',
        type: 'tuple',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'className',
        type: 'string',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
      {
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
    ],
    name: 'nodeMintForNode',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'hash',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'tokenID',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
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
      {
        internalType: 'address',
        name: 'custodian',
        type: 'address',
      },
    ],
    name: 'redeem',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
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
      {
        internalType: 'address',
        name: 'custodian',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'nodeHash',
        type: 'bytes32',
      },
    ],
    name: 'redeemFromNode',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
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
        name: 'asset',
        type: 'tuple',
      },
    ],
    name: 'removeSupportedAsset',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'className',
        type: 'string',
      },
    ],
    name: 'removeSupportedClass',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'safeBatchTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'safeTransferFrom',
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
      {
        internalType: 'bool',
        name: 'approved',
        type: 'bool',
      },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'newuri',
        type: 'string',
      },
    ],
    name: 'setURI',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'totalSupply',
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
    name: 'uri',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];
