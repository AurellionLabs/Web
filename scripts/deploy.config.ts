/**
 * Unified Deployment Configuration
 *
 * This file defines all deployable contracts and their configuration.
 * Add new contracts here to include them in the deployment system.
 *
 * FACET_ABI is the single source of truth for:
 * - Function selectors (for diamondCut operations)
 * - Full ABI definitions (for frontend contract interactions)
 */

export interface ContractConfig {
  name: string;
  contractName: string;
  category: 'core' | 'diamond' | 'facet' | 'standalone';
  dependencies?: string[]; // Other contracts this depends on
  constructorArgs?: (
    addresses: Record<string, string>,
    deployer: string,
  ) => any[];
  postDeploy?: (
    contract: any,
    addresses: Record<string, string>,
  ) => Promise<void>;
  chainConstantKey?: string; // Key in chain-constants.ts
  indexerConfig?: {
    abiName: string;
    startBlockKey: string;
  };
}

// ABI fragment type for function definitions
export interface ABIFunction {
  type: 'function';
  name: string;
  inputs: Array<{ name: string; type: string; indexed?: boolean }>;
  outputs: Array<{ name: string; type: string }>;
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
}

export interface ABIEvent {
  type: 'event';
  name: string;
  inputs: Array<{ name: string; type: string; indexed?: boolean }>;
}

export type ABIFragment = ABIFunction | ABIEvent;

export interface DeploymentMode {
  name: string;
  description: string;
  contracts: string[]; // Contract names to deploy
}

// =============================================================================
// DEPRECATED SELECTORS - Automatically removed during Diamond upgrades
// =============================================================================
// When upgrading facets, these selectors will be automatically removed from the
// Diamond to prevent usage of deprecated functions with incompatible storage.
//
// Format: { selector: '0x...', functionName: 'name', reason: 'why deprecated' }

export interface DeprecatedSelector {
  selector: string;
  functionName: string;
  reason: string;
  deprecatedAt: string; // ISO date
  replacedBy?: string; // New function name
}

export const DEPRECATED_SELECTORS: DeprecatedSelector[] = [
  {
    selector: '0x', // Will be computed from ABI
    functionName: 'placeNodeSellOrder',
    reason:
      'Uses V1 array-based storage incompatible with V2 tree-based storage. Orders placed via this function cannot match with V2 orders.',
    deprecatedAt: '2026-01-07',
    replacedBy: 'OrderRouterFacet.placeNodeSellOrder (V2)',
  },
  {
    selector: '0x',
    functionName: 'placeBuyOrder',
    reason:
      'Uses V1 array-based storage. Use OrderRouterFacet.placeOrder instead.',
    deprecatedAt: '2026-01-07',
    replacedBy: 'OrderRouterFacet.placeOrder',
  },
  {
    selector: '0x',
    functionName: 'placeOrder', // The old CLOBFacet.placeOrder with marketId
    reason: 'Uses V1 storage. Use OrderRouterFacet.placeOrder instead.',
    deprecatedAt: '2026-01-07',
    replacedBy: 'OrderRouterFacet.placeOrder',
  },
];

/**
 * Compute function selector from signature string
 * @param functionSig e.g., "placeNodeSellOrder(address,address,uint256,address,uint256,uint256)"
 * @deprecated Use computeSelector(ABIFunction) instead for type safety
 */
export function computeSelectorFromSignature(functionSig: string): string {
  // Import ethers dynamically to compute selector
  // This is a simple implementation - in production, use ethers.id()
  const { ethers } = require('ethers');
  return ethers.id(functionSig).slice(0, 10);
}

// =============================================================================
// CONTRACT DEFINITIONS
// =============================================================================

