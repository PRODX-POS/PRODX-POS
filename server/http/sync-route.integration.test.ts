import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresPool } from '../db/postgres';
import { createTransactionalPostgresExecutor } from '../db/transaction';
import { createApp } from './createApp';
import { registerSyncRoute } from './sync-route';
import type { CheckoutRequest } from '../../src/adapters/types';

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? createPostgresPool({ connectionString: databaseUrl, max: 8 }) : null;
const db = pool ? createTransactionalPostgresExecutor(pool) : null;

const ids = {
  org: '00000000-0000-4000-8000-000000002001',
  store: '00000000-0000-4000-8000-000000002002',
  user: '00000000-0000-4000-8000-000000002004',
  register: '00000000-0000-4000-8000-000000002005',
  shift: '00000000-0000-4000-8000-000000002006',
  category: '00000000-0000-4000-8000-000000002007',
  product: '00000000-0000-4000-8000-000000002008',
  payment: '00000000-0000-4000-8000-000000002009',
};

const checkoutRequest = (idempotencyKey: string, overrides: Partial<CheckoutRequest> = {}): CheckoutRequest => ({
  idempotencyKey,
  storeId: ids.store,
  registerId: ids.register,
  cashierId: ids.user,
  items: [{
    lineId: 'line-1',
    product: {
      id: ids.product,
      storeId: ids.store,
      sku: 'SYNC-1',
      barcode: 'SYNC-1',
      name: 'Sync Product',
      categoryId: ids.category,
      price: { amountInCents: 1000, currency: 'THB' },
      costPrice: { amountInCents: 500, currency: 'THB' },
      taxRateBps: 0,
      currentStock: 20,
      reorderPoint: 1,
      unitOfMeasure: 'each',
    },
    quantity: 2,
    unitPrice: { amountInCents: 1000, currency: 'THB' },
    discountBps: 0,
    lineSubtotal: { amountInCents: 2000, currency: 'THB' },
    lineTax: { amountInCents: 0, currency: 'THB' },
    lineTotal: { amountInCents: 2000, currency: 'THB' },
  }],
  totals: {
    grossSubtotal: { amountInCents: 2000, currency: 'THB' },
    itemDiscounts: { amountInCents: 0, currency: 'THB' },
    orderDiscount: { amountInCents: 0, currency: 'THB' },
    netSubtotal: { amountInCents: 2000, currency: 'THB' },
    totalTax: { amountInCents: 0, currency: 'THB' },
    grandTotal: { amountInCents: 2000, currency: 'THB' },
    totalItemsCount: 2,
  },
  payments: [{
    id: ids.payment,
    method: 'cash',
    amount: { amountInCents: 2000, currency: 'THB' },
    tenderedCash: { amountInCents: 2000, currency: 'THB' },
    changeGiven: { amountInCents: 0, currency: 'THB' },
    timestamp: '2026-09-17T00:00:00.000Z',
  }],
  ...overrides,
});

const command = (commandId: string, key: string, payload = checkoutRequest(key)) => ({
  commandId,
  type: 'order_transaction',
  idempotencyKey: key,
  payload,
});

async function seed(): Promise<void> {
  if (!pool) throw new Error('DATABASE_URL required');
  await pool.query('DELETE FROM prodx_sync_commands WHERE store_id=$1', [ids.store]);
  await pool.query('DELETE FROM prodx_cash_movements WHERE shift_id=$1', [ids.shift]);
  await pool.query('DELETE FROM prodx_audit_log WHERE store_id=$1', [ids.store]);
  await pool.query('DELETE FROM prodx_payments WHERE store_id=$1', [ids.store]);
  await pool.query('DELETE FROM prodx_order_items WHERE store_id=$1', [ids.store]);
  await pool.query('DELETE FROM prodx_inventory_ledger WHERE store_id=$1', [ids.store]);
  await pool.query('DELETE FROM prodx_orders WHERE store_id=$1', [ids.store]);
  await pool.query('DELETE FROM prodx_shifts WHERE id=$1', [ids.shift]);
  await pool.query('DELETE FROM prodx_products WHERE id=$1', [ids.product]);
  await pool.query('DELETE FROM prodx_categories WHERE id=$1', [ids.category]);
  await pool.query('DELETE FROM prodx_registers WHERE id=$1', [ids.register]);
  await pool.query('DELETE FROM prodx_store_memberships WHERE store_id=$1', [ids.store]);
  await pool.query('DELETE FROM prodx_users WHERE id=$1', [ids.user]);
  await pool.query('DELETE FROM prodx_stores WHERE id=$1', [ids.store]);
  await pool.query('DELETE FROM prodx_organizations WHERE id=$1', [ids.org]);

  await pool.query('INSERT INTO prodx_organizations(id,code,name) VALUES($1,$2,$3)', [ids.org, 'sync-it', 'Sync Integration']);
  await pool.query("INSERT INTO prodx_stores(id,organization_id,code,name,business_timezone) VALUES($1,$2,'sync-1','Sync Store','Asia/Bangkok')", [ids.store, ids.org]);
  await pool.query('INSERT INTO prodx_users(id,organization_id,username,display_name) VALUES($1,$2,$3,$4)', [ids.user, ids.org, 'sync-user', 'Sync User']);
  await pool.query('INSERT INTO prodx_store_memberships(organization_id,store_id,user_id) VALUES($1,$2,$3)', [ids.org, ids.store, ids.user]);
  await pool.query('INSERT INTO prodx_registers(id,organization_id,store_id,code,name) VALUES($1,$2,$3,$4,$5)', [ids.register, ids.org, ids.store, 'SYNC-R1', 'Sync Register']);
  await pool.query("INSERT INTO prodx_shifts(id,organization_id,store_id,register_id,cashier_id,opening_float_amount,currency) VALUES($1,$2,$3,$4,$5,0,'THB')", [ids.shift, ids.org, ids.store, ids.register, ids.user]);
  await pool.query('INSERT INTO prodx_categories(id,organization_id,store_id,name,slug) VALUES($1,$2,$3,$4,$5)', [ids.category, ids.org, ids.store, 'Sync Category', 'sync-category']);
  await pool.query("INSERT INTO prodx_products(id,organization_id,store_id,category_id,sku,barcode,name,price_amount,cost_price_amount,currency,tax_rate_bps,current_stock,reorder_point,unit_of_measure) VALUES($1,$2,$3,$4,'SYNC-1','SYNC-1','Sync Product',10,5,'THB',0,20,1,'each')", [ids.product, ids.org, ids.store, ids.category]);
}

