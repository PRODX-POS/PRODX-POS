import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresPool } from '../db/postgres';
import type { CheckoutRequest } from '../../src/adapters/types';
import { createCheckoutService } from './checkout-service';
import { createTransactionalPostgresExecutor } from '../db/transaction';

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? createPostgresPool({ connectionString: databaseUrl, max: 8 }) : null;
const db = pool ? createTransactionalPostgresExecutor(pool) : null;

const ids = {
  organization: '00000000-0000-4000-8000-000000000301',
  store: '00000000-0000-4000-8000-000000000311',
  user: '00000000-0000-4000-8000-000000000321',
  device: '00000000-0000-4000-8000-000000000331',
  register: '00000000-0000-4000-8000-000000000341',
  shift: '00000000-0000-4000-8000-000000000351',
  category: '00000000-0000-4000-8000-000000000361',
  product: '00000000-0000-4000-8000-000000000371',
};

const request = (idempotencyKey: string, overrides: Partial<CheckoutRequest> = {}): CheckoutRequest => ({
  idempotencyKey,
  storeId: ids.store,
  registerId: ids.register,
  cashierId: ids.user,
  items: [{
    lineId: 'line-1',
    product: {
      id: ids.product,
      storeId: ids.store,
      sku: 'PG-TEST-1',
      barcode: 'PG-TEST-BAR-1',
      name: 'Postgres integration product',
      categoryId: ids.category,
      price: { amountInCents: 1, currency: 'THB' },
      costPrice: { amountInCents: 1, currency: 'THB' },
      taxRateBps: 0,
      currentStock: 999,
      reorderPoint: 1,
      unitOfMeasure: 'each',
    },
    quantity: 2,
    unitPrice: { amountInCents: 1, currency: 'THB' },
    discountBps: 0,
    lineSubtotal: { amountInCents: 2, currency: 'THB' },
    lineTax: { amountInCents: 0, currency: 'THB' },
    lineTotal: { amountInCents: 2, currency: 'THB' },
  }],
  totals: {
    grossSubtotal: { amountInCents: 2000, currency: 'THB' },
    itemDiscounts: { amountInCents: 0, currency: 'THB' },
    orderDiscount: { amountInCents: 0, currency: 'THB' },
    netSubtotal: { amountInCents: 2000, currency: 'THB' },
    totalTax: { amountInCents: 0, currency: 'THB' },
    grandTotal: { amountInCents: 2000, currency: 'THB' },
    totalItemsCount: 2,
  },
  payments: [{
    id: '00000000-0000-4000-8000-000000000381',
    method: 'cash',
    amount: { amountInCents: 2000, currency: 'THB' },
    tenderedCash: { amountInCents: 2000, currency: 'THB' },
    changeGiven: { amountInCents: 0, currency: 'THB' },
    timestamp: '2026-09-14T00:00:00.000Z',
  }],
  ...overrides,
});

const seed = async (): Promise<void> => {
  if (!pool) throw new Error('DATABASE_URL is required for PostgreSQL integration tests.');
  await pool.query('DELETE FROM prodx_cash_movements WHERE shift_id = $1', [ids.shift]);
  await pool.query('DELETE FROM prodx_audit_log WHERE store_id = $1', [ids.store]);
  await pool.query('DELETE FROM prodx_payments WHERE store_id = $1', [ids.store]);
  await pool.query('DELETE FROM prodx_order_items WHERE store_id = $1', [ids.store]);
  await pool.query('DELETE FROM prodx_inventory_ledger WHERE store_id = $1', [ids.store]);
  await pool.query('DELETE FROM prodx_orders WHERE store_id = $1', [ids.store]);
  await pool.query('DELETE FROM prodx_shifts WHERE id = $1', [ids.shift]);
  await pool.query('DELETE FROM prodx_products WHERE id = $1', [ids.product]);
  await pool.query('DELETE FROM prodx_categories WHERE id = $1', [ids.category]);
  await pool.query('DELETE FROM prodx_registers WHERE id = $1', [ids.register]);
  await pool.query('DELETE FROM prodx_store_memberships WHERE store_id = $1', [ids.store]);
  await pool.query('DELETE FROM prodx_devices WHERE id = $1', [ids.device]);
  await pool.query('DELETE FROM prodx_user_credentials WHERE user_id = $1', [ids.user]);
  await pool.query('DELETE FROM prodx_users WHERE id = $1', [ids.user]);
  await pool.query('DELETE FROM prodx_stores WHERE id = $1', [ids.store]);
  await pool.query('DELETE FROM prodx_organizations WHERE id = $1', [ids.organization]);

  await pool.query('INSERT INTO prodx_organizations (id, code, name) VALUES ($1, $2, $3)', [ids.organization, 'pg-int-301', 'Checkout PG Integration']);
  await pool.query(
    'INSERT INTO prodx_stores (id, organization_id, code, name, business_timezone) VALUES ($1, $2, $3, $4, $5)',
    [ids.store, ids.organization, 'pg-store-311', 'Checkout PG Store', 'Asia/Bangkok'],
  );
  await pool.query(
    'INSERT INTO prodx_users (id, organization_id, username, display_name) VALUES ($1, $2, $3, $4)',
    [ids.user, ids.organization, 'pg-cashier-321', 'PG Cashier'],
  );
  await pool.query(
    'INSERT INTO prodx_store_memberships (organization_id, store_id, user_id) VALUES ($1, $2, $3)',
    [ids.organization, ids.store, ids.user],
  );
  await pool.query(
    'INSERT INTO prodx_devices (id, organization_id, store_id, device_key, name) VALUES ($1, $2, $3, $4, $5)',
    [ids.device, ids.organization, ids.store, 'pg-device-331', 'PG Device'],
  );
  await pool.query(
    'INSERT INTO prodx_registers (id, organization_id, store_id, code, name) VALUES ($1, $2, $3, $4, $5)',
    [ids.register, ids.organization, ids.store, 'PG-REG-341', 'PG Register'],
  );
  await pool.query(
    `INSERT INTO prodx_shifts (id, organization_id, store_id, register_id, cashier_id, opening_float_minor, currency)
     VALUES ($1, $2, $3, $4, $5, 0, 'THB')`,
    [ids.shift, ids.organization, ids.store, ids.register, ids.user],
  );
  await pool.query(
    `INSERT INTO prodx_categories (id, organization_id, store_id, name, slug)
     VALUES ($1, $2, $3, 'PG Test Category', 'pg-test-category')`,
    [ids.category, ids.organization, ids.store],
  );
  await pool.query(
    `INSERT INTO prodx_products
      (id, organization_id, store_id, category_id, sku, barcode, name, price_minor, cost_price_minor, currency,
       tax_rate_bps, current_stock, reorder_point, unit_of_measure)
     VALUES ($1, $2, $3, $4, 'PG-TEST-1', 'PG-TEST-BAR-1', 'Postgres integration product', 1000, 500, 'THB', 0, 10, 1, 'each')`,
    [ids.product, ids.organization, ids.store, ids.category],
  );
};

