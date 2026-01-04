/**
 * Test Setup - Runs before each test file
 *
 * Sets up the test context and initializes contracts.
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
// GLOBAL TEST STATE
// =============================================================================

let flowContext: FlowContext | null = null;
let snapshotId: string | null = null;

// =============================================================================
// SETUP HOOKS
// =============================================================================

beforeAll(async () => {
  // Get the global chain - start it if not running (for thread pool mode)
  const chain = getGlobalChain();

  if (!chain.isRunning()) {
    // Chain not started yet (happens in thread pool mode), start it now
    const chainType = (process.env.CHAIN as ChainType) || 'hardhat';
    const port = parseInt(process.env.CHAIN_PORT || '8545', 10);

    console.log(`\n🔗 Starting ${chainType} chain in test setup...`);
    await chain.start();
  }

  // Create flow context
  flowContext = createFlowContext(chain, {
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

  // Take initial snapshot
  snapshotId = await chain.snapshot('Initial state after deployment');
});

afterAll(async () => {
  // Uninstall wallet mock
  uninstallWalletMock();

  // Clean up context
  flowContext?.reset();
  flowContext = null;

  // Stop the chain
  const chain = getGlobalChain();
  if (chain.isRunning()) {
    await chain.stop();
  }
});

beforeEach(async (context) => {
  // Set current test name for coverage tracking
  const testName = context.task.name;
  getCoverageTracker().setCurrentTest(testName);

  // Revert to initial snapshot for test isolation
  const chain = getGlobalChain();
  if (snapshotId && chain.isRunning()) {
    await chain.revert(snapshotId);
    // Take a new snapshot after revert (snapshots are consumed)
    snapshotId = await chain.snapshot('Test initial state');
  }
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