async function makeServer(): Promise<{ server: import('node:http').Server; baseUrl: string }> {
  if (!db) throw new Error('DATABASE_URL required');
  const app = createApp({
    authenticateRequest: async () => ({ userId: ids.user, organizationId: ids.org, storeId: ids.store }),
    authorizeRequest: async () => true,
    configureRoutes: (configuredApp) => registerSyncRoute(configuredApp, db),
  });
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function post(baseUrl: string, body: unknown): Promise<Response> {
  return fetch(`${baseUrl}/api/v1/sync/commands`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('PostgreSQL sync command lifecycle is terminal, replay-safe and conflict-safe', async (t) => {
  if (!pool || !db) {
    t.skip('DATABASE_URL not configured');
    return;
  }
  await seed();
  const { server, baseUrl } = await makeServer();
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pool.query('DELETE FROM prodx_sync_commands WHERE store_id=$1', [ids.store]);
    await pool.query('DELETE FROM prodx_cash_movements WHERE shift_id=$1', [ids.shift]);
    await pool.query('DELETE FROM prodx_audit_log WHERE store_id=$1', [ids.store]);
    await pool.query('DELETE FROM prodx_payments WHERE store_id=$1', [ids.store]);
    await pool.query('DELETE FROM prodx_order_items WHERE store_id=$1', [ids.store]);
    await pool.query('DELETE FROM prodx_inventory_ledger WHERE store_id=$1', [ids.store]);
    await pool.query('DELETE FROM prodx_orders WHERE store_id=$1', [ids.store]);
    await pool.query('DELETE FROM prodx_shifts WHERE id=$1', [ids.shift]);
    await pool.query('DELETE FROM prodx_products WHERE id=$1', [ids.product]);
    await pool.query('DELETE FROM prodx_categories WHERE id=$1', [ids.category]);
    await pool.query('DELETE FROM prodx_registers WHERE id=$1', [ids.register]);
    await pool.query('DELETE FROM prodx_store_memberships WHERE store_id=$1', [ids.store]);
    await pool.query('DELETE FROM prodx_users WHERE id=$1', [ids.user]);
    await pool.query('DELETE FROM prodx_stores WHERE id=$1', [ids.store]);
    await pool.query('DELETE FROM prodx_organizations WHERE id=$1', [ids.org]);
    await pool.end();
  });

  const first = await post(baseUrl, command('cmd-complete', 'sync-complete'));
  assert.equal(first.status, 201);
  const replay = await post(baseUrl, command('cmd-complete', 'sync-complete'));
  assert.equal(replay.status, 200);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM prodx_orders WHERE idempotency_key=$1', ['sync-complete'])).rows[0].n, 1);

  const conflict = await post(baseUrl, command('cmd-complete', 'sync-other', checkoutRequest('sync-other')));
  assert.equal(conflict.status, 409);
  assert.equal((await pool.query('SELECT status FROM prodx_sync_commands WHERE command_id=$1', ['cmd-complete'])).rows[0].status, 'complete');

  await pool.query('UPDATE prodx_products SET current_stock=0 WHERE id=$1', [ids.product]);
  const failed = await post(baseUrl, command('cmd-failed', 'sync-failed'));
  assert.equal(failed.status, 409);
  assert.equal((await pool.query('SELECT status FROM prodx_sync_commands WHERE command_id=$1', ['cmd-failed'])).rows[0].status, 'failed');
  await pool.query('UPDATE prodx_products SET current_stock=20 WHERE id=$1', [ids.product]);
  const retried = await post(baseUrl, command('cmd-failed', 'sync-failed'));
  assert.equal(retried.status, 201);
  assert.equal((await pool.query('SELECT status FROM prodx_sync_commands WHERE command_id=$1', ['cmd-failed'])).rows[0].status, 'complete');

  const concurrent = await Promise.all([
    post(baseUrl, command('cmd-concurrent', 'sync-concurrent')),
    post(baseUrl, command('cmd-concurrent', 'sync-concurrent')),
    post(baseUrl, command('cmd-concurrent', 'sync-concurrent')),
  ]);
  assert.ok(concurrent.every((response) => response.status === 200 || response.status === 201));
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM prodx_orders WHERE idempotency_key=$1', ['sync-concurrent'])).rows[0].n, 1);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM prodx_sync_commands WHERE command_id=$1', ['cmd-concurrent'])).rows[0].n, 1);
});
