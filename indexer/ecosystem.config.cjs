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
        DATABASE_URL:
          'postgresql://postgres:9h11059y!Aur31110n!@localhost:5432/ponder_indexer',
        NEXT_PUBLIC_RPC_URL_84532:
          'https://base-sepolia.infura.io/v3/30d0943a6329474e8b08a1ce7ab66892',
        BASE_TEST_RPC_URL:
          'https://base-sepolia.infura.io/v3/30d0943a6329474e8b08a1ce7ab66892',
        PONDER_NETWORK: 'baseSepolia',
        PONDER_LOG_LEVEL: 'info',
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
