-- PRODX POS M3 refund core
-- Refunds are immutable financial events; inventory and cash effects are recorded in the same transaction.

CREATE TABLE IF NOT EXISTS prodx_refunds (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  order_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL,
  reason TEXT NOT NULL,
  authorized_by_user_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_refunds_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refunds_order_store_fk FOREIGN KEY (order_id, store_id) REFERENCES prodx_orders(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refunds_user_org_fk FOREIGN KEY (authorized_by_user_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refunds_amount_valid CHECK (amount > 0),
  CONSTRAINT prodx_refunds_method_valid CHECK (method IN ('cash','card','qr_digital')),
  CONSTRAINT prodx_refunds_reason_valid CHECK (length(btrim(reason)) > 0),
  CONSTRAINT prodx_refunds_key_valid CHECK (length(btrim(idempotency_key)) > 0),
  CONSTRAINT prodx_refunds_store_key_unique UNIQUE (store_id, idempotency_key),
  CONSTRAINT prodx_refunds_id_store_unique UNIQUE (id, store_id)
);

CREATE TABLE IF NOT EXISTS prodx_refund_items (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  refund_id UUID NOT NULL,
  order_item_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_refund_items_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refund_items_refund_store_fk FOREIGN KEY (refund_id, store_id) REFERENCES prodx_refunds(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refund_items_order_item_store_fk FOREIGN KEY (order_item_id, store_id) REFERENCES prodx_order_items(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refund_items_product_store_fk FOREIGN KEY (product_id, store_id) REFERENCES prodx_products(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refund_items_valid CHECK (quantity > 0 AND amount >= 0)
);

CREATE INDEX IF NOT EXISTS prodx_refunds_order_idx ON prodx_refunds(store_id, order_id, created_at);
CREATE INDEX IF NOT EXISTS prodx_refund_items_refund_idx ON prodx_refund_items(store_id, refund_id);

-- The refund ceiling is a financial invariant. Enforce it in PostgreSQL as well as
-- in the service so concurrent/direct SQL writers cannot exceed the order balance.
CREATE OR REPLACE FUNCTION prodx_enforce_refund_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$DECLARE
  order_total NUMERIC(12,2);
  refunded_total NUMERIC(12,2);
BEGIN
  SELECT grand_total_amount INTO order_total
  FROM prodx_orders
  WHERE id = NEW.order_id AND store_id = NEW.store_id
  FOR UPDATE;

  IF order_total IS NULL THEN
    RAISE EXCEPTION 'Refund order was not found in the target store' USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO refunded_total
  FROM prodx_refunds
  WHERE store_id = NEW.store_id
    AND order_id = NEW.order_id
    AND (TG_OP <> 'UPDATE' OR id <> OLD.id);

  IF refunded_total + NEW.amount > order_total THEN
    RAISE EXCEPTION 'Refund amount exceeds the remaining refundable order balance' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prodx_refund_balance_guard ON prodx_refunds;
CREATE TRIGGER prodx_refund_balance_guard
BEFORE INSERT OR UPDATE OF amount, order_id, store_id ON prodx_refunds
FOR EACH ROW EXECUTE FUNCTION prodx_enforce_refund_balance();

INSERT INTO prodx_schema_migrations(version) VALUES ('0012_m3_refund_core') ON CONFLICT(version) DO NOTHING;
