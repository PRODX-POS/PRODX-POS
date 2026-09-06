import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { playScannerSound } from '../../services/soundService';
import { CartLineItem } from './CartLineItem';
import { CustomerSelectModal } from './CustomerSelectModal';
import { CheckoutModal } from './CheckoutModal';
import { Button } from '../../components/common/Button';
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
    <div className="h-full flex flex-col bg-card border-l border-border border-crisp select-none">
      {/* Top Customer Attach Header */}
      <div className="p-3 sm:p-4 border-b border-border border-crisp flex items-center justify-between gap-2 shrink-0 bg-card">
        <button
          type="button"
          onClick={() => {
            playScannerSound('click');
            setIsCustomerModalOpen(true);
          }}
          className={`min-h-[44px] flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border-crisp border text-xs font-bold transition-colors cursor-pointer text-left truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            customer
              ? 'border-border bg-background text-text shadow-2xs'
              : 'border-border hover:border-primary/50 text-text/70 bg-card'
          }`}
        >
          {customer ? (
            <>
              <UserCheck className="h-4.5 w-4.5 shrink-0 text-primary" />
              <span className="truncate">{customer.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-card border border-border text-text font-bold shrink-0">
                {customer.loyaltyPoints} {language === 'th' ? 'คะแนน' : 'pts'}
              </span>
            </>
          ) : (
            <>
              <UserPlus className="h-4.5 w-4.5 shrink-0 opacity-70" />
              <span className="truncate">{language === 'th' ? 'เลือกลูกค้า / สะสมคะแนน' : 'Add Customer / Loyalty'}</span>
            </>
          )}
        </button>

        {hasItems && (
          <button
            type="button"
            onClick={() => {
              playScannerSound('click');
              setIsClearConfirmOpen(true);
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-transparent hover:border-rose-200 dark:hover:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-text/50 hover:text-rose-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 active:scale-95"
            title={t.pos.clearCart}
            aria-label={t.pos.clearCart}
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar bg-background">
        {!hasItems ? (
          <div className="h-full flex flex-col justify-center items-center">
            <EmptyState
              icon={<ShoppingCart className="h-6 w-6 text-text/30" />}
              title={t.pos.emptyCart}
              description={t.pos.emptyCartDesc}
              className="border-none bg-transparent pb-4"
            />
            {heldCarts.length > 0 && (
              <Button
                variant="outline"
                className="mt-2 text-xs font-bold border-border border-crisp rounded-lg"
                onClick={() => setIsHoldModalOpen(true)}
              >
                {language === 'th' ? `เรียกคืนบิลที่พักไว้ (${heldCarts.length})` : `Retrieve Parked Orders (${heldCarts.length})`}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-0">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.lineId}
                  initial={{ opacity: 0, x: 15, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: -15, height: 0 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  className="overflow-hidden"
                >
                  <div className="pb-2">
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
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Cart Summary & Actions Footer */}
      {hasItems && (
        <div className="p-4 border-t border-border border-crisp bg-card shrink-0 space-y-3 shadow-2xs">
          {/* Order Level Discount Selector */}
          <div className="relative">
            <div className="flex items-center justify-between text-xs text-text/70">
              <span className="flex items-center gap-1.5 font-bold">
                <Percent className="h-3.5 w-3.5 opacity-70" />
                <span>{language === 'th' ? 'ส่วนลดท้ายบิล:' : 'Ticket Discount:'}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setDiscountModalConfig({
                    isOpen: true,
                    targetType: 'cart',
                    targetName: language === 'th' ? 'ส่วนลดท้ายบิล' : 'Ticket Discount',
                    currentBps: orderDiscountBps,
                    // Cart discount applies to gross - item discounts
                    basePriceCents: totals.grossSubtotal.amountInCents - totals.itemDiscounts.amountInCents,
                  });
                }}
                className="min-h-[36px] px-2.5 py-1 rounded-lg font-bold text-primary flex items-center gap-1 hover:bg-background transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>
                  {orderDiscountBps > 0 ? (
                    <>
                      <span className="font-mono">{orderDiscountBps / 100}%</span>{' '}
                      {language === 'th' ? 'ใช้แล้ว' : 'Applied'}
                    </>
                  ) : (
                    language === 'th' ? 'เพิ่มส่วนลด' : 'Add Discount'
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Breakdown Lines */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-text/70 font-medium">
              <span>{t.pos.subtotal} (<span className="font-mono">{totals.totalItemsCount}</span> {t.pos.itemCount})</span>
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
                <span>{language === 'th' ? 'ส่วนลดท้ายบิล' : 'Ticket Discount'} (<span className="font-mono">{orderDiscountBps / 100}%</span>)</span>
                <span className="font-mono font-bold">-{formatMoney(totals.orderDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-text/70 font-medium">
              <span>{t.pos.vatIncluded}</span>
              <span className="font-mono text-text font-bold">{formatMoney(totals.totalTax)}</span>
            </div>

            <div className="pt-3 border-t border-border border-crisp flex flex-col gap-1 mt-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-text uppercase tracking-wider">
                  {t.pos.total}
                </span>
                <span className="text-2xl font-bold font-mono text-primary tracking-tight">
                  {formatMoney(totals.grandTotal)}
                </span>
              </div>
              {secondaryTotals && (
                <div className="flex justify-between items-center text-[11px] text-text/70 mt-1 font-medium">
                  <span>{language === 'th' ? `มูลค่าเทียบเท่า (${activeSecondaryCurrency})` : `Estimate (${activeSecondaryCurrency})`}</span>
                  <span className="font-mono text-text font-bold">
                    {formatMoney(secondaryTotals.grandTotal)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Checkout & Park Ticket Actions */}
          <div className="pt-2 flex flex-col gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                playScannerSound('click');
                setIsClearConfirmOpen(true);
              }}
              className="w-full text-xs font-bold border-rose-200 dark:border-rose-950/60 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg h-11 min-h-[44px]"
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              {language === 'th' ? 'เริ่มขายใหม่ (ล้างตะกร้า)' : 'New Sale (Clear Cart)'}
            </Button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playScannerSound('click');
                  setIsParkModalOpen(true);
                }}
                title={t.pos.holdCart}
                className="min-h-[52px] min-w-[52px] h-[52px] w-[52px] flex items-center justify-center rounded-lg border-crisp border border-border bg-card text-text hover:bg-background active:scale-95 transition-all cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <PauseCircle className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  playScannerSound('click');
                  setIsReceiptPreviewOpen(true);
                }}
                title={language === 'th' ? 'ดูตัวอย่างใบเสร็จดิจิทัล' : 'Digital Receipt Preview'}
                className="min-h-[52px] min-w-[52px] h-[52px] w-[52px] flex items-center justify-center rounded-lg border-crisp border border-border bg-card text-text hover:bg-background active:scale-95 transition-all cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Eye className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  playScannerSound('click');
                  setIsCheckoutModalOpen(true);
                }}
                className="flex-1 min-h-[52px] h-[52px] flex items-center justify-center gap-2 rounded-lg bg-primary hover:opacity-90 active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-2xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <CreditCard className="h-5 w-5" />
                <span>{t.pos.checkoutBtn}</span>
                <span className="font-mono font-black">{formatMoney(totals.grandTotal)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CustomerSelectModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        selectedCustomer={customer}
        onSelectCustomer={setCustomer}
      />

      <CheckoutModal
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
              className="w-full sm:flex-1 rounded-lg order-1 sm:order-2"
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
              className="w-full sm:w-auto rounded-lg border-crisp border-border order-2 sm:order-1"
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
