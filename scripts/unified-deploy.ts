#!/usr/bin/env npx ts-node
// @ts-nocheck - File with type issues that need deeper refactoring
/**
 * Unified Deployment Script
 *
 * Features:
 *   - Deploy contracts using predefined modes (full, diamond, rwy, etc.)
 *   - Deploy individual contracts
 *   - Smart facet upgrades with automatic selector detection
 *   - Dry run mode to preview changes
 *
 * Usage (set environment variables for options):
 *   DEPLOY_MODE=full npx hardhat run scripts/unified-deploy.ts --network baseSepolia
 *   DEPLOY_MODE=diamond npx hardhat run scripts/unified-deploy.ts --network baseSepolia
 *   DEPLOY_MODE=rwy npx hardhat run scripts/unified-deploy.ts --network baseSepolia
 *   DEPLOY_CONTRACT=RWYVault npx hardhat run scripts/unified-deploy.ts --network baseSepolia
 *   DEPLOY_FACET=NodesFacet npx hardhat run scripts/unified-deploy.ts --network baseSepolia
 *   DEPLOY_FACET=CLOBFacet DEPLOY_ACTION=replace npx hardhat run scripts/unified-deploy.ts --network baseSepolia
 *   DEPLOY_LIST_MODES=true npx hardhat run scripts/unified-deploy.ts --network baseSepolia
 *
 * Environment Variables:
 *   DEPLOY_MODE         Deploy using a predefined mode (full, diamond, rwy, bridge, standalone, all)
 *   DEPLOY_CONTRACT     Deploy a single contract by name
 *   DEPLOY_FACET        Deploy/update a single facet (auto-detects selector changes by default)
 *   DEPLOY_ACTION       For facets: auto (default - smart detection), add, replace, or remove
 *   DEPLOY_LIST_MODES   Set to 'true' to list all available deployment modes
 *   DEPLOY_LIST_CONTRACTS Set to 'true' to list all available contracts
 *   DEPLOY_DRY_RUN      Set to 'true' for dry run without deploying
 *   DEPLOY_SKIP_CONFIG  Set to 'true' to skip updating config files
 *
 * Smart Facet Upgrade (DEPLOY_ACTION=auto or omitted):
 *   When upgrading a facet, the script automatically:
 *   1. Queries the Diamond's on-chain state via DiamondLoupe
 *   2. Compares on-chain selectors with FACET_SELECTORS in deploy.config.ts
 *   3. Determines which selectors need to be added, replaced, or removed
 *   4. Executes a single diamondCut with all necessary changes
 *
 *   This prevents issues where:
 *   - New functions are added to a facet but not registered in Diamond
 *   - Selectors still point to old facet addresses after deployment
 *   - Removed functions leave orphaned selectors
 */

import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';
import {
  CONTRACTS,
  DEPLOYMENT_MODES,
  FACET_SELECTORS,
  DEPRECATED_SELECTORS,
  ContractConfig,
} from './deploy.config';

// =============================================================================
// TYPES
// =============================================================================

interface DeploymentResult {
  network: string;
  chainId: number;
  deployer: string;
  contracts: Record<string, { address: string; blockNumber: number }>;
  timestamp: string;
}

interface CLIArgs {
  mode?: string;
  contract?: string;
  facet?: string;
  action?: 'add' | 'replace' | 'remove' | 'auto';
  listModes?: boolean;
  listContracts?: boolean;
  dryRun?: boolean;
  skipConfig?: boolean;
}

// =============================================================================
// CLI ARGUMENT PARSING
// =============================================================================

