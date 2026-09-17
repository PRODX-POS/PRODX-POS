import 'dotenv/config';
import type { Request } from 'express';
import { createApp } from './http/createApp';
import { registerAuthRoute } from './http/auth-route';
import { registerCheckoutRoute } from './http/checkout-route';
import { registerSyncRoute } from './http/sync-route';
import type { RequestPrincipal, RequestContext } from './http/types';
import { createPostgresAuthentication } from './auth/composition';
import { createPostgresPool, asSqlExecutor } from './db/postgres';
import { createTransactionalPostgresExecutor } from './db/transaction';

const port = Number(process.env.PORT ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');

const pool = createPostgresPool({ max: Number(process.env.DB_POOL_MAX ?? 10) });
const db = createTransactionalPostgresExecutor(pool);
const authDb = asSqlExecutor(pool);
const authentication = createPostgresAuthentication(authDb);

const bearerToken = (request: Request): string | null => {
  const header = request.header('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || null;
};

const authenticateRequest = async (request: Request): Promise<RequestPrincipal | null> => {
  const token = bearerToken(request);
  if (!token) return null;
  const session = await authentication.authenticateBearer(token);
  if (!session) return null;
  return { userId: session.userId, organizationId: session.organizationId, storeId: session.storeId };
};

const authorizeRequest = async (context: RequestContext, permission: string): Promise<boolean> => {
  if (!permission.trim()) return false;
  const rows = await authDb.query<{ allowed: boolean }>(`SELECT EXISTS (SELECT 1 FROM prodx_user_roles ur JOIN prodx_role_permissions rp ON rp.organization_id=ur.organization_id AND rp.role_id=ur.role_id JOIN prodx_permissions p ON p.id=rp.permission_id JOIN prodx_roles r ON r.id=ur.role_id AND r.organization_id=ur.organization_id WHERE ur.organization_id=$1 AND ur.user_id=$2 AND ur.store_id=$3 AND ur.active=TRUE AND r.active=TRUE AND p.permission_key=$4) AS allowed`, [context.principal.organizationId, context.principal.userId, context.principal.storeId, permission]);
  return rows[0]?.allowed === true;
};

const app = createApp({
  authenticateRequest,
  authorizeRequest,
  publicPaths: ['/api/v1/auth/login', '/api/v1/health'],
  configureRoutes: configuredApp => {
    registerAuthRoute(configuredApp, authentication, authDb);
    registerCheckoutRoute(configuredApp, db);
    registerSyncRoute(configuredApp, db);
  },
});

const server = app.listen(port, '0.0.0.0', () => console.info(`[prodx-pos] HTTP server listening on 0.0.0.0:${port}`));
const shutdown = async (signal: string): Promise<void> => {
  console.info(`[prodx-pos] ${signal} received; shutting down.`);
  await new Promise<void>(resolve => server.close(() => resolve()));
  await pool.end();
};
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
