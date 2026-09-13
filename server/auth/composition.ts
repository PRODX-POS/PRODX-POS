import { createPostgresAuthenticationRepository, type SqlExecutor } from './postgres-repository';
import { verifyPassword } from './password';
import { createSessionIssuer, type SessionIssuer } from './session';

/**
 * Production authentication composition root for PostgreSQL-backed credentials and sessions.
 * The database client remains injected so auth logic stays testable and vendor-neutral.
 */
export const createPostgresAuthentication = (db: SqlExecutor): SessionIssuer =>
  createSessionIssuer(
    createPostgresAuthenticationRepository(db),
    verifyPassword,
  );
