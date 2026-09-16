import crypto from 'node:crypto';
import type { SqlQueryExecutor, TransactionalSqlExecutor } from '../db/transaction';

export type RefundMethod = 'cash' | 'card' | 'qr_digital';
export type RefundItem = { productId: string; quantity: number };

export class RefundVoidValidationError extends Error {}
export class RefundVoidConflictError extends Error {}

function cents(amountInCents: number) {
  if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) throw new RefundVoidValidationError('Amount must be a positive integer number of cents.');
  return BigInt(amountInCents);
}

function numeric(value: bigint) {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}

function dbCents(value: unknown) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) throw new RefundVoidConflictError('Database monetary value is invalid.');
  const fraction = (match[2] ?? '').padEnd(2, '0');
  return BigInt(match[1]) * 100n + BigInt(fraction);
}

async function getOrder(tx: SqlQueryExecutor, storeId: string, orderId: string, forUpdate = false) {
  const result = await tx.query(`SELECT * FROM prodx_orders WHERE id=$1 AND store_id=$2${forUpdate ? ' FOR UPDATE' : ''}`, [orderId, storeId]);
  return result.rows[0];
}

async function getExistingByKey(tx: SqlQueryExecutor, storeId: string, idempotencyKey: string) {
  return (await tx.query(`SELECT * FROM prodx_order_adjustments WHERE store_id=$1 AND idempotency_key=$2`, [storeId, idempotencyKey])).rows[0];
}

function ensureReason(reason: string) {
  if (!reason.trim() || reason.length > 500) throw new RefundVoidValidationError('Reason is required and must be at most 500 characters.');
  return reason.trim();
}

function ensureItems(items: RefundItem[]) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.productId)) throw new RefundVoidValidationError('Refund items must contain unique products.');
    seen.add(item.productId);
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new RefundVoidValidationError('Refund item quantity must be a positive integer.');
  }
}

function ensureRefundIdempotency(existing: any, input: { orderId: string; amount: bigint; currency: string; refundMethod: RefundMethod; reason: string }) {
  if (existing.action !== 'refund' || existing.order_id !== input.orderId || dbCents(existing.amount) !== input.amount || existing.currency !== input.currency || existing.refund_method !== input.refundMethod || existing.reason !== input.reason) {
    throw new RefundVoidConflictError('Idempotency key was already used with different refund parameters.');
  }
}

