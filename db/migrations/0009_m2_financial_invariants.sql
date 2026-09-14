-- Deferred database invariants validate the complete financial effect at transaction commit.
CREATE OR REPLACE FUNCTION prodx_validate_order_financial_invariants(p_order_id UUID)
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_order prodx_orders%ROWTYPE;
  v_item_total NUMERIC(12,2);
  v_payment_total NUMERIC(12,2);
  v_item_count INTEGER;
BEGIN
  SELECT * INTO v_order FROM prodx_orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(SUM(line_total_amount),0), COALESCE(SUM(quantity),0)
    INTO v_item_total, v_item_count
    FROM prodx_order_items WHERE order_id = p_order_id;
  IF v_item_count <> v_order.total_items_count OR v_item_total <> v_order.grand_total_amount THEN
    RAISE EXCEPTION 'order financial invariant violated for %', p_order_id USING ERRCODE='23514';
  END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_payment_total
    FROM prodx_payments WHERE order_id = p_order_id;
  IF v_payment_total <> v_order.grand_total_amount THEN
    RAISE EXCEPTION 'order payment invariant violated for %', p_order_id USING ERRCODE='23514';
  END IF;

  IF v_order.net_subtotal_amount + v_order.total_tax_amount <> v_order.grand_total_amount THEN
    RAISE EXCEPTION 'order tax/subtotal invariant violated for %', p_order_id USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION prodx_validate_payment_currency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE v_currency CHAR(3);
BEGIN
  SELECT currency INTO v_currency FROM prodx_orders WHERE id = NEW.order_id AND store_id = NEW.store_id;
  IF v_currency IS NULL OR NEW.currency <> v_currency THEN
    RAISE EXCEPTION 'payment currency must match order currency' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prodx_order_financial_invariants ON prodx_orders;
CREATE CONSTRAINT TRIGGER prodx_order_financial_invariants
AFTER INSERT OR UPDATE ON prodx_orders
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION prodx_validate_order_financial_invariants(id);

DROP TRIGGER IF EXISTS prodx_order_item_financial_invariants ON prodx_order_items;
CREATE CONSTRAINT TRIGGER prodx_order_item_financial_invariants
AFTER INSERT OR UPDATE OR DELETE ON prodx_order_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION prodx_validate_order_financial_invariants(COALESCE(NEW.order_id, OLD.order_id));

DROP TRIGGER IF EXISTS prodx_payment_financial_invariants ON prodx_payments;
CREATE CONSTRAINT TRIGGER prodx_payment_financial_invariants
AFTER INSERT OR UPDATE OR DELETE ON prodx_payments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION prodx_validate_order_financial_invariants(COALESCE(NEW.order_id, OLD.order_id));

DROP TRIGGER IF EXISTS prodx_payment_currency_invariant ON prodx_payments;
CREATE TRIGGER prodx_payment_currency_invariant
BEFORE INSERT OR UPDATE ON prodx_payments
FOR EACH ROW EXECUTE FUNCTION prodx_validate_payment_currency();

INSERT INTO prodx_schema_migrations(version) VALUES ('0009_m2_financial_invariants') ON CONFLICT(version) DO NOTHING;
