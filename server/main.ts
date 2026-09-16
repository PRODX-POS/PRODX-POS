import type { Request } from 'express';
import { createPostgresAuthentication } from './auth/composition';
import { hasPermission, type AuthorizationSnapshot } from './auth/authorization';
import { asSqlExecutor, createPostgresPool } from './db/postgres';
import { createTransactionalPostgresExecutor } from './db/transaction';
import { registerCheckoutRoute } from './http/checkout-route';
import { createApp } from './http/createApp';
import type { AuthenticateRequest } from './http/types';

const parseBearerToken = (request: Request): string | null => {
  const header = request.header('authorization');
  if (!header) return null;
  const match = /^Bearer ([^\s]+)$/.exec(header.trim());
  if (!match) return null;
  return match[1];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const requiredNonBlankString = (value: unknown): string | null => (
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

const requiredSecret = (value: unknown): string | null => (
  typeof value === 'string' && value.length > 0 ? value : null
);

const createAuthorizationSnapshotLoader = (db: ReturnType<typeof asSqlExecutor>) => async (
  context: Parameters<typeof hasPermission>[0],
): Promise<AuthorizationSnapshot> => {
  const rows = await db.query<{
    user_id: string;
    organization_id: string;
    store_id: string;
    permission_key: string;
  }>(
    `SELECT ur.user_id, ur.organization_id, ur.store_id, p.permission_key
       FROM prodx_user_roles ur
       JOIN prodx_roles r
         ON r.id = ur.role_id AND r.organization_id = ur.organization_id AND r.active = TRUE
       JOIN prodx_role_permissions rp
         ON rp.role_id = ur.role_id AND rp.organization_id = ur.organization_id
       JOIN prodx_permissions p ON p.id = rp.permission_id
       JOIN prodx_store_memberships sm
         ON sm.organization_id = ur.organization_id
        AND sm.store_id = ur.store_id
        AND sm.user_id = ur.user_id
        AND sm.active = TRUE
      WHERE ur.organization_id = $1
        AND ur.user_id = $2
        AND ur.store_id = $3
        AND ur.active = TRUE`,
    [context.principal.organizationId, context.principal.userId, context.principal.storeId],
  );

  return {
    userId: context.principal.userId,
    organizationId: context.principal.organizationId,
    storeId: context.principal.storeId,
    permissions: new Set(rows.map((row) => row.permission_key)),
  };
};

export const createProductionApp = () => {
  const pool = createPostgresPool();
  const sql = asSqlExecutor(pool);
  const transactionDb = createTransactionalPostgresExecutor(pool);
  const authentication = createPostgresAuthentication(sql);
  const loadAuthorizationSnapshot = createAuthorizationSnapshotLoader(sql);

  const authenticateRequest: AuthenticateRequest = async (request) => {
    const token = parseBearerToken(request);
    return token ? authentication.authenticateBearer(token) : null;
  };

  const app = createApp({
    authenticateRequest,
    authorizeRequest: async (context, permission) => {
      const snapshot = await loadAuthorizationSnapshot(context);
      return hasPermission(context, permission, snapshot);
    },
    isPublicRequest: (request) => request.path === '/api/v1/auth/login',
    configureRoutes: (configuredApp) => {
      configuredApp.post('/api/v1/auth/login', async (request, response) => {
        if (!isPlainObject(request.body)) {
          response.status(400).json({
            error: { code: 'INVALID_REQUEST', message: 'Request body must be an object.', requestId: request.id },
          });
          return;
        }

        const username = requiredNonBlankString(request.body.username);
        const password = requiredSecret(request.body.password);
        const deviceId = requiredNonBlankString(request.body.deviceId);
        if (!username || !password || !deviceId) {
          response.status(400).json({
            error: { code: 'INVALID_REQUEST', message: 'username, password, and deviceId are required.', requestId: request.id },
          });
          return;
        }

        const session = await authentication.authenticateCredentials({ username, password, deviceId });
        if (!session) {
          response.status(401).json({
            error: { code: 'INVALID_CREDENTIALS', message: 'Authentication failed.', requestId: request.id },
          });
          return;
        }

        response.setHeader('cache-control', 'no-store');
        response.status(200).json(session);
      });

      registerCheckoutRoute(configuredApp, transactionDb);
    },
  });

  return { app, pool };
};

export const startProductionServer = async (): Promise<void> => {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const { app, pool } = createProductionApp();
  const server = app.listen(port, () => {
    process.stdout.write(`PRODX POS server listening on port ${port}\n`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    process.stdout.write(`Received ${signal}; shutting down gracefully.\n`);
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await pool.end();
  };

  process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.once('SIGINT', () => { void shutdown('SIGINT'); });
};

const isDirectExecution = process.argv[1]
  ? new URL(process.argv[1], 'file:').href === import.meta.url
  : false;

if (isDirectExecution) {
  await startProductionServer();
}