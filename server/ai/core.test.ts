import test from 'node:test';
import assert from 'node:assert/strict';
import { AICoreService, createAIProviderRegistry } from './core';
import { AIProvider } from './types';

function provider(name: string): AIProvider {
  return {
    name,
    async chat(request) {
      return {
        id: 'test-response',
        model: request.model ?? 'test-model',
        choices: [{ message: { role: 'assistant', content: 'ok' } }],
        provider: name,
        raw: { ok: true },
      };
    },
  };
}

test('routes chat through the selected provider', async () => {
  const openrouter = provider('openrouter');
  const other = provider('other');
  const service = new AICoreService(createAIProviderRegistry([openrouter, other], 'openrouter'));
  const response = await service.chat({ provider: 'other', messages: [{ role: 'user', content: 'hello' }] });
  assert.equal(response.provider, 'other');
});

test('rejects providers outside the configured policy', async () => {
  const service = new AICoreService(
    createAIProviderRegistry([provider('openrouter'), provider('other')], 'openrouter'),
    { allowedProviders: ['openrouter'] },
  );
  await assert.rejects(
    service.chat({ provider: 'other', messages: [{ role: 'user', content: 'hello' }] }),
    /not allowed by policy/,
  );
});

test('rejects oversized message batches before provider invocation', async () => {
  const service = new AICoreService(
    createAIProviderRegistry([provider('openrouter')], 'openrouter'),
    { maxMessages: 1 },
  );
  await assert.rejects(
    service.chat({ messages: [{ role: 'user', content: 'one' }, { role: 'user', content: 'two' }] }),
    /exceeds the 1-message limit/,
  );
});
