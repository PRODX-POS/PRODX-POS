/**
 * PRODX POS - Unified Enterprise Settings Hub Types
 */

export type SettingsTabId =
  | 'general'
  | 'appearance'
  | 'hardware'
  | 'tax_accounting'
  | 'security_roles'
  | 'data_sync';

export interface SettingsTabItem {
  id: SettingsTabId;
  label: { th: string; en: string };
  sublabel: { th: string; en: string };
  iconName: string;
  badge?: string;
}

export interface StoreProfileFormState {
  storeName: string;
  storeCode: string;
  storeAddress: string;
  storePhone: string;
  timezone: string;
  baseCurrency: string;
  taxId: string;
  branchName: string;
  receiptHeaderMsg: string;
  receiptFooterMsg: string;
}

export interface TaxAccountingFormState {
  defaultTaxRateBps: number; // e.g. 700 = 7.00%
  taxCalculationType: 'inclusive' | 'exclusive';
  taxId: string;
  posMachineId: string;
  enableCash: boolean;
  enableCard: boolean;
  enablePromptPay: boolean;
  enableSplitPayment: boolean;
}

export interface SecurityPoliciesState {
  inactivityTimeoutMinutes: number;
  requirePinForVoid: boolean;
  requirePinForDiscount: boolean;
  requirePinForDrawerKick: boolean;
  requirePinForPriceOverride: boolean;
  allowCashierRefund: boolean;
}

export interface CustomerDisplayConfigState {
  enabled: boolean;
  welcomeMessage: string;
  subMessage: string;
  bannerImageUrl: string;
  autoSlideshow: boolean;
}

export interface HardwareAudioConfigState {
  beepOnScan: boolean;
  soundEnabled: boolean;
  volume: number; // 0 to 100
}
