-- PRODX POS M6 payment lifecycle foundation
CREATE UNIQUE INDEX IF NOT EXISTS prodx_payments_id_store_unique_idx ON prodx_payments(id, store_id);

CREATE TABLE IF NOT EXISTS prodx_payment_attempts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  order_id UUID NOT NULL,
  payment_id UUID,
  idempotency_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  amount NUMERIC(12,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  provider_reference TEXT,
  failure_code TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_payment_attempts_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_payment_attempts_order_store_fk FOREIGN KEY (order_id, store_id) REFERENCES prodx_orders(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_payment_attempts_payment_store_fk FOREIGN KEY (payment_id, store_id) REFERENCES prodx_payments(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_payment_attempts_status_valid CHECK (status IN ('pending','authorized','captured','failed','cancelled','unknown')),
  CONSTRAINT prodx_payment_attempts_method_valid CHECK (method IN ('cash','card','qr_digital')),
  CONSTRAINT prodx_payment_attempts_amount_valid CHECK (amount > 0),
  CONSTRAINT prodx_payment_attempts_key_valid CHECK (length(btrim(idempotency_key)) > 0 AND length(btrim(provider)) > 0),
  CONSTRAINT prodx_payment_attempts_store_key_unique UNIQUE (store_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS prodx_payment_attempts_order_idx ON prodx_payment_attempts(store_id, order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS prodx_payment_attempts_provider_ref_idx ON prodx_payment_attempts(store_id, provider, provider_reference) WHERE provider_reference IS NOT NULL;

ALTER TABLE prodx_payments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'captured';
ALTER TABLE prodx_payments
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE prodx_payments
  ADD COLUMN IF NOT EXISTS provider_reference TEXT;
ALTER TABLE prodx_payments
  ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ;
ALTER TABLE prodx_payments
  ADD COLUMN IF NOT EXISTS failure_code TEXT;
ALTER TABLE prodx_payments
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='prodx_payments_status_valid') THEN
    ALTER TABLE prodx_payments ADD CONSTRAINT prodx_payments_status_valid CHECK (status IN ('authorized','captured','failed','cancelled','unknown'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='prodx_payments_provider_valid') THEN
    ALTER TABLE prodx_payments ADD CONSTRAINT prodx_payments_provider_valid CHECK (length(btrim(provider)) > 0);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS prodx_payments_order_status_idx ON prodx_payments(store_id, order_id, status);
CREATE INDEX IF NOT EXISTS prodx_payments_provider_reference_idx ON prodx_payments(store_id, provider, provider_reference) WHERE provider_reference IS NOT NULL;

INSERT INTO prodx_schema_migrations(version) VALUES ('0015_m6_payment_lifecycle') ON CONFLICT(version) DO NOTHING;
