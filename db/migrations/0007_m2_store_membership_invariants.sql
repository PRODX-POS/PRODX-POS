-- PRODX POS M2 tenancy hardening
-- Enforce that operational actors are members of the store they affect.
-- Kept as a separate idempotent migration so existing M2 deployments can adopt the invariant safely.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prodx_shifts_cashier_store_membership_fk') THEN
    ALTER TABLE prodx_shifts
      ADD CONSTRAINT prodx_shifts_cashier_store_membership_fk
      FOREIGN KEY (organization_id, store_id, cashier_id)
      REFERENCES prodx_store_memberships (organization_id, store_id, user_id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prodx_orders_cashier_store_membership_fk') THEN
    ALTER TABLE prodx_orders
      ADD CONSTRAINT prodx_orders_cashier_store_membership_fk
      FOREIGN KEY (organization_id, store_id, cashier_id)
      REFERENCES prodx_store_memberships (organization_id, store_id, user_id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prodx_inventory_user_store_membership_fk') THEN
    ALTER TABLE prodx_inventory_ledger
      ADD CONSTRAINT prodx_inventory_user_store_membership_fk
      FOREIGN KEY (organization_id, store_id, performed_by_user_id)
      REFERENCES prodx_store_memberships (organization_id, store_id, user_id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prodx_audit_user_store_membership_fk') THEN
    ALTER TABLE prodx_audit_log
      ADD CONSTRAINT prodx_audit_user_store_membership_fk
      FOREIGN KEY (organization_id, store_id, user_id)
      REFERENCES prodx_store_memberships (organization_id, store_id, user_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

INSERT INTO prodx_schema_migrations (version)
VALUES ('0007_m2_store_membership_invariants')
ON CONFLICT (version) DO NOTHING;
