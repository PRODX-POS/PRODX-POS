import { Product, Category } from '../domain/catalog';

/**
 * Escapes a cell for CSV output, wrapping in quotes if containing commas, quotes, or newlines.
 */
export const escapeCsvCell = (val: string | number | boolean | undefined | null): string => {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Generates an editable CSV string from current products and categories.
 * Includes UTF-8 BOM so Microsoft Excel correctly displays Thai and UTF-8 characters without corruption.
 */
export const generateInventoryCsv = (
  products: readonly Product[],
  categories: readonly Category[]
): string => {
  const headers = [
    'sku',
    'barcode',
    'name',
    'category',
    'price',
    'cost_price',
    'stock',
    'reorder_point',
    'unit',
    'tax_rate',
    'description',
  ];

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const rows = products.map((p) => {
    const catName = catMap.get(p.categoryId) || p.categoryId;
    const priceStr = (p.price.amountInCents / 100).toFixed(2);
    const costStr = p.costPrice ? (p.costPrice.amountInCents / 100).toFixed(2) : '0.00';
    const taxStr = (p.taxRateBps / 100).toFixed(0);

    return [
      escapeCsvCell(p.sku),
      escapeCsvCell(p.barcode),
      escapeCsvCell(p.name),
      escapeCsvCell(catName),
      priceStr,
      costStr,
      p.currentStock,
      p.reorderPoint,
      escapeCsvCell(p.unitOfMeasure),
      taxStr,
      escapeCsvCell(p.description || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
};

/**
 * Generates a clean sample template for inventory import.
 */
export const getBlankCsvTemplate = (): string => {
  return (
    'sku,barcode,name,category,price,cost_price,stock,reorder_point,unit,tax_rate,description\r\n' +
    'BEV-MAT-01,890123450090,Organic Uji Matcha Latte,cat-coffee,95.00,32.00,50,15,cup,7,Ceremonial grade matcha with steamed oat milk\r\n' +
    'BAK-CRO-02,890123450091,Salted Egg Yolk Croissant,cat-bakery,85.00,28.00,24,10,piece,7,Hand-rolled butter croissant with creamy custard\r\n' +
    'RET-MUG-03,890123450092,PRODX Thermal Travel Flask,cat-retail,650.00,220.00,30,5,unit,7,Double-wall stainless steel insulated flask\r\n' +
    'BEV-ESP-01,890123450001,Signature Espresso Shot,cat-coffee,65.00,15.00,100,25,cup,7,Single origin washed Ethiopian coffee'
  );
};

/**
 * Generates an itemized Restock Needed Report CSV string.
 */
export interface RestockReportItemData {
  sku: string;
  barcode: string;
  name: string;
  category: string;
  currentStock: number;
  threshold: number;
  reorderPoint: number;
  deficit: number;
  suggestedOrderQty: number;
  unit: string;
  costPriceCents: number;
  totalCostCents: number;
  urgency: 'critical' | 'low_stock' | 'velocity_risk';
}

export const generateRestockNeededCsv = (
  items: readonly RestockReportItemData[],
  storeName: string,
  threshold: number
): string => {
  const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const totalSuggestedUnits = items.reduce((acc, it) => acc + it.suggestedOrderQty, 0);
  const totalEstimatedCost = (items.reduce((acc, it) => acc + it.totalCostCents, 0) / 100).toFixed(2);

  const metaHeader = [
    `# PRODX RESTOCK NEEDED PROCUREMENT REPORT`,
    `# Store: ${escapeCsvCell(storeName)}`,
    `# Generated At: ${dateStr}`,
    `# Active Low Stock Threshold: <= ${threshold} units`,
    `# Flagged SKUs Count: ${items.length}`,
    `# Total Suggested Replenishment Units: ${totalSuggestedUnits}`,
    `# Total Estimated Procurement Cost (THB): ${totalEstimatedCost}`,
    ``,
  ].join('\r\n');

  const headers = [
    'sku',
    'barcode',
    'product_name',
    'category',
    'current_stock',
    'alert_threshold',
    'reorder_point',
    'stock_deficit',
    'suggested_order_qty',
    'unit_measure',
    'unit_cost_thb',
    'estimated_line_cost_thb',
    'urgency_status',
  ];

  const rows = items.map((it) => {
    const unitCost = (it.costPriceCents / 100).toFixed(2);
    const lineCost = (it.totalCostCents / 100).toFixed(2);
    return [
      escapeCsvCell(it.sku),
      escapeCsvCell(it.barcode),
      escapeCsvCell(it.name),
      escapeCsvCell(it.category),
      it.currentStock,
      it.threshold,
      it.reorderPoint,
      it.deficit,
      it.suggestedOrderQty,
      escapeCsvCell(it.unit),
      unitCost,
      lineCost,
      it.urgency,
    ].join(',');
  });

  return metaHeader + [headers.join(','), ...rows].join('\r\n');
};

/**
 * Generates an official Purchase Order CSV string.
 */
export const generatePurchaseOrderCsv = (
  poNumber: string,
  storeName: string,
  supplierName: string,
  createdAt: string,
  expectedDelivery: string,
  paymentTerms: string,
  items: ReadonlyArray<{
    sku: string;
    barcode: string;
    productName: string;
    categoryName: string;
    unitOfMeasure: string;
    currentStock: number;
    quantity: number;
    unitCostFormatted: string;
    lineTotalFormatted: string;
    urgency: string;
  }>,
  subtotalFormatted: string,
  taxFormatted: string,
  grandTotalFormatted: string
): string => {
  const metaHeader = [
    `# PRODX OFFICIAL PURCHASE ORDER`,
    `# PO Number: ${escapeCsvCell(poNumber)}`,
    `# Store: ${escapeCsvCell(storeName)}`,
    `# Supplier: ${escapeCsvCell(supplierName)}`,
    `# Date Issued: ${createdAt}`,
    `# Expected Delivery: ${expectedDelivery}`,
    `# Payment Terms: ${escapeCsvCell(paymentTerms)}`,
    `# Items Count: ${items.length}`,
    `# Subtotal: ${subtotalFormatted}`,
    `# Tax (VAT): ${taxFormatted}`,
    `# Grand Total: ${grandTotalFormatted}`,
    ``,
  ].join('\r\n');

  const headers = [
    'sku',
    'barcode',
    'product_name',
    'category',
    'unit_measure',
    'stock_on_hand',
    'order_quantity',
    'unit_cost_thb',
    'line_total_thb',
    'urgency_status',
  ];

  const rows = items.map((it) => {
    return [
      escapeCsvCell(it.sku),
      escapeCsvCell(it.barcode),
      escapeCsvCell(it.productName),
      escapeCsvCell(it.categoryName),
      escapeCsvCell(it.unitOfMeasure),
      it.currentStock,
      it.quantity,
      it.unitCostFormatted,
      it.lineTotalFormatted,
      it.urgency,
    ].join(',');
  });

  return metaHeader + [headers.join(','), ...rows].join('\r\n');
};

/**
 * Downloads a string as a CSV file in the browser with UTF-8 BOM.
 */
export const downloadCsvFile = (filename: string, csvContent: string): void => {
  // Prepend UTF-8 BOM (\uFEFF) to ensure Excel displays UTF-8 and Thai characters properly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
