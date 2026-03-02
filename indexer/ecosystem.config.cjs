module.exports = {
  apps: [
    {
      name: 'aurellion-indexer',
      script: 'npm',
      args: 'run start',
      cwd: '/srv/Web/indexer',
      env: {
        DATABASE_URL:
          'postgresql://postgres:aurellion_secure_2026@localhost:5432/ponder_indexer',
        DATABASE_SCHEMA: 'public',
        NEXT_PUBLIC_DIAMOND_ADDRESS:
          '0x2516CAdb7b3d4E94094bC4580C271B8559902e3f',
        DIAMOND_DEPLOY_BLOCK: '35859031',
        NEXT_PUBLIC_RPC_URL_84532: process.env.NEXT_PUBLIC_RPC_URL_84532 || '',
        PONDER_LOG_LEVEL: 'info',
      },
    },
  ],
};
