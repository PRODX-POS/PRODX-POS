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

// Postgres renders NUMERIC(12,2) aggregates without a fixed decimal scale when the
// value is a bare integer (e.g. the `0` fallback of `COALESCE(SUM(amount), 0)`), so
// this must accept both the "12.34" and the bare "0" / "12" forms.
const dbCents = (value: unknown): bigint => {
  const text = String(value);
  const withDecimals = /^(\d+)\.(\d{2})$/.exec(text);
  if (withDecimals) return BigInt(withDecimals[1]) * 100n + BigInt(withDecimals[2]);
  const wholeOnly = /^(\d+)$/.exec(text);
  if (wholeOnly) return BigInt(wholeOnly[1]) * 100n;
  throw new RefundValidationError('Database monetary value is invalid.');
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

    // Validate restock items up front (no DB side effects yet) so the sum of the
    // itemized restock amounts can never diverge from the refund's cash amount.
    const restock = request.itemsToRestock ?? [];
    const seenProducts = new Set<string>();
    let restockAmountTotal = 0n;
    for (const item of restock) {
      const amountInCents = item.amountInCents;
      if (
        !item.productId ||
        !Number.isInteger(item.quantity) || item.quantity <= 0 ||
        !Number.isInteger(amountInCents) || (amountInCents as number) <= 0 ||
        seenProducts.has(item.productId)
      ) {
        throw new RefundValidationError(
          'Restock items must contain unique products with a positive integer quantity and a positive integer refunded amount.',
        );
      }
      seenProducts.add(item.productId);
      restockAmountTotal += BigInt(amountInCents as number);
    }
    if (restock.length > 0 && restockAmountTotal > amount) {
      throw new RefundValidationError('The sum of restocked item amounts exceeds the refunded amount.');
    }

    return db.transaction(async (tx) => {
      const existing = (await tx.query(
        `SELECT r.id, r.order_id, r.amount::text AS amount, r.method, r.reason,
                r.authorized_by_user_id, o.currency
           FROM prodx_refunds r
           JOIN prodx_orders o ON o.id = r.order_id AND o.store_id = r.store_id
          WHERE r.store_id=$1 AND r.idempotency_key=$2
          LIMIT 1`,
        [request.storeId, request.idempotencyKey],
      )).rows[0];
      if (existing) {
        const isSameRequest =
          existing.order_id === request.orderId &&
          existing.method === request.refundMethod &&
          existing.reason === request.reason.trim() &&
          existing.authorized_by_user_id === request.authorizedByUserId &&
          existing.currency === request.refundAmount.currency &&
          dbCents(existing.amount) === amount;
        if (!isSameRequest) {
          throw new RefundConflictError('This idempotency key was already used for a different refund request.');
        }
        return {
          success: true,
          refundId: existing.id,
          orderId: existing.order_id,
          status: 'server_confirmed',
          refundedAmount: { amountInCents: Number(dbCents(existing.amount)), currency: existing.currency },
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

      for (const item of restock) {
        const itemAmount = BigInt(item.amountInCents as number);

        const orderItem = (await tx.query(
          `SELECT oi.id, oi.product_id, oi.quantity, oi.line_total_amount::text AS line_total
           FROM prodx_order_items oi
           WHERE oi.store_id=$1 AND oi.order_id=$2 AND oi.product_id=$3
           FOR UPDATE`,
          [request.storeId, request.orderId, item.productId],
        )).rows[0];
        if (!orderItem) throw new RefundValidationError(`Product ${item.productId} is not part of the order.`);

        const previous = (await tx.query(
          `SELECT COALESCE(SUM(quantity),0)::int AS quantity, COALESCE(SUM(amount),0)::text AS amount
           FROM prodx_refund_items ri
           WHERE ri.store_id=$1 AND ri.order_item_id=$2`,
          [request.storeId, orderItem.id],
        )).rows[0];
        const previousQuantity: number = previous.quantity;
        const previousAmount = dbCents(previous.amount);
        if (previousQuantity + item.quantity > orderItem.quantity) {
          throw new RefundConflictError(`Restock quantity exceeds the refundable quantity for product ${item.productId}.`);
        }
        const lineTotal = dbCents(orderItem.line_total);
        if (previousAmount + itemAmount > lineTotal) {
          throw new RefundConflictError(`Restock amount exceeds the refundable value for product ${item.productId}.`);
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
            (id,organization_id,store_id,refund_id,order_item_id,product_id,quantity,amount)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
          [crypto.randomUUID(), order.organization_id, request.storeId, refundId, orderItem.id, item.productId,
            item.quantity, numeric(itemAmount)],
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
