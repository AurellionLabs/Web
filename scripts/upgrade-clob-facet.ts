import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to upgrade CLOBFacet with new node sell order functions
 *
 * New functions added:
 * - placeNodeSellOrder(address,address,uint256,address,uint256,uint256) - For sell orders from node inventory
 * - placeBuyOrder(address,uint256,address,uint256,uint256) - For buy orders
 * - cancelCLOBOrder(bytes32) - Cancel any order
 * - getOpenOrders(address,uint256,address) - Get open orders for a market
 * - getOrderWithTokens(bytes32) - Get order details with token info
 */

async function main() {
  console.log('==========================================');
  console.log('Upgrading CLOBFacet with Node Sell Order Support');
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
  console.log('\nDeploying new CLOBFacet...');
  const CLOBFacet = await ethers.getContractFactory('CLOBFacet');
  const clobFacet = await CLOBFacet.deploy();
  await clobFacet.waitForDeployment();
  const newFacetAddress = await clobFacet.getAddress();
  console.log(`  ✓ New CLOBFacet deployed at: ${newFacetAddress}`);

  // Get function selectors for new CLOBFacet
  const clobInterface = clobFacet.interface;
  const newSelectors: string[] = [];

  // Get all function selectors from the contract
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

  // Prepare diamond cut
  const cuts: any[] = [];

  // If there are old selectors, remove them first
  if (oldClobSelectors.length > 0) {
    console.log('\nRemoving old CLOBFacet selectors...');
    cuts.push({
      facetAddress: ethers.ZeroAddress,
      action: 2, // Remove
      functionSelectors: oldClobSelectors,
    });
  }

  // Add new selectors
  console.log('Adding new CLOBFacet selectors...');
  cuts.push({
    facetAddress: newFacetAddress,
    action: 0, // Add
    functionSelectors: newSelectors,
  });

  // Execute diamond cut
  console.log('\nExecuting diamond cut...');
  const tx = await diamondCut.diamondCut(cuts, ethers.ZeroAddress, '0x');
  const receipt = await tx.wait();
  console.log(`  ✓ Diamond cut executed: ${receipt?.hash}`);

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
    txHash: receipt?.hash,
    selectorsAdded: newSelectors.length,
    selectorsRemoved: oldClobSelectors.length,
  };

  const upgradesDir = path.join(__dirname, '..', 'upgrades');
  if (!fs.existsSync(upgradesDir)) {
    fs.mkdirSync(upgradesDir, { recursive: true });
  }

  const upgradePath = path.join(
    upgradesDir,
    `upgrade-clob-facet-${Date.now()}.json`,
  );
  fs.writeFileSync(upgradePath, JSON.stringify(upgradeInfo, null, 2));
  console.log(`\n✓ Upgrade info saved to: ${upgradePath}`);

  console.log('\n==========================================');
  console.log('CLOBFacet Upgrade Complete!');
  console.log('==========================================\n');
  console.log('New functions available:');
  console.log('  - placeNodeSellOrder() - For node sell orders');
  console.log('  - placeBuyOrder() - For buy orders');
  console.log('  - cancelCLOBOrder() - Cancel orders');
  console.log('  - getOpenOrders() - View open orders');
  console.log('  - getOrderWithTokens() - Get order details\n');

  return upgradeInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