const cleanup = async (): Promise<void> => {
  if (!pool) return;
  await pool.query('DELETE FROM prodx_cash_movements WHERE shift_id = $1', [ids.shift]);
  await pool.query('DELETE FROM prodx_audit_log WHERE store_id = $1', [ids.store]);
  await pool.query('DELETE FROM prodx_payments WHERE store_id = $1', [ids.store]);
  await pool.query('DELETE FROM prodx_order_items WHERE store_id = $1', [ids.store]);
  await pool.query('DELETE FROM prodx_inventory_ledger WHERE store_id = $1', [ids.store]);
  await pool.query('DELETE FROM prodx_orders WHERE store_id = $1', [ids.store]);
  await pool.query('DELETE FROM prodx_shifts WHERE id = $1', [ids.shift]);
  await pool.query('DELETE FROM prodx_products WHERE id = $1', [ids.product]);
  await pool.query('DELETE FROM prodx_categories WHERE id = $1', [ids.category]);
  await pool.query('DELETE FROM prodx_registers WHERE id = $1', [ids.register]);
  await pool.query('DELETE FROM prodx_store_memberships WHERE store_id = $1', [ids.store]);
  await pool.query('DELETE FROM prodx_devices WHERE id = $1', [ids.device]);
  await pool.query('DELETE FROM prodx_users WHERE id = $1', [ids.user]);
  await pool.query('DELETE FROM prodx_stores WHERE id = $1', [ids.store]);
  await pool.query('DELETE FROM prodx_organizations WHERE id = $1', [ids.organization]);
};

