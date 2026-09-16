-- M7: server-authoritative void/refund persistence.
-- Original sale payments remain immutable; refunds/void reversals are separate financial events.
CREATE TABLE IF NOT EXISTS prodx_refunds (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  order_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL,
  reason TEXT NOT NULL,
  authorized_by_user_id UUID NOT NULL,
  terminal_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_refunds_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refunds_order_store_fk FOREIGN KEY (order_id, store_id) REFERENCES prodx_orders(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refunds_user_org_fk FOREIGN KEY (authorized_by_user_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refunds_amount_valid CHECK (amount > 0),
  CONSTRAINT prodx_refunds_method_valid CHECK (method IN ('cash','card','qr_digital')),
  CONSTRAINT prodx_refunds_text_valid CHECK (length(btrim(idempotency_key)) > 0 AND length(btrim(reason)) > 0),
  CONSTRAINT prodx_refunds_id_store_unique UNIQUE (id, store_id),
  CONSTRAINT prodx_refunds_store_idempotency_unique UNIQUE (store_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS prodx_voids (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  order_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  reason TEXT NOT NULL,
  authorized_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_voids_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_voids_order_store_fk FOREIGN KEY (order_id, store_id) REFERENCES prodx_orders(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_voids_user_org_fk FOREIGN KEY (authorized_by_user_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_voids_text_valid CHECK (length(btrim(idempotency_key)) > 0 AND length(btrim(reason)) > 0),
  CONSTRAINT prodx_voids_id_store_unique UNIQUE (id, store_id),
  CONSTRAINT prodx_voids_store_idempotency_unique UNIQUE (store_id, idempotency_key),
  CONSTRAINT prodx_voids_order_unique UNIQUE (store_id, order_id)
);

CREATE TABLE IF NOT EXISTS prodx_payment_reversals (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  order_id UUID NOT NULL,
  payment_id UUID NOT NULL,
  void_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL,
  reason TEXT NOT NULL,
  authorized_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_payment_reversals_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_payment_reversals_order_store_fk FOREIGN KEY (order_id, store_id) REFERENCES prodx_orders(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_payment_reversals_payment_fk FOREIGN KEY (payment_id) REFERENCES prodx_payments(id) ON DELETE RESTRICT,
  CONSTRAINT prodx_payment_reversals_void_fk FOREIGN KEY (void_id, store_id) REFERENCES prodx_voids(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_payment_reversals_user_org_fk FOREIGN KEY (authorized_by_user_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_payment_reversals_amount_valid CHECK (amount > 0),
  CONSTRAINT prodx_payment_reversals_method_valid CHECK (method IN ('cash','card','qr_digital')),
  CONSTRAINT prodx_payment_reversals_text_valid CHECK (length(btrim(reason)) > 0),
  CONSTRAINT prodx_payment_reversals_id_store_unique UNIQUE (id, store_id),
  CONSTRAINT prodx_payment_reversals_void_payment_unique UNIQUE (void_id, payment_id)
);

CREATE INDEX IF NOT EXISTS prodx_refunds_order_idx ON prodx_refunds(organization_id, store_id, order_id, created_at);
CREATE INDEX IF NOT EXISTS prodx_voids_order_idx ON prodx_voids(organization_id, store_id, order_id, created_at);
CREATE INDEX IF NOT EXISTS prodx_payment_reversals_order_idx ON prodx_payment_reversals(organization_id, store_id, order_id, created_at);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='prodx_inventory_reason_valid') THEN
    ALTER TABLE prodx_inventory_ledger DROP CONSTRAINT prodx_inventory_reason_valid;
  END IF;
  ALTER TABLE prodx_inventory_ledger ADD CONSTRAINT prodx_inventory_reason_valid
    CHECK (reason IN ('sale_deduction','refund_restock','void_reversal','purchase_received','transfer_in','transfer_out','audit_count_adjustment','damaged_write_off'));
END;
$$;

CREATE OR REPLACE FUNCTION prodx_validate_refund_invariants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_order prodx_orders%ROWTYPE;
  v_paid NUMERIC(12,2);
  v_refunded NUMERIC(12,2);
BEGIN
  SELECT * INTO v_order FROM prodx_orders WHERE id=NEW.order_id AND store_id=NEW.store_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'refund order not found' USING ERRCODE='23503'; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM prodx_payments WHERE order_id=NEW.order_id;
  SELECT COALESCE(SUM(amount),0) INTO v_refunded FROM prodx_refunds WHERE order_id=NEW.order_id;
  IF v_paid <> v_order.grand_total_amount THEN RAISE EXCEPTION 'refund payment basis is inconsistent' USING ERRCODE='23514'; END IF;
  IF v_refunded > v_paid THEN RAISE EXCEPTION 'refund total exceeds captured payment total' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prodx_validate_payment_reversal_invariants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment prodx_payments%ROWTYPE;
  v_reversed NUMERIC(12,2);
BEGIN
  SELECT * INTO v_payment FROM prodx_payments WHERE id=NEW.payment_id AND store_id=NEW.store_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment reversal payment not found' USING ERRCODE='23503'; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_reversed FROM prodx_payment_reversals WHERE payment_id=NEW.payment_id;
  IF v_reversed > v_payment.amount THEN RAISE EXCEPTION 'payment reversal exceeds captured payment' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prodx_refund_invariant ON prodx_refunds;
CREATE CONSTRAINT TRIGGER prodx_refund_invariant AFTER INSERT OR UPDATE ON prodx_refunds DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION prodx_validate_refund_invariants();
DROP TRIGGER IF EXISTS prodx_payment_reversal_invariant ON prodx_payment_reversals;
CREATE CONSTRAINT TRIGGER prodx_payment_reversal_invariant AFTER INSERT OR UPDATE ON prodx_payment_reversals DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION prodx_validate_payment_reversal_invariants();

INSERT INTO prodx_schema_migrations(version) VALUES ('0012_m7_void_refund') ON CONFLICT(version) DO NOTHING;
