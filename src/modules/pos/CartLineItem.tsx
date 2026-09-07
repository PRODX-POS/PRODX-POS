import React, { useState } from 'react';
import { CartLineItem as CartLineItemType } from '../../domain/order';
import { formatMoney, createMoney } from '../../domain/money';
import { useLanguage } from '../../context/LanguageContext';
import { Minus, Plus, Trash2, Tag, ChevronDown, Edit2 } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { VirtualNumpad } from '../../components/common/VirtualNumpad';
import { useCart } from '../../context/CartContext';

export interface CartLineItemProps {
  item: CartLineItemType;
  onUpdateQuantity: (lineId: string, delta: number) => void;
  onRequestDiscount: () => void;
  onRemove: (lineId: string) => void;
}

export const CartLineItem: React.FC<CartLineItemProps> = ({
  item,
  onUpdateQuantity,
  onRequestDiscount,
  onRemove,
}) => {
  const { t, language } = useLanguage();
  const { setItemQuantity, setItemPrice } = useCart();
  const [numpadMode, setNumpadMode] = useState<'quantity' | 'price' | null>(null);

  // Swipe-to-delete touch gesture state
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    if (diff < 0) {
      setOffsetX(Math.max(-110, diff));
    } else {
      setOffsetX(0);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offsetX < -70) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
      onRemove(item.lineId);
    } else {
      setOffsetX(0);
    }
  };

  const handleNumpadConfirm = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numpadMode === 'quantity') {
      setItemQuantity(item.lineId, Math.floor(numValue));
    } else if (numpadMode === 'price') {
      setItemPrice(item.lineId, createMoney(Math.floor(numValue * 100), item.unitPrice.currency));
    }
    setNumpadMode(null);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe Delete Action Reveal Background */}
      <div className="absolute inset-y-0 right-0 w-28 bg-rose-600 rounded-xl flex items-center justify-end pr-4 text-white font-bold text-xs gap-1.5 z-0 shadow-inner">
        <Trash2 className="h-4 w-4" />
        <span>{language === 'th' ? 'ลบรายการ' : 'Delete'}</span>
      </div>

      {/* Main Draggable / Swipable Item Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${offsetX}px)` }}
        className="relative z-10 p-3.5 rounded-xl border-crisp border border-border bg-card space-y-3 shadow-2xs transition-transform duration-150 ease-out select-none"
      >
        {/* Top info */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-text leading-tight">
              {item.product.name}
            </div>
            <button
              type="button"
              onClick={() => setNumpadMode('price')}
              className="text-[11px] text-text/70 font-mono mt-0.5 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
            >
              {formatMoney(item.unitPrice)} {language === 'th' ? '/ ชิ้น' : 'each'}
              <Edit2 className="h-3 w-3 opacity-50" />
            </button>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold font-mono text-text">
              {formatMoney(item.lineTotal)}
            </div>
            {item.discountBps > 0 && (
              <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold font-mono">
                -{item.discountBps / 100}% {language === 'th' ? 'ลด' : 'off'}
              </div>
            )}
          </div>
        </div>

        {/* Controls & Quantity adjustment */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border border-crisp">
          {/* Discount Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={onRequestDiscount}
              className={`min-h-[40px] flex items-center gap-1.5 text-xs px-3 py-1.5 theme-btn-radius active-scale border-crisp border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                item.discountBps > 0
                  ? 'border-primary bg-primary/10 text-primary font-bold'
                  : 'border-border bg-transparent text-text/70 hover:text-text'
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              <span>
                {item.discountBps > 0 ? (
                  <span className="font-mono">{item.discountBps / 100}%</span>
                ) : (
                  t.pos.discount
                )}
              </span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Quantity Controls and Trash */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.lineId, -1)}
              className="min-h-[40px] min-w-[40px] h-10 w-10 theme-btn-radius active-scale border-crisp border border-border bg-card text-text flex items-center justify-center hover:bg-background cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setNumpadMode('quantity')}
              className="min-h-[40px] min-w-[36px] h-10 px-2 flex items-center justify-center font-mono text-sm font-bold text-text hover:bg-background theme-btn-radius active-scale transition-colors cursor-pointer"
            >
              {item.quantity}
            </button>
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.lineId, 1)}
              className="min-h-[40px] min-w-[40px] h-10 w-10 theme-btn-radius active-scale border-crisp border border-border bg-card text-text flex items-center justify-center hover:bg-background cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.lineId)}
              className="min-h-[40px] min-w-[40px] h-10 w-10 ml-0.5 theme-btn-radius border border-transparent text-text/50 hover:border-rose-200 dark:hover:border-rose-900 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center cursor-pointer transition-colors active-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              aria-label="Remove item from cart"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Modal
          isOpen={numpadMode !== null}
          onClose={() => setNumpadMode(null)}
          title={
            numpadMode === 'price'
              ? language === 'th'
                ? 'แก้ไขราคา'
                : 'Override Price'
              : language === 'th'
              ? 'แก้ไขจำนวน'
              : 'Enter Quantity'
          }
        >
          <div className="p-4 sm:p-6 flex justify-center">
            <div className="w-full max-w-sm">
              {numpadMode === 'price' && (
                <VirtualNumpad
                  allowDecimal
                  initialValue={(item.unitPrice.amountInCents / 100).toString()}
                  onConfirm={handleNumpadConfirm}
                  onCancel={() => setNumpadMode(null)}
                />
              )}
              {numpadMode === 'quantity' && (
                <VirtualNumpad
                  allowDecimal={false}
                  initialValue={item.quantity.toString()}
                  onConfirm={handleNumpadConfirm}
                  onCancel={() => setNumpadMode(null)}
                />
              )}
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};
