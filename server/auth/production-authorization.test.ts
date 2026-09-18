import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresAuthorization } from './production-authorization';

const context = {
  requestId: 'req-1',
  principal: { userId: 'user-1', organizationId: 'org-1', storeId: 'store-1' },
};

test('authorizes a permission only from an active tenant/store role grant', async () => {
  const calls: Array<{ sql: string; parameters: readonly unknown[] }> = [];
  const db = {
    query: async <T extends Record<string, unknown>>(sql: string, parameters: readonly unknown[] = []) => {
      calls.push({ sql, parameters });
      return [{
        userId: 'user-1',
        organizationId: 'org-1',
        storeId: 'store-1',
        permission_key: 'pos.refund',
      }] as unknown as readonly T[];
    },
  };

  const authorize = createPostgresAuthorization(db);
  assert.equal(await authorize(context, 'pos.refund'), true);
  assert.deepEqual(calls[0].parameters, ['org-1', 'store-1', 'user-1', 'pos.refund']);
});

test('denies when PostgreSQL resolves no active grant', async () => {
  const db = {
    query: async <T extends Record<string, unknown>>(_sql: string, _parameters: readonly unknown[] = []) =>
      [] as unknown as readonly T[],
  };

  const authorize = createPostgresAuthorization(db);
  assert.equal(await authorize(context, 'pos.refund'), false);
});
