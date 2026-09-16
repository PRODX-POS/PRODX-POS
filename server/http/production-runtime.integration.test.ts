import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresPool } from '../db/postgres';
import { hashSessionToken } from '../auth/session';
import { createProductionApp } from './production-runtime';

const url = process.env.DATABASE_URL;
const pool = url ? createPostgresPool({ connectionString: url, max: 8 }) : null;
const ids = {
  org: '00000000-0000-4000-8000-000000002101',
  store: '00000000-0000-4000-8000-000000002102',
  otherStore: '00000000-0000-4000-8000-000000002103',
  user: '00000000-0000-4000-8000-000000002104',
  device: '00000000-0000-4000-8000-000000002105',
  session: '00000000-0000-4000-8000-000000002106',
  role: '00000000-0000-4000-8000-000000002107',
};
const token = 'm7-runtime-bearer-token-20260916-01';

async function clean() {
  if (!pool) return;
  await pool.query('DELETE FROM prodx_user_roles WHERE user_id=$1', [ids.user]);
  await pool.query('DELETE FROM prodx_sessions WHERE id=$1', [ids.session]);
  await pool.query('DELETE FROM prodx_devices WHERE id=$1', [ids.device]);
  await pool.query('DELETE FROM prodx_store_memberships WHERE user_id=$1', [ids.user]);
  await pool.query('DELETE FROM prodx_roles WHERE id=$1', [ids.role]);
  await pool.query('DELETE FROM prodx_users WHERE id=$1', [ids.user]);
  await pool.query('DELETE FROM prodx_stores WHERE id IN ($1,$2)', [ids.store, ids.otherStore]);
  await pool.query('DELETE FROM prodx_organizations WHERE id=$1', [ids.org]);
}

async function seed() {
  if (!pool) throw new Error('DATABASE_URL required');
  await clean();
  await pool.query("INSERT INTO prodx_organizations(id,code,name) VALUES($1,'m7-runtime','M7 Runtime')", [ids.org]);
  await pool.query("INSERT INTO prodx_stores(id,organization_id,code,name,business_timezone) VALUES($1,$3,'runtime','Runtime Store','Asia/Bangkok'),($2,$3,'other','Other Store','Asia/Bangkok')", [ids.store, ids.otherStore, ids.org]);
  await pool.query("INSERT INTO prodx_users(id,organization_id,username,display_name,status) VALUES($1,$2,'runtime-user','Runtime User','active')", [ids.user, ids.org]);
  await pool.query('INSERT INTO prodx_store_memberships(organization_id,store_id,user_id) VALUES($1,$2,$3)', [ids.org, ids.store, ids.user]);
  await pool.query("INSERT INTO prodx_devices(id,organization_id,store_id,device_key,name,status) VALUES($1,$2,$3,'runtime-device','Runtime Device','active')", [ids.device, ids.org, ids.store]);
  await pool.query("INSERT INTO prodx_sessions(id,organization_id,user_id,device_id,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP + interval '1 hour')", [ids.session, ids.org, ids.user, ids.device, hashSessionToken(token)]);
  await pool.query("INSERT INTO prodx_roles(id,organization_id,role_key,name) VALUES($1,$2,'runtime-pos','Runtime POS')", [ids.role, ids.org]);
}

async function grantPermission(permissionKey: string) {
  if (!pool) throw new Error('DATABASE_URL required');
  await pool.query("INSERT INTO prodx_user_roles(organization_id,user_id,role_id,store_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING", [ids.org, ids.user, ids.role, ids.store]);
  await pool.query("INSERT INTO prodx_role_permissions(organization_id,role_id,permission_id) SELECT $1,$2,id FROM prodx_permissions WHERE permission_key=$3 ON CONFLICT DO NOTHING", [ids.org, ids.role, permissionKey]);
}

test('production HTTP runtime enforces authentication, permission, store scope, and sync replay gates', async t => {
  if (!pool) {
    t.skip('DATABASE_URL not configured');
    return;
  }
  await seed();
  const { app, pool: runtimePool } = createProductionApp();
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await runtimePool.end();
    await clean();
    await pool.end();
  });

  const syncBody = {
    type: 'order_transaction',
    idempotencyKey: 'offline-runtime-idem-01',
    payload: {
      idempotencyKey: 'offline-runtime-idem-01',
      storeId: ids.store,
      registerId: '00000000-0000-4000-8000-000000002108',
      cashierId: ids.user,
      items: [],
      totals: { grossSubtotal: { amountInCents: 0, currency: 'THB' }, itemDiscounts: { amountInCents: 0, currency: 'THB' }, orderDiscount: { amountInCents: 0, currency: 'THB' }, netSubtotal: { amountInCents: 0, currency: 'THB' }, totalTax: { amountInCents: 0, currency: 'THB' }, grandTotal: { amountInCents: 0, currency: 'THB' }, totalItemsCount: 0 },
      payments: [],
      isOfflineSubmission: true,
    },
  };

  const unauthenticated = await fetch(`${base}/api/v1/sync/outbox`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(syncBody) });
  assert.equal(unauthenticated.status, 401);

  const forbidden = await fetch(`${base}/api/v1/sync/outbox`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(syncBody) });
  assert.equal(forbidden.status, 403);

  await grantPermission('pos.checkout');
  const scopeDenied = await fetch(`${base}/api/v1/sync/outbox`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ ...syncBody, payload: { ...syncBody.payload, storeId: ids.otherStore } }) });
  assert.equal(scopeDenied.status, 403);

  const unsupported = await fetch(`${base}/api/v1/sync/outbox`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'shift_movement', idempotencyKey: 'offline-runtime-idem-02', payload: {} }) });
  assert.equal(unsupported.status, 400);

  const health = await fetch(`${base}/api/v1/health`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
});
