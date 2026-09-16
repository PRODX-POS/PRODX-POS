import { describe, expect, it } from 'vitest';
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
    await expect(createTransactionMutationService(executor(fake) as any).voidOrder('store-a', 'order-a', 'mistake', 'user-a')).rejects.toThrow('Order not found in this store.');
    expect(fake.queries).toHaveLength(1);
  });

  it('rejects refund amounts above the order total before inserting a refund', async () => {
    const fake = db();
    fake.queue.push([{ id: 'order-a', organization_id: 'org-a', status: 'server_confirmed', grand_total_amount: '100.00', register_id: 'register-a' }]);
    fake.queue.push([{ total: '90.00' }]);
    await expect(createTransactionMutationService(executor(fake) as any).refundOrder('store-a', 'order-a', '20.00', 'customer request', 'cash', 'user-a')).rejects.toThrow('Refund amount exceeds remaining refundable amount.');
    expect(fake.queries.some(q => q.sql.includes('INSERT INTO prodx_refunds'))).toBe(false);
  });

  it('requires an open shift before recording cash movement', async () => {
    const fake = db();
    fake.queue.push([]);
    await expect(createTransactionMutationService(executor(fake) as any).recordCashMovement('shift-a', 'store-a', 'paid_in', '10.00', 'cash top-up', 'user-a')).rejects.toThrow(TransactionMutationError);
  });
});
