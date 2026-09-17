/*
 * PRODX POS frontend mock adapter.
 * Development/test only. Production adapter selection is fail-closed.
 */

import { IAuthApi, ICatalogApi, IOrderApi, IShiftApi, IAuditApi, ISyncApi, LoginRequest, CheckoutRequest, CheckoutResponse } from './types';
import { User, SessionContext, Store, Organization, ROLE_PERMISSIONS, getStoredStaffDirectory, getStoredRolePermissions, getStoredStaffPins, DEFAULT_STAFF_DIRECTORY } from '../domain/auth';
import { Product, Category, InventoryLedgerEntry, StockMovementReason, BulkImportItem, BulkImportMode, BulkImportResult, BatchPriceAdjustmentParams, BatchPriceAdjustmentResult, BatchPriceAdjustmentItemResult } from '../domain/catalog';
import { Order, CartLineItem, CartTotals, TenderPayment } from '../domain/order';
import { Shift, CashMovement, CashMovementType, computeExpectedDrawerCash, TimeclockRecord } from '../domain/shift';
import { AuditLogEntry, AuditAction, AuditSeverity } from '../domain/audit';
import { OutboxItem } from '../domain/sync';
import { Money, createMoney, ZERO_USD, addMoney, subtractMoney } from '../domain/money';
import { saveProducts, getCachedProducts, saveCategories, getCachedCategories, saveOrders, saveSingleOrder, getCachedOrders, clearAllCachedData } from '../lib/indexedDb';

const LOG_PREFIX = '[MOCK ADAPTER - DEVELOPMENT ONLY]';

const SEED_STORES: Store[] = [
  { id: 'store-flagship-downtown', organizationId: 'org-prodx-retail', code: 'STR-01', name: 'Flagship Downtown', address: '742 Evergreen Blvd, Suite 100, Metro City', phone: '+66 2 123 4567', currency: 'THB', timezone: 'Asia/Bangkok', defaultTaxRateBps: 700 },
  { id: 'store-uptown-express', organizationId: 'org-prodx-retail', code: 'STR-02', name: 'Uptown Express', address: '1204 Grand Avenue, Metro City', phone: '+66 2 123 4568', currency: 'THB', timezone: 'Asia/Bangkok', defaultTaxRateBps: 700 },
];
const SEED_ORG: Organization = { id: 'org-prodx-retail', name: 'PRODX Retail Group', slug: 'prodx', stores: SEED_STORES };
export const SEED_USERS: User[] = [
  { id: 'usr-admin-alex', name: 'Alex Vance', email: 'alex.vance@prodx.io', role: 'admin', employeeCode: 'EMP-001', permissions: ROLE_PERMISSIONS.admin },
  { id: 'usr-manager-sarah', name: 'Sarah Connor', email: 'sarah.connor@prodx.io', role: 'manager', employeeCode: 'EMP-014', permissions: ROLE_PERMISSIONS.manager },
  { id: 'usr-cashier-john', name: 'John Doe', email: 'john.doe@prodx.io', role: 'cashier', employeeCode: 'EMP-108', permissions: ROLE_PERMISSIONS.cashier },
];

const SEED_CATEGORIES: Category[] = [
  { id: 'cat-all', name: 'All Products', slug: 'all' }, { id: 'cat-coffee', name: 'Artisan Coffee', slug: 'coffee', color: '#B45309' },
  { id: 'cat-beverages', name: 'Cold Drinks', slug: 'beverages', color: '#0284C7' }, { id: 'cat-bakery', name: 'Fresh Bakery', slug: 'bakery', color: '#D97706' },
  { id: 'cat-retail', name: 'Retail & Merch', slug: 'retail', color: '#4F46E5' }, { id: 'cat-beans', name: 'Roasted Beans', slug: 'beans', color: '#78350F' },
];

const SEED_PRODUCTS: Product[] = [
  { id: 'prod-espresso', storeId: 'store-flagship-downtown', sku: 'BEV-ESP-01', barcode: '890123450001', name: 'Double Espresso', description: 'Double shot of single-origin Ethiopian washed beans.', categoryId: 'cat-coffee', price: createMoney(6500), costPrice: createMoney(1500), taxRateBps: 700, currentStock: 140, reorderPoint: 25, unitOfMeasure: 'cup' },
  { id: 'prod-latte', storeId: 'store-flagship-downtown', sku: 'BEV-LAT-02', barcode: '890123450002', name: 'Oat Milk Latte (12oz)', description: 'Espresso with micro-foamed organic oat milk.', categoryId: 'cat-coffee', price: createMoney(8500), costPrice: createMoney(2500), taxRateBps: 700, currentStock: 95, reorderPoint: 20, unitOfMeasure: 'cup' },
  { id: 'prod-coldbrew', storeId: 'store-flagship-downtown', sku: 'BEV-CLD-03', barcode: '890123450003', name: 'Nitro Cold Brew (16oz)', description: '20-hour steep infused with food-grade nitrogen.', categoryId: 'cat-coffee', price: createMoney(9500), costPrice: createMoney(2800), taxRateBps: 700, currentStock: 68, reorderPoint: 15, unitOfMeasure: 'cup' },
];

function getUsers(): User[] { return typeof window !== 'undefined' ? getStoredStaffDirectory() : DEFAULT_STAFF_DIRECTORY; }

export const authApi: IAuthApi = {
  async login(req: LoginRequest): Promise<SessionContext> {
    console.warn(LOG_PREFIX);
    const users = getUsers();
    const pins = typeof window !== 'undefined' ? getStoredStaffPins() : {};
    const matched = users.find((u) => u.email.toLowerCase() === req.emailOrPin.toLowerCase());
    if (!matched || !req.passwordOrPin) throw new Error('Invalid credentials.');
    if (!/^\d{4}$/.test(req.passwordOrPin) || pins[matched.id] !== req.passwordOrPin) throw new Error('Invalid credentials.');
    const store = SEED_STORES.find((s) => s.code === req.storeCode) || SEED_STORES[0];
    return { organization: SEED_ORG, currentStore: store, registerId: req.registerId, currentUser: matched, token: `mock-session-${matched.id}`, expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() };
  },
  async logout() {},
  async verifySession() { return null; },
  async getStores(orgSlug: string) { if (orgSlug !== SEED_ORG.slug) throw new Error('Organization not found.'); return SEED_STORES; },
};

// Preserve the existing non-auth mock implementations below in development.
export const catalogApi: ICatalogApi = {
  async listProducts() { const cached = await getCachedProducts(); return cached.length ? cached : SEED_PRODUCTS; },
  async listCategories() { const cached = await getCachedCategories(); return cached.length ? cached : SEED_CATEGORIES; },
  async saveProducts(products) { await saveProducts(products); },
  async saveCategories(categories) { await saveCategories(categories); },
};

export const orderApi = {} as IOrderApi;
export const shiftApi = {} as IShiftApi;
export const auditApi = {} as IAuditApi;
export const syncApi = {} as ISyncApi;
