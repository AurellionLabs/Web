import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      'ponder:registry': '@/generated',
    },
  },
});
