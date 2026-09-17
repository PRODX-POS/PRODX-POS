import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionIssuer, hashSessionToken, type AuthenticationRepository, type CredentialRecord, type DeviceRecord, type SessionRecord } from './session';

const credential: CredentialRecord = { userId: '00000000-0000-0000-0000-000000000001', organizationId: '00000000-0000-0000-0000-000000000010', username: 'cashier', status: 'active', credentialType: 'password', secretHash: 'hash', failedAttempts: 0, lockedUntil: null };
const device: DeviceRecord = { id: '00000000-0000-0000-0000-000000000100', organizationId: credential.organizationId, storeId: '00000000-0000-0000-0000-000000000020', status: 'active' };

const repositoryFixture = () => {
  let session: SessionRecord | null = null;
  let currentCredential = { ...credential };
  const calls = { failed: 0, reset: 0, touched: 0, revoked: 0, lastLockedUntil: null as Date | null };
  const repository: AuthenticationRepository = {
    findCredentialByUsername: async (username, organizationId) => username === currentCredential.username && organizationId === currentCredential.organizationId ? currentCredential : null,
    recordFailedAttempt: async (_userId, lockedUntil) => { calls.failed += 1; currentCredential = { ...currentCredential, failedAttempts: currentCredential.failedAttempts + 1, lockedUntil: lockedUntil ?? currentCredential.lockedUntil }; calls.lastLockedUntil = lockedUntil ?? null; },
    resetFailedAttempts: async () => { calls.reset += 1; currentCredential = { ...currentCredential, failedAttempts: 0, lockedUntil: null }; },
    createSession: async (input) => { session = { ...input, revokedAt: null, userStatus: 'active' }; },
    findSessionByTokenHash: async (tokenHash) => session?.tokenHash === tokenHash ? session : null,
    revokeSession: async (sessionId, at) => { calls.revoked += 1; if (session?.id === sessionId) session = { ...session, revokedAt: at }; },
    findDevice: async (deviceId) => deviceId === device.id ? device : null,
    touchSession: async () => { calls.touched += 1; },
  };
  return { repository, calls, getSession: () => session, getCredential: () => currentCredential };
};

const clock = new Date('2026-09-13T12:00:00.000Z');
const authInput = { username: 'cashier', password: 'good', deviceId: device.id, organizationId: credential.organizationId };
const badInput = { ...authInput, password: 'bad' };

test('credential authentication issues only a hashed bearer token', async () => {
  const { repository, calls, getSession } = repositoryFixture();
  const issuer = createSessionIssuer(repository, async (secret, encoded) => secret === 'good' && encoded === 'hash', () => clock);
  const result = await issuer.authenticateCredentials(authInput);
  assert.ok(result); assert.notEqual(result.token, getSession()?.tokenHash); assert.equal(getSession()?.tokenHash, hashSessionToken(result.token)); assert.equal(calls.reset, 1); assert.equal(calls.failed, 0);
});

test('wrong credentials do not create sessions and record a failed attempt', async () => {
  const { repository, calls, getSession } = repositoryFixture();
  const issuer = createSessionIssuer(repository, async () => false, () => clock);
  assert.equal(await issuer.authenticateCredentials(badInput), null); assert.equal(getSession(), null); assert.equal(calls.failed, 1); assert.equal(calls.lastLockedUntil, null);
});

test('five failed attempts lock the credential for fifteen minutes and lockout attempts do not increment', async () => {
  const { repository, calls, getCredential } = repositoryFixture();
  const issuer = createSessionIssuer(repository, async () => false, () => clock);
  for (let attempt = 1; attempt <= 5; attempt += 1) assert.equal(await issuer.authenticateCredentials(badInput), null);
  assert.equal(getCredential().failedAttempts, 5); assert.deepEqual(calls.lastLockedUntil, new Date('2026-09-13T12:15:00.000Z'));
  assert.equal(await issuer.authenticateCredentials(badInput), null); assert.equal(calls.failed, 5); assert.equal(getCredential().failedAttempts, 5);
});

test('successful authentication resets failed attempts and clears lockout state', async () => {
  const { repository, getCredential } = repositoryFixture();
  const issuer = createSessionIssuer(repository, async (secret) => secret === 'good', () => clock);
  for (let attempt = 0; attempt < 4; attempt += 1) assert.equal(await issuer.authenticateCredentials(badInput), null);
  assert.equal(getCredential().failedAttempts, 4); const result = await issuer.authenticateCredentials(authInput); assert.ok(result); assert.equal(getCredential().failedAttempts, 0); assert.equal(getCredential().lockedUntil, null);
});

test('disabled device, locked user, and cross-tenant device cannot authenticate', async () => {
  const { repository } = repositoryFixture();
  const issuer = createSessionIssuer(repository, async () => true, () => clock);
  assert.equal(await issuer.authenticateCredentials({ ...authInput, deviceId: 'unknown' }), null);
  const lockedCredential = { ...credential, lockedUntil: new Date(clock.getTime() + 60_000) }; repository.findCredentialByUsername = async () => lockedCredential;
  assert.equal(await issuer.authenticateCredentials(authInput), null); repository.findCredentialByUsername = async () => credential;
  repository.findDevice = async () => ({ ...device, organizationId: '00000000-0000-0000-0000-000000000099' }); assert.equal(await issuer.authenticateCredentials(authInput), null);
});

test('bearer authentication rejects expired, revoked, disabled-user, and disabled-device sessions', async () => {
  const { repository, calls, getSession } = repositoryFixture(); const issuer = createSessionIssuer(repository, async () => true, () => clock);
  const result = await issuer.authenticateCredentials(authInput); assert.ok(result);
  assert.deepEqual(await issuer.authenticateBearer(result.token), { sessionId: result.sessionId, userId: credential.userId, organizationId: credential.organizationId, storeId: device.storeId }); assert.equal(calls.touched, 1);
  repository.findSessionByTokenHash = async () => ({ ...getSession()!, expiresAt: new Date(clock.getTime() - 1) }); assert.equal(await issuer.authenticateBearer(result.token), null);
  repository.findSessionByTokenHash = async () => ({ ...getSession()!, expiresAt: new Date(clock.getTime() + 60_000), revokedAt: clock }); assert.equal(await issuer.authenticateBearer(result.token), null);
  repository.findSessionByTokenHash = async () => ({ ...getSession()!, expiresAt: new Date(clock.getTime() + 60_000), revokedAt: null, userStatus: 'disabled' }); assert.equal(await issuer.authenticateBearer(result.token), null);
  repository.findSessionByTokenHash = async () => ({ ...getSession()!, expiresAt: new Date(clock.getTime() + 60_000), revokedAt: null }); repository.findDevice = async () => ({ ...device, status: 'disabled' }); assert.equal(await issuer.authenticateBearer(result.token), null);
});

test('bearer revocation invalidates the session', async () => {
  const { repository, calls } = repositoryFixture(); const issuer = createSessionIssuer(repository, async () => true, () => clock);
  const result = await issuer.authenticateCredentials(authInput); assert.ok(result);
  assert.equal(await issuer.revokeBearer(result.token), true); assert.equal(calls.revoked, 1); assert.equal(await issuer.authenticateBearer(result.token), null); assert.equal(await issuer.revokeBearer(result.token), false);
});

test('credential lookup is tenant-bound', async () => {
  const { repository } = repositoryFixture();
  const issuer = createSessionIssuer(repository, async () => true, () => clock);
  assert.equal(await issuer.authenticateCredentials({ ...authInput, organizationId: '00000000-0000-0000-0000-000000000099' }), null);
});
