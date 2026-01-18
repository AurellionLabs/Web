#!/usr/bin/env npx ts-node
/**
 * Clean Diamond Facet Upgrade Script
 *
 * Usage:
 *   npx hardhat run scripts/upgrade-facet.ts --network baseSepolia
 *
 * Environment Variables:
 *   FACET_NAME     - Name of the facet to upgrade (required)
 *   DRY_RUN        - Set to 'true' to preview changes without executing
 *
 * Examples:
 *   FACET_NAME=NodesFacet npx hardhat run scripts/upgrade-facet.ts --network baseSepolia
 *   FACET_NAME=OrderRouterFacet DRY_RUN=true npx hardhat run scripts/upgrade-facet.ts --network baseSepolia
 */

import { ethers } from 'hardhat';
import { FACET_SELECTORS, CONTRACTS } from './deploy.config';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '../chain-constants';

// Diamond address - read from chain-constants
const DIAMOND_ADDRESS = NEXT_PUBLIC_DIAMOND_ADDRESS;

interface FacetCut {
  facetAddress: string;
  action: number; // 0=Add, 1=Replace, 2=Remove
  functionSelectors: string[];
}

async function main() {
  const facetName = process.env.FACET_NAME;
  const dryRun = process.env.DRY_RUN === 'true';

  if (!facetName) {
    console.error('❌ FACET_NAME environment variable is required');
    console.log('\nUsage:');
    console.log(
      '  FACET_NAME=NodesFacet npx hardhat run scripts/upgrade-facet.ts --network baseSepolia',
    );
    console.log('\nAvailable facets:');
    Object.keys(FACET_SELECTORS).forEach((name) => {
      console.log(
        `  - ${name} (${FACET_SELECTORS[name]?.length || 0} selectors)`,
      );
    });
    process.exit(1);
  }

  const selectors = FACET_SELECTORS[facetName];
  if (!selectors || selectors.length === 0) {
    console.error(`❌ No selectors found for facet: ${facetName}`);
    console.log('\nAvailable facets:');
    Object.keys(FACET_SELECTORS).forEach((name) => {
      console.log(`  - ${name}`);
    });
    process.exit(1);
  }

  const config = CONTRACTS[facetName];
  if (!config) {
    console.error(`❌ No contract config found for: ${facetName}`);
    process.exit(1);
  }

  console.log(`\n🔧 Upgrading ${facetName}`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Diamond: ${DIAMOND_ADDRESS}`);
  console.log(`Selectors: ${selectors.length}`);
  if (dryRun) console.log(`Mode: DRY RUN`);
  console.log('');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Get Diamond contracts
  const loupe = await ethers.getContractAt('IDiamondLoupe', DIAMOND_ADDRESS);
  const diamondCut = await ethers.getContractAt('IDiamondCut', DIAMOND_ADDRESS);

  // Step 1: Deploy new facet
  console.log(`\n📦 Step 1: Deploy new ${facetName}...`);
  let facetAddress: string;

  if (dryRun) {
    facetAddress = '0x' + '0'.repeat(40);
    console.log('   [DRY RUN] Would deploy facet');
  } else {
    const Factory = await ethers.getContractFactory(config.contractName);
    const facet = await Factory.deploy();
    await facet.waitForDeployment();
    facetAddress = await facet.getAddress();
    console.log(`   ✓ Deployed: ${facetAddress}`);
  }

  // Step 2: Analyze current state
  console.log(`\n🔍 Step 2: Analyze Diamond state...`);

  const toAdd: string[] = [];
  const toReplace: string[] = [];

  for (const selector of selectors) {
    try {
      const existingFacet = await loupe.facetAddress(selector);
      if (existingFacet === ethers.ZeroAddress) {
        toAdd.push(selector);
      } else if (
        !dryRun &&
        existingFacet.toLowerCase() !== facetAddress.toLowerCase()
      ) {
        toReplace.push(selector);
      } else if (dryRun) {
        // In dry run, assume all existing selectors need replacement
        toReplace.push(selector);
      }
    } catch {
      toAdd.push(selector);
    }
  }

  console.log(`   Selectors to ADD:     ${toAdd.length}`);
  console.log(`   Selectors to REPLACE: ${toReplace.length}`);

  if (toAdd.length === 0 && toReplace.length === 0) {
    console.log('\n✅ No changes needed - facet is up to date!');
    return;
  }

  // Step 3: Build facet cuts
  console.log(`\n⚙️  Step 3: Build diamond cut...`);

  const facetCuts: FacetCut[] = [];

  if (toReplace.length > 0) {
    facetCuts.push({
      facetAddress: facetAddress,
      action: 1, // Replace
      functionSelectors: toReplace,
    });
    console.log(`   Replace cut: ${toReplace.length} selectors`);
  }

  if (toAdd.length > 0) {
    facetCuts.push({
      facetAddress: facetAddress,
      action: 0, // Add
      functionSelectors: toAdd,
    });
    console.log(`   Add cut: ${toAdd.length} selectors`);
  }

  // Step 4: Execute
  console.log(`\n🚀 Step 4: Execute diamond cut...`);

  if (dryRun) {
    console.log('   [DRY RUN] Would execute:');
    facetCuts.forEach((cut) => {
      const action =
        cut.action === 0 ? 'ADD' : cut.action === 1 ? 'REPLACE' : 'REMOVE';
      console.log(`   - ${action} ${cut.functionSelectors.length} selectors`);
      cut.functionSelectors.forEach((s) => console.log(`     ${s}`));
    });
  } else {
    try {
      const tx = await diamondCut.diamondCut(
        facetCuts,
        ethers.ZeroAddress,
        '0x',
      );
      console.log(`   Transaction: ${tx.hash}`);
      await tx.wait();
      console.log('   ✓ Diamond cut completed!');
    } catch (error: any) {
      console.error('   ❌ Diamond cut failed:', error.message);
      process.exit(1);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ ${facetName} upgrade ${dryRun ? 'preview' : 'complete'}!`);
  if (!dryRun) {
    console.log(`   Facet address: ${facetAddress}`);
  }
  console.log(`   Added: ${toAdd.length} selectors`);
  console.log(`   Replaced: ${toReplace.length} selectors`);
  console.log('');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
