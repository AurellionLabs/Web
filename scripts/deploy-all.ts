import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface DeploymentInfo {
  name: string;
  address: string;
  deployBlock: number;
}

async function main() {
  console.log(`🚀 Starting comprehensive deployment...`);
  console.log(`==========================================\n`);

  // Get deployer
  const [deployer]: HardhatEthersSigner[] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);
  console.log(
    `Account balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`,
  );

  const deployments: DeploymentInfo[] = [];

  // Get current block for startBlock calculations
  const currentBlock = await deployer.provider.getBlockNumber();

  // =============================================================================
  // 1. Deploy Aura Token
  // =============================================================================
  console.log(`1️⃣  Deploying Aura Token...`);
  const AuraFactory = await ethers.getContractFactory('Aura');
  const auraToken = await AuraFactory.deploy();
  await auraToken.waitForDeployment();
  const auraTokenAddress = await auraToken.getAddress();
  const auraTokenBlock = await getDeploymentBlock(auraToken.deploymentTransaction(), deployer.provider);
  deployments.push({ name: 'auraToken', address: auraTokenAddress, deployBlock: auraTokenBlock });

  // Mint initial tokens
  const mintTx = await auraToken.mintTokenToTreasury(1000000);
  await mintTx.wait();
  console.log(`   ✓ Aura Token: ${auraTokenAddress} (block ${auraTokenBlock})`);
  console.log(`   ✓ Minted 1,000,000 AURA tokens\n`);

  // =============================================================================
  // 2. Deploy AuSys
  // =============================================================================
  console.log(`2️⃣  Deploying AuSys...`);
  const AuSysFactory = await ethers.getContractFactory('Ausys');
  const auSys = await AuSysFactory.deploy(auraTokenAddress);
  await auSys.waitForDeployment();
  const auSysAddress = await auSys.getAddress();
  const auSysBlock = await getDeploymentBlock(auSys.deploymentTransaction(), deployer.provider);
  deployments.push({ name: 'auSys', address: auSysAddress, deployBlock: auSysBlock });
  console.log(`   ✓ AuSys: ${auSysAddress} (block ${auSysBlock})\n`);

  // =============================================================================
  // 3. Deploy AurumNodeManager
  // =============================================================================
  console.log(`3️⃣  Deploying AurumNodeManager...`);
  const AurumNodeManagerFactory = await ethers.getContractFactory('AurumNodeManager');
  const aurumNodeManager = await AurumNodeManagerFactory.deploy(auSysAddress);
  await aurumNodeManager.waitForDeployment();
  const aurumNodeManagerAddress = await aurumNodeManager.getAddress();
  const aurumNodeManagerBlock = await getDeploymentBlock(
    aurumNodeManager.deploymentTransaction(),
    deployer.provider,
  );
  deployments.push({ name: 'aurumNodeManager', address: aurumNodeManagerAddress, deployBlock: aurumNodeManagerBlock });
  console.log(`   ✓ AurumNodeManager: ${aurumNodeManagerAddress} (block ${aurumNodeManagerBlock})\n`);

  // =============================================================================
  // 4. Deploy AuStake
  // =============================================================================
  console.log(`4️⃣  Deploying AuStake...`);
  const AuStakeFactory = await ethers.getContractFactory('AuStake');
  const auStake = await AuStakeFactory.deploy(deployer.address, deployer.address);
  await auStake.waitForDeployment();
  const auStakeAddress = await auStake.getAddress();
  const auStakeBlock = await getDeploymentBlock(auStake.deploymentTransaction(), deployer.provider);
  deployments.push({ name: 'auStake', address: auStakeAddress, deployBlock: auStakeBlock });
  console.log(`   ✓ AuStake: ${auStakeAddress} (block ${auStakeBlock})\n`);

  // =============================================================================
  // 5. Deploy AuraAsset
  // =============================================================================
  console.log(`5️⃣  Deploying AuraAsset...`);
  const AuraAssetFactory = await ethers.getContractFactory('AuraAsset');
  const auraAsset = await AuraAssetFactory.deploy(
    deployer.address, // initialOwner
    'https://your-metadata-uri.com/', // _uri for NFT metadata
    aurumNodeManagerAddress, // _NodeManager address
  );
  await auraAsset.waitForDeployment();
  const auraAssetAddress = await auraAsset.getAddress();
  const auraAssetBlock = await getDeploymentBlock(auraAsset.deploymentTransaction(), deployer.provider);
  deployments.push({ name: 'auraAsset', address: auraAssetAddress, deployBlock: auraAssetBlock });
  console.log(`   ✓ AuraAsset: ${auraAssetAddress} (block ${auraAssetBlock})\n`);

  // =============================================================================
  // 6. Deploy OrderBridge
  // =============================================================================
  console.log(`6️⃣  Deploying OrderBridge...`);
  const CLOB_ADDRESS = '0x2b9D42594Bb18FAFaA64FFEC4f5e69C8ac328aAc'; // Existing CLOB
  const QUOTE_TOKEN_ADDRESS = '0x79aF0Abc6A45b82A8cDd99C3b4b24f6f8A8Eb1F6'; // USDT on Base Sepolia

  const OrderBridgeFactory = await ethers.getContractFactory('OrderBridge');
  const orderBridge = await OrderBridgeFactory.deploy(CLOB_ADDRESS, auSysAddress, QUOTE_TOKEN_ADDRESS, deployer.address);
  await orderBridge.waitForDeployment();
  const orderBridgeAddress = await orderBridge.getAddress();
  const orderBridgeBlock = await getDeploymentBlock(orderBridge.deploymentTransaction(), deployer.provider);
  deployments.push({ name: 'orderBridge', address: orderBridgeAddress, deployBlock: orderBridgeBlock });
  console.log(`   ✓ OrderBridge: ${orderBridgeAddress} (block ${orderBridgeBlock})\n`);

  // =============================================================================
  // Post-deployment configurations
  // =============================================================================
  console.log(`⚙️  Running post-deployment configuration...\n`);

  // Add AuraAsset to AurumNodeManager
  console.log(`   Adding AuraAsset token to AurumNodeManager...`);
  await aurumNodeManager.addToken(auraAssetAddress);
  console.log(`   ✓ Token added\n`);

  // Add default classes
  const defaultClasses = ['GOAT', 'SHEEP', 'COW', 'CHICKEN', 'DUCK'];
  console.log(`   Adding default asset classes...`);
  for (const className of defaultClasses) {
    const tx = await auraAsset.addSupportedClass(className);
    await tx.wait();
    console.log(`   ✓ Added class: ${className}`);
  }
  console.log(``);

  // Add default AUGOAT asset
  const defaultAsset = {
    name: 'AUGOAT',
    assetClass: 'GOAT',
    attributes: [
      { name: 'weight', values: ['S', 'M', 'L'], description: 'A goats weight either S = 20 KG , M = 30 KG, L = 40KG' },
      { name: 'sex', values: ['M', 'F'], description: '' },
    ],
  };
  console.log(`   Adding default asset: AUGOAT...`);
  const addAssetTx = await auraAsset.addSupportedAsset(defaultAsset as any);
  await addAssetTx.wait();
  console.log(`   ✓ Asset added\n`);

  // Set NodeManager in AuSys
  console.log(`   Setting NodeManager in AuSys...`);
  await auSys.setNodeManager(aurumNodeManagerAddress);
  console.log(`   ✓ NodeManager set\n`);

  // =============================================================================
  // Update all configuration files
  // =============================================================================
  console.log(`📝 Updating configuration files...\n`);

  // Update chain-constants.ts
  updateChainConstants({
    auraTokenAddress,
    auSysAddress,
    aurumNodeManagerAddress,
    auStakeAddress,
    auraAssetAddress,
    orderBridgeAddress,
  });
  console.log(``);

  // Update ponder.config.ts
  updatePonderConfig({
    auSysAddress,
    aurumNodeManagerAddress,
    auraAssetAddress,
    auStakeAddress,
    orderBridgeAddress,
    auSysBlock,
    aurumNodeManagerBlock,
    auraAssetBlock,
    auStakeBlock,
    orderBridgeBlock,
  });
  console.log(``);

  // Update deployments JSON
  updateDeploymentsJson({
    auraTokenAddress,
    auSysAddress,
    aurumNodeManagerAddress,
    auStakeAddress,
    auraAssetAddress,
    orderBridgeAddress,
    auSysBlock,
    aurumNodeManagerBlock,
    auraAssetBlock,
    auStakeBlock,
    orderBridgeBlock,
  });
  console.log(``);

  // =============================================================================
  // Print summary
  // =============================================================================
  console.log(`==========================================`);
  console.log(`🎉 Deployment Complete!`);
  console.log(`==========================================\n`);

  console.log(`📋 Deployed Contracts:`);
  for (const dep of deployments) {
    console.log(`   ${dep.name}: ${dep.address} (block ${dep.deployBlock})`);
  }
  console.log(``);

  console.log(`📁 Updated Configuration Files:`);
  console.log(`   • chain-constants.ts`);
  console.log(`   • indexer/ponder.config.ts`);
  console.log(`   • deployments/baseSepolia-latest.json`);
  console.log(``);

  console.log(`✅ All contracts deployed successfully`);
  console.log(`✅ All configurations updated`);
  console.log(`\n🚀 Your deployment is ready to use!`);
}

