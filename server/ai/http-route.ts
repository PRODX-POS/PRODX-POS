import type { NextFunction, Request, Response, Router } from 'express';
import { AIBackendBoundary, AIAuthorizationError } from './backend-boundary';
import { createAIHttpAdapter } from './http-contract';

const DEFAULT_PERMISSION = 'ai:use';
const MAX_BODY_BYTES = 64 * 1024;

export type AIHttpRouteOptions = {
  readonly boundary: AIBackendBoundary;
  readonly permission?: string;
};

/**
 * Installs POST /chat on an already-authenticated router.
 *
 * Authentication is intentionally owned by createApp's middleware. This route
 * derives all tenant/user identity from req.prodxContext and ignores browser
 * supplied identity, permission, endpoint and API-key fields.
 */
export function installAIHttpRoute(
  router: Router,
  options: AIHttpRouteOptions,
): void {
  const adapter = createAIHttpAdapter();
  const permission = options.permission ?? DEFAULT_PERMISSION;

  router.post('/chat', requirePermissionContext(permission), async (request, response, next) => {
    try {
      const context = request.prodxContext;
      if (!context) {
        response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.', requestId: request.id } });
        return;
      }

      const body = request.body as Record<string, unknown>;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        response.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Request body must be an object.', requestId: request.id } });
        return;
      }
      if (JSON.stringify(body).length > MAX_BODY_BYTES) {
        response.status(413).json({ error: { code: 'REQUEST_TOO_LARGE', message: 'AI request is too large.', requestId: request.id } });
        return;
      }

      const result = await adapter.handle(
        {
          body: {
            messages: body.messages as never,
            model: typeof body.model === 'string' ? body.model : undefined,
            temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
            max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : undefined,
          },
          principal: {
            userId: context.principal.userId,
            organizationId: context.principal.organizationId,
            storeId: context.principal.storeId,
            permissions: [permission],
          },
        },
        options.boundary,
      );

      response.status(200).json({ ...result, requestId: request.id });
    } catch (error) {
      if (error instanceof AIAuthorizationError) {
        response.status(403).json({ error: { code: 'FORBIDDEN', message: 'AI capability is not authorized.', requestId: request.id } });
        return;
      }
      next(error);
    }
  });
}

function requirePermissionContext(permission: string) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const context = request.prodxContext;
    if (!context) {
      response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.', requestId: request.id } });
      return;
    }
    const authorizer = request.app.locals.prodxAuthorizer as
      | ((context: typeof context, permission: string) => Promise<boolean> | boolean)
      | undefined;
    if (!authorizer) {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'AI capability is not authorized.', requestId: request.id } });
      return;
    }
    Promise.resolve(authorizer(context, permission)).then((allowed) => {
      if (!allowed) {
        response.status(403).json({ error: { code: 'FORBIDDEN', message: 'AI capability is not authorized.', requestId: request.id } });
        return;
      }
      next();
    }).catch(next);
  };
}
