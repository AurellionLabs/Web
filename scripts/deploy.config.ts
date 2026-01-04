/**
 * Unified Deployment Configuration
 *
 * This file defines all deployable contracts and their configuration.
 * Add new contracts here to include them in the deployment system.
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

export interface DeploymentMode {
  name: string;
  description: string;
  contracts: string[]; // Contract names to deploy
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
    postDeploy: async (contract, _, deployer) => {
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

  // Diamond itself
  Diamond: {
    name: 'Diamond',
    contractName: 'Diamond',
    category: 'diamond',
    dependencies: ['DiamondCutFacet'],
    constructorArgs: (addresses, deployer) => [
      deployer,
      addresses.DiamondCutFacet,
    ],
    chainConstantKey: 'NEXT_PUBLIC_DIAMOND_ADDRESS',
  },
};

// =============================================================================
// DEPLOYMENT MODES
// =============================================================================

export const DEPLOYMENT_MODES: Record<string, DeploymentMode> = {
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
// FACET SELECTORS (for Diamond operations)
// =============================================================================

export const FACET_SELECTORS: Record<string, string[]> = {
  DiamondCutFacet: ['0x1f931c1c'],
  DiamondLoupeFacet: [
    '0xcdffacc6',
    '0x52ef6b2c',
    '0xadfca15e',
    '0x7a0ed627',
    '0x49e56145',
  ],
  OwnershipFacet: [
    '0x79ba5097',
    '0xc4d66de8',
    '0x8da5cb5b',
    '0x715018a6',
    '0xf2fde38b',
  ],
  NodesFacet: [
    '0x2bef7fb5',
    '0xa2444390',
    '0x50c946fe',
    '0xc83f7ca4',
    '0xb59d3bea',
    '0x3e691b1f',
    '0x63584ecd',
    '0x506a17b2',
    '0x641b8fc7',
    '0xd9ff9ee4',
    '0xd24e25d3',
    '0x4b1f5c70',
    '0x16261e99',
    '0x6766c717',
  ],
  AssetsFacet: [
    '0xe243b2fc',
    '0xb27221ca',
    '0xeac8f5b8',
    '0xef6fd2f0',
    '0x6e07302b',
  ],
  OrdersFacet: [
    '0x7489ec23',
    '0x02bd3421',
    '0xa45f2ebc',
    '0x5778472a',
    '0xe4cbac40',
    '0x375f16a7',
    '0x15914b3f',
  ],
  StakingFacet: [
    '0x372500ab',
    '0x008cc262',
    '0x7e1a3786',
    '0x7a766460',
    '0x0917e776',
    '0x5ade228a',
    '0x9e447fc6',
    '0xa694fc3a',
    '0x2e1a7d4d',
  ],
  BridgeFacet: [
    '0x20caf786',
    '0x6111ce0b',
    '0x5fc905ec',
    '0xe6598313',
    '0xd3ca8136',
    '0x46904840',
    '0xfef24e01',
    '0xd2d2e822',
    '0xe4d7d6dc',
    '0xe74b981b',
    '0x49085d8c',
    '0x158ed47c',
  ],
  CLOBFacet: [
    '0x2b3e8826',
    '0xb3d29d42',
    '0xc3c95c7b',
    '0xf6c00927',
    '0x81ebf209',
    '0xebd34f50',
    '0xa3b13799',
    '0x5e3f2727',
    '0xb537889c',
    '0x8707e031',
    '0x9fa5bc24',
  ],
};
