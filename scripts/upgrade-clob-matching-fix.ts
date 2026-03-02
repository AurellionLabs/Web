import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to upgrade CLOBFacet with the matching bug fix
 *
 * Bug fixes:
 * 1. Crossed spread - orders from different placement functions now match
 * 2. Market orders sitting on book - now check legacy orders via fallback
 *
 * This script properly replaces the existing CLOBFacet by:
 * 1. Finding existing CLOB selectors
 * 2. Removing them
 * 3. Adding the new facet with all selectors
 */

async function main() {
  console.log('==========================================');
  console.log('Upgrading CLOBFacet - Matching Bug Fix');
  console.log('==========================================\n');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}\n`);

  // Get Diamond address from chain-constants
  const chainConstants = require('../chain-constants');
  const DIAMOND_ADDRESS = chainConstants.NEXT_PUBLIC_DIAMOND_ADDRESS;

  if (!DIAMOND_ADDRESS) {
    throw new Error('DIAMOND_ADDRESS not found in chain-constants');
  }

  console.log(`Diamond address: ${DIAMOND_ADDRESS}\n`);

  // Get Diamond contracts
  const diamondCut = await ethers.getContractAt('IDiamondCut', DIAMOND_ADDRESS);
  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    DIAMOND_ADDRESS,
  );

  // Verify ownership
  const ownershipFacet = await ethers.getContractAt(
    'IOwnership',
    DIAMOND_ADDRESS,
  );
  const owner = await ownershipFacet.owner();
  console.log(`Diamond owner: ${owner}`);

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error('Deployer is not the Diamond owner. Cannot upgrade.');
  }

  // Deploy new CLOBFacet
  console.log('\nDeploying new CLOBFacet with matching fix...');
  const CLOBFacet = await ethers.getContractFactory('CLOBFacet');
  const clobFacet = await CLOBFacet.deploy();
  await clobFacet.waitForDeployment();
  const newFacetAddress = await clobFacet.getAddress();
  console.log(`  ✓ New CLOBFacet deployed at: ${newFacetAddress}`);

  // Get function selectors for new CLOBFacet
  const clobInterface = clobFacet.interface;
  const newSelectors: string[] = [];

  // Get all function selectors from the contract
  console.log('\nNew CLOBFacet selectors:');
  clobInterface.forEachFunction((func) => {
    const selector = clobInterface.getFunction(func.name)?.selector;
    if (selector) {
      newSelectors.push(selector);
      console.log(`  - ${func.name}: ${selector}`);
    }
  });

  console.log(`\nTotal new selectors: ${newSelectors.length}`);

  // Find current CLOBFacet selectors to replace
  const facets = await diamondLoupe.facets();
  let oldClobSelectors: string[] = [];
  let oldClobAddress = '';

  // Find existing CLOB selectors by checking which facet has CLOB-related functions
  for (const facet of facets) {
    const selectors = facet.functionSelectors;
    // Check if this facet has createMarket (a known CLOBFacet function)
    const createMarketSelector =
      '0x' + ethers.id('createMarket(string,uint256,string)').slice(2, 10);
    if (selectors.includes(createMarketSelector)) {
      oldClobAddress = facet.facetAddress;
      oldClobSelectors = [...selectors];
      console.log(`\nFound existing CLOBFacet at: ${oldClobAddress}`);
      console.log(`  Selectors to replace: ${oldClobSelectors.length}`);
      break;
    }
  }

  if (oldClobSelectors.length === 0) {
    console.log('\nNo existing CLOBFacet found. Adding new facet...');

    // Just add the new facet
    const cuts = [
      {
        facetAddress: newFacetAddress,
        action: 0, // Add
        functionSelectors: newSelectors,
      },
    ];

    console.log('\nExecuting diamond cut (add)...');
    const tx = await diamondCut.diamondCut(cuts, ethers.ZeroAddress, '0x');
    const receipt = await tx.wait();
    console.log(`  ✓ Diamond cut executed: ${receipt?.hash}`);
  } else {
    // Use Replace action for existing selectors, Add for new ones
    const existingSet = new Set(oldClobSelectors.map((s) => s.toLowerCase()));
    const newSet = new Set(newSelectors.map((s) => s.toLowerCase()));

    const toReplace = newSelectors.filter((s) =>
      existingSet.has(s.toLowerCase()),
    );
    const toAdd = newSelectors.filter((s) => !existingSet.has(s.toLowerCase()));
    const toRemove = oldClobSelectors.filter(
      (s) => !newSet.has(s.toLowerCase()),
    );

    console.log(`\nSelectors to replace: ${toReplace.length}`);
    console.log(`Selectors to add: ${toAdd.length}`);
    console.log(`Selectors to remove: ${toRemove.length}`);

    const cuts: any[] = [];

    // Remove selectors that are no longer in the new facet
    if (toRemove.length > 0) {
      cuts.push({
        facetAddress: ethers.ZeroAddress,
        action: 2, // Remove
        functionSelectors: toRemove,
      });
    }

    // Replace existing selectors
    if (toReplace.length > 0) {
      cuts.push({
        facetAddress: newFacetAddress,
        action: 1, // Replace
        functionSelectors: toReplace,
      });
    }

    // Add new selectors
    if (toAdd.length > 0) {
      cuts.push({
        facetAddress: newFacetAddress,
        action: 0, // Add
        functionSelectors: toAdd,
      });
    }

    console.log('\nExecuting diamond cut...');
    const tx = await diamondCut.diamondCut(cuts, ethers.ZeroAddress, '0x');
    const receipt = await tx.wait();
    console.log(`  ✓ Diamond cut executed: ${receipt?.hash}`);
  }

  // Verify upgrade
  console.log('\nVerifying upgrade...');
  const updatedFacets = await diamondLoupe.facets();

  let found = false;
  for (const facet of updatedFacets) {
    if (facet.facetAddress.toLowerCase() === newFacetAddress.toLowerCase()) {
      console.log(
        `  ✓ New CLOBFacet found with ${facet.functionSelectors.length} selectors`,
      );
      found = true;
      break;
    }
  }

  if (!found) {
    console.error('  ✗ New CLOBFacet not found in Diamond!');
  }

  // Save upgrade info
  const upgradeInfo = {
    diamond: DIAMOND_ADDRESS,
    facet: 'CLOBFacet',
    oldAddress: oldClobAddress || 'N/A',
    newAddress: newFacetAddress,
    timestamp: new Date().toISOString(),
    description: 'Fix crossed spread and market order matching bugs',
    changes: [
      'placeOrder() now populates price-level arrays',
      'Added _matchOrderUnified() for consistent matching',
      'Added _matchAgainstLegacyOrders() fallback',
      'Added _matchSellOrderLegacy() and _matchBuyOrderLegacy()',
    ],
  };

  const upgradesDir = path.join(__dirname, '..', 'upgrades');
  if (!fs.existsSync(upgradesDir)) {
    fs.mkdirSync(upgradesDir, { recursive: true });
  }

  const upgradePath = path.join(
    upgradesDir,
    `upgrade-clob-matching-fix-${Date.now()}.json`,
  );
  fs.writeFileSync(upgradePath, JSON.stringify(upgradeInfo, null, 2));
  console.log(`\n✓ Upgrade info saved to: ${upgradePath}`);

  console.log('\n==========================================');
  console.log('CLOBFacet Upgrade Complete!');
  console.log('==========================================\n');
  console.log('Bug fixes applied:');
  console.log(
    '  1. Crossed spread - orders now match across all placement functions',
  );
  console.log(
    '  2. Market orders - now properly execute against legacy orders\n',
  );

  return upgradeInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
