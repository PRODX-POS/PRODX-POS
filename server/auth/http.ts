import type { Request } from 'express';
import type { RequestPrincipal } from '../http/types';
import type { SessionIssuer } from './session';

/**
 * Adapt the HTTP Authorization header to the server-side session issuer.
 * Only Bearer tokens are accepted; the token itself is never copied into the
 * authenticated request context.
 */
export const createBearerAuthenticator = (authentication: SessionIssuer) =>
  async (request: Request): Promise<RequestPrincipal | null> => {
    const authorization = request.header('authorization');
    if (!authorization) return null;

    const match = /^Bearer\s+([^\s]+)$/i.exec(authorization.trim());
    if (!match) return null;

    const session = await authentication.authenticateBearer(match[1]);
    if (!session) return null;

    return {
      userId: session.userId,
      organizationId: session.organizationId,
      storeId: session.storeId,
    };
  };
