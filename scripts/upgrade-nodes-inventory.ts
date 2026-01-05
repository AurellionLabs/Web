import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Upgrade Diamond to add Node Token Inventory functionality
 *
 * This script:
 * 1. Deploys updated NodesFacet with inventory functions
 * 2. Deploys ERC1155ReceiverFacet for token receiving
 * 3. Adds new selectors to the Diamond
 */

// New NodesFacet selectors (inventory functions only - CLOB approval already added)
const NEW_NODES_SELECTORS = [
  '0x0a063811', // creditNodeTokens
  '0x250b58d4', // depositTokensToNode
  '0x86f99af0', // withdrawTokensFromNode
  '0xa3cb5b6e', // transferTokensBetweenNodes
  '0x4794010e', // debitNodeTokens
  '0x2159e90e', // getNodeTokenBalance
  '0x653a5887', // getNodeTokenIds
  '0xe02b8288', // getNodeInventory
  '0x294cc9d5', // verifyTokenAccounting
];

// ERC1155ReceiverFacet selectors
const ERC1155_RECEIVER_SELECTORS = [
  '0xf23a6e61', // onERC1155Received
  '0xbc197c81', // onERC1155BatchReceived
  '0x01ffc9a7', // supportsInterface
];

async function main() {
  console.log('==========================================');
  console.log('Upgrading Diamond - Node Token Inventory');
  console.log('==========================================\n');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(
    `Account balance: ${ethers.formatEther(
      await deployer.provider.getBalance(deployer.address),
    )} ETH\n`,
  );

  // Get Diamond address
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

  // Step 1: Deploy updated NodesFacet
  console.log('\nStep 1: Deploying updated NodesFacet...');
  const NodesFacet = await ethers.getContractFactory('NodesFacet');
  const nodesFacet = await NodesFacet.deploy();
  await nodesFacet.waitForDeployment();
  const nodesFacetAddress = await nodesFacet.getAddress();
  console.log(`  ✓ NodesFacet deployed: ${nodesFacetAddress}\n`);

  // Step 2: Deploy ERC1155ReceiverFacet
  console.log('Step 2: Deploying ERC1155ReceiverFacet...');
  const ERC1155ReceiverFacet = await ethers.getContractFactory(
    'ERC1155ReceiverFacet',
  );
  const erc1155ReceiverFacet = await ERC1155ReceiverFacet.deploy();
  await erc1155ReceiverFacet.waitForDeployment();
  const erc1155ReceiverAddress = await erc1155ReceiverFacet.getAddress();
  console.log(`  ✓ ERC1155ReceiverFacet deployed: ${erc1155ReceiverAddress}\n`);

  // Step 3: Add new NodesFacet selectors
  console.log('Step 3: Adding new NodesFacet selectors...');
  console.log(`  Selectors to add: ${NEW_NODES_SELECTORS.length}`);

  try {
    const tx1 = await diamondCut.diamondCut(
      [
        {
          facetAddress: nodesFacetAddress,
          action: 0, // Add
          functionSelectors: NEW_NODES_SELECTORS,
        },
      ],
      ethers.ZeroAddress,
      '0x',
    );
    await tx1.wait();
    console.log(
      `  ✓ Added ${NEW_NODES_SELECTORS.length} NodesFacet selectors\n`,
    );
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('  ⚠ Some selectors already exist, trying Replace...');
      const tx1 = await diamondCut.diamondCut(
        [
          {
            facetAddress: nodesFacetAddress,
            action: 1, // Replace
            functionSelectors: NEW_NODES_SELECTORS,
          },
        ],
        ethers.ZeroAddress,
        '0x',
      );
      await tx1.wait();
      console.log(
        `  ✓ Replaced ${NEW_NODES_SELECTORS.length} NodesFacet selectors\n`,
      );
    } else {
      throw error;
    }
  }

  // Step 4: Add ERC1155ReceiverFacet selectors
  console.log('Step 4: Adding ERC1155ReceiverFacet selectors...');
  console.log(`  Selectors to add: ${ERC1155_RECEIVER_SELECTORS.length}`);

  try {
    const tx2 = await diamondCut.diamondCut(
      [
        {
          facetAddress: erc1155ReceiverAddress,
          action: 0, // Add
          functionSelectors: ERC1155_RECEIVER_SELECTORS,
        },
      ],
      ethers.ZeroAddress,
      '0x',
    );
    await tx2.wait();
    console.log(
      `  ✓ Added ${ERC1155_RECEIVER_SELECTORS.length} ERC1155ReceiverFacet selectors\n`,
    );
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('  ⚠ Some selectors already exist, trying Replace...');
      const tx2 = await diamondCut.diamondCut(
        [
          {
            facetAddress: erc1155ReceiverAddress,
            action: 1, // Replace
            functionSelectors: ERC1155_RECEIVER_SELECTORS,
          },
        ],
        ethers.ZeroAddress,
        '0x',
      );
      await tx2.wait();
      console.log(
        `  ✓ Replaced ${ERC1155_RECEIVER_SELECTORS.length} ERC1155ReceiverFacet selectors\n`,
      );
    } else {
      throw error;
    }
  }

  // Step 5: Verify the upgrade
  console.log('Step 5: Verifying upgrade...');
  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    DIAMOND_ADDRESS,
  );

  console.log('\n  NodesFacet selectors:');
  for (const selector of NEW_NODES_SELECTORS) {
    const facetAddr = await diamondLoupe.facetAddress(selector);
    const status =
      facetAddr.toLowerCase() === nodesFacetAddress.toLowerCase() ? '✓' : '⚠';
    console.log(`    ${status} ${selector}`);
  }

  console.log('\n  ERC1155ReceiverFacet selectors:');
  for (const selector of ERC1155_RECEIVER_SELECTORS) {
    const facetAddr = await diamondLoupe.facetAddress(selector);
    const status =
      facetAddr.toLowerCase() === erc1155ReceiverAddress.toLowerCase()
        ? '✓'
        : '⚠';
    console.log(`    ${status} ${selector}`);
  }

  // Step 6: Save upgrade info
  console.log('\nStep 6: Saving upgrade info...');
  const upgradesDir = path.join(__dirname, '..', 'upgrades');
  if (!fs.existsSync(upgradesDir)) {
    fs.mkdirSync(upgradesDir, { recursive: true });
  }

  const upgradeInfo = {
    diamond: DIAMOND_ADDRESS,
    nodesFacet: nodesFacetAddress,
    erc1155ReceiverFacet: erc1155ReceiverAddress,
    nodesSelectorsAdded: NEW_NODES_SELECTORS,
    erc1155SelectorsAdded: ERC1155_RECEIVER_SELECTORS,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
  };

  const upgradePath = path.join(
    upgradesDir,
    `nodes-inventory-${Date.now()}.json`,
  );
  fs.writeFileSync(upgradePath, JSON.stringify(upgradeInfo, null, 2));
  console.log(`  ✓ Upgrade info saved to: ${upgradePath}\n`);

  // Step 7: Update chain-constants.ts
  console.log('Step 7: Updating chain-constants.ts...');
  const constantsPath = path.join(__dirname, '..', 'chain-constants.ts');
  if (fs.existsSync(constantsPath)) {
    let content = fs.readFileSync(constantsPath, 'utf-8');

    // Update NODES_FACET_ADDRESS
    content = content.replace(
      /export const NEXT_PUBLIC_NODES_FACET_ADDRESS =\s*'[^']+'/,
      `export const NEXT_PUBLIC_NODES_FACET_ADDRESS =\n  '${nodesFacetAddress}'`,
    );

    // Add ERC1155_RECEIVER_FACET_ADDRESS if not present
    if (!content.includes('NEXT_PUBLIC_ERC1155_RECEIVER_FACET_ADDRESS')) {
      content = content.replace(
        /export const NEXT_PUBLIC_NODES_FACET_ADDRESS =/,
        `export const NEXT_PUBLIC_ERC1155_RECEIVER_FACET_ADDRESS =\n  '${erc1155ReceiverAddress}';\nexport const NEXT_PUBLIC_NODES_FACET_ADDRESS =`,
      );
    } else {
      content = content.replace(
        /export const NEXT_PUBLIC_ERC1155_RECEIVER_FACET_ADDRESS =\s*'[^']+'/,
        `export const NEXT_PUBLIC_ERC1155_RECEIVER_FACET_ADDRESS =\n  '${erc1155ReceiverAddress}'`,
      );
    }

    fs.writeFileSync(constantsPath, content);
    console.log(`  ✓ Updated chain-constants.ts\n`);
  }

  // Print summary
  console.log('==========================================');
  console.log('Node Token Inventory Upgrade Complete!');
  console.log('==========================================\n');

  console.log('New NodesFacet functions:');
  console.log('  - creditNodeTokens(bytes32, uint256, uint256)');
  console.log('  - depositTokensToNode(bytes32, uint256, uint256)');
  console.log('  - withdrawTokensFromNode(bytes32, uint256, uint256)');
  console.log(
    '  - transferTokensBetweenNodes(bytes32, bytes32, uint256, uint256)',
  );
  console.log('  - debitNodeTokens(bytes32, uint256, uint256)');
  console.log('  - getNodeTokenBalance(bytes32, uint256)');
  console.log('  - getNodeTokenIds(bytes32)');
  console.log('  - getNodeInventory(bytes32)');
  console.log('  - verifyTokenAccounting(uint256, bytes32[])\n');

  console.log('ERC1155ReceiverFacet functions:');
  console.log('  - onERC1155Received(...)');
  console.log('  - onERC1155BatchReceived(...)');
  console.log('  - supportsInterface(bytes4)\n');

  console.log('The Diamond can now:');
  console.log('  1. Receive ERC1155 tokens via safeTransferFrom');
  console.log('  2. Track internal balances per node');
  console.log('  3. Allow nodes to deposit/withdraw tokens');
  console.log('  4. Transfer tokens between nodes (same owner)\n');

  return upgradeInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
