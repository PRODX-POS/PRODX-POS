import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useOffline } from '../../context/OfflineContext';
import { useReceiptPrinter } from '../../context/ReceiptPrinterContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ReceiptPrintModal } from '../../components/receipt/ReceiptPrintModal';
import { FullTaxInvoiceModal } from '../../components/receipt/FullTaxInvoiceModal';
import { playScannerSound } from '../../services/soundService';
import { QuickCashCalculator } from './QuickCashCalculator';
import { customerDisplayService } from '../../services/customerDisplayChannel';
import {
  PaymentMethod,
  TenderPayment,
  Order,
  TransactionStatus,
} from '../../domain/order';
import {
  Money,
  createMoney,
  addMoney,
  subtractMoney,
  formatMoney,
  fromDecimal,
} from '../../domain/money';
import { orderApi } from '../../adapters/mockAdapter';
import { useLanguage } from '../../context/LanguageContext';
import {
  Banknote,
  CreditCard,
  QrCode,
  CheckCircle2,
  Printer,
  RotateCcw,
  WifiOff,
  ShieldCheck,
  Receipt,
  Eye,
  Sliders,
  Split,
  Plus,
  Trash2,
  Check,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderCompleted,
}) => {
  const { session } = useAuth();
  const {
    items,
    totals,
    customer,
    notes,
    clearCart,
    stagedPayments,
    totalTenderedAmount,
    remainingBalanceDue,
    changeDue,
    isFullyTendered,
    addPaymentTender,
    removePaymentTender,
    clearPaymentTenders,
  } = useCart();
  const { isOnline, queueOutboxItem } = useOffline();
  const {
    activeTemplate,
    printerConfig,
    printReceipt,
    kickCashDrawer,
    isPrinting,
  } = useReceiptPrinter();
  const { addToast } = useToast();
  const { t, language } = useLanguage();

  const [isSplitMode, setIsSplitMode] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [singleCashTenderedCents, setSingleCashTenderedCents] = useState<number>(totals.grandTotal.amountInCents);
  const [splitTenderAmountCents, setSplitTenderAmountCents] = useState<number>(totals.grandTotal.amountInCents);
  const [splitCashGivenCents, setSplitCashGivenCents] = useState<number>(totals.grandTotal.amountInCents);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isFullTaxModalOpen, setIsFullTaxModalOpen] = useState(false);

  // Broadcast payment state to Customer-Facing Display
  useEffect(() => {
    if (!isOpen) return;

    if (completedOrder) {
      customerDisplayService.publish({
        status: 'completed',
        storeName: session.currentStore.name,
        items,
        totals,
        customer: customer || undefined,
        completedOrder,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      customerDisplayService.publish({
        status: method === 'qr_digital' ? 'payment_promptpay' : method === 'cash' ? 'payment_cash' : 'payment_card',
        storeName: session.currentStore.name,
        items,
        totals,
        customer: customer || undefined,
        activePayment: {
          method,
          amountDueCents: totals.grandTotal.amountInCents,
          currency: totals.grandTotal.currency,
          tenderedCents: method === 'cash' ? singleCashTenderedCents : undefined,
          changeCents: method === 'cash' ? Math.max(0, singleCashTenderedCents - totals.grandTotal.amountInCents) : undefined,
        },
        lastUpdated: new Date().toISOString(),
      });
    }
  }, [isOpen, method, singleCashTenderedCents, completedOrder, totals, items, customer, session.currentStore.name]);

  // Sync default amounts when modal opens or grandTotal changes
  useEffect(() => {
    if (isOpen) {
      setSingleCashTenderedCents(totals.grandTotal.amountInCents);
      setSplitTenderAmountCents(remainingBalanceDue.amountInCents > 0 ? remainingBalanceDue.amountInCents : totals.grandTotal.amountInCents);
      setSplitCashGivenCents(remainingBalanceDue.amountInCents > 0 ? remainingBalanceDue.amountInCents : totals.grandTotal.amountInCents);
    }
  }, [isOpen, totals.grandTotal.amountInCents]);

  // Keep split input updated with remaining balance when staging changes
  useEffect(() => {
    if (remainingBalanceDue.amountInCents > 0) {
      setSplitTenderAmountCents(remainingBalanceDue.amountInCents);
      setSplitCashGivenCents(remainingBalanceDue.amountInCents);
    }
  }, [remainingBalanceDue.amountInCents]);

  if (!session) return null;

  const grandTotal = totals.grandTotal;
  const currency = grandTotal.currency;

  // Single-tender mode calculations
  const singleCashTenderedMoney = createMoney(singleCashTenderedCents, currency);
  const singleChangeDueMoney =
    singleCashTenderedCents >= grandTotal.amountInCents
      ? subtractMoney(singleCashTenderedMoney, grandTotal)
      : createMoney(0, currency);

  const isSingleTenderSufficient =
    method !== 'cash' || singleCashTenderedCents >= grandTotal.amountInCents;

  const handleAddSplitTender = () => {
    if (splitTenderAmountCents <= 0) return;

    // Tender amount to apply to bill cannot exceed remaining balance
    const appliedAmountCents = Math.min(splitTenderAmountCents, remainingBalanceDue.amountInCents);
    const appliedMoney = createMoney(appliedAmountCents, currency);

    if (method === 'cash') {
      const cashGivenCents = Math.max(splitCashGivenCents, appliedAmountCents);
      const cashGivenMoney = createMoney(cashGivenCents, currency);
      const changeGivenCents = cashGivenCents - appliedAmountCents;
      const changeGivenMoney = createMoney(changeGivenCents, currency);

      addPaymentTender({
        method: 'cash',
        amount: appliedMoney,
        tenderedCash: cashGivenMoney,
        changeGiven: changeGivenCents > 0 ? changeGivenMoney : undefined,
      });
    } else if (method === 'card') {
      addPaymentTender({
        method: 'card',
        amount: appliedMoney,
        authCode: `AUTH-${Math.floor(100000 + Math.random() * 900000)}`,
        cardLastFour: '4242',
        terminalReference: 'TRM-VERIFONE-01',
      });
    } else {
      addPaymentTender({
        method: 'qr_digital',
        amount: appliedMoney,
        authCode: `QR-${Date.now().toString().slice(-6)}`,
        terminalReference: 'PROMPTPAY-GATEWAY',
      });
    }

    addToast({
      title: language === 'th' ? 'บันทึกช่องทางชำระแล้ว' : 'Tender Added',
      message: `${method.toUpperCase()} ${formatMoney(appliedMoney)} ${language === 'th' ? 'ถูกเพิ่มในรายการชำระ' : 'added to split payment'}`,
      type: 'info',
    });
  };

  const handleQuickCash = (amountCents: number) => {
    if (isSplitMode) {
      setSplitCashGivenCents(amountCents);
    } else {
      setSingleCashTenderedCents(amountCents);
    }
  };

  const handleConfirmPayment = async () => {
    let finalPayments: TenderPayment[] = [];

    if (isSplitMode || stagedPayments.length > 0) {
      if (!isFullyTendered || stagedPayments.length === 0 || isProcessing) return;
      finalPayments = [...stagedPayments];
    } else {
      if (!isSingleTenderSufficient || isProcessing) return;
      const singleTender: TenderPayment = {
        id: `tnd-${Date.now()}`,
        method,
        amount: grandTotal,
        tenderedCash: method === 'cash' ? singleCashTenderedMoney : undefined,
        changeGiven: method === 'cash' ? singleChangeDueMoney : undefined,
        authCode: method === 'card' ? `AUTH-${Math.floor(100000 + Math.random() * 900000)}` : method === 'qr_digital' ? `QR-${Date.now().toString().slice(-6)}` : undefined,
        cardLastFour: method === 'card' ? '4242' : undefined,
        terminalReference: method === 'card' ? 'TRM-VERIFONE-01' : method === 'qr_digital' ? 'PROMPTPAY-GATEWAY' : undefined,
        timestamp: new Date().toISOString(),
      };
      finalPayments = [singleTender];
    }

    setIsProcessing(true);
    const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const checkoutPayload = {
      idempotencyKey,
      storeId: session.currentStore.id,
      registerId: session.registerId,
      cashierId: session.currentUser.id,
      customer: customer ? {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      } : undefined,
      items,
      totals,
      payments: finalPayments,
      notes,
      isOfflineSubmission: !isOnline,
    };

    try {
      if (!isOnline) {
        // Queue in offline outbox.
        queueOutboxItem('order_transaction', idempotencyKey, checkoutPayload);

        const localOfflineOrder: Order = {
          id: `ord-offline-${Date.now()}`,
          orderNumber: `ORD-OFFLINE-${Date.now().toString().slice(-5)}`,
          idempotencyKey,
          storeId: session.currentStore.id,
          registerId: session.registerId,
          cashierId: session.currentUser.id,
          cashierName: session.currentUser.name,
          customer: customer || undefined,
          items,
          totals,
          payments: finalPayments,
          status: 'pending_sync_offline',
          createdAt: new Date().toISOString(),
          notes,
        };

        setCompletedOrder(localOfflineOrder);
        onOrderCompleted(localOfflineOrder);
        clearPaymentTenders();
        playScannerSound('payment_success');

        // Dispatch state refresh custom event
        window.dispatchEvent(new CustomEvent('prodx:order-completed', { detail: localOfflineOrder }));

        // Auto kick cash drawer if payment tender includes cash
        if (finalPayments.some((p) => p.method === 'cash')) {
          kickCashDrawer();
        }

        if (printerConfig.autoPrintOnCheckout) {
          printReceipt(localOfflineOrder).then((printRes) => {
            if (printRes.success) {
              addToast({
                title: language === 'th' ? 'พิมพ์ใบเสร็จอัตโนมัติสำเร็จ' : 'Auto-Print Success',
                message: language === 'th' ? `พิมพ์ใบเสร็จ #${localOfflineOrder.orderNumber} เรียบร้อยแล้ว` : `Receipt #${localOfflineOrder.orderNumber} auto-printed successfully.`,
                type: 'success',
              });
            } else {
              addToast({
                title: language === 'th' ? 'พิมพ์ใบเสร็จอัตโนมัติไม่สำเร็จ' : 'Auto-Print Failed',
                message: printRes.message,
                type: 'warning',
              });
            }
          });
        }
        addToast({
          title: language === 'th' ? 'บันทึกคำสั่งซื้อออฟไลน์แล้ว' : 'Offline Order Queued',
          message: language === 'th' ? 'บันทึกใน Outbox บนเครื่องแล้ว ระบบจะซิงก์ให้อัตโนมัติเมื่อต่ออินเทอร์เน็ต' : 'Saved to local outbox. Will sync automatically when connection restores.',
          type: 'warning',
        });
      } else {
        // Live server checkout
        const response = await orderApi.createOrder(checkoutPayload);
        setCompletedOrder(response.order);
        onOrderCompleted(response.order);
        clearPaymentTenders();
        playScannerSound('payment_success');

        // Dispatch state refresh custom event
        window.dispatchEvent(new CustomEvent('prodx:order-completed', { detail: response.order }));

        // Auto kick cash drawer if payment tender includes cash
        if (finalPayments.some((p) => p.method === 'cash')) {
          kickCashDrawer();
        }

        if (printerConfig.autoPrintOnCheckout) {
          printReceipt(response.order).then((printRes) => {
            if (printRes.success) {
              addToast({
                title: language === 'th' ? 'พิมพ์ใบเสร็จอัตโนมัติสำเร็จ' : 'Auto-Print Success',
                message: language === 'th' ? `พิมพ์ใบเสร็จ #${response.order.orderNumber} เรียบร้อยแล้ว` : `Receipt #${response.order.orderNumber} auto-printed successfully.`,
                type: 'success',
              });
            } else {
              addToast({
                title: language === 'th' ? 'พิมพ์ใบเสร็จอัตโนมัติไม่สำเร็จ' : 'Auto-Print Failed',
                message: printRes.message,
                type: 'warning',
              });
            }
          });
        }
        addToast({
          title: language === 'th' ? 'ชำระเงินและบันทึกข้อมูลสำเร็จ' : 'Payment Authorized & Committed',
          message: language === 'th' ? `คำสั่งซื้อ #${response.order.orderNumber} ยืนยันจากเซิร์ฟเวอร์เรียบร้อย` : `Order #${response.order.orderNumber} confirmed by authoritative server.`,
          type: 'success',
        });
      }
    } catch (err: any) {
      addToast({
        title: language === 'th' ? 'การชำระเงินล้มเหลว' : 'Payment Failed',
        message: err?.message || (language === 'th' ? 'เกิดข้อผิดพลาดในการอนุมัติรายการ' : 'Transaction authorization error.'),
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextSale = () => {
    setCompletedOrder(null);
    clearCart();
    setIsSplitMode(false);
    onClose();
  };

  const handlePrintReceiptDirect = () => {
    if (completedOrder) {
      printReceipt(completedOrder);
    }
  };

  const modalFooter = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full">
      <Button
        variant="primary"
        size="lg"
        className="w-full sm:flex-1 rounded-lg text-xs sm:text-sm md:text-base px-2 sm:px-4 order-1 sm:order-2"
        disabled={
          isProcessing ||
          (isSplitMode ? !isFullyTendered : !isSingleTenderSufficient)
        }
        isLoading={isProcessing}
        onClick={handleConfirmPayment}
        leftIcon={<ShieldCheck className="h-5 w-5 shrink-0" />}
      >
        {isSplitMode ? (
          language === 'th' ? (
            <>
              ยืนยันการแบ่งชำระ (<span className="font-mono">{formatMoney(grandTotal)}</span>)
            </>
          ) : (
            <>
              Complete Split Order (<span className="font-mono">{formatMoney(grandTotal)}</span>)
            </>
          )
        ) : method === 'cash' ? (
          language === 'th' ? (
            <>
              ยืนยันรับเงิน (<span className="font-mono">{formatMoney(grandTotal)}</span>)
            </>
          ) : (
            <>
              Complete Sale (<span className="font-mono">{formatMoney(grandTotal)}</span>)
            </>
          )
        ) : language === 'th' ? (
          'อนุมัติการชำระเงิน'
        ) : (
          'Authorize Tender'
        )}
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={onClose}
        disabled={isProcessing}
        className="w-full sm:w-auto rounded-lg border-crisp border-border order-2 sm:order-1"
      >
        {t.common.cancel}
      </Button>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        fullScreenOnMobile={true}
        onClose={completedOrder ? handleNextSale : onClose}
        title={completedOrder ? (language === 'th' ? 'ใบเสร็จรับเงิน & ยืนยันคำสั่งซื้อ' : 'Receipt & Confirmation') : t.checkout.title}
        description={
          completedOrder
            ? `${language === 'th' ? 'สถานะรายการ' : 'Transaction status'}: ${completedOrder.status.replace('_', ' ').toUpperCase()}`
            : `${language === 'th' ? 'เลือกช่องทางชำระเงินสำหรับยอดรวม' : 'Select payment tender for ticket totaling'} ${formatMoney(grandTotal)}`
        }
        maxWidth="lg"
        footer={completedOrder ? undefined : modalFooter}
      >
        {completedOrder ? (
          /* Order Complete View */
          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg border-crisp border text-center shadow-2xs ${
                completedOrder.status === 'server_confirmed'
                  ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100'
                  : 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100'
              }`}
            >
              <div className="flex justify-center mb-2">
                {completedOrder.status === 'server_confirmed' ? (
                  <CheckCircle2 className="h-12 w-10 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <WifiOff className="h-12 w-10 text-amber-600 dark:text-amber-400 animate-pulse" />
                )}
              </div>
              <h4 className="text-base font-bold">
                {completedOrder.status === 'server_confirmed'
                  ? (language === 'th' ? 'ชำระเงินสำเร็จ & บันทึกเข้าระบบแล้ว' : 'Payment Authorized & Server-Committed')
                  : (language === 'th' ? 'บันทึกบิลออฟไลน์ใน Outbox รอซิงก์' : 'Offline Ticket Queued in Outbox')}
              </h4>
              <p className="text-xs mt-1 text-text/70">
                {completedOrder.status === 'server_confirmed'
                  ? `${t.orders.orderNumber}: ${completedOrder.orderNumber}`
                  : (language === 'th' ? 'กำลังรอการเชื่อมต่ออินเทอร์เน็ตเพื่อซิงก์ข้อมูลขึ้นเซิร์ฟเวอร์' : 'Awaiting network restoration for authoritative server commitment.')}
              </p>
            </div>

            {/* Thermal Printer Status Ribbon */}
            <div className="p-3 rounded-lg bg-card border-crisp border border-border flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-text/70" />
                <span className="font-semibold text-text">
                  {activeTemplate.name} ({activeTemplate.paperWidth})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(true)}
                className="text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{language === 'th' ? 'ดูตัวอย่าง / พิมพ์ซ้ำ' : 'Preview / Options'}</span>
              </button>
            </div>

            {/* Receipt Summary Card with Multi-Tender Breakdown */}
            <div className="p-4 rounded-lg border-crisp border border-border bg-card font-mono text-xs space-y-2 shadow-2xs">
              <div className="flex justify-between text-text/70 border-b border-border border-crisp pb-2">
                <span>{activeTemplate.branding.storeName || session.currentStore.name}</span>
                <span>{new Date(completedOrder.createdAt).toLocaleTimeString()}</span>
              </div>

              <div className="space-y-1 py-1 text-text">
                {completedOrder.items.map((i) => (
                  <div key={i.lineId} className="flex justify-between">
                    <span className="truncate max-w-[240px]">
                      {i.quantity}x {i.product.name}
                    </span>
                    <span>{formatMoney(i.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border border-crisp pt-2 space-y-1">
                <div className="flex justify-between text-text/70">
                  <span>{t.pos.subtotal}</span>
                  <span>{formatMoney(completedOrder.totals.netSubtotal)}</span>
                </div>
                <div className="flex justify-between text-text/70">
                  <span>{language === 'th' ? 'ภาษีมูลค่าเพิ่ม' : 'Tax'}</span>
                  <span>{formatMoney(completedOrder.totals.totalTax)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-text pt-1">
                  <span>{t.checkout.totalDue}</span>
                  <span>{formatMoney(completedOrder.totals.grandTotal)}</span>
                </div>
              </div>

              {/* Payments Tender Breakdown */}
              <div className="border-t border-dashed border-border pt-2 space-y-1">
                <div className="text-[11px] font-semibold text-text/70 uppercase tracking-wider">
                  {language === 'th' ? 'รายการชำระเงิน' : 'Tender Payments'}
                </div>
                {completedOrder.payments.map((p, idx) => (
                  <div key={p.id || idx} className="flex justify-between items-center text-text">
                    <span className="flex items-center gap-1.5 font-sans font-medium">
                      {p.method === 'cash' ? <Banknote className="h-3.5 w-3.5 text-emerald-500" /> : p.method === 'card' ? <CreditCard className="h-3.5 w-3.5 text-blue-500" /> : <QrCode className="h-3.5 w-3.5 text-purple-500" />}
                      <span>
                        {p.method === 'cash' ? t.checkout.cash : p.method === 'card' ? `${t.checkout.card} (···· ${p.cardLastFour || '4242'})` : t.checkout.promptpay}
                      </span>
                    </span>
                    <span className="font-bold">{formatMoney(p.amount)}</span>
                  </div>
                ))}

                {completedOrder.payments.some((p) => p.changeGiven && p.changeGiven.amountInCents > 0) && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold pt-1 border-t border-border border-crisp">
                    <span>{t.checkout.changeDue}</span>
                    <span>
                      {formatMoney(
                        createMoney(
                          completedOrder.payments.reduce((acc, p) => acc + (p.changeGiven?.amountInCents || 0), 0),
                          currency
                        )
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                className="w-full sm:flex-1 text-xs rounded-lg border-crisp border-border"
                leftIcon={<FileText className="h-4 w-4 text-primary" />}
                onClick={() => setIsFullTaxModalOpen(true)}
              >
                {language === 'th' ? 'ออกใบกำกับภาษีเต็มรูป' : 'Full Tax Invoice (A4)'}
              </Button>
              <Button
                variant="outline"
                size="md"
                className="w-full sm:flex-1 text-xs rounded-lg border-crisp border-border"
                leftIcon={<Printer className="h-4 w-4" />}
                onClick={handlePrintReceiptDirect}
                isLoading={isPrinting}
              >
                {language === 'th' ? 'พิมพ์ใบเสร็จ' : 'Print Slip'}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full sm:flex-1 text-xs rounded-lg"
                leftIcon={<RotateCcw className="h-4 w-4" />}
                onClick={handleNextSale}
              >
                {t.checkout.newSale}
              </Button>
            </div>
          </div>
        ) : (
          /* Payment Selection View */
          <div className="space-y-4">
            {/* Mode Selector Tabs: Full Payment vs Split Payment */}
            <div className="flex items-center justify-between p-1 bg-background rounded-lg border-crisp border border-border">
              <button
                type="button"
                onClick={() => {
                  setIsSplitMode(false);
                }}
                className={`flex-1 min-h-[48px] py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  !isSplitMode
                    ? 'bg-card text-text border-crisp border border-border shadow-2xs'
                    : 'text-text/70 hover:text-text transparent border border-transparent'
                }`}
              >
                <Banknote className="h-3.5 w-3.5" />
                <span>{language === 'th' ? 'ชำระเต็มจำนวน' : 'Single Tender'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSplitMode(true);
                }}
                className={`flex-1 min-h-[48px] py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isSplitMode
                    ? 'bg-primary text-white border-crisp border border-primary shadow-2xs'
                    : 'text-text/70 hover:text-text transparent border border-transparent'
                }`}
              >
                <Split className="h-3.5 w-3.5" />
                <span>{language === 'th' ? 'แบ่งชำระหลายช่องทาง (Split)' : 'Split Payment (Multi-Tender)'}</span>
                {stagedPayments.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                    {stagedPayments.length}
                  </span>
                )}
              </button>
            </div>

            {/* Amount Due & Split Summary Card */}
            <div className="p-4 rounded-lg bg-card border-crisp border border-border space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-text/70 uppercase tracking-wide">
                    {t.checkout.totalDue}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-text font-mono">
                    {formatMoney(grandTotal)}
                  </div>
                </div>

                {customer && (
                  <div className="text-right">
                    <Badge variant="primary" size="sm">
                      {customer.name}
                    </Badge>
                    <div className="text-[11px] text-text/50 mt-1">
                      {language === 'th' ? 'สมาชิกลูกค้า' : 'Loyalty Account Attached'}
                    </div>
                  </div>
                )}
              </div>

              {/* In Split Mode: Show Live Financial Balance Breakdown */}
              {isSplitMode && (
                <div className="pt-3 border-t border-border border-crisp grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded-lg bg-background border-crisp border border-border shadow-2xs">
                    <div className="text-[10px] text-text/70 font-sans font-medium uppercase">{language === 'th' ? 'จ่ายแล้ว' : 'Tendered'}</div>
                    <div className="font-bold text-text mt-0.5">{formatMoney(totalTenderedAmount)}</div>
                  </div>
                  <div className={`p-2 rounded-lg border-crisp border shadow-2xs ${
                    remainingBalanceDue.amountInCents === 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  }`}>
                    <div className="text-[10px] font-sans font-medium uppercase">{language === 'th' ? 'ยอดคงเหลือ' : 'Remaining Due'}</div>
                    <div className="font-black mt-0.5">{formatMoney(remainingBalanceDue)}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-background border-crisp border border-border shadow-2xs">
                    <div className="text-[10px] text-text/70 font-sans font-medium uppercase">{t.checkout.changeDue}</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatMoney(changeDue)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* If in Split Mode: List Staged Payments */}
            {isSplitMode && stagedPayments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-text/70">
                  <span>{language === 'th' ? 'รายการชำระเงินที่บันทึกแล้ว:' : 'Staged Payment Tenders:'}</span>
                  <button
                    type="button"
                    onClick={clearPaymentTenders}
                    className="text-rose-500 hover:text-rose-600 text-[11px] font-normal hover:underline cursor-pointer"
                  >
                    {language === 'th' ? 'ล้างทั้งหมด' : 'Clear All'}
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {stagedPayments.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="p-2.5 rounded-lg border-crisp border border-border bg-card flex items-center justify-between text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-background border-crisp border border-border">
                          {p.method === 'cash' ? (
                            <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : p.method === 'card' ? (
                            <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <QrCode className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-text">
                            {p.method === 'cash' ? t.checkout.cash : p.method === 'card' ? `${t.checkout.card} (···· ${p.cardLastFour || '4242'})` : t.checkout.promptpay}
                          </div>
                          {p.tenderedCash && (
                            <div className="text-[10px] text-text/70">
                              {language === 'th' ? 'รับเงินมา' : 'Tendered'}: <span className="font-mono font-medium">{formatMoney(p.tenderedCash)}</span>{' '}
                              {p.changeGiven && (
                                <>
                                  ({language === 'th' ? 'ทอน' : 'Change'}: <span className="font-mono font-medium">{formatMoney(p.changeGiven)}</span>)
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-sm text-text">
                          {formatMoney(p.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePaymentTender(p.id)}
                          className="p-1 rounded-lg text-text/40 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Remove Tender"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Split Mode - Add Next Tender Section OR Single Tender Controls */}
            {isSplitMode && remainingBalanceDue.amountInCents > 0 ? (
              /* Add Next Split Tender Box */
              <div className="p-4 rounded-lg border-crisp border border-border bg-card space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-text flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-text/70" />
                    <span>{language === 'th' ? 'เพิ่มช่องทางชำระสำหรับยอดที่เหลือ' : 'Add Tender for Remaining Balance'}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-text">
                    {formatMoney(remainingBalanceDue)} {language === 'th' ? 'คงเหลือ' : 'due'}
                  </span>
                </div>

                {/* Method Picker for Next Tender */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: t.checkout.cash, icon: <Banknote className="h-5 w-5" /> },
                    { id: 'card', label: t.checkout.card, icon: <CreditCard className="h-5 w-5" /> },
                    { id: 'qr_digital', label: t.checkout.promptpay, icon: <QrCode className="h-5 w-5" /> },
                  ].map((methodItem) => (
                    <button
                      key={methodItem.id}
                      type="button"
                      onClick={() => setMethod(methodItem.id as PaymentMethod)}
                      className={`min-h-[52px] p-2 rounded-lg border-crisp border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        method === methodItem.id
                          ? 'border-primary bg-primary text-white font-bold'
                          : 'border-border bg-card text-text/70 hover:bg-background hover:border-primary/50'
                      }`}
                    >
                      {methodItem.icon}
                      <span className="text-[11px] font-semibold">{methodItem.label}</span>
                    </button>
                  ))}
                </div>

                {/* Amount to apply to this split tender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-text/70 mb-1">
                      {language === 'th' ? 'ยอดที่ต้องการตัดชำระ' : 'Amount to Charge'} ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      max={(remainingBalanceDue.amountInCents / 100).toFixed(2)}
                      value={(splitTenderAmountCents / 100).toFixed(2)}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        const cents = isNaN(parsed) ? 0 : Math.round(parsed * 100);
                        setSplitTenderAmountCents(Math.min(cents, remainingBalanceDue.amountInCents));
                        if (cents > splitCashGivenCents) {
                          setSplitCashGivenCents(cents);
                        }
                      }}
                      className="w-full min-h-[48px] h-11 rounded-lg border-crisp border border-border bg-card text-lg font-black font-mono px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors shadow-2xs"
                    />
                  </div>

                  {method === 'cash' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-text/70 mb-1">
                        {language === 'th' ? 'เงินสดที่รับมาจริง' : 'Actual Cash Given'} ({currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={(splitCashGivenCents / 100).toFixed(2)}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const parsed = parseFloat(e.target.value);
                          setSplitCashGivenCents(isNaN(parsed) ? 0 : Math.round(parsed * 100));
                        }}
                        className="w-full min-h-[48px] h-11 rounded-lg border-crisp border border-border bg-card text-lg font-black font-mono px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors shadow-2xs"
                      />
                    </div>
                  )}
                </div>

                {/* Cash Quick Presets for Split */}
                {method === 'cash' && (
                  <QuickCashCalculator
                    totalDueCents={splitTenderAmountCents}
                    currency={grandTotal.currency}
                    tenderedCents={splitCashGivenCents}
                    onTenderedChange={(cents) => setSplitCashGivenCents(cents)}
                  />
                )}

                {/* Add Tender Button */}
                <Button
                  variant="primary"
                  size="md"
                  className="w-full rounded-lg"
                  onClick={handleAddSplitTender}
                  disabled={splitTenderAmountCents <= 0 || (method === 'cash' && splitCashGivenCents < splitTenderAmountCents)}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  {language === 'th' ? (
                    <>
                      เพิ่มยอดชำระนี้ (<span className="font-mono">{formatMoney(createMoney(splitTenderAmountCents, currency))}</span>)
                    </>
                  ) : (
                    <>
                      Add Tender (<span className="font-mono">{formatMoney(createMoney(splitTenderAmountCents, currency))}</span> {method.toUpperCase()})
                    </>
                  )}
                </Button>
              </div>
            ) : isSplitMode && isFullyTendered ? (
              /* All Split Tenders Covered Success Banner */
              <div className="p-4 rounded-lg border-crisp border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/40 text-center space-y-1 shadow-2xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                  {language === 'th' ? 'ยอดชำระครบถ้วนแล้ว พร้อมอนุมัติรายการ' : 'Split Payment Fully Tendered & Ready'}
                </div>
                <div className="text-xs text-emerald-700 dark:text-emerald-300">
                  <span className="font-mono font-bold">{stagedPayments.length}</span> {language === 'th' ? 'ช่องทางรวมเป็นเงิน' : 'tenders totaling'}{' '}
                  <span className="font-mono font-bold">{formatMoney(totalTenderedAmount)}</span>
                </div>
              </div>
            ) : (
              /* Standard Single Tender View */
              <div className="space-y-4">
                {/* Method Picker */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { id: 'cash', label: t.checkout.cash, icon: <Banknote className="h-6 w-6" /> },
                    { id: 'card', label: t.checkout.card, icon: <CreditCard className="h-6 w-6" /> },
                    { id: 'qr_digital', label: t.checkout.promptpay, icon: <QrCode className="h-6 w-6" /> },
                  ].map((methodItem) => (
                    <button
                      key={methodItem.id}
                      type="button"
                      onClick={() => setMethod(methodItem.id as PaymentMethod)}
                      className={`min-h-[72px] p-3 sm:p-3.5 rounded-lg border-crisp border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        method === methodItem.id
                          ? 'border-primary bg-primary text-white font-bold'
                          : 'border-border bg-card text-text/70 hover:bg-background hover:border-primary/50'
                      }`}
                    >
                      {methodItem.icon}
                      <span className="text-xs font-semibold">{methodItem.label}</span>
                    </button>
                  ))}
                </div>

                {/* Cash Tender Details */}
                {method === 'cash' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-text/70 mb-1.5">
                        {t.checkout.tenderedAmount} ({grandTotal.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={(singleCashTenderedCents / 100).toFixed(2)}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const parsed = parseFloat(e.target.value);
                          setSingleCashTenderedCents(isNaN(parsed) ? 0 : Math.round(parsed * 100));
                        }}
                        className="w-full min-h-[48px] h-12 rounded-lg border-crisp border border-border bg-card text-2xl font-bold font-mono px-4 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors shadow-2xs"
                      />
                    </div>

                    {/* Quick Cash Calculator Utility */}
                    <QuickCashCalculator
                      totalDueCents={grandTotal.amountInCents}
                      currency={grandTotal.currency}
                      tenderedCents={singleCashTenderedCents}
                      onTenderedChange={(cents) => setSingleCashTenderedCents(cents)}
                    />

                    {/* Change Calculation */}
                    <div className="p-3.5 rounded-lg border-crisp border border-border bg-card flex items-center justify-between shadow-2xs">
                      <span className="text-xs font-semibold text-text/70">
                        {t.checkout.changeDue}:
                      </span>
                      <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatMoney(singleChangeDueMoney)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Card / QR Simulation State */}
                {method === 'card' && (
                  <div className="p-4 rounded-lg border-crisp border border-border bg-card text-center space-y-2 shadow-2xs">
                    <CreditCard className="h-8 w-8 text-text mx-auto" />
                    <div className="text-xs font-semibold text-text">
                      {language === 'th' ? 'เชื่อมต่อเครื่องรูดบัตร: TRM-VERIFONE-01' : 'Connected Terminal: TRM-VERIFONE-01'}
                    </div>
                    <div className="text-[11px] text-text/70">
                      {t.checkout.cardInstruction}
                    </div>
                  </div>
                )}

                {method === 'qr_digital' && (
                  <div className="p-4 rounded-lg border-crisp border border-border bg-card text-center space-y-2 shadow-2xs">
                    <QrCode className="h-8 w-8 text-text mx-auto" />
                    <div className="text-xs font-semibold text-text">
                      {language === 'th' ? 'พร้อมเพย์ QR Code ชำระเงิน' : 'PromptPay / Digital QR'}
                    </div>
                    <div className="text-[11px] text-text/70">
                      {t.checkout.promptpayInstruction}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Offline Guardrail Warning Notice */}
            {!isOnline && (
              <div className="p-3 rounded-lg border-crisp border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2 shadow-2xs">
                <WifiOff className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{language === 'th' ? 'แจ้งเตือนโหมดออฟไลน์:' : 'Offline Transaction Guardrail:'}</strong>{' '}
                  {language === 'th'
                    ? 'รายการนี้จะถูกเข้ารหัสและบันทึกลงใน Outbox ของเครื่องนี้ และจะส่งขึ้นระบบหลักทันทีที่ต่ออินเทอร์เน็ต'
                    : 'This transaction will be signed and stored in the local register outbox. It is not authoritative server-committed until connectivity is restored.'}
                </span>
              </div>
            )}

           </div>
         )}
       </Modal>

      {isReceiptModalOpen && completedOrder && (
        <ReceiptPrintModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          order={completedOrder}
        />
      )}

      {isFullTaxModalOpen && completedOrder && (
        <FullTaxInvoiceModal
          isOpen={isFullTaxModalOpen}
          onClose={() => setIsFullTaxModalOpen(false)}
          order={completedOrder}
        />
      )}
    </>
  );
};
