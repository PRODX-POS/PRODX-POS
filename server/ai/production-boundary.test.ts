import test from 'node:test';
import assert from 'node:assert/strict';
import { AICoreService, createAIProviderRegistry } from './core';
import { AIBackendBoundary, AIBackendPrincipal } from './backend-boundary';
import { AICapabilityError, AIProductionBoundary } from './production-boundary';
import { AIProvider } from './types';

const principal: AIBackendPrincipal = {
  userId: 'user-1',
  organizationId: 'org-1',
  storeId: 'store-1',
  permissions: ['ai:use'],
};

function setup() {
  let calls = 0;
  const provider: AIProvider = {
    name: 'okmd',
    async chat(request) {
      calls += 1;
      return { provider: 'okmd', model: request.model, raw: {} };
    },
  };
  const core = new AICoreService(createAIProviderRegistry([provider], 'okmd'));
  const backend = new AIBackendBoundary(core);
  return { backend, boundary: new AIProductionBoundary(backend), calls: () => calls };
}

const request = (capability: 'assistant' | 'explanation' | 'draft') => ({
  principal,
  capability,
  messages: [{ role: 'user' as const, content: 'hello' }],
});

test('allows only explicitly supported assistive capabilities', async () => {
  const { boundary, calls } = setup();
  await boundary.chat(request('assistant'));
  await boundary.chat(request('explanation'));
  await boundary.chat(request('draft'));
  assert.equal(calls(), 3);
});

test('rejects an unsupported authoritative capability before provider execution', async () => {
  const { boundary, calls } = setup();
  await assert.rejects(
    boundary.chat({ ...request('assistant'), capability: 'financial_totals' as never }),
    AICapabilityError,
  );
  assert.equal(calls(), 0);
});

test('rate limiter executes before provider access', async () => {
  const { backend, calls } = setup();
  let checked = 0;
  const boundary = new AIProductionBoundary(backend, {
    check: () => {
      checked += 1;
      throw new Error('rate limited');
    },
  });
  await assert.rejects(boundary.chat(request('assistant')), /rate limited/);
  assert.equal(checked, 1);
  assert.equal(calls(), 0);
});

test('audit records outcomes without recording message content', async () => {
  const { backend } = setup();
  const events: Array<{ outcome: string; capability: string; content?: string }> = [];
  const audited = new AIProductionBoundary(backend, undefined, {
    record: (event) => events.push(event),
  });
  await audited.chat(request('assistant'));
  await assert.rejects(
    audited.chat({ ...request('assistant'), capability: 'inventory' as never }),
    AICapabilityError,
  );
  assert.deepEqual(events.map(({ outcome, capability }) => ({ outcome, capability })), [
    { outcome: 'success', capability: 'assistant' },
    { outcome: 'denied', capability: 'inventory' },
  ]);
  assert.equal(JSON.stringify(events).includes('hello'), false);
});
