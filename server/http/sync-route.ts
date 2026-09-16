import type { Express, Request, Response } from 'express';
import { requirePermission } from './createApp';
import { createCheckoutService, CheckoutConflictError, CheckoutValidationError } from '../transactions/checkout-service';
import type { CheckoutRequest } from '../../src/adapters/types';
import type { TransactionalSqlExecutor } from '../db/transaction';

const errorResponse = (response: Response, request: Request, status: number, code: string, message: string) => {
  response.status(status).json({ error: { code, message, requestId: request.id } });
};

const bodyObject = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new CheckoutValidationError('Request body must be an object.');
  }
  return value as Record<string, unknown>;
};

const stringField = (body: Record<string, unknown>, field: string): string => {
  if (typeof body[field] !== 'string' || body[field].trim() === '') {
    throw new CheckoutValidationError(`${field} is required.`);
  }
  return body[field].trim();
};

const asCheckoutRequest = (body: Record<string, unknown>, storeId: string, cashierId: string): CheckoutRequest => {
  const payload = body.payload;
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new CheckoutValidationError('Offline order payload is required.');
  }
  const request = payload as CheckoutRequest;
  if (request.storeId !== storeId) throw new Error('STORE_SCOPE_VIOLATION');
  if (request.cashierId !== cashierId) throw new Error('PRINCIPAL_SCOPE_VIOLATION');
  if (request.idempotencyKey !== stringField(body, 'idempotencyKey')) {
    throw new CheckoutConflictError('Offline idempotency key does not match the payload.');
  }
  if (!request.isOfflineSubmission) throw new CheckoutValidationError('Offline replay must be explicitly marked as an offline submission.');
  return request;
};

export const registerSyncRoutes = (app: Express, db: TransactionalSqlExecutor): void => {
  const checkout = createCheckoutService(db);

  app.post('/api/v1/sync/outbox', requirePermission('pos.sell'), async (request: Request, response: Response) => {
    try {
      const context = request.prodxContext;
      if (!context) return errorResponse(response, request, 500, 'REQUEST_CONTEXT_MISSING', 'Request context is required.');
      const body = bodyObject(request.body);
      const type = stringField(body, 'type');
      if (type !== 'order_transaction') {
        return errorResponse(response, request, 400, 'SYNC_TYPE_UNSUPPORTED', 'Only order_transaction replay is supported by the authoritative transaction API.');
      }
      const idempotencyKey = stringField(body, 'idempotencyKey');
      const replay = asCheckoutRequest(body, context.principal.storeId, context.principal.userId);
      const result = await checkout.checkout({ ...replay, idempotencyKey, isOfflineSubmission: true });
      response.status(result.idempotencyCached ? 200 : 201).json({
        success: true,
        serverConfirmed: true,
        idempotencyCached: result.idempotencyCached === true,
        confirmedOrder: result.order,
        syncedAt: result.order.serverCommittedAt,
      });
    } catch (error) {
      if (error instanceof CheckoutValidationError) return errorResponse(response, request, 400, error.code, error.message);
      if (error instanceof CheckoutConflictError) return errorResponse(response, request, 409, error.code, error.message);
      if (error instanceof Error && error.message === 'STORE_SCOPE_VIOLATION') return errorResponse(response, request, 403, 'STORE_SCOPE_VIOLATION', 'Offline payload store must match the authenticated store.');
      if (error instanceof Error && error.message === 'PRINCIPAL_SCOPE_VIOLATION') return errorResponse(response, request, 403, 'PRINCIPAL_SCOPE_VIOLATION', 'Offline payload cashier must match the authenticated principal.');
      throw error;
    }
  });
};
