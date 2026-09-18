import crypto from 'node:crypto';
import type { Money } from '../../src/domain/money';
import type { RefundItemRestock } from '../../src/adapters/types';
import type { SqlQueryExecutor, TransactionalSqlExecutor } from '../db/transaction';

export class RefundValidationError extends Error {
  readonly code = 'REFUND_VALIDATION_FAILED';
}
export class RefundConflictError extends Error {
  readonly code = 'REFUND_CONFLICT';
}
export class RefundProviderUnavailableError extends Error {
  readonly code = 'REFUND_PROVIDER_UNAVAILABLE';
}

type RefundRequest = {
  storeId: string;
  orderId: string;
  refundAmount: Money;
  reason: string;
  refundMethod: 'cash' | 'card' | 'qr_digital';
  authorizedByUserId: string;
  itemsToRestock?: readonly RefundItemRestock[];
  idempotencyKey: string;
};

type RefundResponse = {
  success: true;
  refundId: string;
  orderId: string;
  status: 'server_confirmed' | 'refunded';
  refundedAmount: Money;
  message: string;
  idempotencyCached: boolean;
};

const toCents = (money: Money, field: string): bigint => {
  if (!Number.isInteger(money.amountInCents) || money.amountInCents <= 0) {
    throw new RefundValidationError(`${field} must be a positive integer minor-unit amount.`);
  }
  return BigInt(money.amountInCents);
};

