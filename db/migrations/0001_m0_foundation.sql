-- PRODX M0 Gate B foundation migration.
-- Infrastructure metadata only. Domain/business tables require Gate C approval.

CREATE TABLE IF NOT EXISTS prodx_schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prodx_migration_lock (
  lock_id SMALLINT PRIMARY KEY CHECK (lock_id = 1),
  locked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO prodx_migration_lock (lock_id)
VALUES (1)
ON CONFLICT (lock_id) DO NOTHING;

INSERT INTO prodx_schema_migrations (version)
VALUES ('0001_m0_foundation')
ON CONFLICT (version) DO NOTHING;
