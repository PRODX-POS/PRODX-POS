-- PRODX POS M2 transaction core persistence
-- Gate C: server-authoritative sales, inventory, payments, cash, audit, and idempotency primitives.
-- Monetary values are stored as integer minor units (cents/satang) with explicit currency.

CREATE TABLE IF NOT EXISTS prodx_categories (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_categories_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT prodx_categories_slug_not_blank CHECK (length(btrim(slug)) > 0),
  CONSTRAINT prodx_categories_store_org_fk FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
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
  description TEXT,
  price_minor BIGINT NOT NULL,
  cost_price_minor BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'THB',
  tax_rate_bps INTEGER NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 0,
  unit_of_measure TEXT NOT NULL,
  is_age_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_products_store_org_fk FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_products_category_store_fk FOREIGN KEY (category_id, store_id)
    REFERENCES prodx_categories(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_products_sku_not_blank CHECK (length(btrim(sku)) > 0),
  CONSTRAINT prodx_products_barcode_not_blank CHECK (length(btrim(barcode)) > 0),
  CONSTRAINT prodx_products_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT prodx_products_unit_not_blank CHECK (length(btrim(unit_of_measure)) > 0),
  CONSTRAINT prodx_products_price_nonnegative CHECK (price_minor >= 0),
  CONSTRAINT prodx_products_cost_nonnegative CHECK (cost_price_minor >= 0),
  CONSTRAINT prodx_products_tax_bps_valid CHECK (tax_rate_bps BETWEEN 0 AND 10000),
  CONSTRAINT prodx_products_stock_nonnegative CHECK (current_stock >= 0),
  CONSTRAINT prodx_products_reorder_nonnegative CHECK (reorder_point >= 0),
  CONSTRAINT prodx_products_store_sku_unique UNIQUE (store_id, sku),
  CONSTRAINT prodx_products_store_barcode_unique UNIQUE (store_id, barcode),
  CONSTRAINT prodx_products_id_store_unique UNIQUE (id, store_id)
);

CREATE INDEX IF NOT EXISTS prodx_products_store_active_idx ON prodx_products (organization_id, store_id, active);

CREATE TABLE IF NOT EXISTS prodx_registers (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_registers_store_org_fk FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_registers_code_not_blank CHECK (length(btrim(code)) > 0),
  CONSTRAINT prodx_registers_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT prodx_registers_status_valid CHECK (status IN ('active', 'disabled')),
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
  opening_float_minor BIGINT NOT NULL,
  actual_counted_cash_minor BIGINT,
  closing_notes TEXT,
  currency CHAR(3) NOT NULL DEFAULT 'THB',
  CONSTRAINT prodx_shifts_store_org_fk FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_shifts_register_store_fk FOREIGN KEY (register_id, store_id)
    REFERENCES prodx_registers(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_shifts_cashier_org_fk FOREIGN KEY (cashier_id, organization_id)
    REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_shifts_status_valid CHECK (status IN ('open', 'closed')),
  CONSTRAINT prodx_shifts_opening_float_nonnegative CHECK (opening_float_minor >= 0),
  CONSTRAINT prodx_shifts_actual_cash_nonnegative CHECK (actual_counted_cash_minor IS NULL OR actual_counted_cash_minor >= 0),
  CONSTRAINT prodx_shifts_closed_fields_valid CHECK ((status = 'open' AND closed_at IS NULL) OR (status = 'closed' AND closed_at IS NOT NULL)),
  CONSTRAINT prodx_shifts_id_store_unique UNIQUE (id, store_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS prodx_shifts_one_open_register
  ON prodx_shifts (register_id) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS prodx_orders (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  register_id UUID NOT NULL,
  cashier_id UUID NOT NULL,
  shift_id UUID,
  order_number TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'server_confirmed',
  gross_subtotal_minor BIGINT NOT NULL,
  item_discounts_minor BIGINT NOT NULL DEFAULT 0,
  order_discount_minor BIGINT NOT NULL DEFAULT 0,
  net_subtotal_minor BIGINT NOT NULL,
  total_tax_minor BIGINT NOT NULL DEFAULT 0,
  grand_total_minor BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'THB',
  total_items_count INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  server_committed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_orders_store_org_fk FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_orders_register_store_fk FOREIGN KEY (register_id, store_id)
    REFERENCES prodx_registers(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_orders_cashier_org_fk FOREIGN KEY (cashier_id, organization_id)
    REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_orders_shift_store_fk FOREIGN KEY (shift_id, store_id)
    REFERENCES prodx_shifts(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_orders_status_valid CHECK (status IN ('server_confirmed', 'voided', 'refunded')),
  CONSTRAINT prodx_orders_idempotency_not_blank CHECK (length(btrim(idempotency_key)) > 0),
  CONSTRAINT prodx_orders_order_number_not_blank CHECK (length(btrim(order_number)) > 0),
  CONSTRAINT prodx_orders_money_nonnegative CHECK (
    gross_subtotal_minor >= 0 AND item_discounts_minor >= 0 AND order_discount_minor >= 0 AND
    net_subtotal_minor >= 0 AND total_tax_minor >= 0 AND grand_total_minor >= 0
  ),
  CONSTRAINT prodx_orders_total_items_positive CHECK (total_items_count > 0),
  CONSTRAINT prodx_orders_id_store_unique UNIQUE (id, store_id),
  CONSTRAINT prodx_orders_store_idempotency_unique UNIQUE (store_id, idempotency_key),
  CONSTRAINT prodx_orders_store_order_number_unique UNIQUE (store_id, order_number)
);

CREATE INDEX IF NOT EXISTS prodx_orders_store_created_idx ON prodx_orders (organization_id, store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS prodx_order_items (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_minor BIGINT NOT NULL,
  item_discount_bps INTEGER NOT NULL DEFAULT 0,
  line_subtotal_minor BIGINT NOT NULL,
  line_tax_minor BIGINT NOT NULL,
  line_total_minor BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'THB',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_order_items_store_org_fk FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_order_items_order_store_fk FOREIGN KEY (order_id, store_id)
    REFERENCES prodx_orders(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_order_items_product_store_fk FOREIGN KEY (product_id, store_id)
    REFERENCES prodx_products(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT prodx_order_items_price_nonnegative CHECK (unit_price_minor >= 0),
  CONSTRAINT prodx_order_items_discount_bps_valid CHECK (item_discount_bps BETWEEN 0 AND 10000),
  CONSTRAINT prodx_order_items_money_nonnegative CHECK (line_subtotal_minor >= 0 AND line_tax_minor >= 0 AND line_total_minor >= 0),
  CONSTRAINT prodx_order_items_id_store_unique UNIQUE (id, store_id)
);

CREATE INDEX IF NOT EXISTS prodx_order_items_order_idx ON prodx_order_items (store_id, order_id);

CREATE TABLE IF NOT EXISTS prodx_payments (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  order_id UUID NOT NULL,
  method TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  tendered_cash_minor BIGINT,
  change_given_minor BIGINT,
  auth_code TEXT,
  card_last_four TEXT,
  terminal_reference TEXT,
  currency CHAR(3) NOT NULL DEFAULT 'THB',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_payments_store_org_fk FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_payments_order_store_fk FOREIGN KEY (order_id, store_id)
    REFERENCES prodx_orders(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_payments_method_valid CHECK (method IN ('cash', 'card', 'qr_digital')),
  CONSTRAINT prodx_payments_amount_positive CHECK (amount_minor > 0),
  CONSTRAINT prodx_payments_cash_fields_valid CHECK (
    (method = 'cash') OR (tendered_cash_minor IS NULL AND change_given_minor IS NULL)
  ),
  CONSTRAINT prodx_payments_cash_nonnegative CHECK (
    (tendered_cash_minor IS NULL OR tendered_cash_minor >= 0) AND
    (change_given_minor IS NULL OR change_given_minor >= 0)
  )
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
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_inventory_store_org_fk FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_inventory_product_store_fk FOREIGN KEY (product_id, store_id)
    REFERENCES prodx_products(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_inventory_user_org_fk FOREIGN KEY (performed_by_user_id, organization_id)
    REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_inventory_reason_valid CHECK (reason IN ('sale_deduction', 'refund_restock', 'purchase_received', 'transfer_in', 'transfer_out', 'audit_count_adjustment', 'damaged_write_off')),
  CONSTRAINT prodx_inventory_resulting_stock_nonnegative CHECK (resulting_stock >= 0),
  CONSTRAINT prodx_inventory_delta_nonzero CHECK (quantity_delta <> 0)
);

CREATE INDEX IF NOT EXISTS prodx_inventory_product_created_idx
  ON prodx_inventory_ledger (organization_id, store_id, product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS prodx_cash_movements (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  shift_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  reason TEXT NOT NULL,
  performed_by_user_id UUID NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'THB',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_cash_movements_store_org_fk FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_cash_movements_shift_store_fk FOREIGN KEY (shift_id, store_id)
    REFERENCES prodx_shifts(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_cash_movements_user_org_fk FOREIGN KEY (performed_by_user_id, organization_id)
    REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_cash_movements_type_valid CHECK (type IN ('opening_float', 'cash_sale', 'cash_refund', 'paid_in', 'paid_out', 'drawer_drop')),
  CONSTRAINT prodx_cash_movements_amount_positive CHECK (amount_minor > 0),
  CONSTRAINT prodx_cash_movements_reason_not_blank CHECK (length(btrim(reason)) > 0)
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
  CONSTRAINT prodx_audit_store_org_fk FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_audit_register_store_fk FOREIGN KEY (register_id, store_id)
    REFERENCES prodx_registers(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_audit_user_org_fk FOREIGN KEY (user_id, organization_id)
    REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_audit_severity_valid CHECK (severity IN ('info', 'warn', 'critical')),
  CONSTRAINT prodx_audit_action_not_blank CHECK (length(btrim(action)) > 0)
);

CREATE INDEX IF NOT EXISTS prodx_audit_store_created_idx ON prodx_audit_log (organization_id, store_id, created_at DESC);

INSERT INTO prodx_schema_migrations (version)
VALUES ('0006_m2_transaction_core')
ON CONFLICT (version) DO NOTHING;
