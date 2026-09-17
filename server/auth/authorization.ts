import type { RequestContext, AuthorizeRequest } from '../http/types';
import type { SqlExecutor } from './postgres-repository';

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

export const decidePermission = (
  context: RequestContext,
  permission: string,
  snapshot: AuthorizationSnapshot,
): AuthorizationDecision => {
  if (snapshot.userId !== context.principal.userId) return { allowed: false, reason: 'user_scope_mismatch' };
  if (snapshot.organizationId !== context.principal.organizationId) return { allowed: false, reason: 'organization_scope_mismatch' };
  if (snapshot.storeId !== context.principal.storeId) return { allowed: false, reason: 'store_scope_mismatch' };
  if (!permission.trim() || !snapshot.permissions.has(permission)) return { allowed: false, reason: 'permission_missing' };
  return { allowed: true };
};

export const hasPermission = (
  context: RequestContext,
  permission: string,
  snapshot: AuthorizationSnapshot,
): boolean => decidePermission(context, permission, snapshot).allowed;

/**
 * Authorizes directly from PostgreSQL. The query itself enforces the tenant,
 * user, store-membership, active-role, and active-assignment boundaries.
 */
export const createPostgresAuthorizer = (db: SqlExecutor): AuthorizeRequest => async (context, permission) => {
  const normalizedPermission = permission.trim();
  if (!normalizedPermission) return false;

  const rows = await db.query<{ allowed: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM prodx_user_roles ur
         JOIN prodx_store_memberships sm
           ON sm.organization_id = ur.organization_id
          AND sm.store_id = ur.store_id
          AND sm.user_id = ur.user_id
          AND sm.active = TRUE
         JOIN prodx_roles r
           ON r.id = ur.role_id
          AND r.organization_id = ur.organization_id
          AND r.active = TRUE
         JOIN prodx_role_permissions rp
           ON rp.organization_id = ur.organization_id
          AND rp.role_id = ur.role_id
         JOIN prodx_permissions p
           ON p.id = rp.permission_id
        WHERE ur.organization_id = $1
          AND ur.user_id = $2
          AND ur.store_id = $3
          AND ur.active = TRUE
          AND p.permission_key = $4
     ) AS allowed`,
    [context.principal.organizationId, context.principal.userId, context.principal.storeId, normalizedPermission],
  );

  return rows[0]?.allowed === true;
};
