import crypto from 'node:crypto';
import type { TransactionalSqlExecutor } from '../db/transaction';

export class VoidRefundValidationError extends Error { readonly code='VOID_REFUND_VALIDATION_FAILED'; }
export class VoidRefundConflictError extends Error { readonly code='VOID_REFUND_CONFLICT'; }

type DbRow = Record<string, unknown>;
const moneyToCents = (value: unknown): bigint => {
  const text = String(value);
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new VoidRefundValidationError('Database monetary value is invalid.');
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0') || '0');
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
const fingerprint = (value: unknown): string => JSON.stringify(value);

type RefundInput = {
  storeId: string; orderId: string; idempotencyKey: string;
  refundAmount: { amountInCents: number; currency: string };
  reason: string; refundMethod: 'cash' | 'card' | 'qr_digital';
  restockItems?: readonly { productId: string; quantity: number }[];
  authorizedByUserId: string; terminalReference?: string;
};
type VoidInput = { storeId: string; orderId: string; idempotencyKey: string; reason: string; authorizedByUserId: string };

const refundFingerprint = (input: RefundInput, amount: bigint, restockItems: readonly { productId: string; quantity: number }[]): string => fingerprint({
  amount: centsToMoney(amount),
  authorizedByUserId: input.authorizedByUserId.trim(),
  method: input.refundMethod,
  orderId: input.orderId,
  reason: input.reason.trim(),
  restockItems: [...restockItems].sort((a, b) => a.productId.localeCompare(b.productId)).map(item => ({ productId: item.productId, quantity: item.quantity })),
  terminalReference: input.terminalReference ?? null,
});
const voidFingerprint = (input: VoidInput): string => fingerprint({
  authorizedByUserId: input.authorizedByUserId.trim(),
  orderId: input.orderId,
  reason: input.reason.trim(),
});

const cachedRefund = (cached: DbRow, requestFingerprint: string) => {
  if (String(cached.request_fingerprint) !== requestFingerprint) throw new VoidRefundConflictError('Idempotency key was already used for a different refund request.');
  return { id: String(cached.id), amountInCents: Number(moneyToCents(cached.amount)), currency: String(cached.currency), method: String(cached.method), status: String(cached.status), idempotencyCached: true };
};
const cachedVoid = (cached: DbRow, requestFingerprint: string) => {
  if (String(cached.request_fingerprint) !== requestFingerprint) throw new VoidRefundConflictError('Idempotency key was already used for a different void request.');
  return { voidId: String(cached.id), status: String(cached.status), idempotencyCached: true };
};

export const createVoidRefundService = (db: TransactionalSqlExecutor) => ({
  async refund(input: RefundInput) {
    const idempotencyKey = nonBlank(input.idempotencyKey, 'Idempotency key');
    const reason = nonBlank(input.reason, 'Reason');
    const authorizedByUserId = nonBlank(input.authorizedByUserId, 'Authorizing user');
    const amount = requestMoney(input.refundAmount);
    if (!['cash', 'card', 'qr_digital'].includes(input.refundMethod)) throw new VoidRefundValidationError('Unsupported refund method.');
    const restocks = input.restockItems ?? [];
    const requestFingerprint = refundFingerprint(input, amount, restocks);

    return db.transaction(async tx => {
      const cached = (await tx.query(`SELECT r.id,r.amount::text,r.method,r.request_fingerprint,o.status,o.currency FROM prodx_refunds r JOIN prodx_orders o ON o.id=r.order_id WHERE r.store_id=$1 AND r.idempotency_key=$2`, [input.storeId, idempotencyKey])).rows[0] as DbRow | undefined;
      if (cached) return cachedRefund(cached, requestFingerprint);
      const order = (await tx.query(`SELECT * FROM prodx_orders WHERE id=$1 AND store_id=$2 FOR UPDATE`, [input.orderId, input.storeId])).rows[0] as DbRow | undefined;
      if (!order) throw new VoidRefundConflictError('Order does not exist in the authenticated store.');
      if (order.status === 'voided') throw new VoidRefundConflictError('A voided order cannot be refunded.');
      if (order.status === 'refunded') throw new VoidRefundConflictError('Order has already been fully refunded.');
      if (input.refundAmount.currency !== order.currency) throw new VoidRefundValidationError('Refund currency must match order currency.');

      const paid = moneyToCents((await tx.query(`SELECT COALESCE(SUM(amount),0)::text AS amount FROM prodx_payments WHERE order_id=$1`, [order.id])).rows[0].amount);
      const refunded = moneyToCents((await tx.query(`SELECT COALESCE(SUM(amount),0)::text AS amount FROM prodx_refunds WHERE order_id=$1`, [order.id])).rows[0].amount);
      if (paid !== moneyToCents(order.grand_total_amount)) throw new VoidRefundConflictError('Order payment state is inconsistent.');
      if (amount > paid - refunded) throw new VoidRefundConflictError('Refund amount exceeds the remaining refundable amount.');

      const sold = (await tx.query(`SELECT product_id,SUM(quantity)::int AS quantity FROM prodx_order_items WHERE order_id=$1 GROUP BY product_id`, [order.id])).rows as DbRow[];
      const soldByProduct = new Map(sold.map(row => [String(row.product_id), Number(row.quantity)]));
      const requestedByProduct = new Map<string, number>();
      for (const item of restocks) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new VoidRefundValidationError('Restock quantity must be positive.');
        const next = (requestedByProduct.get(item.productId) ?? 0) + item.quantity;
        if (next > (soldByProduct.get(item.productId) ?? 0)) throw new VoidRefundConflictError('Restock quantity exceeds the quantity sold for this order.');
        requestedByProduct.set(item.productId, next);
      }

      const refundId = crypto.randomUUID();
      const persistedRestocks = [...restocks].sort((a, b) => a.productId.localeCompare(b.productId));
      const inserted = (await tx.query(`INSERT INTO prodx_refunds(id,organization_id,store_id,order_id,idempotency_key,request_fingerprint,restock_items,amount,method,reason,authorized_by_user_id,terminal_reference) SELECT $1,organization_id,$2,id,$3,$4,$5::jsonb,$6,$7,$8,$9,$10 FROM prodx_orders WHERE id=$11 AND store_id=$2 ON CONFLICT(store_id,idempotency_key) DO NOTHING RETURNING id,amount::text,method`, [refundId, input.storeId, idempotencyKey, requestFingerprint, JSON.stringify(persistedRestocks.map(item => ({ productId: item.productId, quantity: item.quantity }))), centsToMoney(amount), input.refundMethod, reason, authorizedByUserId, input.terminalReference ?? null, order.id])).rows[0] as DbRow | undefined;
      if (!inserted) {
        const concurrent = (await tx.query(`SELECT r.id,r.amount::text,r.method,r.request_fingerprint,o.status,o.currency FROM prodx_refunds r JOIN prodx_orders o ON o.id=r.order_id WHERE r.store_id=$1 AND r.idempotency_key=$2`, [input.storeId, idempotencyKey])).rows[0] as DbRow | undefined;
        if (concurrent) return cachedRefund(concurrent, requestFingerprint);
        throw new VoidRefundConflictError('Refund idempotency conflict could not be resolved.');
      }

      for (const item of restocks) {
        const stock = (await tx.query(`UPDATE prodx_products SET current_stock=current_stock+$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND store_id=$3 RETURNING current_stock`, [item.quantity, item.productId, input.storeId])).rows[0] as DbRow | undefined;
        if (!stock) throw new VoidRefundConflictError('Restock product does not exist in the authenticated store.');
        await tx.query(`INSERT INTO prodx_inventory_ledger(id,organization_id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id) VALUES($1,$2,$3,$4,$5,$6,'refund_restock',$7,$8)`, [crypto.randomUUID(), order.organization_id, input.storeId, item.productId, item.quantity, stock.current_stock, inserted.id, authorizedByUserId]);
      }
      if (input.refundMethod === 'cash') {
        const shift = (await tx.query(`SELECT id FROM prodx_shifts WHERE store_id=$1 AND cashier_id=$2 AND status='open' FOR UPDATE`, [input.storeId, authorizedByUserId])).rows[0] as DbRow | undefined;
        if (!shift) throw new VoidRefundConflictError('An active shift is required for a cash refund.');
        await tx.query(`INSERT INTO prodx_cash_movements(id,organization_id,store_id,shift_id,type,amount,reason,performed_by_user_id,currency) VALUES($1,$2,$3,$4,'cash_refund',$5,$6,$7,$8)`, [crypto.randomUUID(), order.organization_id, input.storeId, shift.id, centsToMoney(amount), reason, authorizedByUserId, order.currency]);
      }
      const newRefunded = refunded + amount;
      const newStatus = newRefunded === paid ? 'refunded' : String(order.status);
      if (newStatus !== order.status) await tx.query(`UPDATE prodx_orders SET status=$1 WHERE id=$2 AND store_id=$3`, [newStatus, order.id, input.storeId]);
      await tx.query(`INSERT INTO prodx_audit_log(id,organization_id,store_id,register_id,user_id,action,severity,details) VALUES($1,$2,$3,$4,$5,'order_refund','warn',$6::jsonb)`, [crypto.randomUUID(), order.organization_id, input.storeId, order.register_id, authorizedByUserId, JSON.stringify({ orderId: order.id, refundId: inserted.id, amount: centsToMoney(amount), method: input.refundMethod, reason, restocked: restocks })]);
      return { id: String(inserted.id), amountInCents: Number(amount), currency: String(order.currency), method: input.refundMethod, status: newStatus, idempotencyCached: false };
    });
  },

  async voidOrder(input: VoidInput) {
    const idempotencyKey = nonBlank(input.idempotencyKey, 'Idempotency key');
    const reason = nonBlank(input.reason, 'Reason');
    const authorizedByUserId = nonBlank(input.authorizedByUserId, 'Authorizing user');
    const requestFingerprint = voidFingerprint(input);
    return db.transaction(async tx => {
      const cached = (await tx.query(`SELECT v.id,v.request_fingerprint,o.status FROM prodx_voids v JOIN prodx_orders o ON o.id=v.order_id WHERE v.store_id=$1 AND v.idempotency_key=$2`, [input.storeId, idempotencyKey])).rows[0] as DbRow | undefined;
      if (cached) return cachedVoid(cached, requestFingerprint);
      const order = (await tx.query(`SELECT * FROM prodx_orders WHERE id=$1 AND store_id=$2 FOR UPDATE`, [input.orderId, input.storeId])).rows[0] as DbRow | undefined;
      if (!order) throw new VoidRefundConflictError('Order does not exist in the authenticated store.');
      if (order.status !== 'server_confirmed') throw new VoidRefundConflictError('Only a server-confirmed order can be voided.');
      const refunded = moneyToCents((await tx.query(`SELECT COALESCE(SUM(amount),0)::text AS amount FROM prodx_refunds WHERE order_id=$1`, [order.id])).rows[0].amount);
      if (refunded !== 0n) throw new VoidRefundConflictError('A partially refunded order cannot be voided.');
      const payments = (await tx.query(`SELECT id,amount::text,method FROM prodx_payments WHERE order_id=$1 ORDER BY id FOR UPDATE`, [order.id])).rows as DbRow[];
      if (payments.length === 0) throw new VoidRefundConflictError('A paid order is required for void.');
      const paid = payments.reduce((sum, p) => sum + moneyToCents(p.amount), 0n);
      if (paid !== moneyToCents(order.grand_total_amount)) throw new VoidRefundConflictError('Order payment state is inconsistent.');
      const voidId = crypto.randomUUID();
      const inserted = (await tx.query(`INSERT INTO prodx_voids(id,organization_id,store_id,order_id,idempotency_key,request_fingerprint,reason,authorized_by_user_id) SELECT $1,organization_id,$2,id,$3,$4,$5,$6 FROM prodx_orders WHERE id=$7 AND store_id=$2 ON CONFLICT(store_id,idempotency_key) DO NOTHING RETURNING id`, [voidId, input.storeId, idempotencyKey, requestFingerprint, reason, authorizedByUserId, order.id])).rows[0] as DbRow | undefined;
      if (!inserted) {
        const concurrent = (await tx.query(`SELECT v.id,v.request_fingerprint,o.status FROM prodx_voids v JOIN prodx_orders o ON o.id=v.order_id WHERE v.store_id=$1 AND v.idempotency_key=$2`, [input.storeId, idempotencyKey])).rows[0] as DbRow | undefined;
        if (concurrent) return cachedVoid(concurrent, requestFingerprint);
        throw new VoidRefundConflictError('Void idempotency conflict could not be resolved.');
      }

      for (const payment of payments) {
        await tx.query(`INSERT INTO prodx_payment_reversals(id,organization_id,store_id,order_id,payment_id,void_id,amount,method,reason,authorized_by_user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [crypto.randomUUID(), order.organization_id, input.storeId, order.id, payment.id, inserted.id, payment.amount, payment.method, reason, authorizedByUserId]);
        if (payment.method === 'cash') {
          const shift = (await tx.query(`SELECT id FROM prodx_shifts WHERE store_id=$1 AND cashier_id=$2 AND status='open' FOR UPDATE`, [input.storeId, authorizedByUserId])).rows[0] as DbRow | undefined;
          if (!shift) throw new VoidRefundConflictError('An active shift is required for a cash void reversal.');
          await tx.query(`INSERT INTO prodx_cash_movements(id,organization_id,store_id,shift_id,type,amount,reason,performed_by_user_id,currency) VALUES($1,$2,$3,$4,'cash_refund',$5,$6,$7,$8)`, [crypto.randomUUID(), order.organization_id, input.storeId, shift.id, payment.amount, reason, authorizedByUserId, order.currency]);
        }
      }
      const items = (await tx.query(`SELECT product_id,quantity FROM prodx_order_items WHERE order_id=$1 ORDER BY id`, [order.id])).rows as DbRow[];
      for (const item of items) {
        const stock = (await tx.query(`UPDATE prodx_products SET current_stock=current_stock+$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND store_id=$3 RETURNING current_stock`, [item.quantity, item.product_id, input.storeId])).rows[0] as DbRow | undefined;
        if (!stock) throw new VoidRefundConflictError('Void inventory reversal product is missing.');
        await tx.query(`INSERT INTO prodx_inventory_ledger(id,organization_id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id) VALUES($1,$2,$3,$4,$5,$6,'void_reversal',$7,$8)`, [crypto.randomUUID(), order.organization_id, input.storeId, item.product_id, item.quantity, stock.current_stock, inserted.id, authorizedByUserId]);
      }
      await tx.query(`UPDATE prodx_orders SET status='voided' WHERE id=$1 AND store_id=$2`, [order.id, input.storeId]);
      await tx.query(`INSERT INTO prodx_audit_log(id,organization_id,store_id,register_id,user_id,action,severity,details) VALUES($1,$2,$3,$4,$5,'order_void','critical',$6::jsonb)`, [crypto.randomUUID(), order.organization_id, input.storeId, order.register_id, authorizedByUserId, JSON.stringify({ orderId: order.id, voidId: inserted.id, reason, reversedPayments: payments.map(p => String(p.id)) })]);
      return { voidId: String(inserted.id), status: 'voided', idempotencyCached: false };
    });
  },
});
