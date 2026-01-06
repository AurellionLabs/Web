/**
 * Set Diamond as NodeManager for AuraAsset
 *
 * This script MUST be run from the AuraAsset owner account.
 *
 * Run with:
 * npx hardhat run scripts/set-aura-asset-node-manager.ts --network baseSepolia
 */

import { ethers } from 'hardhat';
import {
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
} from '../chain-constants';

async function main() {
  console.log('==========================================');
  console.log('Set Diamond as NodeManager for AuraAsset');
  console.log('==========================================\n');

  const [deployer] = await ethers.getSigners();
  console.log(`Your address: ${deployer.address}`);
  console.log(`Diamond address: ${NEXT_PUBLIC_DIAMOND_ADDRESS}`);
  console.log(`AuraAsset address: ${NEXT_PUBLIC_AURA_ASSET_ADDRESS}\n`);

  // Get AuraAsset contract
  const auraAsset = await ethers.getContractAt(
    'AuraAsset',
    NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  );

  // Check current owner
  console.log('Checking AuraAsset ownership...');
  const owner = await auraAsset.owner();
  console.log(`  AuraAsset owner: ${owner}`);
  console.log(`  Your address:    ${deployer.address}`);

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log('\n❌ ERROR: You are NOT the owner of AuraAsset!');
    console.log(`\nTo fix this, you need to:`);
    console.log(`  1. Switch to the account: ${owner}`);
    console.log(`  2. Run this script again`);
    console.log(`\nOR have the owner call this function manually:`);
    console.log(`  auraAsset.setNodeManager("${NEXT_PUBLIC_DIAMOND_ADDRESS}")`);
    process.exit(1);
  }

  console.log('  ✓ You are the owner\n');

  // Check current NodeManager
  console.log('Checking current NodeManager...');
  try {
    // Try to read NodeManager (it might not have a public getter)
    const nodeManagerAddress = await ethers.provider.getStorage(
      NEXT_PUBLIC_AURA_ASSET_ADDRESS,
      1, // Storage slot 1 (after the ERC1155 state)
    );
    console.log(`  NodeManager storage slot: ${nodeManagerAddress}\n`);
  } catch (e) {
    console.log('  (Could not read NodeManager directly)\n');
  }

  // Set NodeManager to Diamond
  console.log('Setting Diamond as NodeManager...');
  try {
    const tx = await auraAsset.setNodeManager(NEXT_PUBLIC_DIAMOND_ADDRESS);
    console.log(`  Transaction hash: ${tx.hash}`);
    await tx.wait();
    console.log('  ✓ Successfully set Diamond as NodeManager!\n');
  } catch (e: any) {
    console.log(`  ✗ Failed: ${e.message}\n`);
    process.exit(1);
  }

  // Verify by testing getNodeStatus
  console.log('Verifying configuration...');
  const diamond = await ethers.getContractAt(
    'NodesFacet',
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  );
  try {
    const status = await diamond.getNodeStatus(NEXT_PUBLIC_DIAMOND_ADDRESS);
    console.log(`  getNodeStatus(Diamond) = ${status}`);
    if (status === '0x01') {
      console.log('  ✓ Diamond returns status 1 (valid node)\n');
    }
  } catch (e: any) {
    console.log(`  Warning: ${e.message}\n`);
  }

  console.log('==========================================');
  console.log('Configuration Complete!');
  console.log('==========================================\n');
  console.log('AuraAsset now uses Diamond as its NodeManager.');
  console.log('You should now be able to tokenize assets from the frontend.\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
