import crypto from 'node:crypto';
import type { CheckoutRequest, CheckoutResponse } from '../../src/adapters/types';
import type { CartLineItem } from '../../src/domain/order';
import type { SqlQueryExecutor, TransactionalSqlExecutor } from '../db/transaction';

export class CheckoutValidationError extends Error {
  readonly code = 'CHECKOUT_VALIDATION_FAILED';
}

export class CheckoutConflictError extends Error {
  readonly code = 'CHECKOUT_CONFLICT';
}

type ProductRow = {
  id: string;
  store_id: string;
  price_minor: string;
  currency: string;
  tax_rate_bps: number;
  current_stock: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  idempotency_key: string;
  store_id: string;
  register_id: string;
  cashier_id: string;
  status: 'server_confirmed' | 'voided' | 'refunded';
  gross_subtotal_minor: string;
  item_discounts_minor: string;
  order_discount_minor: string;
  net_subtotal_minor: string;
  total_tax_minor: string;
  grand_total_minor: string;
  currency: string;
  total_items_count: number;
  created_at: Date;
  server_committed_at: Date;
};

type PaymentInput = CheckoutRequest['payments'][number];

const toBigInt = (value: unknown, field: string): bigint => {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
  throw new CheckoutValidationError(`${field} must be an integer minor-unit amount.`);
};

const toSafeNumber = (value: bigint, field: string): number => {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new CheckoutValidationError(`${field} exceeds safe integer range.`);
  return number;
};

const ensureMoney = (value: unknown, field: string): bigint => {
  const amount = toBigInt((value as { amountInCents?: unknown } | undefined)?.amountInCents, field);
  if (amount < 0n) throw new CheckoutValidationError(`${field} cannot be negative.`);
  return amount;
};

const calculateAuthoritativeTotals = (items: readonly CartLineItem[], products: readonly ProductRow[], orderDiscountBps: number) => {
  if (items.length === 0) throw new CheckoutValidationError('At least one item is required.');
  if (!Number.isInteger(orderDiscountBps) || orderDiscountBps < 0 || orderDiscountBps > 10000) {
    throw new CheckoutValidationError('Order discount basis points must be between 0 and 10000.');
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  const currency = products[0]?.currency;
  if (!currency) throw new CheckoutValidationError('No authoritative products were found.');

  let gross = 0n;
  let itemDiscounts = 0n;
  let netSubtotal = 0n;
  let totalTax = 0n;
  let totalItems = 0;

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new CheckoutValidationError(`Invalid quantity for product ${item.product.id}.`);
    }
    if (!Number.isInteger(item.discountBps) || item.discountBps < 0 || item.discountBps > 10000) {
      throw new CheckoutValidationError(`Invalid discount for product ${item.product.id}.`);
    }

    const product = productById.get(item.product.id);
    if (!product || product.store_id !== item.product.storeId) {
      throw new CheckoutValidationError(`Product ${item.product.id} is not available in the checkout store.`);
    }
    if (product.currency !== currency) throw new CheckoutValidationError('Currency mismatch between products.');

    const unitPrice = toBigInt(product.price_minor, `product ${product.id} price`);
    const rawSubtotal = unitPrice * BigInt(item.quantity);
    const discount = (rawSubtotal * BigInt(item.discountBps) + 5000n) / 10000n;
    const discountedSubtotal = rawSubtotal - discount;
    const tax = product.tax_rate_bps > 0
      ? (discountedSubtotal * BigInt(product.tax_rate_bps) + BigInt(10000 + product.tax_rate_bps) / 2n) / BigInt(10000 + product.tax_rate_bps)
      : 0n;
    const lineSubtotal = discountedSubtotal - tax;

    gross += rawSubtotal;
    itemDiscounts += discount;
    netSubtotal += lineSubtotal;
    totalTax += tax;
    totalItems += item.quantity;
  }

  const preOrderDiscountSubtotal = gross - itemDiscounts;
  const orderDiscount = (preOrderDiscountSubtotal * BigInt(orderDiscountBps) + 5000n) / 10000n;
  const grandTotal = preOrderDiscountSubtotal - orderDiscount;
  const adjustedNetSubtotal = preOrderDiscountSubtotal === 0n
    ? 0n
    : (netSubtotal * grandTotal + preOrderDiscountSubtotal / 2n) / preOrderDiscountSubtotal;
  const adjustedTax = preOrderDiscountSubtotal === 0n
    ? 0n
    : (totalTax * grandTotal + preOrderDiscountSubtotal / 2n) / preOrderDiscountSubtotal;

  return {
    gross,
    itemDiscounts,
    orderDiscount,
    netSubtotal: adjustedNetSubtotal,
    totalTax: adjustedTax,
    grandTotal,
    totalItems,
    currency,
  };
};

