import 'dotenv/config';
import http from 'node:http';
import { createPostgresAuthentication } from '../auth/composition';
import { createPostgresPool, asSqlExecutor } from '../db/postgres';
import { createApp } from '../http/createApp';

type LoginBody = {
  username?: unknown;
  password?: unknown;
  deviceId?: unknown;
};

const requiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const parsePort = (raw: string | undefined): number => {
  const value = Number(raw ?? '3000');
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return value;
};

const bearerToken = (header: string | undefined): string | null => {
  if (!header) return null;
  const match = /^Bearer ([A-Za-z0-9_-]+)$/.exec(header);
  return match?.[1] ?? null;
};

const isLoginBody = (value: unknown): value is LoginBody => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const main = async (): Promise<void> => {
  const databaseUrl = requiredEnv('DATABASE_URL');
  const port = parsePort(process.env.PORT);
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';

  const pool = createPostgresPool({
    connectionString: databaseUrl,
    max: Number(process.env.PG_POOL_MAX ?? '10'),
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS ?? '5000'),
  });
  const authentication = createPostgresAuthentication(asSqlExecutor(pool));

  const app = createApp({
    authenticateRequest: async (request) => {
      const token = bearerToken(request.header('authorization'));
      if (!token) return null;
      return authentication.authenticateBearer(token);
    },
    readinessCheck: async () => {
      await pool.query('SELECT 1');
      return true;
    },
    // Authorization and protected business-route composition remain explicit
    // gates. Do not silently grant permissions in production.
    authorizeRequest: async () => false,
    configurePublicRoutes: (configuredApp) => {
      configuredApp.post('/api/v1/auth/login', async (request, response) => {
        if (!isLoginBody(request.body)) {
          response.status(400).json({
            error: {
              code: 'INVALID_REQUEST',
              message: 'Request body must be an object.',
              requestId: request.id,
            },
          });
          return;
        }

        const { username, password, deviceId } = request.body;
        if (typeof username !== 'string' || typeof password !== 'string' || typeof deviceId !== 'string') {
          response.status(400).json({
            error: {
              code: 'INVALID_REQUEST',
              message: 'username, password, and deviceId are required.',
              requestId: request.id,
            },
          });
          return;
        }

        const result = await authentication.authenticateCredentials({ username, password, deviceId });
        if (!result) {
          response.status(401).json({
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Credentials or device authorization are invalid.',
              requestId: request.id,
            },
          });
          return;
        }

        response.status(200).json(result);
      });
    },
  });

  const server = http.createServer(app);
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close((closeError) => {
      if (closeError) process.exitCode = 1;
    });
    try {
      await pool.end();
    } catch {
      process.exitCode = 1;
    }
    if (!server.listening) process.exitCode = process.exitCode ?? 0;
    void signal;
  };

  process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.once('SIGINT', () => { void shutdown('SIGINT'); });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => resolve());
  });

  process.stdout.write(`PRODX-POS server listening on port ${port}\n`);
};

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Server startup failed.'}\n`);
  process.exitCode = 1;
});
