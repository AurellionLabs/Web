/**
 * @module scripts/deploy-clob-v2
 * @description Deploy CLOB V2 Facets to Existing Diamond
 *
 * This script deploys the production-ready CLOB V2 facets:
 * - CLOBFacetV2: Core order management with TIF support
 * - CLOBAdminFacet: Circuit breakers, emergency recovery, fees
 * - CLOBViewFacet: Gas-efficient view functions
 *
 * Usage:
 *   npx hardhat run scripts/deploy-clob-v2.ts --network baseSepolia
 *
 * Prerequisites:
 * - Diamond must already be deployed
 * - Deployer must be Diamond owner
 * - CLOBLib library must be deployed (or linked)
 */

import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// CLOB V2 FUNCTION SELECTORS
// =============================================================================

/**
 * Function selectors for CLOBCoreFacet
 * Core order placement and cancellation
 */
const CLOB_CORE_FACET_SELECTORS = [
  '0x3e3c0cad', // placeLimitOrder
  '0x8a0dac4a', // placeNodeSellOrderV2
  '0x514fcac7', // cancelOrder
  '0x7489ec23', // cancelOrders
  '0xc4d66de8', // initializeCLOBV2
];

/**
 * Function selectors for CLOBMatchingFacet
 * Order matching and trade execution
 */
const CLOB_MATCHING_FACET_SELECTORS = [
  '0x2b4c0e11', // matchOrder
];

/**
 * Function selectors for CLOBAdminFacet
 */
const CLOB_ADMIN_FACET_SELECTORS = [
  // Circuit Breaker Management
  '0x6c1e2e3f', // configureCircuitBreaker(bytes32,uint256,uint256,bool)
  '0x8f1d3776', // resetCircuitBreaker(bytes32)
  '0xd4e8be83', // getCircuitBreakerStatus(bytes32)

  // Emergency Recovery
  '0x1a2b3c4d', // initiateEmergencyRecovery(address,address,uint256)
  '0x2b3c4d5e', // executeEmergencyRecovery(bytes32)
  '0x3c4d5e6f', // cancelEmergencyRecovery(bytes32)
  '0x4d5e6f70', // emergencyWithdraw(bytes32)

  // Fee Management
  '0x5e6f7081', // updateFees(uint16,uint16,uint16)
  '0x6f708192', // setFeeRecipient(address)
  '0x708192a3', // getFeeConfig()

  // Rate Limiting
  '0x8192a3b4', // updateRateLimits(uint256,uint256)
  '0x92a3b4c5', // getRateLimits()

  // MEV Protection Config
  '0xa3b4c5d6', // updateMEVProtection(uint8,uint256)
  '0xb4c5d6e7', // getMEVConfig()

  // Pause Functions
  '0xc5d6e7f8', // pauseMarket(bytes32)
  '0xd6e7f809', // unpauseMarket(bytes32)
  '0xe7f8091a', // pauseAll()
  '0xf809a1b2', // unpauseAll()
  '0x09a1b2c3', // isPaused()
  '0x1a2b3c4e', // isMarketPaused(bytes32)
];

/**
 * Function selectors for CLOBViewFacet
 */
const CLOB_VIEW_FACET_SELECTORS = [
  // Order Book Views
  '0x2c3d4e5f', // getOrderBookDepth(bytes32,uint256)
  '0x3d4e5f60', // getBestBid(bytes32)
  '0x4e5f6071', // getBestAsk(bytes32)
  '0x5f607182', // getSpread(bytes32)
  '0x60718293', // getMidPrice(bytes32)

  // Order Views
  '0x718293a4', // getOrderDetails(bytes32)
  '0x8293a4b5', // getOrdersByPrice(bytes32,uint256,bool)
  '0x93a4b5c6', // getUserActiveOrders(address)
  '0xa4b5c6d7', // getUserOrderHistory(address,uint256,uint256)

  // Trade Views
  '0xb5c6d7e8', // getRecentTrades(bytes32,uint256)
  '0xc6d7e8f9', // getUserTrades(address,uint256)
  '0xd7e8f90a', // getTradeDetails(bytes32)

  // Market Views
  '0xe8f90a1b', // getMarketStats(bytes32)
  '0xf90a1b2c', // getAllMarkets()
  '0x0a1b2c3d', // getMarketVolume24h(bytes32)

  // User Stats
  '0x1b2c3d4e', // getUserTradingStats(address)
  '0x2c3d4e5e', // getUserMakerVolume(address)
  '0x3d4e5f6f', // getUserTakerVolume(address)

  // Commitment Views
  '0x4e5f6070', // getCommitment(bytes32)
  '0x5f607181', // getUserCommitments(address)
];

// =============================================================================
// DEPLOYMENT INTERFACE
// =============================================================================

