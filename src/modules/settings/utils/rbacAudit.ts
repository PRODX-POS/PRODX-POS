/**
 * PRODX POS - RBAC Audit Logging Utility
 */

export interface RbacAuditLog {
  id: string;
  timestamp: string;
  author: string;
  authorEmail?: string;
  action: string;
  target?: string;
  details?: string;
}

export const getRbacAuditLogs = (): RbacAuditLog[] => {
  try {
    return JSON.parse(localStorage.getItem('prodx_pos_rbac_audit_logs') || '[]');
  } catch {
    return [];
  }
};

export const recordRbacAuditLog = (entry: Omit<RbacAuditLog, 'id' | 'timestamp'>) => {
  try {
    const logs = getRbacAuditLogs();
    const newLog: RbacAuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const updated = [newLog, ...logs].slice(0, 100);
    localStorage.setItem('prodx_pos_rbac_audit_logs', JSON.stringify(updated));
  } catch (e) {
    console.error('Audit log write error:', e);
  }
};
