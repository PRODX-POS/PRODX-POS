import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StaticAIModelRegistry } from './model-registry';

test('model registry filters disabled, tier-incompatible, and non-vision models', () => {
  const registry = new StaticAIModelRegistry([
    {
      provider: 'okmd',
      model: 'vision',
      tiers: ['vision'],
      qualityScore: 90,
      contextTokens: 32_000,
      supportsVision: true,
      enabled: true,
    },
    {
      provider: 'okmd',
      model: 'text',
      tiers: ['vision'],
      qualityScore: 99,
      contextTokens: 64_000,
      supportsVision: false,
      enabled: true,
    },
    {
      provider: 'okmd',
      model: 'disabled',
      tiers: ['vision'],
      qualityScore: 100,
      contextTokens: 128_000,
      supportsVision: true,
      enabled: false,
    },
  ]);

  assert.deepEqual(
    registry.findEligible({ tier: 'vision', minQualityScore: 80, requiresVision: true }).map((m) => m.model),
    ['vision'],
  );
});

test('model registry rejects duplicate and invalid profiles', () => {
  assert.throws(
    () =>
      new StaticAIModelRegistry([
        {
          provider: 'okmd',
          model: 'same',
          tiers: ['fast'],
          qualityScore: 70,
          contextTokens: 1_000,
          supportsVision: false,
          enabled: true,
        },
        {
          provider: 'okmd',
          model: 'same',
          tiers: ['fast'],
          qualityScore: 71,
          contextTokens: 1_000,
          supportsVision: false,
          enabled: true,
        },
      ]),
    /Duplicate AI model profile/,
  );

  assert.throws(
    () =>
      new StaticAIModelRegistry([
        {
          provider: 'okmd',
          model: 'bad-score',
          tiers: ['fast'],
          qualityScore: 101,
          contextTokens: 1_000,
          supportsVision: false,
          enabled: true,
        },
      ]),
    /invalid qualityScore/,
  );
});
