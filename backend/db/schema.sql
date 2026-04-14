-- Valley Care Group — Cloud SQL (PostgreSQL)
-- JSONB values mirror former Redis KV document keys.

CREATE TABLE IF NOT EXISTS app_kv (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
