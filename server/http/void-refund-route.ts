import type { Express, Request, Response } from 'express';
import { requirePermission } from './createApp';
import { createVoidRefundService, VoidRefundConflictError, VoidRefundValidationError } from '../transactions/void-refund-service';
import type { TransactionalSqlExecutor } from '../db/transaction';

const errorResponse = (response: Response, request: Request, status: number, code: string, message: string) => {
  response.status(status).json({ error: { code, message, requestId: request.id } });
};
const bodyObject = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new VoidRefundValidationError('Request body must be an object.');
  return value as Record<string, unknown>;
};
const stringField = (body: Record<string, unknown>, field: string): string => {
  if (typeof body[field] !== 'string' || body[field].trim() === '') throw new VoidRefundValidationError(`${field} is required.`);
  return body[field].trim();
};

export const registerVoidRefundRoutes = (app: Express, db: TransactionalSqlExecutor): void => {
  const service = createVoidRefundService(db);

  app.post('/api/v1/orders/:orderId/refund', requirePermission('pos.refund'), async (request: Request, response: Response) => {
    try {
      const context = request.prodxContext;
      if (!context) return errorResponse(response, request, 500, 'REQUEST_CONTEXT_MISSING', 'Request context is required.');
      const body = bodyObject(request.body);
      const storeId = stringField(body, 'storeId');
      if (storeId !== context.principal.storeId) return errorResponse(response, request, 403, 'STORE_SCOPE_VIOLATION', 'Refund store must match the authenticated principal.');
      const refundMethod = body.refundMethod;
      if (refundMethod !== 'cash' && refundMethod !== 'card' && refundMethod !== 'qr_digital') throw new VoidRefundValidationError('Unsupported refund method.');
      const result = await service.refund({
        storeId,
        orderId: request.params.orderId,
        idempotencyKey: stringField(body, 'idempotencyKey'),
        refundAmount: body.refundAmount as { amountInCents: number; currency: string },
        reason: stringField(body, 'reason'),
        refundMethod,
        restockItems: Array.isArray(body.restockItems) ? body.restockItems as { productId: string; quantity: number }[] : [],
        authorizedByUserId: context.principal.userId,
        terminalReference: typeof body.terminalReference === 'string' ? body.terminalReference : undefined,
      });
      response.status(result.idempotencyCached ? 200 : 201).json(result);
    } catch (error) {
      if (error instanceof VoidRefundValidationError) return errorResponse(response, request, 400, error.code, error.message);
      if (error instanceof VoidRefundConflictError) return errorResponse(response, request, 409, error.code, error.message);
      throw error;
    }
  });

  app.post('/api/v1/orders/:orderId/void', requirePermission('pos.void'), async (request: Request, response: Response) => {
    try {
      const context = request.prodxContext;
      if (!context) return errorResponse(response, request, 500, 'REQUEST_CONTEXT_MISSING', 'Request context is required.');
      const body = bodyObject(request.body);
      const storeId = stringField(body, 'storeId');
      if (storeId !== context.principal.storeId) return errorResponse(response, request, 403, 'STORE_SCOPE_VIOLATION', 'Void store must match the authenticated principal.');
      const result = await service.voidOrder({
        storeId,
        orderId: request.params.orderId,
        idempotencyKey: stringField(body, 'idempotencyKey'),
        reason: stringField(body, 'reason'),
        authorizedByUserId: context.principal.userId,
      });
      response.status(result.idempotencyCached ? 200 : 201).json(result);
    } catch (error) {
      if (error instanceof VoidRefundValidationError) return errorResponse(response, request, 400, error.code, error.message);
      if (error instanceof VoidRefundConflictError) return errorResponse(response, request, 409, error.code, error.message);
      throw error;
    }
  });
};
