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
