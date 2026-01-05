import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Upgrade NodesFacet to add CLOB approval functions
 *
 * This script:
 * 1. Deploys a new NodesFacet with the new functions
 * 2. Adds only the NEW selectors to the Diamond (existing ones remain)
 */

// New selectors to add (CLOB approval functions)
const NEW_SELECTORS = [
  '0xf7502631', // setAuraAssetAddress
  '0x89a1153c', // getAuraAssetAddress
  '0x40ed3118', // approveClobForTokens
  '0xe1ed5db1', // revokeClobApproval
  '0xcb24a4b4', // isClobApproved
];

async function main() {
  console.log('==========================================');
  console.log('Upgrading NodesFacet - Adding CLOB Approval');
  console.log('==========================================\n');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(
    `Account balance: ${ethers.formatEther(
      await deployer.provider.getBalance(deployer.address),
    )} ETH\n`,
  );

  // Get Diamond address from environment or chain-constants
  const DIAMOND_ADDRESS =
    process.env.DIAMOND_ADDRESS || '0x2516CAdb7b3d4E94094bC4580C271B8559902e3f';
  console.log(`Diamond address: ${DIAMOND_ADDRESS}\n`);

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

  // Step 1: Deploy new NodesFacet
  console.log('\nStep 1: Deploying new NodesFacet...');
  const NodesFacet = await ethers.getContractFactory('NodesFacet');
  const nodesFacet = await NodesFacet.deploy();
  await nodesFacet.waitForDeployment();
  const newFacetAddress = await nodesFacet.getAddress();
  console.log(`  ✓ New NodesFacet deployed: ${newFacetAddress}\n`);

  // Step 2: Add new selectors to Diamond
  console.log('Step 2: Adding new selectors to Diamond...');
  console.log(`  Selectors to add: ${NEW_SELECTORS.length}`);

  try {
    const tx = await diamondCut.diamondCut(
      [
        {
          facetAddress: newFacetAddress,
          action: 0, // Add
          functionSelectors: NEW_SELECTORS,
        },
      ],
      ethers.ZeroAddress,
      '0x',
    );
    await tx.wait();
    console.log(`  ✓ Added ${NEW_SELECTORS.length} new selectors\n`);
  } catch (error: any) {
    if (error.message.includes('Selector already exists')) {
      console.log(
        '  ⚠ Some selectors already exist, trying Replace action...',
      );
      try {
        const tx = await diamondCut.diamondCut(
          [
            {
              facetAddress: newFacetAddress,
              action: 1, // Replace
              functionSelectors: NEW_SELECTORS,
            },
          ],
          ethers.ZeroAddress,
          '0x',
        );
        await tx.wait();
        console.log(`  ✓ Replaced ${NEW_SELECTORS.length} selectors\n`);
      } catch (replaceError: any) {
        console.error('  ✗ Failed to replace selectors:', replaceError.message);
        process.exit(1);
      }
    } else {
      console.error('  ✗ Failed to add selectors:', error.message);
      process.exit(1);
    }
  }

  // Step 3: Verify the upgrade
  console.log('Step 3: Verifying upgrade...');
  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    DIAMOND_ADDRESS,
  );

  for (const selector of NEW_SELECTORS) {
    const facetAddr = await diamondLoupe.facetAddress(selector);
    if (facetAddr.toLowerCase() === newFacetAddress.toLowerCase()) {
      console.log(`  ✓ Selector ${selector} -> ${newFacetAddress}`);
    } else {
      console.log(
        `  ⚠ Selector ${selector} -> ${facetAddr} (expected ${newFacetAddress})`,
      );
    }
  }

  // Step 4: Save upgrade info
  console.log('\nStep 4: Saving upgrade info...');
  const upgradesDir = path.join(__dirname, '..', 'upgrades');
  if (!fs.existsSync(upgradesDir)) {
    fs.mkdirSync(upgradesDir, { recursive: true });
  }

  const upgradeInfo = {
    diamond: DIAMOND_ADDRESS,
    facet: 'NodesFacet',
    newFacetAddress,
    selectorsAdded: NEW_SELECTORS,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
  };

  const upgradePath = path.join(
    upgradesDir,
    `nodes-facet-clob-approval-${Date.now()}.json`,
  );
  fs.writeFileSync(upgradePath, JSON.stringify(upgradeInfo, null, 2));
  console.log(`  ✓ Upgrade info saved to: ${upgradePath}\n`);

  // Step 5: Update chain-constants.ts
  console.log('Step 5: Updating chain-constants.ts...');
  const constantsPath = path.join(__dirname, '..', 'chain-constants.ts');
  if (fs.existsSync(constantsPath)) {
    let content = fs.readFileSync(constantsPath, 'utf-8');

    // Update NODES_FACET_ADDRESS
    content = content.replace(
      /export const NEXT_PUBLIC_NODES_FACET_ADDRESS =\s*'[^']+'/,
      `export const NEXT_PUBLIC_NODES_FACET_ADDRESS =\n  '${newFacetAddress}'`,
    );

    fs.writeFileSync(constantsPath, content);
    console.log(`  ✓ Updated NEXT_PUBLIC_NODES_FACET_ADDRESS\n`);
  }

  // Print summary
  console.log('==========================================');
  console.log('NodesFacet Upgrade Complete!');
  console.log('==========================================\n');

  console.log('New functions available:');
  console.log('  - setAuraAssetAddress(address)');
  console.log('  - getAuraAssetAddress()');
  console.log('  - approveClobForTokens(bytes32 node, address clob)');
  console.log('  - revokeClobApproval(bytes32 node, address clob)');
  console.log('  - isClobApproved(address clob)\n');

  console.log('Next steps:');
  console.log(
    '1. Call setAuraAssetAddress() to configure the AuraAsset address',
  );
  console.log(
    `   Diamond.setAuraAssetAddress("${process.env.AURA_ASSET_ADDRESS || '0xdc1B355885ba73EFf0f0a5A72F12D87e785581a8'}")`,
  );
  console.log(
    '2. Node owners can now call approveClobForTokens() to enable trading\n',
  );

  return upgradeInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
