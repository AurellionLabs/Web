/**
 * Global Teardown - Runs once after all E2E tests
 *
 * Stops the local chain and performs cleanup.
 */

import { resetGlobalChain } from '../chain/chain-manager';
import { validateCoverage } from '../coverage/coverage-validator';

export default async function globalTeardown() {
  console.log('\n🌍 E2E Global Teardown');
  console.log('═'.repeat(60));

  // Validate coverage if enabled
  if (process.env.VALIDATE_COVERAGE !== 'false') {
    try {
      console.log('\n📊 Validating interface coverage...');
      validateCoverage({
        minCoverage: parseInt(process.env.MIN_COVERAGE || '80', 10),
        requireFullCoverage: process.env.REQUIRE_FULL_COVERAGE === 'true',
        printReport: true,
        throwOnFailure: process.env.FAIL_ON_COVERAGE === 'true',
      });
    } catch (error) {
      console.error('⚠️  Coverage validation failed:', error);
      if (process.env.FAIL_ON_COVERAGE === 'true') {
        throw error;
      }
    }
  }

  // Stop the chain
  try {
    await resetGlobalChain();
    console.log('✅ Chain stopped');
  } catch (error) {
    console.error('⚠️  Error stopping chain:', error);
  }

  console.log('═'.repeat(60));
  console.log('✅ Global teardown complete\n');
}
