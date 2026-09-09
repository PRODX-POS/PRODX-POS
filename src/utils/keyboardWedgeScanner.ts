/**
 * PRODX POS - Global Keyboard Wedge Barcode Scanner Utility
 *
 * Captures rapid keystroke bursts emitted by hardware USB/Bluetooth HID
 * keyboard-wedge barcode scanners (typically terminating with an 'Enter' key),
 * filters and validates against registered product SKUs/barcodes, and provides
 * seamless auto-addition to the active cart with sound, haptic, and visual feedback.
 */

import { Product } from '../domain/catalog';
import { playScannerSound } from '../services/soundService';
import { triggerHaptic } from '../services/hapticService';

export interface KeyboardWedgeScannerConfig {
  /**
   * Maximum interval in milliseconds between keystrokes to be considered part of a hardware scan burst.
   * Standard USB/Bluetooth barcode scanners output characters in 5ms-40ms intervals.
   * Human typing is typically >80ms. Default: 50ms.
   */
  maxIntervalMs?: number;

  /**
   * Minimum character length of a valid barcode or SKU. Default: 3.
   */
  minLength?: number;

  /**
   * Keys that mark the completion of a barcode scan. Default: ['Enter', 'NumpadEnter', 'Tab'].
   */
  terminatorKeys?: string[];

  /**
   * Optional barcode prefix / preamble (e.g. AIM symbology identifiers like ']C1' or custom headers).
   */
  prefix?: string;

  /**
   * Whether the scanner listener is currently active. Default: true.
   */
  enabled?: boolean;

  /**
   * Prevent browser default actions (such as submitting forms or triggering button clicks) on terminator keys. Default: true.
   */
  preventDefault?: boolean;

  /**
   * If true, intercepts hardware scan bursts even when an <input>, <textarea>, or <select> has focus,
   * automatically sanitizing the input so raw barcode digits don't clutter text boxes. Default: true.
   */
  captureInInputs?: boolean;

  /**
   * Whether to automatically filter and validate against available product catalog SKUs. Default: true.
   */
  filterValidSkus?: boolean;
}

export type WedgeScanResultStatus =
  | 'added_to_cart'
  | 'out_of_stock'
  | 'invalid_sku'
  | 'filtered_out'
  | 'raw_detected';

export interface WedgeScanEvent {
  rawCode: string;
  normalizedSku: string;
  matchedProduct: Product | null;
  timestamp: Date;
  status: WedgeScanResultStatus;
  source: 'hardware_wedge' | 'simulated';
}

export interface KeyboardWedgeScannerOptions extends KeyboardWedgeScannerConfig {
  /**
   * Active catalog of products to match against. Can be updated dynamically via setProducts().
   */
  products?: readonly Product[];

  /**
   * Callback invoked when a valid SKU is matched and verified.
   */
  onProductMatched?: (product: Product, scanEvent: WedgeScanEvent) => void;

  /**
   * Callback invoked when a validly formed scan does not match any product in the catalog.
   */
  onInvalidSku?: (scannedSku: string, scanEvent: WedgeScanEvent) => void;

  /**
   * Callback invoked when a product is matched but is out of stock (<= 0).
   */
  onOutOfStock?: (product: Product, scanEvent: WedgeScanEvent) => void;

  /**
   * Generic callback for any completed scan event.
   */
  onScanComplete?: (scanEvent: WedgeScanEvent) => void;

  /**
   * Callback when an error occurs during processing.
   */
  onError?: (error: Error) => void;
}

export interface KeyboardWedgeScannerInstance {
  /**
   * Manually trigger a simulated scan (useful for dev tools, UI tester modals, camera scanners).
   */
  simulateScan: (barcodeOrSku: string) => WedgeScanEvent;

  /**
   * Dynamically update the catalog products used for SKU filtering.
   */
  setProducts: (products: readonly Product[]) => void;

  /**
   * Dynamically update scanner configuration options.
   */
  updateConfig: (config: Partial<KeyboardWedgeScannerConfig>) => void;

  /**
   * Enable or disable the scanner listener.
   */
  setEnabled: (enabled: boolean) => void;

