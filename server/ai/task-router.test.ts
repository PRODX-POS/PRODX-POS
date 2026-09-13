import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StaticAIModelRegistry } from './model-registry';
import { AI_TASKS, AITaskRouter } from './task-router';

test('AI task catalog includes engineering, design, review, and operations workloads', () => {
  assert.ok(AI_TASKS.includes('ui_design'));
  assert.ok(AI_TASKS.includes('css_generation'));
  assert.ok(AI_TASKS.includes('security_review'));
  assert.ok(AI_TASKS.includes('production_readiness_review'));
  assert.ok(AI_TASKS.includes('inventory_insight'));
});

test('router selects the highest quality eligible model for a task', () => {
  const router = new AITaskRouter(
    new StaticAIModelRegistry([
      {
        provider: 'okmd',
        model: 'fast-model',
        tiers: ['fast'],
        qualityScore: 70,
        contextTokens: 16_000,
        supportsVision: false,
        enabled: true,
      },
      {
        provider: 'okmd',
        model: 'strong-model',
        tiers: ['reasoning', 'critical'],
        qualityScore: 96,
        contextTokens: 128_000,
        supportsVision: false,
        enabled: true,
      },
    ]),
  );

  assert.deepEqual(router.plan('security_review'), {
    task: 'security_review',
    risk: 'critical',
    permission: 'ai:security',
    provider: 'okmd',
    model: 'strong-model',
    contextTokens: 128_000,
    requiresHumanApproval: true,
  });
});

test('vision workloads require a vision-capable model', () => {
  const router = new AITaskRouter(
    new StaticAIModelRegistry([
      {
        provider: 'okmd',
        model: 'text-only',
        tiers: ['vision'],
        qualityScore: 99,
        contextTokens: 64_000,
        supportsVision: false,
        enabled: true,
      },
      {
        provider: 'okmd',
        model: 'vision-model',
        tiers: ['vision'],
        qualityScore: 90,
        contextTokens: 32_000,
        supportsVision: true,
        enabled: true,
      },
    ]),
  );

  assert.equal(router.plan('ui_design').model, 'vision-model');
});

test('disabled or below-threshold models cannot be selected', () => {
  const router = new AITaskRouter(
    new StaticAIModelRegistry([
      {
        provider: 'okmd',
        model: 'disabled',
        tiers: ['critical'],
        qualityScore: 100,
        contextTokens: 128_000,
        supportsVision: false,
        enabled: false,
      },
      {
        provider: 'okmd',
        model: 'weak',
        tiers: ['critical'],
        qualityScore: 80,
        contextTokens: 128_000,
        supportsVision: false,
        enabled: true,
      },
    ]),
  );

  assert.throws(() => router.plan('security_review'), /No eligible AI model/);
});

test('preferred provider is a hard routing constraint', () => {
  const router = new AITaskRouter(
    new StaticAIModelRegistry([
      {
        provider: 'openai',
        model: 'critical-a',
        tiers: ['critical'],
        qualityScore: 99,
        contextTokens: 128_000,
        supportsVision: false,
        enabled: true,
      },
      {
        provider: 'okmd',
        model: 'critical-b',
        tiers: ['critical'],
        qualityScore: 91,
        contextTokens: 64_000,
        supportsVision: false,
        enabled: true,
      },
    ]),
  );

  assert.equal(router.plan('architecture_review', 'okmd').provider, 'okmd');
  assert.throws(() => router.plan('architecture_review', 'missing'), /No eligible AI model/);
});