function parseArgs(): CLIArgs {
  const args: CLIArgs = {};

  // Parse from environment variables (Hardhat doesn't pass CLI args well)
  if (process.env.DEPLOY_MODE) {
    args.mode = process.env.DEPLOY_MODE;
  }
  if (process.env.DEPLOY_CONTRACT) {
    args.contract = process.env.DEPLOY_CONTRACT;
  }
  if (process.env.DEPLOY_FACET) {
    args.facet = process.env.DEPLOY_FACET;
  }
  if (process.env.DEPLOY_ACTION) {
    args.action = process.env.DEPLOY_ACTION as
      | 'add'
      | 'replace'
      | 'remove'
      | 'auto';
  }
  if (process.env.DEPLOY_LIST_MODES === 'true') {
    args.listModes = true;
  }
  if (process.env.DEPLOY_LIST_CONTRACTS === 'true') {
    args.listContracts = true;
  }
  if (process.env.DEPLOY_DRY_RUN === 'true') {
    args.dryRun = true;
  }
  if (process.env.DEPLOY_SKIP_CONFIG === 'true') {
    args.skipConfig = true;
  }

  return args;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function printModes() {
  console.log('\n📋 Available Deployment Modes:\n');
  for (const [key, mode] of Object.entries(DEPLOYMENT_MODES)) {
    console.log(`  --mode ${key}`);
    console.log(`    ${mode.description}`);
    console.log(`    Contracts: ${mode.contracts.join(', ')}\n`);
  }
}

function printContracts() {
  console.log('\n📋 Available Contracts:\n');

  const categories = ['core', 'diamond', 'facet', 'standalone'] as const;

  for (const category of categories) {
    const contracts = Object.entries(CONTRACTS)
      .filter(([_, config]) => config.category === category)
      .map(([name]) => name);

    if (contracts.length > 0) {
      console.log(`  ${category.toUpperCase()}:`);
      contracts.forEach((name) => console.log(`    - ${name}`));
      console.log('');
    }
  }
}

async function getDeploymentBlock(tx: any): Promise<number> {
  try {
    const receipt = await tx.wait(1);
    return receipt.blockNumber;
  } catch {
    return await ethers.provider.getBlockNumber();
  }
}

async function waitForConfirmations(tx: any, confirmations: number = 2) {
  try {
    console.log(`  Waiting for ${confirmations} confirmations...`);
    await tx.wait(confirmations);
    console.log('  ✓ Confirmed');
  } catch {
    console.warn('  Warning: Could not wait for all confirmations');
  }
}

// =============================================================================
// CHAIN CONSTANTS UPDATE
// =============================================================================

function updateChainConstants(
  deployment: DeploymentResult,
  existingAddresses: Record<string, string>,
) {
  const constantsPath = path.resolve('./chain-constants.ts');

  if (!fs.existsSync(constantsPath)) {
    console.warn('⚠️  chain-constants.ts not found, creating new file');
  }

  // Read existing content or use template
  let content = fs.existsSync(constantsPath)
    ? fs.readFileSync(constantsPath, 'utf-8')
    : '';

  // Merge new addresses with existing
  const allAddresses = { ...existingAddresses };
  for (const [name, data] of Object.entries(deployment.contracts)) {
    const config = CONTRACTS[name];
    if (config?.chainConstantKey) {
      allAddresses[config.chainConstantKey] = data.address;
    }
  }

  // Build deployment blocks
  const deploymentBlocks: Record<string, number> = {};
  for (const [name, data] of Object.entries(deployment.contracts)) {
    const config = CONTRACTS[name];
    if (config?.indexerConfig?.startBlockKey) {
      deploymentBlocks[config.indexerConfig.startBlockKey] = data.blockNumber;
    }
  }

  // Update or create each constant
  for (const [key, value] of Object.entries(allAddresses)) {
    const regex = new RegExp(
      `export const ${key}\\s*=\\s*['"][^'"]*['"];?`,
      'm',
    );
    const newLine = `export const ${key} =\n  '${value}';`;

    if (regex.test(content)) {
      content = content.replace(regex, newLine);
    } else {
      // Find the right section to insert
      const sectionMarker = key.includes('DIAMOND')
        ? '// =============================================================================\n// EIP-2535 DIAMOND CONTRACTS'
        : key.includes('RWY')
          ? '// RWY Vault'
          : '// =============================================================================\n// CONTRACT ADDRESSES';

      const insertIndex = content.indexOf(sectionMarker);
      if (insertIndex === -1) {
        // Append to end of contract addresses section
        content += `\n${newLine}\n`;
      }
    }
  }

  // Update DEPLOYMENT_BLOCKS
  const existingBlocksMatch = content.match(
    /export const DEPLOYMENT_BLOCKS = \{([\s\S]*?)\};/,
  );
  let existingBlocks: Record<string, number> = {};

  if (existingBlocksMatch) {
    // Parse existing blocks
    const blocksContent = existingBlocksMatch[1];
    const blockLines = blocksContent.match(/(\w+):\s*(\d+)/g) || [];
    for (const line of blockLines) {
      const [key, value] = line.split(':').map((s) => s.trim());
      existingBlocks[key] = parseInt(value);
    }
  }

  // Merge with new blocks
  const mergedBlocks = { ...existingBlocks, ...deploymentBlocks };
  const blocksString = Object.entries(mergedBlocks)
    .map(([key, value]) => `  ${key}: ${value},`)
    .join('\n');

  const newBlocksSection = `export const DEPLOYMENT_BLOCKS = {\n${blocksString}\n};`;

  if (existingBlocksMatch) {
    content = content.replace(
      /export const DEPLOYMENT_BLOCKS = \{[\s\S]*?\};/,
      newBlocksSection,
    );
  } else {
    content += `\n\n${newBlocksSection}\n`;
  }

  // Update header timestamp
  const timestampRegex = /\/\/ Deployed: .*/;
  const newTimestamp = `// Deployed: ${deployment.timestamp}`;
  if (timestampRegex.test(content)) {
    content = content.replace(timestampRegex, newTimestamp);
  }

  fs.writeFileSync(constantsPath, content);
  console.log('✅ Updated chain-constants.ts');
}

// =============================================================================
// INDEXER CONFIG UPDATE
// =============================================================================

function updateIndexerConfig(deployment: DeploymentResult) {
  // Update diamond-constants.ts
  const diamondConstantsPath = path.resolve('./indexer/diamond-constants.ts');

  if (deployment.contracts.Diamond) {
    const content = `// Diamond contract constants for the Ponder indexer
// Auto-updated by unified-deploy.ts script
// Last updated: ${deployment.timestamp}

export const DIAMOND_ADDRESS: \`0x\${string}\` =
  '${deployment.contracts.Diamond.address}';

export const DIAMOND_DEPLOY_BLOCK = ${deployment.contracts.Diamond.blockNumber};
`;
    fs.writeFileSync(diamondConstantsPath, content);
    console.log('✅ Updated indexer/diamond-constants.ts');
  }

  // Note: ponder.config.ts uses chain-constants.ts imports, so it auto-updates
  console.log('✅ Indexer will use updated chain-constants.ts');
}

// =============================================================================
// FRONTEND ABI GENERATION
// =============================================================================

function regenerateFrontendABI() {
  console.log('🔧 Regenerating frontend Diamond ABI...');

  try {
    // Import and run the generator
    const { FACET_ABI, ABIFragment } = require('./deploy.config');

    const FRONTEND_FACETS = [
      'CLOBFacet',
      'NodesFacet',
      'DiamondLoupeFacet',
      'OwnershipFacet',
      'ERC1155ReceiverFacet',
    ];

    // Collect all ABI fragments
    const combinedABI: any[] = [];
    const includedFunctions = new Set<string>();

    for (const facetName of FRONTEND_FACETS) {
      const facetABI = FACET_ABI[facetName];
      if (!facetABI) continue;

      for (const fragment of facetABI) {
        const key =
          fragment.type === 'function'
            ? `fn:${fragment.name}`
            : `ev:${fragment.name}`;
        if (!includedFunctions.has(key)) {
          includedFunctions.add(key);
          combinedABI.push(fragment);
        }
      }
    }

    // Generate TypeScript file
    const outputPath = path.resolve(
      './infrastructure/contracts/diamond-abi.generated.ts',
    );
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const output = `/**
 * Diamond Contract ABI - Auto-generated
 *
 * DO NOT EDIT THIS FILE DIRECTLY!
 * This file is generated from scripts/deploy.config.ts
 *
 * To regenerate:
 *   npx ts-node scripts/generate-diamond-abi.ts
 *
 * Generated: ${new Date().toISOString()}
 * Facets: ${FRONTEND_FACETS.join(', ')}
 */

import { ABIFragment } from '@/scripts/deploy.config';

export const DIAMOND_ABI: ABIFragment[] = ${JSON.stringify(combinedABI, null, 2)} as const;

// Export individual facet ABIs for selective imports
${FRONTEND_FACETS.map(
  (facet) =>
    `export const ${facet.toUpperCase()}_ABI = ${JSON.stringify(FACET_ABI[facet] || [], null, 2)} as const;`,
).join('\n\n')}

// Helper to get ABI as ethers-compatible format
export function getEthersABI(): any[] {
  return DIAMOND_ABI as any[];
}
`;

    fs.writeFileSync(outputPath, output);
    console.log(
      '✅ Generated frontend ABI: infrastructure/contracts/diamond-abi.generated.ts',
    );
  } catch (error: any) {
    console.warn(`⚠️  Could not regenerate frontend ABI: ${error.message}`);
  }
}

// =============================================================================
// DEPLOYMENT FUNCTIONS
// =============================================================================

async function deployContract(
  config: ContractConfig,
  addresses: Record<string, string>,
  deployer: string,
): Promise<{ address: string; blockNumber: number }> {
  console.log(`\n📦 Deploying ${config.name}...`);

  const Factory = await ethers.getContractFactory(config.contractName);

  // Get constructor args
  const args = config.constructorArgs
    ? config.constructorArgs(addresses, deployer)
    : [];

  if (args.length > 0) {
    console.log(`   Constructor args: ${JSON.stringify(args)}`);
  }

  const contract = await Factory.deploy(...args);
  await waitForConfirmations(contract.deploymentTransaction());

  const address = await contract.getAddress();
  const blockNumber = await getDeploymentBlock(
    contract.deploymentTransaction(),
  );

  console.log(`   ✓ ${config.name}: ${address} (block ${blockNumber})`);

  // Run post-deploy hook if exists
  if (config.postDeploy) {
    await config.postDeploy(contract, addresses, deployer);
  }

  return { address, blockNumber };
}

async function deployMode(
  modeName: string,
  dryRun: boolean = false,
): Promise<DeploymentResult> {
  const mode = DEPLOYMENT_MODES[modeName];
  if (!mode) {
    throw new Error(
      `Unknown deployment mode: ${modeName}. Use --list-modes to see available modes.`,
    );
  }

  console.log(`\n🚀 ${mode.name}`);
  console.log(`   ${mode.description}`);
  console.log(`   Contracts: ${mode.contracts.join(', ')}\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN - No contracts will be deployed\n');
    return {
      network: network.name,
      chainId: 0,
      deployer: '',
      contracts: {},
      timestamp: new Date().toISOString(),
    };
  }

  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(
    `Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`,
  );

  const addresses: Record<string, string> = {};
  const deployedContracts: Record<
    string,
    { address: string; blockNumber: number }
  > = {};

  // Deploy contracts in order (respecting dependencies)
  for (const contractName of mode.contracts) {
    const config = CONTRACTS[contractName];
    if (!config) {
      console.warn(`⚠️  Unknown contract: ${contractName}, skipping`);
      continue;
    }

    // Check dependencies
    if (config.dependencies) {
      for (const dep of config.dependencies) {
        if (!addresses[dep]) {
          throw new Error(
            `Dependency ${dep} not deployed yet for ${contractName}`,
          );
        }
      }
    }

    const result = await deployContract(config, addresses, deployer.address);
    addresses[contractName] = result.address;
    deployedContracts[contractName] = result;
  }

  // Handle Diamond facet installation if Diamond was deployed
  if (deployedContracts.Diamond && modeName.includes('diamond')) {
    await installFacetsToDiamond(addresses, deployedContracts);
  }

  // Post-deployment configuration
  await postDeploymentConfig(addresses, deployer.address);

  return {
    network: network.name,
    chainId,
    deployer: deployer.address,
    contracts: deployedContracts,
    timestamp: new Date().toISOString(),
  };
}

async function installFacetsToDiamond(
  addresses: Record<string, string>,
  deployedContracts: Record<string, { address: string; blockNumber: number }>,
) {
  console.log('\n⚙️  Installing facets to Diamond...\n');

  const diamondCut = await ethers.getContractAt(
    'IDiamondCut',
    addresses.Diamond,
  );

  const facetsToInstall = [
    'DiamondLoupeFacet',
    'OwnershipFacet',
    'NodesFacet',
    'AssetsFacet',
    'OrdersFacet',
    'StakingFacet',
    'BridgeFacet',
    'CLOBFacet',
  ];

  for (const facetName of facetsToInstall) {
    if (!addresses[facetName] || !FACET_SELECTORS[facetName]) continue;

    console.log(`   Adding ${facetName}...`);

    try {
      const tx = await diamondCut.diamondCut(
        [
          {
            facetAddress: addresses[facetName],
            action: 0, // Add
            functionSelectors: FACET_SELECTORS[facetName],
          },
        ],
        ethers.ZeroAddress,
        '0x',
      );
      await tx.wait();
      console.log(`   ✓ Added ${FACET_SELECTORS[facetName].length} selectors`);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log(`   ⚠️  Selectors already exist, trying replace...`);
        try {
          const tx = await diamondCut.diamondCut(
            [
              {
                facetAddress: addresses[facetName],
                action: 1, // Replace
                functionSelectors: FACET_SELECTORS[facetName],
              },
            ],
            ethers.ZeroAddress,
            '0x',
          );
          await tx.wait();
          console.log(
            `   ✓ Replaced ${FACET_SELECTORS[facetName].length} selectors`,
          );
        } catch {
          console.log(`   ⚠️  Could not replace selectors`);
        }
      } else {
        console.log(`   ⚠️  Error: ${error.message}`);
      }
    }
  }
}

async function postDeploymentConfig(
  addresses: Record<string, string>,
  deployer: string,
) {
  console.log('\n⚙️  Post-deployment configuration...\n');

  // Set NodeManager in AuSys if both exist
  if (addresses.AuSys && addresses.AurumNodeManager) {
    console.log('   Setting NodeManager in AuSys...');
    const auSys = await ethers.getContractAt('Ausys', addresses.AuSys);
    try {
      const tx = await auSys.setNodeManager(addresses.AurumNodeManager);
      await tx.wait();
      console.log('   ✓ NodeManager set');
    } catch (e: any) {
      console.log(`   ⚠️  Could not set NodeManager: ${e.message}`);
    }
  }

  // Add AuraAsset token to AurumNodeManager
  if (addresses.AurumNodeManager && addresses.AuraAsset) {
    console.log('   Adding AuraAsset to AurumNodeManager...');
    const nodeManager = await ethers.getContractAt(
      'AurumNodeManager',
      addresses.AurumNodeManager,
    );
    try {
      const tx = await nodeManager.addToken(addresses.AuraAsset);
      await tx.wait();
      console.log('   ✓ AuraAsset token added');
    } catch (e: any) {
      console.log(`   ⚠️  Could not add token: ${e.message}`);
    }
  }

  // CRITICAL: Set Diamond as NodeManager for AuraAsset
  // This allows AuraAsset.nodeMint() to validate the Diamond as a valid node
  if (addresses.Diamond && addresses.AuraAsset) {
    console.log('   Setting Diamond as NodeManager for AuraAsset...');
    const auraAsset = await ethers.getContractAt(
      'AuraAsset',
      addresses.AuraAsset,
    );
    try {
      // Check current NodeManager first
      let currentNodeManager: string | null = null;
      try {
        currentNodeManager = await auraAsset.NodeManager();
      } catch {
        // NodeManager getter might not exist
      }

      if (
        currentNodeManager &&
        currentNodeManager.toLowerCase() === addresses.Diamond.toLowerCase()
      ) {
        console.log('   ✓ Diamond is already the NodeManager');
      } else {
        const tx = await auraAsset.setNodeManager(addresses.Diamond);
        await tx.wait();
        console.log('   ✓ Diamond set as NodeManager for AuraAsset');
      }

      // Verify the configuration works
      const diamond = await ethers.getContractAt(
        'NodesFacet',
        addresses.Diamond,
      );
      try {
        const status = await diamond.getNodeStatus(addresses.Diamond);
        if (status === '0x01') {
          console.log(
            '   ✓ Verified: Diamond returns status 1 (valid node) for itself',
          );
        } else {
          console.log(
            `   ⚠️  Diamond.getNodeStatus(Diamond) returned: ${status}`,
          );
        }
      } catch (e: any) {
        console.log(`   ⚠️  Could not verify getNodeStatus: ${e.message}`);
      }
    } catch (e: any) {
      console.log(`   ⚠️  Could not set Diamond as NodeManager: ${e.message}`);
      console.log(
        `      You may need to run: npx hardhat run scripts/set-aura-asset-node-manager.ts --network baseSepolia`,
      );
    }
  }

  // Set AuraAsset address in Diamond's NodesFacet storage
  if (addresses.Diamond && addresses.AuraAsset) {
    console.log('   Setting AuraAsset address in Diamond...');
    const diamond = await ethers.getContractAt('NodesFacet', addresses.Diamond);
    try {
      const tx = await diamond.setAuraAssetAddress(addresses.AuraAsset);
      await tx.wait();
      console.log('   ✓ AuraAsset address set in Diamond');
    } catch (e: any) {
      // Might already be set or function might not exist
      if (!e.message.includes('already set')) {
        console.log(`   ⚠️  Could not set AuraAsset address: ${e.message}`);
      }
    }
  }
}

async function deploySingleContract(
  contractName: string,
  dryRun: boolean = false,
): Promise<DeploymentResult> {
  const config = CONTRACTS[contractName];
  if (!config) {
    throw new Error(
      `Unknown contract: ${contractName}. Use --list-contracts to see available contracts.`,
    );
  }

  console.log(`\n🚀 Deploying single contract: ${contractName}\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN - Contract will not be deployed\n');
    return {
      network: network.name,
      chainId: 0,
      deployer: '',
      contracts: {},
      timestamp: new Date().toISOString(),
    };
  }

  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(
    `Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`,
  );

  // Load existing addresses from chain-constants.ts
  const existingAddresses = loadExistingAddresses();

  // Check dependencies
  if (config.dependencies) {
    for (const dep of config.dependencies) {
      const depConfig = CONTRACTS[dep];
      if (
        depConfig?.chainConstantKey &&
        !existingAddresses[depConfig.chainConstantKey]
      ) {
        console.warn(`⚠️  Dependency ${dep} not found in chain-constants.ts`);
        console.warn(
          `   You may need to deploy it first or the deployment may fail.`,
        );
      }
    }
  }

  // Map existing addresses to contract names
  const addresses: Record<string, string> = {};
  for (const [name, cfg] of Object.entries(CONTRACTS)) {
    if (cfg.chainConstantKey && existingAddresses[cfg.chainConstantKey]) {
      addresses[name] = existingAddresses[cfg.chainConstantKey];
    }
  }

  const result = await deployContract(config, addresses, deployer.address);

  // Add the new contract to addresses for post-deployment config
  addresses[contractName] = result.address;

  // Run post-deployment configuration (sets NodeManager, etc.)
  await postDeploymentConfig(addresses, deployer.address);

  return {
    network: network.name,
    chainId,
    deployer: deployer.address,
    contracts: { [contractName]: result },
    timestamp: new Date().toISOString(),
  };
}

function loadExistingAddresses(): Record<string, string> {
  const constantsPath = path.resolve('./chain-constants.ts');
  const addresses: Record<string, string> = {};

  if (!fs.existsSync(constantsPath)) return addresses;

  const content = fs.readFileSync(constantsPath, 'utf-8');
  const regex = /export const (NEXT_PUBLIC_\w+)\s*=\s*['"]([^'"]+)['"]/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    addresses[match[1]] = match[2];
  }

  return addresses;
}