  /**
   * Get the current scanner state.
   */
  getState: () => {
    enabled: boolean;
    lastScan: WedgeScanEvent | null;
    totalScans: number;
    isBurstInProgress: boolean;
  };

  /**
   * Remove event listeners and tear down instance.
   */
  destroy: () => void;
}

/**
 * Normalizes scanned barcode/SKU strings by removing control characters,
 * trimming whitespace, and stripping common hardware scanner symbology identifiers.
 */
export function normalizeScannedSku(raw: string, prefix?: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();

  // Strip optional configured prefix
  if (prefix && cleaned.startsWith(prefix)) {
    cleaned = cleaned.slice(prefix.length);
  }

  // Strip standard AIM Symbology Identifiers if present (e.g. ']C1', ']e0', ']A0', ']d2')
  if (/^\][A-Za-z0-9]{2}/.test(cleaned)) {
    cleaned = cleaned.slice(3);
  }

  // Remove non-printable control characters
  cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  return cleaned.trim();
}

/**
 * Searches a product catalog for a match against a scanned SKU or barcode.
 * Checks SKU, barcode, ID, and case-insensitive variations.
 */
export function findProductBySkuOrBarcode(
  scannedCode: string,
  products: readonly Product[]
): Product | null {
  const normalized = normalizeScannedSku(scannedCode);
  if (!normalized || !products || products.length === 0) return null;

  const lower = normalized.toLowerCase();

  // 1. Exact Barcode Match
  const exactBarcode = products.find((p) => p.barcode === normalized);
  if (exactBarcode) return exactBarcode;

  // 2. Exact SKU Match
  const exactSku = products.find((p) => p.sku === normalized);
  if (exactSku) return exactSku;

  // 3. Case-Insensitive Barcode Match
  const caseBarcode = products.find((p) => p.barcode && p.barcode.toLowerCase() === lower);
  if (caseBarcode) return caseBarcode;

  // 4. Case-Insensitive SKU Match
  const caseSku = products.find((p) => p.sku && p.sku.toLowerCase() === lower);
  if (caseSku) return caseSku;

  // 5. Product ID Match (for internal system QR/Barcodes)
  const idMatch = products.find((p) => p.id && p.id.toLowerCase() === lower);
  if (idMatch) return idMatch;

  return null;
}

/**
 * Creates a global keyboard wedge barcode scanner listener on the window object.
 */
