import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { useBreadcrumb, BreadcrumbLevel } from '../../context/BreadcrumbContext';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const OrdersScreen: React.FC = () => {
  const { session, can } = useAuth();
  const { addToast } = useToast();
  const { t, language } = useLanguage();
  const { printReceipt, isPrinting } = useReceiptPrinter();
  const { setSubLevels } = useBreadcrumb();

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
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

  // Synchronize Orders navigation depth with global breadcrumbs
  useEffect(() => {
    const levels: BreadcrumbLevel[] = [];

    let filterLabel = { th: 'บิลทั้งหมด', en: 'All Receipts' };
    if (activeFilter === 'completed') filterLabel = { th: 'ชำระสำเร็จ', en: 'Completed' };
    if (activeFilter === 'voided') filterLabel = { th: 'ยกเลิกแล้ว', en: 'Voided' };
    if (activeFilter === 'refunded') filterLabel = { th: 'คืนเงินแล้ว', en: 'Refunded' };

    levels.push({
      id: 'orders-filter',
      label: filterLabel,
      onClick: () => {
        setActiveFilter('all');
        setSelectedOrder(null);
        setSearchQuery('');
      },
    });

    if (selectedOrder) {
      levels.push({
        id: 'orders-selected',
        label: {
          th: `บิล #${selectedOrder.orderNumber || selectedOrder.id.slice(0, 8)}`,
          en: `Receipt #${selectedOrder.orderNumber || selectedOrder.id.slice(0, 8)}`,
        },
        onClick: () => setSelectedOrder(null),
      });
    } else if (searchQuery.trim()) {
      levels.push({
        id: 'orders-search',
        label: { th: `ค้นหา: "${searchQuery}"`, en: `Search: "${searchQuery}"` },
        onClick: () => setSearchQuery(''),
      });
    }

    setSubLevels(levels);
  }, [activeFilter, selectedOrder, searchQuery, setSubLevels]);

  const toggleOrderExpansion = (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedOrderIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  useEffect(() => {
    async function fetchOrders() {
      if (!session) return;
      setIsLoading(true);
      try {
        const list = await orderApi.getOrders(session.currentStore.id);
        setOrders(list);

        // Auto-select order if navigated from Command Palette or external link
        const targetOrderId =
          sessionStorage.getItem('prodx_selected_order_id') ||
          localStorage.getItem('prodx_selected_order_id');
        if (targetOrderId) {
          sessionStorage.removeItem('prodx_selected_order_id');
          localStorage.removeItem('prodx_selected_order_id');
          const found = list.find(
            (o) => o.id === targetOrderId || o.orderNumber.toLowerCase() === targetOrderId.toLowerCase()
          );
          if (found) {
            setSelectedOrder(found);
          }
        }
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

    const handleSelectOrderEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ orderId: string }>;
      if (customEvt.detail?.orderId) {
        const targetId = customEvt.detail.orderId;
        setOrders((currentList) => {
          const found = currentList.find(
            (o) => o.id === targetId || o.orderNumber.toLowerCase() === targetId.toLowerCase()
          );
          if (found) {
            setSelectedOrder(found);
          }
          return currentList;
        });
      }
    };

    window.addEventListener('prodx:order-completed', handleOrderCompleted);
    window.addEventListener('prodx:select-order', handleSelectOrderEvent);
    return () => {
      window.removeEventListener('prodx:order-completed', handleOrderCompleted);
      window.removeEventListener('prodx:select-order', handleSelectOrderEvent);
    };
  }, [session]);

  const orderMetrics = React.useMemo(() => {
    const totalCount = orders.length;
    let confirmedRevenueCents = 0;
    let offlineCount = 0;
    let refundedVoidedCount = 0;

    for (const o of orders) {
      if (o.status === 'server_confirmed') {
        confirmedRevenueCents += o.totals.grandTotal.amountInCents;
      } else if (o.status === 'pending_sync_offline') {
        offlineCount++;
        confirmedRevenueCents += o.totals.grandTotal.amountInCents;
      } else if (o.status === 'refunded' || o.status === 'voided') {
        refundedVoidedCount++;
      }
    }

    return {
      totalCount,
      confirmedRevenueCents,
      offlineCount,
      refundedVoidedCount,
      currency: orders[0]?.totals.grandTotal.currency || session?.currentStore.currency || 'THB',
    };
  }, [orders, session]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 sm:pb-6 border-b border-border/50">
        <div className="min-w-0 flex-1">
          <h1 className="text-heading-1 text-text">
            {t.orders.title}
          </h1>
          <p className="text-caption text-text/70 mt-1">
            {t.orders.subtitle}
          </p>
        </div>
        {/* Action button container */}
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
            className="whitespace-nowrap"
          >
            {language === 'th' ? 'ส่งออกรายงาน' : 'Export Orders'}
          </Button>
        </div>
      </div>

      {/* Executive Orders KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Orders */}
        <div className="p-4 rounded-xl border border-border border-crisp bg-card shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-text/60 uppercase tracking-wider">
            <span>{language === 'th' ? 'คำสั่งซื้อทั้งหมด' : 'Total Orders'}</span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono tracking-tight text-text">
            {orderMetrics.totalCount} <span className="text-xs font-sans font-medium text-text/60">{language === 'th' ? 'รายการ' : 'txns'}</span>
          </div>
          <div className="mt-1.5 text-[11px] text-text/60">
            {language === 'th' ? 'รวมทุกสถานะบนเครื่องขาย' : 'Lifetime store transactions'}
          </div>
        </div>

        {/* Metric 2: Gross Revenue */}
        <div className="p-4 rounded-xl border border-border border-crisp bg-card shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-text/60 uppercase tracking-wider">
            <span>{language === 'th' ? 'ยอดขายสะสม' : 'Total Revenue'}</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
            {formatMoney({ amountInCents: orderMetrics.confirmedRevenueCents, currency: orderMetrics.currency })}
          </div>
          <div className="mt-1.5 text-[11px] text-text/60">
            {language === 'th' ? 'จากคำสั่งซื้อที่เสร็จสมบูรณ์' : 'Server confirmed receipts'}
          </div>
        </div>

        {/* Metric 3: Offline Pending Sync */}
        <div className="p-4 rounded-xl border border-border border-crisp bg-card shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-text/60 uppercase tracking-wider">
            <span>{language === 'th' ? 'รอซิงก์ออฟไลน์' : 'Pending Sync'}</span>
            <div className={`p-1.5 rounded-lg ${orderMetrics.offlineCount > 0 ? 'bg-amber-500/15 text-amber-500' : 'bg-text/5 text-text/40'}`}>
              <WifiOff className="h-4 w-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-black font-mono tracking-tight ${orderMetrics.offlineCount > 0 ? 'text-amber-500' : 'text-text'}`}>
            {orderMetrics.offlineCount} <span className="text-xs font-sans font-medium text-text/60">{language === 'th' ? 'คิว' : 'queued'}</span>
          </div>
          <div className="mt-1.5 text-[11px] text-text/60">
            {orderMetrics.offlineCount > 0 ? (language === 'th' ? 'รอเชื่อมต่อคลาวด์' : 'Awaiting connection') : (language === 'th' ? 'ข้อมูลซิงก์ครบถ้วน' : 'All synced to cloud')}
          </div>
        </div>

        {/* Metric 4: Refunded / Voided */}
        <div className="p-4 rounded-xl border border-border border-crisp bg-card shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-text/60 uppercase tracking-wider">
            <span>{language === 'th' ? 'คืนเงิน / ยกเลิก' : 'Refunds & Voids'}</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono tracking-tight text-rose-500">
            {orderMetrics.refundedVoidedCount} <span className="text-xs font-sans font-medium text-text/60">{language === 'th' ? 'รายการ' : 'items'}</span>
          </div>
          <div className="mt-1.5 text-[11px] text-text/60">
            {language === 'th' ? 'ผ่านการอนุมัติ PIN ผู้จัดการ' : 'Supervisor audited'}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder={t.orders.searchPlaceholder}
          />
        </div>

        <div className="overflow-x-auto no-scrollbar py-0.5">
          <Tabs
            tabs={[
              { id: 'all', label: language === 'th' ? 'ทั้งหมด' : 'All Orders' },
              { id: 'confirmed', label: language === 'th' ? 'ยืนยันแล้ว' : 'Confirmed' },
              { id: 'offline', label: language === 'th' ? 'รอซิงก์' : 'Pending Sync' },
              { id: 'refunded', label: language === 'th' ? 'คืนเงินแล้ว' : 'Refunded' },
              { id: 'voided', label: language === 'th' ? 'ยกเลิกแล้ว' : 'Voided' },
            ]}
            activeTab={activeFilter}
            onChange={setActiveFilter}
          />
        </div>
      </div>

      {/* Balanced Master-Detail or Full-Width Workspace Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start flex-1 min-h-0">
        {/* Left / Main Table View */}
        <div className={`flex flex-col gap-4 min-h-0 transition-all duration-200 ${selectedOrder ? 'w-full lg:w-[58%] xl:w-[62%]' : 'w-full'}`}>
          <div className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-2xs flex-1 flex flex-col min-h-0">
            <table className="w-full min-w-[640px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-text/70 bg-card font-semibold">
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
                      <p className="text-[11px] text-text/50 mt-0.5">
                        {language === 'th' ? 'ลองปรับคำค้นหาหรือเปลี่ยนตัวกรองสถานะ' : 'Try adjusting your search or status filter.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isSelected = selectedOrder?.id === order.id;
                    const isExpanded = !!expandedOrderIds[order.id];
                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          onClick={() => {
                            setSelectedOrder(order);
                            toggleOrderExpansion(order.id);
                          }}
                          className={`odd:bg-card even:bg-background/30 hover:bg-primary/5 cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10 border-l-4 border-primary font-semibold' : ''
                          }`}
                        >
                          <td className="py-3.5 px-5 font-mono font-bold text-text">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => toggleOrderExpansion(order.id, e)}
                                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                  isExpanded
                                    ? 'bg-primary/20 text-primary'
                                    : 'hover:bg-primary/10 text-text/60 hover:text-text'
                                }`}
                                title={
                                  isExpanded
                                    ? language === 'th' ? 'ย่อรายละเอียด' : 'Collapse line items'
                                    : language === 'th' ? 'ขยายดูสินค้าในใบเสร็จ' : 'Expand line items'
                                }
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-primary shrink-0" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 shrink-0" />
                                )}
                              </button>
                              <span className="truncate">{order.orderNumber}</span>
                            </div>
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
                                {language === 'th' ? 'รอซิงก์ (ออฟไลน์)' : 'Pending Sync'}
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

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <tr key={`expanded-${order.id}`} className="bg-primary/5 dark:bg-primary/10 border-b border-border">
                              <td colSpan={7} className="p-0">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <div className="p-3.5 sm:p-4 md:p-5">
                                    <div className="bg-card rounded-xl border border-border/80 p-4 shadow-xs space-y-3.5">
                                      {/* Line Items Header Bar */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                                            <Receipt className="h-4 w-4" />
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-xs font-bold uppercase tracking-wider text-text">
                                                {language === 'th' ? 'รายการสินค้าในใบเสร็จ' : 'Line-Item Transaction Breakdown'}
                                              </span>
                                              <span className="font-mono text-xs font-bold text-primary">
                                                #{order.orderNumber}
                                              </span>
                                            </div>
                                            <p className="text-[11px] text-text/60 mt-0.5">
                                              {language === 'th' ? 'ลูกค้า' : 'Customer'}: {order.customer ? `${order.customer.name} (${order.customer.phone || 'No Phone'})` : t.pos.walkIn} · {language === 'th' ? 'พนักงานขาย' : 'Cashier'}: {order.cashierName || 'Staff'}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 font-mono text-[11px]">
                                          <span className="px-2 py-0.5 rounded bg-background border border-border text-text/70">
                                            POS: {order.registerId}
                                          </span>
                                          <span className="px-2 py-0.5 rounded bg-background border border-border text-text/70">
                                            {order.items.reduce((s, i) => s + i.quantity, 0)} {language === 'th' ? 'ชิ้น' : 'items'}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Itemized Table */}
                                      <div className="w-full overflow-x-auto rounded-lg border border-border bg-card">
                                        <table className="w-full text-left text-xs border-collapse">
                                          <thead>
                                            <tr className="bg-card/80 text-text/70 border-b border-border text-[11px] font-semibold">
                                              <th className="py-2.5 px-3.5">{language === 'th' ? 'ชื่อสินค้า / รายการ' : 'Product / Description'}</th>
                                              <th className="py-2.5 px-3 text-center w-20">{language === 'th' ? 'จำนวน' : 'Qty'}</th>
                                              <th className="py-2.5 px-3 text-right w-28">{language === 'th' ? 'ราคา/หน่วย' : 'Unit Price'}</th>
                                              <th className="py-2.5 px-3.5 text-right w-32">{language === 'th' ? 'ราคารวม' : 'Line Total'}</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-border/60 font-mono text-xs">
                                            {order.items.map((item) => (
                                              <tr key={item.lineId} className="odd:bg-card/50 even:bg-background/20 hover:bg-primary/5 transition-colors">
                                                <td className="py-2.5 px-3.5 font-sans">
                                                  <div className="font-bold text-text">{item.product.name}</div>
                                                  {item.product.sku && (
                                                    <div className="text-[10px] text-text/50 font-mono mt-0.5">
                                                      SKU: {item.product.sku}
                                                    </div>
                                                  )}
                                                  {item.discountBps > 0 && (
                                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans mt-0.5">
                                                      Discount: {item.discountBps / 100}%
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="py-2.5 px-3 text-center text-text/80 font-bold">
                                                  {item.quantity}
                                                </td>
                                                <td className="py-2.5 px-3 text-right text-text/70">
                                                  {formatMoney(item.unitPrice)}
                                                </td>
                                                <td className="py-2.5 px-3.5 text-right font-bold text-text">
                                                  {formatMoney(item.lineTotal)}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Transaction Totals & Settlement Info */}
                                      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-lg bg-background border border-border text-xs font-mono">
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-text/80 text-[11px]">
                                          <div>
                                            <span className="text-text/50 font-sans">{language === 'th' ? 'ยอดรวมสินค้า' : 'Subtotal'}:</span>{' '}
                                            <span className="font-bold">{formatMoney(order.totals.grossSubtotal)}</span>
                                          </div>
                                          {order.totals.totalTax.amountInCents > 0 && (
                                            <div>
                                              <span className="text-text/50 font-sans">{language === 'th' ? 'ภาษี (VAT)' : 'Tax'}:</span>{' '}
                                              <span className="font-bold">{formatMoney(order.totals.totalTax)}</span>
                                            </div>
                                          )}
                                          {(order.totals.itemDiscounts.amountInCents + order.totals.orderDiscount.amountInCents) > 0 && (
                                            <div className="text-emerald-600 dark:text-emerald-400">
                                              <span className="font-sans">{language === 'th' ? 'ส่วนลดรวม' : 'Total Disc'}:</span>{' '}
                                              <span className="font-bold">
                                                -{formatMoney({ amountInCents: order.totals.itemDiscounts.amountInCents + order.totals.orderDiscount.amountInCents, currency: order.totals.grandTotal.currency })}
                                              </span>
                                            </div>
                                          )}
                                          <div>
                                            <span className="text-text/50 font-sans">{language === 'th' ? 'ชำระโดย' : 'Payment'}:</span>{' '}
                                            <span className="font-bold uppercase">
                                              {order.payments[0]?.method || 'Cash'}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                                          <span className="text-text/70 text-[11px] font-sans font-bold">
                                            {language === 'th' ? 'สุทธิ (Grand Total):' : 'Grand Total:'}
                                          </span>
                                          <span className="text-sm font-black font-mono text-primary">
                                            {formatMoney(order.totals.grandTotal)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Direct Action Toolbar within Expanded Row */}
                                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60 flex-wrap">
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedOrder(order);
                                            setIsReceiptPrintModalOpen(true);
                                          }}
                                          leftIcon={<Printer className="h-3.5 w-3.5 text-primary shrink-0" />}
                                          className="text-xs h-8 px-2.5 font-bold cursor-pointer"
                                        >
                                          {t.orders.reprintReceipt}
                                        </Button>

                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedOrder(order);
                                            setIsFullTaxModalOpen(true);
                                          }}
                                          leftIcon={<FileText className="h-3.5 w-3.5 text-primary shrink-0" />}
                                          className="text-xs h-8 px-2.5 font-bold cursor-pointer"
                                        >
                                          {language === 'th' ? 'ใบกำกับภาษีเต็มรูป' : 'Tax Invoice'}
                                        </Button>

                                        {order.status !== 'voided' && order.status !== 'refunded' && (
                                          <>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedOrder(order);
                                                setIsRefundModalOpen(true);
                                              }}
                                              leftIcon={<RotateCcw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                                              className="text-xs h-8 px-2.5 font-bold cursor-pointer text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                                            >
                                              {language === 'th' ? 'คืนเงิน' : 'Refund'}
                                            </Button>

                                            <Button
                                              type="button"
                                              variant="danger"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedOrder(order);
                                                handleInitiateVoid();
                                              }}
                                              leftIcon={<Ban className="h-3.5 w-3.5 shrink-0" />}
                                              className="text-xs h-8 px-2.5 font-bold cursor-pointer"
                                            >
                                              {language === 'th' ? 'ยกเลิกบิล' : 'Void'}
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Detail Pane (Desktop & POS display when an order is active) */}
        {selectedOrder && (
          <div className="hidden lg:flex w-full lg:w-[42%] xl:w-[38%] flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sticky top-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-text">
                    {t.orders.orderNumber}: {selectedOrder.orderNumber}
                  </h3>
                  <Badge
                    variant={
                      selectedOrder.status === 'server_confirmed'
                        ? 'success'
                        : selectedOrder.status === 'pending_sync_offline'
                        ? 'offline'
                        : selectedOrder.status === 'refunded'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {selectedOrder.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <p className="text-[11px] text-text/60 mt-0.5">
                  {new Date(selectedOrder.createdAt).toLocaleString()} · {selectedOrder.registerId}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedOrder(null)}
                className="text-text/50 hover:text-text h-8 px-2"
              >
                ✕
              </Button>
            </div>

            {/* Line Items List */}
            <div className="w-full overflow-x-auto rounded-lg border border-border bg-card max-h-56 overflow-y-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-background text-text/70 font-semibold border-b border-border">
                    <th className="py-2 px-3">{language === 'th' ? 'รายการสินค้า' : 'Item'}</th>
                    <th className="py-2 px-2 text-center">{language === 'th' ? 'จน.' : 'Qty'}</th>
                    <th className="py-2 px-3 text-right">{language === 'th' ? 'รวม' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-xs">
                  {selectedOrder.items.map((i) => (
                    <tr key={i.lineId} className="odd:bg-card even:bg-background/30 hover:bg-primary/5 transition-colors">
                      <td className="py-2 px-3 font-sans font-medium text-text">
                        {i.product.name}
                      </td>
                      <td className="py-2 px-2 text-center text-text/70">{i.quantity}</td>
                      <td className="py-2 px-3 text-right font-bold text-text">{formatMoney(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Breakdown */}
            <div className="p-3 rounded-lg bg-background border border-border space-y-1.5 text-xs font-mono text-text">
              <div className="flex justify-between text-text/70">
                <span className="font-sans">{t.pos.subtotal}</span>
                <span>{formatMoney(selectedOrder.totals.netSubtotal)}</span>
              </div>
              <div className="flex justify-between text-text/70">
                <span className="font-sans">{language === 'th' ? 'ภาษีมูลค่าเพิ่ม' : 'Tax / VAT'}</span>
                <span>{formatMoney(selectedOrder.totals.totalTax)}</span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between font-bold text-sm text-primary">
                <span className="font-sans text-text">{t.checkout.totalDue}</span>
                <span>{formatMoney(selectedOrder.totals.grandTotal)}</span>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsReceiptPrintModalOpen(true)}
                leftIcon={<Printer className="h-3.5 w-3.5" />}
              >
                {t.orders.reprintReceipt}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsFullTaxModalOpen(true)}
                leftIcon={<FileText className="h-3.5 w-3.5 text-primary" />}
              >
                {language === 'th' ? 'ใบกำกับภาษี (A4)' : 'Tax Invoice'}
              </Button>
              {selectedOrder.status !== 'voided' && selectedOrder.status !== 'refunded' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRefundModalOpen(true)}
                    className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  >
                    {language === 'th' ? 'คืนเงิน / รับคืน' : 'Refund'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleInitiateVoid}
                    isLoading={isVoiding}
                    leftIcon={<Ban className="h-3.5 w-3.5" />}
                  >
                    {language === 'th' ? 'ยกเลิกบิล (PIN)' : 'Void (PIN)'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal for Mobile & Small Screens */}
      {selectedOrder && (
        <div className="block lg:hidden">
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
                        {language === 'th' ? 'ยกเลิกบิล' : 'Void'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsRefundModalOpen(true)}
                        className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                        leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                      >
                        {language === 'th' ? 'คืนเงิน' : 'Refund'}
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
                    {language === 'th' ? 'ใบกำกับภาษี' : 'Tax Invoice'}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsReceiptPrintModalOpen(true)}
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
                      <tr key={i.lineId} className="odd:bg-card even:bg-background/30 hover:bg-primary/5 transition-colors">
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
        </div>
      )}

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
  );
};
