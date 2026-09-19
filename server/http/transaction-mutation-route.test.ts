import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './createApp';
import { registerTransactionMutationRoutes } from './transaction-mutation-route';

const principal = { userId: 'user-1', organizationId: 'org-1', storeId: 'store-1' };

const start = async (app: ReturnType<typeof createApp>) => {
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
};

const unreachableDb = {
  query: async () => { throw new Error('database should not be reached by boundary tests'); },
  transaction: async () => { throw new Error('database should not be reached by boundary tests'); },
} as never;

const makeApp = (allowed = true) => {
  const app = createApp({
    authenticateRequest: () => principal,
    authorizeRequest: (_context, permission) => allowed && permission.startsWith('pos.'),
    configureRoutes: configuredApp => registerTransactionMutationRoutes(configuredApp, unreachableDb),
  });
  return app;
};

test('mutation routes are protected by explicit permission', async () => {
  const app = makeApp(false);
  const server = await start(app);
  try {
    const response = await fetch(`${server.baseUrl}/api/v1/orders/order-1/void`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'customer request', authorizedByUserId: principal.userId }),
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'FORBIDDEN');
  } finally {
    await server.close();
  }
});

test('mutation routes reject cross-store request bodies before database mutation', async () => {
  const app = makeApp();
  const server = await start(app);
  try {
    const response = await fetch(`${server.baseUrl}/api/v1/orders/order-1/void`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ storeId: 'store-2', reason: 'customer request', authorizedByUserId: principal.userId }),
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'TRANSACTION_MUTATION_FAILED');
  } finally {
    await server.close();
  }
});

test('mutation routes reject authorizer impersonation before database mutation', async () => {
  const app = makeApp();
  const server = await start(app);
  try {
    const response = await fetch(`${server.baseUrl}/api/v1/orders/order-1/void`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'customer request', authorizedByUserId: 'other-user' }),
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'TRANSACTION_MUTATION_FAILED');
  } finally {
    await server.close();
  }
});
