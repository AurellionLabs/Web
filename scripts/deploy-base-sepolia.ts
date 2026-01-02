import { ethers, network } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Updates the ponder.config.ts file with new contract addresses and start blocks
 */
function updatePonderConfig(deployment: DeploymentResult) {
  const ponderConfigPath = path.resolve('./indexer/ponder.config.ts');
  
  if (!fs.existsSync(ponderConfigPath)) {
    console.warn('⚠️  Ponder config not found at', ponderConfigPath);
    return;
  }

  let content = fs.readFileSync(ponderConfigPath, 'utf8');
  
  // Update Base Sepolia contract addresses
  const networkName = deployment.network === 'baseSepolia' ? 'baseSepolia' : deployment.network;
  
  // Create the new contracts block for the network
  const contractsBlock = `  ${networkName}: {
    ausys: '${deployment.contracts.auSys}' as \`0x\${string}\`,
    aurumNodeManager: '${deployment.contracts.aurumNodeManager}' as \`0x\${string}\`,
    auraAsset: '${deployment.contracts.auraAsset}' as \`0x\${string}\`,
    auStake: '${deployment.contracts.auStake}' as \`0x\${string}\`,
    clob: '${deployment.contracts.clob}' as \`0x\${string}\`,
    startBlocks: {
      ausys: ${deployment.startBlocks.auSys},
      aurumNodeManager: ${deployment.startBlocks.aurumNodeManager},
      auraAsset: ${deployment.startBlocks.auraAsset},
      auStake: ${deployment.startBlocks.auStake},
      clob: ${deployment.startBlocks.clob},
    },
  },`;

  // Replace the baseSepolia block using regex
  const baseSepoliaRegex = /baseSepolia:\s*\{[\s\S]*?startBlocks:\s*\{[\s\S]*?\},\s*\},/;
  
  if (baseSepoliaRegex.test(content)) {
    content = content.replace(baseSepoliaRegex, contractsBlock);
    fs.writeFileSync(ponderConfigPath, content);
    console.log('✅ Updated ponder.config.ts with new contract addresses');
  } else {
    console.warn('⚠️  Could not find baseSepolia block in ponder config');
  }
}

interface DeploymentResult {
  network: string;
  chainId: number;
  deployer: string;
  contracts: {
    auraToken: string;
    auSys: string;
    aurumNodeManager: string;
    auStake: string;
    auraAsset: string;
    clob: string;
  };
  startBlocks: {
    auraToken: number;
    auSys: number;
    aurumNodeManager: number;
    auStake: number;
    auraAsset: number;
    clob: number;
  };
  timestamp: string;
}

async function getDeploymentBlock(tx: any): Promise<number> {
  try {
    const receipt = await tx.wait(1);
    return receipt.blockNumber;
  } catch (e) {
    console.warn('Could not get deployment block from tx, using current block');
    const provider = ethers.provider;
    return await provider.getBlockNumber();
  }
}

async function waitForConfirmations(tx: any, confirmations: number = 2) {
  try {
    console.log(`  Waiting for ${confirmations} confirmations...`);
    await tx.wait(confirmations);
    console.log('  ✓ Confirmed');
  } catch (error) {
    console.warn('  Warning: Could not wait for all confirmations, continuing...');
  }
}

