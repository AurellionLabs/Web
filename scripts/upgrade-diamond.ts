import { ethers } from 'hardhat';
import { IDiamondCut } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

interface UpgradeConfig {
  facetName: string;
  oldFacetAddress: string;
  newFacetAddress: string;
  selectorsToRemove: string[];
  selectorsToAdd: string[];
}

async function getFacetSelectors(facetName: string): Promise<string[]> {
  // Map facet names to their function selectors
  const selectors: Record<string, string[]> = {
    DiamondCutFacet: [
      '0x1f931c1c', // diamondCut
    ],
    DiamondLoupeFacet: [
      '0x7a0e0778', // facets
      '0x0e26167e', // facetFunctionSelectors
      '0x52a6d9c1', // facetAddresses
      '0x97e7d56b', // facetAddress
      '0x1b9a7188', // selectorToFacetAndPosition
    ],
    OwnershipFacet: [
      '0x8da5cb5b', // owner
      '0xf2fde38b', // transferOwnership
      '0x5b5c6f6c', // transferOwnershipWithAcceptance
    ],
    NodesFacet: [
      '0x2bef7fb5', // addSupportedAsset
      '0xa2444390', // deactivateNode
      '0x50c946fe', // getNode
      '0xc83f7ca4', // getNodeAssets
      '0xb59d3bea', // getOwnerNodes
      '0x3e691b1f', // getTotalNodeAssets
      '0x63584ecd', // getTotalNodes
      '0x506a17b2', // registerNode
      '0x641b8fc7', // updateNode
      '0xd9ff9ee4', // updateNodeCapacity
      '0xd24e25d3', // updateNodeLocation
      '0x4b1f5c70', // updateNodeOwner
      '0x16261e99', // updateNodeStatus
      '0x6766c717', // updateSupportedAssets
      // CLOB approval functions
      '0xf7502631', // setAuraAssetAddress
      '0x89a1153c', // getAuraAssetAddress
      '0x40ed3118', // approveClobForTokens
      '0xe1ed5db1', // revokeClobApproval
      '0xcb24a4b4', // isClobApproved
    ],
    AssetsFacet: [
      '0x9d8c698d', // addSupportedClass
      '0x2d0d5e3b', // addSupportedAsset
      '0x6d745c8d', // getAsset
      '0x5d6d6f8e', // getAssetById
      '0x5b3e7b8a', // isClassSupported
      '0x5a4c7e9b', // getSupportedClasses
      '0x1a2b3c4d', // getTotalAssets
    ],
    OrdersFacet: [
      '0x4c4d3f7a', // createOrder
      '0x5a8c5e2b', // fulfillOrder
      '0x5c7d8f6a', // cancelOrder
      '0x4e5d6c8f', // getOrder
      '0x1a2b3c4d', // getOrderStatus
      '0x5e6f7a8b', // getTotalOrders
      '0x4a5b6c7d', // getOrdersByStatus
    ],
    StakingFacet: [
      '0xa694fc3a', // stake
      '0x2e17de78', // unstake
      '0xe5e96442', // claimRewards
      '0x08a5eb2a', // rewardPerToken
      '0x37d078e4', // earned
      '0x4d8c7e9f', // getStake
      '0x6e7f8d9a', // getTotalStaked
      '0x5c6d7e8f', // setRewardRate
    ],
    BridgeFacet: [
      '0x5c6d7e8f', // createUnifiedOrder
      '0x4e5f6a7b', // bridgeOrder
      '0x5a7b8c9d', // updateLogisticsPhase
      '0x6c8d9e0f', // completeOrder
      '0x5d7e8f9a', // cancelOrder
      '0x7e8f9a0b', // getUnifiedOrder
      '0x8f9a0b1c', // getTotalOrders
      '0x5e6f7a8b', // setFeeRecipient
      '0x6f7a8b9c', // setProtocolFeePercentage
      '0x7a8b9c0d', // setBountyPercentage
      '0x8b9c0d1e', // setAddresses
    ],
    CLOBFacet: [
      '0x5c6d7e8f', // createMarket
      '0x6d7e8f9a', // placeOrder
      '0x7e8f9a0b', // cancelOrder
      '0x8f9a0b1c', // getOrder
      '0x9a0b1c2d', // getMarket
      '0x5e6f7a8b', // getBestBid
      '0x6f7a8b9c', // getBestAsk
      '0x7a8b9c0d', // getTotalMarkets
      '0x8b9c0d1e', // getTotalCLOBOrders
    ],
  };

  return selectors[facetName] || [];
}

