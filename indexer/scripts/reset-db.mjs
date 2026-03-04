#!/usr/bin/env node
/**
 * Database reset script for Ponder indexer
 * 
 * Always drops all tables in the schema on each deploy.
 * This is intentional for DeFi indexers - data comes from the chain anyway,
 * so re-syncing is fine and avoids schema conflicts between deploys.
 */

import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const SCHEMA = process.env.DATABASE_SCHEMA || 'public';

if (!DATABASE_URL) {
  console.log('⚠️  No DATABASE_URL, skipping DB reset check');
  process.exit(0);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function run() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Dropping all tables in schema...');
    
    // Drop all tables in the schema (Ponder will recreate them on start)
    await client.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = $1) LOOP
          EXECUTE 'DROP TABLE IF EXISTS "' || $1 || '"."' || r.tablename || '" CASCADE';
        END LOOP;
      END $$;
    `, [SCHEMA]);
    
    // Also drop Ponder's internal schema if it exists
    await client.query(`DROP SCHEMA IF EXISTS ponder CASCADE`).catch(() => {});
    
    console.log('✅ Database reset complete - Ponder will re-sync on start');
    
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('❌ DB reset error:', err.message);
  process.exit(1);
});
