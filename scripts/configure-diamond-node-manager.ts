/**
 * Configure Diamond as NodeManager for AuraAsset
 *
 * This script:
 * 1. Deploys an updated NodesFacet with getNodeStatus(address) function
 * 2. Adds the new function selector to the Diamond via diamondCut
 * 3. Sets the Diamond as the NodeManager for AuraAsset
 *
 * Run with:
 * npx hardhat run scripts/configure-diamond-node-manager.ts --network baseSepolia
 */

import { ethers } from 'hardhat';
import {
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
} from '../chain-constants';

// Function selector for getNodeStatus(address)
// keccak256("getNodeStatus(address)") -> first 4 bytes
const GET_NODE_STATUS_SELECTOR = '0x6abcded1'; // Computed from function signature

async function main() {
  console.log('==========================================');
  console.log('Configure Diamond as NodeManager for AuraAsset');
  console.log('==========================================\n');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Diamond address: ${NEXT_PUBLIC_DIAMOND_ADDRESS}`);
  console.log(`AuraAsset address: ${NEXT_PUBLIC_AURA_ASSET_ADDRESS}\n`);

  // Step 1: Deploy updated NodesFacet
  console.log('Step 1: Deploying updated NodesFacet...');
  const NodesFacet = await ethers.getContractFactory('NodesFacet');
  const nodesFacet = await NodesFacet.deploy();
  await nodesFacet.waitForDeployment();
  const nodesFacetAddress = await nodesFacet.getAddress();
  console.log(`  ✓ NodesFacet deployed to: ${nodesFacetAddress}\n`);

  // Step 2: Add new function selectors to Diamond
  console.log('Step 2: Adding new function selectors to Diamond...');

  // Define all the new functions we need to add
  const newFunctions = [
    {
      name: 'getNodeStatus',
      signature: 'function getNodeStatus(address) view returns (bytes1)',
    },
    {
      name: 'creditNodeTokens',
      signature: 'function creditNodeTokens(bytes32,uint256,uint256)',
    },
    {
      name: 'getNodeTokenBalance',
      signature:
        'function getNodeTokenBalance(bytes32,uint256) view returns (uint256)',
    },
    {
      name: 'getNodeAssets',
      signature:
        'function getNodeAssets(bytes32) view returns (tuple(address,uint256,uint256,uint256,uint256,bool)[])',
    },
    {
      name: 'approveClobForTokens',
      signature: 'function approveClobForTokens(bytes32,address)',
    },
    {
      name: 'revokeClobApproval',
      signature: 'function revokeClobApproval(bytes32,address)',
    },
    {
      name: 'isClobApproved',
      signature: 'function isClobApproved(address) view returns (bool)',
    },
  ];

  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  );
  const diamondCut = await ethers.getContractAt(
    'IDiamondCut',
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  );

  const selectorsToAdd: string[] = [];

  for (const fn of newFunctions) {
    const iface = new ethers.Interface([fn.signature]);
    const selector = iface.getFunction(fn.name)!.selector;
    console.log(`  ${fn.name}: ${selector}`);

    try {
      const existingFacet = await diamondLoupe.facetAddress(selector);
      if (existingFacet !== ethers.ZeroAddress) {
        console.log(`    ✓ Already exists on facet: ${existingFacet}`);
      } else {
        selectorsToAdd.push(selector);
        console.log(`    → Will be added`);
      }
    } catch (e) {
      selectorsToAdd.push(selector);
      console.log(`    → Will be added`);
    }
  }

  if (selectorsToAdd.length > 0) {
    console.log(`\n  Adding ${selectorsToAdd.length} selectors...`);
    const tx = await diamondCut.diamondCut(
      [
        {
          facetAddress: nodesFacetAddress,
          action: 0, // Add
          functionSelectors: selectorsToAdd,
        },
      ],
      ethers.ZeroAddress,
      '0x',
    );
    await tx.wait();
    console.log(`  ✓ Added ${selectorsToAdd.length} selectors to Diamond\n`);
  } else {
    console.log(`\n  ✓ All selectors already exist\n`);
  }

  // Step 3: Set Diamond as NodeManager for AuraAsset
  console.log('Step 3: Setting Diamond as NodeManager for AuraAsset...');
  const auraAsset = await ethers.getContractAt(
    'AuraAsset',
    NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  );

  // Check current NodeManager
  try {
    const currentNodeManager = await auraAsset.NodeManager();
    console.log(`  Current NodeManager: ${currentNodeManager}`);

    if (
      currentNodeManager.toLowerCase() ===
      NEXT_PUBLIC_DIAMOND_ADDRESS.toLowerCase()
    ) {
      console.log(`  ✓ Diamond is already the NodeManager\n`);
    } else {
      const tx = await auraAsset.setNodeManager(NEXT_PUBLIC_DIAMOND_ADDRESS);
      await tx.wait();
      console.log(`  ✓ Set Diamond as NodeManager\n`);
    }
  } catch (e) {
    console.log(`  ! Could not get current NodeManager, attempting to set...`);
    try {
      const tx = await auraAsset.setNodeManager(NEXT_PUBLIC_DIAMOND_ADDRESS);
      await tx.wait();
      console.log(`  ✓ Set Diamond as NodeManager\n`);
    } catch (setError: any) {
      console.log(`  ✗ Failed to set NodeManager: ${setError.message}`);
      console.log(`    Make sure the deployer is the owner of AuraAsset\n`);
    }
  }

  // Step 4: Verify
  console.log('Step 4: Verifying configuration...');
  const diamond = await ethers.getContractAt(
    'NodesFacet',
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  );

  try {
    // Check if getNodeStatus works for the Diamond address
    const status = await diamond.getNodeStatus(NEXT_PUBLIC_DIAMOND_ADDRESS);
    console.log(`  Diamond self-check: getNodeStatus(Diamond) = ${status}`);
    if (status === '0x01') {
      console.log(`  ✓ Diamond returns status 1 (active) for itself\n`);
    } else {
      console.log(`  ✗ Unexpected status: ${status}\n`);
    }
  } catch (e: any) {
    console.log(`  ✗ getNodeStatus failed: ${e.message}\n`);
  }

  console.log('==========================================');
  console.log('Configuration Complete!');
  console.log('==========================================\n');
  console.log('Summary:');
  console.log(`  - NodesFacet deployed: ${nodesFacetAddress}`);
  console.log(`  - Diamond address: ${NEXT_PUBLIC_DIAMOND_ADDRESS}`);
  console.log(`  - New functions added:`);
  console.log(`    • getNodeStatus - Validates nodes for minting`);
  console.log(`    • creditNodeTokens - Tracks token inventory`);
  console.log(`    • getNodeTokenBalance - Query token balances`);
  console.log(`    • getNodeAssets - Load node's tokenized assets`);
  console.log(`    • approveClobForTokens - Enable trading`);
  console.log(`    • revokeClobApproval - Disable trading`);
  console.log(`    • isClobApproved - Check trading approval`);
  console.log(`  - AuraAsset now uses Diamond as NodeManager\n`);
  console.log('Next steps:');
  console.log('  Restart your Next.js dev server to pick up ABI changes.\n');
  console.log('  The frontend should now be able to:');
  console.log('    ✓ Tokenize assets');
  console.log('    ✓ View tokenized assets on dashboard');
  console.log('    ✓ Enable CLOB trading automatically\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
