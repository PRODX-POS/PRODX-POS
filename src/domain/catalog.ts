/**
 * PRODX POS Domain - Catalog & Inventory Ledger Module
 * 
 * Invariant: Inventory is strictly ledger-oriented and auditable.
 */

import { Money } from './money';

export type StockMovementReason =
  | 'sale_deduction'
  | 'refund_restock'
  | 'purchase_received'
  | 'transfer_in'
  | 'transfer_out'
  | 'audit_count_adjustment'
  | 'damaged_write_off';

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly icon?: string;
  readonly color?: string;
}

export interface Product {
  readonly id: string;
  readonly storeId: string;
  readonly sku: string;
  readonly barcode: string;
  readonly name: string;
  readonly description?: string;
  readonly categoryId: string;
  readonly price: Money;
  readonly costPrice: Money;
  readonly taxRateBps: number; // e.g. 825 = 8.25%
  readonly currentStock: number; // Snapshot of ledger sum
  readonly reorderPoint: number;
  readonly unitOfMeasure: string;
  readonly isAgeRestricted?: boolean;
  readonly imageUrl?: string;
}

export interface InventoryLedgerEntry {
  readonly id: string;
  readonly storeId: string;
  readonly productId: string;
  readonly quantityDelta: number; // Negative for sales/writeoffs, positive for restock/receive
  readonly resultingStock: number;
  readonly reason: StockMovementReason;
  readonly referenceId: string; // Order ID, PO number, or audit count ID
  readonly performedByUserId: string;
  readonly notes?: string;
  readonly timestamp: string; // ISO 8601 UTC
}

export type BulkImportMode = 'upsert' | 'update_only' | 'stock_override' | 'stock_replenish';

export interface BulkImportItem {
  readonly sku: string;
  readonly barcode?: string;
  readonly name?: string;
  readonly description?: string;
  readonly categoryId?: string;
  readonly categoryName?: string;
  readonly priceAmountInCents?: number;
  readonly costPriceAmountInCents?: number;
  readonly currentStock?: number;
  readonly quantityDelta?: number;
  readonly reorderPoint?: number;
  readonly unitOfMeasure?: string;
  readonly taxRateBps?: number;
  readonly isAgeRestricted?: boolean;
  readonly imageUrl?: string;
}

export interface BulkImportResult {
  readonly batchReference: string;
  readonly totalProcessed: number;
  readonly createdCount: number;
  readonly updatedCount: number;
  readonly skippedCount: number;
  readonly createdProducts: readonly Product[];
  readonly updatedProducts: readonly Product[];
  readonly ledgerEntries: readonly InventoryLedgerEntry[];
  readonly errors: ReadonlyArray<{ sku: string; rowNumber?: number; reason: string }>;
}

export type PriceAdjustmentDirection = 'increase' | 'decrease';

export interface BatchPriceAdjustmentParams {
  readonly storeId: string;
  readonly productIds: readonly string[];
  readonly direction: PriceAdjustmentDirection;
  readonly percentage: number; // e.g. 5.5 for 5.5%
  readonly roundingStrategy?: 'exact_cents' | 'round_whole' | 'charm_99' | 'charm_95';
  readonly reasonNotes?: string;
  readonly userId: string;
  readonly supervisorName?: string;
}

export interface BatchPriceAdjustmentItemResult {
  readonly productId: string;
  readonly sku: string;
  readonly name: string;
  readonly oldPriceCents: number;
  readonly newPriceCents: number;
  readonly deltaCents: number;
  readonly percentageEffective: number;
}

export interface BatchPriceAdjustmentResult {
  readonly batchReference: string;
  readonly updatedCount: number;
  readonly previousTotalRetailValueCents: number;
  readonly newTotalRetailValueCents: number;
  readonly deltaRetailValueCents: number;
  readonly items: readonly BatchPriceAdjustmentItemResult[];
  readonly updatedProducts: readonly Product[];
  readonly timestamp: string;
}
