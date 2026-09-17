-- PRODX POS M2 AI capability permission
-- Root-cause fix: the AI security boundary requires `ai:use`, but the canonical
-- RBAC permission catalog did not persist that capability. Keep the permission
-- server-authorized and tenant-assignable through the existing RBAC model.

INSERT INTO prodx_permissions (id, permission_key, description)
VALUES (
  '10000000-0000-4000-8000-000000000016',
  'ai:use',
  'Use assistive AI capabilities'
)
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO prodx_schema_migrations (version)
VALUES ('0012_m2_ai_permission')
ON CONFLICT (version) DO NOTHING;
