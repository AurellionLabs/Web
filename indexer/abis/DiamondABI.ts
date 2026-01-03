export const DiamondABI = [
  // DiamondCutFacet events and functions
  {
    anonymous: false,
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'facetAddress',
            type: 'address',
          },
          {
            internalType: 'enum IDiamondCut.FacetCutAction',
            name: 'action',
            type: 'uint8',
          },
          {
            internalType: 'bytes4[]',
            name: 'functionSelectors',
            type: 'bytes4[]',
          },
        ],
        indexed: false,
        name: '_diamondCut',
        type: 'tuple[]',
      },
      {
        indexed: false,
        internalType: 'address',
        name: '_init',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: '_calldata',
        type: 'bytes',
      },
    ],
    name: 'DiamondCut',
    type: 'event',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'facetAddress',
            type: 'address',
          },
          {
            internalType: 'enum IDiamondCut.FacetCutAction',
            name: 'action',
            type: 'uint8',
          },
          {
            internalType: 'bytes4[]',
            name: 'functionSelectors',
            type: 'bytes4[]',
          },
        ],
        name: '_diamondCut',
        type: 'tuple[]',
      },
      {
        internalType: 'address',
        name: '_init',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: '_calldata',
        type: 'bytes',
      },
    ],
    name: 'diamondCut',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // DiamondLoupeFacet functions
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
        internalType: 'address',
        name: '_facet',
        type: 'address',
      },
    ],
    name: 'facetFunctionSelectors',
    outputs: [
      {
        internalType: 'bytes4[]',
        name: 'selectors_',
        type: 'bytes4[]',
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
        name: 'facetAddresses_',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: '_functionSelector',
        type: 'bytes4',
      },
    ],
    name: 'facetAddress',
    outputs: [
      {
        internalType: 'address',
        name: 'facetAddress_',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  // OwnershipFacet events and functions
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
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: 'owner_',
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
        name: '_newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // NodesFacet events and functions
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
    ],
    name: 'NodeDeactivated',
    type: 'event',
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
        internalType: 'bytes32',
        name: 'assetHash',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  // AssetsFacet events and functions
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'string',
        name: 'assetClass',
        type: 'string',
      },
    ],
    name: 'AssetClassAdded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'assetHash',
        type: 'bytes32',
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
    ],
    name: 'AssetAdded',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '_class',
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
        name: '_attributes',
        type: 'tuple[]',
      },
    ],
    name: 'addSupportedAsset',
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

  // OrdersFacet events and functions
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderHash',
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
    name: 'OrderCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    name: 'OrderFulfilled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    name: 'OrderCancelled',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_orderHash',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: '_seller',
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
    name: 'createOrder',
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
        name: '_orderHash',
        type: 'bytes32',
      },
    ],
    name: 'fulfillOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_orderHash',
        type: 'bytes32',
      },
    ],
    name: 'cancelOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // StakingFacet events
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
    name: 'Staked',
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
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'remainingStaked',
        type: 'uint256',
      },
    ],
    name: 'Unstaked',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_amount',
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
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'unstake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // BridgeFacet events and functions
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
        internalType: 'bytes32',
        name: 'clobOrderId',
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
    ],
    name: 'UnifiedOrderCreated',
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
    name: 'OrderBridged',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_clobOrderId',
        type: 'bytes32',
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
      {
        components: [
          {
            internalType: 'int256',
            name: 'lat',
            type: 'int256',
          },
          {
            internalType: 'int256',
            name: 'lng',
            type: 'int256',
          },
        ],
        name: '_startLocation',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'int256',
            name: 'lat',
            type: 'int256',
          },
          {
            internalType: 'int256',
            name: 'lng',
            type: 'int256',
          },
        ],
        name: '_endLocation',
        type: 'tuple',
      },
    ],
    name: 'createUnifiedOrder',
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
        name: '_orderId',
        type: 'bytes32',
      },
    ],
    name: 'bridgeOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // CLOBFacet events and functions
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
        name: 'trader',
        type: 'address',
      },
      {
        indexed: true,
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
        internalType: 'bool',
        name: 'isBuy',
        type: 'bool',
      },
    ],
    name: 'OrderPlaced',
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
    name: 'OrderCancelled',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_marketId',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: '_baseToken',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_quoteToken',
        type: 'string',
      },
    ],
    name: 'createMarket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_marketId',
        type: 'bytes32',
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
      {
        internalType: 'bool',
        name: '_isBuy',
        type: 'bool',
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
        internalType: 'bytes32',
        name: '_orderId',
        type: 'bytes32',
      },
    ],
    name: 'cancelOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
