import crypto from 'node:crypto';
import type { SqlQueryExecutor, TransactionalSqlExecutor } from '../db/transaction';

export type RefundMethod = 'cash' | 'card' | 'qr_digital';
export type RefundItem = { productId: string; quantity: number };

type DbRow = Record<string, any>;

export class RefundVoidValidationError extends Error { readonly code = 'REFUND_VOID_VALIDATION_FAILED'; }
export class RefundVoidConflictError extends Error { readonly code = 'REFUND_VOID_CONFLICT'; }

const cents = (value: unknown, field: string): bigint => {
  const n = BigInt((value as any)?.amountInCents ?? -1);
  if (n <= 0n) throw new RefundVoidValidationError(`${field} must be a positive integer minor-unit amount.`);
  return n;
};

const numeric = (n: bigint): string => `${n / 100n}.${(n % 100n).toString().padStart(2, '0')}`;
const dbCents = (v: unknown): bigint => {
  const m = /^(\d+)\.(\d{2})$/.exec(String(v));
  if (!m) throw new RefundVoidValidationError('Database monetary value is invalid.');
  return BigInt(m[1]) * 100n + BigInt(m[2]);
};

const getOrder = async (db: SqlQueryExecutor, storeId: string, orderId: string, lock: boolean): Promise<DbRow> => {
  const row = (await db.query(`SELECT * FROM prodx_orders WHERE id=$1 AND store_id=$2${lock ? ' FOR UPDATE' : ''}`, [orderId, storeId])).rows[0];
  if (!row) throw new RefundVoidConflictError('Order does not exist in this store.');
  return row;
};

const getExistingByKey = async (db: SqlQueryExecutor, storeId: string, key: string): Promise<DbRow | undefined> =>
  (await db.query(`SELECT * FROM prodx_order_adjustments WHERE store_id=$1 AND idempotency_key=$2`, [storeId, key])).rows[0];

const ensureRefundIdempotency = (existing: DbRow, input: { orderId: string; amount: bigint; currency: string; refundMethod: RefundMethod; reason: string }): void => {
  if (existing.action !== 'refund' || existing.order_id !== input.orderId || dbCents(existing.amount) !== input.amount || existing.refund_method !== input.refundMethod || existing.reason !== input.reason) {
    throw new RefundVoidConflictError('Idempotency key is already bound to a different refund request.');
  }
};

const ensureVoidIdempotency = (existing: DbRow, input: { orderId: string; reason: string }): void => {
  if (existing.action !== 'void' || existing.order_id !== input.orderId || existing.reason !== input.reason) {
    throw new RefundVoidConflictError('Idempotency key is already bound to a different void request.');
  }
};

const ensureReason = (reason: string): string => {
  const normalized = reason.trim();
  if (!normalized) throw new RefundVoidValidationError('A non-blank reason is required.');
  if (normalized.length > 500) throw new RefundVoidValidationError('Reason is too long.');
  return normalized;
};

const validateItems = (items: readonly RefundItem[]): void => {
  const ids = new Set<string>();
  for (const item of items) {
    if (!item.productId || ids.has(item.productId)) throw new RefundVoidValidationError('Refund items must contain unique product IDs.');
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new RefundVoidValidationError('Refund item quantities must be positive integers.');
    ids.add(item.productId);
  }
};

