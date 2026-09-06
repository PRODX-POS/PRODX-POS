import React, { useState, useEffect, useMemo } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  ArrowUpRight,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Layers,
  ShieldCheck,
  HelpCircle,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';
import { useOffline } from '../../context/OfflineContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Button } from './Button';
import { Badge } from './Badge';
import { OutboxItem } from '../../domain/sync';

export interface OfflineSyncProgressIndicatorProps {
  className?: string;
  showQueueList?: boolean;
  compact?: boolean;
  onSyncComplete?: () => void;
}

export const OfflineSyncProgressIndicator: React.FC<OfflineSyncProgressIndicatorProps> = ({
  className = '',
  showQueueList = true,
  compact = false,
  onSyncComplete,
}) => {
  const { language } = useLanguage();
  const { addToast } = useToast();
  const {
    isOnline,
    isSimulatedOffline,
    outbox,
    pendingCount,
    syncedCount,
    failedCount,
    isSyncing,
    lastSyncedAt,
    triggerSync,
    clearSyncedItems,
    clearOutbox,
    queueOutboxItem,
    toggleSimulatedOffline,
  } = useOffline();

  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Periodically refresh relative time ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const totalItems = outbox.length;
  const inProgressCount = outbox.filter((i) => i.syncState === 'syncing').length;

  // Calculate overall sync percentage
  const syncPercentage = useMemo(() => {
    if (totalItems === 0) return 100;
    const completedWeight = syncedCount * 100;
    const syncingWeight = inProgressCount * 50;
    const percent = Math.round((completedWeight + syncingWeight) / totalItems);
    return Math.min(100, Math.max(0, percent));
  }, [totalItems, syncedCount, inProgressCount]);

  // Relative formatted last synced time
  const formattedLastSynced = useMemo(() => {
    if (!lastSyncedAt) {
      return language === 'th' ? 'ยังไม่มีประวัติซิงก์ในเซสชันนี้' : 'No sync in this session';
    }
    try {
      const syncTime = new Date(lastSyncedAt).getTime();
      const diffSec = Math.floor((now - syncTime) / 1000);

      if (diffSec < 15) {
        return language === 'th' ? 'เมื่อสักครู่นี้' : 'Just now';
      }
      if (diffSec < 60) {
        return language === 'th' ? `${diffSec} วินาทีที่แล้ว` : `${diffSec}s ago`;
      }
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) {
        return language === 'th' ? `${diffMin} นาทีที่แล้ว` : `${diffMin}m ago`;
      }
      return new Date(lastSyncedAt).toLocaleTimeString();
    } catch {
      return lastSyncedAt;
    }
  }, [lastSyncedAt, now, language]);

  // Trigger Manual Sync All
  const handleManualSyncAll = async () => {
    if (!isOnline) {
      addToast({
        type: 'warning',
        title: language === 'th' ? 'ไม่สามารถซิงก์ได้' : 'Cannot Synchronize',
        message:
          language === 'th'
            ? 'กรุณาเชื่อมต่ออินเทอร์เน็ตหรือปิดโหมดจำลองออฟไลน์ก่อนเริ่มซิงก์'
            : 'Please reconnect or disable simulated offline mode first.',
      });
      return;
    }

    try {
      await triggerSync();
      if (onSyncComplete) onSyncComplete();
      addToast({
        type: 'success',
        title: language === 'th' ? 'ซิงก์ข้อมูล Outbox สำเร็จ' : 'Sync All Complete',
        message:
          language === 'th'
            ? 'ข้อมูลธุรกรรมออฟไลน์ทั้งหมดถูกบันทึกขึ้นระบบหลักเรียบร้อยแล้ว'
            : 'All queued offline transactions have been synchronized to server.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: language === 'th' ? 'การซิงก์ข้อมูลบางส่วนขัดข้อง' : 'Sync Incomplete',
        message: String(err?.message || err),
      });
    }
  };

  // Helper to add a mock offline transaction for quick testing
  const handleAddTestOfflineTransaction = () => {
    const mockOrderNum = Math.floor(1000 + Math.random() * 9000);
    const mockIdempotency = `idem-test-${Date.now()}-${mockOrderNum}`;
    queueOutboxItem('order_transaction', mockIdempotency, {
      mockTitle: `Offline Test Sale #${mockOrderNum}`,
      total: 450,
      timestamp: new Date().toISOString(),
    });

    addToast({
      type: 'info',
      title: language === 'th' ? 'เพิ่มรายการจำลองในคิวแล้ว' : 'Test Transaction Queued',
      message:
        language === 'th'
          ? `ธุรกรรม #${mockOrderNum} ถูกบันทึกลง Outbox เพื่อรอส่งขึ้นคลาวด์`
          : `Mock order #${mockOrderNum} added to local offline queue.`,
    });
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'order_transaction':
        return <ShoppingBag className="h-3.5 w-3.5 text-blue-500" />;
      case 'shift_movement':
        return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      case 'stock_adjustment':
        return <Layers className="h-3.5 w-3.5 text-emerald-500" />;
      default:
        return <Database className="h-3.5 w-3.5 text-indigo-500" />;
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'order_transaction':
        return language === 'th' ? 'บิลการขาย (Order)' : 'Order Transaction';
      case 'shift_movement':
        return language === 'th' ? 'การเคลื่อนไหวเงินกะ (Shift)' : 'Shift Movement';
      case 'stock_adjustment':
        return language === 'th' ? 'ปรับปรุงสต็อก (Stock)' : 'Stock Adjustment';
      default:
        return type;
    }
  };

  return (
    <div
      className={`rounded-xl border border-border border-crisp bg-card shadow-sm overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-border border-crisp bg-background/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}
          >
            {isSyncing ? (
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            ) : isOnline ? (
              <Wifi className="h-5 w-5" />
            ) : (
              <WifiOff className="h-5 w-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-text">
                {language === 'th'
                  ? 'สถานะการซิงก์ข้อมูลออฟไลน์ (Outbox Sync Engine)'
                  : 'Offline Outbox Sync Status'}
              </h3>
              <Badge
                variant={isSyncing ? 'primary' : isOnline ? 'success' : 'warning'}
                size="sm"
                dot
              >
                {isSyncing
                  ? language === 'th'
                    ? 'กำลังซิงก์ข้อมูล...'
                    : 'Syncing in progress...'
                  : isOnline
                  ? language === 'th'
                    ? 'เชื่อมต่อคลาวด์ปกติ (Online)'
                    : 'Online'
                  : language === 'th'
                  ? 'โหมดออฟไลน์ (Offline)'
                  : 'Offline'}
              </Badge>
              {isSimulatedOffline && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {language === 'th' ? 'จำลองออฟไลน์' : 'Simulated'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-text/50 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 opacity-60" />
                <span>
                  {language === 'th' ? 'ซิงก์ล่าสุด:' : 'Last Synced:'} {formattedLastSynced}
                </span>
              </span>
              <span>·</span>
              <span className="font-mono">
                {pendingCount} {language === 'th' ? 'รอส่ง' : 'pending'} / {totalItems}{' '}
                {language === 'th' ? 'ทั้งหมด' : 'total'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Sync All & Test Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTestOfflineTransaction}
            className="rounded-lg text-xs font-semibold h-8"
            title={language === 'th' ? 'เพิ่มออเดอร์จำลองเพื่อทดสอบคิว' : 'Add mock transaction'}
            leftIcon={<PlusCircle className="h-3.5 w-3.5 text-primary" />}
          >
            {language === 'th' ? '+ รายการทดสอบ' : '+ Test Queue'}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleManualSyncAll}
            isLoading={isSyncing}
            disabled={!isOnline || (pendingCount === 0 && failedCount === 0)}
            className="rounded-lg font-bold text-xs h-8 shadow-xs"
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
          >
            {language === 'th' ? 'ซิงก์ข้อมูลทั้งหมด (Sync All)' : 'Sync All'}
          </Button>
        </div>
      </div>

      {/* Real-time Progress Bar & Metric Stats */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Progress Bar Container */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-text flex items-center gap-1.5">
              <span>{language === 'th' ? 'ความคืบหน้าการส่งข้อมูล' : 'Synchronization Progress'}</span>
              {isSyncing && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              )}
            </span>
            <span className="font-mono font-bold text-primary text-xs">{syncPercentage}%</span>
          </div>

          {/* Graphical Progress Track */}
          <div className="h-3 w-full rounded-full bg-background border border-border/80 overflow-hidden relative flex p-0.5">
            {/* Synced Portion */}
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                failedCount > 0
                  ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                  : 'bg-gradient-to-r from-blue-600 via-primary to-emerald-500'
              } ${isSyncing ? 'animate-pulse' : ''}`}
              style={{ width: `${syncPercentage}%` }}
            />
          </div>
        </div>

        {/* 4-Stat Metric Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* 1. Pending */}
          <div className="p-2.5 sm:p-3 rounded-lg border border-border border-crisp bg-background/60 flex flex-col justify-between">
            <div className="text-[10px] font-bold text-text/50 uppercase tracking-wider">
              {language === 'th' ? 'รอส่ง (Queued)' : 'Queued'}
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-mono font-black text-amber-600 dark:text-amber-400">
                {pendingCount}
              </span>
              <span className="text-[10px] text-text/40 font-mono">
                {totalItems > 0 ? `${Math.round((pendingCount / totalItems) * 100)}%` : '0%'}
              </span>
            </div>
          </div>

          {/* 2. In Sync */}
          <div className="p-2.5 sm:p-3 rounded-lg border border-border border-crisp bg-background/60 flex flex-col justify-between">
            <div className="text-[10px] font-bold text-text/50 uppercase tracking-wider">
              {language === 'th' ? 'กำลังซิงก์' : 'In Sync'}
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-mono font-black text-primary">
                {inProgressCount}
              </span>
              <span className="text-[10px] text-text/40 font-mono">
                {inProgressCount > 0 ? (
                  <RefreshCw className="h-3 w-3 animate-spin text-primary inline" />
                ) : (
                  '0'
                )}
              </span>
            </div>
          </div>

          {/* 3. Synced */}
          <div className="p-2.5 sm:p-3 rounded-lg border border-border border-crisp bg-background/60 flex flex-col justify-between">
            <div className="text-[10px] font-bold text-text/50 uppercase tracking-wider">
              {language === 'th' ? 'สำเร็จ (Synced)' : 'Synced'}
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400">
                {syncedCount}
              </span>
              <span className="text-[10px] text-text/40 font-mono">
                {totalItems > 0 ? `${Math.round((syncedCount / totalItems) * 100)}%` : '100%'}
              </span>
            </div>
          </div>

          {/* 4. Failed */}
          <div className="p-2.5 sm:p-3 rounded-lg border border-border border-crisp bg-background/60 flex flex-col justify-between">
            <div className="text-[10px] font-bold text-text/50 uppercase tracking-wider">
              {language === 'th' ? 'ขัดข้อง (Failed)' : 'Failed'}
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span
                className={`text-lg font-mono font-black ${
                  failedCount > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-text/40'
                }`}
              >
                {failedCount}
              </span>
              <span className="text-[10px] text-text/40 font-mono">
                {failedCount > 0 ? (
                  <AlertCircle className="h-3 w-3 text-rose-500 inline" />
                ) : (
                  '0'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Outbox Transaction List */}
        {showQueueList && (
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-primary" />
                <span>
                  {language === 'th'
                    ? 'รายการธุรกรรมในคิว Outbox (Transaction Queue)'
                    : 'Outbox Transaction Queue'}
                </span>
              </span>

              {/* Auxiliary queue management buttons */}
              <div className="flex items-center gap-1.5">
                {syncedCount > 0 && (
                  <button
                    type="button"
                    onClick={clearSyncedItems}
                    className="text-[11px] font-semibold text-text/60 hover:text-text px-2 py-1 rounded-md bg-background border border-border hover:bg-card transition-colors cursor-pointer"
                  >
                    {language === 'th' ? 'ล้างรายการที่สำเร็จ' : 'Clear Synced'}
                  </button>
                )}
                {totalItems > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearOutbox();
                      addToast({
                        type: 'info',
                        title: language === 'th' ? 'ล้าง Outbox ทั้งหมดแล้ว' : 'Outbox Cleared',
                      });
                    }}
                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    {language === 'th' ? 'ล้างคิวทั้งหมด' : 'Clear All'}
                  </button>
                )}
              </div>
            </div>

            {outbox.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border/80 bg-background/40 text-center space-y-1.5">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto opacity-90" />
                <div className="text-xs font-bold text-text">
                  {language === 'th'
                    ? 'คิว Outbox ว่างเปล่า — ทุกธุรกรรมส่งขึ้นระบบแล้ว 100%'
                    : 'Outbox queue is empty — all transactions 100% synchronized'}
                </div>
                <p className="text-[11px] text-text/50 max-w-sm mx-auto">
                  {language === 'th'
                    ? 'เมื่อคุณเปิดบิลขายหรือบันทึกข้อมูลขณะเน็ตหลุด รายการจะถูกจัดคิวไว้ที่นี่พร้อมกุญแจ Idempotency อัตโนมัติ'
                    : 'When transactions are performed offline, they are automatically queued here with idempotency keys.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                {outbox.map((item: OutboxItem) => {
                  const isExpanded = expandedItem === item.id;
                  const isItemSynced = item.syncState === 'synced';
                  const isItemFailed = item.syncState === 'failed';
                  const isItemSyncing = item.syncState === 'syncing';

                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border transition-all duration-150 text-xs overflow-hidden ${
                        isItemFailed
                          ? 'border-rose-500/30 bg-rose-500/5'
                          : isItemSynced
                          ? 'border-border/60 bg-background/40 opacity-80'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div
                        onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                        className="p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-background/80 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-md bg-background border border-border shrink-0">
                            {getItemTypeIcon(item.type)}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-text truncate">
                                #{item.id.slice(0, 12)}
                              </span>
                              <span className="text-[10px] text-text/60 font-medium">
                                {getItemTypeLabel(item.type)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-text/40 font-mono mt-0.5">
                              <span>
                                {item.createdAt
                                  ? new Date(item.createdAt).toLocaleTimeString()
                                  : 'Recently'}
                              </span>
                              <span>·</span>
                              <span>
                                {language === 'th' ? 'พยายาม' : 'Attempts'}: {item.attempts}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isItemSyncing && (
                            <Badge variant="primary" size="sm" className="gap-1">
                              <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                              <span>{language === 'th' ? 'กำลังส่ง' : 'Syncing'}</span>
                            </Badge>
                          )}
                          {isItemSynced && (
                            <Badge variant="success" size="sm" className="gap-1">
                              <Check className="h-2.5 w-2.5" />
                              <span>{language === 'th' ? 'สำเร็จ' : 'Synced'}</span>
                            </Badge>
                          )}
                          {isItemFailed && (
                            <Badge variant="danger" size="sm" className="gap-1">
                              <AlertCircle className="h-2.5 w-2.5" />
                              <span>{language === 'th' ? 'ขัดข้อง' : 'Failed'}</span>
                            </Badge>
                          )}
                          {!isItemSyncing && !isItemSynced && !isItemFailed && (
                            <Badge variant="warning" size="sm">
                              {language === 'th' ? 'รอส่ง' : 'Queued'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Expandable Payload / Error Details */}
                      {isExpanded && (
                        <div className="p-3 border-t border-border/60 bg-background/80 space-y-2 text-[11px] font-mono">
                          <div className="grid grid-cols-2 gap-2 text-text/70">
                            <div>
                              <span className="text-text/40 block text-[10px]">
                                IDEMPOTENCY KEY:
                              </span>
                              <span className="break-all">{item.idempotencyKey}</span>
                            </div>
                            {item.serverConfirmedId && (
                              <div>
                                <span className="text-text/40 block text-[10px]">
                                  SERVER CONFIRMED ID:
                                </span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {item.serverConfirmedId}
                                </span>
                              </div>
                            )}
                          </div>

                          {item.lastError && (
                            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                              <span className="font-bold block text-[10px]">ERROR REASON:</span>
                              <span>{item.lastError}</span>
                            </div>
                          )}

                          <div className="pt-1">
                            <span className="text-text/40 block text-[10px] mb-0.5">
                              PAYLOAD SNAPSHOT:
                            </span>
                            <pre className="p-2 rounded bg-card border border-border text-[10px] text-text/80 overflow-x-auto max-h-24">
                              {JSON.stringify(item.payload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
