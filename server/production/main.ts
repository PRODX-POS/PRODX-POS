import 'dotenv/config';
import http from 'node:http';
import { createPostgresAuthentication } from '../auth/composition';
import { createPostgresAuthorizer } from '../auth/authorization';
import { createPostgresPool, asSqlExecutor } from '../db/postgres';
import { createApp } from '../http/createApp';
import { registerCheckoutRoute } from '../http/checkout-route';
import { registerRefundVoidRoutes } from '../http/refund-void-route';

type LoginBody = { username?: unknown; password?: unknown; deviceId?: unknown };
const requiredEnv = (name: string): string => { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required.`); return value; };
const parsePort = (raw: string | undefined): number => { const value = Number(raw ?? '3000'); if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error('PORT must be an integer between 1 and 65535.'); return value; };
const parsePositiveIntegerEnv = (name: string, raw: string | undefined, fallback: number): number => { const value = Number(raw ?? fallback); if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`); return value; };
const bearerToken = (header: string | undefined): string | null => { const match = header ? /^Bearer ([A-Za-z0-9_-]+)$/.exec(header) : null; return match?.[1] ?? null; };
const isLoginBody = (value: unknown): value is LoginBody => typeof value === 'object' && value !== null && !Array.isArray(value);

const main = async (): Promise<void> => {
  const databaseUrl = requiredEnv('DATABASE_URL');
  const port = parsePort(process.env.PORT);
  const poolMax = parsePositiveIntegerEnv('PG_POOL_MAX', process.env.PG_POOL_MAX, 10);
  const connectionTimeoutMillis = parsePositiveIntegerEnv('PG_CONNECTION_TIMEOUT_MS', process.env.PG_CONNECTION_TIMEOUT_MS, 5000);
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';

  const pool = createPostgresPool({ connectionString: databaseUrl, max: poolMax, connectionTimeoutMillis });
  const db = asSqlExecutor(pool);
  const authentication = createPostgresAuthentication(db);
  const authorizeRequest = createPostgresAuthorizer(db);

  const app = createApp({
    authenticateRequest: async (request) => {
      const token = bearerToken(request.header('authorization'));
      return token ? authentication.authenticateBearer(token) : null;
    },
    readinessCheck: async () => { await pool.query('SELECT 1'); return true; },
    authorizeRequest,
    configurePublicRoutes: (configuredApp) => {
      configuredApp.post('/api/v1/auth/login', async (request, response) => {
        if (!isLoginBody(request.body)) { response.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Request body must be an object.', requestId: request.id } }); return; }
        const { username, password, deviceId } = request.body;
        if (typeof username !== 'string' || typeof password !== 'string' || typeof deviceId !== 'string') { response.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'username, password, and deviceId are required.', requestId: request.id } }); return; }
        const result = await authentication.authenticateCredentials({ username, password, deviceId });
        if (!result) { response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Credentials or device authorization are invalid.', requestId: request.id } }); return; }
        response.status(200).json(result);
      });
    },
    configureRoutes: (configuredApp) => {
      const transactionalDb = {
        ...db,
        transaction: async <T>(work: (tx: typeof db) => Promise<T>): Promise<T> => {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            const tx = { query: async <R extends Record<string, unknown>>(sql: string, parameters: readonly unknown[] = []) => (await client.query<R & import('pg').QueryResultRow>(sql, [...parameters])).rows };
            const result = await work(tx);
            await client.query('COMMIT');
            return result;
          } catch (error) {
            try { await client.query('ROLLBACK'); } catch { /* preserve original transaction failure */ }
            throw error;
          } finally { client.release(); }
        },
      };
      registerCheckoutRoute(configuredApp, transactionalDb);
      registerRefundVoidRoutes(configuredApp, transactionalDb);
    },
  });

  const server = http.createServer(app);
  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end();
  };
  process.once('SIGTERM', () => { void shutdown(); });
  process.once('SIGINT', () => { void shutdown(); });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '0.0.0.0', () => resolve()); });
  process.stdout.write(`PRODX-POS server listening on port ${port}\n`);
};

main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : 'Server startup failed.'}\n`); process.exitCode = 1; });
