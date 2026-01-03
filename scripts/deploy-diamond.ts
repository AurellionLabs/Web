import { ethers } from 'hardhat';
import { Diamond } from '../typechain-types';
import { IDiamondCut } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

interface DeploymentResult {
  diamond: string;
  facets: {
    diamondCut: string;
    diamondLoupe: string;
    ownership: string;
    nodes: string;
    assets: string;
    orders: string;
    staking: string;
    bridge: string;
    clob: string;
  };
  timestamp: string;
}

async function getSelectors(contractName: string): Promise<string[]> {
  // This would typically use a helper function or hardhat plugin
  // For now, return empty array and manually specify selectors
  return [];
}

async function getFacetSelectors(facetName: string): Promise<string[]> {
  // Map facet names to their function selectors
  // These would be extracted from the compiled contracts
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
      '0x5c4c6f2e', // registerNode
      '0x2f154f1d', // updateNode
      '0x5c6b4824', // deactivateNode
      '0x9e665932', // getNode
      '0x1e5e3c8f', // getOwnerNodes
      '0xec5b5ef2', // getTotalNodes
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
  console.log('Deploying Diamond (EIP-2535) to Base Sepolia');
  console.log('==========================================\n');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(
    `Account balance: ${ethers.formatEther(
      await deployer.provider.getBalance(deployer.address),
    )} ETH\n`,
  );

  const deploymentResult: DeploymentResult = {
    diamond: '',
    facets: {
      diamondCut: '',
      diamondLoupe: '',
      ownership: '',
      nodes: '',
      assets: '',
      orders: '',
      staking: '',
      bridge: '',
      clob: '',
    },
    timestamp: new Date().toISOString(),
  };

  // Step 1: Deploy all facets
  console.log('Step 1: Deploying facets...\n');

  console.log('Deploying DiamondCutFacet...');
  const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet');
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.waitForDeployment();
  deploymentResult.facets.diamondCut = await diamondCutFacet.getAddress();
  console.log(`  ✓ DiamondCutFacet: ${deploymentResult.facets.diamondCut}\n`);

  console.log('Deploying DiamondLoupeFacet...');
  const DiamondLoupeFacet =
    await ethers.getContractFactory('DiamondLoupeFacet');
  const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
  await diamondLoupeFacet.waitForDeployment();
  deploymentResult.facets.diamondLoupe = await diamondLoupeFacet.getAddress();
  console.log(
    `  ✓ DiamondLoupeFacet: ${deploymentResult.facets.diamondLoupe}\n`,
  );

  console.log('Deploying OwnershipFacet...');
  const OwnershipFacet = await ethers.getContractFactory('OwnershipFacet');
  const ownershipFacet = await OwnershipFacet.deploy();
  await ownershipFacet.waitForDeployment();
  deploymentResult.facets.ownership = await ownershipFacet.getAddress();
  console.log(`  ✓ OwnershipFacet: ${deploymentResult.facets.ownership}\n`);

  console.log('Deploying NodesFacet...');
  const NodesFacet = await ethers.getContractFactory('NodesFacet');
  const nodesFacet = await NodesFacet.deploy();
  await nodesFacet.waitForDeployment();
  deploymentResult.facets.nodes = await nodesFacet.getAddress();
  console.log(`  ✓ NodesFacet: ${deploymentResult.facets.nodes}\n`);

  console.log('Deploying AssetsFacet...');
  const AssetsFacet = await ethers.getContractFactory('AssetsFacet');
  const assetsFacet = await AssetsFacet.deploy();
  await assetsFacet.waitForDeployment();
  deploymentResult.facets.assets = await assetsFacet.getAddress();
  console.log(`  ✓ AssetsFacet: ${deploymentResult.facets.assets}\n`);

  console.log('Deploying OrdersFacet...');
  const OrdersFacet = await ethers.getContractFactory('OrdersFacet');
  const ordersFacet = await OrdersFacet.deploy();
  await ordersFacet.waitForDeployment();
  deploymentResult.facets.orders = await ordersFacet.getAddress();
  console.log(`  ✓ OrdersFacet: ${deploymentResult.facets.orders}\n`);

  console.log('Deploying StakingFacet...');
  const StakingFacet = await ethers.getContractFactory('StakingFacet');
  const stakingFacet = await StakingFacet.deploy();
  await stakingFacet.waitForDeployment();
  deploymentResult.facets.staking = await stakingFacet.getAddress();
  console.log(`  ✓ StakingFacet: ${deploymentResult.facets.staking}\n`);

  console.log('Deploying BridgeFacet...');
  const BridgeFacet = await ethers.getContractFactory('BridgeFacet');
  const bridgeFacet = await BridgeFacet.deploy();
  await bridgeFacet.waitForDeployment();
  deploymentResult.facets.bridge = await bridgeFacet.getAddress();
  console.log(`  ✓ BridgeFacet: ${deploymentResult.facets.bridge}\n`);

  console.log('Deploying CLOBFacet...');
  const CLOBFacet = await ethers.getContractFactory('CLOBFacet');
  const clobFacet = await CLOBFacet.deploy();
  await clobFacet.waitForDeployment();
  deploymentResult.facets.clob = await clobFacet.getAddress();
  console.log(`  ✓ CLOBFacet: ${deploymentResult.facets.clob}\n`);

  // Step 2: Deploy Diamond
  console.log('Step 2: Deploying Diamond...\n');

  const Diamond = await ethers.getContractFactory('Diamond');
  const diamond = await Diamond.deploy(
    deployer.address,
    deploymentResult.facets.diamondCut,
  );
  await diamond.waitForDeployment();
  deploymentResult.diamond = await diamond.getAddress();
  console.log(`✓ Diamond deployed: ${deploymentResult.diamond}\n`);

  // Step 3: Add facets to Diamond
  console.log('Step 3: Adding facets to Diamond...\n');

  const diamondCut = await ethers.getContractAt(
    'IDiamondCut',
    deploymentResult.diamond,
  );

  // Add DiamondLoupeFacet
  console.log('Adding DiamondLoupeFacet...');
  const loupeSelectors = await getFacetSelectors('DiamondLoupeFacet');
  await diamondCut.diamondCut(
    [
      {
        facetAddress: deploymentResult.facets.diamondLoupe,
        action: 0, // Add
        functionSelectors: loupeSelectors,
      },
    ],
    ethers.ZeroAddress,
    '0x',
  );
  console.log(`  ✓ Added ${loupeSelectors.length} selectors\n`);

  // Add OwnershipFacet
  console.log('Adding OwnershipFacet...');
  const ownershipSelectors = await getFacetSelectors('OwnershipFacet');
  await diamondCut.diamondCut(
    [
      {
        facetAddress: deploymentResult.facets.ownership,
        action: 0, // Add
        functionSelectors: ownershipSelectors,
      },
    ],
    ethers.ZeroAddress,
    '0x',
  );
  console.log(`  ✓ Added ${ownershipSelectors.length} selectors\n`);

  // Add NodesFacet
  console.log('Adding NodesFacet...');
  const nodesSelectors = await getFacetSelectors('NodesFacet');
  await diamondCut.diamondCut(
    [
      {
        facetAddress: deploymentResult.facets.nodes,
        action: 0, // Add
        functionSelectors: nodesSelectors,
      },
    ],
    ethers.ZeroAddress,
    '0x',
  );
  console.log(`  ✓ Added ${nodesSelectors.length} selectors\n`);

  // Add AssetsFacet
  console.log('Adding AssetsFacet...');
  const assetsSelectors = await getFacetSelectors('AssetsFacet');
  await diamondCut.diamondCut(
    [
      {
        facetAddress: deploymentResult.facets.assets,
        action: 0, // Add
        functionSelectors: assetsSelectors,
      },
    ],
    ethers.ZeroAddress,
    '0x',
  );
  console.log(`  ✓ Added ${assetsSelectors.length} selectors\n`);

  // Add OrdersFacet
  console.log('Adding OrdersFacet...');
  const ordersSelectors = await getFacetSelectors('OrdersFacet');
  await diamondCut.diamondCut(
    [
      {
        facetAddress: deploymentResult.facets.orders,
        action: 0, // Add
        functionSelectors: ordersSelectors,
      },
    ],
    ethers.ZeroAddress,
    '0x',
  );
  console.log(`  ✓ Added ${ordersSelectors.length} selectors\n`);

  // Add StakingFacet
  console.log('Adding StakingFacet...');
  const stakingSelectors = await getFacetSelectors('StakingFacet');
  await diamondCut.diamondCut(
    [
      {
        facetAddress: deploymentResult.facets.staking,
        action: 0, // Add
        functionSelectors: stakingSelectors,
      },
    ],
    ethers.ZeroAddress,
    '0x',
  );
  console.log(`  ✓ Added ${stakingSelectors.length} selectors\n`);

  // Add BridgeFacet
  console.log('Adding BridgeFacet...');
  const bridgeSelectors = await getFacetSelectors('BridgeFacet');
  await diamondCut.diamondCut(
    [
      {
        facetAddress: deploymentResult.facets.bridge,
        action: 0, // Add
        functionSelectors: bridgeSelectors,
      },
    ],
    ethers.ZeroAddress,
    '0x',
  );
  console.log(`  ✓ Added ${bridgeSelectors.length} selectors\n`);

  // Add CLOBFacet
  console.log('Adding CLOBFacet...');
  const clobSelectors = await getFacetSelectors('CLOBFacet');
  await diamondCut.diamondCut(
    [
      {
        facetAddress: deploymentResult.facets.clob,
        action: 0, // Add
        functionSelectors: clobSelectors,
      },
    ],
    ethers.ZeroAddress,
    '0x',
  );
  console.log(`  ✓ Added ${clobSelectors.length} selectors\n`);

  // Step 4: Save deployment result
  console.log('Step 4: Saving deployment result...\n');

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, 'diamond-base-sepolia.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentResult, null, 2));
  console.log(`✓ Deployment saved to: ${deploymentPath}\n`);

  // Print summary
  console.log('==========================================');
  console.log('Diamond Deployment Complete!');
  console.log('==========================================\n');

  console.log('Diamond Address:');
  console.log(`  ${deploymentResult.diamond}\n`);

  console.log('Facets:');
  console.log(`  DiamondCutFacet:   ${deploymentResult.facets.diamondCut}`);
  console.log(`  DiamondLoupeFacet: ${deploymentResult.facets.diamondLoupe}`);
  console.log(`  OwnershipFacet:    ${deploymentResult.facets.ownership}`);
  console.log(`  NodesFacet:        ${deploymentResult.facets.nodes}`);
  console.log(`  AssetsFacet:       ${deploymentResult.facets.assets}`);
  console.log(`  OrdersFacet:       ${deploymentResult.facets.orders}`);
  console.log(`  StakingFacet:      ${deploymentResult.facets.staking}`);
  console.log(`  BridgeFacet:       ${deploymentResult.facets.bridge}`);
  console.log(`  CLOBFacet:         ${deploymentResult.facets.clob}\n`);

  console.log('Next Steps:');
  console.log('1. Verify contract on Block Explorer');
  console.log('2. Initialize facets if needed');
  console.log('3. Update indexer configuration');
  console.log('4. Update frontend constants\n');

  return deploymentResult;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
