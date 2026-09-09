/**
 * PRODX POS Domain - Purchase Order & Procurement Module
 */

import { Money, createMoney } from './money';

export type PurchaseOrderStatus = 'draft' | 'issued' | 'approved' | 'received' | 'cancelled';

export type PurchaseOrderUrgency = 'critical' | 'low_stock' | 'velocity_risk';

export interface SupplierInfo {
  readonly id: string;
  readonly name: string;
  readonly contactPerson?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly address?: string;
  readonly taxId?: string;
  readonly paymentTerms?: string; // e.g. 'Net 30', 'Cash on Delivery (COD)', 'Bank Transfer'
  readonly leadTimeDays?: number;
}

export interface PurchaseOrderLineItem {
  readonly id: string;
  readonly productId: string;
  readonly sku: string;
  readonly barcode: string;
  readonly productName: string;
  readonly categoryName: string;
  readonly unitOfMeasure: string;
  readonly currentStock: number;
  readonly reorderPoint: number;
  readonly quantity: number;
  readonly unitCost: Money;
  readonly lineTotal: Money;
  readonly urgency: PurchaseOrderUrgency;
  readonly notes?: string;
}

export interface PurchaseOrder {
  readonly id: string;
  readonly poNumber: string;
  readonly storeId: string;
  readonly storeName: string;
  readonly storeAddress?: string;
  readonly storePhone?: string;
  readonly createdByUserId: string;
  readonly createdByUserName: string;
  readonly supplier: SupplierInfo;
  readonly status: PurchaseOrderStatus;
  readonly items: readonly PurchaseOrderLineItem[];
  readonly subtotal: Money;
  readonly taxRateBps: number;
  readonly taxAmount: Money;
  readonly shippingCost: Money;
  readonly discountAmount: Money;
  readonly grandTotal: Money;
  readonly createdAt: string; // ISO 8601
  readonly expectedDeliveryDate: string; // ISO 8601 or YYYY-MM-DD
  readonly notes?: string;
  readonly source: 'manual' | 'restock_report_bulk' | 'ai_reorder';
}

export const DEFAULT_SUPPLIERS: readonly SupplierInfo[] = [
  {
    id: 'sup-cp-wholesale',
    name: 'CP All & Lotus Wholesale Supply',
    contactPerson: 'Somchai Prasert (Sales Mgr)',
    email: 'b2b-procurement@cpall-distribution.co.th',
    phone: '+66 2 826 7000',
    address: '313 CP Tower, Silom Road, Bang Rak, Bangkok 10500',
    taxId: '0107537000217',
    paymentTerms: 'Credit 30 Days (Net 30)',
    leadTimeDays: 2,
  },
  {
    id: 'sup-siam-makro',
    name: 'Siam Makro Commercial Distribution',
    contactPerson: 'Nattaporn Srichan',
    email: 'direct.orders@siammakro.co.th',
    phone: '+66 2 067 8999',
    address: '1468 Phatthanakan Rd, Suan Luang, Bangkok 10250',
    taxId: '0107531000109',
    paymentTerms: 'Cash on Delivery (COD)',
    leadTimeDays: 1,
  },
  {
    id: 'sup-thaibev-logistics',
    name: 'ThaiBev Beverages & Snacks Logistics',
    contactPerson: 'Kittisak Wongsuwan',
    email: 'orders@thaibev-supply.com',
    phone: '+66 2 785 5555',
    address: '14 Sangsom Building, Vibhavadi Rangsit Rd, Bangkok 10900',
    taxId: '0107546000342',
    paymentTerms: 'Bank Transfer (Prepaid)',
    leadTimeDays: 3,
  },
  {
    id: 'sup-unilever-thai',
    name: 'Unilever Thai Trading Logistics',
    contactPerson: 'Apinya Charoenrat',
    email: 'supplychain.th@unilever.com',
    phone: '+66 2 554 2000',
    address: '161 Rama 9 Road, Huai Khwang, Bangkok 10310',
    taxId: '0105501002341',
    paymentTerms: 'Credit 45 Days (Net 45)',
    leadTimeDays: 4,
  },
  {
    id: 'sup-general-central',
    name: 'General Central Wholesale Hub',
    contactPerson: 'Procurement Desk',
    email: 'order@centralwholesale.co.th',
    phone: '+66 2 100 8000',
    address: '999/9 Rama 1 Rd, Pathum Wan, Bangkok 10330',
    taxId: '0107536000451',
    paymentTerms: 'Credit 15 Days (Net 15)',
    leadTimeDays: 2,
  },
];
