import { createPostgresAuthenticationRepository } from './postgres-repository';
import { verifyPassword } from './password';
import { createSessionIssuer, type SessionIssuer } from './session';
import type { SqlExecutor } from './postgres-repository';

/**
 * PostgreSQL application composition root for M2 authentication.
 *
 * The authentication policy remains vendor-independent; PostgreSQL is wired
 * here through the narrow SqlExecutor boundary.
 */
export const createPostgresAuthentication = (db: SqlExecutor): SessionIssuer =>
  createSessionIssuer(
    createPostgresAuthenticationRepository(db),
    verifyPassword,
  );
