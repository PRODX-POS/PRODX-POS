-- M3 refund / shift / cash persistence.
CREATE TABLE IF NOT EXISTS prodx_refunds (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  order_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL,
  reason TEXT NOT NULL,
  authorized_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_refunds_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refunds_order_store_fk FOREIGN KEY (order_id, store_id) REFERENCES prodx_orders(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refunds_authorizer_org_fk FOREIGN KEY (authorized_by_user_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refunds_amount_valid CHECK (amount > 0),
  CONSTRAINT prodx_refunds_method_valid CHECK (method IN ('cash','card','qr_digital')),
  CONSTRAINT prodx_refunds_reason_valid CHECK (length(btrim(reason)) > 0)
);
CREATE INDEX IF NOT EXISTS prodx_refunds_order_idx ON prodx_refunds(store_id, order_id, created_at);

CREATE OR REPLACE FUNCTION prodx_validate_refund_total()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_total NUMERIC(12,2); v_order_total NUMERIC(12,2);
BEGIN
  SELECT grand_total_amount INTO v_order_total FROM prodx_orders WHERE id=NEW.order_id AND store_id=NEW.store_id;
  IF v_order_total IS NULL THEN RAISE EXCEPTION 'refund order not found' USING ERRCODE='23503'; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_total FROM prodx_refunds WHERE order_id=NEW.order_id AND store_id=NEW.store_id;
  IF v_total > v_order_total THEN RAISE EXCEPTION 'refund total exceeds order total' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS prodx_refund_total_invariant ON prodx_refunds;
CREATE CONSTRAINT TRIGGER prodx_refund_total_invariant AFTER INSERT OR UPDATE ON prodx_refunds DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION prodx_validate_refund_total();

INSERT INTO prodx_schema_migrations(version) VALUES ('0012_m3_refund_cash_invariants') ON CONFLICT(version) DO NOTHING;
