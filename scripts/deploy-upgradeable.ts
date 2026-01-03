import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import * as fs from 'fs';
import * as path from 'path';

interface DeploymentResult {
  name: string;
  implementation: string;
  proxy: string;
  deployBlock: number;
}

interface DeploymentInfo {
  network: string;
  chainId: number;
  deployer: string;
  proxyAdmin: string;
  timestamp: string;
  contracts: {
    [key: string]: {
      implementation: string;
      proxy: string;
      deployBlock: number;
    };
  };
}

async function main() {
  console.log('='.repeat(70));
  console.log('Deploying Upgradeable Contracts with Proxy Pattern');
  console.log('='.repeat(70));

  const [deployer]: HardhatEthersSigner[] = await ethers.getSigners();
  console.log(`\nDeployer: ${deployer.address}`);
  console.log(
    `Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`,
  );

  // Load ProxyAdmin address
  const proxyAdminPath = path.join(__dirname, '..', 'proxy-admin.json');
  if (!fs.existsSync(proxyAdminPath)) {
    throw new Error(`ProxyAdmin config not found. Run scripts/deploy-proxy-admin.ts first.`);
  }

  const proxyAdminConfig = JSON.parse(fs.readFileSync(proxyAdminPath, 'utf-8'));
  const PROXY_ADMIN_ADDRESS = proxyAdminConfig.address;
  console.log(`\nProxyAdmin: ${PROXY_ADMIN_ADDRESS}`);

  const deployments: DeploymentResult[] = [];
  const currentBlock = await deployer.provider.getBlockNumber();

  // =============================================================================
  // 1. Deploy AurumNodeManagerUpgradeable
  // =============================================================================
  console.log('\n[1/5] Deploying AurumNodeManagerUpgradeable...');
  const AurumNodeManagerFactory = await ethers.getContractFactory('AurumNodeManagerUpgradeable');
  const aurumNodeManagerImpl = await AurumNodeManagerFactory.deploy();
  await aurumNodeManagerImpl.waitForDeployment();
  const aurumNodeManagerImplAddr = await aurumNodeManagerImpl.getAddress();
  console.log(`   Implementation: ${aurumNodeManagerImplAddr}`);

  // Deploy Proxy
  const TransparentProxy = await ethers.getContractFactory('TransparentUpgradeableProxy');
  const aurumNodeManagerProxy = await TransparentProxy.deploy(
    aurumNodeManagerImplAddr,
    PROXY_ADMIN_ADDRESS,
    '0x',
  );
  await aurumNodeManagerProxy.waitForDeployment();
  const aurumNodeManagerProxyAddr = await aurumNodeManagerProxy.getAddress();
  console.log(`   Proxy: ${aurumNodeManagerProxyAddr}`);

  // Initialize proxy (we'll do this after deploying all implementations)
  deployments.push({
    name: 'aurumNodeManager',
    implementation: aurumNodeManagerImplAddr,
    proxy: aurumNodeManagerProxyAddr,
    deployBlock: currentBlock + 1,
  });

  // =============================================================================
  // 2. Deploy AuraAssetUpgradeable
  // =============================================================================
  console.log('\n[2/5] Deploying AuraAssetUpgradeable...');
  const AuraAssetFactory = await ethers.getContractFactory('AuraAssetUpgradeable');
  const auraAssetImpl = await AuraAssetFactory.deploy();
  await auraAssetImpl.waitForDeployment();
  const auraAssetImplAddr = await auraAssetImpl.getAddress();
  console.log(`   Implementation: ${auraAssetImplAddr}`);

  const auraAssetProxy = await TransparentProxy.deploy(
    auraAssetImplAddr,
    PROXY_ADMIN_ADDRESS,
    '0x',
  );
  await auraAssetProxy.waitForDeployment();
  const auraAssetProxyAddr = await auraAssetProxy.getAddress();
  console.log(`   Proxy: ${auraAssetProxyAddr}`);

  deployments.push({
    name: 'auraAsset',
    implementation: auraAssetImplAddr,
    proxy: auraAssetProxyAddr,
    deployBlock: currentBlock + 2,
  });

  // =============================================================================
  // 3. Deploy AuSysUpgradeable
  // =============================================================================
  console.log('\n[3/5] Deploying AuSysUpgradeable...');
  const AuSysFactory = await ethers.getContractFactory('AuSysUpgradeable');
  const auSysImpl = await AuSysFactory.deploy();
  await auSysImpl.waitForDeployment();
  const auSysImplAddr = await auSysImpl.getAddress();
  console.log(`   Implementation: ${auSysImplAddr}`);

  const auSysProxy = await TransparentProxy.deploy(auSysImplAddr, PROXY_ADMIN_ADDRESS, '0x');
  await auSysProxy.waitForDeployment();
  const auSysProxyAddr = await auSysProxy.getAddress();
  console.log(`   Proxy: ${auSysProxyAddr}`);

  deployments.push({
    name: 'auSys',
    implementation: auSysImplAddr,
    proxy: auSysProxyAddr,
    deployBlock: currentBlock + 3,
  });

  // =============================================================================
  // 4. Deploy AuStakeUpgradeable
  // =============================================================================
  console.log('\n[4/5] Deploying AuStakeUpgradeable...');
  const AuStakeFactory = await ethers.getContractFactory('AuStakeUpgradeable');
  const auStakeImpl = await AuStakeFactory.deploy();
  await auStakeImpl.waitForDeployment();
  const auStakeImplAddr = await auStakeImpl.getAddress();
  console.log(`   Implementation: ${auStakeImplAddr}`);

  const auStakeProxy = await TransparentProxy.deploy(
    auStakeImplAddr,
    PROXY_ADMIN_ADDRESS,
    '0x',
  );
  await auStakeProxy.waitForDeployment();
  const auStakeProxyAddr = await auStakeProxy.getAddress();
  console.log(`   Proxy: ${auStakeProxyAddr}`);

  deployments.push({
    name: 'auStake',
    implementation: auStakeImplAddr,
    proxy: auStakeProxyAddr,
    deployBlock: currentBlock + 4,
  });

  // =============================================================================
  // 5. Deploy OrderBridgeUpgradeable
  // =============================================================================
  console.log('\n[5/5] Deploying OrderBridgeUpgradeable...');
  const OrderBridgeFactory = await ethers.getContractFactory('OrderBridgeUpgradeable');
  const orderBridgeImpl = await OrderBridgeFactory.deploy();
  await orderBridgeImpl.waitForDeployment();
  const orderBridgeImplAddr = await orderBridgeImpl.getAddress();
  console.log(`   Implementation: ${orderBridgeImplAddr}`);

  const orderBridgeProxy = await TransparentProxy.deploy(
    orderBridgeImplAddr,
    PROXY_ADMIN_ADDRESS,
    '0x',
  );
  await orderBridgeProxy.waitForDeployment();
  const orderBridgeProxyAddr = await orderBridgeProxy.getAddress();
  console.log(`   Proxy: ${orderBridgeProxyAddr}`);

  deployments.push({
    name: 'orderBridge',
    implementation: orderBridgeImplAddr,
    proxy: orderBridgeProxyAddr,
    deployBlock: currentBlock + 5,
  });

  // =============================================================================
  // Initialize Proxies
  // =============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('Initializing Proxies...');
  console.log('='.repeat(70));

  // Get contract instances for initialization
  const aurumNodeManager = await ethers.getContractAt(
    'AurumNodeManagerUpgradeable',
    aurumNodeManagerProxyAddr,
  );
  const auraAsset = await ethers.getContractAt('AuraAssetUpgradeable', auraAssetProxyAddr);
  const auSys = await ethers.getContractAt('AuSysUpgradeable', auSysProxyAddr);
  const auStake = await ethers.getContractAt('AuStakeUpgradeable', auStakeProxyAddr);
  const orderBridge = await ethers.getContractAt('OrderBridgeUpgradeable', orderBridgeProxyAddr);

  // Initialize AurumNodeManager
  console.log('\nInitializing AurumNodeManager...');
  const initTx1 = await aurumNodeManager.initialize(
    ethers.ZeroAddress, // ausys - will be set later
    ethers.ZeroAddress, // auraAsset - will be set later
  );
  await initTx1.wait();
  console.log('✓ AurumNodeManager initialized');

  // Initialize AuraAsset
  console.log('Initializing AuraAsset...');
  const initTx2 = await auraAsset.initialize(
    'https://your-metadata-uri.com/',
    ethers.ZeroAddress, // nodeManager - will be set later
  );
  await initTx2.wait();
  console.log('✓ AuraAsset initialized');

  // Initialize AuSys
  console.log('Initializing AuSys...');
  const initTx3 = await auSys.initialize(ethers.ZeroAddress); // payToken - will be set later
  await initTx3.wait();
  console.log('✓ AuSys initialized');

  // Initialize AuStake
  console.log('Initializing AuStake...');
  const initTx4 = await auStake.initialize(deployer.address, deployer.address);
  await initTx4.wait();
  console.log('✓ AuStake initialized');

  // Initialize OrderBridge
  console.log('Initializing OrderBridge...');
  const initTx5 = await orderBridge.initialize(
    ethers.ZeroAddress, // clob - will be set later
    ethers.ZeroAddress, // ausys - will be set later
    ethers.ZeroAddress, // quoteToken - will be set later
    deployer.address, // feeRecipient
  );
  await initTx5.wait();
  console.log('✓ OrderBridge initialized');

  // =============================================================================
  // Create Deployment Configuration
  // =============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('Saving Deployment Configuration...');
  console.log('='.repeat(70));

  const deploymentInfo: DeploymentInfo = {
    network: 'baseSepolia',
    chainId: 84532,
    deployer: deployer.address,
    proxyAdmin: PROXY_ADMIN_ADDRESS,
    timestamp: new Date().toISOString(),
    contracts: {},
  };

  for (const dep of deployments) {
    deploymentInfo.contracts[dep.name] = {
      implementation: dep.implementation,
      proxy: dep.proxy,
      deployBlock: dep.deployBlock,
    };
  }

  // Save to upgradeable-deployments.json
  const deploymentPath = path.join(__dirname, '..', 'upgradeable-deployments.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n✓ Deployment info saved to: ${deploymentPath}`);

  // Update chain-constants.ts with proxy addresses
  updateChainConstants(deploymentInfo);
  console.log('✓ chain-constants.ts updated');

  // Update ponder.config.ts
  updatePonderConfig(deploymentInfo);
  console.log('✓ indexer/ponder.config.ts updated');

  // =============================================================================
  // Print Summary
  // =============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('DEPLOYMENT COMPLETE');
  console.log('='.repeat(70));

  console.log('\n📋 Deployed Contracts:\n');
  console.log('Contract'.padEnd(25) + 'Proxy Address'.padEnd(45) + 'Implementation');
  console.log('-'.repeat(120));

  for (const dep of deployments) {
    console.log(
      dep.name.padEnd(25) +
        dep.proxy.padEnd(45) +
        dep.implementation,
    );
  }

  console.log('\n📁 Configuration Files:');
  console.log(`   • proxy-admin.json: ${proxyAdminPath}`);
  console.log(`   • upgradeable-deployments.json: ${deploymentPath}`);
  console.log(`   • chain-constants.ts (updated)`);
  console.log(`   • indexer/ponder.config.ts (updated)`);

  console.log('\n✅ All upgradeable contracts deployed successfully!');
  console.log('='.repeat(70));
}

function updateChainConstants(info: DeploymentInfo) {
  const filePath = path.join(__dirname, '..', 'chain-constants.ts');

  let content = `// Auto-generated deployment constants for upgradeable contracts
// Deployed: ${info.timestamp}
// Network: ${info.network} (Chain ID: ${info.chainId})

`;

  // Proxy addresses (these are the addresses you'll use in the frontend)
  for (const [name, contract] of Object.entries(info.contracts)) {
    const constName = name.charAt(0).toUpperCase() + name.slice(1) + 'Proxy';
    content += `export const NEXT_PUBLIC_${constName.toUpperCase()}_ADDRESS = '${contract.proxy}';\n`;
  }

  content += '\n// Implementation addresses (for upgrades only)\n';
  for (const [name, contract] of Object.entries(info.contracts)) {
    const constName = name.charAt(0).toUpperCase() + name.slice(1) + 'Implementation';
    content += `export const NEXT_PUBLIC_${constName.toUpperCase()}_ADDRESS = '${contract.implementation}';\n`;
  }

  content += `\nexport const NEXT_PUBLIC_PROXY_ADMIN_ADDRESS = '${info.proxyAdmin}';\n`;

  // Deployment blocks
  content += '\n// Deployment blocks for indexer\n';
  content += 'export const DEPLOYMENT_BLOCKS = {\n';
  for (const [name, contract] of Object.entries(info.contracts)) {
    content += `  ${name}: ${contract.deployBlock},\n`;
  }
  content += '};\n';

  fs.writeFileSync(filePath, content);
}

function updatePonderConfig(info: DeploymentInfo) {
  const filePath = path.join(__dirname, '..', 'indexer', 'ponder.config.ts');

  let content = `import { createConfig } from '@ponder/core';
import { http } from 'viem';

// Import ABIs
import { AusysAbi } from './abis/AusysAbi';
import { AurumNodeManagerAbi } from './abis/AurumNodeManagerAbi';
import { AuraAssetAbi } from './abis/AuraAssetAbi';
import { AuStakeAbi } from './abis/AuStakeAbi';
import { CLOBAbi } from './abis/CLOBAbi';
import { OrderBridgeAbi } from './abis/OrderBridgeAbi';

const BASE_SEPOLIA_CHAIN_ID = ${info.chainId};

// Contract addresses from upgradeable deployment
const PROXY_ADDRESSES = {
`;

  for (const [name, contract] of Object.entries(info.contracts)) {
    content += `  ${name}: '${contract.proxy}' as \`0x\$\{string}\`,\n`;
  }

  content += `};

const START_BLOCKS = {
`;

  for (const [name, contract] of Object.entries(info.contracts)) {
    content += `  ${name}: ${contract.deployBlock},\n`;
  }

  content += `};

export default createConfig({
  cors: {
    origins: [
      'https://aurellionlabs.com',
      'https://www.aurellionlabs.com',
      'https://web-gk8i9h3wk-aurellion.vercel.app',
      'https://indexer.aurellionlabs.com',
    ],
  },
  networks: {
    baseSepolia: {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      transport: http(
        process.env.NEXT_PUBLIC_RPC_URL_84532 ||
          process.env.BASE_TEST_RPC_URL ||
          'https://base-sepolia.infura.io/v3/281dfd93e10842199b64ed6f3535fa4c',
      ),
    },
  },
  contracts: {
    Ausys: {
      network: 'baseSepolia',
      abi: AusysAbi,
      address: PROXY_ADDRESSES.ausys,
      startBlock: START_BLOCKS.ausys,
    },
    AurumNodeManager: {
      network: 'baseSepolia',
      abi: AurumNodeManagerAbi,
      address: PROXY_ADDRESSES.aurumNodeManager,
      startBlock: START_BLOCKS.aurumNodeManager,
    },
    AuraAsset: {
      network: 'baseSepolia',
      abi: AuraAssetAbi,
      address: PROXY_ADDRESSES.auraAsset,
      startBlock: START_BLOCKS.auraAsset,
    },
    AuStake: {
      network: 'baseSepolia',
      abi: AuStakeAbi,
      address: PROXY_ADDRESSES.auStake,
      startBlock: START_BLOCKS.auStake,
    },
    CLOB: {
      network: 'baseSepolia',
      abi: CLOBAbi,
      address: '0x2b9D42594Bb18FAFaA64FFEC4f5e69C8ac328aAc',
      startBlock: 35771333,
    },
    OrderBridge: {
      network: 'baseSepolia',
      abi: OrderBridgeAbi,
      address: PROXY_ADDRESSES.orderBridge,
      startBlock: START_BLOCKS.orderBridge,
    },
  },
});
`;

  fs.writeFileSync(filePath, content);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

