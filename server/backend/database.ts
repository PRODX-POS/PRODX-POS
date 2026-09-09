export interface DatabaseTransaction {
  readonly id: string;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface DatabaseClient {
  transaction<T>(work: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;
  healthcheck(): Promise<void>;
  close(): Promise<void>;
}

export interface DatabaseConfig {
  readonly url: string;
  readonly applicationName: string;
  readonly statementTimeoutMs: number;
}

export function readDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const url = env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL is required for backend database operations');

  const statementTimeoutMs = Number(env.DB_STATEMENT_TIMEOUT_MS ?? 5000);
  if (!Number.isInteger(statementTimeoutMs) || statementTimeoutMs <= 0) {
    throw new Error('DB_STATEMENT_TIMEOUT_MS must be a positive integer');
  }

  return {
    url,
    applicationName: env.DB_APPLICATION_NAME?.trim() || 'prodx-pos-backend',
    statementTimeoutMs,
  };
}