async function getDeploymentBlock(tx: any, provider: any): Promise<number> {
  try {
    const receipt = await tx.wait(1);
    return receipt.blockNumber;
  } catch (e) {
    return await provider.getBlockNumber();
  }
}

function updateChainConstants(addresses: {
  auraTokenAddress: string;
  auSysAddress: string;
  aurumNodeManagerAddress: string;
  auStakeAddress: string;
  auraAssetAddress: string;
  orderBridgeAddress: string;
}) {
  const filePath = path.join(__dirname, '..', 'chain-constants.ts');
  const content = `// Auto-generated deployment constants for baseSepolia
// Deployed: ${new Date().toISOString()}
// Chain ID: 84532

export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS = '${addresses.auraTokenAddress}';
export const NEXT_PUBLIC_AUSYS_ADDRESS = '${addresses.auSysAddress}';
export const NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS = '${addresses.aurumNodeManagerAddress}';
export const NEXT_PUBLIC_AUSTAKE_ADDRESS = '${addresses.auStakeAddress}';
export const NEXT_PUBLIC_AURA_ASSET_ADDRESS = '${addresses.auraAssetAddress}';
export const NEXT_PUBLIC_AURA_GOAT_ADDRESS = '${addresses.auraAssetAddress}';
export const NEXT_PUBLIC_ORDER_BRIDGE_ADDRESS = '${addresses.orderBridgeAddress}';

// RPC URLs
export const NEXT_PUBLIC_RPC_URL_84532 = 'https://base-sepolia.infura.io/v3/281dfd93e10842199b64ed6f3535fa4c';

// Indexer URL
export const NEXT_PUBLIC_INDEXER_URL = 'https://indexer.aurellionlabs.com/graphql';
`;

  fs.writeFileSync(filePath, content);
  console.log(`   ✓ Updated chain-constants.ts`);
}

