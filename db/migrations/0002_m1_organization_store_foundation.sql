-- PRODX POS M1 domain persistence foundation
-- Gate C: organization/store tenancy only.
-- No authentication, RBAC, inventory, sales, payment, or cash state belongs here.

CREATE TABLE IF NOT EXISTS prodx_organizations (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_organizations_code_not_blank CHECK (length(btrim(code)) > 0),
  CONSTRAINT prodx_organizations_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT prodx_organizations_code_unique UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS prodx_stores (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  business_timezone TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_stores_code_not_blank CHECK (length(btrim(code)) > 0),
  CONSTRAINT prodx_stores_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT prodx_stores_timezone_not_blank CHECK (length(btrim(business_timezone)) > 0),
  CONSTRAINT prodx_stores_org_code_unique UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS prodx_stores_organization_id_idx
  ON prodx_stores (organization_id);

CREATE INDEX IF NOT EXISTS prodx_stores_organization_active_idx
  ON prodx_stores (organization_id, active);
