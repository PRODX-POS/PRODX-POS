import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTransactionMutationService, TransactionMutationError } from './void-refund-shift-cash.service';

type Row = Record<string, unknown>;

type FakeDb = {
  queue: Row[][];
  queries: Array<{ sql: string; parameters: readonly unknown[] }>;
};

const db = (): FakeDb => ({ queue: [], queries: [] });
const executor = (fake: FakeDb) => ({
  query: async <T extends Row>(sql: string, parameters: readonly unknown[] = []) => {
    fake.queries.push({ sql, parameters });
    return { rows: (fake.queue.shift() ?? []) as T[] };
  },
  transaction: async <T>(work: (tx: any) => Promise<T>) => work({
    query: async <R extends Row>(sql: string, parameters: readonly unknown[] = []) => {
      fake.queries.push({ sql, parameters });
      return { rows: (fake.queue.shift() ?? []) as R[] };
    },
  }),
});

describe('server authoritative transaction mutations', () => {
  it('rejects void for a missing order without performing writes', async () => {
    const fake = db();
    fake.queue.push([]);
    await assert.rejects(
      createTransactionMutationService(executor(fake) as any).voidOrder('store-a', 'order-a', 'mistake', 'user-a'),
      /Order not found in this store\./,
    );
    assert.equal(fake.queries.length, 1);
  });

  it('rejects refund amounts above the order total before inserting a refund', async () => {
    const fake = db();
    fake.queue.push([{ id: 'order-a', organization_id: 'org-a', status: 'server_confirmed', grand_total_amount: '100.00', register_id: 'register-a' }]);
    fake.queue.push([{ total: '90.00' }]);
    await assert.rejects(
      createTransactionMutationService(executor(fake) as any).refundOrder('store-a', 'order-a', '20.00', 'customer request', 'cash', 'user-a'),
      /Refund amount exceeds remaining refundable amount\./,
    );
    assert.equal(fake.queries.some(q => q.sql.includes('INSERT INTO prodx_refunds')), false);
  });

  it('requires an open shift before recording cash movement', async () => {
    const fake = db();
    fake.queue.push([]);
    await assert.rejects(
      createTransactionMutationService(executor(fake) as any).recordCashMovement('shift-a', 'store-a', 'paid_in', '10.00', 'cash top-up', 'user-a'),
      (error: unknown) => error instanceof TransactionMutationError,
    );
  });
});
