import type { Request, Response } from 'express';
import type { SessionIssuer } from './session';
import type { RequestPrincipal } from '../http/types';

export type AuthenticatedSessionPayload = {
  organization: { id: string; name: string; slug: string; stores: readonly unknown[] };
  currentStore: unknown;
  registerId: string;
  currentUser: unknown;
  token: string;
  expiresAt: string;
};

export type AuthenticationHttpOptions = {
  issuer: SessionIssuer;
  resolveLoginContext: (input: { organizationSlug: string; storeCode: string; registerId: string; username: string }) => Promise<{ organizationId: string; deviceId: string; registerId: string } | null>;
  resolveSessionPayload: (principal: RequestPrincipal, token: string) => Promise<AuthenticatedSessionPayload>;
  cookieName?: string;
  secureCookies?: boolean;
};

type LoginBody = { organizationSlug?: unknown; storeCode?: unknown; emailOrPin?: unknown; passwordOrPin?: unknown; registerId?: unknown };
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const parseCookies = (header: string | undefined): Record<string, string> => {
  if (!header) return {};
  return Object.fromEntries(header.split(';').flatMap((part) => {
    const index = part.indexOf('=');
    if (index < 1) return [];
    try { return [[part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]]; } catch { return []; }
  }));
};

const setSessionCookie = (response: Response, name: string, token: string, secure: boolean, maxAgeSeconds: number) => {
  response.setHeader('Set-Cookie', `${name}=${encodeURIComponent(token)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
};
const clearSessionCookie = (response: Response, name: string, secure: boolean) => {
  response.setHeader('Set-Cookie', `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
};
const tokenFromRequest = (request: Request, cookieName: string): string | null => {
  const authorization = request.header('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim() || null;
  return parseCookies(request.header('cookie'))[cookieName] || null;
};

export const createAuthenticationHttp = (options: AuthenticationHttpOptions) => {
  const cookieName = options.cookieName || 'prodx_session';
  const secureCookies = options.secureCookies ?? process.env.NODE_ENV === 'production';
  const maxAgeSeconds = 8 * 60 * 60;

  const authenticateRequest = async (request: Request): Promise<RequestPrincipal | null> => {
    const token = tokenFromRequest(request, cookieName);
    if (!token) return null;
    const session = await options.issuer.authenticateBearer(token);
    return session ? { userId: session.userId, organizationId: session.organizationId, storeId: session.storeId } : null;
  };

  const configurePublicRoutes = (app: import('express').Express) => {
    app.post('/auth/login', async (request, response) => {
      const body = request.body as LoginBody;
      const organizationSlug = text(body.organizationSlug);
      const storeCode = text(body.storeCode);
      const username = text(body.emailOrPin);
      const password = text(body.passwordOrPin);
      const registerId = text(body.registerId);
      if (!organizationSlug || !storeCode || !username || !password || !registerId) {
        response.status(400).json({ error: { code: 'INVALID_LOGIN_REQUEST', message: 'Required login fields are missing.', requestId: request.id } });
        return;
      }
      try {
        const context = await options.resolveLoginContext({ organizationSlug, storeCode, registerId, username });
        if (!context) {
          response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Authentication failed.', requestId: request.id } });
          return;
        }
        const issued = await options.issuer.authenticateCredentials({ username, password, deviceId: context.deviceId, organizationId: context.organizationId });
        if (!issued) {
          response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Authentication failed.', requestId: request.id } });
          return;
        }
        const principal = await options.issuer.authenticateBearer(issued.token);
        if (!principal) {
          response.status(500).json({ error: { code: 'SESSION_INITIALIZATION_FAILED', message: 'Authenticated session could not be initialized.', requestId: request.id } });
          return;
        }
        const payload = await options.resolveSessionPayload(principal, issued.token);
        setSessionCookie(response, cookieName, issued.token, secureCookies, maxAgeSeconds);
        response.status(200).json({ ...payload, registerId: context.registerId });
      } catch {
        response.status(401).json({ error: { code: 'AUTHENTICATION_FAILED', message: 'Authentication failed.', requestId: request.id } });
      }
    });
  };

  const configureRoutes = (app: import('express').Express) => {
    app.post('/auth/logout', async (request, response) => {
      const token = tokenFromRequest(request, cookieName);
      if (token) await options.issuer.revokeBearer(token);
      clearSessionCookie(response, cookieName, secureCookies);
      response.status(204).send();
    });
    app.get('/auth/session', async (request, response) => {
      const token = tokenFromRequest(request, cookieName);
      if (!token || !request.prodxContext) {
        response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.', requestId: request.id } });
        return;
      }
      try {
        const payload = await options.resolveSessionPayload(request.prodxContext.principal, token);
        response.status(200).json(payload);
      } catch {
        response.status(401).json({ error: { code: 'SESSION_UNAVAILABLE', message: 'Authenticated session is unavailable.', requestId: request.id } });
      }
    });
  };

  return { authenticateRequest, configurePublicRoutes, configureRoutes };
};
