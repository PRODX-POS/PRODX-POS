import { describe, expect, it } from 'vitest';
import { createPaymentLifecycleService, PaymentLifecycleError } from './payment-lifecycle';

describe('payment lifecycle PostgreSQL contract', () => {
  it('requires a store-scoped payment reference and rejects cross-order transitions', async () => {
    const db = (await import('../db/postgres-test-harness')).createPostgresTestHarness();
    await db.migrate();
    const fixture = await db.seedPaymentFixture();
    const service = createPaymentLifecycleService(db);
    await expect(service.transition({ storeId: fixture.storeId, orderId: fixture.otherOrderId, paymentId: fixture.paymentId, idempotencyKey: 'm8-cross-order', to: 'captured', provider: 'test' })).rejects.toBeInstanceOf(PaymentLifecycleError);
    await db.close();
  });

  it('replays the same payment transition idempotently', async () => {
    const db = (await import('../db/postgres-test-harness')).createPostgresTestHarness();
    await db.migrate();
    const fixture = await db.seedPaymentFixture({ status: 'authorized' });
    const service = createPaymentLifecycleService(db);
    const input = { storeId: fixture.storeId, orderId: fixture.orderId, paymentId: fixture.paymentId, idempotencyKey: 'm8-replay', to: 'captured' as const, provider: 'test', providerReference: 'capture-1' };
    const first = await service.transition(input);
    const second = await service.transition(input);
    expect(second.id).toBe(first.id);
    expect(await db.count('prodx_payment_attempts', { store_id: fixture.storeId, idempotency_key: input.idempotencyKey })).toBe(1);
    await db.close();
  });
});
