import type { Request } from 'express';
import { createApp } from './createApp';
import type { RequestPrincipal } from './types';
import { hashSessionToken, createSessionIssuer } from '../auth/session';
import { createPostgresAuthenticationRepository } from '../auth/postgres-repository';
import { createPostgresPool, asSqlExecutor } from '../db/postgres';
import { createTransactionalPostgresExecutor } from '../db/transaction';
import { registerCheckoutRoute } from './checkout-route';
import { registerSyncRoutes } from './sync-route';
import { registerVoidRefundRoutes } from './void-refund-route';

const bearerToken = (request: Request): string | null => {
  const value = request.header('authorization');
  if (!value) return null;
  const match = /^Bearer ([A-Za-z0-9_-]{20,})$/.exec(value.trim());
  return match?.[1] ?? null;
};

export const createProductionApp = () => {
  const pool = createPostgresPool();
  const sql = asSqlExecutor(pool);
  const db = createTransactionalPostgresExecutor(pool);
  const repository = createPostgresAuthenticationRepository(sql);
  const sessions = createSessionIssuer(repository, async () => false);

  const authenticateRequest = async (request: Request): Promise<RequestPrincipal | null> => {
    const token = bearerToken(request);
    if (!token) return null;
    return sessions.authenticateBearer(token);
  };

  const authorizeRequest = async (context: { principal: RequestPrincipal }, permission: string): Promise<boolean> => {
    const rows = await sql.query<{ allowed: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM prodx_user_roles ur
           JOIN prodx_role_permissions rp
             ON rp.organization_id = ur.organization_id
            AND rp.role_id = ur.role_id
           JOIN prodx_permissions p ON p.id = rp.permission_id
          WHERE ur.organization_id = $1
            AND ur.user_id = $2
            AND ur.store_id = $3
            AND ur.active = TRUE
            AND p.permission_key = $4
       ) AS allowed`,
      [context.principal.organizationId, context.principal.userId, context.principal.storeId, permission],
    );
    return rows[0]?.allowed === true;
  };

  const app = createApp({
    authenticateRequest,
    authorizeRequest,
    configureRoutes: current => {
      registerCheckoutRoute(current, db);
      registerSyncRoutes(current, db);
      registerVoidRefundRoutes(current, db);
    },
  });

  return { app, pool, tokenHash: hashSessionToken };
};
