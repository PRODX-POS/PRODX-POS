import crypto from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import type {
  ApiErrorBody,
  AuthenticateRequest,
  AuthorizeRequest,
  RequestContext,
  RequestPrincipal,
} from './types';

declare global {
  namespace Express {
    interface Request {
      id: string;
      prodxContext?: RequestContext;
    }
  }
}

export type BackendBoundaryOptions = {
  authenticateRequest: AuthenticateRequest;
  authorizeRequest?: AuthorizeRequest;
  configurePublicRoutes?: (app: express.Express) => void;
  configureRoutes?: (app: express.Express) => void;
  readinessCheck?: () => Promise<boolean> | boolean;
};

const sendError = (
  response: Response,
  status: number,
  code: string,
  message: string,
  requestId: string,
  details?: unknown,
): void => {
  const body: ApiErrorBody = {
    error: { code, message, requestId, ...(details === undefined ? {} : { details }) },
  };
  response.status(status).json(body);
};

const requestId = (request: Request): string => {
  const supplied = request.header('x-request-id');
  return supplied && supplied.length <= 128 ? supplied : crypto.randomUUID();
};

export const requirePermission = (permission: string) => {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const context = request.prodxContext;
    if (!context) {
      sendError(response, 500, 'REQUEST_CONTEXT_MISSING', 'Request context is required.', request.id);
      return;
    }

    const authorizer = request.app.locals.prodxAuthorize as AuthorizeRequest | undefined;
    if (!authorizer) {
      sendError(response, 500, 'AUTHORIZATION_NOT_CONFIGURED', 'Authorization is not configured.', context.requestId);
      return;
    }

    if (!(await authorizer(context, permission))) {
      sendError(response, 403, 'FORBIDDEN', 'The requested capability is not authorized.', context.requestId);
      return;
    }

    next();
  };
};

const attachRequestId = (request: Request, response: Response, next: NextFunction): void => {
  const id = requestId(request);
  request.id = id;
  response.setHeader('x-request-id', id);
  next();
};

const authenticate = (authenticator: AuthenticateRequest) => {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const principal: RequestPrincipal | null = await authenticator(request);
      if (!principal) {
        sendError(response, 401, 'UNAUTHENTICATED', 'Authentication is required.', request.id);
        return;
      }

      request.prodxContext = {
        requestId: request.id,
        principal,
      };
      next();
    } catch {
      sendError(response, 401, 'UNAUTHENTICATED', 'Authentication could not be verified.', request.id);
    }
  };
};

export const createApp = (options: BackendBoundaryOptions) => {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(attachRequestId);

  // Liveness must not depend on authentication or PostgreSQL. It is intended
  // for process/container health checks and returns only a fixed status body.
  app.get('/api/v1/health/live', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  // Readiness is public because orchestrators need to decide whether this
  // process can receive traffic before a user session exists. The callback
  // must perform a real dependency check (normally PostgreSQL SELECT 1).
  app.get('/api/v1/health/ready', async (request, response) => {
    try {
      const ready = options.readinessCheck ? await options.readinessCheck() : false;
      if (!ready) {
        sendError(response, 503, 'NOT_READY', 'The service is not ready to receive traffic.', request.id);
        return;
      }
      response.status(200).json({ status: 'ok' });
    } catch {
      sendError(response, 503, 'NOT_READY', 'The service is not ready to receive traffic.', request.id);
    }
  });

  options.configurePublicRoutes?.(app);

  app.locals.prodxAuthorize = options.authorizeRequest;
  app.use(authenticate(options.authenticateRequest));

  app.get('/api/v1/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  options.configureRoutes?.(app);

  app.use((_request, response) => {
    sendError(response, 404, 'NOT_FOUND', 'Route not found.', response.getHeader('x-request-id')?.toString() ?? 'unknown');
  });

  app.use((error: unknown, request: Request, response: Response, _next: NextFunction) => {
    const details = process.env.NODE_ENV === 'production'
      ? undefined
      : error instanceof Error ? error.message : error;
    sendError(response, 500, 'INTERNAL_ERROR', 'An unexpected server error occurred.', request.id, details);
  });

  return app;
};
