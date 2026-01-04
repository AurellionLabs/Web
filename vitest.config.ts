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
  },
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, './'),
    },
  },
  esbuild: {
    loader: 'tsx',
    include: /\.(ts|tsx)$/,
  },
});
