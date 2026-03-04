#!/usr/bin/env node
/**
 * Database reset script for Ponder indexer
 * 
 * Automatically resets DB when:
 * - DROP_DB=true env var is set
 * - Chain config changed (CHAIN_ID or DIAMOND_ADDRESS different from last run)
 * 
 * Set DROP_DB=true in Railway to force a clean reindex.
 */

import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const SCHEMA = process.env.DATABASE_SCHEMA || 'public';
const DROP_DB = process.env.DROP_DB === 'true';
const CHAIN_ID = process.env.CHAIN_ID || '84532';
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS || '';

if (!DATABASE_URL) {
  console.log('⚠️  No DATABASE_URL, skipping DB reset check');
  process.exit(0);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function run() {
  const client = await pool.connect();
  
  try {
    // Check if we need to reset
    let shouldReset = DROP_DB;
    
    if (!shouldReset) {
      // Check if chain config changed
      try {
        const result = await client.query(`
          SELECT value FROM "${SCHEMA}"._ponder_meta WHERE key = 'chain_config'
        `);
        
        if (result.rows.length > 0) {
          const lastConfig = JSON.parse(result.rows[0].value);
          if (lastConfig.chainId !== CHAIN_ID || lastConfig.diamondAddress !== DIAMOND_ADDRESS) {
            console.log('🔄 Chain config changed, resetting database...');
            console.log(`   Old: chainId=${lastConfig.chainId}, diamond=${lastConfig.diamondAddress}`);
            console.log(`   New: chainId=${CHAIN_ID}, diamond=${DIAMOND_ADDRESS}`);
            shouldReset = true;
          }
        }
      } catch (e) {
        // Table doesn't exist or parse error — reset to be safe
        console.log('⚠️  Error checking chain config:', e.message);
        console.log('🔄 Resetting database to be safe...');
        shouldReset = true;
      }
    }
    
    if (shouldReset) {
      console.log('🗑️  Dropping all Ponder tables...');
      
      // Drop all tables in the schema (Ponder will recreate them)
      await client.query(`
        DO $$ DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = '${SCHEMA}') LOOP
            EXECUTE 'DROP TABLE IF EXISTS "${SCHEMA}"."' || r.tablename || '" CASCADE';
          END LOOP;
        END $$;
      `);
      
      console.log('✅ Database reset complete');
    } else {
      console.log('✅ Database config unchanged, keeping existing data');
    }
    
    // Ensure meta table exists and store current config
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${SCHEMA}"._ponder_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
    
    await client.query(`
      INSERT INTO "${SCHEMA}"._ponder_meta (key, value) 
      VALUES ('chain_config', $1)
      ON CONFLICT (key) DO UPDATE SET value = $1
    `, [JSON.stringify({ chainId: CHAIN_ID, diamondAddress: DIAMOND_ADDRESS })]);
    
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('❌ DB reset error:', err.message);
  process.exit(1);
});
