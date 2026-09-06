import React, { useState } from 'react';
import { Order, CartLineItem } from '../../domain/order';
import { Money, createMoney, formatMoney } from '../../domain/money';
import { User } from '../../domain/auth';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { useReceiptPrinter } from '../../context/ReceiptPrinterContext';
import { orderApi } from '../../adapters/mockAdapter';
import { SupervisorAuthModal } from '../auth/SupervisorAuthModal';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Banknote,
  CreditCard,
  QrCode,
  PackageCheck,
  DollarSign,
} from 'lucide-react';

export interface OrderRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onRefundCompleted: (refundedOrder: Order) => void;
}

export const OrderRefundModal: React.FC<OrderRefundModalProps> = ({
  isOpen,
  onClose,
  order,
  onRefundCompleted,
}) => {
  const { session, can } = useAuth();
  const { addToast } = useToast();
  const { language } = useLanguage();
  const { kickCashDrawer } = useReceiptPrinter();

  const [refundReason, setRefundReason] = useState('Customer Return / Defective');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'qr_digital'>(
    order.payments[0]?.method || 'cash'
  );
  const [restockItems, setRestockItems] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);

  // Available reasons
  const reasons = [
    { id: 'Customer Return / Defective', label: language === 'th' ? 'สินค้าชำรุด / มีตำหนิ' : 'Defective Product / Damaged' },
    { id: 'Customer Changed Mind', label: language === 'th' ? 'ลูกค้าเปลี่ยนใจ / คืนสินค้า' : 'Customer Changed Mind' },
    { id: 'Wrong Item Ordered', label: language === 'th' ? 'สั่งซื้อผิดรายการ' : 'Wrong Item Ordered' },
    { id: 'Cashier / Billing Error', label: language === 'th' ? 'ข้อผิดพลาดในการคิดเงิน' : 'Billing / Cashier Error' },
    { id: 'Other Reason', label: language === 'th' ? 'เหตุผลอื่นๆ' : 'Other Reason' },
  ];

  const handleInitiateRefund = () => {
    // If current user is already an admin/manager, we can prompt for PIN confirmation or authorize directly.
    // For enterprise compliance, prompt SupervisorAuthModal.
    setIsSupervisorModalOpen(true);
  };

  const handleSupervisorAuthorized = async (supervisor: User) => {
    if (!session) return;
    setIsProcessing(true);

    try {
      const refunded = await orderApi.refundOrder(
        session.currentStore.id,
        order.id,
        order.totals.grandTotal,
        refundReason,
        refundMethod,
        restockItems,
        supervisor.id,
        supervisor.name
      );

      // If cash refund, trigger cash drawer kick!
      if (refundMethod === 'cash') {
        await kickCashDrawer();
      }

      addToast({
        title: language === 'th' ? 'คืนเงินสำเร็จ' : 'Refund Processed',
        message:
          language === 'th'
            ? `คืนเงินคำสั่งซื้อ #${order.orderNumber} ยอด ${formatMoney(order.totals.grandTotal)} เรียบร้อยแล้ว (อนุมัติโดย ${supervisor.name})`
            : `Refund for order #${order.orderNumber} of ${formatMoney(order.totals.grandTotal)} approved by ${supervisor.name}.`,
        type: 'success',
      });

      onRefundCompleted(refunded);
      onClose();
    } catch (err: any) {
      addToast({
        title: language === 'th' ? 'การคืนเงินล้มเหลว' : 'Refund Failed',
        message: err?.message || 'Error processing refund.',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={language === 'th' ? `คืนเงินคำสั่งซื้อ: ${order.orderNumber}` : `Refund Order: ${order.orderNumber}`}
        description={
          language === 'th'
            ? 'ระบุเหตุผลและช่องทางการคืนเงิน รายการนี้ต้องได้รับการอนุมัติจากผู้จัดการ'
            : 'Select refund reason and method. Manager authorization is required.'
        }
        maxWidth="lg"
      >
        <div className="space-y-4 select-none">
          {/* Order Summary Pill */}
          <div className="p-3.5 rounded-xl border border-border border-crisp bg-card flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-text/60">
                {language === 'th' ? 'ยอดที่ต้องคืน (Total Refund Amount)' : 'Total Refund Amount'}
              </div>
              <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                {formatMoney(order.totals.grandTotal)}
              </div>
            </div>
            <div className="text-right">
              <Badge variant="warning" size="sm">
                <span className="font-mono">{order.items.length}</span> {language === 'th' ? 'รายการ' : 'items'}
              </Badge>
              <div className="text-[11px] text-text/50 mt-1 font-mono">{order.orderNumber}</div>
            </div>
          </div>

          {/* Refund Reason Selection */}
          <div>
            <label className="text-xs font-bold text-text/80 block mb-1.5">
              {language === 'th' ? 'เหตุผลการคืนเงิน (Refund Reason):' : 'Refund Reason:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {reasons.map((r) => {
                const isSelected = refundReason === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRefundReason(r.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/10 text-rose-900 dark:text-rose-200 font-bold ring-1 ring-rose-500'
                        : 'border-border border-crisp hover:bg-background dark:hover:bg-white/5 text-text/80'
                    }`}
                  >
                    <span>{r.label}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-rose-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Refund Tender Method */}
          <div>
            <label className="text-xs font-bold text-text/80 block mb-1.5">
              {language === 'th' ? 'ช่องทางการคืนเงิน (Refund Payment Method):' : 'Refund Tender Method:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRefundMethod('cash')}
                className={`p-3 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 ${
                  refundMethod === 'cash'
                    ? 'border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary'
                    : 'border-border border-crisp hover:bg-background/50 dark:hover:bg-white/5 text-text/70'
                }`}
              >
                <Banknote className="h-5 w-5" />
                <span className="text-xs">{language === 'th' ? 'เงินสด (ลิ้นชัก)' : 'Cash (Drawer)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setRefundMethod('card')}
                className={`p-3 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 ${
                  refundMethod === 'card'
                    ? 'border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary'
                    : 'border-border border-crisp hover:bg-background/50 dark:hover:bg-white/5 text-text/70'
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-xs">{language === 'th' ? 'บัตรเครดิต' : 'Card Reversal'}</span>
              </button>

              <button
                type="button"
                onClick={() => setRefundMethod('qr_digital')}
                className={`p-3 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 ${
                  refundMethod === 'qr_digital'
                    ? 'border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary'
                    : 'border-border border-crisp hover:bg-background/50 dark:hover:bg-white/5 text-text/70'
                }`}
              >
                <QrCode className="h-5 w-5" />
                <span className="text-xs">{language === 'th' ? 'พร้อมเพย์ / โอน' : 'PromptPay / Transfer'}</span>
              </button>
            </div>
          </div>

          {/* Restock checkbox */}
          <div className="p-3 rounded-xl border border-border border-crisp bg-background/50 dark:bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-emerald-500" />
              <div>
                <div className="text-xs font-bold text-text">
                  {language === 'th' ? 'คืนสินค้ากลับเข้าสต็อก (Restock Inventory)' : 'Restock Items to Inventory'}
                </div>
                <div className="text-[11px] text-text/60">
                  {language === 'th'
                    ? 'เพิ่มจำนวนสินค้ากลับเข้าคลังและบันทึก Inventory Ledger'
                    : 'Auto-adjusts inventory balance and records return ledger entry.'}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={restockItems}
              onChange={(e) => setRestockItems(e.target.checked)}
              className="h-4 w-4 rounded accent-primary cursor-pointer"
            />
          </div>

          {/* Notice banner */}
          <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>
              {language === 'th'
                ? 'การคืนเงินจะเปลี่ยนสถานะบิลเป็น REFUNDED และส่งคำสั่งเปิดลิ้นชักเมื่อเลือกเงินสด'
                : 'Submitting will mark order as REFUNDED and kick cash drawer if cash refund.'}
            </span>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-border border-crisp flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleInitiateRefund}
              isLoading={isProcessing}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              {language === 'th' ? 'ขออนุมัติคืนเงิน (สิทธิ์ผู้จัดการ)' : 'Request Refund Approval'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Supervisor Auth Modal Trigger */}
      {isSupervisorModalOpen && (
        <SupervisorAuthModal
          isOpen={isSupervisorModalOpen}
          onClose={() => setIsSupervisorModalOpen(false)}
          actionDescription={`${language === 'th' ? 'อนุมัติการคืนเงินคำสั่งซื้อ' : 'Refund Authorization for Order'} #${order.orderNumber} (${formatMoney(order.totals.grandTotal)})`}
          requiredRole="manager"
          onAuthorized={handleSupervisorAuthorized}
        />
      )}
    </>
  );
};
