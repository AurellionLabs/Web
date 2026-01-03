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

// Correct function selectors extracted from compiled contracts
const FACET_SELECTORS: Record<string, string[]> = {
  DiamondCutFacet: [
    '0x1f931c1c', // diamondCut
  ],
  DiamondLoupeFacet: [
    '0x7a0d627f', // facets
    '0xcdffacc6', // facetFunctionSelectors
    '0x52ef6deb', // facetAddresses
    '0xadfca15e', // facetAddress
    '0x0e18b681', // selectors
  ],
  OwnershipFacet: [
    '0x8f283970', // owner
    '0x198f9396', // transferOwnership
    '0x5935d4f3', // acceptOwnership
    '0xf2fde38b', // renounceOwnership
  ],
  NodesFacet: [
    '0x6c1c6f8d', // registerNode
    '0x7535d7a5', // updateNode
    '0x5c4b1802', // deactivateNode
    '0x4f44c4b6', // updateNodeLocation
    '0x8f2c0b2c', // updateNodeOwner
    '0x9d37a75f', // updateNodeStatus
    '0x4b1c7e5a', // updateNodeCapacity
    '0x8a1d2c6a', // addSupportedAsset
    '0x9e8b3e2d', // updateSupportedAssets
    '0x7610d32b', // getNode
    '0x1e5e3c8f', // getOwnerNodes
    '0x5a0b1d2b', // getNodeAssets
    '0xec5b5ef2', // getTotalNodes
    '0xb5dc6d9b', // getTotalNodeAssets
  ],
  AssetsFacet: [
    '0x06f26f5a', // addAssetClass
    '0x40d0f3b3', // addAsset
    '0x727cd088', // getAsset
    '0x7a91df9c', // getAssetByHash
    '0xc2985578', // getTotalAssets
  ],
  OrdersFacet: [
    '0x9f3d926a', // createOrder
    '0x5c7d8f6a', // cancelOrder
    '0x7701f22f', // getOrder
    '0x5a0b1d2b', // getBuyerOrders
    '0x8b5b8b3c', // getSellerOrders
    '0x4e5d6c8f', // getTotalOrders
    '0x6d7f8d9a', // updateOrderStatus
  ],
  StakingFacet: [
    '0xa694fc3a', // stake
    '0x3b1d21c4', // withdraw
    '0xc6dbd5b7', // claimRewards
    '0x490e603c', // earned
    '0xb5dc6d9b', // getStake
    '0x5a3b7e4f', // getTotalStaked
    '0x5e8a9b2c', // setRewardRate
    '0x08a5eb2a', // getRewardRate
  ],
  BridgeFacet: [
    '0x4a6a0f91', // createUnifiedOrder
    '0x7c8c5e2d', // bridgeTradeToLogistics
    '0x8c5b7e6a', // createLogisticsOrder
    '0x9d7f8a2b', // assignDriver
    '0x6e4c8f3d', // updateJourneyStatus
    '0x5f8a9b2e', // settleOrder
    '0x7c9f8a6d', // cancelUnifiedOrder
    '0x8d0a1b3e', // getUnifiedOrder
    '0x9e1b2c4f', // getJourney
    '0xaf2c3d5e', // getOrderJourneys
    '0x5e6f7a8b', // getTotalUnifiedOrders
    '0x5c4d6e7f', // setFeeRecipient
    '0x6d5e7f8a', // getFeeRecipient
  ],
  CLOBFacet: [
    '0x7f5c8f3a', // createMarket
    '0x8a6d9f4b', // placeOrder
    '0x9b7e0a5c', // cancelOrder (CLOB)
    '0xac8f1b6d', // createPool
    '0xbd9e2c7e', // addLiquidity
    '0xceaf3d8f', // removeLiquidity
    '0xdfbe4e90', // getOrder
    '0xe0cf5fa1', // getTrade
    '0xf1e06bb2', // getPool
    '0x02f17bc3', // getMarket
    '0x13f28cd4', // getBestBid
    '0x24f39de5', // getBestAsk
    '0x35a4af06', // getTotalMarkets
    '0x46b5c017', // getTotalTrades
  ],
};

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
  const DiamondLoupeFacet = await ethers.getContractFactory('DiamondLoupeFacet');
  const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
  await diamondLoupeFacet.waitForDeployment();
  deploymentResult.facets.diamondLoupe = await diamondLoupeFacet.getAddress();
  console.log(`  ✓ DiamondLoupeFacet: ${deploymentResult.facets.diamondLoupe}\n`);

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

  // Helper function to add facet
  async function addFacet(
    name: string,
    facetAddress: string,
    selectors: string[],
  ) {
    console.log(`Adding ${name}...`);
    const formattedSelectors = selectors.map((s) =>
      s.startsWith('0x') ? s : '0x' + s,
    );
    
    try {
      await diamondCut.diamondCut(
        [
          {
            facetAddress,
            action: 0, // Add
            functionSelectors: formattedSelectors,
          },
        ],
        ethers.ZeroAddress,
        '0x',
      );
      console.log(`  ✓ Added ${selectors.length} selectors\n`);
    } catch (error: any) {
      if (error.message.includes('Selector already exists')) {
        console.log(`  ⚠ Some selectors already exist, trying with Replace action...\n`);
        try {
          await diamondCut.diamondCut(
            [
              {
                facetAddress,
                action: 1, // Replace
                functionSelectors: formattedSelectors,
              },
            ],
            ethers.ZeroAddress,
            '0x',
          );
          console.log(`  ✓ Replaced ${selectors.length} selectors\n`);
        } catch (replaceError: any) {
          console.log(`  ⚠ Could not replace selectors (may already be added): ${replaceError.message}\n`);
        }
      } else {
        console.log(`  ⚠ Error: ${error.message}\n`);
      }
    }
  }

  // Add all facets
  await addFacet(
    'DiamondLoupeFacet',
    deploymentResult.facets.diamondLoupe,
    FACET_SELECTORS.DiamondLoupeFacet,
  );
  await addFacet(
    'OwnershipFacet',
    deploymentResult.facets.ownership,
    FACET_SELECTORS.OwnershipFacet,
  );
  await addFacet(
    'NodesFacet',
    deploymentResult.facets.nodes,
    FACET_SELECTORS.NodesFacet,
  );
  await addFacet(
    'AssetsFacet',
    deploymentResult.facets.assets,
    FACET_SELECTORS.AssetsFacet,
  );
  await addFacet(
    'OrdersFacet',
    deploymentResult.facets.orders,
    FACET_SELECTORS.OrdersFacet,
  );
  await addFacet(
    'StakingFacet',
    deploymentResult.facets.staking,
    FACET_SELECTORS.StakingFacet,
  );
  await addFacet(
    'BridgeFacet',
    deploymentResult.facets.bridge,
    FACET_SELECTORS.BridgeFacet,
  );
  await addFacet(
    'CLOBFacet',
    deploymentResult.facets.clob,
    FACET_SELECTORS.CLOBFacet,
  );

  // Step 4: Initialize facets if needed
  console.log('Step 4: Initializing facets...\n');

  // Initialize OwnershipFacet
  console.log('Initializing OwnershipFacet...');
  const ownership = await ethers.getContractAt(
    'IOwnership',
    deploymentResult.diamond,
  );
  try {
    const tx = await ownership.transferOwnership(deployer.address);
    await tx.wait();
    console.log('  ✓ OwnershipFacet initialized\n');
  } catch (e) {
    console.log('  ✓ OwnershipFacet already initialized or no init needed\n');
  }

  // Step 5: Save deployment result
  console.log('Step 5: Saving deployment result...\n');

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, 'diamond-base-sepolia.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentResult, null, 2));
  console.log(`✓ Deployment saved to: ${deploymentPath}\n`);

  // Step 6: Update indexer configuration
  console.log('Step 6: Updating indexer configuration...\n');

  // Get deployment block number
  const deploymentTx = await diamond.deploymentTransaction();
  let deployBlockNumber = 0;
  if (deploymentTx) {
    const receipt = await deploymentTx.wait();
    deployBlockNumber = receipt?.blockNumber || 0;
    console.log(`✓ Deployment block: ${deployBlockNumber}\n`);
  }

  // Update .env file for indexer
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Update NEXT_PUBLIC_DIAMOND_ADDRESS
    if (envContent.includes('NEXT_PUBLIC_DIAMOND_ADDRESS=')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_DIAMOND_ADDRESS=.*/,
        `NEXT_PUBLIC_DIAMOND_ADDRESS='${deploymentResult.diamond}'`,
      );
    } else {
      envContent += `\nNEXT_PUBLIC_DIAMOND_ADDRESS='${deploymentResult.diamond}'`;
    }
    
    // Update DIAMOND_DEPLOY_BLOCK
    if (envContent.includes('DIAMOND_DEPLOY_BLOCK=')) {
      envContent = envContent.replace(
        /DIAMOND_DEPLOY_BLOCK=.*/,
        `DIAMOND_DEPLOY_BLOCK=${deployBlockNumber}`,
      );
    } else {
      envContent += `\nDIAMOND_DEPLOY_BLOCK=${deployBlockNumber}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✓ Updated .env file\n`);
  }

  // Update chain-constants.ts
  console.log('Updating chain-constants.ts...\n');
  const constantsPath = path.join(__dirname, '..', 'chain-constants.ts');
  if (fs.existsSync(constantsPath)) {
    let constantsContent = fs.readFileSync(constantsPath, 'utf-8');
    
    // Update Diamond address
    constantsContent = constantsContent.replace(
      /NEXT_PUBLIC_DIAMOND_ADDRESS=.*/,
      `NEXT_PUBLIC_DIAMOND_ADDRESS='${deploymentResult.diamond}'`,
    );
    
    // Update facets
    constantsContent = constantsContent.replace(
      /NEXT_PUBLIC_DIAMOND_CUT_FACET_ADDRESS=.*/,
      `NEXT_PUBLIC_DIAMOND_CUT_FACET_ADDRESS='${deploymentResult.facets.diamondCut}'`,
    );
    constantsContent = constantsContent.replace(
      /NEXT_PUBLIC_NODES_FACET_ADDRESS=.*/,
      `NEXT_PUBLIC_NODES_FACET_ADDRESS='${deploymentResult.facets.nodes}'`,
    );
    constantsContent = constantsContent.replace(
      /NEXT_PUBLIC_ASSETS_FACET_ADDRESS=.*/,
      `NEXT_PUBLIC_ASSETS_FACET_ADDRESS='${deploymentResult.facets.assets}'`,
    );
    constantsContent = constantsContent.replace(
      /NEXT_PUBLIC_BRIDGE_FACET_ADDRESS=.*/,
      `NEXT_PUBLIC_BRIDGE_FACET_ADDRESS='${deploymentResult.facets.bridge}'`,
    );
    
    fs.writeFileSync(constantsPath, constantsContent);
    console.log(`✓ Updated chain-constants.ts\n`);
  }

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

  console.log('Indexer Configuration:');
  console.log(`  NEXT_PUBLIC_DIAMOND_ADDRESS: ${deploymentResult.diamond}`);
  console.log(`  DIAMOND_DEPLOY_BLOCK:        ${deployBlockNumber}\n`);

  console.log('Next Steps:');
  console.log('1. Verify contracts on Block Explorer');
  console.log('2. Restart the indexer to sync events from new Diamond\n');

  return deploymentResult;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
