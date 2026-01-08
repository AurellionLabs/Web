// Diamond ABI - Combined from all Diamond facets
// This ABI includes all events and functions for the Diamond proxy

export const DiamondABI = [
  // ======= DiamondCutFacet =======
  {
    anonymous: false,
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'facetAddress', type: 'address' },
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
          { internalType: 'address', name: 'facetAddress', type: 'address' },
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
      { internalType: 'address', name: '_init', type: 'address' },
      { internalType: 'bytes', name: '_calldata', type: 'bytes' },
    ],
    name: 'diamondCut',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ======= OwnershipFacet =======
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
    outputs: [{ internalType: 'address', name: 'owner_', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
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
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ======= NodesFacet Events =======
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
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'string',
        name: 'addressName',
        type: 'string',
      },
      { indexed: false, internalType: 'string', name: 'lat', type: 'string' },
      { indexed: false, internalType: 'string', name: 'lng', type: 'string' },
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
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
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
    ],
    name: 'UpdateOwner',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes1', name: 'status', type: 'bytes1' },
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
    ],
    name: 'UpdateStatus',
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
        indexed: true,
        internalType: 'address',
        name: 'clobAddress',
        type: 'address',
      },
    ],
    name: 'ClobApprovalGranted',
    type: 'event',
  },
  // Node token inventory events
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
        internalType: 'address',
        name: 'clobAddress',
        type: 'address',
      },
    ],
    name: 'ClobApprovalRevoked',
    type: 'event',
  },
  // NodeSellOrderPlaced - emitted when a node places a sell order
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

  // ======= NodesFacet Functions =======
  {
    inputs: [
      { internalType: 'string', name: '_nodeType', type: 'string' },
      { internalType: 'uint256', name: '_capacity', type: 'uint256' },
      { internalType: 'bytes32', name: '_assetHash', type: 'bytes32' },
      { internalType: 'string', name: '_addressName', type: 'string' },
      { internalType: 'string', name: '_lat', type: 'string' },
      { internalType: 'string', name: '_lng', type: 'string' },
    ],
    name: 'registerNode',
    outputs: [{ internalType: 'bytes32', name: 'nodeHash', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_nodeHash', type: 'bytes32' },
      { internalType: 'string', name: '_nodeType', type: 'string' },
      { internalType: 'uint256', name: '_capacity', type: 'uint256' },
    ],
    name: 'updateNode',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_nodeHash', type: 'bytes32' }],
    name: 'deactivateNode',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: '_addressName', type: 'string' },
      { internalType: 'string', name: '_lat', type: 'string' },
      { internalType: 'string', name: '_lng', type: 'string' },
      { internalType: 'bytes32', name: '_node', type: 'bytes32' },
    ],
    name: 'updateNodeLocation',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_owner', type: 'address' },
      { internalType: 'bytes32', name: '_node', type: 'bytes32' },
    ],
    name: 'updateNodeOwner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes1', name: '_status', type: 'bytes1' },
      { internalType: 'bytes32', name: '_node', type: 'bytes32' },
    ],
    name: 'updateNodeStatus',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_node', type: 'bytes32' },
      { internalType: 'uint256[]', name: '_quantities', type: 'uint256[]' },
    ],
    name: 'updateNodeCapacity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_node', type: 'bytes32' },
      { internalType: 'address', name: '_token', type: 'address' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
      { internalType: 'uint256', name: '_price', type: 'uint256' },
      { internalType: 'uint256', name: '_capacity', type: 'uint256' },
    ],
    name: 'addSupportedAsset',
    outputs: [{ internalType: 'uint256', name: 'assetId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_node', type: 'bytes32' },
      { internalType: 'address[]', name: '_tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: '_tokenIds', type: 'uint256[]' },
      { internalType: 'uint256[]', name: '_prices', type: 'uint256[]' },
      { internalType: 'uint256[]', name: '_capacities', type: 'uint256[]' },
    ],
    name: 'updateSupportedAssets',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_nodeHash', type: 'bytes32' }],
    name: 'getNode',
    outputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'string', name: 'nodeType', type: 'string' },
      { internalType: 'uint256', name: 'capacity', type: 'uint256' },
      { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
      { internalType: 'bool', name: 'active', type: 'bool' },
      { internalType: 'bool', name: 'validNode', type: 'bool' },
      { internalType: 'bytes32', name: 'assetHash', type: 'bytes32' },
      { internalType: 'string', name: 'addressName', type: 'string' },
      { internalType: 'string', name: 'lat', type: 'string' },
      { internalType: 'string', name: 'lng', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
    name: 'getOwnerNodes',
    outputs: [{ internalType: 'bytes32[]', name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_node', type: 'bytes32' }],
    name: 'getTotalNodes',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_node', type: 'bytes32' }],
    name: 'getNodeAssets',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'uint256', name: 'price', type: 'uint256' },
          { internalType: 'uint256', name: 'capacity', type: 'uint256' },
          { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
          { internalType: 'bool', name: 'active', type: 'bool' },
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
    inputs: [{ internalType: 'address', name: '_node', type: 'address' }],
    name: 'getNodeStatus',
    outputs: [{ internalType: 'bytes1', name: '', type: 'bytes1' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_node', type: 'bytes32' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    name: 'creditNodeTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Deposit tokens from user wallet to node inventory
  {
    inputs: [
      { internalType: 'bytes32', name: '_node', type: 'bytes32' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    name: 'depositTokensToNode',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Withdraw tokens from node inventory to user wallet
  {
    inputs: [
      { internalType: 'bytes32', name: '_node', type: 'bytes32' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    name: 'withdrawTokensFromNode',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Get full node inventory (all tokenIds and balances)
  {
    inputs: [{ internalType: 'bytes32', name: '_node', type: 'bytes32' }],
    name: 'getNodeInventory',
    outputs: [
      { internalType: 'uint256[]', name: 'tokenIds', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_node', type: 'bytes32' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
    ],
    name: 'getNodeTokenBalance',
    outputs: [{ internalType: 'uint256', name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_node', type: 'bytes32' },
      { internalType: 'address', name: '_clobAddress', type: 'address' },
    ],
    name: 'approveClobForTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_node', type: 'bytes32' },
      { internalType: 'address', name: '_clobAddress', type: 'address' },
    ],
    name: 'revokeClobApproval',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_clobAddress', type: 'address' },
    ],
    name: 'isClobApproved',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // AuraAsset address management
  {
    inputs: [{ internalType: 'address', name: '_auraAsset', type: 'address' }],
    name: 'setAuraAssetAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAuraAssetAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // CLOB address management
  {
    inputs: [
      { internalType: 'address', name: '_clobAddress', type: 'address' },
    ],
    name: 'setClobAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getClobAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Place sell order from node inventory
  {
    inputs: [
      { internalType: 'bytes32', name: '_node', type: 'bytes32' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
      { internalType: 'address', name: '_quoteToken', type: 'address' },
      { internalType: 'uint256', name: '_price', type: 'uint256' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    name: 'placeSellOrderFromNode',
    outputs: [{ internalType: 'bytes32', name: 'orderId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Event for node sell order placement
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

  // ======= AssetsFacet Events =======
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
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
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

  // ======= AssetsFacet Functions =======
  {
    inputs: [{ internalType: 'string', name: '_class', type: 'string' }],
    name: 'addAssetClass',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: '_name', type: 'string' },
      { internalType: 'string', name: '_assetClass', type: 'string' },
      { internalType: 'string[]', name: '_attributes', type: 'string[]' },
    ],
    name: 'addAsset',
    outputs: [{ internalType: 'bytes32', name: 'assetHash', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_id', type: 'uint256' }],
    name: 'getAsset',
    outputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'assetClass', type: 'string' },
      { internalType: 'string[]', name: 'attributes', type: 'string[]' },
      { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
      { internalType: 'bool', name: 'active', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_assetHash', type: 'bytes32' }],
    name: 'getAssetByHash',
    outputs: [{ internalType: 'uint256', name: 'id', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ======= OrdersFacet Events =======
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
        indexed: true,
        internalType: 'address',
        name: 'seller',
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
      {
        indexed: false,
        internalType: 'string',
        name: 'status',
        type: 'string',
      },
    ],
    name: 'OrderUpdated',
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
      {
        indexed: true,
        internalType: 'address',
        name: 'buyer',
        type: 'address',
      },
    ],
    name: 'OrderCancelled',
    type: 'event',
  },

  // ======= OrdersFacet Functions =======
  {
    inputs: [
      { internalType: 'address', name: '_buyer', type: 'address' },
      { internalType: 'address', name: '_seller', type: 'address' },
      { internalType: 'uint256', name: '_price', type: 'uint256' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
      { internalType: 'string', name: '_status', type: 'string' },
    ],
    name: 'createOrder',
    outputs: [{ internalType: 'bytes32', name: 'orderHash', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_orderHash', type: 'bytes32' },
      { internalType: 'string', name: '_status', type: 'string' },
    ],
    name: 'updateOrderStatus',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_orderHash', type: 'bytes32' }],
    name: 'cancelOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_orderHash', type: 'bytes32' }],
    name: 'getOrder',
    outputs: [
      { internalType: 'address', name: 'buyer', type: 'address' },
      { internalType: 'address', name: 'seller', type: 'address' },
      { internalType: 'uint256', name: 'price', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'string', name: 'status', type: 'string' },
      { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalOrders',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ======= StakingFacet Events =======
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
    ],
    name: 'Staked',
    type: 'event',
  },
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
    ],
    name: 'Withdrawn',
    type: 'event',
  },
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
    ],
    name: 'RewardsClaimed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'oldRate',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newRate',
        type: 'uint256',
      },
    ],
    name: 'RewardRateUpdated',
    type: 'event',
  },

  // ======= StakingFacet Functions =======
  {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'stake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimRewards',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getStake',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'earnedRewards', type: 'uint256' },
      { internalType: 'uint256', name: 'stakedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalStaked',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_newRate', type: 'uint256' }],
    name: 'setRewardRate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ======= BridgeFacet Events =======
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
        indexed: true,
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
      { indexed: false, internalType: 'uint8', name: 'phase', type: 'uint8' },
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
        internalType: 'uint8',
        name: 'previousStatus',
        type: 'uint8',
      },
    ],
    name: 'OrderCancelled',
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
    name: 'FeeRecipientUpdated',
    type: 'event',
  },

  // ======= BridgeFacet Functions =======
  {
    inputs: [
      { internalType: 'bytes32', name: '_clobOrderId', type: 'bytes32' },
      { internalType: 'address', name: '_sellerNode', type: 'address' },
      { internalType: 'uint256', name: '_price', type: 'uint256' },
      { internalType: 'uint256', name: '_quantity', type: 'uint256' },
    ],
    name: 'createUnifiedOrder',
    outputs: [
      { internalType: 'bytes32', name: 'unifiedOrderId', type: 'bytes32' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_unifiedOrderId', type: 'bytes32' },
      { internalType: 'bytes32', name: '_clobTradeId', type: 'bytes32' },
      { internalType: 'bytes32', name: '_ausysOrderId', type: 'bytes32' },
      { internalType: 'address', name: '_seller', type: 'address' },
      { internalType: 'address', name: '_token', type: 'address' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
    ],
    name: 'bridgeTradeToLogistics',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_unifiedOrderId', type: 'bytes32' },
    ],
    name: 'createLogisticsOrder',
    outputs: [{ internalType: 'bytes32', name: 'journeyId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_unifiedOrderId', type: 'bytes32' },
      { internalType: 'address', name: '_driver', type: 'address' },
    ],
    name: 'assignDriver',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_journeyId', type: 'bytes32' },
      { internalType: 'uint8', name: '_phase', type: 'uint8' },
    ],
    name: 'updateJourneyStatus',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_unifiedOrderId', type: 'bytes32' },
    ],
    name: 'settleOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_unifiedOrderId', type: 'bytes32' },
    ],
    name: 'cancelUnifiedOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_orderId', type: 'bytes32' }],
    name: 'getUnifiedOrder',
    outputs: [
      { internalType: 'bytes32', name: 'clobOrderId', type: 'bytes32' },
      { internalType: 'bytes32', name: 'clobTradeId', type: 'bytes32' },
      { internalType: 'bytes32', name: 'ausysOrderId', type: 'bytes32' },
      { internalType: 'address', name: 'buyer', type: 'address' },
      { internalType: 'address', name: 'seller', type: 'address' },
      { internalType: 'address', name: 'sellerNode', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'tokenQuantity', type: 'uint256' },
      { internalType: 'uint256', name: 'price', type: 'uint256' },
      { internalType: 'uint256', name: 'bounty', type: 'uint256' },
      { internalType: 'string', name: 'status', type: 'string' },
      { internalType: 'uint8', name: 'logisticsStatus', type: 'uint8' },
      { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
      { internalType: 'uint256', name: 'matchedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'deliveredAt', type: 'uint256' },
      { internalType: 'uint256', name: 'settledAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalUnifiedOrders',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_newRecipient', type: 'address' },
    ],
    name: 'setFeeRecipient',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ======= CLOBFacet Events =======
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
  // OrderPlacedWithTokens - Token-based event for indexer (matches standalone CLOB format)
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
    name: 'OrderPlacedWithTokens',
    type: 'event',
  },
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
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'TradeExecuted',
    type: 'event',
  },
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

  // ======= CLOBFacet Functions =======
  {
    inputs: [
      { internalType: 'string', name: '_baseToken', type: 'string' },
      { internalType: 'uint256', name: '_baseTokenId', type: 'uint256' },
      { internalType: 'string', name: '_quoteToken', type: 'string' },
    ],
    name: 'createMarket',
    outputs: [{ internalType: 'bytes32', name: 'marketId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_marketId', type: 'bytes32' },
      { internalType: 'uint256', name: '_price', type: 'uint256' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
      { internalType: 'bool', name: '_isBuy', type: 'bool' },
      { internalType: 'uint8', name: '_orderType', type: 'uint8' },
    ],
    name: 'placeOrder',
    outputs: [{ internalType: 'bytes32', name: 'orderId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_orderId', type: 'bytes32' }],
    name: 'cancelOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: '_baseToken', type: 'string' },
      { internalType: 'uint256', name: '_baseTokenId', type: 'uint256' },
      { internalType: 'string', name: '_quoteToken', type: 'string' },
      { internalType: 'uint256', name: '_baseAmount', type: 'uint256' },
      { internalType: 'uint256', name: '_quoteAmount', type: 'uint256' },
    ],
    name: 'createPool',
    outputs: [
      { internalType: 'bytes32', name: 'poolId', type: 'bytes32' },
      { internalType: 'uint256', name: 'lpTokens', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_poolId', type: 'bytes32' },
      { internalType: 'uint256', name: '_baseAmount', type: 'uint256' },
      { internalType: 'uint256', name: '_quoteAmount', type: 'uint256' },
    ],
    name: 'addLiquidity',
    outputs: [{ internalType: 'uint256', name: 'lpTokens', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_poolId', type: 'bytes32' },
      { internalType: 'uint256', name: '_lpTokens', type: 'uint256' },
    ],
    name: 'removeLiquidity',
    outputs: [
      { internalType: 'uint256', name: 'baseAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'quoteAmount', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_orderId', type: 'bytes32' }],
    name: 'getOrder',
    outputs: [
      { internalType: 'address', name: 'maker', type: 'address' },
      { internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
      { internalType: 'uint256', name: 'price', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'filledAmount', type: 'uint256' },
      { internalType: 'bool', name: 'isBuy', type: 'bool' },
      { internalType: 'uint8', name: 'orderType', type: 'uint8' },
      { internalType: 'uint8', name: 'status', type: 'uint8' },
      { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_tradeId', type: 'bytes32' }],
    name: 'getTrade',
    outputs: [
      { internalType: 'bytes32', name: 'takerOrderId', type: 'bytes32' },
      { internalType: 'bytes32', name: 'makerOrderId', type: 'bytes32' },
      { internalType: 'address', name: 'taker', type: 'address' },
      { internalType: 'address', name: 'maker', type: 'address' },
      { internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
      { internalType: 'uint256', name: 'price', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'quoteAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_poolId', type: 'bytes32' }],
    name: 'getPool',
    outputs: [
      { internalType: 'string', name: 'baseToken', type: 'string' },
      { internalType: 'uint256', name: 'baseTokenId', type: 'uint256' },
      { internalType: 'string', name: 'quoteToken', type: 'string' },
      { internalType: 'uint256', name: 'baseReserve', type: 'uint256' },
      { internalType: 'uint256', name: 'quoteReserve', type: 'uint256' },
      { internalType: 'uint256', name: 'totalLpTokens', type: 'uint256' },
      { internalType: 'bool', name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_marketId', type: 'bytes32' }],
    name: 'getMarket',
    outputs: [
      { internalType: 'string', name: 'baseToken', type: 'string' },
      { internalType: 'uint256', name: 'baseTokenId', type: 'uint256' },
      { internalType: 'string', name: 'quoteToken', type: 'string' },
      { internalType: 'bool', name: 'active', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalMarkets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalTrades',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ======= CLOBFacetV2 Events - Production CLOB =======
  // OrderCreated - V2 with full details including timeInForce and expiry
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
      { indexed: false, internalType: 'bool', name: 'isBuy', type: 'bool' },
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
  // OrderFilled - V2 with cumulative fill tracking
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
    name: 'OrderFilled',
    type: 'event',
  },
  // OrderExpired - V2 for GTD orders
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
  // TradeExecuted V2 - with fees and takerIsBuy
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
    name: 'TradeExecutedV2',
    type: 'event',
  },
  // OrderRouterFacet Events - tracks which entry point was used
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
  // MEV Protection Events
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
  // Circuit Breaker Events
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
        name: 'triggerPrice',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'previousPrice',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'changePercent',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'cooldownUntil',
        type: 'uint256',
      },
    ],
    name: 'CircuitBreakerTripped',
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
        indexed: false,
        internalType: 'uint256',
        name: 'resetAt',
        type: 'uint256',
      },
    ],
    name: 'CircuitBreakerReset',
    type: 'event',
  },
  // Market Depth Event
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
  // Emergency Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
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
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'EmergencyWithdrawal',
    type: 'event',
  },
  // Market Created V2
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
  // Admin Events
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
        name: 'priceChangeThreshold',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'cooldownPeriod',
        type: 'uint256',
      },
      { indexed: false, internalType: 'bool', name: 'isEnabled', type: 'bool' },
    ],
    name: 'CircuitBreakerConfigured',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint16',
        name: 'takerFeeBps',
        type: 'uint16',
      },
      {
        indexed: false,
        internalType: 'uint16',
        name: 'makerFeeBps',
        type: 'uint16',
      },
      {
        indexed: false,
        internalType: 'uint16',
        name: 'lpFeeBps',
        type: 'uint16',
      },
    ],
    name: 'FeesUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'maxOrdersPerBlock',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'maxVolumePerBlock',
        type: 'uint256',
      },
    ],
    name: 'RateLimitsUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint8',
        name: 'minRevealDelay',
        type: 'uint8',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'commitmentThreshold',
        type: 'uint256',
      },
    ],
    name: 'MEVProtectionUpdated',
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
    ],
    name: 'MarketPaused',
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
    ],
    name: 'MarketUnpaused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bool', name: 'paused', type: 'bool' },
    ],
    name: 'GlobalPause',
    type: 'event',
  },

  // ======= CLOBFacetV2 Functions =======
  {
    inputs: [
      { internalType: 'uint16', name: '_takerFeeBps', type: 'uint16' },
      { internalType: 'uint16', name: '_makerFeeBps', type: 'uint16' },
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
      { internalType: 'uint256', name: '_emergencyTimelock', type: 'uint256' },
    ],
    name: 'initializeCLOBV2',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'commitment', type: 'bytes32' }],
    name: 'commitOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'commitmentId', type: 'bytes32' },
      { internalType: 'address', name: 'baseToken', type: 'address' },
      { internalType: 'uint256', name: 'baseTokenId', type: 'uint256' },
      { internalType: 'address', name: 'quoteToken', type: 'address' },
      { internalType: 'uint96', name: 'price', type: 'uint96' },
      { internalType: 'uint96', name: 'amount', type: 'uint96' },
      { internalType: 'bool', name: 'isBuy', type: 'bool' },
      { internalType: 'uint8', name: 'timeInForce', type: 'uint8' },
      { internalType: 'uint40', name: 'expiry', type: 'uint40' },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
    ],
    name: 'revealOrder',
    outputs: [{ internalType: 'bytes32', name: 'orderId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'baseToken', type: 'address' },
      { internalType: 'uint256', name: 'baseTokenId', type: 'uint256' },
      { internalType: 'address', name: 'quoteToken', type: 'address' },
      { internalType: 'uint96', name: 'price', type: 'uint96' },
      { internalType: 'uint96', name: 'amount', type: 'uint96' },
      { internalType: 'bool', name: 'isBuy', type: 'bool' },
      { internalType: 'uint8', name: 'timeInForce', type: 'uint8' },
      { internalType: 'uint40', name: 'expiry', type: 'uint40' },
    ],
    name: 'placeLimitOrder',
    outputs: [{ internalType: 'bytes32', name: 'orderId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'baseToken', type: 'address' },
      { internalType: 'uint256', name: 'baseTokenId', type: 'uint256' },
      { internalType: 'address', name: 'quoteToken', type: 'address' },
      { internalType: 'uint96', name: 'amount', type: 'uint96' },
      { internalType: 'bool', name: 'isBuy', type: 'bool' },
      { internalType: 'uint256', name: 'maxSlippageBps', type: 'uint256' },
    ],
    name: 'placeMarketOrder',
    outputs: [{ internalType: 'bytes32', name: 'orderId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32[]', name: 'orderIds', type: 'bytes32[]' },
    ],
    name: 'cancelOrders',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_orderId', type: 'bytes32' }],
    name: 'cancelCLOBOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // CLOBViewFacet Functions
  {
    inputs: [{ internalType: 'bytes32', name: 'marketId', type: 'bytes32' }],
    name: 'getBestBidAsk',
    outputs: [
      { internalType: 'uint256', name: 'bestBid', type: 'uint256' },
      { internalType: 'uint256', name: 'bestBidSize', type: 'uint256' },
      { internalType: 'uint256', name: 'bestAsk', type: 'uint256' },
      { internalType: 'uint256', name: 'bestAskSize', type: 'uint256' },
      { internalType: 'uint256', name: 'spread', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
      { internalType: 'uint256', name: 'levels', type: 'uint256' },
    ],
    name: 'getOrderBookDepth',
    outputs: [
      { internalType: 'uint256[]', name: 'bidPrices', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'bidSizes', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'bidCounts', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'askPrices', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'askSizes', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'askCounts', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'orderId', type: 'bytes32' }],
    name: 'getPackedOrder',
    outputs: [
      { internalType: 'address', name: 'maker', type: 'address' },
      { internalType: 'bool', name: 'isBuy', type: 'bool' },
      { internalType: 'uint8', name: 'orderType', type: 'uint8' },
      { internalType: 'uint8', name: 'status', type: 'uint8' },
      { internalType: 'uint8', name: 'timeInForce', type: 'uint8' },
      { internalType: 'uint96', name: 'price', type: 'uint96' },
      { internalType: 'uint96', name: 'amount', type: 'uint96' },
      { internalType: 'uint64', name: 'filledAmount', type: 'uint64' },
      { internalType: 'uint40', name: 'expiry', type: 'uint40' },
      { internalType: 'uint40', name: 'createdAt', type: 'uint40' },
      { internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'orderId', type: 'bytes32' }],
    name: 'getOrderStatus',
    outputs: [
      { internalType: 'uint8', name: 'status', type: 'uint8' },
      { internalType: 'uint96', name: 'amount', type: 'uint96' },
      { internalType: 'uint64', name: 'filledAmount', type: 'uint64' },
      { internalType: 'uint96', name: 'remainingAmount', type: 'uint96' },
      { internalType: 'bool', name: 'isExpired', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'orderId', type: 'bytes32' }],
    name: 'isOrderActive',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'baseToken', type: 'address' },
      { internalType: 'uint256', name: 'baseTokenId', type: 'uint256' },
      { internalType: 'address', name: 'quoteToken', type: 'address' },
    ],
    name: 'getMarketId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAllMarkets',
    outputs: [{ internalType: 'bytes32[]', name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'marketId', type: 'bytes32' }],
    name: 'getMarketStats',
    outputs: [
      { internalType: 'uint256', name: 'totalBidVolume', type: 'uint256' },
      { internalType: 'uint256', name: 'totalAskVolume', type: 'uint256' },
      { internalType: 'uint256', name: 'totalBidOrders', type: 'uint256' },
      { internalType: 'uint256', name: 'totalAskOrders', type: 'uint256' },
      { internalType: 'uint256', name: 'priceLevelsBid', type: 'uint256' },
      { internalType: 'uint256', name: 'priceLevelsAsk', type: 'uint256' },
      { internalType: 'uint256', name: 'lastTradePrice', type: 'uint256' },
      { internalType: 'bool', name: 'circuitBreakerTripped', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalCounts',
    outputs: [
      { internalType: 'uint256', name: 'totalMarkets', type: 'uint256' },
      { internalType: 'uint256', name: 'totalOrders', type: 'uint256' },
      { internalType: 'uint256', name: 'totalTrades', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'commitmentId', type: 'bytes32' },
    ],
    name: 'getCommitment',
    outputs: [
      { internalType: 'bytes32', name: 'commitment', type: 'bytes32' },
      { internalType: 'uint256', name: 'commitBlock', type: 'uint256' },
      { internalType: 'address', name: 'committer', type: 'address' },
      { internalType: 'bool', name: 'revealed', type: 'bool' },
      { internalType: 'bool', name: 'expired', type: 'bool' },
      { internalType: 'uint256', name: 'revealDeadline', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // CLOBAdminFacet Functions
  {
    inputs: [{ internalType: 'bytes32', name: 'marketId', type: 'bytes32' }],
    name: 'getCircuitBreaker',
    outputs: [
      { internalType: 'uint256', name: 'lastPrice', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'priceChangeThreshold',
        type: 'uint256',
      },
      { internalType: 'uint256', name: 'cooldownPeriod', type: 'uint256' },
      { internalType: 'uint256', name: 'tripTimestamp', type: 'uint256' },
      { internalType: 'bool', name: 'isTripped', type: 'bool' },
      { internalType: 'bool', name: 'isEnabled', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getFeeConfig',
    outputs: [
      { internalType: 'uint16', name: 'takerFeeBps', type: 'uint16' },
      { internalType: 'uint16', name: 'makerFeeBps', type: 'uint16' },
      { internalType: 'uint16', name: 'lpFeeBps', type: 'uint16' },
      { internalType: 'address', name: 'feeRecipient', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMEVConfig',
    outputs: [
      { internalType: 'uint8', name: 'minRevealDelay', type: 'uint8' },
      { internalType: 'uint256', name: 'commitmentThreshold', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isPaused',
    outputs: [
      { internalType: 'bool', name: 'paused', type: 'bool' },
      { internalType: 'uint256', name: 'pauseStartTime', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
