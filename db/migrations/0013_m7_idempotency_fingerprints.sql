-- M7 hardening: an idempotency key is scoped to one exact request shape.
-- pgcrypto is used only to compute a SHA-256 request fingerprint; no secrets are stored.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE prodx_refunds ADD COLUMN IF NOT EXISTS restock_items JSONB;
ALTER TABLE prodx_refunds ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;
ALTER TABLE prodx_voids ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;

UPDATE prodx_refunds r
SET restock_items = COALESCE((
  SELECT jsonb_agg(jsonb_build_object('productId', l.product_id::text, 'quantity', l.quantity_delta) ORDER BY l.product_id)
  FROM prodx_inventory_ledger l
  WHERE l.reference_id = r.id AND l.reason = 'refund_restock'
), '[]'::jsonb)
WHERE r.restock_items IS NULL;

UPDATE prodx_refunds
SET request_fingerprint = encode(digest(
  jsonb_build_object(
    'amount', amount::text,
    'authorizedByUserId', authorized_by_user_id::text,
    'method', method,
    'orderId', order_id::text,
    'reason', reason,
    'restockItems', COALESCE(restock_items, '[]'::jsonb),
    'terminalReference', terminal_reference
  )::text::bytea,
  'sha256'
), 'hex')
WHERE request_fingerprint IS NULL;

UPDATE prodx_voids
SET request_fingerprint = encode(digest(
  jsonb_build_object(
    'authorizedByUserId', authorized_by_user_id::text,
    'orderId', order_id::text,
    'reason', reason
  )::text::bytea,
  'sha256'
), 'hex')
WHERE request_fingerprint IS NULL;

ALTER TABLE prodx_refunds ALTER COLUMN restock_items SET DEFAULT '[]'::jsonb;
ALTER TABLE prodx_refunds ALTER COLUMN restock_items SET NOT NULL;
ALTER TABLE prodx_refunds ALTER COLUMN request_fingerprint SET NOT NULL;
ALTER TABLE prodx_voids ALTER COLUMN request_fingerprint SET NOT NULL;

INSERT INTO prodx_schema_migrations(version) VALUES ('0013_m7_idempotency_fingerprints') ON CONFLICT(version) DO NOTHING;
