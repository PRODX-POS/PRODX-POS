import test from 'node:test';
import assert from 'node:assert/strict';
import { AIProductionBoundary } from './production-boundary';

test('production boundary exposes only injectable rate and audit controls', () => {
  assert.equal(typeof AIProductionBoundary, 'function');
  assert.equal('provider' in AIProductionBoundary.prototype, false);
});

test('production integration does not define an authoritative POS capability', () => {
  const source = String(AIProductionBoundary);
  assert.equal(source.includes('financial_totals'), false);
  assert.equal(source.includes('inventory'), false);
  assert.equal(source.includes('payments'), false);
});
