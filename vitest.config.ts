// @ts-nocheck - Vitest config file
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'test/**/*.test.ts',
      'test/**/*.test.tsx',
      '__tests__/**/*.test.ts',
      '__tests__/**/*.test.tsx',
    ],
    exclude: [
      '**/node_modules/**',
      // Exclude hardhat-dependent tests (run separately with hardhat test)
      'test/dapp-listener.integration.test.ts',
      'test/services/OrderService.test.ts',
      'test/services/OrderBridgeService.test.ts',
      'test/infrastructure/services/node-asset.service.integration.test.ts',
      'test/infrastructure/services/node-asset.service.test.ts',
      'test/infrastructure/repositories/orders-repository.unit.test.ts',
      // Exclude tests with complex mocking or TypeScript issues (need refactor)
      'test/repositories/CLOBRepository.test.ts',
      'test/hooks/useUnifiedOrder.test.ts',
      'test/infrastructure/repositories/platform-repository.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'contracts/**/*.sol',
        'infrastructure/**/*.ts',
        'hooks/**/*.ts',
        'app/components/**/*.tsx',
      ],
      exclude: [
        '**/node_modules/**',
        '**/.next/**',
        '**/out/**',
        '**/artifacts/**',
        '**/cache/**',
        '**/typechain-types/**',
      ],
    },
    testTimeout: 30000,
    setupFiles: ['test/setup.ts'],
    // Run all test files in a single forked process to prevent CI OOM.
    // The suite grew to 88 files; parallel forks peaked at ~4.5GB and crashed.
    // singleFork shares one heap across all files — slower but reliable.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        execArgv: ['--max-old-space-size=8192'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  esbuild: {
    loader: 'tsx',
    include: /\.(ts|tsx)$/,
  },
});
