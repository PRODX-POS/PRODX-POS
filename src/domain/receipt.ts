/**
 * PRODX POS Domain - Thermal Receipt & Template Branding Models
 * 
 * Formal data models for thermal receipt formatting, ESC/POS hardware commands,
 * and customizable multi-store receipt templates.
 */

export type ReceiptPaperWidth = '58mm' | '80mm';
export type ReceiptAlignment = 'left' | 'center' | 'right';
export type BarcodeFormat = 'code128' | 'code39' | 'qr';
export type PrinterConnectionType = 'browser' | 'webusb' | 'webserial' | 'bluetooth' | 'network';

export interface StoreBrandingConfig {
  readonly storeName: string;
  readonly branchName: string;
  readonly tagline: string;
  readonly taxId: string; // VAT / Tax Registration Number
  readonly addressLine1: string;
  readonly addressLine2: string;
  readonly phone: string;
  readonly email: string;
  readonly website: string;
  readonly logoAscii?: string;
  readonly logoUrl?: string;
}

export interface ReceiptLayoutConfig {
  readonly showHeaderLogo: boolean;
  readonly showStoreHeader: boolean;
  readonly showBranchName: boolean;
  readonly showTagline: boolean;
  readonly showTaxId: boolean;
  readonly showAddress: boolean;
  readonly showContactInfo: boolean;
  readonly showCashierName: boolean;
  readonly showRegisterId: boolean;
  readonly showOrderTimestamp: boolean;
  readonly showCustomerInfo: boolean;
  readonly showLoyaltyPoints: boolean;
  readonly showItemSku: boolean;
  readonly showItemUnitPrice: boolean;
  readonly showItemDiscounts: boolean;
  readonly showTaxBreakdown: boolean;
  readonly showPaymentBreakdown: boolean;
  readonly showChangeGiven: boolean;
  readonly showBarcode: boolean;
  readonly showQrCode: boolean;
  readonly barcodeType: BarcodeFormat;
  readonly qrCodeUrlPrefix: string; // e.g. "https://prodx.pos/receipt/"
  readonly showFooterNote: boolean;
  readonly footerMessage: string;
  readonly showReturnPolicy: boolean;
  readonly returnPolicyText: string;
  readonly showWifiInfo: boolean;
  readonly wifiSsid?: string;
  readonly wifiPassword?: string;
  readonly dividerStyle: '-' | '=' | '*' | '~' | '.';
}

export interface ReceiptHardwareConfig {
  readonly autoCutPaper: boolean;
  readonly openCashDrawer: boolean;
  readonly drawerKickPin: 2 | 5; // Pin 2 or Pin 5
  readonly drawerPulseOnMs: number; // e.g. 50ms
  readonly feedLinesBeforeCut: number; // e.g. 3 lines
  readonly doubleWidthHeader: boolean;
  readonly boldItemNames: boolean;
  readonly emphasizeTotals: boolean;
  readonly soundBuzzer: boolean;
}

export interface ReceiptTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly isDefault: boolean;
  readonly isSystem: boolean;
  readonly paperWidth: ReceiptPaperWidth;
  readonly characterColumns: number; // 32 for 58mm, 42 or 48 for 80mm
  readonly branding: StoreBrandingConfig;
  readonly layout: ReceiptLayoutConfig;
  readonly hardware: ReceiptHardwareConfig;
  readonly updatedAt: string;
}

export interface PrinterHardwareConfig {
  readonly printerName: string;
  readonly connectionType: PrinterConnectionType;
  readonly paperWidth: ReceiptPaperWidth;
  readonly targetIp?: string;
  readonly targetPort?: number;
  readonly autoPrintOnCheckout: boolean;
  readonly autoKickDrawerOnCash: boolean;
  readonly copies: number;
  readonly quickPrint: boolean; // Bypasses the receipt preview modal for faster transactions, enabling direct-to-printer output
}

export interface PrintJob {
  readonly id: string;
  readonly orderId: string;
  readonly orderNumber: string;
  readonly templateId: string;
  readonly templateName: string;
  readonly connectionType: PrinterConnectionType;
  readonly status: 'queued' | 'printing' | 'success' | 'failed';
  readonly error?: string;
  readonly timestamp: string;
}

/**
 * Standard 80mm Full Retail Receipt Template (48 characters width)
 */
