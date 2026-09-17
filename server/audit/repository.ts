import crypto from 'node:crypto';
import type { SqlQueryExecutor } from '../db/transaction';

export type AuditSeverity = 'info' | 'warn' | 'critical';

export type AuditEvent = {
  organizationId: string;
  storeId: string;
  registerId?: string | null;
  userId: string;
  action: string;
  severity: AuditSeverity;
  details?: Record<string, unknown>;
};

export type AuditRepository = {
  append: (db: SqlQueryExecutor, event: AuditEvent) => Promise<void>;
};

export const createAuditRepository = (): AuditRepository => ({
  async append(db, event) {
    if (!event.organizationId || !event.storeId || !event.userId || !event.action.trim()) {
      throw new Error('Audit event scope and action are required.');
    }

    await db.query(
      `INSERT INTO prodx_audit_log
        (id, organization_id, store_id, register_id, user_id, action, severity, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [
        crypto.randomUUID(),
        event.organizationId,
        event.storeId,
        event.registerId ?? null,
        event.userId,
        event.action,
        event.severity,
        JSON.stringify(event.details ?? {}),
      ],
    );
  },
});