test('checkout PostgreSQL integration proves authoritative pricing, atomic effects, cash movement, and concurrent idempotency', async (t) => {
  if (!pool || !db) {
    t.skip('DATABASE_URL is not configured; run server:test with PostgreSQL.');
    return;
  }

  await seed();
  t.after(async () => {
    await cleanup();
    await pool.end();
  });

  const service = createCheckoutService(db);
  const first = await service.checkout(request('pg-success-1'));
  assert.equal(first.success, true);
  assert.equal(first.order.totals.grandTotal.amountInCents, 2000);
  assert.equal(first.order.items.length, 1);
  assert.equal(first.order.items[0].unitPrice.amountInCents, 1000);
  assert.equal(first.order.payments.length, 1);

  const counts = await pool.query<{ orders: number; items: number; payments: number; inventory: number; cash: number; audits: number; stock: number }>(
    `SELECT
      (SELECT count(*) FROM prodx_orders WHERE id = $1) AS orders,
      (SELECT count(*) FROM prodx_order_items WHERE order_id = $1) AS items,
      (SELECT count(*) FROM prodx_payments WHERE order_id = $1) AS payments,
      (SELECT count(*) FROM prodx_inventory_ledger WHERE reference_id = $1) AS inventory,
      (SELECT count(*) FROM prodx_cash_movements WHERE shift_id = $2 AND reason = 'POS sale') AS cash,
      (SELECT count(*) FROM prodx_audit_log WHERE store_id = $3 AND action = 'order_checkout_committed') AS audits,
      (SELECT current_stock FROM prodx_products WHERE id = $4) AS stock`,
    [first.order.id, ids.shift, ids.store, ids.product],
  );
  assert.deepEqual(counts.rows[0], { orders: 1, items: 1, payments: 1, inventory: 1, cash: 1, audits: 1, stock: 8 });

  const cached = await service.checkout(request('pg-success-1'));
  assert.equal(cached.idempotencyCached, true);
  assert.equal(cached.order.id, first.order.id);
  assert.equal(cached.order.items.length, 1);
  assert.equal(cached.order.payments.length, 1);

  await pool.query('UPDATE prodx_products SET current_stock = 10 WHERE id = $1', [ids.product]);

  const duplicatePaymentRequest = request('pg-rollback-1', {
    payments: [
      {
        id: '00000000-0000-4000-8000-000000000382',
        method: 'cash',
        amount: { amountInCents: 1000, currency: 'THB' },
        tenderedCash: { amountInCents: 1000, currency: 'THB' },
        changeGiven: { amountInCents: 0, currency: 'THB' },
        timestamp: '2026-09-14T00:00:00.000Z',
      },
      {
        id: '00000000-0000-4000-8000-000000000382',
        method: 'cash',
        amount: { amountInCents: 1000, currency: 'THB' },
        tenderedCash: { amountInCents: 1000, currency: 'THB' },
        changeGiven: { amountInCents: 0, currency: 'THB' },
        timestamp: '2026-09-14T00:00:00.000Z',
      },
    ],
  });
  await assert.rejects(service.checkout(duplicatePaymentRequest));
  const rollback = await pool.query<{ orders: number; items: number; payments: number; inventory: number; cash: number; audits: number; stock: number }>(
    `SELECT
      (SELECT count(*) FROM prodx_orders WHERE idempotency_key = 'pg-rollback-1') AS orders,
      (SELECT count(*) FROM prodx_order_items oi JOIN prodx_orders o ON o.id = oi.order_id WHERE o.idempotency_key = 'pg-rollback-1') AS items,
      (SELECT count(*) FROM prodx_payments p JOIN prodx_orders o ON o.id = p.order_id WHERE o.idempotency_key = 'pg-rollback-1') AS payments,
      (SELECT count(*) FROM prodx_inventory_ledger WHERE reference_id IN (SELECT id FROM prodx_orders WHERE idempotency_key = 'pg-rollback-1')) AS inventory,
      (SELECT count(*) FROM prodx_cash_movements WHERE reason = 'POS sale' AND created_at > CURRENT_TIMESTAMP - INTERVAL '10 minutes') AS cash,
      (SELECT count(*) FROM prodx_audit_log WHERE details->>'idempotencyKey' = 'pg-rollback-1') AS audits,
      (SELECT current_stock FROM prodx_products WHERE id = $1) AS stock`,
    [ids.product],
  );
  assert.deepEqual(rollback.rows[0], { orders: 0, items: 0, payments: 0, inventory: 0, cash: 1, audits: 0, stock: 10 });

  const concurrentKey = 'pg-concurrent-1';
  const results = await Promise.all([
    service.checkout(request(concurrentKey)),
    service.checkout(request(concurrentKey)),
    service.checkout(request(concurrentKey)),
    service.checkout(request(concurrentKey)),
  ]);
  const orderIds = new Set(results.map((result) => result.order.id));
  assert.equal(orderIds.size, 1);
  assert.equal(results.filter((result) => result.idempotencyCached).length, 3);

  const concurrent = await pool.query<{ orders: number; items: number; payments: number; inventory: number; cash: number; audits: number }>(
    `SELECT
      (SELECT count(*) FROM prodx_orders WHERE store_id = $1 AND idempotency_key = $2) AS orders,
      (SELECT count(*) FROM prodx_order_items oi JOIN prodx_orders o ON o.id = oi.order_id WHERE o.idempotency_key = $2) AS items,
      (SELECT count(*) FROM prodx_payments p JOIN prodx_orders o ON o.id = p.order_id WHERE o.idempotency_key = $2) AS payments,
      (SELECT count(*) FROM prodx_inventory_ledger WHERE reference_id IN (SELECT id FROM prodx_orders WHERE idempotency_key = $2)) AS inventory,
      (SELECT count(*) FROM prodx_cash_movements cm JOIN prodx_orders o ON o.shift_id = cm.shift_id WHERE o.idempotency_key = $2 AND cm.reason = 'POS sale') AS cash,
      (SELECT count(*) FROM prodx_audit_log WHERE details->>'idempotencyKey' = $2) AS audits`,
    [ids.store, concurrentKey],
  );
  assert.deepEqual(concurrent.rows[0], { orders: 1, items: 1, payments: 1, inventory: 1, cash: 1, audits: 1 });
});
