import assert from 'node:assert/strict';
import test from 'node:test';
import { Pool } from 'pg';
import { createPostgresAuthenticationRepository } from './postgres-repository';
import { createAuthenticationService } from './service';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  test('M2 PostgreSQL authentication integration requires DATABASE_URL', { skip: 'DATABASE_URL is not configured' }, () => {});
} else {
  test('M2 PostgreSQL authentication enforces credential, tenant, session, and token-hash invariants', async () => {
    const pool = new Pool({ connectionString: DATABASE_URL });
    const ids = {
      organizationA: '00000000-0000-4000-8000-000000000201',
      organizationB: '00000000-0000-4000-8000-000000000211',
      storeA: '00000000-0000-4000-8000-000000000221',
      storeB: '00000000-0000-4000-8000-000000000222',
      userA: '00000000-0000-4000-8000-000000000231',
      userB: '00000000-0000-4000-8000-000000000232',
      deviceA: '00000000-0000-4000-8000-000000000241',
      deviceB: '00000000-0000-4000-8000-000000000242',
    };

    try {
      await pool.query('TRUNCATE prodx_audit_logs, prodx_sessions, prodx_user_credentials, prodx_devices, prodx_users, prodx_stores, prodx_organizations CASCADE');
      await pool.query(
        `INSERT INTO prodx_organizations (id, code, name) VALUES ($1, 'm2-a', 'M2 A'), ($2, 'm2-b', 'M2 B')`,
        [ids.organizationA, ids.organizationB],
      );
      await pool.query(
        `INSERT INTO prodx_stores (id, organization_id, code, name) VALUES ($1, $3, 'store-a', 'Store A'), ($2, $4, 'store-b', 'Store B')`,
        [ids.storeA, ids.storeB, ids.organizationA, ids.organizationB],
      );
      await pool.query(
        `INSERT INTO prodx_users (id, organization_id, store_id, username, status) VALUES ($1, $3, $5, 'm2-user-a', 'active'), ($2, $4, $6, 'm2-user-b', 'active')`,
        [ids.userA, ids.userB, ids.organizationA, ids.organizationB, ids.storeA, ids.storeB],
      );
      await pool.query(
        `INSERT INTO prodx_devices (id, organization_id, store_id, code, name, status) VALUES ($1, $3, $5, 'device-a', 'Device A', 'active'), ($2, $4, $6, 'device-b', 'Device B', 'active')`,
        [ids.deviceA, ids.deviceB, ids.organizationA, ids.organizationB, ids.storeA, ids.storeB],
      );

      const repository = createPostgresAuthenticationRepository(pool);
      const authentication = createAuthenticationService(repository, pool);
      await repository.createCredential({ userId: ids.userA, username: 'm2-user-a', password: 'correct-password' });

      const result = await authentication.authenticateCredentials({ username: 'm2-user-a', password: 'correct-password', deviceId: ids.deviceA });
      assert.ok(result);
      const persisted = await pool.query('SELECT token_hash, revoked_at FROM prodx_sessions WHERE id = $1', [result.sessionId]);
      assert.equal(persisted.rows[0].token_hash, result.tokenHash);
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

      await pool.query(`UPDATE prodx_sessions SET issued_at = CURRENT_TIMESTAMP - INTERVAL '2 minutes', expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE id = $1`, [result.sessionId]);
      assert.equal(await authentication.authenticateBearer(result.token), null);

      const fresh = await authentication.authenticateCredentials({ username: 'm2-user-a', password: 'correct-password', deviceId: ids.deviceA });
      assert.ok(fresh);
      await pool.query('UPDATE prodx_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1', [fresh.sessionId]);
      assert.equal(await authentication.authenticateBearer(fresh.token), null);
    } finally {
      await pool.end();
    }
  });
}