const readOrder = async (db: SqlQueryExecutor, storeId: string, idempotencyKey: string): Promise<OrderRow | null> => {
  const result = await db.query<OrderRow>(
    `SELECT id, order_number, idempotency_key, store_id, register_id, cashier_id, status,
            gross_subtotal_minor, item_discounts_minor, order_discount_minor, net_subtotal_minor,
            total_tax_minor, grand_total_minor, currency, total_items_count, created_at, server_committed_at
       FROM prodx_orders
      WHERE store_id = $1 AND idempotency_key = $2
      LIMIT 1`,
    [storeId, idempotencyKey],
  );
  return result.rows[0] ?? null;
};

const toResponse = (row: OrderRow, cached: boolean): CheckoutResponse => ({
  success: true,
  serverConfirmed: true,
  idempotencyCached: cached,
  message: cached ? 'Checkout already committed; returning the existing transaction.' : 'Checkout committed.',
  order: {
    id: row.id,
    orderNumber: row.order_number,
    idempotencyKey: row.idempotency_key,
    storeId: row.store_id,
    registerId: row.register_id,
    cashierId: row.cashier_id,
    cashierName: '',
    items: [],
    totals: {
      grossSubtotal: { amountInCents: toSafeNumber(BigInt(row.gross_subtotal_minor), 'gross subtotal'), currency: row.currency },
      itemDiscounts: { amountInCents: toSafeNumber(BigInt(row.item_discounts_minor), 'item discounts'), currency: row.currency },
      orderDiscount: { amountInCents: toSafeNumber(BigInt(row.order_discount_minor), 'order discount'), currency: row.currency },
      netSubtotal: { amountInCents: toSafeNumber(BigInt(row.net_subtotal_minor), 'net subtotal'), currency: row.currency },
      totalTax: { amountInCents: toSafeNumber(BigInt(row.total_tax_minor), 'tax'), currency: row.currency },
      grandTotal: { amountInCents: toSafeNumber(BigInt(row.grand_total_minor), 'grand total'), currency: row.currency },
      totalItemsCount: row.total_items_count,
    },
    payments: [],
    status: row.status,
    serverCommittedAt: row.server_committed_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  },
});

