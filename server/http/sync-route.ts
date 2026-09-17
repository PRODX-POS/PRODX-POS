import crypto from 'node:crypto';
import type { Express, Request, Response } from 'express';
import type { CheckoutRequest } from '../../src/adapters/types';
import type { TransactionalSqlExecutor } from '../db/transaction';
import { createCheckoutService, CheckoutConflictError, CheckoutValidationError } from '../transactions/checkout-service';
import { requirePermission } from './createApp';

type SyncCommand = {
  commandId: string;
  type: 'order_transaction';
  idempotencyKey: string;
  payload: CheckoutRequest;
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
};

const fingerprint = (command: Pick<SyncCommand, 'type' | 'idempotencyKey' | 'payload'>): string =>
  crypto.createHash('sha256').update(JSON.stringify(canonicalize(command))).digest('hex');

const parseCommand = (value: unknown): SyncCommand => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CheckoutValidationError('Sync command must be an object.');
  }
  const v = value as Record<string, unknown>;
  if (typeof v.commandId !== 'string' || !v.commandId.trim()) {
    throw new CheckoutValidationError('commandId is required.');
  }
  if (v.type !== 'order_transaction') {
    throw new CheckoutValidationError('Unsupported sync command type.');
  }
  if (typeof v.idempotencyKey !== 'string' || !v.idempotencyKey.trim()) {
    throw new CheckoutValidationError('idempotencyKey is required.');
  }
  if (!v.payload || typeof v.payload !== 'object' || Array.isArray(v.payload)) {
    throw new CheckoutValidationError('payload must be an object.');
  }
  return {
    commandId: v.commandId.trim(),
    type: 'order_transaction',
    idempotencyKey: v.idempotencyKey.trim(),
    payload: v.payload as CheckoutRequest,
  };
};

export const registerSyncRoute = (
  app: Express,
  db: TransactionalSqlExecutor,
  permission = 'pos.sell'
): void => {
  const checkout = createCheckoutService(db);

  app.post('/api/v1/sync/commands', requirePermission(permission), async (request: Request, response: Response) => {
    let persistedCommand: { store_id: string; command_id: string; request_fingerprint: string } | undefined;

    try {
      const context = request.prodxContext;
      if (!context) {
        response.status(500).json({
          error: {
            code: 'REQUEST_CONTEXT_MISSING',
            message: 'Request context is required.',
            requestId: request.id,
          },
        });
        return;
      }

      const command = parseCommand(request.body);
      if (
        command.payload.storeId !== context.principal.storeId ||
        command.payload.cashierId !== context.principal.userId ||
        command.payload.idempotencyKey !== command.idempotencyKey
      ) {
        response.status(403).json({
          error: {
            code: 'STORE_SCOPE_VIOLATION',
            message: 'Sync payload must match the authenticated principal and command idempotency key.',
            requestId: request.id,
          },
        });
        return;
      }

      const fp = fingerprint(command);
      const existing = (
        await db.query(
          'SELECT * FROM prodx_sync_commands WHERE store_id=$1 AND command_id=$2 LIMIT 1',
          [context.principal.storeId, command.commandId]
        )
      ).rows[0];

      if (existing) {
        if (existing.request_fingerprint !== fp) {
          await db.query(
            "UPDATE prodx_sync_commands SET status='conflict',last_error=$1,updated_at=CURRENT_TIMESTAMP WHERE store_id=$2 AND command_id=$3",
            ['The commandId is already bound to a different payload.', context.principal.storeId, command.commandId]
          );
          response.status(409).json({
            error: {
              code: 'SYNC_COMMAND_CONFLICT',
              message: 'The commandId is already bound to a different payload.',
              requestId: request.id,
            },
          });
          return;
        }

        if (existing.result_order_id) {
          const replay = await checkout.checkout(command.payload);
          response.status(200).json({
            commandId: command.commandId,
            status: 'complete',
            replayed: true,
            syncedAt: existing.completed_at,
            result: replay,
          });
          return;
        }
      }

      const inserted = await db.query(
        `INSERT INTO prodx_sync_commands(id,organization_id,store_id,user_id,command_id,command_type,idempotency_key,payload,request_fingerprint,status,attempts)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,'processing',1)
         ON CONFLICT(store_id,command_id) DO UPDATE SET
           status='processing',last_error=NULL,completed_at=NULL,updated_at=CURRENT_TIMESTAMP,
           attempts=prodx_sync_commands.attempts+1
         RETURNING store_id,command_id,request_fingerprint`,
        [
          crypto.randomUUID(),
          context.principal.organizationId,
          context.principal.storeId,
          context.principal.userId,
          command.commandId,
          command.type,
          command.idempotencyKey,
          JSON.stringify(command.payload),
          fp,
        ]
      );
      persistedCommand = inserted.rows[0];

      if (persistedCommand.request_fingerprint !== fp) {
        await db.query(
          "UPDATE prodx_sync_commands SET status='conflict',last_error=$1,updated_at=CURRENT_TIMESTAMP WHERE store_id=$2 AND command_id=$3",
          ['The commandId is already bound to a different payload.', context.principal.storeId, command.commandId]
        );
        response.status(409).json({
          error: {
            code: 'SYNC_COMMAND_CONFLICT',
            message: 'The commandId is already bound to a different payload.',
            requestId: request.id,
          },
        });
        return;
      }

      const result = await checkout.checkout(command.payload);
      await db.query(
        "UPDATE prodx_sync_commands SET status='complete',result_order_id=$1,last_error=NULL,updated_at=CURRENT_TIMESTAMP,completed_at=CURRENT_TIMESTAMP WHERE store_id=$2 AND command_id=$3 AND request_fingerprint=$4",
        [result.order.id, context.principal.storeId, command.commandId, fp]
      );
      response.status(result.idempotencyCached ? 200 : 201).json({
        commandId: command.commandId,
        status: 'complete',
        replayed: result.idempotencyCached,
        syncedAt: new Date().toISOString(),
        result,
      });
    } catch (error) {
      if (persistedCommand) {
        await db.query(
          "UPDATE prodx_sync_commands SET status='failed',last_error=$1,updated_at=CURRENT_TIMESTAMP WHERE store_id=$2 AND command_id=$3 AND status='processing'",
          [error instanceof Error ? error.message : 'Synchronization failed.', persistedCommand.store_id, persistedCommand.command_id]
        );
      }

      if (error instanceof CheckoutValidationError) {
        response.status(400).json({
          error: { code: error.code, message: error.message, requestId: request.id },
        });
        return;
      }
      if (error instanceof CheckoutConflictError) {
        response.status(409).json({
          error: { code: error.code, message: error.message, requestId: request.id },
        });
        return;
      }
      throw error;
    }
  });
};
