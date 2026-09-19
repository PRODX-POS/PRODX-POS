import assert from 'node:assert/strict';
import test from 'node:test';
import { createPaymentLifecycleService, PaymentLifecycleError } from './payment-lifecycle';

type Row = Record<string, any>;

const executor = (payment: Row, attempts: Row[] = []) => {
  const tx = {
    query: async (sql: string) => {
      if (sql.includes('FROM prodx_payment_attempts')) return { rows: attempts };
      if (sql.includes('FROM prodx_payments')) return { rows: [payment] };
      if (sql.startsWith('UPDATE prodx_payments')) { payment.status = 'captured'; return { rows: [] }; }
      if (sql.includes('INSERT INTO prodx_payment_attempts')) return { rows: [{ id: 'attempt-1', status: payment.status }] };
      return { rows: [] };
    },
  };
  return { transaction: async (fn: any) => fn(tx) } as any;
};

test('payment lifecycle returns the existing attempt for an idempotency replay', async () => {
  const existing = { id: 'attempt-1', status: 'captured' };
  const db = executor({ id: 'pay-1', order_id: 'ord-1', status: 'authorized' }, [existing]);
  const result = await createPaymentLifecycleService(db).transition({ storeId: 'store-1', orderId: 'ord-1', paymentId: 'pay-1', idempotencyKey: 'idem-1', to: 'captured', provider: 'terminal', providerReference: 'ref-1' });
  assert.deepEqual(result, existing);
});

test('payment lifecycle rejects a cross-order payment transition', async () => {
  const db = executor({ id: 'pay-1', order_id: 'other-order', status: 'authorized' });
  await assert.rejects(createPaymentLifecycleService(db).transition({ storeId: 'store-1', orderId: 'ord-1', paymentId: 'pay-1', idempotencyKey: 'idem-2', to: 'captured', provider: 'terminal' }), PaymentLifecycleError);
});

test('payment lifecycle rejects an invalid status transition', async () => {
  const db = executor({ id: 'pay-1', order_id: 'ord-1', status: 'failed' });
  await assert.rejects(createPaymentLifecycleService(db).transition({ storeId: 'store-1', orderId: 'ord-1', paymentId: 'pay-1', idempotencyKey: 'idem-3', to: 'captured', provider: 'terminal' }), /Invalid payment transition failed -> captured/);
});