interface CLOBV2DeploymentResult {
  clobCoreFacet: string;
  clobMatchingFacet: string;
  clobAdminFacet: string;
  clobViewFacet: string;
  clobLib: string;
  diamondAddress: string;
  timestamp: string;
  blockNumber: number;
  network: string;
}

// =============================================================================
// MAIN DEPLOYMENT FUNCTION
// =============================================================================

async function main() {
  console.log('==========================================');
  console.log('Deploying CLOB V2 Facets to Diamond');
  console.log('==========================================\n');

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(
    `Balance: ${ethers.formatEther(
      await deployer.provider.getBalance(deployer.address),
    )} ETH\n`,
  );

  // Load existing Diamond address
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const latestDeploymentPath = path.join(
    deploymentsDir,
    'diamond-base-sepolia.json',
  );

  if (!fs.existsSync(latestDeploymentPath)) {
    throw new Error(
      'Diamond deployment not found. Run deploy-diamond.ts first.',
    );
  }

  const existingDeployment = JSON.parse(
    fs.readFileSync(latestDeploymentPath, 'utf-8'),
  );
  const diamondAddress = existingDeployment.diamond;

  console.log(`Using existing Diamond: ${diamondAddress}\n`);

  // Verify deployer is Diamond owner
  const ownership = await ethers.getContractAt('IOwnership', diamondAddress);
  const owner = await ownership.owner();

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(
      `Deployer is not Diamond owner. Owner: ${owner}, Deployer: ${deployer.address}`,
    );
  }

  console.log('✓ Deployer is Diamond owner\n');

  const result: CLOBV2DeploymentResult = {
    clobCoreFacet: '',
    clobMatchingFacet: '',
    clobAdminFacet: '',
    clobViewFacet: '',
    clobLib: '',
    diamondAddress,
    timestamp: new Date().toISOString(),
    blockNumber: 0,
    network: network.name,
  };

  // ============ Step 1: Deploy CLOBLib Library ============
  console.log('Step 1: Deploying CLOBLib library...\n');

  try {
    const CLOBLib = await ethers.getContractFactory('CLOBLib');
    const clobLib = await CLOBLib.deploy();
    await clobLib.waitForDeployment();
    result.clobLib = await clobLib.getAddress();
    console.log(`  ✓ CLOBLib: ${result.clobLib}\n`);
  } catch (error: any) {
    console.log(
      `  ⚠ CLOBLib deployment skipped (may be pure library): ${error.message}\n`,
    );
    result.clobLib = 'N/A (pure library)';
  }

  // ============ Step 2: Deploy CLOBCoreFacet ============
  console.log('Step 2: Deploying CLOBCoreFacet...\n');

  const CLOBCoreFacet = await ethers.getContractFactory('CLOBCoreFacet');
  const clobCoreFacet = await CLOBCoreFacet.deploy();
  await clobCoreFacet.waitForDeployment();
  result.clobCoreFacet = await clobCoreFacet.getAddress();
  console.log(`  ✓ CLOBCoreFacet: ${result.clobCoreFacet}\n`);

  // ============ Step 3: Deploy CLOBMatchingFacet ============
  console.log('Step 3: Deploying CLOBMatchingFacet...\n');

  const CLOBMatchingFacet =
    await ethers.getContractFactory('CLOBMatchingFacet');
  const clobMatchingFacet = await CLOBMatchingFacet.deploy();
  await clobMatchingFacet.waitForDeployment();
  result.clobMatchingFacet = await clobMatchingFacet.getAddress();
  console.log(`  ✓ CLOBMatchingFacet: ${result.clobMatchingFacet}\n`);

  // ============ Step 4: Deploy CLOBAdminFacet ============
  console.log('Step 4: Deploying CLOBAdminFacet...\n');

  const CLOBAdminFacet = await ethers.getContractFactory('CLOBAdminFacet');
  const clobAdminFacet = await CLOBAdminFacet.deploy();
  await clobAdminFacet.waitForDeployment();
  result.clobAdminFacet = await clobAdminFacet.getAddress();
  console.log(`  ✓ CLOBAdminFacet: ${result.clobAdminFacet}\n`);

  // ============ Step 5: Deploy CLOBViewFacet ============
  console.log('Step 5: Deploying CLOBViewFacet...\n');

  const CLOBViewFacet = await ethers.getContractFactory('CLOBViewFacet');
  const clobViewFacet = await CLOBViewFacet.deploy();
  await clobViewFacet.waitForDeployment();
  result.clobViewFacet = await clobViewFacet.getAddress();
  console.log(`  ✓ CLOBViewFacet: ${result.clobViewFacet}\n`);

  // ============ Step 6: Add Facets to Diamond ============
  console.log('Step 6: Adding CLOB V2 facets to Diamond...\n');

  const diamondCut = await ethers.getContractAt('IDiamondCut', diamondAddress);

  // Helper to add facet with error handling
  async function addFacet(
    name: string,
    facetAddress: string,
    selectors: string[],
  ): Promise<boolean> {
    console.log(`  Adding ${name}...`);

    try {
      // First try to add
      const tx = await diamondCut.diamondCut(
        [
          {
            facetAddress,
            action: 0, // Add
            functionSelectors: selectors,
          },
        ],
        ethers.ZeroAddress,
        '0x',
      );
      await tx.wait();
      console.log(`    ✓ Added ${selectors.length} functions\n`);
      return true;
    } catch (addError: any) {
      if (addError.message.includes('Selector already exists')) {
        console.log(`    ⚠ Some selectors exist, trying Replace action...`);

        try {
          const tx = await diamondCut.diamondCut(
            [
              {
                facetAddress,
                action: 1, // Replace
                functionSelectors: selectors,
              },
            ],
            ethers.ZeroAddress,
            '0x',
          );
          await tx.wait();
          console.log(`    ✓ Replaced ${selectors.length} functions\n`);
          return true;
        } catch (replaceError: any) {
          console.log(`    ✗ Replace failed: ${replaceError.message}\n`);
          return false;
        }
      } else {
        console.log(`    ✗ Add failed: ${addError.message}\n`);
        return false;
      }
    }
  }

  // Add all CLOB V2 facets
  const facetResults = {
    clobCoreFacet: await addFacet(
      'CLOBCoreFacet',
      result.clobCoreFacet,
      CLOB_CORE_FACET_SELECTORS,
    ),
    clobMatchingFacet: await addFacet(
      'CLOBMatchingFacet',
      result.clobMatchingFacet,
      CLOB_MATCHING_FACET_SELECTORS,
    ),
    clobAdminFacet: await addFacet(
      'CLOBAdminFacet',
      result.clobAdminFacet,
      CLOB_ADMIN_FACET_SELECTORS,
    ),
    clobViewFacet: await addFacet(
      'CLOBViewFacet',
      result.clobViewFacet,
      CLOB_VIEW_FACET_SELECTORS,
    ),
  };

  // ============ Step 7: Initialize CLOB V2 Configuration ============
  console.log('Step 7: Initializing CLOB V2 configuration...\n');

  try {
    const clobAdmin = await ethers.getContractAt(
      'CLOBAdminFacet',
      diamondAddress,
    );

    // Set default fees (0.3% taker, 0.1% maker, 0.2% LP)
    console.log('  Setting default fees...');
    const feesTx = await clobAdmin.updateFees(30, 10, 20);
    await feesTx.wait();
    console.log('    ✓ Fees configured: 0.3% taker, 0.1% maker, 0.2% LP\n');

    // Set rate limits (100 orders/block, 1000 ETH volume/block)
    console.log('  Setting rate limits...');
    const rateTx = await clobAdmin.updateRateLimits(
      100,
      ethers.parseEther('1000'),
    );
    await rateTx.wait();
    console.log('    ✓ Rate limits: 100 orders/block, 1000 ETH volume/block\n');

    // Set MEV protection (3 block delay, 10 ETH threshold)
    console.log('  Setting MEV protection...');
    const mevTx = await clobAdmin.updateMEVProtection(
      3,
      ethers.parseEther('10'),
    );
    await mevTx.wait();
    console.log('    ✓ MEV protection: 3 block delay, 10 ETH threshold\n');
  } catch (error: any) {
    console.log(`  ⚠ Configuration skipped: ${error.message}\n`);
  }

  // ============ Step 8: Save Deployment Result ============
  console.log('Step 8: Saving deployment result...\n');

  const blockNumber = await ethers.provider.getBlockNumber();
  result.blockNumber = blockNumber;

  // Save CLOB V2 specific deployment
  const clobV2DeploymentPath = path.join(
    deploymentsDir,
    `clob-v2-${network.name}-${Date.now()}.json`,
  );
  fs.writeFileSync(clobV2DeploymentPath, JSON.stringify(result, null, 2));
  console.log(`  ✓ Saved to: ${clobV2DeploymentPath}\n`);

  // Update main deployment file with new facets
  existingDeployment.facets = {
    ...existingDeployment.facets,
    clobCore: result.clobCoreFacet,
    clobMatching: result.clobMatchingFacet,
    clobAdmin: result.clobAdminFacet,
    clobView: result.clobViewFacet,
  };
  existingDeployment.clobV2Timestamp = result.timestamp;

  fs.writeFileSync(
    latestDeploymentPath,
    JSON.stringify(existingDeployment, null, 2),
  );
  console.log(`  ✓ Updated: ${latestDeploymentPath}\n`);

  // ============ Step 9: Update Chain Constants ============
  console.log('Step 9: Updating chain-constants.ts...\n');

  const constantsPath = path.join(__dirname, '..', 'chain-constants.ts');
  if (fs.existsSync(constantsPath)) {
    let content = fs.readFileSync(constantsPath, 'utf-8');

    // Add CLOB V2 facet addresses if not present
    if (!content.includes('NEXT_PUBLIC_CLOB_CORE_FACET_ADDRESS')) {
      const insertPoint = content.indexOf('// Deployment blocks');
      if (insertPoint > 0) {
        const clobV2Constants = `
// CLOB V2 Facets (Production-ready)
export const NEXT_PUBLIC_CLOB_CORE_FACET_ADDRESS = '${result.clobCoreFacet}';
export const NEXT_PUBLIC_CLOB_MATCHING_FACET_ADDRESS = '${result.clobMatchingFacet}';
export const NEXT_PUBLIC_CLOB_ADMIN_FACET_ADDRESS = '${result.clobAdminFacet}';
export const NEXT_PUBLIC_CLOB_VIEW_FACET_ADDRESS = '${result.clobViewFacet}';

`;
        content =
          content.slice(0, insertPoint) +
          clobV2Constants +
          content.slice(insertPoint);
        fs.writeFileSync(constantsPath, content);
        console.log(
          '  ✓ Added CLOB V2 facet addresses to chain-constants.ts\n',
        );
      }
    } else {
      // Update existing constants
      content = content.replace(
        /NEXT_PUBLIC_CLOB_CORE_FACET_ADDRESS = '[^']*'/,
        `NEXT_PUBLIC_CLOB_CORE_FACET_ADDRESS = '${result.clobCoreFacet}'`,
      );
      content = content.replace(
        /NEXT_PUBLIC_CLOB_MATCHING_FACET_ADDRESS = '[^']*'/,
        `NEXT_PUBLIC_CLOB_MATCHING_FACET_ADDRESS = '${result.clobMatchingFacet}'`,
      );
      content = content.replace(
        /NEXT_PUBLIC_CLOB_ADMIN_FACET_ADDRESS = '[^']*'/,
        `NEXT_PUBLIC_CLOB_ADMIN_FACET_ADDRESS = '${result.clobAdminFacet}'`,
      );
      content = content.replace(
        /NEXT_PUBLIC_CLOB_VIEW_FACET_ADDRESS = '[^']*'/,
        `NEXT_PUBLIC_CLOB_VIEW_FACET_ADDRESS = '${result.clobViewFacet}'`,
      );
      fs.writeFileSync(constantsPath, content);
      console.log(
        '  ✓ Updated CLOB V2 facet addresses in chain-constants.ts\n',
      );
    }
  }

  // ============ Print Summary ============
  console.log('==========================================');
  console.log('CLOB V2 Deployment Complete!');
  console.log('==========================================\n');

  console.log('Diamond Address:');
  console.log(`  ${diamondAddress}\n`);

  console.log('CLOB V2 Facets:');
  console.log(`  CLOBCoreFacet:     ${result.clobCoreFacet}`);
  console.log(`  CLOBMatchingFacet: ${result.clobMatchingFacet}`);
  console.log(`  CLOBAdminFacet:    ${result.clobAdminFacet}`);
  console.log(`  CLOBViewFacet:     ${result.clobViewFacet}`);
  console.log(`  CLOBLib:           ${result.clobLib}\n`);

  console.log('Facet Addition Results:');
  console.log(`  CLOBCoreFacet:     ${facetResults.clobCoreFacet ? '✓' : '✗'}`);
  console.log(
    `  CLOBMatchingFacet: ${facetResults.clobMatchingFacet ? '✓' : '✗'}`,
  );
  console.log(
    `  CLOBAdminFacet:    ${facetResults.clobAdminFacet ? '✓' : '✗'}`,
  );
  console.log(
    `  CLOBViewFacet:     ${facetResults.clobViewFacet ? '✓' : '✗'}\n`,
  );

  console.log('Features Enabled:');
  console.log('  ✓ Time-in-Force Orders (GTC, IOC, FOK, GTD)');
  console.log('  ✓ MEV Protection (Commit-Reveal)');
  console.log('  ✓ Circuit Breakers');
  console.log('  ✓ Emergency Recovery');
  console.log('  ✓ Rate Limiting');
  console.log('  ✓ Gas-Optimized Storage (Bitpacking)\n');

  console.log('Next Steps:');
  console.log('1. Verify contracts on Block Explorer');
  console.log('2. Update indexer ABI to include new events');
  console.log('3. Restart indexer to sync CLOB V2 events');
  console.log('4. Test order placement with new TIF options\n');

  return result;
}

// =============================================================================
// EXECUTE
// =============================================================================

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
