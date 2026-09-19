CREATE TABLE IF NOT EXISTS prodx_supervisor_authorizations (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  store_id UUID NOT NULL,
  requester_user_id UUID NOT NULL,
  requester_session_id UUID NOT NULL,
  supervisor_user_id UUID NOT NULL,
  action_key TEXT NOT NULL,
  order_id UUID NOT NULL,
  authorization_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_supervisor_authorizations_action_valid CHECK (action_key IN ('refund')),
  CONSTRAINT prodx_supervisor_authorizations_hash_not_blank CHECK (length(btrim(authorization_hash)) > 0),
  CONSTRAINT prodx_supervisor_authorizations_expiry_valid CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS prodx_supervisor_authorizations_lookup_idx
  ON prodx_supervisor_authorizations (organization_id, store_id, requester_session_id, action_key, order_id, expires_at);

CREATE INDEX IF NOT EXISTS prodx_supervisor_authorizations_expiry_idx
  ON prodx_supervisor_authorizations (expires_at)
  WHERE consumed_at IS NULL;