const numeric = (cents: bigint): string =>
  `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;

const dbCents = (value: unknown): bigint => {
  const match = /^(\d+)\.(\d{2})$/.exec(String(value));
  if (!match) throw new RefundValidationError('Database monetary value is invalid.');
  return BigInt(match[1]) * 100n + BigInt(match[2]);
};

export const createRefundService = (db: TransactionalSqlExecutor) => ({
  async refund(request: RefundRequest): Promise<RefundResponse> {
    if (!request.storeId || !request.orderId || !request.authorizedByUserId || !request.idempotencyKey.trim()) {
      throw new RefundValidationError('Store, order, authorization and idempotency key are required.');
    }
    const amount = toCents(request.refundAmount, 'refund amount');
    if (!request.reason.trim()) throw new RefundValidationError('Refund reason is required.');

    if (request.refundMethod !== 'cash') {
      throw new RefundProviderUnavailableError(
        'Card and QR refunds require a configured payment-provider adapter; the server will fail closed until one is configured.',
      );
    }

    return db.transaction(async (tx) => {
      const existing = (await tx.query(
        `SELECT id, order_id, amount::text, idempotency_key FROM prodx_refunds
         WHERE store_id=$1 AND idempotency_key=$2 LIMIT 1`,
        [request.storeId, request.idempotencyKey],
      )).rows[0];
      if (existing) {
        return {
          success: true,
          refundId: existing.id,
          orderId: existing.order_id,
          status: 'server_confirmed',
          refundedAmount: { amountInCents: Number(dbCents(existing.amount)), currency: request.refundAmount.currency },
          message: 'Refund already committed; returning the existing transaction.',
          idempotencyCached: true,
        };
      }

      const order = (await tx.query(
        `SELECT * FROM prodx_orders WHERE id=$1 AND store_id=$2 FOR UPDATE`,
        [request.orderId, request.storeId],
      )).rows[0];
      if (!order) throw new RefundValidationError('Order was not found in the authenticated store.');
      if (order.status === 'voided') throw new RefundConflictError('Voided orders cannot be refunded.');

      const currency = String(order.currency).trim();
      if (currency !== request.refundAmount.currency) throw new RefundValidationError('Refund currency does not match the order.');

      const alreadyRefunded = (await tx.query(
        `SELECT COALESCE(SUM(amount),0)::text AS amount FROM prodx_refunds
         WHERE store_id=$1 AND order_id=$2`,
        [request.storeId, request.orderId],
      )).rows[0];
      const refundedBefore = dbCents(alreadyRefunded.amount);
      const orderTotal = dbCents(order.grand_total_amount);
      if (refundedBefore + amount > orderTotal) {
        throw new RefundConflictError('Refund amount exceeds the remaining refundable order balance.');
      }

      const shift = (await tx.query(
        `SELECT id FROM prodx_shifts WHERE id=$1 AND store_id=$2 AND status='open' FOR UPDATE`,
        [order.shift_id, request.storeId],
      )).rows[0];
      if (!shift) throw new RefundConflictError('The originating shift is not open; cash refund cannot be committed.');

      const refundId = crypto.randomUUID();
      const inserted = (await tx.query(
        `INSERT INTO prodx_refunds
          (id,organization_id,store_id,order_id,amount,method,reason,authorized_by_user_id,idempotency_key)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT(store_id,idempotency_key) DO NOTHING
         RETURNING id, order_id, amount::text`,
        [refundId, order.organization_id, request.storeId, request.orderId, numeric(amount), request.refundMethod,
          request.reason.trim(), request.authorizedByUserId, request.idempotencyKey],
      )).rows[0];
      if (!inserted) throw new RefundConflictError('Concurrent refund idempotency conflict; retry the same request.');

      const restock = request.itemsToRestock ?? [];
      const seen = new Set<string>();
      for (const item of restock) {
        if (!item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0 || seen.has(item.productId)) {
          throw new RefundValidationError('Restock items must contain unique products with positive integer quantities.');
        }
        seen.add(item.productId);

        const orderItem = (await tx.query(
          `SELECT oi.id, oi.product_id, oi.quantity
           FROM prodx_order_items oi
           WHERE oi.store_id=$1 AND oi.order_id=$2 AND oi.product_id=$3
           FOR UPDATE`,
          [request.storeId, request.orderId, item.productId],
        )).rows[0];
        if (!orderItem) throw new RefundValidationError(`Product ${item.productId} is not part of the order.`);

        const previous = (await tx.query(
          `SELECT COALESCE(SUM(quantity),0)::int AS quantity
           FROM prodx_refund_items ri
           WHERE ri.store_id=$1 AND ri.order_item_id=$2`,
          [request.storeId, orderItem.id],
        )).rows[0].quantity;
        if (previous + item.quantity > orderItem.quantity) {
          throw new RefundConflictError(`Restock quantity exceeds the refundable quantity for product ${item.productId}.`);
        }

        const stock = (await tx.query(
          `UPDATE prodx_products SET current_stock=current_stock+$1, updated_at=CURRENT_TIMESTAMP
           WHERE id=$2 AND store_id=$3 AND active=true
           RETURNING current_stock`,
          [item.quantity, item.productId, request.storeId],
        )).rows[0];
        if (!stock) throw new RefundConflictError(`Product ${item.productId} is unavailable for restock.`);

        await tx.query(
          `INSERT INTO prodx_refund_items
            (id,organization_id,store_id,refund_id,order_item_id,product_id,quantity)
           VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [crypto.randomUUID(), order.organization_id, request.storeId, refundId, orderItem.id, item.productId, item.quantity],
        );
        await tx.query(
          `INSERT INTO prodx_inventory_ledger
            (id,organization_id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id)
           VALUES($1,$2,$3,$4,$5,$6,'refund_restock',$7,$8)`,
          [crypto.randomUUID(), order.organization_id, request.storeId, item.productId, item.quantity, stock.current_stock, refundId, request.authorizedByUserId],
        );
      }

      await tx.query(
        `INSERT INTO prodx_cash_movements
          (id,organization_id,store_id,shift_id,type,amount,reason,performed_by_user_id,currency)
         VALUES($1,$2,$3,$4,'cash_refund',$5,$6,$7,$8)`,
        [crypto.randomUUID(), order.organization_id, request.storeId, shift.id, numeric(amount),
          `Refund for Order #${order.order_number}: ${request.reason.trim()}`, request.authorizedByUserId, currency],
      );

      const refundedAfter = refundedBefore + amount;
      const status = refundedAfter === orderTotal ? 'refunded' : 'server_confirmed';
      await tx.query(
        `UPDATE prodx_orders SET status=$1 WHERE id=$2 AND store_id=$3`,
        [status, request.orderId, request.storeId],
      );

      await tx.query(
        `INSERT INTO prodx_audit_log
          (id,organization_id,store_id,register_id,user_id,action,severity,details)
         VALUES($1,$2,$3,$4,$5,'order_refund_committed','critical',$6::jsonb)`,
        [crypto.randomUUID(), order.organization_id, request.storeId, order.register_id, request.authorizedByUserId,
          JSON.stringify({ refundId, orderId: request.orderId, amount: numeric(amount), method: request.refundMethod,
            reason: request.reason.trim(), idempotencyKey: request.idempotencyKey })],
      );

      return {
        success: true,
        refundId,
        orderId: request.orderId,
        status,
        refundedAmount: { amountInCents: Number(amount), currency },
        message: 'Refund committed atomically with cash and inventory ledger entries.',
        idempotencyCached: false,
      };
    });
  },
});