export const CONTRACTS: Record<string, ContractConfig> = {
  // Core Contracts
  Aura: {
    name: 'Aura',
    contractName: 'Aura',
    category: 'core',
    chainConstantKey: 'NEXT_PUBLIC_AURA_TOKEN_ADDRESS',
    indexerConfig: { abiName: 'AuraAbi', startBlockKey: 'auraToken' },
    postDeploy: async (contract) => {
      console.log('   Minting initial tokens...');
      const tx = await contract.mintTokenToTreasury(1000000);
      await tx.wait();
      console.log('   ✓ Minted 1,000,000 AURA tokens');
    },
  },

  AuSys: {
    name: 'AuSys',
    contractName: 'Ausys',
    category: 'core',
    dependencies: ['Aura'],
    constructorArgs: (addresses) => [addresses.Aura],
    chainConstantKey: 'NEXT_PUBLIC_AUSYS_ADDRESS',
    indexerConfig: { abiName: 'AusysAbi', startBlockKey: 'auSys' },
  },

  AurumNodeManager: {
    name: 'AurumNodeManager',
    contractName: 'AurumNodeManager',
    category: 'core',
    dependencies: ['AuSys'],
    constructorArgs: (addresses) => [addresses.AuSys],
    chainConstantKey: 'NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS',
    indexerConfig: {
      abiName: 'AurumNodeManagerAbi',
      startBlockKey: 'aurumNodeManager',
    },
  },

  AuStake: {
    name: 'AuStake',
    contractName: 'AuStake',
    category: 'core',
    constructorArgs: (_, deployer) => [deployer, deployer],
    chainConstantKey: 'NEXT_PUBLIC_AUSTAKE_ADDRESS',
    indexerConfig: { abiName: 'AuStakeAbi', startBlockKey: 'auStake' },
  },

  AuraAsset: {
    name: 'AuraAsset',
    contractName: 'AuraAsset',
    category: 'core',
    dependencies: ['AurumNodeManager'],
    constructorArgs: (addresses, deployer) => [
      deployer,
      'https://aurellion.io/metadata/',
      addresses.AurumNodeManager,
    ],
    chainConstantKey: 'NEXT_PUBLIC_AURA_ASSET_ADDRESS',
    indexerConfig: { abiName: 'AuraAssetAbi', startBlockKey: 'auraAsset' },
    postDeploy: async (contract, addresses) => {
      console.log('   Adding default asset classes...');
      const classes = ['GOAT', 'SHEEP', 'COW', 'CHICKEN', 'DUCK'];
      for (const className of classes) {
        const tx = await contract.addSupportedClass(className);
        await tx.wait();
        console.log(`   ✓ Added class: ${className}`);
      }
    },
  },

  CLOB: {
    name: 'CLOB',
    contractName: 'CLOB',
    category: 'core',
    constructorArgs: (_, deployer) => [deployer],
    chainConstantKey: 'NEXT_PUBLIC_CLOB_ADDRESS',
    indexerConfig: { abiName: 'CLOBAbi', startBlockKey: 'clob' },
  },

  OrderBridge: {
    name: 'OrderBridge',
    contractName: 'OrderBridge',
    category: 'standalone',
    dependencies: ['AuSys', 'CLOB', 'AuraAsset'],
    constructorArgs: (addresses, deployer) => [
      addresses.AuSys,
      addresses.CLOB,
      addresses.AuraAsset,
      deployer, // fee recipient
    ],
    chainConstantKey: 'NEXT_PUBLIC_ORDER_BRIDGE_ADDRESS',
  },

  RWYVault: {
    name: 'RWYVault',
    contractName: 'RWYVault',
    category: 'standalone',
    constructorArgs: (_, deployer) => [
      deployer, // fee recipient
      '0x0000000000000000000000000000000000000000', // CLOB address (can be set later)
      '0x0000000000000000000000000000000000000000', // quote token (can be set later)
    ],
    chainConstantKey: 'NEXT_PUBLIC_RWY_VAULT_ADDRESS',
    indexerConfig: { abiName: 'RWYVaultAbi', startBlockKey: 'rwyVault' },
    postDeploy: async (
      contract: any,
      _addresses: Record<string, string>,
      deployer?: string,
    ) => {
      console.log('   Approving deployer as operator...');
      const tx = await contract.approveOperator(deployer);
      await tx.wait();
      console.log('   ✓ Deployer approved as operator');
    },
  },

  // Diamond Facets
  DiamondCutFacet: {
    name: 'DiamondCutFacet',
    contractName: 'DiamondCutFacet',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_DIAMOND_CUT_FACET_ADDRESS',
  },

  DiamondLoupeFacet: {
    name: 'DiamondLoupeFacet',
    contractName: 'DiamondLoupeFacet',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_DIAMOND_LOUPE_FACET_ADDRESS',
  },

  OwnershipFacet: {
    name: 'OwnershipFacet',
    contractName: 'OwnershipFacet',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_OWNERSHIP_FACET_ADDRESS',
  },

  NodesFacet: {
    name: 'NodesFacet',
    contractName: 'NodesFacet',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_NODES_FACET_ADDRESS',
  },

  AssetsFacet: {
    name: 'AssetsFacet',
    contractName: 'AssetsFacet',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_ASSETS_FACET_ADDRESS',
  },

  OrdersFacet: {
    name: 'OrdersFacet',
    contractName: 'OrdersFacet',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_ORDERS_FACET_ADDRESS',
  },

  StakingFacet: {
    name: 'StakingFacet',
    contractName: 'StakingFacet',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_STAKING_FACET_ADDRESS',
  },

  BridgeFacet: {
    name: 'BridgeFacet',
    contractName: 'BridgeFacet',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_BRIDGE_FACET_ADDRESS',
  },

  CLOBFacet: {
    name: 'CLOBFacet',
    contractName: 'CLOBFacet',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_CLOB_FACET_ADDRESS',
  },

  // CLOBFacetV2 - Production CLOB with OrderPlacedWithTokens event
  CLOBFacetV2: {
    name: 'CLOBFacetV2',
    contractName: 'CLOBFacetV2',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_CLOB_FACET_V2_ADDRESS',
  },

  // OrderRouterFacet - SINGLE ENTRY POINT for all order operations
  // This replaces direct calls to CLOBFacet order functions
  OrderRouterFacet: {
    name: 'OrderRouterFacet',
    contractName: 'OrderRouterFacet',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_ORDER_ROUTER_FACET_ADDRESS',
  },

  ERC1155ReceiverFacet: {
    name: 'ERC1155ReceiverFacet',
    contractName: 'ERC1155ReceiverFacet',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_ERC1155_RECEIVER_FACET_ADDRESS',
  },

  // CLOBMEVFacet - MEV protection via commit-reveal
  CLOBMEVFacet: {
    name: 'CLOBMEVFacet',
    contractName: 'CLOBMEVFacet',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_CLOB_MEV_FACET_ADDRESS',
  },

  // OrderMatchingFacet - Order matching logic (split from OrderRouterFacet)
  OrderMatchingFacet: {
    name: 'OrderMatchingFacet',
    contractName: 'OrderMatchingFacet',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_ORDER_MATCHING_FACET_ADDRESS',
  },

  // Diamond itself
  Diamond: {
    name: 'Diamond',
    contractName: 'Diamond',
    category: 'diamond',
    dependencies: [
      'DiamondCutFacet',
      'DiamondLoupeFacet',
      'OwnershipFacet',
      'NodesFacet',
      'ERC1155ReceiverFacet',
    ],
    constructorArgs: (addresses, deployer) => [
      deployer,
      addresses.DiamondCutFacet,
    ],
    chainConstantKey: 'NEXT_PUBLIC_DIAMOND_ADDRESS',
    postDeploy: async (contract, addresses) => {
      try {
        console.log('   Adding facets to Diamond...');

        // Import ethers dynamically
        const { ethers } = await import('ethers');

        // FacetCutAction enum: Add = 0, Replace = 1, Remove = 2
        const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };

        // Facets to add (DiamondCutFacet is already added in constructor)
        const facetsToAdd = [
          { name: 'DiamondLoupeFacet', address: addresses.DiamondLoupeFacet },
          { name: 'OwnershipFacet', address: addresses.OwnershipFacet },
          { name: 'NodesFacet', address: addresses.NodesFacet },
          {
            name: 'ERC1155ReceiverFacet',
            address: addresses.ERC1155ReceiverFacet,
          },
        ];

        // Build facet cuts
        const facetCuts = [];
        for (const facet of facetsToAdd) {
          if (!facet.address) {
            console.log(`   ⚠ Skipping ${facet.name} - not deployed`);
            continue;
          }

          const selectors = FACET_SELECTORS[facet.name];
          if (!selectors || selectors.length === 0) {
            console.log(`   ⚠ Skipping ${facet.name} - no selectors defined`);
            continue;
          }

          facetCuts.push({
            facetAddress: facet.address,
            action: FacetCutAction.Add,
            functionSelectors: selectors,
          });

          console.log(
            `   ✓ Prepared ${facet.name} with ${selectors.length} selectors`,
          );
        }

        if (facetCuts.length === 0) {
          console.log('   ⚠ No facets to add');
          return;
        }

        // Get the Diamond address
        const diamondAddress = await contract.getAddress();

        // Attach IDiamondCut interface to the Diamond address
        const diamondCutAbi = [
          'function diamondCut((address facetAddress, uint8 action, bytes4[] functionSelectors)[] calldata _diamondCut, address _init, bytes calldata _calldata) external',
        ];
        const diamondCut = new ethers.Contract(
          diamondAddress,
          diamondCutAbi,
          contract.runner,
        );

        // Execute diamond cut
        console.log('   Executing diamondCut transaction...');
        const tx = await diamondCut.diamondCut(
          facetCuts,
          ethers.ZeroAddress,
          '0x',
        );
        console.log('   Waiting for transaction confirmation...');
        await tx.wait();

        console.log(`   ✅ Added ${facetCuts.length} facets to Diamond`);
      } catch (error) {
        console.error('   ❌ Failed to add facets to Diamond:');
        console.error('   ', error instanceof Error ? error.message : error);
        throw error;
      }
    },
  },
};

