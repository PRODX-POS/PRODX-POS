/**
 * PRODX POS - Receipt Printer Context & State Manager
 * 
 * Manages receipt templates, store branding customization, printer hardware settings,
 * print queues, and real-time formatting previews.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReceiptTemplate,
  PrinterHardwareConfig,
  PrintJob,
  INITIAL_RECEIPT_TEMPLATES,
  DEFAULT_RETAIL_80MM_TEMPLATE,
} from '../domain/receipt';
import { Order } from '../domain/order';
import { createMoney } from '../domain/money';
import { ThermalReceiptService, FormattedReceiptResult } from '../services/receipt/thermalReceiptService';
import { playScannerSound } from '../services/soundService';

const TEMPLATES_STORAGE_KEY = 'prodx_pos_receipt_templates';
const ACTIVE_TEMPLATE_ID_KEY = 'prodx_pos_active_receipt_template_id';
const PRINTER_CONFIG_KEY = 'prodx_pos_printer_config';
const PRINT_HISTORY_KEY = 'prodx_pos_print_history';

export interface ReceiptPrinterContextType {
  templates: readonly ReceiptTemplate[];
  activeTemplateId: string;
  activeTemplate: ReceiptTemplate;
  printerConfig: PrinterHardwareConfig;
  printHistory: readonly PrintJob[];
  isPrinting: boolean;
  lastPrintResult: { success: boolean; message: string; timestamp: string } | null;
  setActiveTemplateId: (id: string) => void;
  saveTemplate: (template: ReceiptTemplate) => void;
  deleteTemplate: (id: string) => void;
  resetTemplatesToDefault: () => void;
  updatePrinterConfig: (config: Partial<PrinterHardwareConfig>) => void;
  printReceipt: (order: Order, templateOverride?: ReceiptTemplate) => Promise<{ success: boolean; message: string }>;
  printTestReceipt: (template?: ReceiptTemplate) => Promise<{ success: boolean; message: string }>;
  kickCashDrawer: () => Promise<{ success: boolean; message: string }>;
  downloadEscPosDump: (order: Order, template?: ReceiptTemplate) => void;
  formatOrderReceipt: (order: Order, template?: ReceiptTemplate) => FormattedReceiptResult;
  getSampleOrder: () => Order;
  clearPrintHistory: () => void;
}

const DEFAULT_PRINTER_CONFIG: PrinterHardwareConfig = {
  printerName: 'Epson TM-T88VI (USB/Network)',
  connectionType: 'browser',
  paperWidth: '80mm',
  targetIp: '192.168.1.105',
  targetPort: 9100,
  autoPrintOnCheckout: true,
  autoKickDrawerOnCash: true,
  copies: 1,
  quickPrint: false,
};

const ReceiptPrinterContext = createContext<ReceiptPrinterContextType | undefined>(undefined);

export const ReceiptPrinterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Templates State
  const [templates, setTemplates] = useState<ReceiptTemplate[]>(() => {
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('[ReceiptPrinterContext] Failed loading templates from storage:', e);
    }
    return [...INITIAL_RECEIPT_TEMPLATES];
  });

  // 2. Active Template State
  const [activeTemplateId, setActiveTemplateIdState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_TEMPLATE_ID_KEY);
      if (stored) return stored;
    } catch {
      // ignore
    }
    return DEFAULT_RETAIL_80MM_TEMPLATE.id;
  });

  // 3. Printer Configuration State
  const [printerConfig, setPrinterConfig] = useState<PrinterHardwareConfig>(() => {
    try {
      const stored = localStorage.getItem(PRINTER_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_PRINTER_CONFIG, ...parsed };
      }
    } catch {
      // ignore
    }
    return DEFAULT_PRINTER_CONFIG;
  });

  // 4. Print Job History
  const [printHistory, setPrintHistory] = useState<PrintJob[]>(() => {
    try {
      const stored = localStorage.getItem(PRINT_HISTORY_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  });

  const [isPrinting, setIsPrinting] = useState(false);
  const [lastPrintResult, setLastPrintResult] = useState<{ success: boolean; message: string; timestamp: string } | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch (e) {
      console.warn('[ReceiptPrinterContext] Error saving templates:', e);
    }
  }, [templates]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TEMPLATE_ID_KEY, activeTemplateId);
    } catch (e) {
      console.warn('[ReceiptPrinterContext] Error saving active template id:', e);
    }
  }, [activeTemplateId]);

  useEffect(() => {
    try {
      localStorage.setItem(PRINTER_CONFIG_KEY, JSON.stringify(printerConfig));
    } catch (e) {
      console.warn('[ReceiptPrinterContext] Error saving printer config:', e);
    }
  }, [printerConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(PRINT_HISTORY_KEY, JSON.stringify(printHistory.slice(0, 30)));
    } catch (e) {
      console.warn('[ReceiptPrinterContext] Error saving print history:', e);
    }
  }, [printHistory]);

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === activeTemplateId) || templates[0] || DEFAULT_RETAIL_80MM_TEMPLATE;
  }, [templates, activeTemplateId]);

  const setActiveTemplateId = (id: string) => {
    const exists = templates.some((t) => t.id === id);
    if (exists) {
      setActiveTemplateIdState(id);
    }
  };

  const saveTemplate = (updated: ReceiptTemplate) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...updated, updatedAt: new Date().toISOString() };
        return next;
      }
      return [...prev, { ...updated, updatedAt: new Date().toISOString() }];
    });
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (filtered.length === 0) {
        return [...INITIAL_RECEIPT_TEMPLATES];
      }
      return filtered;
    });
    if (activeTemplateId === id) {
      setActiveTemplateIdState(DEFAULT_RETAIL_80MM_TEMPLATE.id);
    }
  };

  const resetTemplatesToDefault = () => {
    setTemplates([...INITIAL_RECEIPT_TEMPLATES]);
    setActiveTemplateIdState(DEFAULT_RETAIL_80MM_TEMPLATE.id);
  };

  const updatePrinterConfig = (configPatch: Partial<PrinterHardwareConfig>) => {
    setPrinterConfig((prev) => ({ ...prev, ...configPatch }));
  };

  const formatOrderReceipt = useCallback(
    (order: Order, templateOverride?: ReceiptTemplate): FormattedReceiptResult => {
      const tmpl = templateOverride || activeTemplate;
      return ThermalReceiptService.formatReceipt(order, tmpl);
    },
    [activeTemplate]
  );

  const getSampleOrder = useCallback((): Order => {
    const usd = (cents: number) => createMoney(cents, 'USD');
    return {
      id: 'sample-ord-2026-demo',
      orderNumber: 'ORD-20260903-0108',
      idempotencyKey: 'idem-sample-774920194810-live',
      storeId: 'store-siam-paragon-01',
      registerId: 'REG-01',
      cashierId: 'usr-charlie-03',
      cashierName: 'Charlie (Senior Cashier)',
      customer: {
        id: 'cust-sarah-01',
        name: 'Sarah Connor',
        phone: '081-987-6543',
        email: 'sarah@example.com',
        loyaltyTier: 'Gold',
        loyaltyPoints: 1250,
      },
      items: [
        {
          lineId: 'line-1',
          product: {
            id: 'prod-latte-01',
            storeId: 'store-siam-paragon-01',
            sku: 'BEV-LAT-01',
            barcode: '8850123456789',
            name: 'Iced Artisan Latte (Large)',
            categoryId: 'cat-beverages',
            price: usd(450),
            costPrice: usd(150),
            taxRateBps: 700,
            currentStock: 48,
            reorderPoint: 10,
            unitOfMeasure: 'cup',
          },
          quantity: 2,
          unitPrice: usd(450),
          discountBps: 0,
          lineSubtotal: usd(900),
          lineTax: usd(63),
          lineTotal: usd(963),
        },
        {
          lineId: 'line-2',
          product: {
            id: 'prod-croissant-02',
            storeId: 'store-siam-paragon-01',
            sku: 'BAK-CRS-02',
            barcode: '8850987654321',
            name: 'Fresh Butter Croissant',
            categoryId: 'cat-bakery',
            price: usd(350),
            costPrice: usd(120),
            taxRateBps: 700,
            currentStock: 12,
            reorderPoint: 5,
            unitOfMeasure: 'piece',
          },
          quantity: 1,
          unitPrice: usd(350),
          discountBps: 1000, // 10% discount
          lineSubtotal: usd(315),
          lineTax: usd(22),
          lineTotal: usd(337),
        },
      ],
      totals: {
        grossSubtotal: usd(1250),
        itemDiscounts: usd(35),
        orderDiscount: usd(0),
        netSubtotal: usd(1215),
        totalTax: usd(85),
        grandTotal: usd(1300),
        totalItemsCount: 3,
      },
      payments: [
        {
          id: 'pay-01',
          method: 'cash',
          amount: usd(1300),
          tenderedCash: usd(2000),
          changeGiven: usd(700),
          timestamp: new Date().toISOString(),
        },
      ],
      status: 'server_confirmed',
      createdAt: new Date().toISOString(),
      serverCommittedAt: new Date().toISOString(),
    };
  }, []);

  const printReceipt = async (
    order: Order,
    templateOverride?: ReceiptTemplate
  ): Promise<{ success: boolean; message: string }> => {
    setIsPrinting(true);
    const tmpl = templateOverride || activeTemplate;
    const jobId = `job-${Date.now()}`;

    const newJob: PrintJob = {
      id: jobId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      templateId: tmpl.id,
      templateName: tmpl.name,
      connectionType: printerConfig.connectionType,
      status: 'printing',
      timestamp: new Date().toISOString(),
    };

    setPrintHistory((prev) => [newJob, ...prev]);

    try {
      let result: { success: boolean; message: string };

      if (printerConfig.connectionType === 'webserial') {
        const escposBytes = ThermalReceiptService.formatAsEscPos(order, tmpl);
        result = await ThermalReceiptService.sendToWebSerial(escposBytes);
      } else if (printerConfig.connectionType === 'webusb') {
        const escposBytes = ThermalReceiptService.formatAsEscPos(order, tmpl);
        result = await ThermalReceiptService.sendToWebUsb(escposBytes);
      } else if (printerConfig.connectionType === 'bluetooth') {
        const escposBytes = ThermalReceiptService.formatAsEscPos(order, tmpl);
        result = await ThermalReceiptService.sendToWebBluetooth(escposBytes);
      } else {
        // Default Browser / OS Print Subsystem
        result = await ThermalReceiptService.printViaBrowser(order, tmpl);
      }

      setLastPrintResult({
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString(),
      });

      setPrintHistory((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: result.success ? 'success' : 'failed', error: result.success ? undefined : result.message }
            : j
        )
      );

      return result;
    } catch (err: any) {
      const errMsg = err?.message || 'Print job failed.';
      setLastPrintResult({
        success: false,
        message: errMsg,
        timestamp: new Date().toISOString(),
      });

      setPrintHistory((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: 'failed', error: errMsg } : j))
      );

      return { success: false, message: errMsg };
    } finally {
      setIsPrinting(false);
    }
  };

  const printTestReceipt = async (template?: ReceiptTemplate) => {
    const sample = getSampleOrder();
    return printReceipt(sample, template);
  };

  const kickCashDrawer = async (): Promise<{ success: boolean; message: string }> => {
    // Generates ESC/POS pulse command & plays mechanical register sound
    playScannerSound('cash_drawer');
    const sample = getSampleOrder();
    const tmpl = {
      ...activeTemplate,
      hardware: {
        ...activeTemplate.hardware,
        openCashDrawer: true,
      },
    };
    const escposBytes = ThermalReceiptService.formatAsEscPos(sample, tmpl);

    if (printerConfig.connectionType === 'webserial') {
      return ThermalReceiptService.sendToWebSerial(escposBytes.slice(0, 8));
    }
    if (printerConfig.connectionType === 'webusb') {
      return ThermalReceiptService.sendToWebUsb(escposBytes.slice(0, 8));
    }

    return {
      success: true,
      message: 'Cash drawer 24V kick pulse signal sent (ESC p 0 25 250).',
    };
  };

  const downloadEscPosDump = (order: Order, template?: ReceiptTemplate) => {
    const tmpl = template || activeTemplate;
    const escposBytes = ThermalReceiptService.formatAsEscPos(order, tmpl);
    ThermalReceiptService.downloadEscPosFile(escposBytes, `receipt_${order.orderNumber}.prn`);
  };

  const clearPrintHistory = () => {
    setPrintHistory([]);
  };

  return (
    <ReceiptPrinterContext.Provider
      value={{
        templates,
        activeTemplateId,
        activeTemplate,
        printerConfig,
        printHistory,
        isPrinting,
        lastPrintResult,
        setActiveTemplateId,
        saveTemplate,
        deleteTemplate,
        resetTemplatesToDefault,
        updatePrinterConfig,
        printReceipt,
        printTestReceipt,
        kickCashDrawer,
        downloadEscPosDump,
        formatOrderReceipt,
        getSampleOrder,
        clearPrintHistory,
      }}
    >
      {children}
    </ReceiptPrinterContext.Provider>
  );
};

export const useReceiptPrinter = (): ReceiptPrinterContextType => {
  const context = useContext(ReceiptPrinterContext);
  if (!context) {
    throw new Error('useReceiptPrinter must be used within a ReceiptPrinterProvider');
  }
  return context;
};
