import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { installAIHttpRoute } from './http-route';
import { AIBackendBoundary } from './backend-boundary';
import { AICoreService } from './core';
import type { AIProvider } from './types';

function makeApp(allowed: boolean) {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.id = 'test-request';
    request.prodxContext = {
      requestId: request.id,
      principal: { userId: 'u1', organizationId: 'o1', storeId: 's1' },
    };
    request.app.locals.prodxAuthorize = () => allowed;
    next();
  });

  const provider: AIProvider = {
    name: 'okmd',
    async chat(request) {
      return { model: request.model ?? 'test-model', choices: [{ message: { role: 'assistant', content: 'ok' } }], raw: { secret: 'must-not-leak' } };
    },
  };
  const core = new AICoreService({ get: () => provider }, { allowedProviders: ['okmd'] });
  const boundary = new AIBackendBoundary(core);
  const router = express.Router();
  installAIHttpRoute(router, { boundary });
  app.use('/api/v1/ai', router);
  return app;
}

test('AI HTTP route rejects unauthorized requests before provider execution', async () => {
  const app = makeApp(false);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/ai/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
  });
  assert.equal(response.status, 403);
  server.close();
});

test('AI HTTP route never returns provider raw payload or trusts browser identity', async () => {
  const app = makeApp(true);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/ai/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      userId: 'attacker', organizationId: 'attacker-org', storeId: 'attacker-store',
      apiKey: 'should-not-be-forwarded', endpoint: 'https://attacker.example',
      messages: [{ role: 'user', content: 'hello' }],
    }),
  });
  assert.equal(response.status, 200);
  const body = await response.json() as Record<string, unknown>;
  assert.equal(body.requestId, 'test-request');
  assert.equal(body.raw, undefined);
  assert.equal(body.provider, 'okmd');
  server.close();
});

test('AI HTTP route rejects invalid message roles', async () => {
  const app = makeApp(true);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/ai/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'developer', content: 'nope' }] }),
  });
  assert.equal(response.status, 400);
  server.close();
});