// =============================================================================
// DEPLOYMENT MODES
// =============================================================================

export const DEPLOYMENT_MODES: Record<string, DeploymentMode> = {
  // Test deployment for E2E tests - minimal contracts needed
  test: {
    name: 'Test Deployment',
    description: 'Deploy minimal contracts for E2E testing including Diamond',
    contracts: [
      'Aura',
      'AuSys',
      'AurumNodeManager',
      'AuStake',
      'AuraAsset',
      'CLOB',
      'RWYVault',
      // Diamond for node inventory testing
      'DiamondCutFacet',
      'DiamondLoupeFacet',
      'OwnershipFacet',
      'NodesFacet',
      'ERC1155ReceiverFacet',
      'Diamond',
    ],
  },

  // Full deployment of all core contracts
  full: {
    name: 'Full Deployment',
    description:
      'Deploy all core contracts (Aura, AuSys, AurumNodeManager, AuStake, AuraAsset, CLOB)',
    contracts: [
      'Aura',
      'AuSys',
      'AurumNodeManager',
      'AuStake',
      'AuraAsset',
      'CLOB',
    ],
  },

  // Diamond deployment with all facets
  diamond: {
    name: 'Diamond Deployment',
    description: 'Deploy Diamond proxy with all facets',
    contracts: [
      'DiamondCutFacet',
      'DiamondLoupeFacet',
      'OwnershipFacet',
      'NodesFacet',
      'AssetsFacet',
      'OrdersFacet',
      'StakingFacet',
      'BridgeFacet',
      'CLOBFacet',
      'Diamond',
    ],
  },

  // Diamond V2 deployment - FRESH START with all V2 facets
  // Use this to deploy a completely new Diamond with clean storage
  'diamond-v2': {
    name: 'Diamond V2 Fresh Deployment',
    description: 'Deploy fresh Diamond with V2 facets (OrderRouterFacet, etc.)',
    contracts: [
      'DiamondCutFacet',
      'DiamondLoupeFacet',
      'OwnershipFacet',
      'ERC1155ReceiverFacet',
      'NodesFacet',
      'AssetsFacet',
      'OrdersFacet',
      'StakingFacet',
      'BridgeFacet',
      'CLOBFacet',
      'OrderRouterFacet',
      'Diamond',
    ],
  },

  // RWY Vault only
  rwy: {
    name: 'RWY Vault Deployment',
    description: 'Deploy only the RWY Vault contract',
    contracts: ['RWYVault'],
  },

  // Order Bridge only
  bridge: {
    name: 'Order Bridge Deployment',
    description: 'Deploy only the Order Bridge contract',
    contracts: ['OrderBridge'],
  },

  // All standalone contracts
  standalone: {
    name: 'Standalone Contracts',
    description: 'Deploy all standalone contracts (OrderBridge, RWYVault)',
    contracts: ['OrderBridge', 'RWYVault'],
  },

  // Everything
  all: {
    name: 'Complete Deployment',
    description: 'Deploy everything: core, diamond, and standalone contracts',
    contracts: [
      // Core
      'Aura',
      'AuSys',
      'AurumNodeManager',
      'AuStake',
      'AuraAsset',
      'CLOB',
      // Diamond
      'DiamondCutFacet',
      'DiamondLoupeFacet',
      'OwnershipFacet',
      'NodesFacet',
      'AssetsFacet',
      'OrdersFacet',
      'StakingFacet',
      'BridgeFacet',
      'CLOBFacet',
      'Diamond',
      // Standalone
      'OrderBridge',
      'RWYVault',
    ],
  },
};

// =============================================================================
// FACET ABI DEFINITIONS - Single Source of Truth
// =============================================================================
// These ABI definitions are used for:
// 1. Extracting selectors for diamondCut operations
// 2. Generating frontend ABI for contract interactions
// 3. Indexer event definitions

