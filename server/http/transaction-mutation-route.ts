import type { Express, Request, Response } from 'express';
import { requirePermission } from './createApp';
import type { TransactionalSqlExecutor } from '../db/transaction';
import { createTransactionMutationService, TransactionMutationError } from '../transactions/void-refund-shift-cash.service';

type Body = Record<string, unknown>;

const objectBody = (value: unknown): Body => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TransactionMutationError('Request body must be an object.');
  }
  return value as Body;
};

const requiredString = (body: Body, field: string): string => {
  const value = body[field];
  if (typeof value !== 'string' || !value.trim()) throw new TransactionMutationError(`${field} is required.`);
  return value.trim();
};

const principalStore = (request: Request): string => {
  const storeId = request.prodxContext?.principal.storeId;
  if (!storeId) throw new TransactionMutationError('Authenticated store context is required.');
  return storeId;
};

const assertStore = (request: Request, body: Body): string => {
  const storeId = principalStore(request);
  if (body.storeId !== undefined && body.storeId !== storeId) {
    const error = new TransactionMutationError('Request store must match the authenticated principal.');
    (error as TransactionMutationError & { httpStatus?: number; code: string }).httpStatus = 403;
    throw error;
  }
  return storeId;
};

const assertAuthorizer = (request: Request, authorizedByUserId: string): void => {
  const principal = request.prodxContext?.principal;
  if (!principal) throw new TransactionMutationError('Authenticated principal is required.');
  if (authorizedByUserId !== principal.userId) {
    const error = new TransactionMutationError('Authorizer must match the authenticated principal.');
    (error as TransactionMutationError & { httpStatus?: number; code: string }).httpStatus = 403;
    throw error;
  }
};

const sendMutationError = (response: Response, request: Request, error: unknown): boolean => {
  if (!(error instanceof TransactionMutationError)) return false;
  const status = (error as TransactionMutationError & { httpStatus?: number }).httpStatus ?? 409;
  response.status(status).json({ error: { code: error.code, message: error.message, requestId: request.id } });
  return true;
};

export const registerTransactionMutationRoutes = (
  app: Express,
  db: TransactionalSqlExecutor,
  permissions = {
    void: 'pos.void',
    refund: 'pos.refund',
    shiftOpen: 'pos.shift.open',
    shiftClose: 'pos.shift.close',
    cash: 'pos.cash.manage',
  },
): void => {
  const service = createTransactionMutationService(db);

  app.post('/api/v1/orders/:orderId/void', requirePermission(permissions.void), async (request, response) => {
    try {
      const body = objectBody(request.body);
      const storeId = assertStore(request, body);
      const authorizedByUserId = requiredString(body, 'authorizedByUserId');
      assertAuthorizer(request, authorizedByUserId);
      const result = await service.voidOrder(storeId, request.params.orderId, requiredString(body, 'reason'), authorizedByUserId);
      response.status(200).json(result);
    } catch (error) {
      if (sendMutationError(response, request, error)) return;
      throw error;
    }
  });

  app.post('/api/v1/orders/:orderId/refund', requirePermission(permissions.refund), async (request, response) => {
    try {
      const body = objectBody(request.body);
      const storeId = assertStore(request, body);
      const authorizedByUserId = requiredString(body, 'authorizedByUserId');
      assertAuthorizer(request, authorizedByUserId);
      const method = requiredString(body, 'refundMethod');
      if (!['cash', 'card', 'qr_digital'].includes(method)) throw new TransactionMutationError('refundMethod is invalid.');
      const restockItems = body.restockItems === undefined ? [] : body.restockItems;
      if (!Array.isArray(restockItems)) throw new TransactionMutationError('restockItems must be an array.');
      const result = await service.refundOrder(storeId, request.params.orderId, requiredString(body, 'refundAmount'), requiredString(body, 'reason'), method as 'cash' | 'card' | 'qr_digital', authorizedByUserId, restockItems as readonly { productId: string; quantity: number }[]);
      response.status(200).json(result);
    } catch (error) {
      if (sendMutationError(response, request, error)) return;
      throw error;
    }
  });

  app.post('/api/v1/shifts/open', requirePermission(permissions.shiftOpen), async (request, response) => {
    try {
      const body = objectBody(request.body);
      const storeId = assertStore(request, body);
      const cashierId = requiredString(body, 'cashierId');
      assertAuthorizer(request, cashierId);
      const result = await service.openShift(storeId, requiredString(body, 'registerId'), cashierId, requiredString(body, 'openingFloat'));
      response.status(201).json(result);
    } catch (error) {
      if (sendMutationError(response, request, error)) return;
      throw error;
    }
  });

  app.post('/api/v1/shifts/:shiftId/close', requirePermission(permissions.shiftClose), async (request, response) => {
    try {
      const body = objectBody(request.body);
      const storeId = assertStore(request, body);
      const result = await service.closeShift(request.params.shiftId, storeId, requiredString(body, 'actualCountedCash'));
      response.status(200).json(result);
    } catch (error) {
      if (sendMutationError(response, request, error)) return;
      throw error;
    }
  });

  app.post('/api/v1/shifts/:shiftId/cash-movements', requirePermission(permissions.cash), async (request, response) => {
    try {
      const body = objectBody(request.body);
      const storeId = assertStore(request, body);
      const userId = requiredString(body, 'userId');
      assertAuthorizer(request, userId);
      const type = requiredString(body, 'type');
      if (!['paid_in', 'paid_out', 'drawer_drop'].includes(type)) throw new TransactionMutationError('type is invalid.');
      const result = await service.recordCashMovement(request.params.shiftId, storeId, type as 'paid_in' | 'paid_out' | 'drawer_drop', requiredString(body, 'amount'), requiredString(body, 'reason'), userId);
      response.status(201).json(result);
    } catch (error) {
      if (sendMutationError(response, request, error)) return;
      throw error;
    }
  });
};
