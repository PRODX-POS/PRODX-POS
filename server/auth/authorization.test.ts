import assert from 'node:assert/strict';
import test from 'node:test';
import { decidePermission, hasPermission } from './authorization';
import type { RequestContext } from '../http/types';

const context: RequestContext = {
  requestId: 'req-1',
  principal: { userId: 'user-1', organizationId: 'org-1', storeId: 'store-1' },
};

const snapshot = {
  organizationId: 'org-1',
  storeId: 'store-1',
  permissions: new Set(['catalog:read']),
};

test('allows only an exact scoped permission', () => {
  assert.deepEqual(decidePermission(context, 'catalog:read', snapshot), { allowed: true });
  assert.equal(hasPermission(context, 'catalog:read', snapshot), true);
});

test('denies permissions outside the organization scope', () => {
  assert.deepEqual(
    decidePermission(context, 'catalog:read', { ...snapshot, organizationId: 'org-2' }),
    { allowed: false, reason: 'organization_scope_mismatch' },
  );
});

test('denies permissions outside the store scope', () => {
  assert.deepEqual(
    decidePermission(context, 'catalog:read', { ...snapshot, storeId: 'store-2' }),
    { allowed: false, reason: 'store_scope_mismatch' },
  );
});

test('denies missing permissions and does not use wildcard grants', () => {
  assert.deepEqual(decidePermission(context, 'catalog:write', snapshot), {
    allowed: false,
    reason: 'permission_missing',
  });
  assert.equal(
    hasPermission(context, 'catalog:write', { ...snapshot, permissions: new Set(['*']) }),
    false,
  );
});
