import test from 'node:test';
import assert from 'node:assert/strict';
import { AI_CAPABILITIES } from './capabilities';

test('capability allow-list is assistive only', () => {
  assert.deepEqual(AI_CAPABILITIES, ['assistant', 'explanation', 'draft']);
  assert.equal(AI_CAPABILITIES.includes('financial_totals' as never), false);
  assert.equal(AI_CAPABILITIES.includes('inventory' as never), false);
  assert.equal(AI_CAPABILITIES.includes('payments' as never), false);
});
