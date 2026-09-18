import type { Express, Request, Response } from 'express';
import { requirePermission } from './createApp';
import {
  createRefundService,
  RefundConflictError,
  RefundProviderUnavailableError,
  RefundValidationError,
} from '../transactions/refund-service';
import type { TransactionalSqlExecutor } from '../db/transaction';

type RefundBody = {
  orderId: string;
  refundAmount: { amountInCents: number; currency: string };
  reason: string;
  refundMethod: 'cash' | 'card' | 'qr_digital';
  authorizedByUserId: string;
  itemsToRestock?: readonly { productId: string; quantity: number }[];
  idempotencyKey: string;
};

export const registerRefundRoute = (
  app: Express,
  db: TransactionalSqlExecutor,
  permission = 'pos.refund',
): void => {
  const service = createRefundService(db);

  app.post('/api/v1/orders/refund', requirePermission(permission), async (request: Request, response: Response) => {
    try {
      const context = request.prodxContext;
      if (!context) {
        response.status(500).json({ error: { code: 'REQUEST_CONTEXT_MISSING', message: 'Request context is required.', requestId: request.id } });
        return;
      }

      const body = request.body as RefundBody;
      if (!body || body.authorizedByUserId !== context.principal.userId) {
        response.status(403).json({ error: { code: 'AUTHORIZATION_SCOPE_VIOLATION', message: 'The refund authorizer must be the authenticated principal.', requestId: request.id } });
        return;
      }

      const result = await service.refund({
        storeId: context.principal.storeId,
        orderId: body.orderId,
        refundAmount: body.refundAmount,
        reason: body.reason,
        refundMethod: body.refundMethod,
        authorizedByUserId: body.authorizedByUserId,
        itemsToRestock: body.itemsToRestock,
        idempotencyKey: body.idempotencyKey,
      });
      response.status(result.idempotencyCached ? 200 : 201).json(result);
    } catch (error) {
      if (error instanceof RefundValidationError) {
        response.status(400).json({ error: { code: error.code, message: error.message, requestId: request.id } });
        return;
      }
      if (error instanceof RefundConflictError) {
        response.status(409).json({ error: { code: error.code, message: error.message, requestId: request.id } });
        return;
      }
      if (error instanceof RefundProviderUnavailableError) {
        response.status(503).json({ error: { code: error.code, message: error.message, requestId: request.id } });
        return;
      }
      throw error;
    }
  });
};