export const createRefundVoidService = (db: TransactionalSqlExecutor) => ({
  async refund(input: {
    storeId: string;
    orderId: string;
    amountInCents: number;
    currency: string;
    reason: string;
    refundMethod: RefundMethod;
    authorizedByUserId: string;
    idempotencyKey: string;
    itemsToRestock?: readonly RefundItem[];
  }) {
    if (!input.idempotencyKey?.trim()) throw new RefundVoidValidationError('Idempotency key is required.');
    if (!input.storeId || !input.orderId || !input.authorizedByUserId) throw new RefundVoidValidationError('Store, order and authorizing user are required.');
    if (!['THB', 'USD', 'EUR', 'GBP'].includes(input.currency)) throw new RefundVoidValidationError('Unsupported currency.');
    const amount = cents({ amountInCents: input.amountInCents }, 'refund amount');
    const reason = ensureReason(input.reason);
    const items = input.itemsToRestock ?? [];
    validateItems(items);

    return db.transaction(async tx => {
      const order = await getOrder(tx, input.storeId, input.orderId, true);
      if (order.currency !== input.currency) throw new RefundVoidConflictError('Refund currency does not match the order currency.');
      if (order.status !== 'server_confirmed') throw new RefundVoidConflictError(`Order is not refundable in status ${order.status}.`);

      const existing = await getExistingByKey(tx, input.storeId, input.idempotencyKey);
      if (existing) {
        ensureRefundIdempotency(existing, { orderId: input.orderId, amount, currency: input.currency, refundMethod: input.refundMethod, reason });
        return { idempotencyCached: true, adjustment: existing };
      }

      const refunded = dbCents((await tx.query(`SELECT COALESCE(SUM(amount),0)::text AS total FROM prodx_order_adjustments WHERE store_id=$1 AND order_id=$2 AND action='refund'`, [input.storeId, input.orderId])).rows[0].total);
      const grandTotal = dbCents(order.grand_total_amount);
      if (refunded + amount > grandTotal) throw new RefundVoidConflictError('Refund exceeds the remaining refundable amount.');

      const adjustmentId = crypto.randomUUID();
      const adjustment = (await tx.query(`INSERT INTO prodx_order_adjustments(id,organization_id,store_id,order_id,action,amount,refund_method,reason,idempotency_key,authorized_by_user_id) SELECT $1,organization_id,$2,$3,'refund',$4,$5,$6,$7,$8 FROM prodx_orders WHERE id=$3 RETURNING *`, [adjustmentId, input.storeId, input.orderId, numeric(amount), input.refundMethod, reason, input.idempotencyKey, input.authorizedByUserId])).rows[0];
      if (!adjustment) throw new RefundVoidConflictError('Refund could not be created.');

      for (const item of items) {
        const sold = (await tx.query(`SELECT quantity FROM prodx_order_items WHERE order_id=$1 AND store_id=$2 AND product_id=$3`, [input.orderId, input.storeId, item.productId])).rows[0];
        if (!sold || item.quantity > sold.quantity) throw new RefundVoidConflictError('Restock quantity exceeds the quantity sold on the order.');
        const stock = (await tx.query(`UPDATE prodx_products SET current_stock=current_stock+$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND store_id=$3 RETURNING current_stock`, [item.quantity, item.productId, input.storeId])).rows[0];
        if (!stock) throw new RefundVoidConflictError('Refund product is not available in this store.');
        await tx.query(`INSERT INTO prodx_refund_items(id,organization_id,store_id,adjustment_id,order_id,product_id,quantity) SELECT $1,organization_id,$2,$3,$4,$5,$6 FROM prodx_orders WHERE id=$4`, [crypto.randomUUID(), adjustment.organization_id, input.storeId, adjustmentId, input.orderId, item.productId, item.quantity]);
        await tx.query(`INSERT INTO prodx_inventory_ledger(id,organization_id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id) VALUES($1,$2,$3,$4,$5,$6,'refund_restock',$7,$8)`, [crypto.randomUUID(), adjustment.organization_id, input.storeId, item.productId, item.quantity, stock.current_stock, adjustmentId, input.authorizedByUserId]);
      }

      if (input.refundMethod === 'cash') {
        const shift = (await tx.query(`SELECT id FROM prodx_shifts WHERE store_id=$1 AND cashier_id=$2 AND status='open' FOR UPDATE`, [input.storeId, input.authorizedByUserId])).rows[0];
        if (!shift) throw new RefundVoidConflictError('An active shift for the authorizing cashier is required for a cash refund.');
        await tx.query(`INSERT INTO prodx_cash_movements(id,organization_id,store_id,shift_id,type,amount,reason,performed_by_user_id,currency) VALUES($1,$2,$3,$4,'cash_refund',$5,$6,$7,$8)`, [crypto.randomUUID(), adjustment.organization_id, input.storeId, shift.id, numeric(amount), `Refund ${input.orderId}: ${reason}`, input.authorizedByUserId, input.currency]);
      }

      const newRefunded = refunded + amount;
      if (newRefunded === grandTotal) await tx.query(`UPDATE prodx_orders SET status='refunded' WHERE id=$1 AND store_id=$2`, [input.orderId, input.storeId]);
      await tx.query(`INSERT INTO prodx_audit_log(id,organization_id,store_id,register_id,user_id,action,severity,details) VALUES($1,$2,$3,(SELECT register_id FROM prodx_orders WHERE id=$4),$5,'order_refund_committed','warn',$6::jsonb)`, [crypto.randomUUID(), adjustment.organization_id, input.storeId, input.orderId, input.authorizedByUserId, JSON.stringify({ orderId: input.orderId, adjustmentId, amount: numeric(amount), refundMethod: input.refundMethod, idempotencyKey: input.idempotencyKey, restockedItems: items })]);
      return { idempotencyCached: false, adjustment };
    });
  },

  async void(input: {
    storeId: string;
    orderId: string;
    reason: string;
    authorizedByUserId: string;
    idempotencyKey: string;
  }) {
    if (!input.idempotencyKey?.trim()) throw new RefundVoidValidationError('Idempotency key is required.');
    const reason = ensureReason(input.reason);
    return db.transaction(async tx => {
      const order = await getOrder(tx, input.storeId, input.orderId, true);
      if (order.status !== 'server_confirmed') throw new RefundVoidConflictError(`Order is not voidable in status ${order.status}.`);
      const existing = await getExistingByKey(tx, input.storeId, input.idempotencyKey);
      if (existing) {
        ensureVoidIdempotency(existing, { orderId: input.orderId, reason });
        return { idempotencyCached: true, adjustment: existing };
      }
      const priorRefund = (await tx.query(`SELECT 1 FROM prodx_order_adjustments WHERE store_id=$1 AND order_id=$2 AND action='refund' LIMIT 1`, [input.storeId, input.orderId])).rows[0];
      if (priorRefund) throw new RefundVoidConflictError('An order with prior refunds cannot be voided.');

      const adjustmentId = crypto.randomUUID();
      const adjustment = (await tx.query(`INSERT INTO prodx_order_adjustments(id,organization_id,store_id,order_id,action,amount,refund_method,reason,idempotency_key,authorized_by_user_id) VALUES($1,$2,$3,$4,'void',$5,NULL,$6,$7,$8) RETURNING *`, [adjustmentId, order.organization_id, input.storeId, input.orderId, order.grand_total_amount, reason, input.idempotencyKey, input.authorizedByUserId])).rows[0];
      if (!adjustment) throw new RefundVoidConflictError('Void could not be created.');

      const items = (await tx.query(`SELECT product_id,quantity FROM prodx_order_items WHERE store_id=$1 AND order_id=$2`, [input.storeId, input.orderId])).rows;
      for (const item of items) {
        const stock = (await tx.query(`UPDATE prodx_products SET current_stock=current_stock+$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND store_id=$3 RETURNING current_stock`, [item.quantity, item.product_id, input.storeId])).rows[0];
        if (!stock) throw new RefundVoidConflictError('A voided product is not available in this store.');
        await tx.query(`INSERT INTO prodx_inventory_ledger(id,organization_id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id) VALUES($1,$2,$3,$4,$5,$6,'refund_restock',$7,$8)`, [crypto.randomUUID(), adjustment.organization_id, input.storeId, item.product_id, item.quantity, stock.current_stock, adjustmentId, input.authorizedByUserId]);
      }

      const cashPayments = (await tx.query(`SELECT COALESCE(SUM(amount),0)::text AS amount FROM prodx_payments WHERE store_id=$1 AND order_id=$2 AND method='cash'`, [input.storeId, input.orderId])).rows[0];
      const cashAmount = dbCents(cashPayments.amount);
      if (cashAmount > 0n) {
        const shift = (await tx.query(`SELECT id FROM prodx_shifts WHERE store_id=$1 AND cashier_id=$2 AND status='open' FOR UPDATE`, [input.storeId, input.authorizedByUserId])).rows[0];
        if (!shift) throw new RefundVoidConflictError('An active shift for the authorizing cashier is required to void a cash-paid order.');
        await tx.query(`INSERT INTO prodx_cash_movements(id,organization_id,store_id,shift_id,type,amount,reason,performed_by_user_id,currency) VALUES($1,$2,$3,$4,'cash_refund',$5,$6,$7,$8)`, [crypto.randomUUID(), adjustment.organization_id, input.storeId, shift.id, numeric(cashAmount), `Void ${input.orderId}: ${reason}`, input.authorizedByUserId, order.currency]);
      }

      await tx.query(`UPDATE prodx_orders SET status='voided' WHERE id=$1 AND store_id=$2`, [input.orderId, input.storeId]);
      await tx.query(`INSERT INTO prodx_audit_log(id,organization_id,store_id,register_id,user_id,action,severity,details) VALUES($1,$2,$3,(SELECT register_id FROM prodx_orders WHERE id=$4),$5,'order_void_committed','critical',$6::jsonb)`, [crypto.randomUUID(), adjustment.organization_id, input.storeId, input.orderId, input.authorizedByUserId, JSON.stringify({ orderId: input.orderId, adjustmentId, idempotencyKey: input.idempotencyKey, cashReversed: numeric(cashAmount) })]);
      return { idempotencyCached: false, adjustment };
    });
  },
});
