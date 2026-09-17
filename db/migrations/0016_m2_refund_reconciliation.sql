-- PRODX POS M2 refund reconciliation hardening
-- Reconcile the complete refund only after all refund-item rows exist,
-- and make refund ledgers append-only so the invariant cannot be bypassed by mutation.

CREATE OR REPLACE FUNCTION prodx_reject_refund_adjustment_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'refund/void adjustments are append-only' USING ERRCODE='55000';
END $$;

DROP TRIGGER IF EXISTS prodx_refund_adjustment_append_only_trigger ON prodx_order_adjustments;
CREATE TRIGGER prodx_refund_adjustment_append_only_trigger
  BEFORE UPDATE OR DELETE ON prodx_order_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION prodx_reject_refund_adjustment_mutation();

CREATE OR REPLACE FUNCTION prodx_reject_refund_item_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'refund items are append-only' USING ERRCODE='55000';
END $$;

DROP TRIGGER IF EXISTS prodx_refund_item_append_only_trigger ON prodx_refund_items;
CREATE TRIGGER prodx_refund_item_append_only_trigger
  BEFORE UPDATE OR DELETE ON prodx_refund_items
  FOR EACH ROW
  EXECUTE FUNCTION prodx_reject_refund_item_mutation();

CREATE OR REPLACE FUNCTION prodx_validate_refund_adjustment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_order prodx_orders%ROWTYPE;
  v_refunded NUMERIC(12,2);
  v_paid NUMERIC(12,2);
  v_expected NUMERIC(12,2);
BEGIN
  SELECT * INTO v_order
    FROM prodx_orders
    WHERE id=NEW.order_id AND store_id=NEW.store_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found in store' USING ERRCODE='23503';
  END IF;

  IF NEW.action='void' THEN
    IF NEW.amount <> v_order.grand_total_amount THEN
      RAISE EXCEPTION 'void amount must equal order grand total' USING ERRCODE='23514';
    END IF;
    IF EXISTS (
      SELECT 1 FROM prodx_order_adjustments
      WHERE order_id=NEW.order_id AND store_id=NEW.store_id AND action='refund'
    ) THEN
      RAISE EXCEPTION 'cannot void an order with prior refunds' USING ERRCODE='23514';
    END IF;
  ELSE
    SELECT COALESCE(SUM(amount),0) INTO v_refunded
      FROM prodx_order_adjustments
      WHERE order_id=NEW.order_id AND store_id=NEW.store_id AND action='refund' AND id<>NEW.id;
    SELECT COALESCE(SUM(amount),0) INTO v_paid
      FROM prodx_payments
      WHERE order_id=NEW.order_id AND store_id=NEW.store_id;

    IF v_refunded + NEW.amount > v_order.grand_total_amount THEN
      RAISE EXCEPTION 'cumulative refund exceeds order grand total' USING ERRCODE='23514';
    END IF;
    IF v_refunded + NEW.amount > v_paid THEN
      RAISE EXCEPTION 'cumulative refund exceeds captured payment amount' USING ERRCODE='23514';
    END IF;

    SELECT COALESCE(SUM(ROUND(oi.line_total_amount * ri.quantity / oi.quantity, 2)),0)
      INTO v_expected
      FROM prodx_refund_items ri
      JOIN prodx_order_items oi
        ON oi.order_id=ri.order_id
       AND oi.store_id=ri.store_id
       AND oi.product_id=ri.product_id
      WHERE ri.adjustment_id=NEW.id
        AND ri.store_id=NEW.store_id;

    IF v_expected <> NEW.amount THEN
      RAISE EXCEPTION 'refund amount must reconcile exactly to the value of all restocked order items' USING ERRCODE='23514';
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
  SELECT * INTO v_adjustment
    FROM prodx_order_adjustments
    WHERE id=NEW.adjustment_id AND store_id=NEW.store_id;
  IF NOT FOUND OR v_adjustment.action <> 'refund' THEN
    RAISE EXCEPTION 'refund item requires a refund adjustment' USING ERRCODE='23514';
  END IF;

  SELECT quantity INTO v_sold
    FROM prodx_order_items
    WHERE order_id=NEW.order_id AND store_id=NEW.store_id AND product_id=NEW.product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'refund item is not present on original order' USING ERRCODE='23514';
  END IF;

  SELECT COALESCE(SUM(quantity),0) INTO v_restocked
    FROM prodx_refund_items ri
    JOIN prodx_order_adjustments a
      ON a.id=ri.adjustment_id AND a.store_id=ri.store_id
    WHERE ri.order_id=NEW.order_id
      AND ri.store_id=NEW.store_id
      AND ri.product_id=NEW.product_id
      AND a.action='refund'
      AND ri.id<>NEW.id;

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
VALUES ('0016_m2_refund_reconciliation') ON CONFLICT(version) DO NOTHING;
