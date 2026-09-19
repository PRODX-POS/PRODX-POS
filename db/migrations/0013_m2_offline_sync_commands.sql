-- PRODX POS M2 offline sync command lifecycle
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS prodx_sync_commands (
  id UUID PRIMARY KEY, organization_id UUID NOT NULL, store_id UUID NOT NULL, user_id UUID NOT NULL,
  command_id TEXT NOT NULL, command_type TEXT NOT NULL, idempotency_key TEXT NOT NULL, payload JSONB NOT NULL,
  request_fingerprint TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'processing', attempts INTEGER NOT NULL DEFAULT 0,
  result_order_id UUID NULL, last_error TEXT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMPTZ NULL,
  CONSTRAINT prodx_sync_command_status_valid CHECK (status IN ('processing','complete','failed','conflict')),
  CONSTRAINT prodx_sync_command_type_valid CHECK (command_type IN ('order_transaction')),
  CONSTRAINT prodx_sync_command_attempts_valid CHECK (attempts >= 0),
  CONSTRAINT prodx_sync_command_fingerprint_valid CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT prodx_sync_command_scope_fk FOREIGN KEY (organization_id, store_id) REFERENCES prodx_stores(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT prodx_sync_command_user_scope_fk FOREIGN KEY (organization_id, store_id, user_id) REFERENCES prodx_store_memberships(organization_id, store_id, user_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_sync_command_order_fk FOREIGN KEY (result_order_id) REFERENCES prodx_orders(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS prodx_sync_commands_scope_command_idx ON prodx_sync_commands (store_id, command_id);
CREATE UNIQUE INDEX IF NOT EXISTS prodx_sync_commands_scope_idempotency_idx ON prodx_sync_commands (store_id, idempotency_key);
CREATE INDEX IF NOT EXISTS prodx_sync_commands_scope_status_idx ON prodx_sync_commands (organization_id, store_id, status, updated_at DESC);
INSERT INTO prodx_schema_migrations(version) VALUES ('0013_m2_offline_sync_commands') ON CONFLICT(version) DO NOTHING;
