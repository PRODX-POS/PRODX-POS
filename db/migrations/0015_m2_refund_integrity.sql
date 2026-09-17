-- PRODX POS M2 refund integrity hardening
-- Bind refund replay to the complete request and reconcile restocked item value.

ALTER TABLE prodx_order_adjustments
  ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;

ALTER TABLE prodx_order_adjustments
  ADD CONSTRAINT prodx_adjustments_request_fingerprint_valid
  CHECK (request_fingerprint IS NULL OR length(btrim(request_fingerprint)) = 64);

CREATE OR REPLACE FUNCTION prodx_validate_refund_adjustment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_order prodx_orders%ROWTYPE;
  v_refunded NUMERIC(12,2);
  v_paid NUMERIC(12,2);
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
    SELECT COALESCE(SUM(amount),0) INTO v_paid
      FROM prodx_payments
      WHERE order_id=NEW.order_id AND store_id=NEW.store_id;
    IF v_refunded + NEW.amount > v_order.grand_total_amount THEN
      RAISE EXCEPTION 'cumulative refund exceeds order grand total' USING ERRCODE='23514';
    END IF;
    IF v_refunded + NEW.amount > v_paid THEN
      RAISE EXCEPTION 'cumulative refund exceeds captured payment amount' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION prodx_validate_refund_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_sold INTEGER;
  v_restocked INTEGER;
  v_adjustment prodx_order_adjustments%ROWTYPE;
  v_expected NUMERIC(12,2);
  v_selected NUMERIC(12,2);
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

  SELECT ROUND(oi.line_total_amount * NEW.quantity / oi.quantity, 2)
    INTO v_selected
    FROM prodx_order_items oi
    WHERE oi.order_id=NEW.order_id AND oi.store_id=NEW.store_id AND oi.product_id=NEW.product_id;

  SELECT COALESCE(SUM(ROUND(oi.line_total_amount * ri.quantity / oi.quantity, 2)),0)
    INTO v_expected
    FROM prodx_refund_items ri
    JOIN prodx_order_adjustments a ON a.id=ri.adjustment_id AND a.store_id=ri.store_id
    JOIN prodx_order_items oi ON oi.order_id=ri.order_id AND oi.store_id=ri.store_id AND oi.product_id=ri.product_id
    WHERE ri.adjustment_id=NEW.adjustment_id;

  v_expected := v_expected + v_selected;
  IF v_expected <> v_adjustment.amount THEN
    RAISE EXCEPTION 'refund amount must reconcile exactly to the value of restocked order items' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

INSERT INTO prodx_schema_migrations(version)
VALUES ('0015_m2_refund_integrity') ON CONFLICT(version) DO NOTHING;