/**
 * Analyzes on-chain Diamond state to determine which selectors need to be added, replaced, or removed
 */
async function analyzeSelectorsForFacet(
  diamondAddress: string,
  facetName: string,
  newFacetAddress: string,
): Promise<{
  toAdd: string[];
  toReplace: string[];
  toRemove: string[];
  unchanged: string[];
  existingFacetAddress: string | null;
}> {
  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    diamondAddress,
  );
  const configSelectors = FACET_SELECTORS[facetName] || [];

  const toAdd: string[] = [];
  const toReplace: string[] = [];
  const toRemove: string[] = [];
  const unchanged: string[] = [];

  // Get all facets and their selectors from the Diamond
  const facets = await diamondLoupe.facets();
  const existingSelectorsMap = new Map<string, string>(); // selector -> facetAddress

  for (const facet of facets) {
    for (const selector of facet.functionSelectors) {
      existingSelectorsMap.set(
        selector.toLowerCase(),
        facet.facetAddress.toLowerCase(),
      );
    }
  }

  // Get the existing facet address from chain-constants (if any)
  const existingAddresses = loadExistingAddresses();
  const existingFacetAddress =
    existingAddresses[CONTRACTS[facetName]?.chainConstantKey || ''] || null;

  // Analyze each selector in our config
  for (const selector of configSelectors) {
    const normalizedSelector = selector.toLowerCase();
    const existingFacet = existingSelectorsMap.get(normalizedSelector);

    if (!existingFacet) {
      // Selector doesn't exist in Diamond - needs to be added
      toAdd.push(selector);
    } else if (
      newFacetAddress !== ethers.ZeroAddress &&
      existingFacet !== newFacetAddress.toLowerCase()
    ) {
      // Selector exists but points to different facet - needs to be replaced
      toReplace.push(selector);
    } else if (existingFacet === newFacetAddress.toLowerCase()) {
      // Selector already points to our new facet - no change needed
      unchanged.push(selector);
    } else {
      // In dry-run mode (newFacetAddress is ZeroAddress), treat existing selectors as needing replacement
      // since we'll be deploying a new facet
      toReplace.push(selector);
    }
  }

  // Check for selectors that exist in Diamond for this facet but aren't in our config
  // (This would indicate selectors that should be removed)
  if (existingFacetAddress) {
    for (const [selector, facetAddr] of existingSelectorsMap) {
      if (
        facetAddr === existingFacetAddress.toLowerCase() &&
        !configSelectors.map((s) => s.toLowerCase()).includes(selector)
      ) {
        toRemove.push(selector);
      }
    }
  }

  return { toAdd, toReplace, toRemove, unchanged, existingFacetAddress };
}