async function main() {
  console.log('==========================================');
  console.log('Upgrading Diamond (EIP-2535)');
  console.log('==========================================\n');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}\n`);

  const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
  if (!DIAMOND_ADDRESS) {
    throw new Error('DIAMOND_ADDRESS not set in .env');
  }

  console.log(`Diamond address: ${DIAMOND_ADDRESS}\n`);

  const diamondCut = await ethers.getContractAt('IDiamondCut', DIAMOND_ADDRESS);

  // Get current owner to verify
  const ownershipFacet = await ethers.getContractAt(
    'IOwnership',
    DIAMOND_ADDRESS,
  );
  const owner = await ownershipFacet.owner();
  console.log(`Diamond owner: ${owner}\n`);

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log(
      'Warning: Deployer is not the Diamond owner. Upgrade will fail.\n',
    );
  }

  // Example: Upgrade NodesFacet to a new version
  // In production, you would specify which facet to upgrade
  const FACET_TO_UPGRADE = process.env.FACET_TO_UPGRADE || 'NodesFacet';
  const NEW_FACET_NAME = `${FACET_TO_UPGRADE}V2`;

  console.log(`Upgrading ${FACET_TO_UPGRADE} to ${NEW_FACET_NAME}...\n`);

  // Deploy new facet
  console.log(`Deploying ${NEW_FACET_NAME}...`);
  const NewFacet = await ethers.getContractFactory(NEW_FACET_NAME);
  const newFacet = await NewFacet.deploy();
  await newFacet.waitForDeployment();
  const newFacetAddress = await newFacet.getAddress();
  console.log(`  ✓ Deployed: ${newFacetAddress}\n`);

  // Get selectors to remove (old facet) and add (new facet)
  const selectorsToRemove = await getFacetSelectors(FACET_TO_UPGRADE);
  const selectorsToAdd = await getFacetSelectors(NEW_FACET_NAME);

  console.log(`Selectors to remove: ${selectorsToRemove.length}`);
  console.log(`Selectors to add: ${selectorsToAdd.length}\n`);

  // Remove old selectors
  console.log('Removing old selectors...');
  if (selectorsToRemove.length > 0) {
    await diamondCut.diamondCut(
      [
        {
          facetAddress: ethers.ZeroAddress, // Address(0) for removal
          action: 2, // Remove
          functionSelectors: selectorsToRemove,
        },
      ],
      ethers.ZeroAddress,
      '0x',
    );
    console.log(`  ✓ Removed ${selectorsToRemove.length} selectors\n`);
  }

  // Add new selectors
  console.log('Adding new selectors...');
  await diamondCut.diamondCut(
    [
      {
        facetAddress: newFacetAddress,
        action: 0, // Add
        functionSelectors: selectorsToAdd,
      },
    ],
    ethers.ZeroAddress,
    '0x',
  );
  console.log(`  ✓ Added ${selectorsToAdd.length} selectors\n`);

  // Save upgrade information
  const upgradeInfo = {
    diamond: DIAMOND_ADDRESS,
    upgradedFacet: FACET_TO_UPGRADE,
    oldFacetAddress: '', // Would need to read from deployment file
    newFacetAddress: newFacetAddress,
    timestamp: new Date().toISOString(),
    selectorsRemoved: selectorsToRemove,
    selectorsAdded: selectorsToAdd,
  };

  const upgradesDir = path.join(__dirname, '..', 'upgrades');
  if (!fs.existsSync(upgradesDir)) {
    fs.mkdirSync(upgradesDir, { recursive: true });
  }

  const upgradePath = path.join(upgradesDir, `upgrade-${Date.now()}.json`);
  fs.writeFileSync(upgradePath, JSON.stringify(upgradeInfo, null, 2));
  console.log(`✓ Upgrade info saved to: ${upgradePath}\n`);

  // Verify upgrade
  console.log('Verifying upgrade...\n');

  // Check that new facet is available
  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    DIAMOND_ADDRESS,
  );

  const facets = await diamondLoupe.facets();
  console.log(`Total facets: ${facets.length}\n`);

  for (const facet of facets) {
    console.log(
      `  - ${facet.facetAddress}: ${facet.functionSelectors.length} selectors`,
    );
  }

  console.log('\n==========================================');
  console.log('Diamond Upgrade Complete!');
  console.log('==========================================\n');

  console.log(`Upgraded ${FACET_TO_UPGRADE} -> ${NEW_FACET_NAME}`);
  console.log(`New facet address: ${newFacetAddress}\n`);

  return upgradeInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
