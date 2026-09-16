-- PRODX POS M2 refund/void transaction ledger
-- Refunds and voids are explicit compensating transactions. Original order items/payments are never deleted.

CREATE TABLE IF NOT EXISTS prodx_order_adjustments (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  order_id UUID NOT NULL,
  action TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  refund_method TEXT,
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  authorized_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_adjustments_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_adjustments_order_store_fk FOREIGN KEY (order_id, store_id) REFERENCES prodx_orders(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_adjustments_user_org_fk FOREIGN KEY (authorized_by_user_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_adjustments_user_store_membership_fk FOREIGN KEY (organization_id, store_id, authorized_by_user_id) REFERENCES prodx_store_memberships(organization_id, store_id, user_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_adjustments_action_valid CHECK (action IN ('refund','void')),
  CONSTRAINT prodx_adjustments_amount_valid CHECK (amount > 0),
  CONSTRAINT prodx_adjustments_refund_method_valid CHECK ((action='refund' AND refund_method IN ('cash','card','qr_digital')) OR (action='void' AND refund_method IS NULL)),
  CONSTRAINT prodx_adjustments_reason_valid CHECK (length(btrim(reason)) > 0),
  CONSTRAINT prodx_adjustments_key_valid CHECK (length(btrim(idempotency_key)) > 0),
  CONSTRAINT prodx_adjustments_id_store_unique UNIQUE (id, store_id),
  CONSTRAINT prodx_adjustments_store_idempotency_unique UNIQUE (store_id, idempotency_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS prodx_order_one_void_idx
  ON prodx_order_adjustments(store_id, order_id) WHERE action='void';
CREATE INDEX IF NOT EXISTS prodx_order_adjustments_order_idx
  ON prodx_order_adjustments(store_id, order_id, created_at);

CREATE TABLE IF NOT EXISTS prodx_refund_items (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  adjustment_id UUID NOT NULL,
  order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_refund_items_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refund_items_adjustment_store_fk FOREIGN KEY (adjustment_id, store_id) REFERENCES prodx_order_adjustments(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refund_items_order_store_fk FOREIGN KEY (order_id, store_id) REFERENCES prodx_orders(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refund_items_product_store_fk FOREIGN KEY (product_id, store_id) REFERENCES prodx_products(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_refund_items_quantity_valid CHECK (quantity > 0),
  CONSTRAINT prodx_refund_items_id_store_unique UNIQUE (id, store_id)
);
CREATE INDEX IF NOT EXISTS prodx_refund_items_order_product_idx
  ON prodx_refund_items(store_id, order_id, product_id);

CREATE OR REPLACE FUNCTION prodx_validate_refund_adjustment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_order prodx_orders%ROWTYPE;
  v_refunded NUMERIC(12,2);
BEGIN
  SELECT * INTO v_order FROM prodx_orders WHERE id=NEW.order_id AND store_id=NEW.store_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found in store' USING ERRCODE='23503'; END IF;
  IF NEW.action='void' THEN
    IF NEW.amount <> v_order.grand_total_amount THEN RAISE EXCEPTION 'void amount must equal order grand total' USING ERRCODE='23514'; END IF;
    IF EXISTS (SELECT 1 FROM prodx_order_adjustments WHERE order_id=NEW.order_id AND store_id=NEW.store_id AND action='refund') THEN
      RAISE EXCEPTION 'cannot void an order with prior refunds' USING ERRCODE='23514';
    END IF;
  ELSE
    SELECT COALESCE(SUM(amount),0) INTO v_refunded
      FROM prodx_order_adjustments
      WHERE order_id=NEW.order_id AND store_id=NEW.store_id AND action='refund' AND id<>NEW.id;
    IF v_refunded + NEW.amount > v_order.grand_total_amount THEN
      RAISE EXCEPTION 'cumulative refund exceeds order grand total' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS prodx_validate_refund_adjustment_trigger ON prodx_order_adjustments;
CREATE CONSTRAINT TRIGGER prodx_validate_refund_adjustment_trigger
  AFTER INSERT OR UPDATE ON prodx_order_adjustments
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  EXECUTE FUNCTION prodx_validate_refund_adjustment();

CREATE OR REPLACE FUNCTION prodx_validate_refund_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_sold INTEGER;
  v_restocked INTEGER;
  v_adjustment prodx_order_adjustments%ROWTYPE;
BEGIN
  SELECT * INTO v_adjustment FROM prodx_order_adjustments WHERE id=NEW.adjustment_id AND store_id=NEW.store_id;
  IF NOT FOUND OR v_adjustment.action <> 'refund' THEN RAISE EXCEPTION 'refund item requires a refund adjustment' USING ERRCODE='23514'; END IF;
  SELECT quantity INTO v_sold FROM prodx_order_items WHERE order_id=NEW.order_id AND store_id=NEW.store_id AND product_id=NEW.product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'refund item is not present on original order' USING ERRCODE='23514'; END IF;
  SELECT COALESCE(SUM(quantity),0) INTO v_restocked
    FROM prodx_refund_items ri
    JOIN prodx_order_adjustments a ON a.id=ri.adjustment_id AND a.store_id=ri.store_id
    WHERE ri.order_id=NEW.order_id AND ri.store_id=NEW.store_id AND ri.product_id=NEW.product_id AND a.action='refund' AND ri.id<>NEW.id;
  IF v_restocked + NEW.quantity > v_sold THEN
    RAISE EXCEPTION 'cumulative restock exceeds sold quantity' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS prodx_validate_refund_item_trigger ON prodx_refund_items;
CREATE CONSTRAINT TRIGGER prodx_validate_refund_item_trigger
  AFTER INSERT OR UPDATE ON prodx_refund_items
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  EXECUTE FUNCTION prodx_validate_refund_item();

INSERT INTO prodx_schema_migrations(version)
VALUES ('0012_m2_refund_void_transactions') ON CONFLICT(version) DO NOTHING;
