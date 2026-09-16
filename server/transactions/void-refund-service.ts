import crypto from 'node:crypto';
import type { TransactionalSqlExecutor } from '../db/transaction';

export class VoidRefundValidationError extends Error { readonly code='VOID_REFUND_VALIDATION_FAILED'; }
export class VoidRefundConflictError extends Error { readonly code='VOID_REFUND_CONFLICT'; }

const moneyToCents = (value: unknown): bigint => {
  const match = /^(\d+)\.(\d{2})$/.exec(String(value));
  if (!match) throw new VoidRefundValidationError('Database monetary value is invalid.');
  return BigInt(match[1]) * 100n + BigInt(match[2]);
};
const centsToMoney = (value: bigint): string => `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
const requestMoney = (value: unknown): bigint => {
  if (typeof value !== 'object' || value === null || !('amountInCents' in value)) throw new VoidRefundValidationError('Refund amount is required.');
  const amount = (value as { amountInCents?: unknown }).amountInCents;
  if (!Number.isSafeInteger(amount) || (amount as number) <= 0) throw new VoidRefundValidationError('Refund amount must be a positive integer minor-unit amount.');
  return BigInt(amount as number);
};
const nonBlank = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) throw new VoidRefundValidationError(`${field} is required.`);
  return value.trim();
};

type RefundInput = {
  storeId: string;
  orderId: string;
  idempotencyKey: string;
  refundAmount: { amountInCents: number; currency: string };
  reason: string;
  refundMethod: 'cash' | 'card' | 'qr_digital';
  restockItems?: readonly { productId: string; quantity: number }[];
  authorizedByUserId: string;
  terminalReference?: string;
};

type VoidInput = {
  storeId: string;
  orderId: string;
  idempotencyKey: string;
  reason: string;
  authorizedByUserId: string;
};

export const createVoidRefundService = (db: TransactionalSqlExecutor) => ({
  async refund(input: RefundInput) {
    const idempotencyKey = nonBlank(input.idempotencyKey, 'Idempotency key');
    const reason = nonBlank(input.reason, 'Reason');
    const authorizedByUserId = nonBlank(input.authorizedByUserId, 'Authorizing user');
    const amount = requestMoney(input.refundAmount);
    if (!['cash', 'card', 'qr_digital'].includes(input.refundMethod)) throw new VoidRefundValidationError('Unsupported refund method.');
    if (input.refundAmount.currency !== 'THB') throw new VoidRefundValidationError('Refund currency must be THB.');

    return db.transaction(async tx => {
      const cached = (await tx.query(`SELECT r.id,r.amount::text,r.method,r.reason,r.created_at,o.status,o.grand_total_amount::text,o.currency FROM prodx_refunds r JOIN prodx_orders o ON o.id=r.order_id WHERE r.store_id=$1 AND r.idempotency_key=$2`, [input.storeId, idempotencyKey])).rows[0];
      if (cached) return { id: cached.id, amountInCents: Number(moneyToCents(cached.amount)), currency: cached.currency, method: cached.method, status: cached.status, idempotencyCached: true };

      const order = (await tx.query(`SELECT * FROM prodx_orders WHERE id=$1 AND store_id=$2 FOR UPDATE`, [input.orderId, input.storeId])).rows[0];
      if (!order) throw new VoidRefundConflictError('Order does not exist in the authenticated store.');
      if (order.status === 'voided') throw new VoidRefundConflictError('A voided order cannot be refunded.');
      if (order.status === 'refunded') throw new VoidRefundConflictError('Order has already been fully refunded.');
      if (input.refundAmount.currency !== order.currency) throw new VoidRefundValidationError('Refund currency must match order currency.');

      const paid = moneyToCents((await tx.query(`SELECT COALESCE(SUM(amount),0)::text AS amount FROM prodx_payments WHERE order_id=$1`, [order.id])).rows[0].amount);
      const refunded = moneyToCents((await tx.query(`SELECT COALESCE(SUM(amount),0)::text AS amount FROM prodx_refunds WHERE order_id=$1`, [order.id])).rows[0].amount);
      const remaining = paid - refunded;
      if (amount > remaining) throw new VoidRefundConflictError('Refund amount exceeds the remaining refundable amount.');

      const refundId = crypto.randomUUID();
      const inserted = (await tx.query(`INSERT INTO prodx_refunds(id,organization_id,store_id,order_id,idempotency_key,amount,method,reason,authorized_by_user_id,terminal_reference) SELECT $1,organization_id,$2,id,$3,$4,$5,$6,$7,$8 FROM prodx_orders WHERE id=$9 AND store_id=$2 ON CONFLICT(store_id,idempotency_key) DO NOTHING RETURNING id,amount::text,method,currency,created_at`, [refundId, input.storeId, idempotencyKey, centsToMoney(amount), input.refundMethod, reason, authorizedByUserId, input.terminalReference ?? null, order.id])).rows[0];
      if (!inserted) throw new VoidRefundConflictError('Refund idempotency conflict could not be resolved.');

      for (const item of input.restockItems ?? []) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new VoidRefundValidationError('Restock quantity must be positive.');
        const stock = (await tx.query(`UPDATE prodx_products SET current_stock=current_stock+$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND store_id=$3 AND current_stock+$1 >= 0 RETURNING current_stock`, [item.quantity, item.productId, input.storeId])).rows[0];
        if (!stock) throw new VoidRefundConflictError('Restock product does not exist in the authenticated store.');
        await tx.query(`INSERT INTO prodx_inventory_ledger(id,organization_id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id) VALUES($1,$2,$3,$4,$5,$6,'refund_restock',$7,$8)`, [crypto.randomUUID(), order.organization_id, input.storeId, item.productId, item.quantity, stock.current_stock, inserted.id, authorizedByUserId]);
      }

      if (input.refundMethod === 'cash') {
        const shift = (await tx.query(`SELECT id FROM prodx_shifts WHERE store_id=$1 AND cashier_id=$2 AND status='open' FOR UPDATE`, [input.storeId, authorizedByUserId])).rows[0];
        if (!shift) throw new VoidRefundConflictError('An active shift is required for a cash refund.');
        await tx.query(`INSERT INTO prodx_cash_movements(id,organization_id,store_id,shift_id,type,amount,reason,performed_by_user_id,currency) VALUES($1,$2,$3,$4,'cash_refund',$5,$6,$7,$8)`, [crypto.randomUUID(), order.organization_id, input.storeId, shift.id, centsToMoney(amount), reason, authorizedByUserId, order.currency]);
      }

      const newRefunded = refunded + amount;
      const newStatus = newRefunded === paid ? 'refunded' : order.status;
      if (newStatus !== order.status) await tx.query(`UPDATE prodx_orders SET status=$1 WHERE id=$2 AND store_id=$3`, [newStatus, order.id, input.storeId]);
      await tx.query(`INSERT INTO prodx_audit_log(id,organization_id,store_id,register_id,user_id,action,severity,details) VALUES($1,$2,$3,$4,$5,'order_refund','warn',$6::jsonb)`, [crypto.randomUUID(), order.organization_id, input.storeId, order.register_id, authorizedByUserId, JSON.stringify({ orderId: order.id, refundId: inserted.id, amount: centsToMoney(amount), method: input.refundMethod, reason, restocked: input.restockItems?.length ?? 0 })]);
      return { id: inserted.id, amountInCents: Number(amount), currency: order.currency, method: input.refundMethod, status: newStatus, idempotencyCached: false };
    });
  },

  async voidOrder(input: VoidInput) {
    const idempotencyKey = nonBlank(input.idempotencyKey, 'Idempotency key');
    const reason = nonBlank(input.reason, 'Reason');
    const authorizedByUserId = nonBlank(input.authorizedByUserId, 'Authorizing user');
    return db.transaction(async tx => {
      const cached = (await tx.query(`SELECT v.id,o.status FROM prodx_voids v JOIN prodx_orders o ON o.id=v.order_id WHERE v.store_id=$1 AND v.idempotency_key=$2`, [input.storeId, idempotencyKey])).rows[0];
      if (cached) return { voidId: cached.id, status: cached.status, idempotencyCached: true };
      const order = (await tx.query(`SELECT * FROM prodx_orders WHERE id=$1 AND store_id=$2 FOR UPDATE`, [input.orderId, input.storeId])).rows[0];
      if (!order) throw new VoidRefundConflictError('Order does not exist in the authenticated store.');
      if (order.status !== 'server_confirmed') throw new VoidRefundConflictError('Only a server-confirmed order can be voided.');
      const refunded = moneyToCents((await tx.query(`SELECT COALESCE(SUM(amount),0)::text AS amount FROM prodx_refunds WHERE order_id=$1`, [order.id])).rows[0].amount);
      if (refunded !== 0n) throw new VoidRefundConflictError('A partially refunded order cannot be voided.');
      const voidId = crypto.randomUUID();
      const inserted = (await tx.query(`INSERT INTO prodx_voids(id,organization_id,store_id,order_id,idempotency_key,reason,authorized_by_user_id) SELECT $1,organization_id,$2,id,$3,$4,$5 FROM prodx_orders WHERE id=$6 AND store_id=$2 ON CONFLICT(store_id,idempotency_key) DO NOTHING RETURNING id`, [voidId, input.storeId, idempotencyKey, reason, authorizedByUserId, order.id])).rows[0];
      if (!inserted) throw new VoidRefundConflictError('Void idempotency conflict could not be resolved.');

      const items = (await tx.query(`SELECT product_id,quantity FROM prodx_order_items WHERE order_id=$1 ORDER BY id`, [order.id])).rows;
      for (const item of items) {
        const stock = (await tx.query(`UPDATE prodx_products SET current_stock=current_stock+$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND store_id=$3 RETURNING current_stock`, [item.quantity, item.product_id, input.storeId])).rows[0];
        if (!stock) throw new VoidRefundConflictError('Void inventory reversal product is missing.');
        await tx.query(`INSERT INTO prodx_inventory_ledger(id,organization_id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id) VALUES($1,$2,$3,$4,$5,$6,'refund_restock',$7,$8)`, [crypto.randomUUID(), order.organization_id, input.storeId, item.product_id, item.quantity, stock.current_stock, inserted.id, authorizedByUserId]);
      }
      await tx.query(`UPDATE prodx_orders SET status='voided' WHERE id=$1 AND store_id=$2`, [order.id, input.storeId]);
      await tx.query(`INSERT INTO prodx_audit_log(id,organization_id,store_id,register_id,user_id,action,severity,details) VALUES($1,$2,$3,$4,$5,'order_void','critical',$6::jsonb)`, [crypto.randomUUID(), order.organization_id, input.storeId, order.register_id, authorizedByUserId, JSON.stringify({ orderId: order.id, voidId: inserted.id, reason })]);
      return { voidId: inserted.id, status: 'voided', idempotencyCached: false };
    });
  },
});
