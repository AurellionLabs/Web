/**
 * Global Teardown - Runs once after all E2E tests
 *
 * Stops the local chain and performs cleanup.
 */

import { getGlobalChain } from '../chain/chain-manager';

export default async function globalTeardown() {
  console.log('\n🌍 E2E Global Teardown');
  console.log('═'.repeat(60));

  try {
    const chain = getGlobalChain();
    if (chain.isRunning()) {
      await chain.stop();
      console.log('✅ Chain stopped');
    }
    console.log('═'.repeat(60));
    console.log('✅ Global teardown complete\n');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - we want tests to complete even if teardown fails
  }
}