export const DEFAULT_RETAIL_80MM_TEMPLATE: ReceiptTemplate = {
  id: 'tmpl-retail-80mm-standard',
  name: 'Standard Retail 80mm',
  description: 'Full-width 80mm thermal receipt with detailed branding, tax breakdown, and barcode.',
  isDefault: true,
  isSystem: true,
  paperWidth: '80mm',
  characterColumns: 48,
  branding: {
    storeName: 'PRODX FLAGSHIP STORE',
    branchName: 'Siam Paragon Branch #01',
    tagline: 'Premium Retail Experience & Smart POS',
    taxId: 'TAX ID: 0105562098741 (VAT Reg.)',
    addressLine1: '991 Rama 1 Road, Pathum Wan',
    addressLine2: 'Bangkok 10330, Thailand',
    phone: 'Tel: +66 2 123 4567',
    email: 'support@prodx.store',
    website: 'www.prodx.store',
  },
  layout: {
    showHeaderLogo: true,
    showStoreHeader: true,
    showBranchName: true,
    showTagline: true,
    showTaxId: true,
    showAddress: true,
    showContactInfo: true,
    showCashierName: true,
    showRegisterId: true,
    showOrderTimestamp: true,
    showCustomerInfo: true,
    showLoyaltyPoints: true,
    showItemSku: true,
    showItemUnitPrice: true,
    showItemDiscounts: true,
    showTaxBreakdown: true,
    showPaymentBreakdown: true,
    showChangeGiven: true,
    showBarcode: true,
    showQrCode: true,
    barcodeType: 'code128',
    qrCodeUrlPrefix: 'https://prodx.store/receipt/',
    showFooterNote: true,
    footerMessage: 'Thank you for shopping with PRODX Retail!\nWe appreciate your business.',
    showReturnPolicy: true,
    returnPolicyText: 'Exchange / Returns accepted within 14 days\nwith original receipt and unremoved tags.',
    showWifiInfo: true,
    wifiSsid: 'PRODX_Guest_WiFi',
    wifiPassword: 'Welcome2026',
    dividerStyle: '=',
  },
  hardware: {
    autoCutPaper: true,
    openCashDrawer: true,
    drawerKickPin: 2,
    drawerPulseOnMs: 50,
    feedLinesBeforeCut: 3,
    doubleWidthHeader: true,
    boldItemNames: true,
    emphasizeTotals: true,
    soundBuzzer: false,
  },
  updatedAt: '2026-09-03T12:00:00.000Z',
};

/**
 * Compact Express 58mm Thermal Template (32 characters width)
 */
export const COMPACT_EXPRESS_58MM_TEMPLATE: ReceiptTemplate = {
  id: 'tmpl-express-58mm-compact',
  name: 'Compact Express 58mm',
  description: 'Space-saving 58mm format designed for high-speed mini thermal printers and mobile kiosks.',
  isDefault: false,
  isSystem: true,
  paperWidth: '58mm',
  characterColumns: 32,
  branding: {
    storeName: 'PRODX EXPRESS',
    branchName: 'Kiosk #02',
    tagline: 'Quick & Fresh',
    taxId: 'TAX ID: 0105562098741',
    addressLine1: '991 Rama 1 Rd, Bangkok',
    addressLine2: '',
    phone: 'Tel: 02-123-4567',
    email: 'info@prodx.store',
    website: 'prodx.store',
  },
  layout: {
    showHeaderLogo: false,
    showStoreHeader: true,
    showBranchName: true,
    showTagline: false,
    showTaxId: true,
    showAddress: false,
    showContactInfo: true,
    showCashierName: true,
    showRegisterId: true,
    showOrderTimestamp: true,
    showCustomerInfo: true,
    showLoyaltyPoints: false,
    showItemSku: false,
    showItemUnitPrice: false,
    showItemDiscounts: true,
    showTaxBreakdown: false,
    showPaymentBreakdown: true,
    showChangeGiven: true,
    showBarcode: false,
    showQrCode: true,
    barcodeType: 'qr',
    qrCodeUrlPrefix: 'https://prodx.store/r/',
    showFooterNote: true,
    footerMessage: 'Thank you! Visit again soon.',
    showReturnPolicy: false,
    returnPolicyText: '',
    showWifiInfo: false,
    dividerStyle: '-',
  },
  hardware: {
    autoCutPaper: true,
    openCashDrawer: true,
    drawerKickPin: 2,
    drawerPulseOnMs: 40,
    feedLinesBeforeCut: 2,
    doubleWidthHeader: true,
    boldItemNames: false,
    emphasizeTotals: true,
    soundBuzzer: false,
  },
  updatedAt: '2026-09-03T12:00:00.000Z',
};

/**
 * Official Full Tax Invoice (ABB / Full Tax 80mm)
 */
