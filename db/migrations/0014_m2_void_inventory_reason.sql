-- PRODX POS M2 void inventory compensation reason
-- Keep void restock distinguishable from customer refund restock for auditability.

ALTER TABLE prodx_inventory_ledger
  DROP CONSTRAINT IF EXISTS prodx_inventory_reason_valid;

ALTER TABLE prodx_inventory_ledger
  ADD CONSTRAINT prodx_inventory_reason_valid CHECK (
    reason IN (
      'sale_deduction',
      'refund_restock',
      'void_restock',
      'purchase_received',
      'transfer_in',
      'transfer_out',
      'audit_count_adjustment',
      'damaged_write_off'
    )
  );

INSERT INTO prodx_schema_migrations(version)
VALUES ('0014_m2_void_inventory_reason')
ON CONFLICT(version) DO NOTHING;
