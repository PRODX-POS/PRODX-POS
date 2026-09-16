import { describe, expect, it, vi } from 'vitest';
import { createPaymentLifecycleService, PaymentLifecycleError } from './payment-lifecycle';

type Row = Record<string, any>;

const executor = (payment: Row, attempts: Row[] = []) => {
  const calls: string[] = [];
  const tx = {
    query: vi.fn(async (sql: string) => {
      calls.push(sql);
      if (sql.includes('FROM prodx_payment_attempts')) return { rows: attempts };
      if (sql.includes('FROM prodx_payments')) return { rows: [payment] };
      if (sql.startsWith('UPDATE prodx_payments')) { payment.status = sql.includes("$1='captured'") ? 'captured' : payment.status; return { rows: [] }; }
      if (sql.includes('INSERT INTO prodx_payment_attempts')) return { rows: [{ id: 'attempt-1', status: payment.status }] };
      return { rows: [] };
    }),
  };
  return { db: { transaction: async (fn: any) => fn(tx) } as any, calls };
};

describe('payment lifecycle service', () => {
  it('returns the existing attempt for an idempotency replay', async () => {
    const existing = { id: 'attempt-1', status: 'captured' };
    const { db } = executor({ id: 'pay-1', order_id: 'ord-1', status: 'authorized' }, [existing]);
    const result = await createPaymentLifecycleService(db).transition({ storeId: 'store-1', orderId: 'ord-1', paymentId: 'pay-1', idempotencyKey: 'idem-1', to: 'captured', provider: 'terminal', providerReference: 'ref-1' });
    expect(result).toEqual(existing);
  });

  it('rejects a cross-order payment transition', async () => {
    const { db } = executor({ id: 'pay-1', order_id: 'other-order', status: 'authorized' });
    await expect(createPaymentLifecycleService(db).transition({ storeId: 'store-1', orderId: 'ord-1', paymentId: 'pay-1', idempotencyKey: 'idem-2', to: 'captured', provider: 'terminal' })).rejects.toBeInstanceOf(PaymentLifecycleError);
  });

  it('rejects an invalid status transition', async () => {
    const { db } = executor({ id: 'pay-1', order_id: 'ord-1', status: 'failed' });
    await expect(createPaymentLifecycleService(db).transition({ storeId: 'store-1', orderId: 'ord-1', paymentId: 'pay-1', idempotencyKey: 'idem-3', to: 'captured', provider: 'terminal' })).rejects.toThrow('Invalid payment transition failed -> captured.');
  });
});
