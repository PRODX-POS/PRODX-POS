-- PRODX POS M2 authentication security-event persistence
-- Security events are append-only and tenant-scoped.
-- Authentication lockout/reset events are persisted by the PostgreSQL auth adapter.

CREATE TABLE IF NOT EXISTS prodx_security_audit_events (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES prodx_users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT prodx_security_audit_events_type_not_blank CHECK (length(btrim(event_type)) > 0)
);

CREATE INDEX IF NOT EXISTS prodx_security_audit_events_org_time_idx
  ON prodx_security_audit_events (organization_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS prodx_security_audit_events_user_time_idx
  ON prodx_security_audit_events (user_id, occurred_at DESC);

INSERT INTO prodx_schema_migrations (version)
VALUES ('0006_m2_auth_security_audit')
ON CONFLICT (version) DO NOTHING;
