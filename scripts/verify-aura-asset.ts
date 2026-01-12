/**
 * Quick script to verify AuraAsset configuration
 */
import { ethers } from 'hardhat';
import {
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  NEXT_PUBLIC_DIAMOND_ADDRESS,
} from '../chain-constants';

async function main() {
  console.log('==========================================');
  console.log('Verifying AuraAsset Configuration');
  console.log('==========================================\n');

  console.log(`AuraAsset address: ${NEXT_PUBLIC_AURA_ASSET_ADDRESS}`);
  console.log(`Diamond address:   ${NEXT_PUBLIC_DIAMOND_ADDRESS}\n`);

  // Get AuraAsset contract
  const auraAsset = await ethers.getContractAt(
    'AuraAsset',
    NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  );

  // Check owner
  const owner = await auraAsset.owner();
  console.log(`AuraAsset owner: ${owner}`);

  // Check NodeManager
  const nodeManager = await auraAsset.NodeManager();
  console.log(`AuraAsset NodeManager: ${nodeManager}`);

  // Check if NodeManager is Diamond
  if (nodeManager.toLowerCase() === NEXT_PUBLIC_DIAMOND_ADDRESS.toLowerCase()) {
    console.log('✓ NodeManager is correctly set to Diamond');
  } else {
    console.log('✗ NodeManager is NOT set to Diamond!');
  }

  // Get Diamond contract and check getNodeStatus
  console.log('\nChecking Diamond.getNodeStatus...');
  const diamond = await ethers.getContractAt(
    'NodesFacet',
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  );

  try {
    const status = await diamond.getNodeStatus(NEXT_PUBLIC_DIAMOND_ADDRESS);
    console.log(`Diamond.getNodeStatus(Diamond) = ${status}`);
    if (status === '0x01') {
      console.log('✓ Diamond returns status 1 (valid node) for itself');
    } else {
      console.log(`✗ Unexpected status: ${status}`);
    }
  } catch (e: any) {
    console.log(`✗ getNodeStatus failed: ${e.message}`);
  }

  // Try to get bytecode to verify contracts exist
  console.log('\nVerifying contract bytecode...');
  const provider = ethers.provider;

  const auraAssetCode = await provider.getCode(NEXT_PUBLIC_AURA_ASSET_ADDRESS);
  console.log(`AuraAsset bytecode length: ${auraAssetCode.length} chars`);

  const diamondCode = await provider.getCode(NEXT_PUBLIC_DIAMOND_ADDRESS);
  console.log(`Diamond bytecode length: ${diamondCode.length} chars`);

  // Check if they're the same (they shouldn't be!)
  if (auraAssetCode === diamondCode) {
    console.log('⚠️  WARNING: AuraAsset and Diamond have SAME bytecode!');
  } else {
    console.log('✓ AuraAsset and Diamond have different bytecode');
  }

  console.log('\n==========================================');
  console.log('Verification Complete');
  console.log('==========================================\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