export const OFFICIAL_TAX_INVOICE_TEMPLATE: ReceiptTemplate = {
  id: 'tmpl-official-tax-invoice-80mm',
  name: 'Official Tax Invoice (Full VAT 80mm)',
  description: 'Compliant Simplified Tax Invoice (ใบกำกับภาษีอย่างย่อ) with full VAT breakdown and customer registry.',
  isDefault: false,
  isSystem: true,
  paperWidth: '80mm',
  characterColumns: 48,
  branding: {
    storeName: 'PRODX THAILAND CO., LTD.',
    branchName: 'Head Office (Branch 00000)',
    tagline: 'TAX INVOICE (ABB) / RECEIPT',
    taxId: 'Tax ID: 0105562098741 (Head Office)',
    addressLine1: '991 Rama 1 Road, Pathum Wan Sub-district',
    addressLine2: 'Pathum Wan District, Bangkok 10330',
    phone: 'Tel: +66 2 123 4567 / Fax: +66 2 123 4568',
    email: 'tax@prodx.store',
    website: 'www.prodx.store/tax',
  },
  layout: {
    showHeaderLogo: true,
    showStoreHeader: true,
    showBranchName: true,
    showTagline: true,
    showTaxId: true,
    showAddress: true,
    showContactInfo: true,
    showCashierName: true,
    showRegisterId: true,
    showOrderTimestamp: true,
    showCustomerInfo: true,
    showLoyaltyPoints: true,
    showItemSku: true,
    showItemUnitPrice: true,
    showItemDiscounts: true,
    showTaxBreakdown: true,
    showPaymentBreakdown: true,
    showChangeGiven: true,
    showBarcode: true,
    showQrCode: true,
    barcodeType: 'code128',
    qrCodeUrlPrefix: 'https://etax.prodx.store/verify/',
    showFooterNote: true,
    footerMessage: 'SIMPLIFIED TAX INVOICE\nIssued in accordance with the Revenue Code.',
    showReturnPolicy: true,
    returnPolicyText: 'Please inspect goods upon receipt.\nFor full tax invoice requests, contact within 7 days.',
    showWifiInfo: false,
    dividerStyle: '=',
  },
  hardware: {
    autoCutPaper: true,
    openCashDrawer: true,
    drawerKickPin: 2,
    drawerPulseOnMs: 60,
    feedLinesBeforeCut: 3,
    doubleWidthHeader: true,
    boldItemNames: true,
    emphasizeTotals: true,
    soundBuzzer: true,
  },
  updatedAt: '2026-09-03T12:00:00.000Z',
};

/**
 * Gift / Non-Priced Customer Slip Template
 */
export const GIFT_SLIP_TEMPLATE: ReceiptTemplate = {
  id: 'tmpl-gift-slip-80mm',
  name: 'Gift Slip / Delivery Note',
  description: 'Itemized verification slip without prices, perfect for gift packing and customer fulfillment.',
  isDefault: false,
  isSystem: true,
  paperWidth: '80mm',
  characterColumns: 48,
  branding: {
    storeName: 'PRODX GIFT & EXPERIENCES',
    branchName: 'Gift Wrapping Station',
    tagline: 'A Gift for You!',
    taxId: '',
    addressLine1: '991 Rama 1 Road, Bangkok',
    addressLine2: '',
    phone: 'Tel: +66 2 123 4567',
    email: 'care@prodx.store',
    website: 'www.prodx.store',
  },
  layout: {
    showHeaderLogo: true,
    showStoreHeader: true,
    showBranchName: true,
    showTagline: true,
    showTaxId: false,
    showAddress: false,
    showContactInfo: true,
    showCashierName: true,
    showRegisterId: true,
    showOrderTimestamp: true,
    showCustomerInfo: true,
    showLoyaltyPoints: false,
    showItemSku: true,
    showItemUnitPrice: false,
    showItemDiscounts: false,
    showTaxBreakdown: false,
    showPaymentBreakdown: false,
    showChangeGiven: false,
    showBarcode: true,
    showQrCode: true,
    barcodeType: 'code128',
    qrCodeUrlPrefix: 'https://prodx.store/gift/',
    showFooterNote: true,
    footerMessage: 'We hope you love your gift!\nEnjoy the PRODX experience.',
    showReturnPolicy: true,
    returnPolicyText: 'Gift exchange valid within 30 days\nwith this gift slip intact.',
    showWifiInfo: false,
    dividerStyle: '*',
  },
  hardware: {
    autoCutPaper: true,
    openCashDrawer: false,
    drawerKickPin: 2,
    drawerPulseOnMs: 0,
    feedLinesBeforeCut: 3,
    doubleWidthHeader: true,
    boldItemNames: true,
    emphasizeTotals: false,
    soundBuzzer: false,
  },
  updatedAt: '2026-09-03T12:00:00.000Z',
};

export const INITIAL_RECEIPT_TEMPLATES: readonly ReceiptTemplate[] = [
  DEFAULT_RETAIL_80MM_TEMPLATE,
  COMPACT_EXPRESS_58MM_TEMPLATE,
  OFFICIAL_TAX_INVOICE_TEMPLATE,
  GIFT_SLIP_TEMPLATE,
];
