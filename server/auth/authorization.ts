import type { RequestContext } from '../http/types';

export type AuthorizationSnapshot = {
  userId: string;
  organizationId: string;
  storeId: string;
  permissions: ReadonlySet<string>;
};

export type AuthorizationDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | 'user_scope_mismatch'
        | 'organization_scope_mismatch'
        | 'store_scope_mismatch'
        | 'permission_missing';
    };

/**
 * Deterministic authorization policy. Persistence is deliberately supplied by the caller;
 * this layer never grants access based on role names, wildcard permissions, or caller input.
 */
export const decidePermission = (
  context: RequestContext,
  permission: string,
  snapshot: AuthorizationSnapshot,
): AuthorizationDecision => {
  if (snapshot.userId !== context.principal.userId) {
    return { allowed: false, reason: 'user_scope_mismatch' };
  }

  if (snapshot.organizationId !== context.principal.organizationId) {
    return { allowed: false, reason: 'organization_scope_mismatch' };
  }

  if (snapshot.storeId !== context.principal.storeId) {
    return { allowed: false, reason: 'store_scope_mismatch' };
  }

  if (!permission.trim() || !snapshot.permissions.has(permission)) {
    return { allowed: false, reason: 'permission_missing' };
  }

  return { allowed: true };
};

export const hasPermission = (
  context: RequestContext,
  permission: string,
  snapshot: AuthorizationSnapshot,
): boolean => decidePermission(context, permission, snapshot).allowed;
