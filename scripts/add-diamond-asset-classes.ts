#!/usr/bin/env npx ts-node
/**
 * Script to add supported asset classes to the Diamond's AssetsFacet
 *
 * This should be run after deployment if asset classes were not added during deployment,
 * or to add classes to an existing Diamond deployment.
 *
 * Usage:
 *   npx hardhat run scripts/add-diamond-asset-classes.ts --network baseSepolia
 *
 * Environment variables:
 *   DIAMOND_ADDRESS - Override the Diamond address (optional, defaults to chain-constants.ts)
 */

import { ethers } from 'hardhat';

// Default asset classes to add
const DEFAULT_CLASSES = ['GOAT', 'SHEEP', 'COW', 'CHICKEN', 'DUCK'];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('\n=== Add Diamond Asset Classes ===\n');
  console.log('Account:', deployer.address);
  console.log(
    'Balance:',
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    'ETH',
  );

  // Get Diamond address from environment or chain-constants
  let diamondAddress = process.env.DIAMOND_ADDRESS;

  if (!diamondAddress) {
    try {
      // Dynamic import to get the address from chain-constants
      const chainConstants = await import('../chain-constants');
      diamondAddress = (chainConstants as any).NEXT_PUBLIC_DIAMOND_ADDRESS;
    } catch (e) {
      console.error('Could not load chain-constants.ts');
      process.exit(1);
    }
  }

  if (
    !diamondAddress ||
    diamondAddress === '0x0000000000000000000000000000000000000000'
  ) {
    console.error('Diamond address not found or is zero address');
    process.exit(1);
  }

  console.log('Diamond:', diamondAddress);

  // Get AssetsFacet interface on Diamond
  const assetsFacet = await ethers.getContractAt('AssetsFacet', diamondAddress);

  // Check current state
  console.log('\n=== Current State ===');
  let existingClasses: string[] = [];
  try {
    existingClasses = await assetsFacet.getSupportedClasses();
    console.log('Current supported classes:', existingClasses);

    if (existingClasses.length > 0) {
      // Filter out empty strings (tombstoned classes)
      const activeClasses = existingClasses.filter((c) => c.length > 0);
      if (activeClasses.length > 0) {
        console.log('Active classes:', activeClasses);
      }
    }
  } catch (e: any) {
    console.log('Could not get supported classes:', e.message);
  }

  // Determine which classes need to be added
  const classesToAdd = DEFAULT_CLASSES.filter(
    (className) => !existingClasses.includes(className),
  );

  if (classesToAdd.length === 0) {
    console.log('\n All default classes already exist. Nothing to add.');
    return;
  }

  // Add classes
  console.log('\n=== Adding Supported Classes ===');
  console.log('Classes to add:', classesToAdd);

  let successCount = 0;
  let failCount = 0;

  for (const className of classesToAdd) {
    try {
      console.log(`Adding class: ${className}...`);
      const tx = await assetsFacet.addSupportedClass(className);
      const receipt = await tx.wait();
      console.log(
        `  Added class: ${className} (tx: ${receipt?.hash?.slice(0, 10)}...)`,
      );
      successCount++;
    } catch (e: any) {
      if (
        e.message.includes('ClassAlreadyExists') ||
        e.message.includes('already')
      ) {
        console.log(`  Class ${className} already exists`);
      } else {
        console.log(`  Failed to add ${className}:`, e.message);
        failCount++;
      }
    }
  }

  // Verify final state
  console.log('\n=== Final State ===');
  try {
    const finalClasses = await assetsFacet.getSupportedClasses();
    const activeClasses = finalClasses.filter((c: string) => c.length > 0);
    console.log('Supported classes:', activeClasses);
  } catch (e: any) {
    console.log('Could not verify final state:', e.message);
  }

  console.log('\n=== Summary ===');
  console.log(`Added: ${successCount} classes`);
  if (failCount > 0) {
    console.log(`Failed: ${failCount} classes`);
  }
  console.log('\nAsset class setup complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nScript failed:', error.message);
    process.exit(1);
  });
