import type { TransactionalSqlExecutor } from '../db/transaction';

export type PaymentLifecycleStatus = 'authorized' | 'captured' | 'failed' | 'cancelled' | 'unknown';

export class PaymentLifecycleError extends Error {
  readonly code = 'PAYMENT_LIFECYCLE_CONFLICT';
}

export const createPaymentLifecycleService = (db: TransactionalSqlExecutor) => ({
  async transition(input: {
    storeId: string;
    orderId: string;
    paymentId: string;
    idempotencyKey: string;
    to: PaymentLifecycleStatus;
    provider: string;
    providerReference?: string;
    failureCode?: string;
    failureReason?: string;
  }) {
    if (!input.idempotencyKey.trim()) throw new PaymentLifecycleError('Payment idempotency key is required.');
    return db.transaction(async tx => {
      const existing = (await tx.query(
        `SELECT * FROM prodx_payment_attempts WHERE store_id=$1 AND idempotency_key=$2 LIMIT 1`,
        [input.storeId, input.idempotencyKey],
      )).rows[0];
      if (existing) return existing;

      const payment = (await tx.query(
        `SELECT * FROM prodx_payments WHERE id=$1 AND store_id=$2 FOR UPDATE`,
        [input.paymentId, input.storeId],
      )).rows[0];
      if (!payment || payment.order_id !== input.orderId) throw new PaymentLifecycleError('Payment does not belong to the requested store and order.');

      const current = payment.status as PaymentLifecycleStatus;
      const allowed = (current === 'authorized' && input.to === 'captured') ||
        (current === 'pending' && ['authorized', 'failed', 'cancelled', 'unknown'].includes(input.to));
      if (!allowed && current !== input.to) throw new PaymentLifecycleError(`Invalid payment transition ${current} -> ${input.to}.`);

      await tx.query(
        `UPDATE prodx_payments SET status=$1, provider=$2, provider_reference=COALESCE($3,provider_reference), captured_at=CASE WHEN $1='captured' THEN COALESCE(captured_at,CURRENT_TIMESTAMP) ELSE captured_at END, failure_code=$4, failure_reason=$5 WHERE id=$6 AND store_id=$7`,
        [input.to, input.provider, input.providerReference ?? null, input.failureCode ?? null, input.failureReason ?? null, input.paymentId, input.storeId],
      );
      const attempt = (await tx.query(
        `INSERT INTO prodx_payment_attempts(id,organization_id,store_id,order_id,payment_id,idempotency_key,provider,method,status,amount,currency,provider_reference,failure_code,failure_reason) SELECT gen_random_uuid(),organization_id,$1,order_id,$2,$3,$4,method,$5,amount,currency,$6,$7,$8 FROM prodx_payments WHERE id=$2 RETURNING *`,
        [input.storeId, input.paymentId, input.idempotencyKey, input.provider, input.to, input.providerReference ?? null, input.failureCode ?? null, input.failureReason ?? null],
      )).rows[0];
      await tx.query(
        `INSERT INTO prodx_audit_log(id,organization_id,store_id,register_id,user_id,action,severity,details) SELECT gen_random_uuid(),o.organization_id,o.store_id,o.register_id,o.cashier_id,'payment_lifecycle_transition','info',$1::jsonb FROM prodx_orders o WHERE o.id=$2 AND o.store_id=$3`,
        [JSON.stringify({ orderId: input.orderId, paymentId: input.paymentId, idempotencyKey: input.idempotencyKey, status: input.to, provider: input.provider, providerReference: input.providerReference ?? null }), input.orderId, input.storeId],
      );
      return attempt;
    });
  },
});
