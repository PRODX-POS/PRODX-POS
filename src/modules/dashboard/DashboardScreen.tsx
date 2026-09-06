import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import { useOffline } from '../../context/OfflineContext';
import { useLanguage } from '../../context/LanguageContext';
import { orderApi, catalogApi } from '../../adapters/mockAdapter';
import { Order } from '../../domain/order';
import { Product } from '../../domain/catalog';
import { formatMoney, createMoney } from '../../domain/money';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import {
  TrendingUp,
  Receipt,
  DollarSign,
  AlertTriangle,
  Banknote,
  ShoppingCart,
  Boxes,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Users,
  CreditCard,
  QrCode,
  Sparkles,
  Activity,
  Layers,
  Store,
  ChevronRight,
  Calendar,
  RotateCcw,
  Filter,
} from 'lucide-react';
import { NavRoute } from '../../components/layout/Sidebar';
import { DateRangePicker, DateRange } from './DateRangePicker';

export interface DashboardScreenProps {
  onNavigate: (route: NavRoute) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { session } = useAuth();
  const { currentShift } = useShift();
  const { pendingCount } = useOffline();
  const { t, language } = useLanguage();

  const isFinancialAuthorized = session?.currentUser?.role === 'admin' || session?.currentUser?.role === 'manager';

