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

    // Setup files - using test-setup.ts which handles chain lifecycle per test file
    setupFiles: ['e2e/setup/test-setup.ts'],

    // Timeouts for blockchain operations
    testTimeout: 120000, // 2 minutes per test
    hookTimeout: 60000, // 1 minute for hooks

    // Run tests sequentially (important for blockchain state)
    sequence: {
      shuffle: false,
    },

    // Pool configuration - use threads with single thread for shared state
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Run all tests in a single thread for shared chain state
      },
    },

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