/**
 * Find deprecated selectors that are currently active in the Diamond
 * These should be automatically removed during any facet upgrade
 */
async function findActiveDeprecatedSelectors(
  diamondAddress: string,
): Promise<{ selector: string; functionName: string; reason: string }[]> {
  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    diamondAddress,
  );

  const activeDeprecated: {
    selector: string;
    functionName: string;
    reason: string;
  }[] = [];

  // Get all selectors from the Diamond
  const facets = await diamondLoupe.facets();
  const existingSelectors = new Set<string>();

  for (const facet of facets) {
    for (const selector of facet.functionSelectors) {
      existingSelectors.add(selector.toLowerCase());
    }
  }

  // Check each deprecated selector
  for (const deprecated of DEPRECATED_SELECTORS) {
    // Compute selector from function signature if not provided
    let selector = deprecated.selector;
    if (selector === '0x' || !selector.startsWith('0x')) {
      // We need to compute it - for now, we'll use the function name
      // In production, this should be computed from the full signature
      // For the known deprecated functions, we can hardcode them:
      const knownSelectors: Record<string, string> = {
        // placeNodeSellOrder(address,address,uint256,address,uint256,uint256)
        placeNodeSellOrder: '0x', // Will be computed
        // placeBuyOrder(address,uint256,address,uint256,uint256)
        placeBuyOrder: '0x',
        // placeOrder(bytes32,uint256,uint256,bool,uint8)
        placeOrder: '0x',
      };
      selector = knownSelectors[deprecated.functionName] || '0x';
    }

    if (selector !== '0x' && existingSelectors.has(selector.toLowerCase())) {
      activeDeprecated.push({
        selector,
        functionName: deprecated.functionName,
        reason: deprecated.reason,
      });
    }
  }

  return activeDeprecated;
}