export const FACET_ABI: Record<string, ABIFragment[]> = {
  DiamondCutFacet: [
    {
      type: 'function',
      name: 'diamondCut',
      inputs: [
        { name: '_diamondCut', type: 'tuple[]' },
        { name: '_init', type: 'address' },
        { name: '_calldata', type: 'bytes' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
  ],

  DiamondLoupeFacet: [
    {
      type: 'function',
      name: 'facetAddress',
      inputs: [{ name: '_functionSelector', type: 'bytes4' }],
      outputs: [{ name: 'facetAddress_', type: 'address' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'facets',
      inputs: [],
      outputs: [{ name: 'facets_', type: 'tuple[]' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'facetFunctionSelectors',
      inputs: [{ name: '_facet', type: 'address' }],
      outputs: [{ name: 'facetFunctionSelectors_', type: 'bytes4[]' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'facetAddresses',
      inputs: [],
      outputs: [{ name: 'facetAddresses_', type: 'address[]' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'supportsInterface',
      inputs: [{ name: '_interfaceId', type: 'bytes4' }],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'view',
    },
  ],

  OwnershipFacet: [
    {
      type: 'function',
      name: 'acceptOwnership',
      inputs: [],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'initialize',
      inputs: [{ name: '_owner', type: 'address' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'owner',
      inputs: [],
      outputs: [{ name: '', type: 'address' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'renounceOwnership',
      inputs: [],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'transferOwnership',
      inputs: [{ name: 'newOwner', type: 'address' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
  ],

  CLOBFacet: [
    // Market order - immediate execution at best available price
    {
      type: 'function',
      name: 'placeMarketOrder',
      inputs: [
        { name: '_baseToken', type: 'address' },
        { name: '_baseTokenId', type: 'uint256' },
        { name: '_quoteToken', type: 'address' },
        { name: '_amount', type: 'uint256' },
        { name: '_isBuy', type: 'bool' },
        { name: '_maxPrice', type: 'uint256' },
      ],
      outputs: [{ name: 'orderId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    // Limit buy order - user places buy order with specific price
    {
      type: 'function',
      name: 'placeBuyOrder',
      inputs: [
        { name: '_baseToken', type: 'address' },
        { name: '_baseTokenId', type: 'uint256' },
        { name: '_quoteToken', type: 'address' },
        { name: '_price', type: 'uint256' },
        { name: '_amount', type: 'uint256' },
      ],
      outputs: [{ name: 'orderId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    // Node sell order V2 - called by NodesFacet for node inventory sales
    // Uses tree-based order book for proper matching with V2 buy orders
    {
      type: 'function',
      name: 'placeNodeSellOrderV2',
      inputs: [
        { name: 'nodeOwner', type: 'address' },
        { name: 'baseToken', type: 'address' },
        { name: 'baseTokenId', type: 'uint256' },
        { name: 'quoteToken', type: 'address' },
        { name: 'price', type: 'uint96' },
        { name: 'amount', type: 'uint96' },
        { name: 'timeInForce', type: 'uint8' },
        { name: 'expiry', type: 'uint40' },
      ],
      outputs: [{ name: 'orderId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    // DEPRECATED: placeNodeSellOrder - uses old array-based storage
    // Kept for backwards compatibility but should NOT be used
    // {
    //   type: 'function',
    //   name: 'placeNodeSellOrder',
    //   inputs: [...],
    // },
    // Cancel order
    {
      type: 'function',
      name: 'cancelCLOBOrder',
      inputs: [{ name: '_orderId', type: 'bytes32' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    // View functions
    {
      type: 'function',
      name: 'getOpenOrders',
      inputs: [
        { name: '_baseToken', type: 'address' },
        { name: '_baseTokenId', type: 'uint256' },
        { name: '_quoteToken', type: 'address' },
      ],
      outputs: [
        { name: 'buyOrders', type: 'bytes32[]' },
        { name: 'sellOrders', type: 'bytes32[]' },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getOrderWithTokens',
      inputs: [{ name: '_orderId', type: 'bytes32' }],
      outputs: [
        { name: 'maker', type: 'address' },
        { name: 'baseToken', type: 'address' },
        { name: 'baseTokenId', type: 'uint256' },
        { name: 'quoteToken', type: 'address' },
        { name: 'price', type: 'uint256' },
        { name: 'amount', type: 'uint256' },
        { name: 'filledAmount', type: 'uint256' },
        { name: 'isBuy', type: 'bool' },
        { name: 'status', type: 'uint8' },
      ],
      stateMutability: 'view',
    },
    // Legacy market-based functions
    {
      type: 'function',
      name: 'createMarket',
      inputs: [
        { name: '_baseToken', type: 'string' },
        { name: '_baseTokenId', type: 'uint256' },
        { name: '_quoteToken', type: 'string' },
      ],
      outputs: [{ name: 'marketId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'placeOrder',
      inputs: [
        { name: '_marketId', type: 'bytes32' },
        { name: '_price', type: 'uint256' },
        { name: '_amount', type: 'uint256' },
        { name: '_isBuy', type: 'bool' },
        { name: '_orderType', type: 'uint8' },
      ],
      outputs: [{ name: 'orderId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getOrder',
      inputs: [{ name: '_orderId', type: 'bytes32' }],
      outputs: [
        { name: 'maker', type: 'address' },
        { name: 'marketId', type: 'bytes32' },
        { name: 'price', type: 'uint256' },
        { name: 'amount', type: 'uint256' },
        { name: 'filledAmount', type: 'uint256' },
        { name: 'isBuy', type: 'bool' },
        { name: 'orderType', type: 'uint8' },
        { name: 'status', type: 'uint8' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'updatedAt', type: 'uint256' },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getMarket',
      inputs: [{ name: '_marketId', type: 'bytes32' }],
      outputs: [
        { name: 'baseToken', type: 'string' },
        { name: 'baseTokenId', type: 'uint256' },
        { name: 'quoteToken', type: 'string' },
        { name: 'active', type: 'bool' },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getTrade',
      inputs: [{ name: '_tradeId', type: 'bytes32' }],
      outputs: [
        { name: 'takerOrderId', type: 'bytes32' },
        { name: 'makerOrderId', type: 'bytes32' },
        { name: 'taker', type: 'address' },
        { name: 'maker', type: 'address' },
        { name: 'marketId', type: 'bytes32' },
        { name: 'price', type: 'uint256' },
        { name: 'amount', type: 'uint256' },
        { name: 'quoteAmount', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getPool',
      inputs: [{ name: '_poolId', type: 'bytes32' }],
      outputs: [
        { name: 'baseToken', type: 'string' },
        { name: 'baseTokenId', type: 'uint256' },
        { name: 'quoteToken', type: 'string' },
        { name: 'baseReserve', type: 'uint256' },
        { name: 'quoteReserve', type: 'uint256' },
        { name: 'totalLpTokens', type: 'uint256' },
        { name: 'isActive', type: 'bool' },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getTotalMarkets',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getTotalTrades',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
    },
    // Events
    {
      type: 'event',
      name: 'OrderPlacedWithTokens',
      inputs: [
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'maker', type: 'address', indexed: true },
        { name: 'baseToken', type: 'address', indexed: true },
        { name: 'baseTokenId', type: 'uint256', indexed: false },
        { name: 'quoteToken', type: 'address', indexed: false },
        { name: 'price', type: 'uint256', indexed: false },
        { name: 'amount', type: 'uint256', indexed: false },
        { name: 'isBuy', type: 'bool', indexed: false },
        { name: 'orderType', type: 'uint8', indexed: false },
      ],
    },
    {
      type: 'event',
      name: 'OrderCancelled',
      inputs: [
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'maker', type: 'address', indexed: true },
        { name: 'remainingAmount', type: 'uint256', indexed: false },
      ],
    },
    {
      type: 'event',
      name: 'TradeExecuted',
      inputs: [
        { name: 'tradeId', type: 'bytes32', indexed: true },
        { name: 'taker', type: 'address', indexed: true },
        { name: 'maker', type: 'address', indexed: true },
        { name: 'marketId', type: 'bytes32', indexed: false },
        { name: 'price', type: 'uint256', indexed: false },
        { name: 'amount', type: 'uint256', indexed: false },
        { name: 'quoteAmount', type: 'uint256', indexed: false },
        { name: 'timestamp', type: 'uint256', indexed: false },
      ],
    },
  ],

  // OrderRouterFacet - SINGLE ENTRY POINT for all order operations
  // This is the recommended way to place orders - ensures consistent V2 storage
  OrderRouterFacet: [
    // Primary order placement function
    {
      type: 'function',
      name: 'placeOrder',
      inputs: [
        { name: 'baseToken', type: 'address' },
        { name: 'baseTokenId', type: 'uint256' },
        { name: 'quoteToken', type: 'address' },
        { name: 'price', type: 'uint96' },
        { name: 'amount', type: 'uint96' },
        { name: 'isBuy', type: 'bool' },
        { name: 'timeInForce', type: 'uint8' },
        { name: 'expiry', type: 'uint40' },
      ],
      outputs: [{ name: 'orderId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    // Node sell order - called internally by NodesFacet
    {
      type: 'function',
      name: 'placeNodeSellOrder',
      inputs: [
        { name: 'nodeOwner', type: 'address' },
        { name: 'baseToken', type: 'address' },
        { name: 'baseTokenId', type: 'uint256' },
        { name: 'quoteToken', type: 'address' },
        { name: 'price', type: 'uint96' },
        { name: 'amount', type: 'uint96' },
        { name: 'timeInForce', type: 'uint8' },
        { name: 'expiry', type: 'uint40' },
      ],
      outputs: [{ name: 'orderId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    // Market order with slippage protection
    {
      type: 'function',
      name: 'placeMarketOrder',
      inputs: [
        { name: 'baseToken', type: 'address' },
        { name: 'baseTokenId', type: 'uint256' },
        { name: 'quoteToken', type: 'address' },
        { name: 'amount', type: 'uint96' },
        { name: 'isBuy', type: 'bool' },
        { name: 'maxSlippageBps', type: 'uint16' },
      ],
      outputs: [{ name: 'orderId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    // Convenience function - simplified buy order (GTC, no expiry)
    {
      type: 'function',
      name: 'placeBuyOrder',
      inputs: [
        { name: 'baseToken', type: 'address' },
        { name: 'baseTokenId', type: 'uint256' },
        { name: 'quoteToken', type: 'address' },
        { name: 'price', type: 'uint96' },
        { name: 'amount', type: 'uint96' },
      ],
      outputs: [{ name: 'orderId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    // Convenience function - simplified sell order (GTC, no expiry)
    {
      type: 'function',
      name: 'placeSellOrder',
      inputs: [
        { name: 'baseToken', type: 'address' },
        { name: 'baseTokenId', type: 'uint256' },
        { name: 'quoteToken', type: 'address' },
        { name: 'price', type: 'uint96' },
        { name: 'amount', type: 'uint96' },
      ],
      outputs: [{ name: 'orderId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    // Cancel single order
    {
      type: 'function',
      name: 'cancelOrder',
      inputs: [{ name: 'orderId', type: 'bytes32' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    // Batch cancel
    {
      type: 'function',
      name: 'cancelOrders',
      inputs: [{ name: 'orderIds', type: 'bytes32[]' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    // View functions
    {
      type: 'function',
      name: 'getOrder',
      inputs: [{ name: 'orderId', type: 'bytes32' }],
      outputs: [
        { name: 'maker', type: 'address' },
        { name: 'marketId', type: 'bytes32' },
        { name: 'price', type: 'uint96' },
        { name: 'amount', type: 'uint96' },
        { name: 'filledAmount', type: 'uint64' },
        { name: 'isBuy', type: 'bool' },
        { name: 'status', type: 'uint8' },
        { name: 'timeInForce', type: 'uint8' },
        { name: 'expiry', type: 'uint40' },
        { name: 'createdAt', type: 'uint40' },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getBestPrices',
      inputs: [{ name: 'marketId', type: 'bytes32' }],
      outputs: [
        { name: 'bestBid', type: 'uint96' },
        { name: 'bestBidSize', type: 'uint96' },
        { name: 'bestAsk', type: 'uint96' },
        { name: 'bestAskSize', type: 'uint96' },
      ],
      stateMutability: 'view',
    },
    // Events
    {
      type: 'event',
      name: 'OrderRouted',
      inputs: [
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'maker', type: 'address', indexed: true },
        { name: 'orderSource', type: 'uint8', indexed: false },
        { name: 'isBuy', type: 'bool', indexed: false },
      ],
    },
    {
      type: 'event',
      name: 'OrderCreated',
      inputs: [
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'marketId', type: 'bytes32', indexed: true },
        { name: 'maker', type: 'address', indexed: true },
        { name: 'price', type: 'uint256', indexed: false },
        { name: 'amount', type: 'uint256', indexed: false },
        { name: 'isBuy', type: 'bool', indexed: false },
        { name: 'orderType', type: 'uint8', indexed: false },
        { name: 'timeInForce', type: 'uint8', indexed: false },
        { name: 'expiry', type: 'uint256', indexed: false },
        { name: 'nonce', type: 'uint256', indexed: false },
      ],
    },
    {
      type: 'event',
      name: 'OrderFilled',
      inputs: [
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'tradeId', type: 'bytes32', indexed: true },
        { name: 'fillAmount', type: 'uint256', indexed: false },
        { name: 'fillPrice', type: 'uint256', indexed: false },
        { name: 'remainingAmount', type: 'uint256', indexed: false },
      ],
    },
    {
      type: 'event',
      name: 'OrderCancelled',
      inputs: [
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'maker', type: 'address', indexed: true },
        { name: 'remainingAmount', type: 'uint256', indexed: false },
        { name: 'reason', type: 'uint8', indexed: false },
      ],
    },
    {
      type: 'event',
      name: 'TradeExecuted',
      inputs: [
        { name: 'tradeId', type: 'bytes32', indexed: true },
        { name: 'takerOrderId', type: 'bytes32', indexed: true },
        { name: 'makerOrderId', type: 'bytes32', indexed: true },
        { name: 'price', type: 'uint256', indexed: false },
        { name: 'amount', type: 'uint256', indexed: false },
        { name: 'quoteAmount', type: 'uint256', indexed: false },
      ],
    },
  ],

  NodesFacet: [
    // IMPORTANT: These signatures must match the actual contract functions
    // registerNode(string,uint256,bytes32,string,string,string) => 0x506a17b2
    {
      type: 'function',
      name: 'registerNode',
      inputs: [
        { name: '_nodeType', type: 'string' },
        { name: '_capacity', type: 'uint256' },
        { name: '_assetHash', type: 'bytes32' },
        { name: '_addressName', type: 'string' },
        { name: '_lat', type: 'string' },
        { name: '_lng', type: 'string' },
      ],
      outputs: [{ name: 'nodeHash', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getNode',
      inputs: [{ name: '_nodeHash', type: 'bytes32' }],
      outputs: [
        { name: 'owner', type: 'address' },
        { name: 'nodeType', type: 'string' },
        { name: 'capacity', type: 'uint256' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'active', type: 'bool' },
        { name: 'validNode', type: 'bool' },
        { name: 'assetHash', type: 'bytes32' },
        { name: 'addressName', type: 'string' },
        { name: 'lat', type: 'string' },
        { name: 'lng', type: 'string' },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getOwnerNodes',
      inputs: [{ name: '_owner', type: 'address' }],
      outputs: [{ name: '', type: 'bytes32[]' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getTotalNodes',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'updateNodeStatus',
      inputs: [
        { name: '_status', type: 'bytes1' },
        { name: '_node', type: 'bytes32' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    // Additional NodesFacet functions
    {
      type: 'function',
      name: 'updateNode',
      inputs: [
        { name: '_nodeHash', type: 'bytes32' },
        { name: '_nodeType', type: 'string' },
        { name: '_capacity', type: 'uint256' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'deactivateNode',
      inputs: [{ name: '_nodeHash', type: 'bytes32' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'updateNodeLocation',
      inputs: [
        { name: '_addressName', type: 'string' },
        { name: '_lat', type: 'string' },
        { name: '_lng', type: 'string' },
        { name: '_node', type: 'bytes32' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'updateNodeOwner',
      inputs: [
        { name: '_owner', type: 'address' },
        { name: '_node', type: 'bytes32' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'addSupportedAsset',
      inputs: [
        { name: '_node', type: 'bytes32' },
        { name: '_token', type: 'address' },
        { name: '_tokenId', type: 'uint256' },
        { name: '_price', type: 'uint256' },
        { name: '_capacity', type: 'uint256' },
      ],
      outputs: [{ name: 'assetId', type: 'uint256' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getNodeAssets',
      inputs: [{ name: '_node', type: 'bytes32' }],
      outputs: [
        {
          name: '',
          type: 'tuple[]',
          components: [
            { name: 'token', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
            { name: 'price', type: 'uint256' },
            { name: 'capacity', type: 'uint256' },
            { name: 'createdAt', type: 'uint256' },
            { name: 'active', type: 'bool' },
          ],
        },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getNodeStatus',
      inputs: [{ name: '_node', type: 'address' }],
      outputs: [{ name: '', type: 'bytes1' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'setAuraAssetAddress',
      inputs: [{ name: '_auraAsset', type: 'address' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getAuraAssetAddress',
      inputs: [],
      outputs: [{ name: '', type: 'address' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'creditNodeTokens',
      inputs: [
        { name: '_node', type: 'bytes32' },
        { name: '_tokenId', type: 'uint256' },
        { name: '_amount', type: 'uint256' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getNodeTokenIds',
      inputs: [{ name: '_node', type: 'bytes32' }],
      outputs: [{ name: '', type: 'uint256[]' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getNodeInventoryWithMetadata',
      inputs: [{ name: '_node', type: 'bytes32' }],
      outputs: [
        {
          name: 'assets',
          type: 'tuple[]',
          components: [
            { name: 'token', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
            { name: 'price', type: 'uint256' },
            { name: 'capacity', type: 'uint256' },
            { name: 'balance', type: 'uint256' },
            { name: 'createdAt', type: 'uint256' },
            { name: 'active', type: 'bool' },
          ],
        },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getNodeSellableAssets',
      inputs: [{ name: '_node', type: 'bytes32' }],
      outputs: [
        {
          name: 'assets',
          type: 'tuple[]',
          components: [
            { name: 'token', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
            { name: 'price', type: 'uint256' },
            { name: 'capacity', type: 'uint256' },
            { name: 'balance', type: 'uint256' },
            { name: 'createdAt', type: 'uint256' },
            { name: 'active', type: 'bool' },
          ],
        },
        { name: 'count', type: 'uint256' },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'placeSellOrderFromNode',
      inputs: [
        { name: '_node', type: 'bytes32' },
        { name: '_tokenId', type: 'uint256' },
        { name: '_quoteToken', type: 'address' },
        { name: '_price', type: 'uint256' },
        { name: '_amount', type: 'uint256' },
      ],
      outputs: [{ name: 'orderId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'depositTokensToNode',
      inputs: [
        { name: '_nodeHash', type: 'bytes32' },
        { name: '_tokenId', type: 'uint256' },
        { name: '_amount', type: 'uint256' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'withdrawTokensFromNode',
      inputs: [
        { name: '_nodeHash', type: 'bytes32' },
        { name: '_tokenId', type: 'uint256' },
        { name: '_amount', type: 'uint256' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getNodeTokenBalance',
      inputs: [
        { name: '_nodeHash', type: 'bytes32' },
        { name: '_tokenId', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getNodeInventory',
      inputs: [{ name: '_nodeHash', type: 'bytes32' }],
      outputs: [
        { name: 'tokenIds', type: 'uint256[]' },
        { name: 'balances', type: 'uint256[]' },
      ],
      stateMutability: 'view',
    },
    // Events
    {
      type: 'event',
      name: 'NodeSellOrderPlaced',
      inputs: [
        { name: 'nodeHash', type: 'bytes32', indexed: true },
        { name: 'tokenId', type: 'uint256', indexed: true },
        { name: 'quoteToken', type: 'address', indexed: false },
        { name: 'price', type: 'uint256', indexed: false },
        { name: 'amount', type: 'uint256', indexed: false },
        { name: 'orderId', type: 'bytes32', indexed: false },
      ],
    },
  ],

  ERC1155ReceiverFacet: [
    {
      type: 'function',
      name: 'onERC1155Received',
      inputs: [
        { name: 'operator', type: 'address' },
        { name: 'from', type: 'address' },
        { name: 'id', type: 'uint256' },
        { name: 'value', type: 'uint256' },
        { name: 'data', type: 'bytes' },
      ],
      outputs: [{ name: '', type: 'bytes4' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'onERC1155BatchReceived',
      inputs: [
        { name: 'operator', type: 'address' },
        { name: 'from', type: 'address' },
        { name: 'ids', type: 'uint256[]' },
        { name: 'values', type: 'uint256[]' },
        { name: 'data', type: 'bytes' },
      ],
      outputs: [{ name: '', type: 'bytes4' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'supportsInterface',
      inputs: [{ name: 'interfaceId', type: 'bytes4' }],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'view',
    },
  ],

  // CLOBMEVFacet - MEV protection via commit-reveal for large orders
  CLOBMEVFacet: [
    {
      type: 'function',
      name: 'commitOrder',
      inputs: [{ name: 'commitment', type: 'bytes32' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'revealOrder',
      inputs: [
        { name: 'commitmentId', type: 'bytes32' },
        { name: 'baseToken', type: 'address' },
        { name: 'baseTokenId', type: 'uint256' },
        { name: 'quoteToken', type: 'address' },
        { name: 'price', type: 'uint96' },
        { name: 'amount', type: 'uint96' },
        { name: 'isBuy', type: 'bool' },
        { name: 'timeInForce', type: 'uint8' },
        { name: 'expiry', type: 'uint40' },
        { name: 'salt', type: 'bytes32' },
      ],
      outputs: [{ name: 'orderId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'requiresCommitReveal',
      inputs: [{ name: 'quoteAmount', type: 'uint256' }],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getCommitmentThreshold',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
    },
    // Events
    {
      type: 'event',
      name: 'OrderCommitted',
      inputs: [
        { name: 'commitmentId', type: 'bytes32', indexed: true },
        { name: 'committer', type: 'address', indexed: true },
        { name: 'commitBlock', type: 'uint256', indexed: false },
      ],
    },
    {
      type: 'event',
      name: 'OrderRevealed',
      inputs: [
        { name: 'commitmentId', type: 'bytes32', indexed: true },
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'maker', type: 'address', indexed: true },
      ],
    },
    {
      type: 'event',
      name: 'OrderCreated',
      inputs: [
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'marketId', type: 'bytes32', indexed: true },
        { name: 'maker', type: 'address', indexed: true },
        { name: 'price', type: 'uint256', indexed: false },
        { name: 'amount', type: 'uint256', indexed: false },
        { name: 'isBuy', type: 'bool', indexed: false },
        { name: 'orderType', type: 'uint8', indexed: false },
        { name: 'timeInForce', type: 'uint8', indexed: false },
        { name: 'expiry', type: 'uint256', indexed: false },
        { name: 'nonce', type: 'uint256', indexed: false },
      ],
    },
  ],

  // CLOBFacetV2 - Production CLOB with OrderPlacedWithTokens event for proper indexing
  CLOBFacetV2: [
    // Initialize the V2 CLOB
    {
      type: 'function',
      name: 'initializeCLOBV2',
      inputs: [
        { name: '_takerFeeBps', type: 'uint16' },
        { name: '_makerFeeBps', type: 'uint16' },
        { name: '_defaultPriceChangeThreshold', type: 'uint256' },
        { name: '_defaultCooldownPeriod', type: 'uint256' },
        { name: '_emergencyTimelock', type: 'uint256' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    // Place limit order with time-in-force
    {
      type: 'function',
      name: 'placeLimitOrder',
      inputs: [
        { name: 'baseToken', type: 'address' },
        { name: 'baseTokenId', type: 'uint256' },
        { name: 'quoteToken', type: 'address' },
        { name: 'price', type: 'uint96' },
        { name: 'amount', type: 'uint96' },
        { name: 'isBuy', type: 'bool' },
        { name: 'timeInForce', type: 'uint8' },
        { name: 'expiry', type: 'uint40' },
      ],
      outputs: [{ name: 'orderId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    // Place market order with slippage protection
    {
      type: 'function',
      name: 'placeMarketOrder',
      inputs: [
        { name: 'baseToken', type: 'address' },
        { name: 'baseTokenId', type: 'uint256' },
        { name: 'quoteToken', type: 'address' },
        { name: 'amount', type: 'uint96' },
        { name: 'isBuy', type: 'bool' },
        { name: 'maxSlippageBps', type: 'uint256' },
      ],
      outputs: [{ name: 'orderId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    // Node sell order V2 - called by Diamond for node inventory sales
    {
      type: 'function',
      name: 'placeNodeSellOrderV2',
      inputs: [
        { name: 'nodeOwner', type: 'address' },
        { name: 'baseToken', type: 'address' },
        { name: 'baseTokenId', type: 'uint256' },
        { name: 'quoteToken', type: 'address' },
        { name: 'price', type: 'uint96' },
        { name: 'amount', type: 'uint96' },
        { name: 'timeInForce', type: 'uint8' },
        { name: 'expiry', type: 'uint40' },
      ],
      outputs: [{ name: 'orderId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    // Cancel order
    {
      type: 'function',
      name: 'cancelOrder',
      inputs: [{ name: 'orderId', type: 'bytes32' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    // ERC1155 receiver functions
    {
      type: 'function',
      name: 'onERC1155Received',
      inputs: [
        { name: '', type: 'address' },
        { name: '', type: 'address' },
        { name: '', type: 'uint256' },
        { name: '', type: 'uint256' },
        { name: '', type: 'bytes' },
      ],
      outputs: [{ name: '', type: 'bytes4' }],
      stateMutability: 'pure',
    },
    {
      type: 'function',
      name: 'onERC1155BatchReceived',
      inputs: [
        { name: '', type: 'address' },
        { name: '', type: 'address' },
        { name: '', type: 'uint256[]' },
        { name: '', type: 'uint256[]' },
        { name: '', type: 'bytes' },
      ],
      outputs: [{ name: '', type: 'bytes4' }],
      stateMutability: 'pure',
    },
    // Events - OrderCreated (basic event)
    {
      type: 'event',
      name: 'OrderCreated',
      inputs: [
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'marketId', type: 'bytes32', indexed: true },
        { name: 'maker', type: 'address', indexed: true },
        { name: 'price', type: 'uint256', indexed: false },
        { name: 'amount', type: 'uint256', indexed: false },
        { name: 'isBuy', type: 'bool', indexed: false },
        { name: 'orderType', type: 'uint8', indexed: false },
        { name: 'timeInForce', type: 'uint8', indexed: false },
        { name: 'expiry', type: 'uint256', indexed: false },
        { name: 'nonce', type: 'uint256', indexed: false },
      ],
    },
    // OrderPlacedWithTokens - THE KEY EVENT for indexer compatibility
    {
      type: 'event',
      name: 'OrderPlacedWithTokens',
      inputs: [
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'maker', type: 'address', indexed: true },
        { name: 'baseToken', type: 'address', indexed: true },
        { name: 'baseTokenId', type: 'uint256', indexed: false },
        { name: 'quoteToken', type: 'address', indexed: false },
        { name: 'price', type: 'uint256', indexed: false },
        { name: 'amount', type: 'uint256', indexed: false },
        { name: 'isBuy', type: 'bool', indexed: false },
        { name: 'orderType', type: 'uint8', indexed: false },
      ],
    },
    // OrderFilled
    {
      type: 'event',
      name: 'OrderFilled',
      inputs: [
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'tradeId', type: 'bytes32', indexed: true },
        { name: 'fillAmount', type: 'uint256', indexed: false },
        { name: 'fillPrice', type: 'uint256', indexed: false },
        { name: 'remainingAmount', type: 'uint256', indexed: false },
        { name: 'cumulativeFilled', type: 'uint256', indexed: false },
      ],
    },
    // OrderCancelled
    {
      type: 'event',
      name: 'OrderCancelled',
      inputs: [
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'maker', type: 'address', indexed: true },
        { name: 'remainingAmount', type: 'uint256', indexed: false },
        { name: 'reason', type: 'uint8', indexed: false },
      ],
    },
    // OrderExpired
    {
      type: 'event',
      name: 'OrderExpired',
      inputs: [
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'expiredAt', type: 'uint256', indexed: false },
      ],
    },
    // TradeExecuted
    {
      type: 'event',
      name: 'TradeExecuted',
      inputs: [
        { name: 'tradeId', type: 'bytes32', indexed: true },
        { name: 'takerOrderId', type: 'bytes32', indexed: true },
        { name: 'makerOrderId', type: 'bytes32', indexed: true },
        { name: 'taker', type: 'address', indexed: false },
        { name: 'maker', type: 'address', indexed: false },
        { name: 'marketId', type: 'bytes32', indexed: false },
        { name: 'price', type: 'uint256', indexed: false },
        { name: 'amount', type: 'uint256', indexed: false },
        { name: 'quoteAmount', type: 'uint256', indexed: false },
        { name: 'takerFee', type: 'uint256', indexed: false },
        { name: 'makerFee', type: 'uint256', indexed: false },
        { name: 'timestamp', type: 'uint256', indexed: false },
        { name: 'takerIsBuy', type: 'bool', indexed: false },
      ],
    },
    // MarketCreated
    {
      type: 'event',
      name: 'MarketCreated',
      inputs: [
        { name: 'marketId', type: 'bytes32', indexed: true },
        { name: 'baseToken', type: 'address', indexed: true },
        { name: 'baseTokenId', type: 'uint256', indexed: false },
        { name: 'quoteToken', type: 'address', indexed: true },
      ],
    },
  ],

  // OrderMatchingFacet - Order matching logic (internal, called by OrderRouterFacet)
  OrderMatchingFacet: [
    {
      type: 'function',
      name: 'matchOrder',
      inputs: [
        { name: 'orderId', type: 'bytes32' },
        { name: 'marketId', type: 'bytes32' },
        { name: 'baseToken', type: 'address' },
        { name: 'baseTokenId', type: 'uint256' },
        { name: 'quoteToken', type: 'address' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'cancelOrderInternal',
      inputs: [
        { name: 'orderId', type: 'bytes32' },
        { name: 'reason', type: 'uint8' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    // Events
    {
      type: 'event',
      name: 'OrderFilled',
      inputs: [
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'tradeId', type: 'bytes32', indexed: true },
        { name: 'fillAmount', type: 'uint256', indexed: false },
        { name: 'fillPrice', type: 'uint256', indexed: false },
        { name: 'remainingAmount', type: 'uint256', indexed: false },
        { name: 'cumulativeFilled', type: 'uint256', indexed: false },
      ],
    },
    {
      type: 'event',
      name: 'TradeExecuted',
      inputs: [
        { name: 'tradeId', type: 'bytes32', indexed: true },
        { name: 'takerOrderId', type: 'bytes32', indexed: true },
        { name: 'makerOrderId', type: 'bytes32', indexed: true },
        { name: 'price', type: 'uint256', indexed: false },
        { name: 'amount', type: 'uint256', indexed: false },
        { name: 'quoteAmount', type: 'uint256', indexed: false },
      ],
    },
    {
      type: 'event',
      name: 'OrderCancelled',
      inputs: [
        { name: 'orderId', type: 'bytes32', indexed: true },
        { name: 'maker', type: 'address', indexed: true },
        { name: 'remainingAmount', type: 'uint256', indexed: false },
        { name: 'reason', type: 'uint8', indexed: false },
      ],
    },
  ],
};

// =============================================================================
// HELPER FUNCTIONS - Extract selectors from ABI
// =============================================================================

import { ethers } from 'ethers';

/**
 * Compute function selector from ABI fragment
 */
export function computeSelector(fragment: ABIFunction): string {
  const types = fragment.inputs.map((i) => i.type).join(',');
  const signature = `${fragment.name}(${types})`;
  return ethers.id(signature).slice(0, 10);
}

/**
 * Get all function selectors for a facet from its ABI
 */
export function getFacetSelectors(facetName: string): string[] {
  const abi = FACET_ABI[facetName];
  if (!abi) return [];

  return abi
    .filter((f): f is ABIFunction => f.type === 'function')
    .map((f) => computeSelector(f));
}

/**
 * Get the full ABI for a facet (for frontend use)
 */
export function getFacetABI(facetName: string): ABIFragment[] {
  return FACET_ABI[facetName] || [];
}

/**
 * Get combined ABI for multiple facets (for Diamond contract interactions)
 */
export function getCombinedABI(facetNames: string[]): ABIFragment[] {
  return facetNames.flatMap((name) => FACET_ABI[name] || []);
}

/**
 * Legacy FACET_SELECTORS - computed from FACET_ABI for backward compatibility
 * @deprecated Use getFacetSelectors() instead
 */
export const FACET_SELECTORS: Record<string, string[]> = Object.fromEntries(
  Object.keys(FACET_ABI).map((facetName) => [
    facetName,
    getFacetSelectors(facetName),
  ]),
);
