/**
 * Test Setup - Runs before each test file
 *
 * Sets up the test context and initializes contracts.
 *
 * ARCHITECTURE:
 * - One Anvil chain starts and persists across all test files
 * - Contracts are deployed once and shared
 * - Each test file creates its own test data (stateless tests)
 * - NonceManager ensures wallets always fetch current nonce from chain
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { getGlobalChain, ChainType } from '../chain/chain-manager';
import {
  FlowContext,
  createFlowContext,
  setGlobalContext,
  getFlowContext,
} from '../flows/flow-context';
import { installWalletMock, uninstallWalletMock } from '../flows/wallet-mock';
import { getCoverageTracker } from '../coverage/coverage-tracker';

// =============================================================================
// GLOBAL TEST STATE (shared across all test files via globalThis)
// =============================================================================

declare global {
  var __e2eFlowContext: FlowContext | undefined;
  var __e2eInitialized: boolean | undefined;
  var __e2eExitHandlerInstalled: boolean | undefined;
}

// =============================================================================
// PROCESS EXIT HANDLER - Ensures chain is stopped when tests complete
// =============================================================================

function installExitHandler() {
  if (globalThis.__e2eExitHandlerInstalled) return;

  const cleanup = async () => {
    const chain = getGlobalChain();
    if (chain.isRunning()) {
      console.log('\n🛑 Process exit - stopping chain...');
      await chain.stop();
    }
  };

  // Handle various exit scenarios
  process.on('exit', () => {
    // Synchronous cleanup - can't await here
    const chain = getGlobalChain();
    if (chain.isRunning()) {
      // Force kill the process
      try {
        (chain as any).process?.kill('SIGKILL');
      } catch {}
    }
  });

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });

  process.on('uncaughtException', async (err) => {
    console.error('Uncaught exception:', err);
    await cleanup();
    process.exit(1);
  });

  globalThis.__e2eExitHandlerInstalled = true;
}

// =============================================================================
// SETUP HOOKS
// =============================================================================

beforeAll(async () => {
  // Install exit handler to ensure cleanup
  installExitHandler();

  // Check if already initialized by a previous test file
  if (globalThis.__e2eInitialized && globalThis.__e2eFlowContext) {
    console.log('⏭️ Reusing existing chain and contracts from previous file');
    setGlobalContext(globalThis.__e2eFlowContext);

    // Reset NonceManager caches to avoid stale nonces
    const chain = getGlobalChain();
    chain.resetProviderNonces();

    // Re-install wallet mock for this file
    installWalletMock(chain, {
      verbose: process.env.VERBOSE === 'true',
      autoApprove: true,
    });
    return;
  }

  // First test file - start the chain
  const chainType = (process.env.CHAIN as ChainType) || 'anvil';
  const port = parseInt(process.env.CHAIN_PORT || '8545', 10);

  console.log(`\n🔗 Starting ${chainType} chain...`);

  // Initialize chain with proper config
  const chain = getGlobalChain({
    type: chainType,
    port,
    accounts: 20,
    balance: '10000',
  });

  await chain.start();

  // Create flow context
  const flowContext = createFlowContext(chain, {
    verbose: process.env.VERBOSE === 'true',
    trackCoverage: true,
  });

  // Initialize with deployment - use 'test' mode by default for E2E tests
  const deployMode = process.env.DEPLOY_MODE || 'test';
  await flowContext.initialize(deployMode);

  // Set global context
  setGlobalContext(flowContext);

  // Install wallet mock
  installWalletMock(chain, {
    verbose: process.env.VERBOSE === 'true',
    autoApprove: true,
  });

  // Store in globalThis for sharing across test files
  globalThis.__e2eFlowContext = flowContext;
  globalThis.__e2eInitialized = true;

  console.log('⚡ Chain ready - tests share persistent state');
});

afterAll(async () => {
  // Uninstall wallet mock for this file
  uninstallWalletMock();

  // DON'T stop the chain here - let the exit handler do it
  // This allows the chain to be reused across test files
});

beforeEach(async (context) => {
  // Set current test name for coverage tracking
  const testName = context.task.name;
  getCoverageTracker().setCurrentTest(testName);
});

afterEach(async () => {
  // Clear current test
  getCoverageTracker().setCurrentTest(null);
});

// =============================================================================
// EXPORTS FOR TESTS
// =============================================================================

/**
 * Get the flow context for the current test
 */
export function getContext(): FlowContext {
  const ctx = getFlowContext();
  if (!ctx) {
    throw new Error(
      'Flow context not initialized. Ensure test setup ran correctly.',
    );
  }
  return ctx;
}

/**
 * Get the chain manager
 */
export function getChain() {
  return getGlobalChain();
}
