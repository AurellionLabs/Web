/**
 * Global Setup - Runs once before all E2E tests
 *
 * Starts the local chain and performs any global initialization.
 */

import { getGlobalChain, ChainType } from '../chain/chain-manager';

export default async function globalSetup() {
  console.log('\n🌍 E2E Global Setup');
  console.log('═'.repeat(60));

  // Determine chain type from environment (default to Anvil for speed)
  const chainType = (process.env.CHAIN as ChainType) || 'anvil';
  const port = parseInt(process.env.CHAIN_PORT || '8545', 10);

  console.log(`   Chain Type: ${chainType}`);
  console.log(`   Port: ${port}`);

  // Start the chain
  const chain = getGlobalChain({
    type: chainType,
    port,
    accounts: 20,
    balance: '10000',
  });

  try {
    await chain.start();

    // Store chain info for tests
    process.env.E2E_CHAIN_RPC = chain.getRpcUrl();
    process.env.E2E_CHAIN_ID = chain.getChainId().toString();

    console.log(`   RPC URL: ${chain.getRpcUrl()}`);
    console.log(`   Chain ID: ${chain.getChainId()}`);
    console.log('═'.repeat(60));
    console.log('✅ Global setup complete\n');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}
