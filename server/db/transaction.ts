import type { Pool, PoolClient, QueryResultRow } from 'pg';

export type SqlQueryExecutor = {
  query<T extends QueryResultRow>(sql: string, parameters?: readonly unknown[]): Promise<{ rows: T[] }>;
};

export type TransactionalSqlExecutor = SqlQueryExecutor & {
  transaction<T>(work: (tx: SqlQueryExecutor) => Promise<T>): Promise<T>;
};

export const createTransactionalPostgresExecutor = (pool: Pool): TransactionalSqlExecutor => ({
  query: <T extends QueryResultRow>(sql: string, parameters: readonly unknown[] = []) =>
    pool.query<T>(sql, [...parameters]),

  transaction: async <T>(work: (tx: SqlQueryExecutor) => Promise<T>): Promise<T> => {
    const client: PoolClient = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work({
        query: <R extends QueryResultRow>(sql: string, parameters: readonly unknown[] = []) =>
          client.query<R>(sql, [...parameters]),
      });
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original transaction failure.
      }
      throw error;
    } finally {
      client.release();
    }
  },
});