function updatePonderConfig(blocks: {
  auSysAddress: string;
  aurumNodeManagerAddress: string;
  auraAssetAddress: string;
  auStakeAddress: string;
  orderBridgeAddress: string;
  auSysBlock: number;
  aurumNodeManagerBlock: number;
  auraAssetBlock: number;
  auStakeBlock: number;
  orderBridgeBlock: number;
}) {
  const filePath = path.join(__dirname, '..', 'indexer', 'ponder.config.ts');
  let content = fs.readFileSync(filePath, 'utf-8');

  // Update contract addresses
  content = content.replace(
    /ausys:\s*'0x[A-Fa-f0-9]+'/,
    `ausys: '${blocks.auSysAddress}' as \`0x\${string}\``,
  );
  content = content.replace(
    /aurumNodeManager:\s*\n\s*'0x[A-Fa-f0-9]+'/,
    `aurumNodeManager:\n    '${blocks.aurumNodeManagerAddress}' as \`0x\${string}\``,
  );
  content = content.replace(
    /auraAsset:\s*'0x[A-Fa-f0-9]+'/,
    `auraAsset: '${blocks.auraAssetAddress}' as \`0x\${string}\``,
  );
  content = content.replace(
    /auStake:\s*'0x[A-Fa-f0-9]+'/,
    `auStake: '${blocks.auStakeAddress}' as \`0x\${string}\``,
  );
  content = content.replace(
    /orderBridge:\s*'0x[A-Fa-f0-9]+'/,
    `orderBridge: '${blocks.orderBridgeAddress}' as \`0x\${string}\``,
  );

  // Update start blocks
  content = content.replace(/ausys:\s*\d+/, `ausys: ${blocks.auSysBlock}`);
  content = content.replace(/aurumNodeManager:\s*\d+/, `aurumNodeManager: ${blocks.aurumNodeManagerBlock}`);
  content = content.replace(/auraAsset:\s*\d+/, `auraAsset: ${blocks.auraAssetBlock}`);
  content = content.replace(/auStake:\s*\d+/, `auStake: ${blocks.auStakeBlock}`);
  content = content.replace(/orderBridge:\s*\d+/, `orderBridge: ${blocks.orderBridgeBlock}`);

  fs.writeFileSync(filePath, content);
  console.log(`   ✓ Updated indexer/ponder.config.ts`);
}

function updateDeploymentsJson(blocks: {
  auraTokenAddress: string;
  auSysAddress: string;
  aurumNodeManagerAddress: string;
  auStakeAddress: string;
  auraAssetAddress: string;
  orderBridgeAddress: string;
  auSysBlock: number;
  aurumNodeManagerBlock: number;
  auraAssetBlock: number;
  auStakeBlock: number;
  orderBridgeBlock: number;
}) {
  const filePath = path.join(__dirname, '..', 'deployments', 'baseSepolia-latest.json');
  const deployment = {
    network: 'baseSepolia',
    chainId: 84532,
    deployer: '',
    contracts: {
      auraToken: blocks.auraTokenAddress,
      auSys: blocks.auSysAddress,
      aurumNodeManager: blocks.aurumNodeManagerAddress,
      auStake: blocks.auStakeAddress,
      auraAsset: blocks.auraAssetAddress,
      orderBridge: blocks.orderBridgeAddress,
    },
    startBlocks: {
      auSys: blocks.auSysBlock,
      aurumNodeManager: blocks.aurumNodeManagerBlock,
      auStake: blocks.auStakeBlock,
      auraAsset: blocks.auraAssetBlock,
      orderBridge: blocks.orderBridgeBlock,
    },
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(filePath, JSON.stringify(deployment, null, 2));
  console.log(`   ✓ Updated deployments/baseSepolia-latest.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

