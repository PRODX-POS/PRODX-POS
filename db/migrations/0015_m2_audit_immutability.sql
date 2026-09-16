-- PRODX POS M2 audit integrity
-- Audit records are evidence and must not be mutable after insertion.

CREATE OR REPLACE FUNCTION prodx_reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'prodx_audit_log is append-only';
END;
$$;

DROP TRIGGER IF EXISTS prodx_audit_log_no_update ON prodx_audit_log;
CREATE TRIGGER prodx_audit_log_no_update
BEFORE UPDATE ON prodx_audit_log
FOR EACH ROW
EXECUTE FUNCTION prodx_reject_audit_mutation();

DROP TRIGGER IF EXISTS prodx_audit_log_no_delete ON prodx_audit_log;
CREATE TRIGGER prodx_audit_log_no_delete
BEFORE DELETE ON prodx_audit_log
FOR EACH ROW
EXECUTE FUNCTION prodx_reject_audit_mutation();

INSERT INTO prodx_schema_migrations(version)
VALUES ('0015_m2_audit_immutability')
ON CONFLICT(version) DO NOTHING;
