import type { Express, Request, Response } from 'express';
import { requirePermission } from './createApp';
import { createRefundVoidService, type RefundItem, type RefundMethod } from '../transactions/refund-void-service';
import type { TransactionalSqlExecutor } from '../db/transaction';

const errorResponse = (response: Response, request: Request, status: number, code: string, message: string): void => {
  response.status(status).json({ error: { code, message, requestId: request.id } });
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const uuid = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${field} must be a valid UUID.`);
  }
  return value;
};
const nonEmptyString = (value: unknown, field: string, maxLength = 128): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) throw new Error(`${field} is required and must be a string of at most ${maxLength} characters.`);
  return value.trim();
};
const positiveSafeInteger = (value: unknown, field: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) throw new Error(`${field} must be a positive integer.`);
  return value as number;
};
const exactKeys = (value: Record<string, unknown>, allowed: readonly string[], field: string): void => {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) if (!allowedSet.has(key)) throw new Error(`${field} contains an unsupported field: ${key}.`);
};

const parseRefundBody = (value: unknown): {
  amountInCents: number;
  currency: string;
  reason: string;
  refundMethod: RefundMethod;
  idempotencyKey: string;
  itemsToRestock: RefundItem[];
} => {
  if (!isRecord(value)) throw new Error('Request body must be an object.');
  exactKeys(value, ['amountInCents', 'currency', 'reason', 'refundMethod', 'idempotencyKey', 'itemsToRestock'], 'Refund request');
  const amountInCents = positiveSafeInteger(value.amountInCents, 'amountInCents');
  if (typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency)) throw new Error('currency must be a three-letter uppercase ISO currency code.');
  const currency = value.currency;
  const reason = nonEmptyString(value.reason, 'reason', 500);
  if (value.refundMethod !== 'cash' && value.refundMethod !== 'card' && value.refundMethod !== 'qr_digital') throw new Error('refundMethod must be cash, card, or qr_digital.');
  const refundMethod = value.refundMethod;
  const idempotencyKey = nonEmptyString(value.idempotencyKey, 'idempotencyKey', 255);
  if (!Array.isArray(value.itemsToRestock)) throw new Error('itemsToRestock must be an array.');
  const itemsToRestock: RefundItem[] = value.itemsToRestock.map((item, index) => {
    if (!isRecord(item)) throw new Error(`itemsToRestock[${index}] must be an object.`);
    exactKeys(item, ['productId', 'quantity'], `itemsToRestock[${index}]`);
    return {
      productId: uuid(item.productId, `itemsToRestock[${index}].productId`),
      quantity: positiveSafeInteger(item.quantity, `itemsToRestock[${index}].quantity`),
    };
  });
  const seen = new Set(itemsToRestock.map((item) => item.productId));
  if (seen.size !== itemsToRestock.length) throw new Error('itemsToRestock must contain unique products.');
  return { amountInCents, currency, reason, refundMethod, idempotencyKey, itemsToRestock };
};

const parseVoidBody = (value: unknown): { reason: string; idempotencyKey: string } => {
  if (!isRecord(value)) throw new Error('Request body must be an object.');
  exactKeys(value, ['reason', 'idempotencyKey'], 'Void request');
  return {
    reason: nonEmptyString(value.reason, 'reason', 500),
    idempotencyKey: nonEmptyString(value.idempotencyKey, 'idempotencyKey', 255),
  };
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
      const orderId = uuid(request.params.orderId, 'orderId');
      const body = parseRefundBody(request.body);
      const result = await service.refund({
        storeId: context.principal.storeId,
        orderId,
        ...body,
        authorizedByUserId: context.principal.userId,
      });
      response.status(result.idempotencyCached ? 200 : 201).json({ success: true, serverConfirmed: true, idempotencyCached: result.idempotencyCached, adjustment: result.adjustment });
    } catch (error) {
      const status = error instanceof Error && error.message.includes('required') || error instanceof Error && error.message.includes('must be') || error instanceof Error && error.message.includes('contains an unsupported') ? 400 : error instanceof Error && error.constructor.name.includes('Validation') ? 400 : error instanceof Error && error.constructor.name.includes('Conflict') ? 409 : 500;
      errorResponse(response, request, status, error instanceof Error && 'code' in error ? String((error as any).code) : status === 400 ? 'INVALID_REQUEST' : 'INTERNAL_ERROR', status === 500 ? 'An unexpected server error occurred.' : error instanceof Error ? error.message : 'Request failed.');
    }
  });

  app.post('/api/v1/orders/:orderId/void', requirePermission(permissions.void ?? 'pos.void'), async (request: Request, response: Response) => {
    try {
      const context = request.prodxContext;
      if (!context) return errorResponse(response, request, 500, 'REQUEST_CONTEXT_MISSING', 'Request context is required.');
      const orderId = uuid(request.params.orderId, 'orderId');
      const body = parseVoidBody(request.body);
      const result = await service.void({
        storeId: context.principal.storeId,
        orderId,
        ...body,
        authorizedByUserId: context.principal.userId,
      });
      response.status(result.idempotencyCached ? 200 : 201).json({ success: true, serverConfirmed: true, idempotencyCached: result.idempotencyCached, adjustment: result.adjustment });
    } catch (error) {
      const status = error instanceof Error && error.message.includes('required') || error instanceof Error && error.message.includes('must be') || error instanceof Error && error.message.includes('contains an unsupported') ? 400 : error instanceof Error && error.constructor.name.includes('Validation') ? 400 : error instanceof Error && error.constructor.name.includes('Conflict') ? 409 : 500;
      errorResponse(response, request, status, error instanceof Error && 'code' in error ? String((error as any).code) : status === 400 ? 'INVALID_REQUEST' : 'INTERNAL_ERROR', status === 500 ? 'An unexpected server error occurred.' : error instanceof Error ? error.message : 'Request failed.');
    }
  });
};
