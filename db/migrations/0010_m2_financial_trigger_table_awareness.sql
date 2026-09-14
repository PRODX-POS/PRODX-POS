-- Root-cause fix: orders use NEW/OLD.id while child tables use NEW/OLD.order_id.
CREATE OR REPLACE FUNCTION prodx_validate_order_financial_invariants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id UUID;
  v_order prodx_orders%ROWTYPE;
  v_item_total NUMERIC(12,2);
  v_payment_total NUMERIC(12,2);
  v_item_count INTEGER;
BEGIN
  IF TG_TABLE_NAME = 'prodx_orders' THEN
    v_order_id := CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END;
  ELSE
    v_order_id := CASE WHEN TG_OP='DELETE' THEN OLD.order_id ELSE NEW.order_id END;
  END IF;
  SELECT * INTO v_order FROM prodx_orders WHERE id=v_order_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT COALESCE(SUM(line_total_amount),0),COALESCE(SUM(quantity),0) INTO v_item_total,v_item_count FROM prodx_order_items WHERE order_id=v_order_id;
  IF v_item_count<>v_order.total_items_count OR v_item_total<>v_order.grand_total_amount THEN RAISE EXCEPTION 'order financial invariant violated for %',v_order_id USING ERRCODE='23514'; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_payment_total FROM prodx_payments WHERE order_id=v_order_id;
  IF v_payment_total<>v_order.grand_total_amount THEN RAISE EXCEPTION 'order payment invariant violated for %',v_order_id USING ERRCODE='23514'; END IF;
  IF v_order.net_subtotal_amount+v_order.total_tax_amount<>v_order.grand_total_amount THEN RAISE EXCEPTION 'order tax/subtotal invariant violated for %',v_order_id USING ERRCODE='23514'; END IF;
  RETURN NULL;
END;
$$;
INSERT INTO prodx_schema_migrations(version) VALUES ('0010_m2_financial_trigger_table_awareness') ON CONFLICT(version) DO NOTHING;
