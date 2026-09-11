-- PRODX POS M1.2 RBAC persistence
-- Gate C slice: organization-scoped roles, canonical permissions, store membership,
-- and explicitly scoped user-role assignments.
-- No sessions, devices, business transactions, or authentication secrets belong here.

-- Organization.id is already a primary key. Add only the composite keys required
-- for PostgreSQL to enforce organization tenancy across joins, and do so idempotently.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prodx_users_id_organization_unique'
  ) THEN
    ALTER TABLE prodx_users
      ADD CONSTRAINT prodx_users_id_organization_unique UNIQUE (id, organization_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prodx_stores_id_organization_unique'
  ) THEN
    ALTER TABLE prodx_stores
      ADD CONSTRAINT prodx_stores_id_organization_unique UNIQUE (id, organization_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS prodx_permissions (
  id UUID PRIMARY KEY,
  permission_key TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_permissions_key_not_blank CHECK (length(btrim(permission_key)) > 0),
  CONSTRAINT prodx_permissions_description_not_blank CHECK (length(btrim(description)) > 0),
  CONSTRAINT prodx_permissions_key_unique UNIQUE (permission_key)
);

CREATE TABLE IF NOT EXISTS prodx_roles (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  role_key TEXT NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_roles_key_not_blank CHECK (length(btrim(role_key)) > 0),
  CONSTRAINT prodx_roles_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT prodx_roles_key_unique UNIQUE (organization_id, role_key),
  CONSTRAINT prodx_roles_id_organization_unique UNIQUE (id, organization_id)
);

CREATE INDEX IF NOT EXISTS prodx_roles_organization_active_idx
  ON prodx_roles (organization_id, active);

CREATE TABLE IF NOT EXISTS prodx_role_permissions (
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL REFERENCES prodx_permissions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, role_id, permission_id),
  CONSTRAINT prodx_role_permissions_role_org_fk
    FOREIGN KEY (role_id, organization_id)
    REFERENCES prodx_roles(id, organization_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS prodx_role_permissions_permission_idx
  ON prodx_role_permissions (permission_id);

CREATE TABLE IF NOT EXISTS prodx_store_memberships (
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  user_id UUID NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, store_id, user_id),
  CONSTRAINT prodx_store_memberships_store_org_fk
    FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id)
    ON DELETE RESTRICT,
  CONSTRAINT prodx_store_memberships_user_org_fk
    FOREIGN KEY (user_id, organization_id)
    REFERENCES prodx_users(id, organization_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS prodx_store_memberships_user_idx
  ON prodx_store_memberships (organization_id, user_id, active);

CREATE TABLE IF NOT EXISTS prodx_user_roles (
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  store_id UUID NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, user_id, role_id, store_id),
  CONSTRAINT prodx_user_roles_user_org_fk
    FOREIGN KEY (user_id, organization_id)
    REFERENCES prodx_users(id, organization_id)
    ON DELETE CASCADE,
  CONSTRAINT prodx_user_roles_role_org_fk
    FOREIGN KEY (role_id, organization_id)
    REFERENCES prodx_roles(id, organization_id)
    ON DELETE CASCADE,
  CONSTRAINT prodx_user_roles_store_org_fk
    FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id)
    ON DELETE RESTRICT,
  CONSTRAINT prodx_user_roles_store_membership_fk
    FOREIGN KEY (organization_id, store_id, user_id)
    REFERENCES prodx_store_memberships(organization_id, store_id, user_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS prodx_user_roles_user_scope_idx
  ON prodx_user_roles (organization_id, user_id, store_id, active);

-- Canonical application permissions. Tenant-owned roles decide which permissions are granted.
INSERT INTO prodx_permissions (id, permission_key, description)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'dashboard.read', 'View operational dashboard'),
  ('10000000-0000-4000-8000-000000000002', 'catalog.read', 'View catalog data'),
  ('10000000-0000-4000-8000-000000000003', 'catalog.write', 'Create and update catalog data'),
  ('10000000-0000-4000-8000-000000000004', 'inventory.read', 'View inventory state'),
  ('10000000-0000-4000-8000-000000000005', 'inventory.adjust', 'Adjust inventory quantities'),
  ('10000000-0000-4000-8000-000000000006', 'pos.sell', 'Create POS sales'),
  ('10000000-0000-4000-8000-000000000007', 'pos.void', 'Void eligible sales'),
  ('10000000-0000-4000-8000-000000000008', 'pos.refund', 'Process eligible refunds'),
  ('10000000-0000-4000-8000-000000000009', 'payment.capture', 'Capture sale payments'),
  ('10000000-0000-4000-8000-000000000010', 'cash.shift.open', 'Open cashier shifts'),
  ('10000000-0000-4000-8000-000000000011', 'cash.shift.close', 'Close cashier shifts'),
  ('10000000-0000-4000-8000-000000000012', 'reports.read', 'View operational reports'),
  ('10000000-0000-4000-8000-000000000013', 'users.read', 'View organization users'),
  ('10000000-0000-4000-8000-000000000014', 'users.manage', 'Manage organization users'),
  ('10000000-0000-4000-8000-000000000015', 'rbac.manage', 'Manage roles and permissions')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO prodx_schema_migrations (version)
VALUES ('0004_m1_2_rbac')
ON CONFLICT (version) DO NOTHING;
