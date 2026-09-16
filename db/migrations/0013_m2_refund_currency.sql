-- PRODX POS M2 refund currency persistence
-- Currency is part of refund idempotency semantics and must be persisted with the adjustment.

ALTER TABLE prodx_order_adjustments
  ADD COLUMN IF NOT EXISTS currency TEXT;

UPDATE prodx_order_adjustments a
SET currency = o.currency
FROM prodx_orders o
WHERE a.order_id = o.id
  AND a.store_id = o.store_id
  AND a.currency IS NULL;

ALTER TABLE prodx_order_adjustments
  ALTER COLUMN currency SET NOT NULL;

ALTER TABLE prodx_order_adjustments
  DROP CONSTRAINT IF EXISTS prodx_adjustments_currency_valid;

ALTER TABLE prodx_order_adjustments
  ADD CONSTRAINT prodx_adjustments_currency_valid CHECK (currency = upper(currency) AND length(btrim(currency)) = 3);

CREATE OR REPLACE FUNCTION prodx_validate_refund_adjustment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_order prodx_orders%ROWTYPE;
  v_refunded NUMERIC(12,2);
BEGIN
  SELECT * INTO v_order FROM prodx_orders WHERE id=NEW.order_id AND store_id=NEW.store_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found in store' USING ERRCODE='23503'; END IF;
  IF NEW.currency <> v_order.currency THEN
    RAISE EXCEPTION 'adjustment currency must match order currency' USING ERRCODE='23514';
  END IF;
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

INSERT INTO prodx_schema_migrations(version)
VALUES ('0013_m2_refund_currency') ON CONFLICT(version) DO NOTHING;
