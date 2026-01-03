import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('='.repeat(60));
  console.log('Deploying ProxyAdmin for Upgradeable Contracts');
  console.log('='.repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log(`\nDeployer address: ${deployer.address}`);
  console.log(
    `Deployer balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`,
  );

  // Deploy ProxyAdmin
  const ProxyAdminFactory = await ethers.getContractFactory('ProxyAdmin');
  const proxyAdmin = await ProxyAdminFactory.deploy();
  await proxyAdmin.waitForDeployment();

  const proxyAdminAddress = await proxyAdmin.getAddress();
  console.log(`\n✓ ProxyAdmin deployed at: ${proxyAdminAddress}`);

  // Get Gnosis Safe address from environment or use deployer as temporary
  const gnosisSafeAddress = process.env.GNOSIS_SAFE_ADDRESS;

  if (gnosisSafeAddress && gnosisSafeAddress !== '0x...') {
    console.log(`\nTransferring ProxyAdmin ownership to Gnosis Safe...`);
    await proxyAdmin.transferOwnership(gnosisSafeAddress);
    console.log(`✓ Ownership transferred to: ${gnosisSafeAddress}`);
  } else {
    console.log(`\n⚠️  GNOSIS_SAFE_ADDRESS not set in .env`);
    console.log(`   ProxyAdmin ownership remains with deployer`);
    console.log(`   Set GNOSIS_SAFE_ADDRESS in .env and call transferOwnership()`);
  }

  // Save ProxyAdmin address to a dedicated file for easy reference
  const proxyAdminConfig = {
    address: proxyAdminAddress,
    deployer: deployer.address,
    owner: gnosisSafeAddress || deployer.address,
    deployedAt: new Date().toISOString(),
    network: 'baseSepolia',
  };

  const configPath = path.join(__dirname, '..', 'proxy-admin.json');
  fs.writeFileSync(configPath, JSON.stringify(proxyAdminConfig, null, 2));
  console.log(`\n✓ ProxyAdmin config saved to: ${configPath}`);

  console.log('\n' + '='.repeat(60));
  console.log('ProxyAdmin Deployment Complete');
  console.log('='.repeat(60));
  console.log(`\nNext steps:`);
  console.log(`1. Run: npx hardhat run scripts/deploy-upgradeable.ts --network baseSepolia`);
  console.log(`   This will deploy implementation contracts and create proxies`);
  console.log(`\nProxyAdmin Address: ${proxyAdminAddress}`);
  console.log('='.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

