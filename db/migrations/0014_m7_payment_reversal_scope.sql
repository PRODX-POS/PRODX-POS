-- M7 hardening: payment reversals must reference the exact payment and void order scope.
-- A payment reversal is a full void reversal event, so its amount/method must equal the source payment.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prodx_payments_id_store_order_unique'
  ) THEN
    ALTER TABLE prodx_payments
      ADD CONSTRAINT prodx_payments_id_store_order_unique UNIQUE (id, store_id, order_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prodx_voids_id_store_order_unique'
  ) THEN
    ALTER TABLE prodx_voids
      ADD CONSTRAINT prodx_voids_id_store_order_unique UNIQUE (id, store_id, order_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prodx_payment_reversals_payment_fk'
  ) THEN
    ALTER TABLE prodx_payment_reversals
      DROP CONSTRAINT prodx_payment_reversals_payment_fk;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prodx_payment_reversals_payment_scope_fk'
  ) THEN
    ALTER TABLE prodx_payment_reversals
      ADD CONSTRAINT prodx_payment_reversals_payment_scope_fk
      FOREIGN KEY (payment_id, store_id, order_id)
      REFERENCES prodx_payments(id, store_id, order_id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prodx_payment_reversals_void_scope_fk'
  ) THEN
    ALTER TABLE prodx_payment_reversals
      ADD CONSTRAINT prodx_payment_reversals_void_scope_fk
      FOREIGN KEY (void_id, store_id, order_id)
      REFERENCES prodx_voids(id, store_id, order_id)
      ON DELETE RESTRICT;
  END IF;
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
  SELECT * INTO v_payment
    FROM prodx_payments
   WHERE id = NEW.payment_id
     AND store_id = NEW.store_id
     AND order_id = NEW.order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment reversal payment scope is inconsistent' USING ERRCODE='23503';
  END IF;

  IF NEW.amount <> v_payment.amount THEN
    RAISE EXCEPTION 'payment reversal amount must equal captured payment' USING ERRCODE='23514';
  END IF;

  IF NEW.method <> v_payment.method THEN
    RAISE EXCEPTION 'payment reversal method must equal captured payment method' USING ERRCODE='23514';
  END IF;

  SELECT COALESCE(SUM(amount), 0)
    INTO v_reversed
    FROM prodx_payment_reversals
   WHERE payment_id = NEW.payment_id;

  IF v_reversed > v_payment.amount THEN
    RAISE EXCEPTION 'payment reversal exceeds captured payment' USING ERRCODE='23514';
  END IF;

  RETURN NEW;
END;
$$;

INSERT INTO prodx_schema_migrations(version)
VALUES ('0014_m7_payment_reversal_scope')
ON CONFLICT (version) DO NOTHING;
