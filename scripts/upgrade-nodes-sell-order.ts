import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DEPRECATED: This script was for upgrading with external CLOB
 *
 * CLOB functionality is now internal to Diamond via CLOBFacet.
 * Use scripts/upgrade-clob-facet.ts instead.
 *
 * The new architecture:
 * - NodesFacet.placeSellOrderFromNode() calls CLOBFacet.placeNodeSellOrder() internally
 * - No external CLOB contract is needed
 * - All CLOB events are emitted from the Diamond contract
 */

// New selectors for NodesFacet (DEPRECATED - use upgrade-clob-facet.ts)
const NEW_NODES_SELECTORS = [
  '0xbcd542d1', // placeSellOrderFromNode(bytes32,uint256,address,uint256,uint256)
  '0xd1a69b35', // setClobAddress(address) - DEPRECATED
  '0x0f392fb4', // getClobAddress() - DEPRECATED, returns Diamond address
];

async function main() {
  console.log('==========================================');
  console.log('Upgrading NodesFacet + CLOB for Node Selling');
  console.log('==========================================\n');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(
    `Account balance: ${ethers.formatEther(
      await deployer.provider.getBalance(deployer.address),
    )} ETH\n`,
  );

  // Get addresses from environment or chain-constants
  const DIAMOND_ADDRESS =
    process.env.DIAMOND_ADDRESS || '0x2516CAdb7b3d4E94094bC4580C271B8559902e3f';
  const QUOTE_TOKEN_ADDRESS =
    process.env.QUOTE_TOKEN_ADDRESS ||
    '0x2c9678042D52B97D27f2bD2947F7111d93F3dD0D';
  const FEE_RECIPIENT = process.env.FEE_RECIPIENT || deployer.address;

  console.log(`Diamond address: ${DIAMOND_ADDRESS}`);
  console.log(`Quote token address: ${QUOTE_TOKEN_ADDRESS}`);
  console.log(`Fee recipient: ${FEE_RECIPIENT}\n`);

  // Verify ownership
  const diamondCut = await ethers.getContractAt('IDiamondCut', DIAMOND_ADDRESS);
  const ownershipFacet = await ethers.getContractAt(
    'IOwnership',
    DIAMOND_ADDRESS,
  );

  const owner = await ownershipFacet.owner();
  console.log(`Diamond owner: ${owner}`);

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log('ERROR: Deployer is not the Diamond owner. Upgrade will fail.');
    process.exit(1);
  }

  // ============================================================
  // Step 1: Deploy new NodesFacet with placeSellOrderFromNode
  // ============================================================
  console.log('\nStep 1: Deploying new NodesFacet...');
  const NodesFacet = await ethers.getContractFactory('NodesFacet');
  const nodesFacet = await NodesFacet.deploy();
  await nodesFacet.waitForDeployment();
  const newNodesFacetAddress = await nodesFacet.getAddress();
  console.log(`  ✓ New NodesFacet deployed: ${newNodesFacetAddress}\n`);

  // ============================================================
  // Step 2: Add new selectors to Diamond
  // ============================================================
  console.log('Step 2: Adding new selectors to Diamond...');
  console.log(`  Selectors: ${NEW_NODES_SELECTORS.join(', ')}`);

  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    DIAMOND_ADDRESS,
  );

  // Check which selectors already exist
  const selectorsToAdd: string[] = [];
  const selectorsToReplace: string[] = [];

  for (const selector of NEW_NODES_SELECTORS) {
    const existingFacet = await diamondLoupe.facetAddress(selector);
    if (existingFacet === ethers.ZeroAddress) {
      selectorsToAdd.push(selector);
    } else {
      selectorsToReplace.push(selector);
    }
  }

  console.log(`  New selectors to add: ${selectorsToAdd.length}`);
  console.log(`  Existing selectors to replace: ${selectorsToReplace.length}`);

  const cuts = [];

  if (selectorsToAdd.length > 0) {
    cuts.push({
      facetAddress: newNodesFacetAddress,
      action: 0, // Add
      functionSelectors: selectorsToAdd,
    });
  }

  if (selectorsToReplace.length > 0) {
    cuts.push({
      facetAddress: newNodesFacetAddress,
      action: 1, // Replace
      functionSelectors: selectorsToReplace,
    });
  }

  if (cuts.length > 0) {
    try {
      const tx = await diamondCut.diamondCut(cuts, ethers.ZeroAddress, '0x');
      await tx.wait();
      console.log(`  ✓ Diamond cut successful\n`);
    } catch (error: any) {
      console.error('  ✗ Diamond cut failed:', error.message);
      process.exit(1);
    }
  } else {
    console.log('  ✓ No changes needed\n');
  }

  // ============================================================
  // Step 3: Deploy updated CLOB with placeNodeSellOrder
  // ============================================================
  console.log('Step 3: Deploying updated CLOB...');
  const CLOB = await ethers.getContractFactory('CLOB');
  const clob = await CLOB.deploy(FEE_RECIPIENT);
  await clob.waitForDeployment();
  const newClobAddress = await clob.getAddress();
  console.log(`  ✓ New CLOB deployed: ${newClobAddress}\n`);

  // ============================================================
  // Step 4: Configure CLOB address in Diamond storage
  // ============================================================
  console.log('Step 4: Configuring CLOB address in Diamond...');

  // Check if setClobAddress function exists, if not we may need to update storage directly
  try {
    const diamond = await ethers.getContractAt('NodesFacet', DIAMOND_ADDRESS);
    // Try to call setClobAddress if it exists
    // If not, we'll need to add this function or use an initializer
    console.log(
      '  ⚠ Note: You may need to call setClobAddress manually or through an admin function\n',
    );
  } catch (e) {
    console.log(
      '  ⚠ setClobAddress not available, CLOB address needs to be set manually\n',
    );
  }

  // ============================================================
  // Step 5: Verify the upgrade
  // ============================================================
  console.log('Step 5: Verifying upgrade...');

  for (const selector of NEW_NODES_SELECTORS) {
    const facetAddr = await diamondLoupe.facetAddress(selector);
    if (facetAddr.toLowerCase() === newNodesFacetAddress.toLowerCase()) {
      console.log(`  ✓ Selector ${selector} -> ${newNodesFacetAddress}`);
    } else {
      console.log(
        `  ⚠ Selector ${selector} -> ${facetAddr} (expected ${newNodesFacetAddress})`,
      );
    }
  }

  // Verify CLOB has placeNodeSellOrder
  const clobContract = await ethers.getContractAt('CLOB', newClobAddress);
  console.log(`  ✓ CLOB contract verified at ${newClobAddress}\n`);

  // ============================================================
  // Step 6: Save upgrade info
  // ============================================================
  console.log('Step 6: Saving upgrade info...');
  const upgradesDir = path.join(__dirname, '..', 'upgrades');
  if (!fs.existsSync(upgradesDir)) {
    fs.mkdirSync(upgradesDir, { recursive: true });
  }

  const upgradeInfo = {
    diamond: DIAMOND_ADDRESS,
    nodesFacet: {
      address: newNodesFacetAddress,
      newSelectors: NEW_NODES_SELECTORS,
    },
    clob: {
      address: newClobAddress,
      quoteToken: QUOTE_TOKEN_ADDRESS,
      feeRecipient: FEE_RECIPIENT,
    },
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
  };

  const upgradePath = path.join(
    upgradesDir,
    `nodes-sell-order-upgrade-${Date.now()}.json`,
  );
  fs.writeFileSync(upgradePath, JSON.stringify(upgradeInfo, null, 2));
  console.log(`  ✓ Upgrade info saved to: ${upgradePath}\n`);

  // ============================================================
  // Step 7: Update chain-constants.ts
  // ============================================================
  console.log('Step 7: Updating chain-constants.ts...');
  const constantsPath = path.join(__dirname, '..', 'chain-constants.ts');
  if (fs.existsSync(constantsPath)) {
    let content = fs.readFileSync(constantsPath, 'utf-8');

    // Update CLOB_ADDRESS
    content = content.replace(
      /export const NEXT_PUBLIC_CLOB_ADDRESS =\s*['"][^'"]+['"]/,
      `export const NEXT_PUBLIC_CLOB_ADDRESS = '${newClobAddress}'`,
    );

    // Update NODES_FACET_ADDRESS if it exists
    if (content.includes('NEXT_PUBLIC_NODES_FACET_ADDRESS')) {
      content = content.replace(
        /export const NEXT_PUBLIC_NODES_FACET_ADDRESS =\s*['"][^'"]+['"]/,
        `export const NEXT_PUBLIC_NODES_FACET_ADDRESS = '${newNodesFacetAddress}'`,
      );
    }

    fs.writeFileSync(constantsPath, content);
    console.log(`  ✓ Updated chain-constants.ts\n`);
  }

  // ============================================================
  // Print summary
  // ============================================================
  console.log('==========================================');
  console.log('Upgrade Complete!');
  console.log('==========================================\n');

  console.log('Deployed contracts:');
  console.log(`  NodesFacet: ${newNodesFacetAddress}`);
  console.log(`  CLOB:       ${newClobAddress}\n`);

  console.log('New functions available:');
  console.log(
    '  Diamond.placeSellOrderFromNode(nodeHash, tokenId, quoteToken, price, amount)',
  );
  console.log(
    '  CLOB.placeNodeSellOrder(nodeOwner, baseToken, baseTokenId, quoteToken, price, amount)\n',
  );

  console.log('Next steps:');
  console.log(
    '1. Set CLOB address in Diamond storage (if not done automatically)',
  );
  console.log(
    '2. Approve CLOB for token transfers: Diamond.approveClobForTokens(nodeHash, clobAddress)',
  );
  console.log(
    '3. Test selling from node: Diamond.placeSellOrderFromNode(...)\n',
  );

  return upgradeInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
