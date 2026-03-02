/**
 * Vitest Configuration for E2E Tests
 *
 * Configures vitest for end-to-end testing with local blockchain.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test file patterns
    include: ['e2e/tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    // Setup files - runs before each test file
    // Note: We don't use globalSetup because it runs in a separate process
    // and can't share chain state with tests
    setupFiles: ['e2e/setup/test-setup.ts'],

    // Timeouts for blockchain operations
    testTimeout: 120000, // 2 minutes per test
    hookTimeout: 180000, // 3 minutes for hooks (deployment + setup can take time)

    // Run tests sequentially (important for blockchain state)
    sequence: {
      shuffle: false,
    },

    // Use forks pool with no isolation for shared chain state
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run all tests in a single fork
        isolate: false, // Don't isolate test files - share module state
      },
    },

    // Disable file parallelism - run test files sequentially
    fileParallelism: false,

    // Reporter configuration
    reporters: ['verbose'],

    // Environment
    environment: 'node',

    // Globals
    globals: true,
  },

  // Path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..'),
      '@e2e': path.resolve(__dirname),
    },
  },

  // ESBuild configuration
  esbuild: {
    target: 'node18',
  },
});
