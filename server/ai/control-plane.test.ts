import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AIControlPlaneService } from './control-plane';
import { StaticAIModelRegistry } from './model-registry';
import { AITaskRouter } from './task-router';

test('control plane converts a workload into a policy-approved gateway request', async () => {
  const registry = new StaticAIModelRegistry([
    {
      provider: 'okmd',
      model: 'ui-vision',
      tiers: ['vision'],
      qualityScore: 92,
      contextTokens: 64_000,
      supportsVision: true,
      enabled: true,
    },
  ]);
  const calls: unknown[] = [];
  const service = new AIControlPlaneService(
    new AITaskRouter(registry),
    {
      chat: async (request) => {
        calls.push(request);
        return { provider: 'okmd', model: 'ui-vision', raw: {} };
      },
    },
  );

  await service.run({
    requestId: 'req-ui-1',
    scope: { userId: 'u1', organizationId: 'o1', storeId: 's1' },
    task: 'ui_design',
    messages: [{ role: 'user', content: 'Review this POS layout.' }],
  });

  assert.deepEqual(calls[0], {
    requestId: 'req-ui-1',
    scope: { userId: 'u1', organizationId: 'o1', storeId: 's1' },
    permission: 'ai:use',
    provider: 'okmd',
    model: 'ui-vision',
    messages: [{ role: 'user', content: 'Review this POS layout.' }],
    temperature: undefined,
    max_tokens: undefined,
  });
});
