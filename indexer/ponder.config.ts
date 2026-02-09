// Use auto-generated config with custom database
import generatedConfig from './ponder.config.generated';

export default {
  ...generatedConfig,
  database: {
    kind: 'postgres',
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:aurellion_secure_2026@localhost:5432/ponder_indexer',
    schema: process.env.DATABASE_SCHEMA || 'public',
  },
};
