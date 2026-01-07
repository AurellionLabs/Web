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

  ERC1155ReceiverFacet: {
    name: 'ERC1155ReceiverFacet',
    contractName: 'ERC1155ReceiverFacet',
    category: 'facet',
    chainConstantKey: 'NEXT_PUBLIC_ERC1155_RECEIVER_FACET_ADDRESS',
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
    '0x2bef7fb5', // addSupportedAsset
    '0xa2444390', // deactivateNode
    '0x50c946fe', // getNode
    '0xc83f7ca4', // getNodeAssets
    '0xb59d3bea', // getOwnerNodes
    '0x3e691b1f', // getTotalNodeAssets
    '0x63584ecd', // getTotalNodes
    '0x506a17b2', // registerNode
    '0x641b8fc7', // updateNode
    '0xd9ff9ee4', // updateNodeCapacity
    '0xd24e25d3', // updateNodeLocation
    '0x4b1f5c70', // updateNodeOwner
    '0x16261e99', // updateNodeStatus
    '0x6766c717', // updateSupportedAssets
    // CLOB address functions (deprecated but kept for compatibility)
    '0xd1a69b35', // setClobAddress
    '0x0f392fb4', // getClobAddress
    '0xf7502631', // setAuraAssetAddress
    '0x89a1153c', // getAuraAssetAddress
    '0x40ed3118', // approveClobForTokens
    '0xe1ed5db1', // revokeClobApproval
    '0xcb24a4b4', // isClobApproved
    // Node sell order function (calls internal CLOBFacet)
    '0xbcd542d1', // placeSellOrderFromNode
    // Node token inventory functions
    '0x0a063811', // creditNodeTokens
    '0x250b58d4', // depositTokensToNode
    '0x86f99af0', // withdrawTokensFromNode
    '0xa3cb5b6e', // transferTokensBetweenNodes
    '0x4794010e', // debitNodeTokens
    '0x2159e90e', // getNodeTokenBalance
    '0x653a5887', // getNodeTokenIds
    '0xe02b8288', // getNodeInventory
    '0x294cc9d5', // verifyTokenAccounting
    '0x3c9f8a2d', // getNodeStatus (for AuraAsset compatibility)
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
    // Original market-based functions
    '0x2b3e8826', // createMarket
    '0x8707e031', // placeOrder (market-based)
    '0x5778472a', // getOrder
    '0xc3c95c7b', // getMarket
    '0xa3b13799', // getTrade
    '0xf6c00927', // getPool
    '0x81ebf209', // getTotalMarkets
    '0xebd34f50', // getTotalTrades
    // New token-based functions
    '0x631adcef', // placeNodeSellOrder - for node sell orders
    '0x069e403f', // placeBuyOrder - for buy orders
    '0x36f0b24d', // placeMarketOrder - for market orders (immediate execution)
    '0x5cc519cd', // cancelCLOBOrder - cancel any order
    '0x337cd847', // getOpenOrders - view open orders
    '0x882363ae', // getOrderWithTokens - get order with token info
  ],
  ERC1155ReceiverFacet: [
    '0xf23a6e61', // onERC1155Received
    '0xbc197c81', // onERC1155BatchReceived
    '0x01ffc9a7', // supportsInterface
  ],
};
