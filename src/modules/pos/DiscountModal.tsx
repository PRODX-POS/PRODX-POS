import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { formatMoney, createMoney } from '../../domain/money';
import { Percent, Banknote, Calculator, Tag } from 'lucide-react';
import { playScannerSound } from '../../services/soundService';

export interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'cart' | 'item';
  targetName: string;
  currentDiscountBps: number;
  basePriceCents: number;
  currency: string;
  onApply: (bps: number) => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetName,
  currentDiscountBps,
  basePriceCents,
  currency,
  onApply,
}) => {
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<'percentage' | 'fixed'>('percentage');
  const [percentageInput, setPercentageInput] = useState<string>('');
  const [fixedInput, setFixedInput] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (currentDiscountBps > 0) {
        // Init with existing bps
        setPercentageInput((currentDiscountBps / 100).toString());
        const fixed = (basePriceCents * (currentDiscountBps / 10000)) / 100;
        setFixedInput(fixed.toFixed(2).replace(/\.00$/, ''));
      } else {
        setPercentageInput('');
        setFixedInput('');
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, currentDiscountBps, basePriceCents]);

  const handleApply = () => {
    let bpsToApply = 0;

    if (mode === 'percentage') {
      const pct = parseFloat(percentageInput);
      if (!isNaN(pct) && pct > 0 && pct <= 100) {
        bpsToApply = Math.round(pct * 100);
      }
    } else {
      const fixedValue = parseFloat(fixedInput);
      if (!isNaN(fixedValue) && fixedValue > 0) {
        const fixedCents = Math.round(fixedValue * 100);
        // Calculate BPS relative to the base price
        if (basePriceCents > 0) {
          const bps = (fixedCents / basePriceCents) * 10000;
          bpsToApply = Math.min(Math.round(bps), 10000); // Cap at 100%
        }
      }
    }

    playScannerSound('click');
    onApply(bpsToApply);
    onClose();
  };

  const handleClear = () => {
    playScannerSound('click');
    onApply(0);
    onClose();
  };

  // Preview the discount amount
  let previewAmountCents = 0;
  if (mode === 'percentage') {
    const pct = parseFloat(percentageInput) || 0;
    previewAmountCents = (basePriceCents * Math.min(pct, 100)) / 100;
  } else {
    previewAmountCents = Math.round((parseFloat(fixedInput) || 0) * 100);
  }
  
  const finalPriceCents = Math.max(basePriceCents - previewAmountCents, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'th' ? `ส่วนลด: ${targetName}` : `Discount: ${targetName}`}
      description={language === 'th' ? 'กำหนดส่วนลดแบบเปอร์เซ็นต์หรือยอดเงินคงที่' : 'Configure percentage or fixed discount value'}
      maxWidth="md"
      footer={
        <div className="flex gap-3 w-full">
          {currentDiscountBps > 0 && (
            <Button variant="outline" className="flex-1 text-rose-600 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={handleClear}>
              {language === 'th' ? 'ล้างส่วนลด' : 'Clear'}
            </Button>
          )}
          <Button variant="primary" className="flex-1" onClick={handleApply}>
            {language === 'th' ? 'ใช้ส่วนลด' : 'Apply Discount'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Type Toggle */}
        <div className="flex bg-card p-1 rounded-lg border-crisp border border-border">
          <button
            type="button"
            onClick={() => {
              setMode('percentage');
              inputRef.current?.focus();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'percentage'
                ? 'bg-background shadow-2xs text-text font-bold'
                : 'text-text/70 hover:text-text'
            }`}
          >
            <Percent className="h-4 w-4" />
            {language === 'th' ? 'เปอร์เซ็นต์ (%)' : 'Percentage (%)'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('fixed');
              inputRef.current?.focus();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'fixed'
                ? 'bg-background shadow-2xs text-text font-bold'
                : 'text-text/70 hover:text-text'
            }`}
          >
            <Banknote className="h-4 w-4" />
            {language === 'th' ? 'จำนวนเงิน' : 'Fixed Amount'}
          </button>
        </div>

        {/* Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text/70">
            {mode === 'percentage'
              ? (language === 'th' ? 'ระบุเปอร์เซ็นต์ส่วนลด' : 'Enter discount percentage')
              : (language === 'th' ? 'ระบุจำนวนเงินที่ต้องการลด' : 'Enter discount amount')}
          </label>
          <div className="relative">
            {mode === 'fixed' && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-text/40">
                {createMoney(0, currency).currency === 'THB' ? '฿' : '$'}
              </div>
            )}
            <input
              ref={inputRef}
              type="number"
              min="0"
              max={mode === 'percentage' ? "100" : undefined}
              step="any"
              value={mode === 'percentage' ? percentageInput : fixedInput}
              onChange={(e) => {
                if (mode === 'percentage') setPercentageInput(e.target.value);
                else setFixedInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApply();
              }}
              className={`w-full min-h-[44px] text-base font-mono font-semibold bg-card border-crisp border border-border rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs transition-colors ${
                mode === 'fixed' ? 'pl-8' : 'pr-8'
              }`}
              placeholder="0"
            />
            {mode === 'percentage' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-text/40 text-sm">
                %
              </div>
            )}
          </div>
          
          {/* Quick presets */}
          {mode === 'percentage' && (
            <div className="flex gap-2 mt-2">
              {[5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPercentageInput(pct.toString())}
                  className="flex-1 py-1.5 rounded-lg border-crisp border border-border bg-card text-xs font-mono font-bold text-text hover:bg-background transition-colors cursor-pointer shadow-2xs"
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-card p-4 rounded-lg space-y-2 border-crisp border border-border shadow-2xs">
          <div className="flex justify-between text-xs text-text/70">
            <span>{language === 'th' ? 'ราคาเดิม' : 'Original Price'}</span>
            <span className="font-mono font-medium">{formatMoney(createMoney(basePriceCents, currency))}</span>
          </div>
          <div className="flex justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold">
            <span>{language === 'th' ? 'ส่วนลดที่คาดหวัง' : 'Discount'}</span>
            <span className="font-mono">-{formatMoney(createMoney(previewAmountCents, currency))}</span>
          </div>
          <div className="pt-2 border-t border-border border-crisp flex justify-between items-center">
            <span className="text-xs font-semibold text-text">{language === 'th' ? 'ราคาสุทธิ' : 'Final Price'}</span>
            <span className="text-base font-mono font-bold text-text">
              {formatMoney(createMoney(finalPriceCents, currency))}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
