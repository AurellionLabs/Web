#!/usr/bin/env npx ts-node
/**
 * Deployment Verification Script
 *
 * Verifies that the deployed Diamond contract routes function selectors
 * to the expected facet addresses as specified in deployment files.
 *
 * This script catches issues like the NodesFacet routing bug where
 * the Diamond was routing to an old facet implementation.
 *
 * Usage:
 *   npx hardhat run scripts/verify-deployment.ts --network baseSepolia
 *
 * Environment Variables:
 *   VERBOSE=true    - Show detailed output for each selector
 *   FAIL_FAST=true  - Exit on first mismatch
 *
 * Exit Codes:
 *   0 - All verifications passed
 *   1 - One or more verifications failed
 */

import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';
import {
  CRITICAL_FACET_SELECTORS,
  getCriticalSelectors,
  validateSelectorUniqueness,
  DEPLOYMENT_KEY_TO_FACET,
} from './critical-selectors';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DIAMOND_ADDRESS = '0x2516CAdb7b3d4E94094bC4580C271B8559902e3f';
const DEPLOYMENT_FILE = path.join(
  __dirname,
  '../deployments/diamond-base-sepolia.json',
);

const VERBOSE = process.env.VERBOSE === 'true';
const FAIL_FAST = process.env.FAIL_FAST === 'true';

// =============================================================================
// TYPES
// =============================================================================

interface DeploymentData {
  diamond: string;
  facets: Record<string, string>;
  timestamp: string;
}

interface VerificationResult {
  selector: string;
  signature: string;
  expectedFacet: string;
  expectedAddress: string;
  actualAddress: string;
  passed: boolean;
  error?: string;
}

// =============================================================================
// MAIN VERIFICATION LOGIC
// =============================================================================

