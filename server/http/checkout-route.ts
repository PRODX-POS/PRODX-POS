import type { Request, Response } from 'express';
import type { CheckoutRequest } from '../../src/adapters/types';
import { createCheckoutService, CheckoutConflictError, CheckoutValidationError } from '../transactions/checkout-service';
import { requirePermission } from './createApp';
import type { TransactionalSqlExecutor } from '../db/transaction';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseCheckoutRequest = (value: unknown): CheckoutRequest => {
  if (!isObject(value)) throw new CheckoutValidationError('Request body must be an object.');
  return value as unknown as CheckoutRequest;
};

export const registerCheckoutRoute = (
  app: import('express').Express,
  db: TransactionalSqlExecutor,
  permission = 'sales:write',
): void => {
  const service = createCheckoutService(db);

  app.post('/api/v1/orders/checkout', requirePermission(permission), async (request: Request, response: Response) => {
    try {
      const context = request.prodxContext;
      if (!context) {
        response.status(500).json({ error: { code: 'REQUEST_CONTEXT_MISSING', message: 'Request context is required.', requestId: request.id } });
        return;
      }

      const payload = parseCheckoutRequest(request.body);
      if (payload.storeId !== context.principal.storeId || payload.cashierId !== context.principal.userId) {
        response.status(403).json({
          error: {
            code: 'STORE_SCOPE_VIOLATION',
            message: 'Checkout store and cashier must match the authenticated principal.',
            requestId: request.id,
          },
        });
        return;
      }

      const result = await service.checkout(payload);
      response.status(result.idempotencyCached ? 200 : 201).json(result);
    } catch (error) {
      if (error instanceof CheckoutValidationError) {
        response.status(400).json({ error: { code: error.code, message: error.message, requestId: request.id } });
        return;
      }
      if (error instanceof CheckoutConflictError) {
        response.status(409).json({ error: { code: error.code, message: error.message, requestId: request.id } });
        return;
      }
      throw error;
    }
  });
};
