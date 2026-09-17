-- M2 authentication contract convergence: bind a physical register to a provisioned device.
-- The register identifier is tenant/store scoped and never trusted as a device UUID.

ALTER TABLE prodx_devices
  ADD COLUMN IF NOT EXISTS register_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prodx_devices_register_id_not_blank'
  ) THEN
    ALTER TABLE prodx_devices
      ADD CONSTRAINT prodx_devices_register_id_not_blank
      CHECK (register_id IS NULL OR length(btrim(register_id)) > 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS prodx_devices_org_store_register_unique
  ON prodx_devices (organization_id, store_id, register_id)
  WHERE register_id IS NOT NULL;

INSERT INTO prodx_schema_migrations (version)
VALUES ('0013_m2_device_register_binding')
ON CONFLICT (version) DO NOTHING;
