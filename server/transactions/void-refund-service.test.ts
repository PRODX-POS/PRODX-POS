import assert from 'node:assert/strict';
import test from 'node:test';
import { createVoidRefundService, VoidRefundValidationError } from './void-refund-service';

test('M7 refund rejects malformed monetary input before opening a transaction', async () => {
  let transactions = 0;
  const service = createVoidRefundService({
    transaction: async () => { transactions += 1; throw new Error('transaction should not start'); },
  } as never);
  await assert.rejects(
    service.refund({
      storeId:'store', orderId:'order', idempotencyKey:'refund',
      refundAmount:{amountInCents:0,currency:'THB'}, reason:'return', refundMethod:'cash', authorizedByUserId:'user',
    }),
    (error: unknown) => error instanceof VoidRefundValidationError,
  );
  assert.equal(transactions, 0);
});

test('M7 void rejects blank authorization reason before opening a transaction', async () => {
  let transactions = 0;
  const service = createVoidRefundService({ transaction: async () => { transactions += 1; } } as never);
  await assert.rejects(
    service.voidOrder({storeId:'store',orderId:'order',idempotencyKey:'void',reason:'   ',authorizedByUserId:'user'}),
    (error: unknown) => error instanceof VoidRefundValidationError,
  );
  assert.equal(transactions, 0);
});