  const [orders, setOrders] = useState<readonly Order[]>([]);
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChartMetric, setActiveChartMetric] = useState<'sales' | 'orders'>('sales');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(() => {
    const cached = localStorage.getItem('prodx_low_stock_threshold');
    return cached ? parseInt(cached, 10) : 15;
  });

  // Custom report date range filter state (Defaults to Today)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  });

  // Filter orders matching the selected date range window [startDate 00:00:00 - endDate 23:59:59]
  const filteredOrders = React.useMemo(() => {
    const startMs = new Date(dateRange.startDate).setHours(0, 0, 0, 0);
    const endMs = new Date(dateRange.endDate).setHours(23, 59, 59, 999);
    return orders.filter((order) => {
      const orderTime = new Date(order.createdAt).getTime();
      return orderTime >= startMs && orderTime <= endMs;
    });
  }, [orders, dateRange]);

  // Re-read low stock threshold from localStorage on render / navigation
  useEffect(() => {
    const cached = localStorage.getItem('prodx_low_stock_threshold');
    if (cached) {
      const parsed = parseInt(cached, 10);
      if (!isNaN(parsed) && parsed !== lowStockThreshold) {
        setLowStockThreshold(parsed);
      }
    }
  }, [products]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!session) return;
      setIsLoading(true);
      try {
        const [loadedOrders, loadedProducts] = await Promise.all([
          orderApi.getOrders(session.currentStore.id, 50),
          catalogApi.getProducts(session.currentStore.id),
        ]);
        setOrders(loadedOrders);
        setProducts(loadedProducts);
      } catch (err) {
        console.error('[Dashboard] Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, [session]);

  // Aggregate metrics using decimal-safe Money arithmetic for the selected date range
  const metrics = React.useMemo(() => {
    let netSalesCents = 0;
    let grossSalesCents = 0;
    let ordersCount = 0;
    let totalItemsSold = 0;
    let cashSalesCents = 0;
    let digitalSalesCents = 0;
    const currency = session?.currentStore.currency || 'THB';

    for (const order of filteredOrders) {
      if (order.status !== 'voided') {
        const orderTotal = order.totals.grandTotal.amountInCents;
        netSalesCents += orderTotal;
        grossSalesCents += order.totals.grossSubtotal.amountInCents;
        ordersCount += 1;

        for (const item of order.items) {
          totalItemsSold += item.quantity;
        }

        for (const payment of order.payments) {
          if (payment.method === 'cash') {
            cashSalesCents += payment.amount.amountInCents;
          } else {
            digitalSalesCents += payment.amount.amountInCents;
          }
        }
      }
    }

    const netSales = createMoney(netSalesCents, currency);
    const grossSales = createMoney(grossSalesCents, currency);
    const avgOrderValue =
      ordersCount > 0
        ? createMoney(Math.round(netSalesCents / ordersCount), currency)
        : createMoney(0, currency);

    const lowStockCount = products.filter((p) => p.currentStock <= lowStockThreshold && p.currentStock > 0).length;
    const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;
    const totalInventoryCount = products.length;

    return {
      netSales,
      grossSales,
      ordersCount,
      avgOrderValue,
      totalItemsSold,
      cashSales: createMoney(cashSalesCents, currency),
      digitalSales: createMoney(digitalSalesCents, currency),
      lowStockCount,
      outOfStockCount,
      totalInventoryCount,
    };
  }, [filteredOrders, products, session, lowStockThreshold]);

  const lowStockProducts = React.useMemo(() => {
    return products.filter((p) => p.currentStock <= lowStockThreshold && p.currentStock > 0);
  }, [products, lowStockThreshold]);

  // Hourly simulated trend data for visual velocity graph
  const hourlyData = [
    { hour: '8 AM', amount: 45, orders: 4 },
    { hour: '9 AM', amount: 120, orders: 12 },
    { hour: '10 AM', amount: 185, orders: 18 },
    { hour: '11 AM', amount: 240, orders: 22 },
    { hour: '12 PM', amount: 310, orders: 28 },
    { hour: '1 PM', amount: 220, orders: 19 },
    { hour: '2 PM', amount: 140, orders: 14 },
    { hour: '3 PM', amount: 195, orders: 16 },
    { hour: '4 PM', amount: 160, orders: 15 },
    { hour: '5 PM', amount: 280, orders: 24 },
  ];

  const maxAmount = Math.max(...hourlyData.map((d) => d.amount));
  const maxOrders = Math.max(...hourlyData.map((d) => d.orders));

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-background text-text no-scrollbar">
      {/* 1. Header & Store Context Banner */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-4 sm:pb-6 border-b border-border/50">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              <Store className="h-3 w-3" />
              <span>{session?.currentStore.code} · {session?.registerId}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{language === 'th' ? 'ระบบพร้อมบันทึกการขาย' : 'Live Point-of-Sale'}</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-text mt-1">
            {t.dashboard.title}
          </h1>
          <p className="text-xs text-text/70 mt-0.5">
            {t.dashboard.subtitle} ·{' '}
            <span className="font-semibold text-text">
              {session?.currentStore.name}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-1 shrink-0">
          <Button
            variant="secondary"
            size="md"
            onClick={() => onNavigate('shift')}
            leftIcon={<Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            className="flex-1 sm:flex-initial min-h-[44px]"
          >
            {language === 'th' ? 'ลิ้นชักเงินสด' : 'Cash Drawer'}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => onNavigate('pos')}
            leftIcon={<ShoppingCart className="h-4 w-4" />}
            className="flex-1 sm:flex-initial min-h-[44px]"
          >
            {language === 'th' ? 'เปิดหน้าขาย (F1)' : 'Launch POS (F1)'}
          </Button>
        </div>
      </div>

      {/* 2. SaaS Report Control Bar with Custom Date Range Picker */}
      <div className="p-3 sm:p-4 rounded-lg border-border border-crisp bg-card shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-text font-mono uppercase tracking-wider block">
                {language === 'th' ? 'ช่วงเวลาสรุปรายงาน' : 'Report Period'}
              </span>
              <span className="text-[11px] text-text/70">
                {language === 'th' ? 'กรองข้อมูลยอดขายและวิเคราะห์คำสั่งซื้อ' : 'Filter financial totals & order analytics'}
              </span>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              id="dashboard-report-date-range-picker"
            />
          </div>
        </div>

        {/* Real-time Reporting Telemetry & Quick Action */}
        <div className="flex items-center justify-between md:justify-end gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-border">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border-border border-crisp text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-bold text-text">
              {filteredOrders.length}
            </span>
            <span className="text-text/70">
              {language === 'th' ? 'บิลที่ตรงเกณฑ์' : 'bills in range'}
            </span>
            <span className="text-text/30">·</span>
            <span className="font-bold text-primary">
              {formatMoney(metrics.netSales)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const start = new Date(now);
              start.setHours(0, 0, 0, 0);
              const end = new Date(now);
              end.setHours(23, 59, 59, 999);
              setDateRange({ startDate: start, endDate: end });
            }}
            className="min-h-[44px] px-3.5 py-1.5 rounded-lg border-border border-crisp bg-card hover:bg-background text-text/80 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="Reset to today"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{language === 'th' ? 'วันนี้' : 'Today'}</span>
          </button>
        </div>
      </div>

      {/* Warning Notification for Low Stock */}
      {!isLoading && lowStockProducts.length > 0 && (
        <div className="p-4 sm:p-5 rounded-lg bg-amber-500/10 border-border border-crisp shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="p-2.5 rounded-lg bg-amber-500 text-white shrink-0 shadow-xs flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 animate-bounce" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <span>{language === 'th' ? 'แจ้งเตือนระบบ: ระดับสินค้าคงคลังต่ำกว่าเกณฑ์' : 'System Alert: Critical Low Stock Detected'}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {lowStockProducts.length} {language === 'th' ? 'รายการ' : 'SKUs'}
                </span>
              </h3>
              <p className="text-[11.5px] text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed">
                {language === 'th'
                  ? `ตรวจพบสินค้าคงเหลือต่ำกว่าเกณฑ์ควบคุมที่คุณตั้งค่าไว้ (${lowStockThreshold} ชิ้น) กรุณาดำเนินการสั่งซื้อหรือเติมสต็อกเพื่อหลีกเลี่ยงสินค้าขาดตอน`
                  : `There are ${lowStockProducts.length} products that have dropped below your user-defined threshold of ${lowStockThreshold} units. Please replenish inventory immediately to prevent order disruption.`}
              </p>
              
              {/* Quick list of top low-stock products */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {lowStockProducts.slice(0, 4).map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-card border-border border-crisp text-[10.5px] font-medium text-amber-900 dark:text-amber-300 font-sans">
                    <span className="font-bold truncate max-w-[120px]">{p.name}</span>
                    <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{p.currentStock} {p.unitOfMeasure}</span>
                  </span>
                ))}
                {lowStockProducts.length > 4 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-500/10 text-[10.5px] font-bold text-amber-700 dark:text-amber-300">
                    +{lowStockProducts.length - 4} more
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            size="md"
            variant="secondary"
            onClick={() => onNavigate('inventory')}
            leftIcon={<ArrowUpRight className="h-4 w-4" />}
            className="w-full md:w-auto text-xs font-bold shrink-0 self-stretch md:self-center bg-card hover:bg-background text-text border-border border-crisp transition-colors cursor-pointer min-h-[44px]"
          >
            {language === 'th' ? 'จัดการคลังสินค้า' : 'Replenish Inventory'}
          </Button>
        </div>
      )}

      {/* 3. Responsive Primary KPI Metrics Grid (1-col on mobile, 2-col on sm/md, 4-col on lg/xl/2xl) */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isFinancialAuthorized ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-3 sm:gap-4 lg:gap-5`}>
        {/* Card 1: Selected Period Net Revenue */}
        {isFinancialAuthorized && (
        <Card className="hover:border-primary/40 transition-all shadow-2xs">
          <CardBody className="p-4 sm:p-5 lg:p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-text/70 uppercase tracking-wider">
                <span>{language === 'th' ? 'รายได้สุทธิ (ช่วงที่เลือก)' : 'Period Net Revenue'}</span>
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-9 w-32 mt-2" />
              ) : (
                <div className="mt-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-text">
                  {formatMoney(metrics.netSales)}
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-border text-[11px] text-text/70 font-medium flex items-center justify-between">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+14.2%</span>
              </span>
              <span className="truncate">{language === 'th' ? 'คำนวณตามรอบที่เลือก' : 'based on range'}</span>
            </div>
          </CardBody>
        </Card>
        )}

        {/* Card 2: Completed Transactions & AOV */}
        {isFinancialAuthorized && (
        <Card className="hover:border-border transition-all shadow-2xs">
          <CardBody className="p-4 sm:p-5 lg:p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-text/70 uppercase tracking-wider">
                <span>{language === 'th' ? 'บิลที่สำเร็จ' : 'Transactions'}</span>
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Receipt className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-9 w-24 mt-2" />
              ) : (
                <div className="mt-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-text">
                  {metrics.ordersCount} <span className="text-xs font-sans font-medium text-text/50">{language === 'th' ? 'บิล' : 'bills'}</span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-border text-[11px] text-text/70 font-medium flex items-center justify-between">
              <span>{t.dashboard.avgBasket}:</span>
              <span className="font-mono font-bold text-text">
                {formatMoney(metrics.avgOrderValue)}
              </span>
            </div>
          </CardBody>
        </Card>
        )}

        {/* Card 3: Shift Drawer Cash & Register */}
        <Card className="hover:border-emerald-500/40 transition-all shadow-2xs">
          <CardBody className="p-4 sm:p-5 lg:p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-text/70 uppercase tracking-wider">
                <span>{language === 'th' ? 'เงินสดในลิ้นชัก' : 'Shift Drawer Cash'}</span>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Banknote className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-9 w-32 mt-2" />
              ) : currentShift ? (
                <div className="mt-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-text">
                  {formatMoney(currentShift.expectedCashInDrawer)}
                </div>
              ) : (
                <div className="mt-2 text-sm font-bold text-amber-600 dark:text-amber-400">
                  {t.shift.noActiveShift}
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-border text-[11px] text-text/70 font-medium flex items-center justify-between">
              <span>{language === 'th' ? 'สถานะกะ:' : 'Shift status:'}</span>
              <Badge variant={currentShift ? 'success' : 'warning'} size="sm" dot>
                {currentShift ? `${language === 'th' ? 'เปิดอยู่' : 'Open'} (${currentShift.registerId})` : (language === 'th' ? 'ยังไม่เปิด' : 'No Shift')}
              </Badge>
            </div>
          </CardBody>
        </Card>

        {/* Card 4: Inventory & Outbox Alerts */}
        <Card className="hover:border-amber-500/40 transition-all shadow-2xs">
          <CardBody className="p-4 sm:p-5 lg:p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-text/70 uppercase tracking-wider">
                <span>{language === 'th' ? 'การแจ้งเตือนระบบ' : 'Operational Alerts'}</span>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-text">
                  {metrics.lowStockCount + metrics.outOfStockCount}
                </span>
                <span className="text-xs text-text/70">
                  {language === 'th' ? 'รายการต้องเติมสต็อก' : 'items need restock'}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border text-[11px] text-text/70 flex items-center justify-between">
              <span>{language === 'th' ? 'รอซิงก์ออฟไลน์:' : 'Offline Outbox:'}</span>
              <Badge variant={pendingCount > 0 ? 'warning' : 'neutral'} size="sm">
                {pendingCount} {t.common.pending}
              </Badge>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 4. Secondary Performance Metric Strip */}
      <div className={`grid grid-cols-2 ${isFinancialAuthorized ? 'md:grid-cols-4' : ''} gap-2.5 sm:gap-3.5 lg:gap-4`}>
        {/* Metric A: Total Items Sold */}
        <div className="p-3.5 sm:p-4 rounded-lg border-border border-crisp bg-card shadow-2xs">
          <div className="flex items-center gap-2 text-text/70 text-xs font-medium">
            <Boxes className="h-3.5 w-3.5 text-primary" />
            <span>{language === 'th' ? 'จำนวนชิ้นที่ขาย' : 'Items Sold'}</span>
          </div>
          <div className="mt-1 text-lg sm:text-xl font-mono font-black text-text">
            {metrics.totalItemsSold} <span className="text-[11px] font-sans font-normal text-text/50">{language === 'th' ? 'ชิ้น' : 'units'}</span>
          </div>
        </div>

        {/* Metric B: Cash Payments */}
        {isFinancialAuthorized && (
        <div className="p-3.5 sm:p-4 rounded-lg border-border border-crisp bg-card shadow-2xs">
          <div className="flex items-center gap-2 text-text/70 text-xs font-medium">
            <Banknote className="h-3.5 w-3.5 text-emerald-500" />
            <span>{language === 'th' ? 'ยอดขายเงินสด' : 'Cash Sales'}</span>
          </div>
          <div className="mt-1 text-lg sm:text-xl font-mono font-black text-text">
            {formatMoney(metrics.cashSales)}
          </div>
        </div>
        )}

        {/* Metric C: Digital Payments (Card / QR) */}
        {isFinancialAuthorized && (
        <div className="p-3.5 sm:p-4 rounded-lg border-border border-crisp bg-card shadow-2xs">
          <div className="flex items-center gap-2 text-text/70 text-xs font-medium">
            <QrCode className="h-3.5 w-3.5 text-indigo-500" />
            <span>{language === 'th' ? 'ยอดขายพร้อมเพย์ / บัตร' : 'Digital / QR'}</span>
          </div>
          <div className="mt-1 text-lg sm:text-xl font-mono font-black text-text">
            {formatMoney(metrics.digitalSales)}
          </div>
        </div>
        )}

        {/* Metric D: Active Catalog SKU Count */}
        <div className="p-3.5 sm:p-4 rounded-lg border-border border-crisp bg-card shadow-2xs">
          <div className="flex items-center gap-2 text-text/70 text-xs font-medium">
            <Layers className="h-3.5 w-3.5 text-text/50" />
            <span>{language === 'th' ? 'สินค้าในแคตตาล็อก' : 'Catalog Items'}</span>
          </div>
          <div className="mt-1 text-lg sm:text-xl font-mono font-black text-text">
            {metrics.totalInventoryCount} <span className="text-[11px] font-sans font-normal text-text/50">SKUs</span>
          </div>
        </div>
      </div>

      {/* 4. Visual Hourly Sales Velocity & Action Bento Grid (Responsive 12-Column Layout) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Hourly Sales Trend Visualizer (Spans 8 columns on large screens) */}
        {isFinancialAuthorized && (
        <Card className="w-full lg:w-[50%]">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-text flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span>{t.dashboard.hourlyVolume}</span>
                </h3>
                <p className="text-xs text-text/70 mt-0.5">
                  {language === 'th' ? 'แนวโน้มยอดขายและปริมาณคำสั่งซื้อประจำชั่วโมง' : 'Peak operational volume and hourly velocity'}
                </p>
              </div>
              
              {/* Metric Toggle Buttons */}
              <div className="flex items-center gap-1 p-1 bg-background rounded-lg border-border border-crisp">
                <button
                  type="button"
                  onClick={() => setActiveChartMetric('sales')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeChartMetric === 'sales'
                      ? 'bg-card text-primary shadow-2xs'
                      : 'text-text/70 hover:text-text'
                  }`}
                >
                  {language === 'th' ? 'ยอดขาย ($)' : 'Sales ($)'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartMetric('orders')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeChartMetric === 'orders'
                      ? 'bg-card text-primary shadow-2xs'
                      : 'text-text/70 hover:text-text'
                  }`}
                >
                  {language === 'th' ? 'จำนวนบิล' : 'Orders'}
                </button>
              </div>
            </div>
          </CardHeader>

          <CardBody className="p-4 sm:p-6">
            {/* Custom High-Fidelity SVG Curve Chart */}
            <div className="relative w-full select-none">
              <svg
                viewBox="0 0 500 220"
                className="w-full h-auto overflow-visible"
              >
                <defs>
                  {/* Premium Royal Blue Gradient Area Fill */}
                  <linearGradient id="chartGlowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {/* Horizontal Dotted Gridlines for Depth */}
                <line x1="35" y1="30" x2="480" y2="30" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                <line x1="35" y1="75" x2="480" y2="75" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                <line x1="35" y1="120" x2="480" y2="120" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                <line x1="35" y1="165" x2="480" y2="165" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />

                {/* Render the fading gradient Area path under the curve */}
                {(() => {
                  const svgWidth = 500;
                  const svgHeight = 220;
                  const paddingLeft = 35;
                  const paddingRight = 20;
                  const paddingTop = 30;
                  const paddingBottom = 40;
                  const chartWidth = svgWidth - paddingLeft - paddingRight;
                  const chartHeight = svgHeight - paddingTop - paddingBottom;
                  const maxVal = activeChartMetric === 'sales' ? maxAmount : maxOrders;

                  const points = hourlyData.map((d, index) => {
                    const x = paddingLeft + (index / (hourlyData.length - 1)) * chartWidth;
                    const currentVal = activeChartMetric === 'sales' ? d.amount : d.orders;
                    const y = svgHeight - paddingBottom - (currentVal / maxVal) * chartHeight;
                    return { x, y };
                  });

                  // Cubic bezier interpolation for smooth curve
                  const buildBezierPath = (pts: { x: number, y: number }[]) => {
                    if (pts.length === 0) return '';
                    let d = `M ${pts[0].x} ${pts[0].y}`;
                    for (let i = 0; i < pts.length - 1; i++) {
                      const p0 = pts[i];
                      const p1 = pts[i + 1];
                      const cpX1 = p0.x + (p1.x - p0.x) / 3;
                      const cpY1 = p0.y;
                      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
                      const cpY2 = p1.y;
                      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
                    }
                    return d;
                  };

                  const linePath = buildBezierPath(points);
                  const areaPath = points.length > 0
                    ? `${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingBottom} L ${points[0].x} ${svgHeight - paddingBottom} Z`
                    : '';

                  return (
                    <>
                      {/* Fading area */}
                      {areaPath && (
                        <path
                          d={areaPath}
                          fill="url(#chartGlowGradient)"
                        />
                      )}

                      {/* Main elegant curved trendline */}
                      {linePath && (
                        <path
                          d={linePath}
                          fill="none"
                          stroke="var(--primary-color)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          className="transition-all duration-300"
                        />
                      )}

                      {/* Vertical tracking cursor line on hover */}
                      {hoveredIndex !== null && points[hoveredIndex] && (
                        <line
                          x1={points[hoveredIndex].x}
                          y1={paddingTop}
                          x2={points[hoveredIndex].x}
                          y2={svgHeight - paddingBottom}
                          stroke="var(--primary-color)"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                          opacity="0.8"
                        />
                      )}

                      {/* Invisible wider hover bars for precise mouse detection */}
                      {points.map((pt, i) => {
                        const stepHalf = chartWidth / (hourlyData.length - 1) / 2;
                        return (
                          <rect
                            key={`hover-${i}`}
                            x={pt.x - stepHalf}
                            y={paddingTop}
                            width={stepHalf * 2}
                            height={chartHeight}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                          />
                        );
                      })}

                      {/* Data Dots */}
                      {points.map((pt, i) => {
                        const isSelected = hoveredIndex === i;
                        const isPeak = activeChartMetric === 'sales'
                          ? hourlyData[i].amount === maxAmount
                          : hourlyData[i].orders === maxOrders;

                        return (
                          <g key={i}>
                            {/* Outer glowing pulsing ring */}
                            {(isSelected || isPeak) && (
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={isSelected ? "9" : "6"}
                                fill="var(--primary-color)"
                                opacity="0.25"
                                className="pointer-events-none transition-all duration-150"
                              />
                            )}
                            {/* Inner white circle with dark primary border */}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isSelected ? "4.5" : "3.5"}
                              fill="var(--card-color)"
                              stroke="var(--primary-color)"
                              strokeWidth={isSelected ? "2.5" : "2"}
                              className="pointer-events-none transition-all duration-150"
                            />
                          </g>
                        );
                      })}

                      {/* Horizontal bottom label text ticks (Hours) */}
                      {points.map((pt, i) => {
                        const isSelected = hoveredIndex === i;
                        return (
                          <text
                            key={i}
                            x={pt.x}
                            y={svgHeight - 15}
                            textAnchor="middle"
                            className={`text-[9px] font-bold transition-all duration-150 pointer-events-none ${
                              isSelected ? 'fill-primary' : 'fill-text/50'
                            }`}
                          >
                            {hourlyData[i].hour}
                          </text>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>

              {/* Float-over Rich Tooltip (Interactive HTML layout overlaid perfectly) */}
              <div className="absolute top-2 right-2 min-h-[36px] bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border border-crisp shadow-md flex flex-col pointer-events-none transition-all duration-200">
                {hoveredIndex !== null ? (
                  <>
                    <span className="text-[10px] uppercase font-bold text-text/50 tracking-wider font-mono">
                      {hourlyData[hoveredIndex].hour}
                    </span>
                    <span className="text-xs font-black font-mono text-primary leading-tight">
                      {activeChartMetric === 'sales'
                        ? `$${hourlyData[hoveredIndex].amount} USD`
                        : `${hourlyData[hoveredIndex].orders} ${language === 'th' ? 'บิลสำเร็จ' : 'bills'}`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] uppercase font-bold text-text/50 tracking-wider font-mono">
                      {language === 'th' ? 'ช่วงเวลาสูงสุด' : 'PEAK'} (12 PM)
                    </span>
                    <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 leading-tight">
                      {activeChartMetric === 'sales' ? `$310 USD` : `28 bills`}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-text/70">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span>{language === 'th' ? 'ช่วงเวลาขายดีที่สุด: 12:00 PM (ช่วงมื้อเที่ยง)' : 'Peak Trading Velocity: 12:00 PM (Lunch Rush)'}</span>
              </div>
              <Badge variant="neutral" size="sm">
                {language === 'th' ? 'รวม 10 ชั่วโมง' : '10 Hours Logged'}
              </Badge>
            </div>
          </CardBody>
        </Card>
        )}

        {/* Operational Quick Launchpad Hub (Spans 4 columns on large screens) */}
        <Card className={`w-full ${isFinancialAuthorized ? 'lg:w-[50%]' : ''} flex flex-col justify-between`}>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <h3 className="text-sm sm:text-base font-bold text-text flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>{language === 'th' ? 'เมนูลัดการทำงาน' : 'Quick Actions'}</span>
              </h3>
              <Badge variant="primary" size="sm">
                Shortcuts
              </Badge>
            </div>
          </CardHeader>

          <CardBody className="p-3 sm:p-4 space-y-2 sm:space-y-2.5 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              {/* Action 1: POS Screen */}
              <button
                type="button"
                onClick={() => onNavigate('pos')}
                className="w-full p-3 rounded-lg border-border border-crisp hover:border-primary/40 bg-background hover:bg-card flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-text group-hover:text-primary truncate">
                      {language === 'th' ? 'เปิดหน้าขาย POS Terminal' : 'Open POS Terminal'}
                    </div>
                    <div className="text-[11px] text-text/70 truncate">
                      {language === 'th' ? 'สแกนบาร์โค้ด & รับชำระเงิน' : 'Ring up sales & barcode scan'}
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-text/40 group-hover:text-primary shrink-0" />
              </button>

              {/* Action 2: Shift Drawer */}
              <button
                type="button"
                onClick={() => onNavigate('shift')}
                className="w-full p-3 rounded-lg border-border border-crisp hover:border-emerald-500/40 bg-background hover:bg-card flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-text group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                      {language === 'th' ? 'กะการทำงาน & เงินสดยกมา' : 'Cash Drawer & Shifts'}
                    </div>
                    <div className="text-[11px] text-text/70 truncate">
                      {language === 'th' ? 'นำเงินเข้า / จ่ายออก / ปิดกะ' : 'Float, pay in/out & reconcile'}
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-text/40 group-hover:text-emerald-600 shrink-0" />
              </button>

              {/* Action 3: Inventory Stock */}
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="w-full p-3 rounded-lg border-border border-crisp hover:border-purple-500/40 bg-background hover:bg-card flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-text group-hover:text-purple-500 truncate">
                      {t.inventory.title}
                    </div>
                    <div className="text-[11px] text-text/70 truncate">
                      {language === 'th' ? 'ปรับสต็อก & บัญชีแยกประเภท' : 'Stock ledger & adjust counts'}
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-text/40 group-hover:text-purple-500 shrink-0" />
              </button>

              {/* Action 4: Customers CRM */}
              <button
                type="button"
                onClick={() => onNavigate('customers')}
                className="w-full p-3 rounded-lg border-border border-crisp hover:border-blue-500/40 bg-background hover:bg-card flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-text group-hover:text-blue-500 truncate">
                      {language === 'th' ? 'ระบบสมาชิกลูกค้า' : 'Customer Loyalty CRM'}
                    </div>
                    <div className="text-[11px] text-text/70 truncate">
                      {language === 'th' ? 'สะสมแต้ม & ประวัติการซื้อ' : 'Points, tiers & member cards'}
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-text/40 group-hover:text-blue-500 shrink-0" />
              </button>
            </div>

            {/* Hardware & Offline Sync Diagnostic Bar */}
            <div className="mt-3 p-2.5 rounded-lg bg-background border-border border-crisp flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-text">
                  {language === 'th' ? 'อุปกรณ์ POS ออนไลน์' : 'POS Hardware Online'}
                </span>
              </div>
              <span className="text-text/50 font-mono text-[10px]">
                {session?.registerId}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 5. Recent Transactions & Orders (Responsive Grid Cards on Mobile/Tablet, Data Table on Desktop) */}
      <Card className="shadow-2xs">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-text flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span>{t.dashboard.recentOrders}</span>
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-lg bg-primary/10 text-primary border border-primary/20">
                  {filteredOrders.length} {language === 'th' ? 'รายการในช่วงที่เลือก' : 'in range'}
                </span>
              </div>
              <p className="text-xs text-text/70 mt-0.5">
                {language === 'th' ? 'รายการขายที่บันทึกตามช่วงเวลาที่กำหนด' : 'Authoritative transaction sequence for selected date period'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('orders')} rightIcon={<ChevronRight className="h-4 w-4" />} className="min-h-[36px] self-start sm:self-auto">
              {t.dashboard.viewAllOrders}
            </Button>
          </div>
        </CardHeader>
        
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary mx-auto flex items-center justify-center border border-primary/20">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-text">
                {language === 'th' ? 'ไม่พบรายการขายในช่วงเวลาที่เลือก' : 'No transactions recorded in this date range'}
              </h4>
              <p className="text-xs text-text/70 max-w-sm mx-auto">
                {language === 'th'
                  ? 'ลองปรับเปลี่ยนวันที่เริ่มต้นและสิ้นสุดในตัวเลือกด้านบน หรือคลิกเพื่อรีเซ็ตกลับเป็นข้อมูลวันนี้'
                  : 'Try adjusting your start and end dates in the date range picker above, or reset to Today.'}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const now = new Date();
                const start = new Date(now);
                start.setHours(0, 0, 0, 0);
                const end = new Date(now);
                end.setHours(23, 59, 59, 999);
                setDateRange({ startDate: start, endDate: end });
              }}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              className="mt-2 min-h-[44px]"
            >
              {language === 'th' ? 'รีเซ็ตเป็นวันนี้' : 'Reset to Today'}
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile & Small Tablet: Responsive 1-col or 2-col Card Grid */}
            <div className="lg:hidden p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredOrders.slice(0, 8).map((order) => (
                <div
                  key={order.id}
                  className="p-3.5 rounded-lg border-border border-crisp bg-background shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-text">
                      {order.orderNumber}
                    </span>
                    <span className="font-mono font-bold text-sm text-text">
                      {formatMoney(order.totals.grandTotal)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-[11px] text-text/70 pt-1 border-t border-border">
                    <span>{order.customer ? order.customer.name : t.pos.walkIn}</span>
                    <span className="font-mono">
                      {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border text-[10.5px]">
                    <span className="font-semibold text-text/80">
                      {order.payments[0]?.method === 'cash' ? t.checkout.cash : order.payments[0]?.method === 'card' ? t.checkout.card : t.checkout.promptpay}
                    </span>
                    {order.status === 'server_confirmed' ? (
                      <Badge variant="success" size="sm" dot>
                        {t.orders.completed}
                      </Badge>
                    ) : order.status === 'pending_sync_offline' ? (
                      <Badge variant="offline" size="sm" dot>
                        {language === 'th' ? 'รอซิงก์' : 'Pending'}
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        {order.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Large Tablet & Desktop: Full Authoritative Data Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-text/70 bg-card font-medium">
                    <th className="py-3.5 px-5">{t.orders.orderNumber}</th>
                    <th className="py-3.5 px-4">{t.orders.dateTime}</th>
                    <th className="py-3.5 px-4">{t.orders.cashier}</th>
                    <th className="py-3.5 px-4">{t.orders.customer}</th>
                    <th className="py-3.5 px-4">{t.orders.payment}</th>
                    <th className="py-3.5 px-4">{t.orders.status}</th>
                    <th className="py-3.5 px-5 text-right">{t.orders.total}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.slice(0, 8).map((order) => (
                    <tr key={order.id} className="hover:bg-background/80 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-text">
                        {order.orderNumber}
                      </td>
                      <td className="py-3.5 px-4 text-text/70 font-mono">
                        {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 text-text">
                        {order.cashierName}
                      </td>
                      <td className="py-3.5 px-4 text-text/70">
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
                        ) : (
                          <Badge variant="neutral" size="sm">
                            {order.status}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-text">
                        {formatMoney(order.totals.grandTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
