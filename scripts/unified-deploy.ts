#!/usr/bin/env npx ts-node
/**
 * Unified Deployment Script
 *
 * Usage (set environment variables for options):
 *   DEPLOY_MODE=full npx hardhat run scripts/unified-deploy.ts --network baseSepolia
 *   DEPLOY_MODE=diamond npx hardhat run scripts/unified-deploy.ts --network baseSepolia
 *   DEPLOY_MODE=rwy npx hardhat run scripts/unified-deploy.ts --network baseSepolia
 *   DEPLOY_CONTRACT=RWYVault npx hardhat run scripts/unified-deploy.ts --network baseSepolia
 *   DEPLOY_FACET=NodesFacet DEPLOY_ACTION=add npx hardhat run scripts/unified-deploy.ts --network baseSepolia
 *   DEPLOY_LIST_MODES=true npx hardhat run scripts/unified-deploy.ts --network baseSepolia
 *
 * Environment Variables:
 *   DEPLOY_MODE         Deploy using a predefined mode (full, diamond, rwy, bridge, standalone, all)
 *   DEPLOY_CONTRACT     Deploy a single contract by name
 *   DEPLOY_FACET        Deploy/update a single facet (requires DEPLOY_ACTION)
 *   DEPLOY_ACTION       For facets: add, replace, or remove
 *   DEPLOY_LIST_MODES   Set to 'true' to list all available deployment modes
 *   DEPLOY_LIST_CONTRACTS Set to 'true' to list all available contracts
 *   DEPLOY_DRY_RUN      Set to 'true' for dry run without deploying
 *   DEPLOY_SKIP_CONFIG  Set to 'true' to skip updating config files
 */

import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';
import {
  CONTRACTS,
  DEPLOYMENT_MODES,
  FACET_SELECTORS,
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
  action?: 'add' | 'replace' | 'remove';
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
    args.action = process.env.DEPLOY_ACTION as 'add' | 'replace' | 'remove';
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

async function updateFacet(
  facetName: string,
  action: 'add' | 'replace' | 'remove',
  dryRun: boolean = false,
): Promise<DeploymentResult> {
  const config = CONTRACTS[facetName];
  if (!config || config.category !== 'facet') {
    throw new Error(
      `${facetName} is not a valid facet. Use --list-contracts to see available facets.`,
    );
  }

  console.log(`\n🚀 ${action.toUpperCase()} Facet: ${facetName}\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN - Facet will not be deployed/updated\n');
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

  const diamondCut = await ethers.getContractAt('IDiamondCut', diamondAddress);
  const selectors = FACET_SELECTORS[facetName];

  if (!selectors || selectors.length === 0) {
    throw new Error(`No selectors defined for ${facetName}`);
  }

  let facetAddress = ethers.ZeroAddress;
  let blockNumber = 0;

  if (action !== 'remove') {
    // Deploy new facet
    console.log(`📦 Deploying new ${facetName}...`);
    const Factory = await ethers.getContractFactory(config.contractName);
    const facet = await Factory.deploy();
    await waitForConfirmations(facet.deploymentTransaction());
    facetAddress = await facet.getAddress();
    blockNumber = await getDeploymentBlock(facet.deploymentTransaction());
    console.log(`   ✓ ${facetName}: ${facetAddress} (block ${blockNumber})\n`);
  }

  // Perform diamond cut
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
      '  --facet <name>      Deploy/update a single facet (requires --action)',
    );
    console.log('  --list-modes        List all available deployment modes');
    console.log('  --list-contracts    List all available contracts');
    console.log('  --dry-run           Show what would be deployed');
    console.log('  --skip-config       Skip updating config files\n');
    printModes();
    return;
  }

  let deployment: DeploymentResult;

  if (args.facet) {
    if (!args.action) {
      throw new Error(
        '--action (add|replace|remove) is required when using --facet',
      );
    }
    deployment = await updateFacet(args.facet, args.action, args.dryRun);
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
