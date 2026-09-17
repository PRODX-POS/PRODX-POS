-- PRODX POS M2 idempotency semantic integrity
-- New checkout records are bound to a semantic request fingerprint. Historical
-- records cannot be safely reconstructed from the persisted schema because the
-- original client payload is not stored, so they remain NULL and replay fails
-- closed until the caller submits a new idempotency key.

ALTER TABLE prodx_orders
  ADD COLUMN IF NOT EXISTS idempotency_request_fingerprint TEXT;

ALTER TABLE prodx_orders
  ADD CONSTRAINT prodx_orders_idempotency_fingerprint_valid
  CHECK (idempotency_request_fingerprint IS NULL OR idempotency_request_fingerprint ~ '^[0-9a-f]{64}$');

INSERT INTO prodx_schema_migrations(version)
VALUES ('0012_m2_idempotency_request_fingerprint')
ON CONFLICT(version) DO NOTHING;
