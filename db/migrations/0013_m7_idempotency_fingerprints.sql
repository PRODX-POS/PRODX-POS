-- M7 hardening: an idempotency key is scoped to one exact request shape.
-- pgcrypto is used only to compute a SHA-256 request fingerprint; no secrets are stored.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE prodx_refunds ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;
ALTER TABLE prodx_voids ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;

UPDATE prodx_refunds
SET request_fingerprint = encode(digest(
  jsonb_build_object(
    'orderId', order_id::text,
    'amount', amount::text,
    'method', method,
    'reason', reason,
    'authorizedByUserId', authorized_by_user_id::text,
    'terminalReference', terminal_reference
  )::text::bytea,
  'sha256'
), 'hex')
WHERE request_fingerprint IS NULL;

UPDATE prodx_voids
SET request_fingerprint = encode(digest(
  jsonb_build_object(
    'orderId', order_id::text,
    'reason', reason,
    'authorizedByUserId', authorized_by_user_id::text
  )::text::bytea,
  'sha256'
), 'hex')
WHERE request_fingerprint IS NULL;

ALTER TABLE prodx_refunds ALTER COLUMN request_fingerprint SET NOT NULL;
ALTER TABLE prodx_voids ALTER COLUMN request_fingerprint SET NOT NULL;

INSERT INTO prodx_schema_migrations(version) VALUES ('0013_m7_idempotency_fingerprints') ON CONFLICT(version) DO NOTHING;