async function main() {
  console.log('🚀 Starting Full Contract Deployment (including CLOB)');
  console.log('=====================================================');
  console.log(`Network: ${network.name}`);
  
  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log(`Chain ID: ${chainId}`);

  // Get signers
  const [deployer]: HardhatEthersSigner[] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error('Deployer has no balance! Please fund the account.');
  }

  const initialOwner = deployer.address;
  const projectWallet = deployer.address;

  // Deploy contracts
  console.log('\n📦 Deploying Contracts...\n');

  // 1. Deploy Aura Token
  console.log('1. Deploying Aura Token...');
  const AuraFactory = await ethers.getContractFactory('Aura');
  const auraToken = await AuraFactory.deploy();
  await waitForConfirmations(auraToken.deploymentTransaction());
  const auraTokenAddress = await auraToken.getAddress();
  const auraTokenBlock = await getDeploymentBlock(auraToken.deploymentTransaction());
  console.log(`   ✓ Aura Token: ${auraTokenAddress} (block ${auraTokenBlock})`);

  // Mint initial tokens
  console.log('   Minting initial tokens...');
  const mintTx = await auraToken.mintTokenToTreasury(1000000);
  await mintTx.wait();
  console.log('   ✓ Minted 1,000,000 AURA tokens');

  // 2. Deploy AuSys
  console.log('\n2. Deploying AuSys...');
  const AuSys = await ethers.getContractFactory('Ausys');
  const auSys = await AuSys.deploy(auraTokenAddress);
  await waitForConfirmations(auSys.deploymentTransaction());
  const auSysAddress = await auSys.getAddress();
  const auSysBlock = await getDeploymentBlock(auSys.deploymentTransaction());
  console.log(`   ✓ AuSys: ${auSysAddress} (block ${auSysBlock})`);

  // 3. Deploy AurumNodeManager
  console.log('\n3. Deploying AurumNodeManager...');
  const AurumNodeManager = await ethers.getContractFactory('AurumNodeManager');
  const aurumNodeManager = await AurumNodeManager.deploy(auSysAddress);
  await waitForConfirmations(aurumNodeManager.deploymentTransaction());
  const aurumNodeManagerAddress = await aurumNodeManager.getAddress();
  const aurumNodeManagerBlock = await getDeploymentBlock(aurumNodeManager.deploymentTransaction());
  console.log(`   ✓ AurumNodeManager: ${aurumNodeManagerAddress} (block ${aurumNodeManagerBlock})`);

  // 4. Deploy AuStake
  console.log('\n4. Deploying AuStake...');
  const AuStake = await ethers.getContractFactory('AuStake');
  const auStake = await AuStake.deploy(projectWallet, initialOwner);
  await waitForConfirmations(auStake.deploymentTransaction());
  const auStakeAddress = await auStake.getAddress();
  const auStakeBlock = await getDeploymentBlock(auStake.deploymentTransaction());
  console.log(`   ✓ AuStake: ${auStakeAddress} (block ${auStakeBlock})`);

  // 5. Deploy AuraAsset
  console.log('\n5. Deploying AuraAsset...');
  const AuraAssetFactory = await ethers.getContractFactory('AuraAsset');
  const auraAsset = await AuraAssetFactory.deploy(
    deployer.address,
    'https://aurellion.io/metadata/',
    aurumNodeManagerAddress
  );
  await waitForConfirmations(auraAsset.deploymentTransaction());
  const auraAssetAddress = await auraAsset.getAddress();
  const auraAssetBlock = await getDeploymentBlock(auraAsset.deploymentTransaction());
  console.log(`   ✓ AuraAsset: ${auraAssetAddress} (block ${auraAssetBlock})`);

  // 6. Deploy CLOB
  console.log('\n6. Deploying CLOB (Central Limit Order Book)...');
  const CLOBFactory = await ethers.getContractFactory('CLOB');
  const clob = await CLOBFactory.deploy(projectWallet); // Fee recipient is project wallet
  await waitForConfirmations(clob.deploymentTransaction());
  const clobAddress = await clob.getAddress();
  const clobBlock = await getDeploymentBlock(clob.deploymentTransaction());
  console.log(`   ✓ CLOB: ${clobAddress} (block ${clobBlock})`);

  // Post-deployment configuration
  console.log('\n⚙️  Configuring Contracts...\n');

  // Add AuraAsset token to AurumNodeManager
  console.log('Adding AuraAsset to AurumNodeManager...');
  const addTokenTx = await aurumNodeManager.addToken(auraAssetAddress);
  await addTokenTx.wait();
  console.log('   ✓ AuraAsset token added');

  // Set NodeManager in AuSys
  console.log('Setting NodeManager in AuSys...');
  const setNodeManagerTx = await auSys.setNodeManager(aurumNodeManagerAddress);
  await setNodeManagerTx.wait();
  console.log('   ✓ NodeManager set');

  // Add default asset classes
  console.log('Adding default asset classes...');
  const defaultClasses = ['GOAT', 'SHEEP', 'COW', 'CHICKEN', 'DUCK'];
  for (const className of defaultClasses) {
    const tx = await auraAsset.addSupportedClass(className);
    await tx.wait();
    console.log(`   ✓ Added class: ${className}`);
  }

  // Save deployment results
  const deployment: DeploymentResult = {
    network: network.name,
    chainId: Number(chainId),
    deployer: deployer.address,
    contracts: {
      auraToken: auraTokenAddress,
      auSys: auSysAddress,
      aurumNodeManager: aurumNodeManagerAddress,
      auStake: auStakeAddress,
      auraAsset: auraAssetAddress,
      clob: clobAddress,
    },
    startBlocks: {
      auraToken: auraTokenBlock,
      auSys: auSysBlock,
      aurumNodeManager: aurumNodeManagerBlock,
      auStake: auStakeBlock,
      auraAsset: auraAssetBlock,
      clob: clobBlock,
    },
    timestamp: new Date().toISOString(),
  };

  // Create deployments directory
  const deploymentsDir = path.resolve('./deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment JSON
  const deploymentPath = path.join(deploymentsDir, `${network.name}-${Date.now()}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`\n📄 Deployment saved to: ${deploymentPath}`);

  // Also save latest deployment for this network
  const latestPath = path.join(deploymentsDir, `${network.name}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(deployment, null, 2));

  // Update chain-constants.ts
  const chainConstants = `// Auto-generated deployment constants for ${network.name}
// Deployed: ${deployment.timestamp}
// Chain ID: ${chainId}

export const NEXT_PUBLIC_AUSTAKE_ADDRESS = "${auStakeAddress}";
export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS = "${auraTokenAddress}";
export const NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS = "${aurumNodeManagerAddress}";
export const NEXT_PUBLIC_AUSYS_ADDRESS = "${auSysAddress}";
export const NEXT_PUBLIC_AURA_ASSET_ADDRESS = "${auraAssetAddress}";
export const NEXT_PUBLIC_CLOB_ADDRESS = "${clobAddress}";

// Deployment blocks (for indexer configuration)
export const DEPLOYMENT_BLOCKS = {
  auraToken: ${auraTokenBlock},
  auSys: ${auSysBlock},
  aurumNodeManager: ${aurumNodeManagerBlock},
  auStake: ${auStakeBlock},
  auraAsset: ${auraAssetBlock},
  clob: ${clobBlock},
};
`;

  fs.writeFileSync('chain-constants.ts', chainConstants);
  console.log('📄 Updated chain-constants.ts');

  // Update ponder config with new addresses
  console.log('\n📄 Updating Ponder indexer config...');
  updatePonderConfig(deployment);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 DEPLOYMENT COMPLETE!');
  console.log('='.repeat(60));
  console.log(`\nNetwork: ${network.name} (Chain ID: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log('\nContract Addresses:');
  console.log(`  Aura Token:        ${auraTokenAddress}`);
  console.log(`  AuSys:             ${auSysAddress}`);
  console.log(`  AurumNodeManager:  ${aurumNodeManagerAddress}`);
  console.log(`  AuStake:           ${auStakeAddress}`);
  console.log(`  AuraAsset:         ${auraAssetAddress}`);
  console.log(`  CLOB:              ${clobAddress}`);
  console.log('\nStart Blocks:');
  console.log(`  Aura Token:        ${auraTokenBlock}`);
  console.log(`  AuSys:             ${auSysBlock}`);
  console.log(`  AurumNodeManager:  ${aurumNodeManagerBlock}`);
  console.log(`  AuStake:           ${auStakeBlock}`);
  console.log(`  AuraAsset:         ${auraAssetBlock}`);
  console.log(`  CLOB:              ${clobBlock}`);
  console.log('\n' + '='.repeat(60));

  return deployment;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });

