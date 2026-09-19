import type { Express, Request, Response } from 'express';
import { requirePermission } from './createApp';
import {
  createSupervisorAuthorizationService,
  SupervisorAuthorizationError,
} from '../auth/supervisor-authorization';
import type { SqlExecutor } from '../auth/postgres-repository';

type Body = {
  action: 'refund';
  orderId: string;
  supervisorUsername: string;
  supervisorSecret: string;
};

const valid = (value: unknown): value is Body => {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return body.action === 'refund' &&
    typeof body.orderId === 'string' && body.orderId.trim().length > 0 &&
    typeof body.supervisorUsername === 'string' && body.supervisorUsername.trim().length > 0 &&
    typeof body.supervisorSecret === 'string' && body.supervisorSecret.length > 0;
};

export const registerSupervisorAuthorizationRoute = (app: Express, db: SqlExecutor): void => {
  const service = createSupervisorAuthorizationService(db);

  app.post('/api/v1/authorizations/supervisor', requirePermission('pos.refund'), async (request: Request, response: Response) => {
    const context = request.prodxContext;
    if (!context) {
      response.status(500).json({ error: { code: 'REQUEST_CONTEXT_MISSING', message: 'Request context is required.' } });
      return;
    }

    if (!valid(request.body)) {
      response.status(400).json({ error: { code: 'SUPERVISOR_AUTH_VALIDATION_FAILED', message: 'Malformed supervisor authorization request.' } });
      return;
    }

    try {
      const result = await service.authorize({
        organizationId: context.principal.organizationId,
        storeId: context.principal.storeId,
        requesterUserId: context.principal.userId,
        requesterSessionId: context.principal.sessionId,
        action: request.body.action,
        orderId: request.body.orderId,
        supervisorUsername: request.body.supervisorUsername,
        supervisorSecret: request.body.supervisorSecret,
      });
      response.status(201).json(result);
    } catch (error) {
      if (error instanceof SupervisorAuthorizationError) {
        const status = error.code === 'SUPERVISOR_NOT_ALLOWED' ? 403 : 401;
        response.status(status).json({ error: { code: error.code, message: 'Supervisor authorization was not granted.' } });
        return;
      }
      throw error;
    }
  });
};
