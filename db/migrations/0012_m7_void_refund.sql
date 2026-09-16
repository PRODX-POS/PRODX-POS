-- M7: server-authoritative void/refund persistence.
-- Original sale payments remain immutable; refunds are separate financial events.
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

CREATE INDEX IF NOT EXISTS prodx_refunds_order_idx ON prodx_refunds(organization_id, store_id, order_id, created_at);
CREATE INDEX IF NOT EXISTS prodx_voids_order_idx ON prodx_voids(organization_id, store_id, order_id, created_at);

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
  IF v_paid <> v_order.grand_total_amount THEN
    RAISE EXCEPTION 'refund payment basis is inconsistent' USING ERRCODE='23514';
  END IF;
  IF v_refunded > v_paid THEN
    RAISE EXCEPTION 'refund total exceeds captured payment total' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prodx_refund_invariant ON prodx_refunds;
CREATE CONSTRAINT TRIGGER prodx_refund_invariant AFTER INSERT OR UPDATE OR DELETE ON prodx_refunds DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION prodx_validate_refund_invariants();

INSERT INTO prodx_schema_migrations(version) VALUES ('0012_m7_void_refund') ON CONFLICT(version) DO NOTHING;
