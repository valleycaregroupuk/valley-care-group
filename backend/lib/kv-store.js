'use strict';

/**
 * KV adapter: PostgreSQL (Cloud SQL) or in-memory Map when DATABASE_URL is unset.
 * Mirrors @vercel/kv get/set/del for JSON-serialisable values.
 */

let pool;
let memoryStore;

async function initPgPool() {
  const { Pool } = require('pg');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  const ssl =
    process.env.DATABASE_SSL === '0' || process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== '0' };
  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    ssl,
  });
  const fs = require('fs');
  const path = require('path');
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(sql);
  }
  return pool;
}

function initMemoryKv() {
  memoryStore = new Map();
  return {
    get: async (key) => memoryStore.get(key) ?? null,
    set: async (key, val) => {
      memoryStore.set(key, val);
      return 'OK';
    },
    del: async (key) => {
      memoryStore.delete(key);
      return 1;
    },
  };
}

async function createKv() {
  const pg = await initPgPool();
  if (!pg) {
    console.warn('⚠️  DATABASE_URL not set — using in-memory KV (data lost on restart)');
    return initMemoryKv();
  }
  console.log('✓ PostgreSQL KV store initialised');
  return {
    get: async (key) => {
      const r = await pool.query('SELECT value FROM app_kv WHERE key = $1', [key]);
      if (!r.rows.length) return null;
      return r.rows[0].value;
    },
    set: async (key, val, _opts) => {
      await pool.query(
        `INSERT INTO app_kv (key, value) VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, JSON.stringify(val === undefined ? null : val)]
      );
      return 'OK';
    },
    del: async (key) => {
      const r = await pool.query('DELETE FROM app_kv WHERE key = $1', [key]);
      return r.rowCount || 0;
    },
  };
}

module.exports = { createKv };
