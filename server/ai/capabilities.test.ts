import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_CAPABILITIES,
  AI_NON_AUTHORITATIVE_DOMAINS,
  DEFAULT_AI_CAPABILITY_POLICY,
} from './capabilities';

test('default AI policy requires explicit permission', () => {
  assert.equal(DEFAULT_AI_CAPABILITY_POLICY.requiredPermission, 'ai:use');
  assert.deepEqual(DEFAULT_AI_CAPABILITY_POLICY.allowedCapabilities, AI_CAPABILITIES);
});

test('authoritative POS domains remain outside AI authority', () => {
  assert.deepEqual(AI_NON_AUTHORITATIVE_DOMAINS, [
    'financial_totals',
    'vat',
    'inventory',
    'payments',
    'refunds',
    'audit',
  ]);
});
