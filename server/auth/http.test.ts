import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createBearerAuthenticator } from './http';
import type { SessionIssuer } from './session';

const principal = {
  sessionId: 'session-1',
  userId: 'user-1',
  organizationId: 'org-1',
  storeId: 'store-1',
};

const makeAuthentication = (expectedToken: string): SessionIssuer => ({
  authenticateCredentials: async () => ({ token: expectedToken, sessionId: principal.sessionId }),
  authenticateBearer: async (token) => token === expectedToken ? principal : null,
});

test('maps a Bearer Authorization header to a verified principal', async () => {
  const authenticate = createBearerAuthenticator(makeAuthentication('opaque-token'));
  const app = express();
  app.use(async (request, response) => {
    const verified = await authenticate(request);
    response.status(verified ? 200 : 401).json(verified);
  });

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const response = await fetch(`http://127.0.0.1:${address.port}/`, {
      headers: { authorization: 'Bearer opaque-token' },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      userId: principal.userId,
      organizationId: principal.organizationId,
      storeId: principal.storeId,
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('rejects missing, malformed, and invalid Bearer credentials', async () => {
  const authenticate = createBearerAuthenticator(makeAuthentication('opaque-token'));
  const request = (authorization?: string) => {
    const app = express();
    app.use(async (req, res) => {
      const verified = await authenticate(req);
      res.status(verified ? 200 : 401).end();
    });
    return new Promise<Response>(async (resolve, reject) => {
      const server = app.listen(0, async () => {
        try {
          const address = server.address();
          assert.ok(address && typeof address !== 'string');
          resolve(await fetch(`http://127.0.0.1:${address.port}/`, authorization ? { headers: { authorization } } : undefined));
        } catch (error) {
          reject(error);
        } finally {
          server.close();
        }
      });
    });
  };

  assert.equal((await request()).status, 401);
  assert.equal((await request('Basic abc')).status, 401);
  assert.equal((await request('Bearer')).status, 401);
  assert.equal((await request('Bearer wrong-token')).status, 401);
});
