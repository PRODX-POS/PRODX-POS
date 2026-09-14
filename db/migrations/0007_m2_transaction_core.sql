-- PRODX POS M2 transaction core
-- PostgreSQL is authoritative for checkout financial/inventory state.
-- Monetary values are NUMERIC(12,2); tenant/store relationships are enforced by composite FKs.

CREATE TABLE IF NOT EXISTS prodx_categories (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_categories_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_categories_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT prodx_categories_slug_not_blank CHECK (length(btrim(slug)) > 0),
  CONSTRAINT prodx_categories_store_slug_unique UNIQUE (store_id, slug),
  CONSTRAINT prodx_categories_id_store_unique UNIQUE (id, store_id)
);

CREATE TABLE IF NOT EXISTS prodx_products (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  category_id UUID NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  price_amount NUMERIC(12,2) NOT NULL,
  cost_price_amount NUMERIC(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'THB',
  tax_rate_bps INTEGER NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 0,
  unit_of_measure TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_products_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_products_category_store_fk FOREIGN KEY (category_id, store_id) REFERENCES prodx_categories(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_products_price_valid CHECK (price_amount >= 0 AND cost_price_amount >= 0),
  CONSTRAINT prodx_products_tax_valid CHECK (tax_rate_bps BETWEEN 0 AND 10000),
  CONSTRAINT prodx_products_stock_valid CHECK (current_stock >= 0 AND reorder_point >= 0),
  CONSTRAINT prodx_products_text_valid CHECK (length(btrim(sku)) > 0 AND length(btrim(barcode)) > 0 AND length(btrim(name)) > 0 AND length(btrim(unit_of_measure)) > 0),
  CONSTRAINT prodx_products_store_sku_unique UNIQUE (store_id, sku),
  CONSTRAINT prodx_products_store_barcode_unique UNIQUE (store_id, barcode),
  CONSTRAINT prodx_products_id_store_unique UNIQUE (id, store_id)
);

CREATE TABLE IF NOT EXISTS prodx_registers (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_registers_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_registers_status_valid CHECK (status IN ('active','disabled')),
  CONSTRAINT prodx_registers_text_valid CHECK (length(btrim(code)) > 0 AND length(btrim(name)) > 0),
  CONSTRAINT prodx_registers_store_code_unique UNIQUE (store_id, code),
  CONSTRAINT prodx_registers_id_store_unique UNIQUE (id, store_id)
);

CREATE TABLE IF NOT EXISTS prodx_shifts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  register_id UUID NOT NULL,
  cashier_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMPTZ,
  opening_float_amount NUMERIC(12,2) NOT NULL,
  actual_counted_cash_amount NUMERIC(12,2),
  currency CHAR(3) NOT NULL DEFAULT 'THB',
  CONSTRAINT prodx_shifts_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_shifts_register_store_fk FOREIGN KEY (register_id, store_id) REFERENCES prodx_registers(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_shifts_cashier_org_fk FOREIGN KEY (cashier_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_shifts_status_valid CHECK (status IN ('open','closed')),
  CONSTRAINT prodx_shifts_money_valid CHECK (opening_float_amount >= 0 AND (actual_counted_cash_amount IS NULL OR actual_counted_cash_amount >= 0)),
  CONSTRAINT prodx_shifts_closed_fields_valid CHECK ((status='open' AND closed_at IS NULL) OR (status='closed' AND closed_at IS NOT NULL)),
  CONSTRAINT prodx_shifts_id_store_unique UNIQUE (id, store_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS prodx_shifts_one_open_register ON prodx_shifts(register_id) WHERE status='open';

CREATE TABLE IF NOT EXISTS prodx_orders (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  register_id UUID NOT NULL,
  cashier_id UUID NOT NULL,
  shift_id UUID NOT NULL,
  order_number TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'server_confirmed',
  gross_subtotal_amount NUMERIC(12,2) NOT NULL,
  item_discounts_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  order_discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_subtotal_amount NUMERIC(12,2) NOT NULL,
  total_tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total_amount NUMERIC(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'THB',
  total_items_count INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  server_committed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_orders_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_orders_register_store_fk FOREIGN KEY (register_id, store_id) REFERENCES prodx_registers(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_orders_cashier_org_fk FOREIGN KEY (cashier_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_orders_shift_store_fk FOREIGN KEY (shift_id, store_id) REFERENCES prodx_shifts(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_orders_status_valid CHECK (status IN ('server_confirmed','voided','refunded')),
  CONSTRAINT prodx_orders_money_valid CHECK (gross_subtotal_amount >= 0 AND item_discounts_amount >= 0 AND order_discount_amount >= 0 AND net_subtotal_amount >= 0 AND total_tax_amount >= 0 AND grand_total_amount >= 0),
  CONSTRAINT prodx_orders_items_valid CHECK (total_items_count > 0),
  CONSTRAINT prodx_orders_key_valid CHECK (length(btrim(idempotency_key)) > 0 AND length(btrim(order_number)) > 0),
  CONSTRAINT prodx_orders_id_store_unique UNIQUE (id, store_id),
  CONSTRAINT prodx_orders_store_idempotency_unique UNIQUE (store_id, idempotency_key),
  CONSTRAINT prodx_orders_store_order_number_unique UNIQUE (store_id, order_number)
);

CREATE TABLE IF NOT EXISTS prodx_order_items (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_amount NUMERIC(12,2) NOT NULL,
  item_discount_bps INTEGER NOT NULL DEFAULT 0,
  line_subtotal_amount NUMERIC(12,2) NOT NULL,
  line_tax_amount NUMERIC(12,2) NOT NULL,
  line_total_amount NUMERIC(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'THB',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_order_items_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_order_items_order_store_fk FOREIGN KEY (order_id, store_id) REFERENCES prodx_orders(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_order_items_product_store_fk FOREIGN KEY (product_id, store_id) REFERENCES prodx_products(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_order_items_valid CHECK (quantity > 0 AND unit_price_amount >= 0 AND line_subtotal_amount >= 0 AND line_tax_amount >= 0 AND line_total_amount >= 0 AND item_discount_bps BETWEEN 0 AND 10000),
  CONSTRAINT prodx_order_items_id_store_unique UNIQUE (id, store_id)
);
CREATE INDEX IF NOT EXISTS prodx_order_items_order_idx ON prodx_order_items(store_id, order_id);

CREATE TABLE IF NOT EXISTS prodx_payments (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  order_id UUID NOT NULL,
  method TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  tendered_cash NUMERIC(12,2),
  change_given NUMERIC(12,2),
  auth_code TEXT,
  card_last_four TEXT,
  terminal_reference TEXT,
  currency CHAR(3) NOT NULL DEFAULT 'THB',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_payments_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_payments_order_store_fk FOREIGN KEY (order_id, store_id) REFERENCES prodx_orders(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_payments_method_valid CHECK (method IN ('cash','card','qr_digital')),
  CONSTRAINT prodx_payments_amount_valid CHECK (amount > 0 AND (tendered_cash IS NULL OR tendered_cash >= 0) AND (change_given IS NULL OR change_given >= 0)),
  CONSTRAINT prodx_payments_cash_fields_valid CHECK ((method='cash') OR (tendered_cash IS NULL AND change_given IS NULL))
);

CREATE TABLE IF NOT EXISTS prodx_inventory_ledger (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity_delta INTEGER NOT NULL,
  resulting_stock INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID NOT NULL,
  performed_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_inventory_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_inventory_product_store_fk FOREIGN KEY (product_id, store_id) REFERENCES prodx_products(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_inventory_user_org_fk FOREIGN KEY (performed_by_user_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_inventory_valid CHECK (quantity_delta <> 0 AND resulting_stock >= 0),
  CONSTRAINT prodx_inventory_reason_valid CHECK (reason IN ('sale_deduction','refund_restock','purchase_received','transfer_in','transfer_out','audit_count_adjustment','damaged_write_off'))
);

CREATE TABLE IF NOT EXISTS prodx_cash_movements (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  shift_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT NOT NULL,
  performed_by_user_id UUID NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'THB',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_cash_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_cash_shift_store_fk FOREIGN KEY (shift_id, store_id) REFERENCES prodx_shifts(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_cash_user_org_fk FOREIGN KEY (performed_by_user_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_cash_valid CHECK (amount > 0 AND length(btrim(reason)) > 0),
  CONSTRAINT prodx_cash_type_valid CHECK (type IN ('opening_float','cash_sale','cash_refund','paid_in','paid_out','drawer_drop'))
);

CREATE TABLE IF NOT EXISTS prodx_audit_log (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  register_id UUID,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  severity TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_audit_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_audit_register_store_fk FOREIGN KEY (register_id, store_id) REFERENCES prodx_registers(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_audit_user_org_fk FOREIGN KEY (user_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_audit_valid CHECK (length(btrim(action)) > 0 AND severity IN ('info','warn','critical'))
);
CREATE INDEX IF NOT EXISTS prodx_orders_store_created_idx ON prodx_orders(organization_id, store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS prodx_audit_store_created_idx ON prodx_audit_log(organization_id, store_id, created_at DESC);

INSERT INTO prodx_schema_migrations(version) VALUES ('0007_m2_transaction_core') ON CONFLICT(version) DO NOTHING;
