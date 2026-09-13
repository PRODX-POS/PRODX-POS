import { createPostgresAuthenticationRepository, type SqlExecutor } from './postgres-repository';
import { verifyPassword } from './password';
import { createSessionIssuer } from './session';

/**
 * Production authentication composition root.
 * The PostgreSQL adapter owns persistence while the session issuer owns
 * authentication/session policy; neither layer needs to know the other's
 * concrete implementation details.
 */
export const createPostgresAuthentication = (db: SqlExecutor) =>
  createSessionIssuer(createPostgresAuthenticationRepository(db), verifyPassword);
