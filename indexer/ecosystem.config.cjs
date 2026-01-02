module.exports = {
  apps: [
    {
      name: 'aurellion-indexer',
      script: 'npm',
      args: 'run start',
      cwd: '/srv/Web/indexer',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://postgres:9h11059y!Aur31110n!@localhost:5432/ponder_indexer',
        NEXT_PUBLIC_RPC_URL_84532: 'https://base-sepolia.infura.io/v3/281dfd93e10842199b64ed6f3535fa4c',
        BASE_TEST_RPC_URL: 'https://base-sepolia.infura.io/v3/281dfd93e10842199b64ed6f3535fa4c',
        PONDER_NETWORK: 'baseSepolia',
        PONDER_LOG_LEVEL: 'info',
        // RPC Optimization settings (optimized defaults for credit efficiency)
        // These reduce RPC calls by ~50-60% compared to standard settings
        PONDER_POLLING_INTERVAL_MS: '3500',  // Polling interval in ms (optimized: 3500ms = 3.5s, reduces calls by ~43%)
        PONDER_MAX_BLOCK_RANGE: '5000',  // Max blocks per RPC request (optimized: 5000, reduces calls by 60%)
        PONDER_RPC_BATCH_WAIT_MS: '100',  // RPC batch wait time in ms (optimized: 100ms for better batching)
      },
      // Restart settings
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      // Logging
      error_file: '/srv/Web/indexer/logs/error.log',
      out_file: '/srv/Web/indexer/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Watch settings (disabled for production)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],
    },
  ],
};

