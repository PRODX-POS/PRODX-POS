import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './createApp';
import { registerRefundVoidRoutes } from './refund-void-route';
import type { TransactionalSqlExecutor } from '../db/transaction';

const principal = { userId: '00000000-0000-4000-8000-000000000001', organizationId: '00000000-0000-4000-8000-000000000002', storeId: '00000000-0000-4000-8000-000000000003' };
const orderId = '00000000-0000-4000-8000-000000000010';
const productId = '00000000-0000-4000-8000-000000000011';

const unusedDb = (): TransactionalSqlExecutor => ({
  query: async () => { throw new Error('database must not be reached for invalid HTTP payloads'); },
  transaction: async () => { throw new Error('database must not be reached for invalid HTTP payloads'); },
});

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

const appWithRoutes = () => createApp({
  authenticateRequest: () => principal,
  authorizeRequest: () => true,
  configureRoutes: (app) => registerRefundVoidRoutes(app, unusedDb()),
});

test('rejects non-integer refund amount at the HTTP boundary', async () => {
  const server = await start(appWithRoutes());
  try {
    const response = await fetch(`${server.baseUrl}/api/v1/orders/${orderId}/refund`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amountInCents: '1000', currency: 'THB', reason: 'customer request', refundMethod: 'cash', idempotencyKey: 'refund-1', itemsToRestock: [] }),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_REQUEST');
  } finally { await server.close(); }
});

test('rejects unknown refund fields instead of silently accepting them', async () => {
  const server = await start(appWithRoutes());
  try {
    const response = await fetch(`${server.baseUrl}/api/v1/orders/${orderId}/refund`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amountInCents: 1000, currency: 'THB', reason: 'customer request', refundMethod: 'cash', idempotencyKey: 'refund-2', itemsToRestock: [], clientApproved: true }),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_REQUEST');
  } finally { await server.close(); }
});

test('rejects malformed refund item payloads at the HTTP boundary', async () => {
  const server = await start(appWithRoutes());
  try {
    const response = await fetch(`${server.baseUrl}/api/v1/orders/${orderId}/refund`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amountInCents: 1000, currency: 'THB', reason: 'customer request', refundMethod: 'cash', idempotencyKey: 'refund-3', itemsToRestock: [{ productId, quantity: 1.5 }] }),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_REQUEST');
  } finally { await server.close(); }
});

test('rejects unknown void fields at the HTTP boundary', async () => {
  const server = await start(appWithRoutes());
  try {
    const response = await fetch(`${server.baseUrl}/api/v1/orders/${orderId}/void`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'duplicate sale', idempotencyKey: 'void-1', amountInCents: 1000 }),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_REQUEST');
  } finally { await server.close(); }
});