async function main() {
  console.log('\n🔍 Diamond Deployment Verification');
  console.log('='.repeat(60));
  console.log(`Diamond: ${DIAMOND_ADDRESS}`);
  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log('');

  // Step 1: Load deployment data
  console.log('📁 Loading deployment data...');
  let deploymentData: DeploymentData;
  try {
    const rawData = fs.readFileSync(DEPLOYMENT_FILE, 'utf-8');
    deploymentData = JSON.parse(rawData);
    console.log(
      `   ✓ Loaded ${Object.keys(deploymentData.facets).length} facets from deployment file`,
    );
    console.log(`   Timestamp: ${deploymentData.timestamp}`);
  } catch (error) {
    console.error(`   ❌ Failed to load deployment file: ${DEPLOYMENT_FILE}`);
    process.exit(1);
  }

  // Step 2: Validate selector uniqueness
  console.log('\n🔎 Validating selector configuration...');
  const uniquenessCheck = validateSelectorUniqueness();
  if (!uniquenessCheck.valid) {
    console.error('   ❌ Duplicate selectors found:');
    uniquenessCheck.duplicates.forEach((d) => console.error(`      - ${d}`));
    process.exit(1);
  }
  console.log('   ✓ All selectors are unique');

  // Step 3: Connect to Diamond
  console.log('\n🔗 Connecting to Diamond...');
  const diamond = await ethers.getContractAt(
    [
      'function facetAddress(bytes4 _functionSelector) external view returns (address)',
      'function facetAddresses() external view returns (address[])',
    ],
    DIAMOND_ADDRESS,
  );

  // Verify Diamond is accessible
  try {
    const facetAddresses = await diamond.facetAddresses();
    console.log(`   ✓ Connected - ${facetAddresses.length} facets registered`);
  } catch (error) {
    console.error('   ❌ Failed to connect to Diamond');
    process.exit(1);
  }

  // Step 4: Verify critical selectors
  console.log('\n🧪 Verifying critical selectors...');
  const results: VerificationResult[] = [];
  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;

  const criticalSelectors = getCriticalSelectors();
  console.log(`   Testing ${criticalSelectors.length} critical selectors...\n`);

  for (const {
    selector,
    signature,
    facetName,
    deploymentKey,
  } of criticalSelectors) {
    const expectedAddress = deploymentData.facets[deploymentKey];

    if (!expectedAddress) {
      // Facet not in deployment file - might be optional
      if (VERBOSE) {
        console.log(`   ⚠ SKIP: ${signature}`);
        console.log(
          `          Facet '${deploymentKey}' not in deployment file`,
        );
      }
      skipCount++;
      continue;
    }

    try {
      const actualAddress = await diamond.facetAddress(selector);
      const normalizedExpected = expectedAddress.toLowerCase();
      const normalizedActual = actualAddress.toLowerCase();
      const passed = normalizedExpected === normalizedActual;

      results.push({
        selector,
        signature,
        expectedFacet: facetName,
        expectedAddress,
        actualAddress,
        passed,
      });

      if (passed) {
        passCount++;
        if (VERBOSE) {
          console.log(`   ✓ PASS: ${signature}`);
          console.log(`          → ${actualAddress}`);
        }
      } else {
        failCount++;
        console.log(`   ❌ FAIL: ${signature}`);
        console.log(`          Expected: ${expectedAddress} (${facetName})`);
        console.log(`          Actual:   ${actualAddress}`);

        if (actualAddress === '0x0000000000000000000000000000000000000000') {
          console.log(`          ⚠ Selector not registered in Diamond!`);
        } else {
          // Try to identify which facet it's actually routing to
          const actualFacetKey = Object.entries(deploymentData.facets).find(
            ([, addr]) => addr.toLowerCase() === normalizedActual,
          )?.[0];
          if (actualFacetKey) {
            console.log(
              `          ⚠ Routing to: ${DEPLOYMENT_KEY_TO_FACET[actualFacetKey] || actualFacetKey}`,
            );
          } else {
            console.log(
              `          ⚠ Routing to unknown facet (not in deployment file)`,
            );
          }
        }

        if (FAIL_FAST) {
          console.log('\n   FAIL_FAST enabled - exiting on first failure');
          process.exit(1);
        }
      }
    } catch (error: any) {
      failCount++;
      results.push({
        selector,
        signature,
        expectedFacet: facetName,
        expectedAddress,
        actualAddress: 'ERROR',
        passed: false,
        error: error.message,
      });
      console.log(`   ❌ ERROR: ${signature}`);
      console.log(`          ${error.message}`);
    }
  }

  // Step 5: Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Verification Summary');
  console.log('='.repeat(60));
  console.log(`   Passed:  ${passCount}`);
  console.log(`   Failed:  ${failCount}`);
  console.log(`   Skipped: ${skipCount}`);
  console.log(`   Total:   ${criticalSelectors.length}`);

  if (failCount > 0) {
    console.log('\n❌ VERIFICATION FAILED');
    console.log('\nFailed selectors:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`   - ${r.signature}`);
        console.log(`     Expected: ${r.expectedAddress}`);
        console.log(`     Actual:   ${r.actualAddress}`);
      });

    console.log('\n💡 To fix:');
    console.log(
      '   1. Run: FACET_NAME=<FacetName> npx hardhat run scripts/upgrade-facet.ts --network baseSepolia',
    );
    console.log(
      '   2. Update deployments/diamond-base-sepolia.json with new addresses',
    );
    console.log('   3. Re-run this verification');

    process.exit(1);
  }

  console.log('\n✅ ALL VERIFICATIONS PASSED');
  console.log(
    '\nThe Diamond is correctly routing all critical selectors to expected facets.',
  );
}

// =============================================================================
// ADDITIONAL CHECKS
// =============================================================================

async function checkForOrphanedFacets(
  diamond: any,
  deploymentData: DeploymentData,
): Promise<void> {
  console.log('\n🔎 Checking for orphaned facets...');

  const onChainFacets = await diamond.facetAddresses();
  const deployedFacets = new Set(
    Object.values(deploymentData.facets).map((a) => a.toLowerCase()),
  );

  const orphaned = onChainFacets.filter(
    (addr: string) => !deployedFacets.has(addr.toLowerCase()),
  );

  if (orphaned.length > 0) {
    console.log(
      `   ⚠ Found ${orphaned.length} facets not in deployment file:`,
    );
    orphaned.forEach((addr: string) => {
      console.log(`      - ${addr}`);
    });
  } else {
    console.log('   ✓ All on-chain facets are tracked in deployment file');
  }
}

// =============================================================================
// ENTRY POINT
// =============================================================================

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });
