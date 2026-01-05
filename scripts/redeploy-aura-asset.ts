/**
 * Script to redeploy AuraAsset with the correct NodeManager address
 *
 * Run with: npx hardhat run scripts/redeploy-aura-asset.ts --network baseSepolia
 */

import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  console.log(
    'Account balance:',
    (await deployer.provider.getBalance(deployer.address)).toString(),
  );

  // Current addresses from chain-constants.ts
  const AURUM_NODE_MANAGER = '0x6482Bf07f158D6ca7E6431c95d660a5D21eE505c';
  const METADATA_URI = 'https://aurellion.io/metadata/';

  console.log('\n📦 Deploying new AuraAsset with correct NodeManager...');
  console.log('   NodeManager:', AURUM_NODE_MANAGER);

  const AuraAssetFactory = await ethers.getContractFactory('AuraAsset');
  const auraAsset = await AuraAssetFactory.deploy(
    deployer.address,
    METADATA_URI,
    AURUM_NODE_MANAGER,
  );

  await auraAsset.waitForDeployment();
  const auraAssetAddress = await auraAsset.getAddress();
  const deployTx = auraAsset.deploymentTransaction();
  const receipt = await deployTx?.wait();

  console.log('   ✓ AuraAsset deployed at:', auraAssetAddress);
  console.log('   Block:', receipt?.blockNumber);

  // Add default classes
  console.log('\n⚙️  Adding default asset classes...');
  const defaultClasses = ['GOAT', 'SHEEP', 'COW', 'CHICKEN', 'DUCK'];
  for (const className of defaultClasses) {
    await auraAsset.addSupportedClass(className);
    console.log(`   ✓ Added class: ${className}`);
  }

  // Update AurumNodeManager to point to new AuraAsset
  console.log('\n⚙️  Updating AurumNodeManager with new AuraAsset...');
  const aurumNodeManager = await ethers.getContractAt(
    'AurumNodeManager',
    AURUM_NODE_MANAGER,
  );
  await aurumNodeManager.addToken(auraAssetAddress);
  console.log('   ✓ AurumNodeManager updated');

  // Update chain-constants.ts
  console.log('\n📝 Updating chain-constants.ts...');
  const constantsPath = path.join(__dirname, '..', 'chain-constants.ts');
  let constantsContent = fs.readFileSync(constantsPath, 'utf8');

  // Update AURA_ASSET_ADDRESS
  constantsContent = constantsContent.replace(
    /export const NEXT_PUBLIC_AURA_ASSET_ADDRESS =\s*['"][^'"]+['"]/,
    `export const NEXT_PUBLIC_AURA_ASSET_ADDRESS =\n  '${auraAssetAddress}'`,
  );

  fs.writeFileSync(constantsPath, constantsContent);
  console.log('   ✓ chain-constants.ts updated');

  console.log('\n✅ Deployment complete!');
  console.log('\nNew AuraAsset address:', auraAssetAddress);
  console.log('\n⚠️  Remember to:');
  console.log('   1. Update the indexer ponder.config.ts with the new address');
  console.log('   2. Restart the indexer');
  console.log('   3. Commit and push the changes');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