export const createCheckoutService = (db: TransactionalSqlExecutor) => ({
  async checkout(request: CheckoutRequest): Promise<CheckoutResponse> {
    if (!request.idempotencyKey?.trim()) throw new CheckoutValidationError('Idempotency key is required.');
    if (!request.storeId || !request.registerId || !request.cashierId) throw new CheckoutValidationError('Store, register and cashier are required.');

    return db.transaction(async (tx) => {
      const existing = await readOrder(tx, request.storeId, request.idempotencyKey);
      if (existing) return toResponse(existing, true);

      const itemIds = request.items.map((item) => item.product.id);
      const productResult = await tx.query<ProductRow>(
        `SELECT id, store_id, price_minor::text AS price_minor, currency, tax_rate_bps, current_stock
           FROM prodx_products
          WHERE store_id = $1 AND active = TRUE AND id = ANY($2::uuid[])
          FOR UPDATE`,
        [request.storeId, itemIds],
      );

      if (productResult.rows.length !== new Set(itemIds).size) {
        throw new CheckoutValidationError('One or more products are unavailable in this store.');
      }

      const orderDiscountBps = Number((request as CheckoutRequest & { orderDiscountBps?: number }).orderDiscountBps ?? 0);
      const totals = calculateAuthoritativeTotals(request.items, productResult.rows, orderDiscountBps);

      const clientGrandTotal = ensureMoney(request.totals.grandTotal, 'client grand total');
      if (clientGrandTotal !== totals.grandTotal) throw new CheckoutConflictError('Client total does not match server-authoritative total.');

      let paymentTotal = 0n;
      for (const payment of request.payments as readonly PaymentInput[]) {
        const amount = ensureMoney(payment.amount, `payment ${payment.id}`);
        if (amount <= 0n) throw new CheckoutValidationError('Payment amount must be positive.');
        paymentTotal += amount;
      }
      if (paymentTotal !== totals.grandTotal) throw new CheckoutConflictError('Payment total does not match server-authoritative total.');

      const orderId = crypto.randomUUID();
      const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomInt(100000, 999999)}`;
      const orderInsert = await tx.query<OrderRow>(
        `INSERT INTO prodx_orders
          (id, organization_id, store_id, register_id, cashier_id, shift_id, order_number, idempotency_key,
           gross_subtotal_minor, item_discounts_minor, order_discount_minor, net_subtotal_minor,
           total_tax_minor, grand_total_minor, currency, total_items_count)
         SELECT $1, s.organization_id, s.id, $2, $3, NULL, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
           FROM prodx_stores s
          WHERE s.id = $14
         ON CONFLICT (store_id, idempotency_key) DO NOTHING
         RETURNING id, order_number, idempotency_key, store_id, register_id, cashier_id, status,
                   gross_subtotal_minor::text, item_discounts_minor::text, order_discount_minor::text,
                   net_subtotal_minor::text, total_tax_minor::text, grand_total_minor::text,
                   currency, total_items_count, created_at, server_committed_at`,
        [orderId, request.registerId, request.cashierId, orderNumber, request.idempotencyKey,
          totals.gross.toString(), totals.itemDiscounts.toString(), totals.orderDiscount.toString(),
          totals.netSubtotal.toString(), totals.totalTax.toString(), totals.grandTotal.toString(),
          totals.currency, totals.totalItems, request.storeId],
      );

      if (orderInsert.rows.length === 0) {
        const concurrent = await readOrder(tx, request.storeId, request.idempotencyKey);
        if (!concurrent) throw new CheckoutConflictError('Idempotency conflict could not be resolved.');
        return toResponse(concurrent, true);
      }

      const order = orderInsert.rows[0];
      for (const item of request.items) {
        const product = productResult.rows.find((candidate) => candidate.id === item.product.id)!;
        const unitPrice = BigInt(product.price_minor);
        const rawSubtotal = unitPrice * BigInt(item.quantity);
        const itemDiscount = (rawSubtotal * BigInt(item.discountBps) + 5000n) / 10000n;
        const discountedSubtotal = rawSubtotal - itemDiscount;
        const tax = product.tax_rate_bps > 0
          ? (discountedSubtotal * BigInt(product.tax_rate_bps) + BigInt(10000 + product.tax_rate_bps) / 2n) / BigInt(10000 + product.tax_rate_bps)
          : 0n;
        const lineSubtotal = discountedSubtotal - tax;

        const stockUpdate = await tx.query<{ current_stock: number }>(
          `UPDATE prodx_products
              SET current_stock = current_stock - $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND store_id = $3 AND current_stock >= $1
            RETURNING current_stock`,
          [item.quantity, item.product.id, request.storeId],
        );
        if (stockUpdate.rows.length !== 1) throw new CheckoutConflictError(`Insufficient stock for product ${item.product.id}.`);

        await tx.query(
          `INSERT INTO prodx_order_items
            (id, organization_id, store_id, order_id, product_id, quantity, unit_price_minor,
             item_discount_bps, line_subtotal_minor, line_tax_minor, line_total_minor, currency)
           VALUES ($1, (SELECT organization_id FROM prodx_stores WHERE id = $2), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [crypto.randomUUID(), request.storeId, order.id, item.product.id, item.quantity, unitPrice.toString(),
            item.discountBps, lineSubtotal.toString(), tax.toString(), discountedSubtotal.toString(), product.currency],
        );

        await tx.query(
          `INSERT INTO prodx_inventory_ledger
            (id, organization_id, store_id, product_id, quantity_delta, resulting_stock, reason, reference_id, performed_by_user_id)
           SELECT $1, organization_id, store_id, product_id, $2, $3, 'sale_deduction', $4, $5
             FROM prodx_products WHERE id = $6 AND store_id = $7`,
          [crypto.randomUUID(), -item.quantity, stockUpdate.rows[0].current_stock, order.id, request.cashierId, item.product.id, request.storeId],
        );
      }

      for (const payment of request.payments as readonly PaymentInput[]) {
        const amount = ensureMoney(payment.amount, `payment ${payment.id}`);
        await tx.query(
          `INSERT INTO prodx_payments
            (id, organization_id, store_id, order_id, method, amount_minor, tendered_cash_minor,
             change_given_minor, auth_code, card_last_four, terminal_reference, currency)
           SELECT $1, organization_id, store_id, $2, $3, $4, $5, $6, $7, $8, $9, $10
             FROM prodx_orders WHERE id = $2 AND store_id = $11`,
          [payment.id, order.id, payment.method, amount.toString(),
            payment.tenderedCash ? ensureMoney(payment.tenderedCash, 'tendered cash').toString() : null,
            payment.changeGiven ? ensureMoney(payment.changeGiven, 'change given').toString() : null,
            payment.authCode ?? null, payment.cardLastFour ?? null, payment.terminalReference ?? null,
            totals.currency, request.storeId],
        );

        if (payment.method === 'cash') {
          const change = payment.changeGiven ? ensureMoney(payment.changeGiven, 'change given') : 0n;
          const cashSale = amount - change;
          if (cashSale <= 0n) throw new CheckoutValidationError('Cash sale after change must be positive.');
          await tx.query(
            `INSERT INTO prodx_cash_movements
              (id, organization_id, store_id, shift_id, type, amount_minor, reason, performed_by_user_id, currency)
             SELECT $1, organization_id, store_id, shift_id, 'cash_sale', $2, 'POS sale', $3, $4
               FROM prodx_orders WHERE id = $5 AND store_id = $6 AND shift_id IS NOT NULL`,
            [crypto.randomUUID(), cashSale.toString(), request.cashierId, totals.currency, order.id, request.storeId],
          );
        }
      }

      await tx.query(
        `INSERT INTO prodx_audit_log
          (id, organization_id, store_id, register_id, user_id, action, severity, details)
         SELECT $1, organization_id, store_id, register_id, cashier_id,
                'order_checkout_committed', 'info', $2::jsonb
           FROM prodx_orders WHERE id = $3 AND store_id = $4`,
        [crypto.randomUUID(), JSON.stringify({ orderId: order.id, idempotencyKey: request.idempotencyKey, grandTotalMinor: totals.grandTotal.toString() }), order.id, request.storeId],
      );

      return toResponse(order, false);
    });
  },
});