export const createRefundVoidService = (db: TransactionalSqlExecutor) => ({
  async refund(input: {
    storeId: string;
    orderId: string;
    amountInCents: number;
    currency: string;
    refundMethod: RefundMethod;
    reason: string;
    authorizedByUserId: string;
    idempotencyKey: string;
    itemsToRestock: RefundItem[];
  }) {
    const amount = cents(input.amountInCents);
    const reason = ensureReason(input.reason);
    ensureItems(input.itemsToRestock);

    return db.transaction(async (tx) => {
      const existing = await getExistingByKey(tx, input.storeId, input.idempotencyKey);
      if (existing) {
        const order = await getOrder(tx, input.storeId, input.orderId);
        if (!order) throw new RefundVoidConflictError('Order not found in this store.');
        ensureRefundIdempotency(existing, { orderId: input.orderId, amount, currency: input.currency, refundMethod: input.refundMethod, reason });
        return { idempotencyCached: true, adjustment: existing };
      }

      // Never report a card/QR refund as committed until an external provider settlement is actually integrated.
      if (input.refundMethod !== 'cash') {
        throw new RefundVoidConflictError(`External ${input.refundMethod} refund settlement is not configured; no refund was committed.`);
      }

      const order = await getOrder(tx, input.storeId, input.orderId, true);
      if (!order) throw new RefundVoidConflictError('Order not found in this store.');
      if (order.currency !== input.currency) throw new RefundVoidConflictError('Refund currency does not match the order currency.');
      if (order.status !== 'server_confirmed') throw new RefundVoidConflictError(`Order is not refundable in status ${order.status}.`);

      const refunded = dbCents((await tx.query(`SELECT COALESCE(SUM(amount),0)::text AS total FROM prodx_order_adjustments WHERE store_id=$1 AND order_id=$2 AND action='refund'`, [input.storeId, input.orderId])).rows[0].total);
      const grandTotal = dbCents(order.grand_total_amount);
      if (refunded + amount > grandTotal) throw new RefundVoidConflictError('Refund exceeds the remaining refundable amount.');

      const adjustmentId = crypto.randomUUID();
      const adjustment = (await tx.query(`INSERT INTO prodx_order_adjustments(id,organization_id,store_id,order_id,action,amount,currency,refund_method,reason,idempotency_key,authorized_by_user_id) SELECT $1,organization_id,$2,$3,'refund',$4,$5,$6,$7,$8,$9 FROM prodx_orders WHERE id=$3 RETURNING *`, [adjustmentId, input.storeId, input.orderId, numeric(amount), input.currency, input.refundMethod, reason, input.idempotencyKey, input.authorizedByUserId])).rows[0];
      if (!adjustment) throw new RefundVoidConflictError('Refund could not be created.');

      for (const item of input.itemsToRestock) {
        const sold = (await tx.query(`SELECT quantity FROM prodx_order_items WHERE order_id=$1 AND store_id=$2 AND product_id=$3`, [input.orderId, input.storeId, item.productId])).rows[0];
        if (!sold || item.quantity > sold.quantity) throw new RefundVoidConflictError('Restock quantity exceeds the quantity sold on the order.');
        const stock = (await tx.query(`UPDATE prodx_products SET current_stock=current_stock+$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND store_id=$3 RETURNING current_stock`, [item.quantity, item.productId, input.storeId])).rows[0];
        if (!stock) throw new RefundVoidConflictError('Refund product is not available in this store.');
        await tx.query(`INSERT INTO prodx_refund_items(id,organization_id,store_id,adjustment_id,order_id,product_id,quantity) SELECT $1,organization_id,$2,$3,$4,$5,$6 FROM prodx_orders WHERE id=$4`, [crypto.randomUUID(), input.storeId, adjustmentId, input.orderId, item.productId, item.quantity]);
        await tx.query(`INSERT INTO prodx_inventory_ledger(id,organization_id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id) VALUES($1,$2,$3,$4,$5,$6,'refund_restock',$7,$8)`, [crypto.randomUUID(), adjustment.organization_id, input.storeId, item.productId, item.quantity, stock.current_stock, adjustmentId, input.authorizedByUserId]);
      }

      const shift = (await tx.query(`SELECT id FROM prodx_shifts WHERE store_id=$1 AND cashier_id=$2 AND status='open' FOR UPDATE`, [input.storeId, input.authorizedByUserId])).rows[0];
      if (!shift) throw new RefundVoidConflictError('An active shift for the authorizing cashier is required for a cash refund.');
      await tx.query(`INSERT INTO prodx_cash_movements(id,organization_id,store_id,shift_id,type,amount,reason,performed_by_user_id,currency) VALUES($1,$2,$3,$4,'cash_refund',$5,$6,$7,$8)`, [crypto.randomUUID(), adjustment.organization_id, input.storeId, shift.id, numeric(amount), `Refund ${input.orderId}: ${reason}`, input.authorizedByUserId, input.currency]);

      const newRefunded = refunded + amount;
      if (newRefunded === grandTotal) await tx.query(`UPDATE prodx_orders SET status='refunded' WHERE id=$1 AND store_id=$2`, [input.orderId, input.storeId]);
      await tx.query(`INSERT INTO prodx_audit_log(id,organization_id,store_id,register_id,user_id,action,severity,details) VALUES($1,$2,$3,(SELECT register_id FROM prodx_orders WHERE id=$4),$5,'order_refund_committed','warn',$6::jsonb)`, [crypto.randomUUID(), adjustment.organization_id, input.storeId, input.orderId, input.authorizedByUserId, JSON.stringify({ orderId: input.orderId, adjustmentId, amount: numeric(amount), refundMethod: input.refundMethod, idempotencyKey: input.idempotencyKey, restockedItems: input.itemsToRestock })]);
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
    const reason = ensureReason(input.reason);
    return db.transaction(async (tx) => {
      const existing = await getExistingByKey(tx, input.storeId, input.idempotencyKey);
      if (existing) {
        const order = await getOrder(tx, input.storeId, input.orderId);
        if (!order) throw new RefundVoidConflictError('Order not found in this store.');
        if (existing.order_id !== input.orderId || existing.action !== 'void' || existing.reason !== reason) throw new RefundVoidConflictError('Idempotency key was already used with different void parameters.');
        return { idempotencyCached: true, adjustment: existing };
      }

      const order = await getOrder(tx, input.storeId, input.orderId, true);
      if (!order) throw new RefundVoidConflictError('Order not found in this store.');
      if (order.status !== 'server_confirmed') throw new RefundVoidConflictError(`Order is not voidable in status ${order.status}.`);
      const priorRefund = (await tx.query(`SELECT 1 FROM prodx_order_adjustments WHERE store_id=$1 AND order_id=$2 AND action='refund' LIMIT 1`, [input.storeId, input.orderId])).rows[0];
      if (priorRefund) throw new RefundVoidConflictError('A refunded order cannot be voided.');
      const adjustmentId = crypto.randomUUID();
      const adjustment = (await tx.query(`INSERT INTO prodx_order_adjustments(id,organization_id,store_id,order_id,action,amount,currency,reason,idempotency_key,authorized_by_user_id) SELECT $1,organization_id,$2,$3,'void',grand_total_amount,currency,$4,$5,$6 FROM prodx_orders WHERE id=$3 RETURNING *`, [adjustmentId, input.storeId, input.orderId, reason, input.idempotencyKey, input.authorizedByUserId])).rows[0];
      if (!adjustment) throw new RefundVoidConflictError('Void could not be created.');
      const items = (await tx.query(`SELECT product_id, quantity FROM prodx_order_items WHERE store_id=$1 AND order_id=$2`, [input.storeId, input.orderId])).rows;
      for (const item of items) {
        const stock = (await tx.query(`UPDATE prodx_products SET current_stock=current_stock+$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND store_id=$3 RETURNING current_stock`, [item.quantity, item.product_id, input.storeId])).rows[0];
        if (!stock) throw new RefundVoidConflictError('Void product is not available in this store.');
        await tx.query(`INSERT INTO prodx_inventory_ledger(id,organization_id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id) VALUES($1,$2,$3,$4,$5,$6,'void_restock',$7,$8)`, [crypto.randomUUID(), adjustment.organization_id, input.storeId, item.product_id, item.quantity, stock.current_stock, adjustmentId, input.authorizedByUserId]);
      }
      const cash = dbCents((await tx.query(`SELECT COALESCE(SUM(amount),0)::text AS total FROM prodx_payments WHERE store_id=$1 AND order_id=$2 AND method='cash'`, [input.storeId, input.orderId])).rows[0].total);
      if (cash > 0n) {
        const shift = (await tx.query(`SELECT id FROM prodx_shifts WHERE store_id=$1 AND cashier_id=$2 AND status='open' FOR UPDATE`, [input.storeId, input.authorizedByUserId])).rows[0];
        if (!shift) throw new RefundVoidConflictError('An active shift for the authorizing cashier is required for a cash void reversal.');
        await tx.query(`INSERT INTO prodx_cash_movements(id,organization_id,store_id,shift_id,type,amount,reason,performed_by_user_id,currency) VALUES($1,$2,$3,$4,'cash_refund',$5,$6,$7,$8)`, [crypto.randomUUID(), adjustment.organization_id, input.storeId, shift.id, numeric(cash), `Void ${input.orderId}: ${reason}`, input.authorizedByUserId, order.currency]);
      }
      await tx.query(`UPDATE prodx_orders SET status='voided' WHERE id=$1 AND store_id=$2`, [input.orderId, input.storeId]);
      await tx.query(`INSERT INTO prodx_audit_log(id,organization_id,store_id,register_id,user_id,action,severity,details) VALUES($1,$2,$3,(SELECT register_id FROM prodx_orders WHERE id=$4),$5,'order_void_committed','critical',$6::jsonb)`, [crypto.randomUUID(), adjustment.organization_id, input.storeId, input.orderId, input.authorizedByUserId, JSON.stringify({ orderId: input.orderId, adjustmentId, idempotencyKey: input.idempotencyKey, reason })]);
      return { idempotencyCached: false, adjustment };
    });
  },
});
