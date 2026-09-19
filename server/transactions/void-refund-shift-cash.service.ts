import crypto from 'node:crypto';
import type { TransactionalSqlExecutor } from '../db/transaction';

export class TransactionMutationError extends Error {
  readonly code = 'TRANSACTION_MUTATION_FAILED';
}

const requireText = (value: string, field: string): string => {
  if (!value?.trim()) throw new TransactionMutationError(`${field} is required.`);
  return value.trim();
};

export const createTransactionMutationService = (db: TransactionalSqlExecutor) => ({
  async voidOrder(storeId: string, orderId: string, reason: string, authorizedByUserId: string) {
    return db.transaction(async tx => {
      requireText(storeId, 'storeId'); requireText(orderId, 'orderId'); requireText(reason, 'reason'); requireText(authorizedByUserId, 'authorizedByUserId');
      const order = (await tx.query(`SELECT * FROM prodx_orders WHERE id=$1 AND store_id=$2 FOR UPDATE`, [orderId, storeId])).rows[0] as any;
      if (!order) throw new TransactionMutationError('Order not found in this store.');
      if (order.status !== 'server_confirmed') throw new TransactionMutationError(`Order cannot be voided from status ${order.status}.`);
      const items = (await tx.query(`SELECT product_id, quantity FROM prodx_order_items WHERE order_id=$1 AND store_id=$2`, [orderId, storeId])).rows as any[];
      for (const item of items) {
        const stock = (await tx.query(`UPDATE prodx_products SET current_stock=current_stock+$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND store_id=$3 RETURNING current_stock`, [item.quantity, item.product_id, storeId])).rows[0] as any;
        if (!stock) throw new TransactionMutationError('Product no longer exists in this store.');
        await tx.query(`INSERT INTO prodx_inventory_ledger(id,organization_id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id) VALUES($1,$2,$3,$4,$5,$6,'refund_restock',$7,$8)`, [crypto.randomUUID(), order.organization_id, storeId, item.product_id, item.quantity, stock.current_stock, orderId, authorizedByUserId]);
      }
      await tx.query(`UPDATE prodx_orders SET status='voided' WHERE id=$1 AND store_id=$2`, [orderId, storeId]);
      await tx.query(`INSERT INTO prodx_audit_log(id,organization_id,store_id,register_id,user_id,action,severity,details) VALUES($1,$2,$3,$4,$5,'order_voided','critical',$6::jsonb)`, [crypto.randomUUID(), order.organization_id, storeId, order.register_id, authorizedByUserId, JSON.stringify({orderId, reason})]);
      return (await tx.query(`SELECT * FROM prodx_orders WHERE id=$1`, [orderId])).rows[0];
    });
  },

  async refundOrder(storeId: string, orderId: string, refundAmount: string, reason: string, refundMethod: 'cash'|'card'|'qr_digital', authorizedByUserId: string, restockItems: readonly {productId:string; quantity:number}[] = []) {
    return db.transaction(async tx => {
      requireText(storeId, 'storeId'); requireText(orderId, 'orderId'); requireText(refundAmount, 'refundAmount'); requireText(reason, 'reason'); requireText(authorizedByUserId, 'authorizedByUserId');
      const order = (await tx.query(`SELECT * FROM prodx_orders WHERE id=$1 AND store_id=$2 FOR UPDATE`, [orderId, storeId])).rows[0] as any;
      if (!order) throw new TransactionMutationError('Order not found in this store.');
      if (!['server_confirmed','refunded'].includes(order.status)) throw new TransactionMutationError(`Order cannot be refunded from status ${order.status}.`);
      const amount = Number(refundAmount);
      if (!Number.isFinite(amount) || amount <= 0) throw new TransactionMutationError('Refund amount must be positive.');
      const existing = Number(((await tx.query(`SELECT COALESCE(SUM(amount),0)::text AS total FROM prodx_refunds WHERE order_id=$1 AND store_id=$2`, [orderId, storeId])).rows[0] as any).total);
      if (existing + amount > Number(order.grand_total_amount)) throw new TransactionMutationError('Refund amount exceeds remaining refundable amount.');
      const refundId = crypto.randomUUID();
      await tx.query(`INSERT INTO prodx_refunds(id,organization_id,store_id,order_id,amount,method,reason,authorized_by_user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [refundId, order.organization_id, storeId, orderId, refundAmount, refundMethod, reason, authorizedByUserId]);
      for (const item of restockItems) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new TransactionMutationError('Restock quantity must be positive.');
        const stock = (await tx.query(`UPDATE prodx_products SET current_stock=current_stock+$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND store_id=$3 RETURNING current_stock`, [item.quantity, item.productId, storeId])).rows[0] as any;
        if (!stock) throw new TransactionMutationError('Refund restock product is not in this store.');
        await tx.query(`INSERT INTO prodx_inventory_ledger(id,organization_id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id) VALUES($1,$2,$3,$4,$5,$6,'refund_restock',$7,$8)`, [crypto.randomUUID(), order.organization_id, storeId, item.productId, item.quantity, stock.current_stock, orderId, authorizedByUserId]);
      }
      await tx.query(`UPDATE prodx_orders SET status='refunded' WHERE id=$1 AND store_id=$2`, [orderId, storeId]);
      await tx.query(`INSERT INTO prodx_audit_log(id,organization_id,store_id,register_id,user_id,action,severity,details) VALUES($1,$2,$3,$4,$5,'order_refunded','critical',$6::jsonb)`, [crypto.randomUUID(), order.organization_id, storeId, order.register_id, authorizedByUserId, JSON.stringify({orderId, refundId, amount: refundAmount, method: refundMethod, reason, restockItems})]);
      return (await tx.query(`SELECT * FROM prodx_orders WHERE id=$1`, [orderId])).rows[0];
    });
  },

  async openShift(storeId: string, registerId: string, cashierId: string, openingFloat: string) {
    return db.transaction(async tx => {
      const row = (await tx.query(`INSERT INTO prodx_shifts(id,organization_id,store_id,register_id,cashier_id,status,opening_float_amount,currency) SELECT $1,organization_id,$2,$3,$4,'open',$5,currency FROM prodx_stores WHERE id=$2 RETURNING *`, [crypto.randomUUID(), storeId, registerId, cashierId, openingFloat])).rows[0];
      if (!row) throw new TransactionMutationError('Store not found.');
      return row;
    });
  },

  async closeShift(shiftId: string, storeId: string, actualCountedCash: string) {
    return db.transaction(async tx => {
      const shift = (await tx.query(`SELECT * FROM prodx_shifts WHERE id=$1 AND store_id=$2 FOR UPDATE`, [shiftId, storeId])).rows[0] as any;
      if (!shift) throw new TransactionMutationError('Shift not found in this store.');
      if (shift.status !== 'open') throw new TransactionMutationError('Shift is already closed.');
      const counted = Number(actualCountedCash); if (!Number.isFinite(counted) || counted < 0) throw new TransactionMutationError('Actual counted cash is invalid.');
      const row = (await tx.query(`UPDATE prodx_shifts SET status='closed',closed_at=CURRENT_TIMESTAMP,actual_counted_cash_amount=$1 WHERE id=$2 RETURNING *`, [actualCountedCash, shiftId])).rows[0];
      await tx.query(`INSERT INTO prodx_audit_log(id,organization_id,store_id,register_id,user_id,action,severity,details) VALUES($1,$2,$3,$4,$5,'shift_closed','info',$6::jsonb)`, [crypto.randomUUID(), shift.organization_id, storeId, shift.register_id, shift.cashier_id, JSON.stringify({shiftId, actualCountedCash})]);
      return row;
    });
  },

  async recordCashMovement(shiftId: string, storeId: string, type: 'paid_in'|'paid_out'|'drawer_drop', amount: string, reason: string, userId: string) {
    return db.transaction(async tx => {
      const shift = (await tx.query(`SELECT * FROM prodx_shifts WHERE id=$1 AND store_id=$2 FOR UPDATE`, [shiftId, storeId])).rows[0] as any;
      if (!shift || shift.status !== 'open') throw new TransactionMutationError('An open shift is required.');
      if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new TransactionMutationError('Cash movement amount must be positive.');
      const row = (await tx.query(`INSERT INTO prodx_cash_movements(id,organization_id,store_id,shift_id,type,amount,reason,performed_by_user_id,currency) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [crypto.randomUUID(), shift.organization_id, storeId, shiftId, type, amount, requireText(reason,'reason'), userId, shift.currency])).rows[0];
      await tx.query(`INSERT INTO prodx_audit_log(id,organization_id,store_id,register_id,user_id,action,severity,details) VALUES($1,$2,$3,$4,$5,'cash_movement_recorded','info',$6::jsonb)`, [crypto.randomUUID(), shift.organization_id, storeId, shift.register_id, userId, JSON.stringify({shiftId, type, amount, reason})]);
      return row;
    });
  },
});