export function createKeyboardWedgeScanner(
  options: KeyboardWedgeScannerOptions
): KeyboardWedgeScannerInstance {
  let config: Required<KeyboardWedgeScannerConfig> = {
    maxIntervalMs: options.maxIntervalMs ?? 50,
    minLength: options.minLength ?? 3,
    terminatorKeys: options.terminatorKeys ?? ['Enter', 'NumpadEnter', 'Tab'],
    prefix: options.prefix ?? '',
    enabled: options.enabled ?? true,
    preventDefault: options.preventDefault ?? true,
    captureInInputs: options.captureInInputs ?? true,
    filterValidSkus: options.filterValidSkus ?? true,
  };

  let productCatalog: readonly Product[] = options.products ?? [];
  let buffer: string[] = [];
  let lastKeyTime: number = 0;
  let isBurstInProgress: boolean = false;
  let burstTimeoutId: any = null;
  let lastScanEvent: WedgeScanEvent | null = null;
  let totalScansCount: number = 0;

  // Process a completed barcode string
  const processScannedCode = (
    rawString: string,
    source: 'hardware_wedge' | 'simulated'
  ): WedgeScanEvent => {
    const normalized = normalizeScannedSku(rawString, config.prefix);

    let status: WedgeScanResultStatus = 'raw_detected';
    let matchedProduct: Product | null = null;

    if (config.filterValidSkus) {
      matchedProduct = findProductBySkuOrBarcode(normalized, productCatalog);

      if (matchedProduct) {
        if (matchedProduct.currentStock <= 0) {
          status = 'out_of_stock';
          playScannerSound('error');
          options.onOutOfStock?.(matchedProduct, {
            rawCode: rawString,
            normalizedSku: normalized,
            matchedProduct,
            timestamp: new Date(),
            status,
            source,
          });
        } else {
          status = 'added_to_cart';
          playScannerSound('success');
          triggerHaptic('success');
          options.onProductMatched?.(matchedProduct, {
            rawCode: rawString,
            normalizedSku: normalized,
            matchedProduct,
            timestamp: new Date(),
            status,
            source,
          });
        }
      } else {
        status = 'invalid_sku';
        playScannerSound('error');
        options.onInvalidSku?.(normalized, {
          rawCode: rawString,
          normalizedSku: normalized,
          matchedProduct: null,
          timestamp: new Date(),
          status,
          source,
        });
      }
    } else {
      status = 'raw_detected';
      playScannerSound('success');
    }

    const event: WedgeScanEvent = {
      rawCode: rawString,
      normalizedSku: normalized,
      matchedProduct,
      timestamp: new Date(),
      status,
      source,
    };

    lastScanEvent = event;
    totalScansCount += 1;

    // Dispatch custom browser event for app-wide reactivity
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('prodx:wedge-barcode-scanned', {
          detail: event,
        })
      );
    }

    options.onScanComplete?.(event);
    return event;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!config.enabled) {
      buffer = [];
      isBurstInProgress = false;
      return;
    }

    const now = performance.now();
    const timeSinceLastKey = now - lastKeyTime;
    lastKeyTime = now;

    const target = event.target as HTMLElement | null;
    const isInputFocused =
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable);

    const isTerminator = config.terminatorKeys.includes(event.key);

    if (isTerminator) {
      const bufferedString = buffer.join('');

      // If we accumulated characters in rapid bursts meeting minimum length
      if (bufferedString.length >= config.minLength) {
        if (config.preventDefault) {
          event.preventDefault();
          event.stopPropagation();
        }

        // If focus was on an input element, clear the text so raw barcode doesn't pollute the input
        if (isInputFocused && config.captureInInputs && target instanceof HTMLInputElement) {
          if (target.type === 'text' || target.type === 'search') {
            target.value = '';
            const valueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value'
            )?.set;
            if (valueSetter) {
              valueSetter.call(target, '');
            }
            target.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }

        buffer = [];
        isBurstInProgress = false;
        if (burstTimeoutId) clearTimeout(burstTimeoutId);

        try {
          processScannedCode(bufferedString, 'hardware_wedge');
        } catch (err) {
          options.onError?.(err instanceof Error ? err : new Error(String(err)));
        }
        return;
      }

      // Not enough characters or human typing; clear buffer
      buffer = [];
      isBurstInProgress = false;
      return;
    }

    // Only collect single printable characters (ignore Shift, Control, Alt, Meta, Function keys)
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      // If interval between keystrokes exceeds max threshold, it's human manual typing — reset buffer
      if (timeSinceLastKey > config.maxIntervalMs && buffer.length > 0) {
        buffer = [];
        isBurstInProgress = false;
      }

      buffer.push(event.key);

      // Fast burst detection (>1 char within threshold)
      if (buffer.length >= 2 && timeSinceLastKey <= config.maxIntervalMs) {
        isBurstInProgress = true;

        if (burstTimeoutId) clearTimeout(burstTimeoutId);
        burstTimeoutId = setTimeout(() => {
          isBurstInProgress = false;
        }, config.maxIntervalMs * 3);
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown, true);
  }

  return {
    simulateScan: (barcodeOrSku: string) => {
      return processScannedCode(barcodeOrSku, 'simulated');
    },
    setProducts: (products: readonly Product[]) => {
      productCatalog = products;
    },
    updateConfig: (newConfig: Partial<KeyboardWedgeScannerConfig>) => {
      config = { ...config, ...newConfig };
    },
    setEnabled: (enabled: boolean) => {
      config.enabled = enabled;
      if (!enabled) {
        buffer = [];
        isBurstInProgress = false;
      }
    },
    getState: () => ({
      enabled: config.enabled,
      lastScan: lastScanEvent,
      totalScans: totalScansCount,
      isBurstInProgress,
    }),
    destroy: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown, true);
      }
      if (burstTimeoutId) clearTimeout(burstTimeoutId);
      buffer = [];
    },
  };
}
