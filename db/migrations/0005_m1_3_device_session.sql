-- PRODX POS M1.3 device and session persistence
-- Gate C slice: store-scoped devices and server-side session state.
-- Tokens/secrets are never stored in plaintext; only hashes belong here.

ALTER TABLE prodx_devices
  ADD CONSTRAINT prodx_devices_id_organization_unique UNIQUE (id, organization_id);

CREATE TABLE IF NOT EXISTS prodx_devices (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  device_key TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_devices_key_not_blank CHECK (length(btrim(device_key)) > 0),
  CONSTRAINT prodx_devices_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT prodx_devices_status_valid CHECK (status IN ('active', 'disabled')),
  CONSTRAINT prodx_devices_org_key_unique UNIQUE (organization_id, device_key),
  CONSTRAINT prodx_devices_id_organization_unique UNIQUE (id, organization_id),
  CONSTRAINT prodx_devices_store_org_fk
    FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS prodx_devices_store_status_idx
  ON prodx_devices (organization_id, store_id, status);

CREATE TABLE IF NOT EXISTS prodx_sessions (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL,
  device_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  CONSTRAINT prodx_sessions_token_hash_not_blank CHECK (length(btrim(token_hash)) > 0),
  CONSTRAINT prodx_sessions_expiry_after_issue CHECK (expires_at > issued_at),
  CONSTRAINT prodx_sessions_revoked_at_valid CHECK (revoked_at IS NULL OR revoked_at >= issued_at),
  CONSTRAINT prodx_sessions_user_org_fk
    FOREIGN KEY (user_id, organization_id)
    REFERENCES prodx_users(id, organization_id)
    ON DELETE CASCADE,
  CONSTRAINT prodx_sessions_device_org_fk
    FOREIGN KEY (device_id, organization_id)
    REFERENCES prodx_devices(id, organization_id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS prodx_sessions_token_hash_unique
  ON prodx_sessions (token_hash);

CREATE INDEX IF NOT EXISTS prodx_sessions_user_active_idx
  ON prodx_sessions (organization_id, user_id, expires_at, revoked_at);

CREATE INDEX IF NOT EXISTS prodx_sessions_device_idx
  ON prodx_sessions (organization_id, device_id, expires_at);

INSERT INTO prodx_schema_migrations (version)
VALUES ('0005_m1_3_device_session')
ON CONFLICT (version) DO NOTHING;
