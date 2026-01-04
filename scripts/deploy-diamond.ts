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
    '0xcdffacc6', // facetAddress
    '0x52ef6b2c', // facetAddresses
    '0xadfca15e', // facetFunctionSelectors
    '0x7a0ed627', // facets
    '0x49e56145', // selectorToFacetAndPosition
  ],
  OwnershipFacet: [
    '0x79ba5097', // acceptOwnership
    '0xc4d66de8', // initialize
    '0x8da5cb5b', // owner
    '0x715018a6', // renounceOwnership
    '0xf2fde38b', // transferOwnership
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
  ],
  AssetsFacet: [
    '0xe243b2fc', // addAsset
    '0xb27221ca', // addAssetClass
    '0xeac8f5b8', // getAsset
    '0xef6fd2f0', // getAssetByHash
    '0x6e07302b', // getTotalAssets
  ],
  OrdersFacet: [
    '0x7489ec23', // cancelOrder
    '0x02bd3421', // createOrder
    '0xa45f2ebc', // getBuyerOrders
    '0x5778472a', // getOrder
    '0xe4cbac40', // getSellerOrders
    '0x375f16a7', // getTotalOrders
    '0x15914b3f', // updateOrderStatus
  ],
  StakingFacet: [
    '0x372500ab', // claimRewards
    '0x008cc262', // earned
    '0x7e1a3786', // getRewardRate
    '0x7a766460', // getStake
    '0x0917e776', // getTotalStaked
    '0x5ade228a', // REWARD_DURATION
    '0x9e447fc6', // setRewardRate
    '0xa694fc3a', // stake
    '0x2e1a7d4d', // withdraw
  ],
  BridgeFacet: [
    '0x20caf786', // BOUNTY_PERCENTAGE
    '0x6111ce0b', // bridgeTradeToLogistics
    '0x5fc905ec', // cancelUnifiedOrder
    '0xe6598313', // createLogisticsOrder
    '0xd3ca8136', // createUnifiedOrder
    '0x46904840', // feeRecipient
    '0xfef24e01', // getTotalUnifiedOrders
    '0xd2d2e822', // getUnifiedOrder
    '0xe4d7d6dc', // PROTOCOL_FEE_PERCENTAGE
    '0xe74b981b', // setFeeRecipient
    '0x49085d8c', // settleOrder
    '0x158ed47c', // updateJourneyStatus
  ],
  CLOBFacet: [
    '0x2b3e8826', // createMarket
    '0xb3d29d42', // createPool
    '0xc3c95c7b', // getMarket
    '0xf6c00927', // getPool
    '0x81ebf209', // getTotalMarkets
    '0xebd34f50', // getTotalTrades
    '0xa3b13799', // getTrade
    '0x5e3f2727', // LP_FEE
    '0xb537889c', // MAKER_FEE
    '0x8707e031', // placeOrder
    '0x9fa5bc24', // TAKER_FEE
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

  // Step 2: Deploy Diamond with DiamondCutFacet only
  console.log('Step 2: Deploying Diamond with DiamondCutFacet...\n');

  const Diamond = await ethers.getContractFactory('Diamond');
  const diamond = await Diamond.deploy(
    deployer.address,
    deploymentResult.facets.diamondCut,
  );
  await diamond.waitForDeployment();
  deploymentResult.diamond = await diamond.getAddress();
  console.log(`✓ Diamond deployed: ${deploymentResult.diamond}\n`);

  // Step 3: Add remaining facets via diamondCut
  console.log('Step 3: Adding facets to Diamond via diamondCut...\n');

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
      const tx = await diamondCut.diamondCut(
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
      await tx.wait();
      console.log(`  ✓ Added ${selectors.length} selectors\n`);
    } catch (error: any) {
      if (error.message.includes('Selector already exists')) {
        console.log(
          `  ⚠ Some selectors already exist, trying with Replace action...\n`,
        );
        try {
          const tx = await diamondCut.diamondCut(
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
          await tx.wait();
          console.log(`  ✓ Replaced ${selectors.length} selectors\n`);
        } catch (replaceError: any) {
          console.log(
            `  ⚠ Could not replace selectors (may already be added): ${replaceError.message}\n`,
          );
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

  // Step 4.5: Add default asset classes via AssetsFacet
  console.log('Step 4.5: Adding default asset classes...\n');
  const defaultClasses = ['GOAT', 'SHEEP', 'COW', 'CHICKEN', 'DUCK'];

  try {
    const AssetsFacet = await ethers.getContractAt(
      'AssetsFacet',
      deploymentResult.diamond,
    );

    for (const className of defaultClasses) {
      try {
        const tx = await AssetsFacet.addAssetClass(className);
        await tx.wait();
        console.log(`  ✓ Added asset class: ${className}`);
      } catch (e: any) {
        if (
          e.message?.includes('already exists') ||
          e.message?.includes('AlreadyExists')
        ) {
          console.log(`  ⚠ Asset class ${className} already exists`);
        } else {
          console.log(`  ✗ Failed to add ${className}:`, e.message);
        }
      }
    }
    console.log('');
  } catch (e) {
    console.log(
      '  ⚠ Could not add asset classes (AssetsFacet may not have this function yet)\n',
    );
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

  // Get deployment block number
  const deploymentTx = await diamond.deploymentTransaction();
  let deployBlockNumber = 0;
  if (deploymentTx) {
    const receipt = await deploymentTx.wait();
    deployBlockNumber = receipt?.blockNumber || 0;
  }

  // Step 6: Update chain-constants.ts
  console.log('Step 6: Updating chain-constants.ts...\n');
  const constantsPath = path.join(__dirname, '..', 'chain-constants.ts');
  if (fs.existsSync(constantsPath)) {
    let constantsContent = fs.readFileSync(constantsPath, 'utf-8');

    // Helper function to replace values (handles both single-line and multi-line formats)
    function replaceConstant(name: string, value: string) {
      // Match both:
      // export const NAME = 'value';  (single line)
      // export const NAME =
      //   'value';  (multi-line)
      const regex = new RegExp(
        `export const ${name} =\\s*['"]${value}['"]`,
        'm',
      );
      constantsContent = constantsContent.replace(
        regex,
        `export const ${name} = '${value}'`,
      );
    }

    // Update Diamond address
    replaceConstant('NEXT_PUBLIC_DIAMOND_ADDRESS', deploymentResult.diamond);

    // Update all facet addresses
    replaceConstant(
      'NEXT_PUBLIC_DIAMOND_CUT_FACET_ADDRESS',
      deploymentResult.facets.diamondCut,
    );
    replaceConstant(
      'NEXT_PUBLIC_DIAMOND_LOUPE_FACET_ADDRESS',
      deploymentResult.facets.diamondLoupe,
    );
    replaceConstant(
      'NEXT_PUBLIC_OWNERSHIP_FACET_ADDRESS',
      deploymentResult.facets.ownership,
    );
    replaceConstant(
      'NEXT_PUBLIC_NODES_FACET_ADDRESS',
      deploymentResult.facets.nodes,
    );
    replaceConstant(
      'NEXT_PUBLIC_ASSETS_FACET_ADDRESS',
      deploymentResult.facets.assets,
    );
    replaceConstant(
      'NEXT_PUBLIC_ORDERS_FACET_ADDRESS',
      deploymentResult.facets.orders,
    );
    replaceConstant(
      'NEXT_PUBLIC_STAKING_FACET_ADDRESS',
      deploymentResult.facets.staking,
    );
    replaceConstant(
      'NEXT_PUBLIC_BRIDGE_FACET_ADDRESS',
      deploymentResult.facets.bridge,
    );
    replaceConstant(
      'NEXT_PUBLIC_CLOB_FACET_ADDRESS',
      deploymentResult.facets.clob,
    );

    // Update deployment block (handle both formats)
    constantsContent = constantsContent.replace(
      /export const DIAMOND_DEPLOY_BLOCK = \d+/,
      `export const DIAMOND_DEPLOY_BLOCK = ${deployBlockNumber}`,
    );

    fs.writeFileSync(constantsPath, constantsContent);
    console.log(`✓ Updated chain-constants.ts\n`);
  }

  // Step 7: Update indexer configuration to read from chain-constants
  console.log('Step 7: Updating indexer configuration...\n');
  const indexerConfigPath = path.join(
    __dirname,
    '..',
    'indexer',
    'ponder.config.ts',
  );
  if (fs.existsSync(indexerConfigPath)) {
    let indexerContent = fs.readFileSync(indexerConfigPath, 'utf-8');

    // Remove .env references and use chain-constants
    indexerContent = indexerContent.replace(
      /const DIAMOND_ADDRESS = \(process\.env\.NEXT_PUBLIC_DIAMOND_ADDRESS \|\| '0x0000000000000000000000000000000000000000'\) as `0x\$\{string\}`;/,
      `import { NEXT_PUBLIC_DIAMOND_ADDRESS, DIAMOND_DEPLOY_BLOCK } from '../chain-constants';\nconst DIAMOND_ADDRESS = NEXT_PUBLIC_DIAMOND_ADDRESS as \`0x\${string}\`;`,
    );

    indexerContent = indexerContent.replace(
      /const DIAMOND_DEPLOY_BLOCK = parseInt\(process\.env\.DIAMOND_DEPLOY_BLOCK \|\| '0'\);/,
      `const DIAMOND_DEPLOY_BLOCK_NUM = DIAMOND_DEPLOY_BLOCK;`,
    );

    indexerContent = indexerContent.replace(
      /startBlock: DIAMOND_DEPLOY_BLOCK,/,
      `startBlock: DIAMOND_DEPLOY_BLOCK_NUM,`,
    );

    fs.writeFileSync(indexerConfigPath, indexerContent);
    console.log(`✓ Updated indexer/ponder.config.ts to use chain-constants\n`);
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
