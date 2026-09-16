-- Root-cause fix: an idempotency key must identify the same transaction intent, not merely the first order seen.
-- The fingerprint is persisted with the authoritative order so same-key/different-payload requests can be rejected.
ALTER TABLE prodx_orders
  ADD COLUMN IF NOT EXISTS idempotency_fingerprint TEXT;

ALTER TABLE prodx_orders
  DROP CONSTRAINT IF EXISTS prodx_orders_idempotency_fingerprint_valid;
ALTER TABLE prodx_orders
  ADD CONSTRAINT prodx_orders_idempotency_fingerprint_valid
  CHECK (idempotency_fingerprint IS NULL OR length(btrim(idempotency_fingerprint)) = 64);

CREATE INDEX IF NOT EXISTS prodx_orders_store_idempotency_fingerprint_idx
  ON prodx_orders(store_id, idempotency_fingerprint);

INSERT INTO prodx_schema_migrations(version)
VALUES ('0012_m2_idempotency_fingerprint')
ON CONFLICT(version) DO NOTHING;
