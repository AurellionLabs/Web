/**
 * Set AuraAsset address in Diamond contract
 *
 * Usage:
 *   npx hardhat run scripts/set-diamond-aura-asset.ts --network baseSepolia
 */

import { ethers } from 'hardhat';
import {
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
} from '../chain-constants';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('\n🔧 Setting AuraAsset address in Diamond\n');
  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Diamond: ${NEXT_PUBLIC_DIAMOND_ADDRESS}`);
  console.log(`AuraAsset: ${NEXT_PUBLIC_AURA_ASSET_ADDRESS}\n`);

  // Get Diamond contract
  const diamond = await ethers.getContractAt(
    [
      'function setAuraAssetAddress(address _auraAsset) external',
      'function getAuraAssetAddress() external view returns (address)',
      'function owner() external view returns (address)',
    ],
    NEXT_PUBLIC_DIAMOND_ADDRESS,
    deployer,
  );

  // Check current owner
  const owner = await diamond.owner();
  console.log(`Diamond owner: ${owner}`);

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Deployer is not the Diamond owner. Owner is ${owner}`);
  }

  // Check current AuraAsset address
  const currentAddress = await diamond.getAuraAssetAddress();
  console.log(`Current AuraAsset: ${currentAddress}`);

  if (
    currentAddress.toLowerCase() ===
    NEXT_PUBLIC_AURA_ASSET_ADDRESS.toLowerCase()
  ) {
    console.log('\n✅ AuraAsset address is already set correctly!\n');
    return;
  }

  // Set new AuraAsset address
  console.log('\n📝 Setting new AuraAsset address...');
  const tx = await diamond.setAuraAssetAddress(NEXT_PUBLIC_AURA_ASSET_ADDRESS);
  console.log(`Transaction: ${tx.hash}`);
  await tx.wait();

  // Verify
  const newAddress = await diamond.getAuraAssetAddress();
  console.log(`\n✅ AuraAsset address updated!`);
  console.log(`   Old: ${currentAddress}`);
  console.log(`   New: ${newAddress}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
