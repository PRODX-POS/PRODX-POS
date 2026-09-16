import type { Express, Request, Response } from 'express';
import { requirePermission } from './createApp';
import { createRefundVoidService, type RefundItem, type RefundMethod } from '../transactions/refund-void-service';
import type { TransactionalSqlExecutor } from '../db/transaction';

const errorResponse = (response: Response, request: Request, status: number, code: string, message: string): void => {
  response.status(status).json({ error: { code, message, requestId: request.id } });
};

const bodyString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
};

export const registerRefundVoidRoutes = (
  app: Express,
  db: TransactionalSqlExecutor,
  permissions: { refund?: string; void?: string } = {},
): void => {
  const service = createRefundVoidService(db);

  app.post('/api/v1/orders/:orderId/refund', requirePermission(permissions.refund ?? 'pos.refund'), async (request: Request, response: Response) => {
    try {
      const context = request.prodxContext;
      if (!context) return errorResponse(response, request, 500, 'REQUEST_CONTEXT_MISSING', 'Request context is required.');
      const body = request.body as Record<string, unknown>;
      const result = await service.refund({
        storeId: context.principal.storeId,
        orderId: bodyString(request.params.orderId, 'orderId'),
        amountInCents: Number(body.amountInCents),
        currency: bodyString(body.currency, 'currency'),
        reason: bodyString(body.reason, 'reason'),
        refundMethod: bodyString(body.refundMethod, 'refundMethod') as RefundMethod,
        authorizedByUserId: context.principal.userId,
        idempotencyKey: bodyString(body.idempotencyKey, 'idempotencyKey'),
        itemsToRestock: Array.isArray(body.itemsToRestock) ? body.itemsToRestock as RefundItem[] : [],
      });
      response.status(result.idempotencyCached ? 200 : 201).json({ success: true, serverConfirmed: true, idempotencyCached: result.idempotencyCached, adjustment: result.adjustment });
    } catch (error) {
      const status = error instanceof Error && error.constructor.name.includes('Validation') ? 400 : error instanceof Error && error.constructor.name.includes('Conflict') ? 409 : 500;
      errorResponse(response, request, status, error instanceof Error && 'code' in error ? String((error as any).code) : 'INTERNAL_ERROR', status === 500 ? 'An unexpected server error occurred.' : error instanceof Error ? error.message : 'Request failed.');
    }
  });

  app.post('/api/v1/orders/:orderId/void', requirePermission(permissions.void ?? 'pos.void'), async (request: Request, response: Response) => {
    try {
      const context = request.prodxContext;
      if (!context) return errorResponse(response, request, 500, 'REQUEST_CONTEXT_MISSING', 'Request context is required.');
      const body = request.body as Record<string, unknown>;
      const result = await service.void({
        storeId: context.principal.storeId,
        orderId: bodyString(request.params.orderId, 'orderId'),
        reason: bodyString(body.reason, 'reason'),
        authorizedByUserId: context.principal.userId,
        idempotencyKey: bodyString(body.idempotencyKey, 'idempotencyKey'),
      });
      response.status(result.idempotencyCached ? 200 : 201).json({ success: true, serverConfirmed: true, idempotencyCached: result.idempotencyCached, adjustment: result.adjustment });
    } catch (error) {
      const status = error instanceof Error && error.constructor.name.includes('Validation') ? 400 : error instanceof Error && error.constructor.name.includes('Conflict') ? 409 : 500;
      errorResponse(response, request, status, error instanceof Error && 'code' in error ? String((error as any).code) : 'INTERNAL_ERROR', status === 500 ? 'An unexpected server error occurred.' : error instanceof Error ? error.message : 'Request failed.');
    }
  });
};
