-- PRODX POS M2 idempotency semantic integrity
-- The idempotency key is store-scoped, and each committed key is bound to the
-- semantic checkout request that created it. Reusing a key for a different
-- request must fail closed rather than silently replaying the old transaction.

ALTER TABLE prodx_orders
  ADD COLUMN IF NOT EXISTS idempotency_request_fingerprint TEXT;

UPDATE prodx_orders
SET idempotency_request_fingerprint = COALESCE(
  idempotency_request_fingerprint,
  encode(digest(idempotency_key, 'sha256'), 'hex')
)
WHERE idempotency_request_fingerprint IS NULL;

ALTER TABLE prodx_orders
  ALTER COLUMN idempotency_request_fingerprint SET NOT NULL;

ALTER TABLE prodx_orders
  ADD CONSTRAINT prodx_orders_idempotency_fingerprint_valid
  CHECK (idempotency_request_fingerprint ~ '^[0-9a-f]{64}$');

INSERT INTO prodx_schema_migrations(version)
VALUES ('0012_m2_idempotency_request_fingerprint')
ON CONFLICT(version) DO NOTHING;
