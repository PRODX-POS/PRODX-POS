-- PRODX POS M3.2 database-bound refund commit invariants
-- Refunds are committed only when their required payment, cash, audit, and
-- inventory effects are present in the same transaction.

ALTER TABLE prodx_refunds
  ADD COLUMN IF NOT EXISTS currency CHAR(3),
  ADD COLUMN IF NOT EXISTS result_status TEXT NOT NULL DEFAULT 'server_confirmed';

ALTER TABLE prodx_payments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'captured';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'prodx_payments_status_valid'
      AND t.relname = 'prodx_payments'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE prodx_payments
      ADD CONSTRAINT prodx_payments_status_valid
      CHECK (status IN ('pending', 'captured', 'settled', 'failed', 'voided'));
  END IF;
END $$;

UPDATE prodx_refunds r
SET currency = o.currency
FROM prodx_orders o
WHERE o.id = r.order_id
  AND o.store_id = r.store_id
  AND r.currency IS NULL;

ALTER TABLE prodx_refunds
  ALTER COLUMN currency SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'prodx_refunds_result_status_valid'
      AND t.relname = 'prodx_refunds'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE prodx_refunds
      ADD CONSTRAINT prodx_refunds_result_status_valid
      CHECK (result_status IN ('server_confirmed', 'refunded'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'prodx_refunds_committed_method_valid'
      AND t.relname = 'prodx_refunds'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE prodx_refunds
      ADD CONSTRAINT prodx_refunds_committed_method_valid
      CHECK (method = 'cash');
  END IF;
END $$;

ALTER TABLE prodx_cash_movements
  ADD COLUMN IF NOT EXISTS refund_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'prodx_cash_refund_store_fk'
      AND t.relname = 'prodx_cash_movements'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE prodx_cash_movements
      ADD CONSTRAINT prodx_cash_refund_store_fk
      FOREIGN KEY (refund_id, store_id)
      REFERENCES prodx_refunds(id, store_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS prodx_cash_one_refund_movement
  ON prodx_cash_movements(store_id, refund_id)
  WHERE refund_id IS NOT NULL;

CREATE OR REPLACE FUNCTION prodx_validate_refund_commit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order prodx_orders%ROWTYPE;
  v_payment_total NUMERIC(12,2);
  v_payment_currency_mismatches INTEGER;
  v_membership_count INTEGER;
  v_cash_count INTEGER;
  v_audit_count INTEGER;
BEGIN
  SELECT * INTO v_order
  FROM prodx_orders
  WHERE id = NEW.order_id AND store_id = NEW.store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund order was not found in the target store' USING ERRCODE = '23514';
  END IF;

  IF v_order.status NOT IN ('server_confirmed', 'refunded') THEN
    RAISE EXCEPTION 'Refund order is not in a refundable state' USING ERRCODE = '23514';
  END IF;

  IF v_order.currency <> NEW.currency THEN
    RAISE EXCEPTION 'Refund currency must match the order currency' USING ERRCODE = '23514';
  END IF;

  SELECT COUNT(*) INTO v_membership_count
  FROM prodx_store_memberships
  WHERE organization_id = NEW.organization_id
    AND store_id = NEW.store_id
    AND user_id = NEW.authorized_by_user_id
    AND active = TRUE;
  IF v_membership_count <> 1 THEN
    RAISE EXCEPTION 'Refund authorizer must be an active member of the target store' USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(SUM(amount), 0), COUNT(*) FILTER (WHERE currency <> v_order.currency)
    INTO v_payment_total, v_payment_currency_mismatches
  FROM prodx_payments
  WHERE store_id = NEW.store_id
    AND order_id = NEW.order_id
    AND status IN ('captured', 'settled');
  IF v_payment_currency_mismatches <> 0 OR v_payment_total < v_order.grand_total_amount THEN
    RAISE EXCEPTION 'Refund order does not have a fully captured payment balance' USING ERRCODE = '23514';
  END IF;

  SELECT COUNT(*) INTO v_cash_count
  FROM prodx_cash_movements
  WHERE refund_id = NEW.id
    AND store_id = NEW.store_id
    AND type = 'cash_refund'
    AND amount = NEW.amount
    AND currency = NEW.currency
    AND performed_by_user_id = NEW.authorized_by_user_id;
  IF v_cash_count <> 1 THEN
    RAISE EXCEPTION 'Refund must have exactly one matching cash movement' USING ERRCODE = '23514';
  END IF;

  SELECT COUNT(*) INTO v_audit_count
  FROM prodx_audit_log
  WHERE store_id = NEW.store_id
    AND user_id = NEW.authorized_by_user_id
    AND action = 'order_refund_committed'
    AND details ->> 'refundId' = NEW.id::TEXT;
  IF v_audit_count <> 1 THEN
    RAISE EXCEPTION 'Refund must have exactly one matching audit event' USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS prodx_refund_commit_invariant ON prodx_refunds;
CREATE CONSTRAINT TRIGGER prodx_refund_commit_invariant
AFTER INSERT OR UPDATE ON prodx_refunds
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION prodx_validate_refund_commit();

CREATE OR REPLACE FUNCTION prodx_validate_refund_item_effect()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ledger_quantity INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity_delta), 0)::INTEGER INTO v_ledger_quantity
  FROM prodx_inventory_ledger
  WHERE store_id = NEW.store_id
    AND product_id = NEW.product_id
    AND reference_id = NEW.refund_id
    AND reason = 'refund_restock';

  IF v_ledger_quantity <> (
    SELECT COALESCE(SUM(quantity), 0)::INTEGER
    FROM prodx_refund_items
    WHERE store_id = NEW.store_id
      AND refund_id = NEW.refund_id
      AND product_id = NEW.product_id
  ) THEN
    RAISE EXCEPTION 'Refund item inventory effect is missing or inconsistent' USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS prodx_refund_item_effect_invariant ON prodx_refund_items;
CREATE CONSTRAINT TRIGGER prodx_refund_item_effect_invariant
AFTER INSERT ON prodx_refund_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION prodx_validate_refund_item_effect();

INSERT INTO prodx_schema_migrations(version)
VALUES ('0014_m3_refund_commit_invariants')
ON CONFLICT(version) DO NOTHING;
