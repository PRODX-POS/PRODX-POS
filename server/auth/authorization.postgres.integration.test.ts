import assert from 'node:assert/strict';
import test from 'node:test';
import type { RequestContext } from '../http/types';
import { createPostgresPool, asSqlExecutor } from '../db/postgres';
import { createPostgresAuthorizer } from './authorization';

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? createPostgresPool({ connectionString: databaseUrl, max: 2 }) : null;
const authorization = pool ? createPostgresAuthorizer(asSqlExecutor(pool)) : null;

const context: RequestContext = {
  requestId: 'rbac-integration',
  principal: {
    userId: '00000000-0000-0000-0000-000000000011',
    organizationId: '00000000-0000-0000-0000-000000000001',
    storeId: '00000000-0000-0000-0000-000000000021',
  },
};

test('PostgreSQL RBAC authorizer enforces the seeded store-scoped permission', async (t) => {
  if (!authorization || !pool) {
    t.skip('DATABASE_URL is required for PostgreSQL integration coverage.');
    return;
  }

  assert.equal(await authorization(context, 'pos.sell'), true);
  assert.equal(await authorization(context, 'pos.refund'), false);
  assert.equal(await authorization(context, 'pos.sell'), true);
  await pool.end();
});
