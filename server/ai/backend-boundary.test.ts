import test from 'node:test';
import assert from 'node:assert/strict';
import { AICoreService, createAIProviderRegistry } from './core';
import { AIProvider } from './types';
import { AIBackendBoundary, AIAuthorizationError } from './backend-boundary';

function provider(onCall: () => void): AIProvider {
  return {
    name: 'okmd',
    async chat(request) {
      onCall();
      return { id: 'test', model: request.model, provider: 'okmd', raw: {} };
    },
  };
}

const principal = {
  userId: 'user-1',
  organizationId: 'org-1',
  storeId: 'store-1',
  permissions: ['ai:use'],
};

test('denies missing authentication context before provider execution', async () => {
  let calls = 0;
  const core = new AICoreService(createAIProviderRegistry([provider(() => calls++)], 'okmd'));
  const boundary = new AIBackendBoundary(core);

  await assert.rejects(
    boundary.chat({ messages: [{ role: 'user', content: 'hello' }] }),
    AIAuthorizationError,
  );
  assert.equal(calls, 0);
});

test('denies missing tenant/store scope before provider execution', async () => {
  let calls = 0;
  const core = new AICoreService(createAIProviderRegistry([provider(() => calls++)], 'okmd'));
  const boundary = new AIBackendBoundary(core);

  await assert.rejects(
    boundary.chat({
      principal: { ...principal, organizationId: '' },
      messages: [{ role: 'user', content: 'hello' }],
    }),
    AIAuthorizationError,
  );
  assert.equal(calls, 0);
});

test('denies missing AI permission before provider execution', async () => {
  let calls = 0;
  const core = new AICoreService(createAIProviderRegistry([provider(() => calls++)], 'okmd'));
  const boundary = new AIBackendBoundary(core);

  await assert.rejects(
    boundary.chat({
      principal: { ...principal, permissions: [] },
      messages: [{ role: 'user', content: 'hello' }],
    }),
    AIAuthorizationError,
  );
  assert.equal(calls, 0);
});

test('allows an authorized scoped principal to reach AI Core', async () => {
  let calls = 0;
  const core = new AICoreService(createAIProviderRegistry([provider(() => calls++)], 'okmd'));
  const boundary = new AIBackendBoundary(core);

  const response = await boundary.chat({
    principal,
    messages: [{ role: 'user', content: 'hello' }],
  });

  assert.equal(response.provider, 'okmd');
  assert.equal(calls, 1);
});
