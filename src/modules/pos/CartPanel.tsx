import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { playScannerSound } from '../../services/soundService';
import { CartLineItem } from './CartLineItem';
import { CustomerSelectModal } from './CustomerSelectModal';
import { PaymentConfirmationModal } from './PaymentConfirmationModal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatMoney } from '../../domain/money';
import { Order } from '../../domain/order';
import {
  ShoppingCart,
  UserPlus,
  UserCheck,
  PauseCircle,
  CreditCard,
  Trash2,
  Percent,
  ChevronDown,
  Eye,
  RotateCcw,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { CartReceiptPreviewModal } from '../../components/receipt/CartReceiptPreviewModal';
import { DiscountModal } from './DiscountModal';
import { ParkCartModal } from './ParkCartModal';
import { HoldOrdersModal } from './HoldOrdersModal';
import { Modal } from '../../components/common/Modal';

export const CartPanel: React.FC = () => {
  const {
    items,
    totals,
    customer,
    orderDiscountBps,
    updateQuantity,
    setItemDiscount,
    removeItem,
    clearCart,
    setCustomer,
    setOrderDiscount,
    holdCurrentCart,
    heldCarts,
    secondaryTotals,
    activeSecondaryCurrency,
  } = useCart();
  const { t, language } = useLanguage();

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);
  const [isParkModalOpen, setIsParkModalOpen] = useState(false);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  
  const [discountModalConfig, setDiscountModalConfig] = useState<{
    isOpen: boolean;
    targetType: 'cart' | 'item';
    targetId?: string;
    targetName: string;
    currentBps: number;
    basePriceCents: number;
  } | null>(null);

  const hasItems = items.length > 0;

  return (
    <div className="h-full w-full flex flex-col bg-card select-none overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. TOP SECTION (15% HEIGHT): Customer Attachment, Ticket Meta & Actions    */}
      {/* ========================================================================= */}
      <div className="h-[15%] min-h-[56px] max-h-[15%] shrink-0 border-b border-border border-crisp bg-card px-3 sm:px-4 py-2 flex flex-col justify-center items-center overflow-hidden">
        <div className="w-full flex items-center justify-between gap-2">
          {/* Customer Attachment / Member Loyalty Button */}
          <button
            type="button"
            onClick={() => {
              playScannerSound('click');
              setIsCustomerModalOpen(true);
            }}
            className={`min-h-[44px] flex-1 flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border-crisp border text-xs font-bold transition-all cursor-pointer truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active-scale ${
              customer
                ? 'border-primary/40 bg-primary/5 text-text'
                : 'border-border hover:border-primary/50 text-text/70 bg-background/50 hover:bg-background'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 truncate">
              {customer ? (
                <>
                  <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0">
                    <UserCheck className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate font-bold text-text text-xs">{customer.name}</span>
                </>
              ) : (
                <>
                  <div className="p-1 rounded-md bg-card text-text/50 shrink-0">
                    <UserPlus className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate text-xs font-semibold">
                    {language === 'th' ? 'เลือกลูกค้า / สะสมคะแนน' : 'Add Customer / Loyalty'}
                  </span>
                </>
              )}
            </div>

            {customer ? (
              <Badge variant="primary" size="xs" className="shrink-0 font-mono font-bold">
                {customer.loyaltyPoints} {language === 'th' ? 'แต้ม' : 'pts'}
              </Badge>
            ) : (
              <span className="text-[10px] text-text/40 shrink-0 font-mono">
                {language === 'th' ? 'แตะเลือก' : 'Select'}
              </span>
            )}
          </button>

          {/* Quick Ticket Badge & Clear Cart Shortcut */}
          <div className="flex items-center gap-1.5 shrink-0">
            {heldCarts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playScannerSound('click');
                  setIsHoldModalOpen(true);
                }}
                title={language === 'th' ? `บิลที่พักไว้ (${heldCarts.length})` : `Parked Orders (${heldCarts.length})`}
                className="min-h-[44px] px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors active-scale"
              >
                <PauseCircle className="h-3.5 w-3.5" />
                <span className="font-mono text-[11px]">{heldCarts.length}</span>
              </button>
            )}

            <div className="px-2 py-1 rounded-lg border border-border/80 bg-background/60 text-text/70 text-[11px] font-mono font-bold flex items-center gap-1">
              <ShoppingBag className="h-3 w-3 text-primary" />
              <span>{totals.totalItemsCount}</span>
            </div>

            {hasItems && (
              <button
                type="button"
                onClick={() => {
                  playScannerSound('click');
                  setIsClearConfirmOpen(true);
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-border/60 hover:border-rose-200 dark:hover:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-text/50 hover:text-rose-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 active-scale"
                title={t.pos.clearCart}
                aria-label={t.pos.clearCart}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BODY SECTION (45% HEIGHT): Scrollable Line Items List                   */}
      {/* ========================================================================= */}
      <div className="h-[45%] min-h-0 max-h-[45%] flex-1 overflow-y-auto p-2.5 sm:p-3 bg-background/40 custom-scrollbar flex flex-col justify-start">
        {!hasItems ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-4 my-auto">
            <EmptyState
              icon={<ShoppingCart className="h-6 w-6 text-text/30" />}
              title={t.pos.emptyCart}
              description={t.pos.emptyCartDesc}
              className="border-none bg-transparent py-2"
            />
            {heldCarts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs font-bold border-border border-crisp theme-btn-radius active-scale"
                onClick={() => setIsHoldModalOpen(true)}
                leftIcon={<PauseCircle className="h-3.5 w-3.5 text-amber-500" />}
              >
                {language === 'th' ? `เรียกคืนบิลที่พักไว้ (${heldCarts.length})` : `Retrieve Parked Orders (${heldCarts.length})`}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2 w-full">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.lineId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <CartLineItem
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRequestDiscount={() => {
                      setDiscountModalConfig({
                        isOpen: true,
                        targetType: 'item',
                        targetId: item.lineId,
                        targetName: item.product.name,
                        currentBps: item.discountBps,
                        basePriceCents: item.unitPrice.amountInCents * item.quantity,
                      });
                    }}
                    onRemove={removeItem}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM SECTION (40% HEIGHT): Ticket Discounts, Financial Summary & CTAs */}
      {/* ========================================================================= */}
      <div className="h-[40%] min-h-0 max-h-[40%] shrink-0 border-t border-border border-crisp bg-card p-2.5 sm:p-3.5 flex flex-col justify-between overflow-y-auto custom-scrollbar shadow-xs">
        {/* Upper Part: Discounts & Financial Breakdown */}
        <div className="space-y-1.5">
          {/* Order Level Discount Selector Row */}
          <div className="flex items-center justify-between text-xs pb-1 border-b border-border/40">
            <div className="flex items-center gap-1.5 font-semibold text-text/70">
              <Percent className="h-3.5 w-3.5 text-primary/70" />
              <span>{language === 'th' ? 'ส่วนลดท้ายบิล:' : 'Ticket Discount:'}</span>
            </div>
            <button
              type="button"
              disabled={!hasItems}
              onClick={() => {
                if (!hasItems) return;
                setDiscountModalConfig({
                  isOpen: true,
                  targetType: 'cart',
                  targetName: language === 'th' ? 'ส่วนลดท้ายบิล' : 'Ticket Discount',
                  currentBps: orderDiscountBps,
                  basePriceCents: totals.grossSubtotal.amountInCents - totals.itemDiscounts.amountInCents,
                });
              }}
              className={`min-h-[26px] px-2 py-0.5 rounded-md font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                orderDiscountBps > 0
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : hasItems
                  ? 'text-primary hover:bg-primary/10'
                  : 'text-text/30 cursor-not-allowed'
              }`}
            >
              <span>
                {orderDiscountBps > 0 ? (
                  <>
                    <span className="font-mono">{orderDiscountBps / 100}%</span>{' '}
                    {language === 'th' ? 'ใช้แล้ว' : 'Applied'}
                  </>
                ) : (
                  language === 'th' ? '+ ใส่ส่วนลด' : '+ Add Discount'
                )}
              </span>
            </button>
          </div>

          {/* Breakdown Rows */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-text/70 font-medium">
              <span>{t.pos.subtotal} ({totals.totalItemsCount} {t.pos.itemCount})</span>
              <span className="font-mono text-text font-bold">{formatMoney(totals.grossSubtotal)}</span>
            </div>

            {totals.itemDiscounts.amountInCents > 0 && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-medium">
                <span>{language === 'th' ? 'ส่วนลดรายการ' : 'Line Discounts'}</span>
                <span className="font-mono font-bold">-{formatMoney(totals.itemDiscounts)}</span>
              </div>
            )}

            {totals.orderDiscount.amountInCents > 0 && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-medium">
                <span>{language === 'th' ? 'ส่วนลดท้ายบิล' : 'Ticket Discount'} ({orderDiscountBps / 100}%)</span>
                <span className="font-mono font-bold">-{formatMoney(totals.orderDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-text/50 text-[11px]">
              <span>{t.pos.vatIncluded}</span>
              <span className="font-mono font-medium">{formatMoney(totals.totalTax)}</span>
            </div>

            {/* Prominent Grand Total Block */}
            <div className="pt-1.5 border-t border-border/80 flex items-baseline justify-between mt-0.5">
              <div>
                <span className="text-xs sm:text-sm font-black text-text uppercase tracking-wide">
                  {t.pos.total}
                </span>
                {secondaryTotals && (
                  <div className="text-[10px] text-text/50 font-medium">
                    ≈ {formatMoney(secondaryTotals.grandTotal)} ({activeSecondaryCurrency})
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="text-xl sm:text-2xl font-black font-mono text-primary tracking-tight">
                  {formatMoney(totals.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Part: Action Buttons & Primary Checkout CTA */}
        <div className="pt-2 space-y-1.5">
          {/* Secondary Quick Toolbar */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              disabled={!hasItems}
              onClick={() => {
                if (!hasItems) return;
                playScannerSound('click');
                setIsClearConfirmOpen(true);
              }}
              title={language === 'th' ? 'เริ่มขายใหม่ / ล้างตะกร้า' : 'New Sale (Clear)'}
              className={`min-h-[36px] h-9 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all theme-btn-radius active-scale ${
                hasItems
                  ? 'border-rose-200 dark:border-rose-950/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100/50 cursor-pointer'
                  : 'border-border/40 text-text/30 bg-card cursor-not-allowed opacity-50'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="truncate">{language === 'th' ? 'ล้างบิล' : 'Clear'}</span>
            </button>

            <button
              type="button"
              disabled={!hasItems}
              onClick={() => {
                if (!hasItems) return;
                playScannerSound('click');
                setIsParkModalOpen(true);
              }}
              title={t.pos.holdCart}
              className={`min-h-[36px] h-9 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all theme-btn-radius active-scale ${
                hasItems
                  ? 'border-border bg-background text-text hover:border-primary/50 cursor-pointer'
                  : 'border-border/40 text-text/30 bg-card cursor-not-allowed opacity-50'
              }`}
            >
              <PauseCircle className="h-3.5 w-3.5" />
              <span className="truncate">{language === 'th' ? 'พักบิล' : 'Park'}</span>
            </button>

            <button
              type="button"
              disabled={!hasItems}
              onClick={() => {
                if (!hasItems) return;
                playScannerSound('click');
                setIsReceiptPreviewOpen(true);
              }}
              title={language === 'th' ? 'ดูตัวอย่างใบเสร็จ' : 'Receipt Preview'}
              className={`min-h-[36px] h-9 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all theme-btn-radius active-scale ${
                hasItems
                  ? 'border-border bg-background text-text hover:border-primary/50 cursor-pointer'
                  : 'border-border/40 text-text/30 bg-card cursor-not-allowed opacity-50'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="truncate">{language === 'th' ? 'ใบเสร็จ' : 'Receipt'}</span>
            </button>
          </div>

          {/* Primary Checkout Button CTA */}
          <button
            type="button"
            disabled={!hasItems}
            onClick={() => {
              if (!hasItems) return;
              playScannerSound('click');
              setIsCheckoutModalOpen(true);
            }}
            className={`w-full min-h-[44px] h-11 sm:h-11.5 flex items-center justify-between px-4 rounded-xl font-bold text-sm tracking-wide shadow-sm transition-all theme-btn-radius active-scale ${
              hasItems
                ? 'bg-primary hover:bg-primary/95 text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
                : 'bg-border/60 text-text/40 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4.5 w-4.5" />
              <span>{t.pos.checkoutBtn}</span>
            </div>
            <span className="font-mono font-black text-base sm:text-lg">
              {formatMoney(totals.grandTotal)}
            </span>
          </button>
        </div>
      </div>

      {/* Modals & Dialogs */}
      <CustomerSelectModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        selectedCustomer={customer}
        onSelectCustomer={setCustomer}
      />

      <PaymentConfirmationModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onOrderCompleted={(ord: Order) => {
          console.info('[CartPanel] Order finished:', ord.orderNumber);
        }}
      />

      <CartReceiptPreviewModal
        isOpen={isReceiptPreviewOpen}
        onClose={() => setIsReceiptPreviewOpen(false)}
      />

      <DiscountModal
        isOpen={discountModalConfig?.isOpen || false}
        onClose={() => setDiscountModalConfig(null)}
        targetType={discountModalConfig?.targetType || 'cart'}
        targetName={discountModalConfig?.targetName || ''}
        currentDiscountBps={discountModalConfig?.currentBps || 0}
        basePriceCents={discountModalConfig?.basePriceCents || 0}
        currency={totals.grossSubtotal.currency}
        onApply={(bps) => {
          if (discountModalConfig?.targetType === 'item' && discountModalConfig.targetId) {
            setItemDiscount(discountModalConfig.targetId, bps);
          } else if (discountModalConfig?.targetType === 'cart') {
            setOrderDiscount(bps);
          }
        }}
      />

      <ParkCartModal
        isOpen={isParkModalOpen}
        onClose={() => setIsParkModalOpen(false)}
        onConfirm={holdCurrentCart}
        defaultLabel={customer ? customer.name : ''}
      />

      <HoldOrdersModal
        isOpen={isHoldModalOpen}
        onClose={() => setIsHoldModalOpen(false)}
      />

      <Modal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        title={language === 'th' ? 'ยืนยันการเริ่มขายใหม่ / ล้างตะกร้า' : 'Confirm New Sale / Clear Cart'}
        description={
          language === 'th'
            ? `คุณมีรายการสินค้าอยู่ ${items.length} รายการในตะกร้า คุณแน่ใจหรือไม่ว่าต้องการเริ่มการขายใหม่และล้างตะกร้าใบนี้? ข้อมูลรายการปัจจุบันจะสูญหาย`
            : `You currently have ${items.length} items in your cart. Are you sure you want to clear this cart and start a new sale? Current progress will be lost.`
        }
        maxWidth="md"
        footer={
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
            <Button
              variant="danger"
              className="w-full sm:flex-1 rounded-lg order-1 sm:order-2 theme-btn-radius active-scale"
              onClick={() => {
                playScannerSound('warning');
                clearCart();
                setIsClearConfirmOpen(false);
              }}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              {language === 'th' ? 'ใช่, เริ่มขายใหม่ (ล้างตะกร้า)' : 'Yes, Clear & Start New'}
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto rounded-lg border-crisp border-border order-2 sm:order-1 theme-btn-radius active-scale"
              onClick={() => setIsClearConfirmOpen(false)}
            >
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text/70 leading-relaxed">
            {language === 'th'
              ? 'การดำเนินการนี้จะทำการรีเซ็ตตะกร้าเป็นค่าว่าง และล้างสมาชิกลูกค้าที่ผูกไว้ เพื่อให้คุณสามารถเริ่มให้บริการบิลใหม่ได้ทันที'
              : 'This action will completely empty the cart and detach any customer loyalty accounts, allowing you to scan fresh items immediately.'}
          </p>
        </div>
      </Modal>
    </div>
  );
};

