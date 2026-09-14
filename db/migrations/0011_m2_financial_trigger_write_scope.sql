-- Root-cause fix: DELETE is not a valid representation of refund/void semantics.
-- Refund/void will use explicit compensating transactions; current checkout invariants validate inserts/updates only.
DROP TRIGGER IF EXISTS prodx_order_item_financial_invariants ON prodx_order_items;
CREATE CONSTRAINT TRIGGER prodx_order_item_financial_invariants AFTER INSERT OR UPDATE ON prodx_order_items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION prodx_validate_order_financial_invariants();
DROP TRIGGER IF EXISTS prodx_payment_financial_invariants ON prodx_payments;
CREATE CONSTRAINT TRIGGER prodx_payment_financial_invariants AFTER INSERT OR UPDATE ON prodx_payments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION prodx_validate_order_financial_invariants();
INSERT INTO prodx_schema_migrations(version) VALUES ('0011_m2_financial_trigger_write_scope') ON CONFLICT(version) DO NOTHING;
