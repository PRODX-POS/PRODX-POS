-- PRODX POS M3.1 refund-item integrity hardening
-- Idempotent migration: every schema mutation is safe to replay.

ALTER TABLE prodx_refund_items
  ADD COLUMN IF NOT EXISTS order_id UUID;

UPDATE prodx_refund_items ri
SET order_id = r.order_id
FROM prodx_refunds r
WHERE r.id = ri.refund_id
  AND r.store_id = ri.store_id
  AND ri.order_id IS NULL;

ALTER TABLE prodx_refund_items
  ALTER COLUMN order_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'prodx_refunds_id_store_order_unique'
      AND t.relname = 'prodx_refunds' AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE prodx_refunds
      ADD CONSTRAINT prodx_refunds_id_store_order_unique UNIQUE (id, store_id, order_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'prodx_order_items_id_store_order_unique'
      AND t.relname = 'prodx_order_items' AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE prodx_order_items
      ADD CONSTRAINT prodx_order_items_id_store_order_unique UNIQUE (id, store_id, order_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'prodx_order_items_id_store_product_unique'
      AND t.relname = 'prodx_order_items' AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE prodx_order_items
      ADD CONSTRAINT prodx_order_items_id_store_product_unique UNIQUE (id, store_id, product_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'prodx_refund_items_refund_order_fk'
      AND t.relname = 'prodx_refund_items' AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE prodx_refund_items
      ADD CONSTRAINT prodx_refund_items_refund_order_fk
      FOREIGN KEY (refund_id, store_id, order_id)
      REFERENCES prodx_refunds(id, store_id, order_id)
      ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'prodx_refund_items_order_item_order_fk'
      AND t.relname = 'prodx_refund_items' AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE prodx_refund_items
      ADD CONSTRAINT prodx_refund_items_order_item_order_fk
      FOREIGN KEY (order_item_id, store_id, order_id)
      REFERENCES prodx_order_items(id, store_id, order_id)
      ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'prodx_refund_items_order_item_product_fk'
      AND t.relname = 'prodx_refund_items' AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE prodx_refund_items
      ADD CONSTRAINT prodx_refund_items_order_item_product_fk
      FOREIGN KEY (order_item_id, store_id, product_id)
      REFERENCES prodx_order_items(id, store_id, product_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION prodx_enforce_refund_item_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS 'DECLARE
  ordered_quantity INTEGER;
  previous_quantity INTEGER;
  cumulative_quantity INTEGER;
  line_total_cents BIGINT;
  expected_amount NUMERIC(12,2);
  refund_amount NUMERIC(12,2);
  previous_refund_item_amount NUMERIC(12,2);
BEGIN
  SELECT quantity INTO ordered_quantity
  FROM prodx_order_items
  WHERE id = NEW.order_item_id
    AND store_id = NEW.store_id
    AND order_id = NEW.order_id
  FOR UPDATE;

  IF ordered_quantity IS NULL THEN
    RAISE EXCEPTION ''Refund item order line was not found'' USING ERRCODE = ''23514'';
  END IF;

  SELECT COALESCE(SUM(quantity), 0)::INTEGER INTO previous_quantity
  FROM prodx_refund_items
  WHERE store_id = NEW.store_id
    AND order_id = NEW.order_id
    AND order_item_id = NEW.order_item_id;

  cumulative_quantity := previous_quantity + NEW.quantity;
  IF cumulative_quantity > ordered_quantity THEN
    RAISE EXCEPTION ''Refund item quantity exceeds the ordered quantity'' USING ERRCODE = ''23514'';
  END IF;

  SELECT ROUND(line_total_amount * 100)::BIGINT INTO line_total_cents
  FROM prodx_order_items
  WHERE id = NEW.order_item_id
    AND store_id = NEW.store_id
    AND order_id = NEW.order_id;

  -- Allocate whole cents by flooring cumulative allocations. This keeps every
  -- partial allocation deterministic while guaranteeing the final allocation
  -- reconciles exactly to the authoritative line total.
  expected_amount := (
    FLOOR(line_total_cents::NUMERIC * cumulative_quantity / ordered_quantity)
    - FLOOR(line_total_cents::NUMERIC * previous_quantity / ordered_quantity)
  ) / 100;

  IF NEW.amount <> expected_amount THEN
    RAISE EXCEPTION ''Refund item amount does not match the authoritative order-line allocation'' USING ERRCODE = ''23514'';
  END IF;

  SELECT amount INTO refund_amount
  FROM prodx_refunds
  WHERE id = NEW.refund_id AND store_id = NEW.store_id;
  SELECT COALESCE(SUM(amount), 0) INTO previous_refund_item_amount
  FROM prodx_refund_items
  WHERE refund_id = NEW.refund_id AND store_id = NEW.store_id;
  IF previous_refund_item_amount + NEW.amount > refund_amount THEN
    RAISE EXCEPTION ''Refund item allocations exceed the parent refund amount'' USING ERRCODE = ''23514'';
  END IF;

  RETURN NEW;
END;';

DROP TRIGGER IF EXISTS prodx_refund_item_allocation_guard ON prodx_refund_items;
CREATE TRIGGER prodx_refund_item_allocation_guard
BEFORE INSERT ON prodx_refund_items
FOR EACH ROW EXECUTE FUNCTION prodx_enforce_refund_item_allocation();

DROP TRIGGER IF EXISTS prodx_refund_item_immutable_guard ON prodx_refund_items;
CREATE TRIGGER prodx_refund_item_immutable_guard
BEFORE UPDATE OR DELETE ON prodx_refund_items
FOR EACH ROW EXECUTE FUNCTION prodx_enforce_refund_immutable();

INSERT INTO prodx_schema_migrations(version)
VALUES ('0013_m3_refund_item_integrity')
ON CONFLICT(version) DO NOTHING;
