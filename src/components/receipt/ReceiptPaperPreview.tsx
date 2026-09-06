/**
 * PRODX POS - Thermal Receipt Paper Visualizer
 * 
 * Renders an authentic thermal paper receipt with jagged tear edges, realistic
 * monospace character grid, 58mm / 80mm width scaling, barcode and QR code simulation.
 */

import React, { useState } from 'react';
import { ReceiptTemplate } from '../../domain/receipt';
import { Order } from '../../domain/order';
import { ThermalReceiptService } from '../../services/receipt/thermalReceiptService';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { useTheme } from '../../context/ThemeContext';
import {
  FileText,
  Binary,
  Maximize2,
  Copy,
  Check,
  Download,
  Printer,
  Sparkles,
} from 'lucide-react';

interface ReceiptPaperPreviewProps {
  order: Order;
  template: ReceiptTemplate;
  onPrint?: () => void;
  isPrinting?: boolean;
}

export const ReceiptPaperPreview: React.FC<ReceiptPaperPreviewProps> = ({
  order,
  template,
  onPrint,
  isPrinting = false,
}) => {
  const { customLogo } = useTheme();
  const [viewMode, setViewMode] = useState<'paper' | 'raw_text' | 'hex_dump'>('paper');
  const [copied, setCopied] = useState(false);

  const formatted = ThermalReceiptService.formatReceipt(order, template);
  const is58mm = template.paperWidth === '58mm';

  const handleCopyText = () => {
    navigator.clipboard.writeText(formatted.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPrn = () => {
    ThermalReceiptService.downloadEscPosFile(
      formatted.escposBytes,
      `thermal_receipt_${order.orderNumber}.prn`
    );
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Top Preview Controls Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-background border border-border border-crisp">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('paper')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'paper'
                ? 'bg-white dark:bg-white/10 text-orange-600 dark:text-orange-400 shadow-2xs font-bold'
                : 'text-text/70 dark:text-white/60 hover:text-text'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Thermal Paper</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('raw_text')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'raw_text'
                ? 'bg-white dark:bg-white/10 text-orange-600 dark:text-orange-400 shadow-2xs font-bold'
                : 'text-text/70 dark:text-white/60 hover:text-text'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Monospace</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('hex_dump')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'hex_dump'
                ? 'bg-white dark:bg-white/10 text-orange-600 dark:text-orange-400 shadow-2xs font-bold'
                : 'text-text/70 dark:text-white/60 hover:text-text'
            }`}
          >
            <Binary className="h-3.5 w-3.5" />
            <span>ESC/POS Hex</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="primary" size="sm">
            {template.paperWidth} ({template.characterColumns} cols)
          </Badge>
          <button
            type="button"
            onClick={handleCopyText}
            title="Copy Receipt Text"
            className="p-1.5 rounded-lg text-text/60 hover:text-text dark:text-white/50 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDownloadPrn}
            title="Download ESC/POS Binary (.prn)"
            className="p-1.5 rounded-lg text-text/60 hover:text-text dark:text-white/50 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Preview Box with Paper Styling */}
      <div className="flex-1 min-h-[380px] max-h-[560px] overflow-y-auto p-4 flex justify-center bg-zinc-200/70 dark:bg-[#07080A] rounded-2xl border border-border dark:border-white/5 shadow-inner no-scrollbar">
        {viewMode === 'paper' && (
          <div
            className={`transition-all bg-[#FAFBFD] dark:bg-[#FAFAFA] text-zinc-900 shadow-xl rounded-t-sm relative border-t-4 border-t-zinc-400/30 ${
              is58mm ? 'w-[280px] text-[11px]' : 'w-[360px] text-[12px]'
            } p-5 font-mono leading-tight select-text`}
            style={{
              boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
              backgroundImage: 'radial-gradient(#00000008 1px, transparent 0)',
              backgroundSize: '16px 16px',
            }}
          >
            {/* Top jagged edge decoration */}
            <div className="absolute -top-2 left-0 right-0 h-2 overflow-hidden flex">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-[#FAFBFD] dark:bg-[#FAFAFA] rotate-45 transform origin-bottom-left shrink-0"
                />
              ))}
            </div>

            {/* Receipt Content */}
            {customLogo && (
              <div className="flex justify-center mb-4 pt-2">
                <img
                  src={customLogo}
                  alt="Store Logo"
                  className="max-h-12 max-w-[120px] object-contain filter grayscale contrast-125"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <pre className="font-mono text-inherit whitespace-pre-wrap word-break-all text-zinc-900 leading-snug">
              {formatted.text}
            </pre>

            {/* Bottom jagged tear-off edge */}
            <div className="absolute -bottom-2 left-0 right-0 h-2 overflow-hidden flex">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-[#FAFBFD] dark:bg-[#FAFAFA] rotate-45 transform origin-top-left shrink-0"
                />
              ))}
            </div>
          </div>
        )}

        {viewMode === 'raw_text' && (
          <div className="w-full h-full bg-background text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto select-text shadow-lg border border-border">
            <pre className="whitespace-pre">{formatted.text}</pre>
          </div>
        )}

        {viewMode === 'hex_dump' && (
          <div className="w-full h-full bg-zinc-950 text-amber-400 p-4 rounded-xl font-mono text-xs overflow-x-auto select-text shadow-lg border border-border space-y-2">
            <div className="text-[10px] text-text/60 uppercase tracking-wider">
              ESC/POS Binary Payload ({formatted.escposBytes.length} bytes)
            </div>
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed break-all font-mono opacity-90">
              {formatted.hexDump}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      {onPrint && (
        <div className="pt-2 flex items-center justify-between gap-3">
          <div className="text-xs text-text/60 dark:text-white/40 font-mono">
            {formatted.escposBytes.length} bytes · ESC/POS Ready
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={onPrint}
            isLoading={isPrinting}
            leftIcon={<Printer className="h-4 w-4" />}
          >
            Print Receipt
          </Button>
        </div>
      )}
    </div>
  );
};
