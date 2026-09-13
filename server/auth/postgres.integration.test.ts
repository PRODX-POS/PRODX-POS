import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresPool, asSqlExecutor } from '../db/postgres';
import { createPostgresAuthentication } from './composition';
import { hashPassword } from './password';
import { hashSessionToken } from './session';

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? createPostgresPool({ connectionString: databaseUrl, max: 2 }) : null;
const authentication = pool ? createPostgresAuthentication(asSqlExecutor(pool)) : null;

const ids = {
  organizationA: '00000000-0000-4000-8000-000000000201',
  organizationB: '00000000-0000-4000-8000-000000000202',
  storeA: '00000000-0000-4000-8000-000000000211',
  storeB: '00000000-0000-4000-8000-000000000212',
  userA: '00000000-0000-4000-8000-000000000221',
  userB: '00000000-0000-4000-8000-000000000222',
  deviceA: '00000000-0000-4000-8000-000000000231',
  deviceB: '00000000-0000-4000-8000-000000000232',
};

const cleanup = async () => {
  if (!pool) return;
  await pool.query('DELETE FROM prodx_sessions WHERE organization_id IN ($1, $2)', [ids.organizationA, ids.organizationB]);
  await pool.query('DELETE FROM prodx_user_credentials WHERE user_id IN ($1, $2)', [ids.userA, ids.userB]);
  await pool.query('DELETE FROM prodx_devices WHERE id IN ($1, $2)', [ids.deviceA, ids.deviceB]);
  await pool.query('DELETE FROM prodx_users WHERE id IN ($1, $2)', [ids.userA, ids.userB]);
  await pool.query('DELETE FROM prodx_stores WHERE id IN ($1, $2)', [ids.storeA, ids.storeB]);
  await pool.query('DELETE FROM prodx_organizations WHERE id IN ($1, $2)', [ids.organizationA, ids.organizationB]);
};

test('M2 PostgreSQL authentication enforces credential, tenant, session, and token-hash invariants', async (t) => {
  if (!pool || !authentication) {
    t.skip('DATABASE_URL is not configured; run server:test:integration with PostgreSQL.');
    return;
  }

  const passwordHash = await hashPassword('correct-password');
  await cleanup();
  await pool.query(
    `INSERT INTO prodx_organizations (id, code, name) VALUES
      ($1, 'm2-a', 'M2 A'), ($2, 'm2-b', 'M2 B')`,
    [ids.organizationA, ids.organizationB],
  );
  await pool.query(
    `INSERT INTO prodx_stores (id, organization_id, code, name, business_timezone) VALUES
      ($1, $3, 'm2-store-a', 'M2 Store A', 'Asia/Bangkok'),
      ($2, $4, 'm2-store-b', 'M2 Store B', 'Asia/Bangkok')`,
    [ids.storeA, ids.storeB, ids.organizationA, ids.organizationB],
  );
  await pool.query(
    `INSERT INTO prodx_users (id, organization_id, username, display_name) VALUES
      ($1, $3, 'm2-user-a', 'M2 User A'),
      ($2, $4, 'm2-user-b', 'M2 User B')`,
    [ids.userA, ids.userB, ids.organizationA, ids.organizationB],
  );
  await pool.query(
    `INSERT INTO prodx_user_credentials (user_id, credential_type, secret_hash)
     VALUES ($1, 'password', $3), ($2, 'password', $3)`,
    [ids.userA, ids.userB, passwordHash],
  );
  await pool.query(
    `INSERT INTO prodx_devices (id, organization_id, store_id, device_key, name) VALUES
      ($1, $3, $5, 'm2-device-a', 'M2 Device A'),
      ($2, $4, $6, 'm2-device-b', 'M2 Device B')`,
    [ids.deviceA, ids.deviceB, ids.organizationA, ids.organizationB, ids.storeA, ids.storeB],
  );
  t.after(async () => { await cleanup(); await pool.end(); });

  const result = await authentication.authenticateCredentials({ username: 'm2-user-a', password: 'correct-password', deviceId: ids.deviceA });
  assert.ok(result);

  const persisted = await pool.query<{ token_hash: string; revoked_at: Date | null }>(
    'SELECT token_hash, revoked_at FROM prodx_sessions WHERE id = $1', [result.sessionId],
  );
  assert.equal(persisted.rows.length, 1);
  assert.equal(persisted.rows[0].token_hash, hashSessionToken(result.token));
  assert.notEqual(persisted.rows[0].token_hash, result.token);
  assert.equal(persisted.rows[0].revoked_at, null);

  const principal = await authentication.authenticateBearer(result.token);
  assert.deepEqual(principal, { sessionId: result.sessionId, userId: ids.userA, organizationId: ids.organizationA, storeId: ids.storeA });

  const failed = await authentication.authenticateCredentials({ username: 'm2-user-a', password: 'wrong-password', deviceId: ids.deviceA });
  assert.equal(failed, null);
  const failedAttempts = await pool.query<{ failed_attempts: number }>('SELECT failed_attempts FROM prodx_user_credentials WHERE user_id = $1', [ids.userA]);
  assert.equal(failedAttempts.rows[0].failed_attempts, 1);

  assert.equal(await authentication.authenticateCredentials({ username: 'm2-user-a', password: 'correct-password', deviceId: ids.deviceB }), null);

  await pool.query("UPDATE prodx_users SET status = 'disabled' WHERE id = $1", [ids.userA]);
  assert.equal(await authentication.authenticateCredentials({ username: 'm2-user-a', password: 'correct-password', deviceId: ids.deviceA }), null);
  await pool.query("UPDATE prodx_users SET status = 'active' WHERE id = $1", [ids.userA]);

  await pool.query("UPDATE prodx_devices SET status = 'disabled' WHERE id = $1", [ids.deviceA]);
  assert.equal(await authentication.authenticateCredentials({ username: 'm2-user-a', password: 'correct-password', deviceId: ids.deviceA }), null);
  await pool.query("UPDATE prodx_devices SET status = 'active' WHERE id = $1", [ids.deviceA]);

  await pool.query("UPDATE prodx_sessions SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE id = $1", [result.sessionId]);
  assert.equal(await authentication.authenticateBearer(result.token), null);

  const fresh = await authentication.authenticateCredentials({ username: 'm2-user-a', password: 'correct-password', deviceId: ids.deviceA });
  assert.ok(fresh);
  await pool.query('UPDATE prodx_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1', [fresh.sessionId]);
  assert.equal(await authentication.authenticateBearer(fresh.token), null);
});
