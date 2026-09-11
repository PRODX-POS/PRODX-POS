-- PRODX POS M1.1 authentication identity persistence
-- Gate C slice: user identity and credential-hash state only.
-- No roles, permissions, sessions, devices, business transactions, or plaintext credentials belong here.

CREATE TABLE IF NOT EXISTS prodx_users (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_users_username_not_blank CHECK (length(btrim(username)) > 0),
  CONSTRAINT prodx_users_display_name_not_blank CHECK (length(btrim(display_name)) > 0),
  CONSTRAINT prodx_users_status_valid CHECK (status IN ('active', 'disabled')),
  CONSTRAINT prodx_users_org_username_unique UNIQUE (organization_id, username)
);

CREATE INDEX IF NOT EXISTS prodx_users_organization_id_idx
  ON prodx_users (organization_id);

CREATE INDEX IF NOT EXISTS prodx_users_organization_status_idx
  ON prodx_users (organization_id, status);

CREATE TABLE IF NOT EXISTS prodx_user_credentials (
  user_id UUID PRIMARY KEY REFERENCES prodx_users(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_authenticated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_user_credentials_type_valid CHECK (credential_type IN ('password')),
  CONSTRAINT prodx_user_credentials_hash_not_blank CHECK (length(btrim(secret_hash)) > 0),
  CONSTRAINT prodx_user_credentials_failed_attempts_nonnegative CHECK (failed_attempts >= 0)
);

INSERT INTO prodx_schema_migrations (version)
VALUES ('0003_m1_1_auth_identity')
ON CONFLICT (version) DO NOTHING;
