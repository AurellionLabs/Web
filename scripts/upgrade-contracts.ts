import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import * as fs from 'fs';
import * as path from 'path';

interface UpgradeInfo {
  contractName: string;
  currentImplementation: string;
  newImplementation: string;
}

async function main() {
  console.log('='.repeat(70));
  console.log('Upgrading Upgradeable Contracts');
  console.log('='.repeat(70));

  const [deployer]: HardhatEthersSigner[] = await ethers.getSigners();
  console.log(`\nDeployer: ${deployer.address}`);

  // Load deployment info
  const deploymentPath = path.join(__dirname, '..', 'upgradeable-deployments.json');
  if (!fs.existsSync(deploymentPath)) {
    throw new Error('Deployment not found. Run deploy-upgradeable.ts first.');
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  const PROXY_ADMIN_ADDRESS = deploymentInfo.proxyAdmin;

  // Get ProxyAdmin contract
  const proxyAdmin = await ethers.getContractAt('ProxyAdmin', PROXY_ADMIN_ADDRESS);

  // Check ownership
  const adminOwner = await proxyAdmin.owner();
  console.log(`ProxyAdmin owner: ${adminOwner}`);

  if (adminOwner !== deployer.address) {
    console.log(`\n⚠️  Warning: Deployer is not ProxyAdmin owner`);
    console.log(`   Only the owner can upgrade contracts`);
  }

  // =============================================================================
  // Parse command line arguments for which contracts to upgrade
  // =============================================================================
  const contractToUpgrade = process.argv[2] || 'all';

  const upgrades: UpgradeInfo[] = [];

  if (contractToUpgrade === 'all' || contractToUpgrade === 'aurumNodeManager') {
    upgrades.push({
      contractName: 'AurumNodeManagerUpgradeable',
      currentImplementation: deploymentInfo.contracts.aurumNodeManager.implementation,
      newImplementation: '', // Will be deployed
    });
  }

  if (contractToUpgrade === 'all' || contractToUpgrade === 'auraAsset') {
    upgrades.push({
      contractName: 'AuraAssetUpgradeable',
      currentImplementation: deploymentInfo.contracts.auraAsset.implementation,
      newImplementation: '',
    });
  }

  if (contractToUpgrade === 'all' || contractToUpgrade === 'auSys') {
    upgrades.push({
      contractName: 'AuSysUpgradeable',
      currentImplementation: deploymentInfo.contracts.auSys.implementation,
      newImplementation: '',
    });
  }

  if (contractToUpgrade === 'all' || contractToUpgrade === 'auStake') {
    upgrades.push({
      contractName: 'AuStakeUpgradeable',
      currentImplementation: deploymentInfo.contracts.auStake.implementation,
      newImplementation: '',
    });
  }

  if (contractToUpgrade === 'all' || contractToUpgrade === 'orderBridge') {
    upgrades.push({
      contractName: 'OrderBridgeUpgradeable',
      currentImplementation: deploymentInfo.contracts.orderBridge.implementation,
      newImplementation: '',
    });
  }

  // =============================================================================
  // Deploy new implementations and upgrade
  // =============================================================================
  console.log(`\nUpgrading: ${contractToUpgrade}`);
  console.log('-'.repeat(70));

  const upgradeResults: { name: string; oldImpl: string; newImpl: string; proxy: string }[] = [];

  for (const upgrade of upgrades) {
    console.log(`\n[UPGRADING] ${upgrade.contractName}`);

    // Deploy new implementation
    console.log('  Deploying new implementation...');
    const Factory = await ethers.getContractFactory(upgrade.contractName);
    const newImpl = await Factory.deploy();
    await newImpl.waitForDeployment();
    const newImplAddr = await newImpl.getAddress();
    console.log(`  New implementation: ${newImplAddr}`);

    // Get proxy address
    const contractKey = upgrade.contractName.replace('Upgradeable', '').toLowerCase();
    const proxyAddr = deploymentInfo.contracts[contractKey].proxy;
    console.log(`  Proxy: ${proxyAddr}`);

    // Upgrade
    console.log('  Upgrading proxy...');
    const upgradeTx = await proxyAdmin.upgrade(proxyAddr, newImplAddr);
    await upgradeTx.wait();
    console.log('  ✓ Upgrade complete');

    upgradeResults.push({
      name: contractKey,
      oldImpl: upgrade.currentImplementation,
      newImpl: newImplAddr,
      proxy: proxyAddr,
    });
  }

  // =============================================================================
  // Update deployment configuration
  // =============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('Updating Deployment Configuration...');
  console.log('='.repeat(70));

  // Update implementation addresses in deployment file
  for (const result of upgradeResults) {
    deploymentInfo.contracts[result.name].implementation = result.newImpl;
  }
  deploymentInfo.timestamp = new Date().toISOString();

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n✓ Deployment info updated: ${deploymentPath}`);

  // =============================================================================
  // Print Summary
  // =============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('UPGRADE COMPLETE');
  console.log('='.repeat(70));

  console.log('\n📋 Upgraded Contracts:\n');
  console.log('Contract'.padEnd(20) + 'Proxy'.padEnd(45) + 'New Implementation');
  console.log('-'.repeat(110));

  for (const result of upgradeResults) {
    console.log(
      result.name.padEnd(20) + result.proxy.padEnd(45) + result.newImpl,
    );
  }

  console.log('\n✅ All upgrades completed successfully!');
  console.log('='.repeat(70));
  console.log('\n📝 Note: The indexer will automatically pick up new events');
  console.log('   from the upgraded contracts. No configuration changes needed.');
  console.log('='.repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

