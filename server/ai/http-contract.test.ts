import test from 'node:test';
import assert from 'node:assert/strict';
import { AICoreService, createAIProviderRegistry } from './core';
import { AIProvider } from './types';
import { AIBackendBoundary } from './backend-boundary';
import { createAIHttpAdapter } from './http-contract';

function provider(onCall: () => void): AIProvider {
  return {
    name: 'okmd',
    async chat(request) {
      onCall();
      return { provider: 'okmd', model: request.model, raw: {} };
    },
  };
}

test('HTTP adapter derives authorization from verified principal and delegates to boundary', async () => {
  let calls = 0;
  const core = new AICoreService(createAIProviderRegistry([provider(() => calls++)], 'okmd'));
  const boundary = new AIBackendBoundary(core);
  const adapter = createAIHttpAdapter();

  const response = await adapter.handle(
    {
      body: { messages: [{ role: 'user', content: 'hello' }] },
      principal: {
        userId: 'user-1',
        organizationId: 'org-1',
        storeId: 'store-1',
        permissions: ['ai:use'],
      },
    },
    boundary,
  );

  assert.equal(response.provider, 'okmd');
  assert.equal(calls, 1);
});
