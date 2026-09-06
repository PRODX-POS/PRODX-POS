import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { useReceiptPrinter } from '../../context/ReceiptPrinterContext';
import { orderApi } from '../../adapters/mockAdapter';
import { Order, TransactionStatus } from '../../domain/order';
import { formatMoney } from '../../domain/money';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SearchInput } from '../../components/common/SearchInput';
import { Tabs } from '../../components/common/Tabs';
import { EmptyState } from '../../components/common/EmptyState';
import { ReceiptPrintModal } from '../../components/receipt/ReceiptPrintModal';
import { FullTaxInvoiceModal } from '../../components/receipt/FullTaxInvoiceModal';
import { SupervisorAuthModal } from '../../components/auth/SupervisorAuthModal';
import { OrderRefundModal } from '../../components/orders/OrderRefundModal';
import { User } from '../../domain/auth';
import {
  Receipt,
  Search,
  Filter,
  Ban,
  Printer,
  ShieldAlert,
  Clock,
  CheckCircle2,
  WifiOff,
  Eye,
  FileText,
  RotateCcw,
} from 'lucide-react';

export const OrdersScreen: React.FC = () => {
  const { session, can } = useAuth();
  const { addToast } = useToast();
  const { t, language } = useLanguage();
  const { printReceipt, isPrinting } = useReceiptPrinter();

  const [orders, setOrders] = useState<readonly Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isReceiptPrintModalOpen, setIsReceiptPrintModalOpen] = useState(false);
  const [isFullTaxModalOpen, setIsFullTaxModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isSupervisorVoidModalOpen, setIsSupervisorVoidModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      if (!session) return;
      setIsLoading(true);
      try {
        const list = await orderApi.getOrders(session.currentStore.id);
        setOrders(list);
      } catch (err) {
        console.error('[OrdersScreen] Error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrders();

    const handleOrderCompleted = () => {
      fetchOrders();
    };
    window.addEventListener('prodx:order-completed', handleOrderCompleted);
    return () => {
      window.removeEventListener('prodx:order-completed', handleOrderCompleted);
    };
  }, [session]);

  const filteredOrders = orders.filter((o) => {
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'confirmed' && o.status === 'server_confirmed') ||
      (activeFilter === 'offline' && o.status === 'pending_sync_offline') ||
      (activeFilter === 'refunded' && o.status === 'refunded') ||
      (activeFilter === 'voided' && o.status === 'voided');

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      (o.customer && o.customer.name.toLowerCase().includes(q)) ||
      o.idempotencyKey.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  const handleInitiateVoid = () => {
    if (!selectedOrder) return;
    setIsSupervisorVoidModalOpen(true);
  };

  const handleSupervisorVoidAuthorized = async (supervisor: User, reasonNotes?: string) => {
    if (!session || !selectedOrder) return;
    setIsVoiding(true);
    try {
      const voided = await orderApi.voidOrder(
        session.currentStore.id,
        selectedOrder.id,
        reasonNotes || 'Supervisor PIN authorized void',
        supervisor.id
      );
      setOrders((prev) => prev.map((o) => (o.id === voided.id ? voided : o)));
      setSelectedOrder(voided);
      addToast({
        title: language === 'th' ? 'ยกเลิกคำสั่งซื้อแล้ว' : 'Order Voided',
        message:
          language === 'th'
            ? `คำสั่งซื้อ #${voided.orderNumber} ถูกยกเลิกโดย ${supervisor.name} เรียบร้อยแล้ว`
            : `Order #${voided.orderNumber} voided by ${supervisor.name}.`,
        type: 'info',
      });
    } catch (err: any) {
      addToast({
        title: language === 'th' ? 'ยกเลิกคำสั่งซื้อไม่สำเร็จ' : 'Void Operation Failed',
        message: err?.message || 'Unable to void order.',
        type: 'error',
      });
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-background text-text no-scrollbar">
      {/* Top Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-4 sm:pb-6 border-b border-border/50">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            {t.orders.title}
          </h1>
          <p className="text-xs text-text/70 mt-1">
            {t.orders.subtitle}
          </p>
        </div>
        {/* Action button container with overflow-x-auto */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 shrink-0">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              addToast({
                title: language === 'th' ? 'ส่งออกข้อมูล' : 'Export Orders',
                message: language === 'th' ? 'ส่งออกรายการคำสั่งซื้อเรียบร้อย' : 'Orders exported successfully',
                type: 'success',
              });
            }}
            leftIcon={<FileText className="h-4 w-4 text-primary" />}
            className="whitespace-nowrap min-h-[44px]"
          >
            {language === 'th' ? 'ส่งออกรายงาน' : 'Export Orders'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start flex-1 min-h-0">
        <div className="w-full lg:w-[45%] xl:w-[50%] flex flex-col gap-6 h-full">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder={t.orders.searchPlaceholder}
          />
        </div>

        <Tabs
          tabs={[
            { id: 'all', label: language === 'th' ? 'ทั้งหมด' : 'All Orders' },
            { id: 'confirmed', label: language === 'th' ? 'ยืนยันแล้ว' : 'Server Confirmed' },
            { id: 'offline', label: language === 'th' ? 'รอซิงก์ (ออฟไลน์)' : 'Pending Sync' },
            { id: 'refunded', label: language === 'th' ? 'คืนเงินแล้ว' : 'Refunded' },
            { id: 'voided', label: language === 'th' ? 'ยกเลิกแล้ว' : 'Voided' },
          ]}
          activeTab={activeFilter}
          onChange={setActiveFilter}
        />
      </div>

      {/* Orders Table Card */}
      <div className="w-full overflow-x-auto rounded-lg border border-border bg-card shadow-2xs flex-1 flex flex-col min-h-0">
        <table className="w-full min-w-[640px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-text/70 bg-card font-medium">
                <th className="py-3.5 px-5">{t.orders.orderNumber}</th>
                <th className="py-3.5 px-4">{t.orders.dateTime}</th>
                <th className="py-3.5 px-4">{language === 'th' ? 'เครื่องขาย' : 'Register'}</th>
                <th className="py-3.5 px-4">{t.orders.customer}</th>
                <th className="py-3.5 px-4">{t.orders.payment}</th>
                <th className="py-3.5 px-4">{t.orders.status}</th>
                <th className="py-3.5 px-5 text-right">{t.orders.total}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text/50">
                    <Receipt className="h-8 w-8 mx-auto text-text/30 mb-2" />
                    <p className="text-xs font-semibold text-text">
                      {language === 'th' ? 'ไม่พบรายการคำสั่งซื้อ' : 'No orders found'}
                    </p>
                    <p className="text-[11px] text-text/50">
                      {language === 'th' ? 'ลองปรับคำค้นหาหรือเปลี่ยนตัวกรองสถานะ' : 'Try adjusting your search or status filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-background/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-5 font-mono font-bold text-text">
                      {order.orderNumber}
                    </td>
                    <td className="py-3.5 px-4 text-text/70 font-mono">
                      {new Date(order.createdAt).toLocaleDateString()} ·{' '}
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-text/70">
                      {order.registerId}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-text">
                      {order.customer ? order.customer.name : t.pos.walkIn}
                    </td>
                    <td className="py-3.5 px-4 uppercase text-[10px] font-semibold text-text/70">
                      {order.payments[0]?.method === 'cash'
                        ? t.checkout.cash
                        : order.payments[0]?.method === 'card'
                        ? t.checkout.card
                        : t.checkout.promptpay}
                    </td>
                    <td className="py-3.5 px-4">
                      {order.status === 'server_confirmed' ? (
                        <Badge variant="success" size="sm" dot>
                          {t.orders.completed}
                        </Badge>
                      ) : order.status === 'pending_sync_offline' ? (
                        <Badge variant="offline" size="sm" dot>
                          {language === 'th' ? 'รอซิงก์ (ออฟไลน์)' : 'Pending Sync (Offline)'}
                        </Badge>
                      ) : order.status === 'refunded' ? (
                        <Badge variant="warning" size="sm" dot>
                          {language === 'th' ? 'คืนเงินแล้ว' : 'Refunded'}
                        </Badge>
                      ) : (
                        <Badge variant="danger" size="sm">
                          {order.status}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-text">
                      {formatMoney(order.totals.grandTotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title={`${t.orders.orderNumber}: ${selectedOrder.orderNumber}`}
          description={`${language === 'th' ? 'สร้างเมื่อ' : 'Created at'} ${new Date(selectedOrder.createdAt).toLocaleString()} ${language === 'th' ? 'บนเครื่อง' : 'on Register'} ${selectedOrder.registerId}`}
          maxWidth="lg"
          footer={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2">
                {selectedOrder.status !== 'voided' && selectedOrder.status !== 'refunded' && (
                  <>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleInitiateVoid}
                      isLoading={isVoiding}
                      leftIcon={<Ban className="h-3.5 w-3.5" />}
                    >
                      {language === 'th' ? 'ยกเลิกบิล (สิทธิ์ผู้จัดการ)' : 'Void (PIN Required)'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRefundModalOpen(true)}
                      className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    >
                      {language === 'th' ? 'คืนเงิน / รับคืนสินค้า' : 'Refund / Return'}
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullTaxModalOpen(true)}
                  leftIcon={<FileText className="h-3.5 w-3.5 text-primary" />}
                >
                  {language === 'th' ? 'ใบกำกับภาษีเต็มรูป (A4)' : 'Full Tax Invoice'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsReceiptPrintModalOpen(true)}
                  title={t.orders.reprintReceipt}
                  leftIcon={<Printer className="h-3.5 w-3.5" />}
                >
                  <span>{t.orders.reprintReceipt}</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setSelectedOrder(null)}>
                  {language === 'th' ? 'ปิด' : 'Close'}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Status Advisory Banner */}
            <div
              className={`p-3 rounded-lg border-border border-crisp text-xs flex items-start gap-2.5 ${
                selectedOrder.status === 'server_confirmed'
                  ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                  : selectedOrder.status === 'pending_sync_offline'
                  ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
                  : selectedOrder.status === 'refunded'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-rose-500/10 text-rose-800 dark:text-rose-300'
              }`}
            >
              {selectedOrder.status === 'server_confirmed' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 mt-0.5" />
              ) : selectedOrder.status === 'pending_sync_offline' ? (
                <WifiOff className="h-4 w-4 text-amber-500 dark:text-amber-400 mt-0.5" />
              ) : selectedOrder.status === 'refunded' ? (
                <RotateCcw className="h-4 w-4 text-primary mt-0.5" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-rose-500 dark:text-rose-400 mt-0.5" />
              )}
              <div>
                <div className="font-bold">
                  {t.orders.status}: {selectedOrder.status.replace('_', ' ').toUpperCase()}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5 font-mono">
                  Idempotency Key: {selectedOrder.idempotencyKey}
                </div>
              </div>
            </div>

            {/* Line Items List */}
            <div className="w-full overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-card text-text/70 font-medium border-b border-border">
                    <th className="py-2.5 px-4">{language === 'th' ? 'สินค้า' : 'Item'}</th>
                    <th className="py-2.5 px-3">{language === 'th' ? 'จำนวน' : 'Qty'}</th>
                    <th className="py-2.5 px-3">{language === 'th' ? 'ราคา/หน่วย' : 'Unit Price'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'th' ? 'ยอดรวม' : 'Line Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {selectedOrder.items.map((i) => (
                    <tr key={i.lineId}>
                      <td className="py-2.5 px-4 font-sans font-medium text-text">
                        {i.product.name}
                      </td>
                      <td className="py-2.5 px-3 text-text/70">{i.quantity}</td>
                      <td className="py-2.5 px-3 text-text/70">{formatMoney(i.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-text">{formatMoney(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals Breakdown */}
            <div className="p-4 rounded-lg bg-background border-border border-crisp space-y-1.5 text-xs font-mono text-text">
              <div className="flex justify-between text-text/70">
                <span className="font-sans">{t.pos.subtotal}</span>
                <span>{formatMoney(selectedOrder.totals.netSubtotal)}</span>
              </div>
              <div className="flex justify-between text-text/70">
                <span className="font-sans">{language === 'th' ? 'ภาษีมูลค่าเพิ่ม' : 'Tax (Sales / VAT)'}</span>
                <span>{formatMoney(selectedOrder.totals.totalTax)}</span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between font-bold text-sm text-primary">
                <span className="font-sans text-text">{t.checkout.totalDue}</span>
                <span>{formatMoney(selectedOrder.totals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
      </div>

      {/* Thermal Receipt Reprint & Preview Modal */}
      {isReceiptPrintModalOpen && selectedOrder && (
        <ReceiptPrintModal
          isOpen={isReceiptPrintModalOpen}
          onClose={() => setIsReceiptPrintModalOpen(false)}
          order={selectedOrder}
        />
      )}

      {/* Full Tax Invoice Modal (A4 Thai Revenue Compliant) */}
      {isFullTaxModalOpen && selectedOrder && (
        <FullTaxInvoiceModal
          isOpen={isFullTaxModalOpen}
          onClose={() => setIsFullTaxModalOpen(false)}
          order={selectedOrder}
        />
      )}

      {/* Refund Modal */}
      {isRefundModalOpen && selectedOrder && (
        <OrderRefundModal
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          order={selectedOrder}
          onRefundCompleted={(updatedOrder) => {
            setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
            setSelectedOrder(updatedOrder);
          }}
        />
      )}

      {/* Supervisor Auth Modal for Voiding */}
      {isSupervisorVoidModalOpen && selectedOrder && (
        <SupervisorAuthModal
          isOpen={isSupervisorVoidModalOpen}
          onClose={() => setIsSupervisorVoidModalOpen(false)}
          title={language === 'th' ? `อนุมัติยกเลิกบิล #${selectedOrder.orderNumber}` : `Authorize Void Order #${selectedOrder.orderNumber}`}
          actionDescription={language === 'th' ? 'กรุณาให้ผู้จัดการหรือแอดมินใส่รหัส PIN เพื่อยืนยันการยกเลิกคำสั่งซื้อ' : 'Please enter manager or administrator PIN to void this transaction.'}
          requiredRole="manager"
          onAuthorized={(supervisor, reason) => {
            handleSupervisorVoidAuthorized(supervisor, reason);
          }}
        />
      )}
    </div>
    </div>
  );
};
