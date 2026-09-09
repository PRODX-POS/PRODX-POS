/**
 * PRODX POS - Thermal Receipt Print & Preview Modal
 * 
 * Provides live receipt inspection, template switching, copies counter,
 * ESC/POS binary downloading, and multi-driver print execution.
 */

import React, { useState } from 'react';
import { useReceiptPrinter } from '../../context/ReceiptPrinterContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Order } from '../../domain/order';
import { ReceiptTemplate } from '../../domain/receipt';
import { ReceiptPaperPreview } from './ReceiptPaperPreview';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Printer,
  Sliders,
  Sparkles,
  Download,
  DollarSign,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Copy,
  Zap,
} from 'lucide-react';

interface ReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
  onCustomizeTemplate?: () => void;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  isOpen,
  onClose,
  order,
  onCustomizeTemplate,
}) => {
  const {
    templates,
    activeTemplate,
    setActiveTemplateId,
    printerConfig,
    updatePrinterConfig,
    printReceipt,
    kickCashDrawer,
    isPrinting,
    lastPrintResult,
  } = useReceiptPrinter();
  const { language, t } = useLanguage();
  const { addToast } = useToast();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(activeTemplate.id);
  const [copies, setCopies] = useState<number>(1);

  if (!isOpen || !order) return null;

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || activeTemplate;

  const handlePrint = async () => {
    let finalSuccess = true;
    let finalMessage = '';

    for (let i = 0; i < copies; i++) {
      const res = await printReceipt(order, selectedTemplate);
      if (!res.success) {
        finalSuccess = false;
        finalMessage = res.message;
        break;
      }
      finalMessage = res.message;
    }

    if (finalSuccess) {
      addToast({
        title: language === 'th' ? 'ส่งคำสั่งพิมพ์ใบเสร็จแล้ว' : 'Print Job Transmitted',
        message: language === 'th' ? `พิมพ์ใบเสร็จ #${order.orderNumber} (${copies} ชุด) สำเร็จ` : `Sent ${copies} copy of #${order.orderNumber} to thermal printer.`,
        type: 'success',
      });
    } else {
      addToast({
        title: language === 'th' ? 'การพิมพ์ล้มเหลว' : 'Print Job Error',
        message: finalMessage,
        type: 'error',
      });
    }
  };

  const handleKickDrawer = async () => {
    const res = await kickCashDrawer();
    addToast({
      title: language === 'th' ? 'ส่งสัญญาณเปิดลิ้นชัก' : 'Cash Drawer Pulse',
      message: res.message,
      type: res.success ? 'info' : 'warning',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${language === 'th' ? 'พิมพ์ใบเสร็จรับเงิน' : 'Thermal Receipt'} #${order.orderNumber}`}
      description={`${language === 'th' ? 'ตัวอย่างใบเสร็จความร้อนและการส่งข้อมูลไปยังเครื่องพิมพ์' : 'Live thermal print preview with ESC/POS formatting & store branding.'}`}
      maxWidth="xl"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleKickDrawer}
              leftIcon={<DollarSign className="h-3.5 w-3.5" />}
            >
              {language === 'th' ? 'เปิดลิ้นชัก (Kick)' : 'Kick Drawer'}
            </Button>
            {onCustomizeTemplate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCustomizeTemplate}
                leftIcon={<Sliders className="h-3.5 w-3.5" />}
              >
                {language === 'th' ? 'ปรับแต่งเทมเพลต' : 'Customize Branding'}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              {language === 'th' ? 'ปิด' : 'Close'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              isLoading={isPrinting}
              leftIcon={<Printer className="h-4 w-4" />}
            >
              {language === 'th' ? `พิมพ์ใบเสร็จ (${copies} ชุด)` : `Print Ticket (${copies}x)`}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Template & Hardware Selection Bar */}
        <div className="p-3 rounded-lg bg-card border border-border border-crisp flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text/70">Template:</span>
            <select
              value={selectedTemplateId}
              onChange={(e) => {
                setSelectedTemplateId(e.target.value);
                setActiveTemplateId(e.target.value);
              }}
              className="h-8 rounded-md border border-border border-crisp bg-card px-2.5 font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name} ({tmpl.paperWidth})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-text/70">Copies:</span>
              <div className="flex items-center border border-border border-crisp rounded-md overflow-hidden bg-card">
                <button
                  type="button"
                  onClick={() => setCopies((c) => Math.max(1, c - 1))}
                  className="px-2 py-1 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  -
                </button>
                <span className="px-2.5 py-1 text-xs font-semibold font-mono">{copies}</span>
                <button
                  type="button"
                  onClick={() => setCopies((c) => Math.min(5, c + 1))}
                  className="px-2 py-1 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={printerConfig.quickPrint}
              onClick={() => {
                const next = !printerConfig.quickPrint;
                updatePrinterConfig({ quickPrint: next });
                addToast({
                  title: language === 'th' ? 'พิมพ์ด่วน' : 'Quick Print',
                  message: next
                    ? (language === 'th' ? 'เปิดพิมพ์ด่วน: รายการต่อไปจะข้ามหน้าต่างนี้และพิมพ์ทันที' : 'Quick Print enabled: Future receipts will bypass this preview modal.')
                    : (language === 'th' ? 'ปิดพิมพ์ด่วน' : 'Quick Print disabled.'),
                  type: 'info',
                });
              }}
              title={language === 'th' ? 'เปิด/ปิด พิมพ์ด่วนข้าม Preview' : 'Toggle Quick Print (Bypass Preview)'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold cursor-pointer transition-colors ${
                printerConfig.quickPrint
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-card text-text/60 border-border hover:text-text'
              }`}
            >
              <Zap className={`h-3.5 w-3.5 ${printerConfig.quickPrint ? 'text-amber-500' : 'text-text/40'}`} />
              <span>{language === 'th' ? 'พิมพ์ด่วน (ข้าม Preview)' : 'Quick Print'}</span>
            </button>

            <Badge variant="success" size="sm" dot>
              {printerConfig.printerName}
            </Badge>
          </div>
        </div>

        {/* Paper Preview */}
        <ReceiptPaperPreview
          order={order}
          template={selectedTemplate}
        />
      </div>
    </Modal>
  );
};