/**
 * Remove deprecated selectors from the Diamond
 */
async function removeDeprecatedSelectors(
  diamondAddress: string,
  dryRun: boolean = false,
): Promise<string[]> {
  console.log('\n🔍 Checking for deprecated selectors...\n');

  const activeDeprecated = await findActiveDeprecatedSelectors(diamondAddress);

  if (activeDeprecated.length === 0) {
    console.log('   ✓ No deprecated selectors found in Diamond\n');
    return [];
  }

  console.log(
    `   ⚠️  Found ${activeDeprecated.length} deprecated selector(s):\n`,
  );
  for (const dep of activeDeprecated) {
    console.log(`      ${dep.functionName} (${dep.selector})`);
    console.log(`         Reason: ${dep.reason}\n`);
  }

  if (dryRun) {
    console.log('   [DRY RUN] Would remove these deprecated selectors\n');
    return activeDeprecated.map((d) => d.selector);
  }

  // Execute diamond cut to remove deprecated selectors
  const diamondCut = await ethers.getContractAt('IDiamondCut', diamondAddress);

  const facetCuts = [
    {
      facetAddress: ethers.ZeroAddress,
      action: 2, // Remove
      functionSelectors: activeDeprecated.map((d) => d.selector),
    },
  ];

  console.log('   Removing deprecated selectors...');
  const tx = await diamondCut.diamondCut(facetCuts, ethers.ZeroAddress, '0x');
  await tx.wait();
  console.log('   ✓ Deprecated selectors removed\n');

  return activeDeprecated.map((d) => d.selector);
}

