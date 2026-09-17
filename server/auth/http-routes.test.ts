import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthenticationHttp } from './http-routes';
import { createApp } from '../http/createApp';
import type { SessionIssuer } from './session';

const principal = { userId: 'user-1', organizationId: 'org-1', storeId: 'store-1' };

const start = async (app: ReturnType<typeof createApp>) => {
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return { baseUrl: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
};

test('login issues an HttpOnly session cookie and never returns a client-controlled credential fallback', async () => {
  const calls: string[] = [];
  const issuer: SessionIssuer = {
    authenticateCredentials: async (input) => { calls.push(`${input.username}:${input.password}:${input.deviceId}`); return { token: 'server-token', sessionId: 'session-1' }; },
    authenticateBearer: async (token) => token === 'server-token' ? { ...principal, sessionId: 'session-1' } : null,
    revokeBearer: async () => true,
  };
  const auth = createAuthenticationHttp({
    issuer,
    resolveLoginContext: async (input) => {
      assert.equal(input.organizationSlug, 'org'); assert.equal(input.storeCode, 'STORE-1'); assert.equal(input.registerId, 'REGISTER-1'); assert.equal(input.username, 'cashier@example.test');
      return { organizationId: 'org-1', deviceId: 'device-1', registerId: input.registerId };
    },
    resolveSessionPayload: async (resolvedPrincipal, token) => ({ organization: { id: resolvedPrincipal.organizationId, name: 'Org', slug: 'org', stores: [] }, currentStore: { id: resolvedPrincipal.storeId, code: 'STORE-1' }, registerId: 'REGISTER-1', currentUser: { id: resolvedPrincipal.userId, email: 'cashier@example.test', role: 'cashier' }, token, expiresAt: '2026-09-17T12:00:00.000Z' }),
    secureCookies: true,
  });
  const app = createApp({ authenticateRequest: auth.authenticateRequest, configurePublicRoutes: auth.configurePublicRoutes, configureRoutes: auth.configureRoutes });
  const server = await start(app);
  try {
    const response = await fetch(`${server.baseUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organizationSlug: 'org', storeCode: 'STORE-1', registerId: 'REGISTER-1', emailOrPin: 'cashier@example.test', passwordOrPin: 'correct-password' }) });
    assert.equal(response.status, 200); assert.deepEqual(calls, ['cashier@example.test:correct-password:device-1']);
    assert.match(response.headers.get('set-cookie') || '', /^prodx_session=server-token;/); assert.match(response.headers.get('set-cookie') || '', /HttpOnly/); assert.match(response.headers.get('set-cookie') || '', /Secure/);
    const payload = await response.json(); assert.equal(payload.token, 'server-token'); assert.equal(payload.currentUser.id, 'user-1');
  } finally { await server.close(); }
});

test('session and logout require the server-issued cookie and logout revokes it', async () => {
  let revoked = '';
  const issuer: SessionIssuer = {
    authenticateCredentials: async () => ({ token: 'server-token', sessionId: 'session-1' }), authenticateBearer: async (token) => token === 'server-token' ? { ...principal, sessionId: 'session-1' } : null, revokeBearer: async (token) => { revoked = token; return true; },
  };
  const auth = createAuthenticationHttp({ issuer, resolveLoginContext: async () => ({ organizationId: 'org-1', deviceId: 'device-1', registerId: 'REGISTER-1' }), resolveSessionPayload: async (resolvedPrincipal, token) => ({ organization: { id: resolvedPrincipal.organizationId, name: 'Org', slug: 'org', stores: [] }, currentStore: { id: resolvedPrincipal.storeId, code: 'STORE-1' }, registerId: 'REGISTER-1', currentUser: { id: resolvedPrincipal.userId }, token, expiresAt: '2026-09-17T12:00:00.000Z' }) });
  const app = createApp({ authenticateRequest: auth.authenticateRequest, configurePublicRoutes: auth.configurePublicRoutes, configureRoutes: auth.configureRoutes });
  const server = await start(app);
  try {
    const sessionResponse = await fetch(`${server.baseUrl}/auth/session`, { headers: { cookie: 'prodx_session=server-token' } }); assert.equal(sessionResponse.status, 200); assert.equal((await sessionResponse.json()).currentUser.id, 'user-1');
    const logoutResponse = await fetch(`${server.baseUrl}/auth/logout`, { method: 'POST', headers: { cookie: 'prodx_session=server-token' } }); assert.equal(logoutResponse.status, 204); assert.equal(revoked, 'server-token'); assert.match(logoutResponse.headers.get('set-cookie') || '', /Max-Age=0/);
  } finally { await server.close(); }
});

test('malformed login input is rejected without invoking authentication', async () => {
  let invoked = false;
  const issuer: SessionIssuer = { authenticateCredentials: async () => { invoked = true; return null; }, authenticateBearer: async () => null, revokeBearer: async () => false };
  const auth = createAuthenticationHttp({ issuer, resolveLoginContext: async () => ({ organizationId: 'org-1', deviceId: 'device-1', registerId: 'REGISTER-1' }), resolveSessionPayload: async () => { throw new Error('not expected'); } });
  const app = createApp({ authenticateRequest: auth.authenticateRequest, configurePublicRoutes: auth.configurePublicRoutes, configureRoutes: auth.configureRoutes }); const server = await start(app);
  try { const response = await fetch(`${server.baseUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organizationSlug: 'org' }) }); assert.equal(response.status, 400); assert.equal(invoked, false); } finally { await server.close(); }
});
