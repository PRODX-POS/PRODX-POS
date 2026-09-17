import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresAuthorizer } from './authorization';

type AuthorizationRow = { allowed: boolean };
type TestExecutor = {
  query(sql: string, parameters?: readonly unknown[]): Promise<readonly AuthorizationRow[]>;
};

const context = {
  requestId: 'req-1',
  principal: { userId: 'user-1', organizationId: 'org-1', storeId: 'store-1' },
};

test('PostgreSQL authorizer denies blank permissions without querying', async () => {
  let queried = false;
  const db: TestExecutor = {
    query: async () => {
      queried = true;
      return [];
    },
  };

  const authorize = createPostgresAuthorizer(db);
  assert.equal(await authorize(context, '   '), false);
  assert.equal(queried, false);
});

test('PostgreSQL authorizer binds organization, user, store, and exact permission', async () => {
  let parameters: readonly unknown[] = [];
  const db: TestExecutor = {
    query: async (_sql, suppliedParameters) => {
      parameters = suppliedParameters ?? [];
      return [{ allowed: true }];
    },
  };

  const authorize = createPostgresAuthorizer(db);
  assert.equal(await authorize(context, 'pos.sell'), true);
  assert.deepEqual(parameters, ['org-1', 'user-1', 'store-1', 'pos.sell']);
});

test('PostgreSQL authorizer fails closed when the database does not grant the permission', async () => {
  const db: TestExecutor = {
    query: async () => [{ allowed: false }],
  };

  const authorize = createPostgresAuthorizer(db);
  assert.equal(await authorize(context, 'pos.refund'), false);
});