async function updateFacet(
  facetName: string,
  action: 'add' | 'replace' | 'remove' | 'auto',
  dryRun: boolean = false,
): Promise<DeploymentResult> {
  const config = CONTRACTS[facetName];
  if (!config || config.category !== 'facet') {
    throw new Error(
      `${facetName} is not a valid facet. Use --list-contracts to see available facets.`,
    );
  }

  console.log(`\n🚀 ${action.toUpperCase()} Facet: ${facetName}\n`);

  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const existingAddresses = loadExistingAddresses();

  const diamondAddress = existingAddresses['NEXT_PUBLIC_DIAMOND_ADDRESS'];
  if (
    !diamondAddress ||
    diamondAddress === '0x0000000000000000000000000000000000000000'
  ) {
    throw new Error(
      'Diamond address not found in chain-constants.ts. Deploy Diamond first.',
    );
  }

  console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Diamond: ${diamondAddress}\n`);

  const selectors = FACET_SELECTORS[facetName];
  if (!selectors || selectors.length === 0) {
    throw new Error(`No selectors defined for ${facetName}`);
  }

  let facetAddress = ethers.ZeroAddress;
  let blockNumber = 0;

  // Deploy new facet if not removing
  if (action !== 'remove') {
    console.log(`📦 Deploying new ${facetName}...`);

    if (dryRun) {
      console.log('   [DRY RUN] Would deploy facet contract\n');
      facetAddress = '0x' + '0'.repeat(40);
    } else {
      const Factory = await ethers.getContractFactory(config.contractName);
      const facet = await Factory.deploy();
      await waitForConfirmations(facet.deploymentTransaction());
      facetAddress = await facet.getAddress();
      blockNumber = await getDeploymentBlock(facet.deploymentTransaction());
      console.log(
        `   ✓ ${facetName}: ${facetAddress} (block ${blockNumber})\n`,
      );
    }
  }

  // If action is 'auto', analyze and perform smart update
  if (action === 'auto') {
    // First, check for and remove any deprecated selectors
    await removeDeprecatedSelectors(diamondAddress, dryRun);

    console.log('🔍 Analyzing on-chain selector state...\n');

    const analysis = await analyzeSelectorsForFacet(
      diamondAddress,
      facetName,
      facetAddress,
    );

    if (analysis.existingFacetAddress) {
      console.log(`   Current facet address: ${analysis.existingFacetAddress}`);
    }
    console.log(`   New facet address:     ${facetAddress}`);
    console.log('');
    console.log(`   Selectors to ADD:     ${analysis.toAdd.length}`);
    console.log(`   Selectors to REPLACE: ${analysis.toReplace.length}`);
    console.log(`   Selectors to REMOVE:  ${analysis.toRemove.length}`);
    console.log(`   Selectors unchanged:  ${analysis.unchanged.length}\n`);

    if (
      analysis.toAdd.length === 0 &&
      analysis.toReplace.length === 0 &&
      analysis.toRemove.length === 0
    ) {
      console.log(
        '✅ All selectors already point to correct facet. No changes needed.\n',
      );
      return {
        network: network.name,
        chainId,
        deployer: deployer.address,
        contracts: {},
        timestamp: new Date().toISOString(),
      };
    }

    if (dryRun) {
      console.log('🔍 DRY RUN - Would perform the following diamond cuts:\n');
      if (analysis.toAdd.length > 0) {
        console.log(`   ADD ${analysis.toAdd.length} selectors:`);
        analysis.toAdd.forEach((s) => console.log(`      ${s}`));
      }
      if (analysis.toReplace.length > 0) {
        console.log(`   REPLACE ${analysis.toReplace.length} selectors:`);
        analysis.toReplace.forEach((s) => console.log(`      ${s}`));
      }
      if (analysis.toRemove.length > 0) {
        console.log(`   REMOVE ${analysis.toRemove.length} selectors:`);
        analysis.toRemove.forEach((s) => console.log(`      ${s}`));
      }
      console.log('');
      return {
        network: network.name,
        chainId: 0,
        deployer: '',
        contracts: {},
        timestamp: new Date().toISOString(),
      };
    }

    const diamondCut = await ethers.getContractAt(
      'IDiamondCut',
      diamondAddress,
    );
    const facetCuts: Array<{
      facetAddress: string;
      action: number;
      functionSelectors: string[];
    }> = [];

    // Build facet cuts array
    // Order matters: Remove first, then Replace, then Add
    // This prevents "selector already exists" errors

    if (analysis.toRemove.length > 0) {
      facetCuts.push({
        facetAddress: ethers.ZeroAddress,
        action: 2, // Remove
        functionSelectors: analysis.toRemove,
      });
    }

    if (analysis.toReplace.length > 0) {
      facetCuts.push({
        facetAddress: facetAddress,
        action: 1, // Replace
        functionSelectors: analysis.toReplace,
      });
    }

    if (analysis.toAdd.length > 0) {
      facetCuts.push({
        facetAddress: facetAddress,
        action: 0, // Add
        functionSelectors: analysis.toAdd,
      });
    }

    // Execute all cuts in a single transaction
    console.log('⚙️  Performing diamondCut with smart selector updates...');
    console.log('   Facet cuts to execute:');
    for (const cut of facetCuts) {
      const actionName =
        cut.action === 0 ? 'Add' : cut.action === 1 ? 'Replace' : 'Remove';
      console.log(
        `   - ${actionName}: ${cut.functionSelectors.length} selectors to ${cut.facetAddress}`,
      );
      cut.functionSelectors.forEach((s) => console.log(`     ${s}`));
    }

    try {
      const tx = await diamondCut.diamondCut(
        facetCuts,
        ethers.ZeroAddress,
        '0x',
      );
      await tx.wait();
    } catch (error: any) {
      console.error('   Diamond cut failed:', error.message);
      // Try executing cuts one at a time to find the problematic one
      console.log('   Attempting individual cuts to identify issue...');
      for (const cut of facetCuts) {
        try {
          const actionName =
            cut.action === 0 ? 'Add' : cut.action === 1 ? 'Replace' : 'Remove';
          console.log(`   Trying ${actionName} cut...`);
          const singleTx = await diamondCut.diamondCut(
            [cut],
            ethers.ZeroAddress,
            '0x',
          );
          await singleTx.wait();
          console.log(`   ✓ ${actionName} succeeded`);
        } catch (singleError: any) {
          console.error(
            `   ✗ ${cut.action === 0 ? 'Add' : cut.action === 1 ? 'Replace' : 'Remove'} failed:`,
            singleError.message,
          );
        }
      }
      throw error;
    }

    console.log('   ✓ Diamond cut completed successfully');
    if (analysis.toAdd.length > 0) {
      console.log(`   ✓ Added ${analysis.toAdd.length} new selectors`);
    }
    if (analysis.toReplace.length > 0) {
      console.log(`   ✓ Replaced ${analysis.toReplace.length} selectors`);
    }
    if (analysis.toRemove.length > 0) {
      console.log(`   ✓ Removed ${analysis.toRemove.length} selectors`);
    }
    console.log('');

    return {
      network: network.name,
      chainId,
      deployer: deployer.address,
      contracts: { [facetName]: { address: facetAddress, blockNumber } },
      timestamp: new Date().toISOString(),
    };
  }

  // Manual action mode (add/replace/remove)
  if (dryRun) {
    console.log(`🔍 DRY RUN - Would ${action} ${selectors.length} selectors\n`);
    return {
      network: network.name,
      chainId: 0,
      deployer: '',
      contracts: {},
      timestamp: new Date().toISOString(),
    };
  }

  const diamondCut = await ethers.getContractAt('IDiamondCut', diamondAddress);
  const actionCode = action === 'add' ? 0 : action === 'replace' ? 1 : 2;

  console.log(`⚙️  Performing diamondCut (${action})...`);
  const tx = await diamondCut.diamondCut(
    [
      {
        facetAddress: action === 'remove' ? ethers.ZeroAddress : facetAddress,
        action: actionCode,
        functionSelectors: selectors,
      },
    ],
    ethers.ZeroAddress,
    '0x',
  );
  await tx.wait();
  console.log(
    `   ✓ ${action === 'remove' ? 'Removed' : 'Updated'} ${selectors.length} selectors\n`,
  );

  return {
    network: network.name,
    chainId,
    deployer: deployer.address,
    contracts:
      action !== 'remove'
        ? { [facetName]: { address: facetAddress, blockNumber } }
        : {},
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = parseArgs();

  // Handle list commands
  if (args.listModes) {
    printModes();
    return;
  }

  if (args.listContracts) {
    printContracts();
    return;
  }

  // Validate args
  if (!args.mode && !args.contract && !args.facet) {
    console.log('\n❌ No deployment target specified.\n');
    console.log('Usage:');
    console.log('  --mode <name>       Deploy using a predefined mode');
    console.log('  --contract <name>   Deploy a single contract');
    console.log(
      '  --facet <name>      Deploy/update a facet (auto-detects selector changes)',
    );
    console.log(
      '  --action <action>   For facets: auto (default), add, replace, or remove',
    );
    console.log('  --list-modes        List all available deployment modes');
    console.log('  --list-contracts    List all available contracts');
    console.log('  --dry-run           Show what would be deployed');
    console.log('  --skip-config       Skip updating config files\n');
    console.log('Examples:');
    console.log(
      '  DEPLOY_FACET=NodesFacet npx hardhat run scripts/unified-deploy.ts --network baseSepolia',
    );
    console.log('    → Auto-detects which selectors need add/replace/remove\n');
    console.log(
      '  DEPLOY_FACET=CLOBFacet DEPLOY_ACTION=replace npx hardhat run scripts/unified-deploy.ts --network baseSepolia',
    );
    console.log('    → Forces replace of all selectors\n');
    printModes();
    return;
  }

  let deployment: DeploymentResult;

  if (args.facet) {
    // Default to 'auto' if no action specified - smart selector detection
    const action = args.action || 'auto';
    deployment = await updateFacet(args.facet, action, args.dryRun);
  } else if (args.contract) {
    deployment = await deploySingleContract(args.contract, args.dryRun);
  } else if (args.mode) {
    deployment = await deployMode(args.mode, args.dryRun);
  } else {
    throw new Error('Invalid arguments');
  }

  // Skip config updates if dry run or explicitly skipped
  if (args.dryRun || args.skipConfig) {
    console.log('\n⏭️  Skipping config file updates\n');
  } else if (Object.keys(deployment.contracts).length > 0) {
    // Save deployment JSON
    const deploymentsDir = path.resolve('./deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const filename = `${network.name}-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(deploymentsDir, filename),
      JSON.stringify(deployment, null, 2),
    );
    fs.writeFileSync(
      path.join(deploymentsDir, `${network.name}-latest.json`),
      JSON.stringify(deployment, null, 2),
    );
    console.log(`\n📄 Deployment saved to: deployments/${filename}`);

    // Update config files
    console.log('\n📝 Updating configuration files...\n');
    const existingAddresses = loadExistingAddresses();
    updateChainConstants(deployment, existingAddresses);
    updateIndexerConfig(deployment);

    // Regenerate frontend ABI if any facets were deployed
    const deployedFacets = Object.keys(deployment.contracts).filter((name) =>
      name.endsWith('Facet'),
    );
    if (deployedFacets.length > 0) {
      regenerateFrontendABI();
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 DEPLOYMENT COMPLETE!');
  console.log('='.repeat(60));
  console.log(
    `\nNetwork: ${deployment.network} (Chain ID: ${deployment.chainId})`,
  );
  console.log(`Deployer: ${deployment.deployer}`);
  console.log('\nDeployed Contracts:');
  for (const [name, data] of Object.entries(deployment.contracts)) {
    console.log(`  ${name}: ${data.address} (block ${data.blockNumber})`);
  }
  console.log('\n' + '='.repeat(60) + '\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  });
