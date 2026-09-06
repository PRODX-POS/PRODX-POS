/**
 * PRODX POS Domain - Audit Log Module
 * 
 * Invariant: Every critical operational event must be auditable and traceable.
 */

export type AuditSeverity = 'info' | 'warn' | 'critical';

export type AuditAction =
  | 'user_login'
  | 'user_logout'
  | 'shift_opened'
  | 'shift_closed'
  | 'cash_paid_in'
  | 'cash_paid_out'
  | 'order_checkout_committed'
  | 'order_checkout_queued_offline'
  | 'order_voided'
  | 'order_refunded'
  | 'price_override_applied'
  | 'cart_discount_applied'
  | 'stock_adjusted'
  | 'offline_sync_completed'
  | 'manager_override_authorized';

export interface AuditLogEntry {
  readonly id: string;
  readonly storeId: string;
  readonly registerId: string;
  readonly userId: string;
  readonly userName: string;
  readonly action: AuditAction;
  readonly severity: AuditSeverity;
  readonly details: Record<string, unknown>;
  readonly timestamp: string; // ISO 8601 UTC
}
