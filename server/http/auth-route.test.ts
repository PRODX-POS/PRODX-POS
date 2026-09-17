import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './createApp';
import { registerAuthRoute } from './auth-route';
import type { SessionIssuer } from '../auth/session';

const requestJson = async (app: ReturnType<typeof createApp>, body: unknown) => {
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not expose a port.');
    return fetch(`http://127.0.0.1:${address.port}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
};

test('login is explicitly public and returns issued session', async () => {
  const authentication: SessionIssuer = {
    authenticateCredentials: async () => ({ token: 'token', sessionId: 'session' }),
    authenticateBearer: async () => null,
  };
  const app = createApp({ authenticateRequest: async () => null, publicPaths: ['/api/v1/auth/login'], configureRoutes: configuredApp => registerAuthRoute(configuredApp, authentication) });
  const response = await requestJson(app, { username: 'cashier', password: 'secret', deviceId: 'device' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { token: 'token', sessionId: 'session' });
});

test('failed login does not disclose credential details', async () => {
  const authentication: SessionIssuer = {
    authenticateCredentials: async () => null,
    authenticateBearer: async () => null,
  };
  const app = createApp({ authenticateRequest: async () => null, publicPaths: ['/api/v1/auth/login'], configureRoutes: configuredApp => registerAuthRoute(configuredApp, authentication) });
  const response = await requestJson(app, { username: 'cashier', password: 'wrong', deviceId: 'device' });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'INVALID_CREDENTIALS');
});
