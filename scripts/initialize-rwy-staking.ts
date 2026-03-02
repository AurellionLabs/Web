#!/usr/bin/env npx ts-node
/**
 * Initialize RWY Staking Configuration
 *
 * Sets default configuration values for the RWYStakingFacet:
 * - minOperatorCollateralBps: 2000 (20%)
 * - maxYieldBps: 5000 (50%)
 * - protocolFeeBps: 100 (1%)
 * - defaultProcessingDays: 30
 *
 * Usage:
 *   npx hardhat run scripts/initialize-rwy-staking.ts --network baseSepolia
 */

import { ethers } from 'hardhat';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '../chain-constants';

async function main() {
  console.log('Initializing RWY Staking configuration...\n');

  const [signer] = await ethers.getSigners();
  console.log('Signer:', signer.address);
  console.log('Diamond address:', NEXT_PUBLIC_DIAMOND_ADDRESS);
  console.log('');

  // Get the RWYStakingFacet interface
  const rwyStaking = await ethers.getContractAt(
    'RWYStakingFacet',
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  );

  // Get current configuration
  console.log('=== Current Configuration ===');
  const currentConfig = await rwyStaking.getRWYConfig();
  console.log(
    `  Min Operator Collateral: ${currentConfig.minOperatorCollateralBps} bps`,
  );
  console.log(`  Max Yield: ${currentConfig.maxYieldBps} bps`);
  console.log(`  Protocol Fee: ${currentConfig.protocolFeeBps} bps`);
  console.log(
    `  Default Processing Days: ${currentConfig.defaultProcessingDays}`,
  );
  console.log('');

  // Check if already initialized (non-zero values indicate initialization)
  if (
    currentConfig.minOperatorCollateralBps > 0n &&
    currentConfig.maxYieldBps > 0n
  ) {
    console.log('✓ RWY Staking already initialized with configuration above');
    return;
  }

  // Initialize
  console.log('=== Initializing RWY Staking ===');

  const tx = await rwyStaking.initializeRWYStaking();
  console.log('Transaction hash:', tx.hash);

  const receipt = await tx.wait();
  console.log('Transaction confirmed in block:', receipt?.blockNumber);
  console.log('');

  // Verify new configuration
  console.log('=== New Configuration ===');
  const newConfig = await rwyStaking.getRWYConfig();
  console.log(
    `  Min Operator Collateral: ${newConfig.minOperatorCollateralBps} bps`,
  );
  console.log(`  Max Yield: ${newConfig.maxYieldBps} bps`);
  console.log(`  Protocol Fee: ${newConfig.protocolFeeBps} bps`);
  console.log(`  Default Processing Days: ${newConfig.defaultProcessingDays}`);
  console.log(
    `  Max Yield: ${newConfig.maxYieldBps} bps (${newConfig.maxYieldBps / 100}%)`,
  );
  console.log(
    `  Protocol Fee: ${newConfig.protocolFeeBps} bps (${newConfig.protocolFeeBps / 100}%)`,
  );
  console.log(`  Default Processing Days: ${newConfig.defaultProcessingDays}`);

  console.log('\n✅ RWY Staking initialized successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
