import React, { useState, useRef, useEffect } from 'react';
import { useOffline } from '../../context/OfflineContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Clock,
  ArrowRight,
  ShieldCheck,
  X,
  ExternalLink,
  ChevronDown,
  FileText,
  Layers,
  Sparkles,
  AlertCircle,
  RotateCcw,
  Check,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export const ConnectivityBadge: React.FC = () => {
  const {
    isOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    outbox,
    pendingCount,
    syncedCount,
    failedCount,
    isSyncing,
    lastSyncedAt,
    triggerSync,
    clearSyncedItems,
  } = useOffline();

  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalItems = outbox.length;
  const pendingPercentage = totalItems > 0 ? Math.round((pendingCount / totalItems) * 100) : 0;

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return language === 'th' ? 'ยังไม่มีการซิงก์' : 'No sync recorded';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'order_transaction':
        return language === 'th' ? 'คำสั่งซื้อหน้าร้าน' : 'POS Order Transaction';
      case 'shift_movement':
        return language === 'th' ? 'การบันทึกกะ/ลิ้นชัก' : 'Shift Float Event';
      case 'stock_adjustment':
        return language === 'th' ? 'การปรับปรุงสต็อก' : 'Inventory Adjustment';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Persistent App Shell Header Trigger Button */}
      <button
        type="button"
        id="connectivity-status-indicator"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={
          !isOnline
            ? language === 'th'
              ? 'โหมดออฟไลน์: บันทึกรายการลงใน Outbox บนเครื่องอัตโนมัติ (คลิกเพื่อดูรายละเอียด)'
              : 'Offline Mode: Transactions queued locally in browser outbox (Click for details)'
            : pendingCount > 0
            ? language === 'th'
              ? `มี ${pendingCount} ภารกิจรอซิงก์ขึ้นเซิร์ฟเวอร์ (คลิกเพื่อดูรายละเอียด)`
              : `${pendingCount} task(s) pending server synchronization (Click for details)`
            : language === 'th'
            ? 'เชื่อมต่อเซิร์ฟเวอร์เรียบร้อย ข้อมูลทั้งหมดซิงก์แล้ว (คลิกเพื่อดูสถานะระบบ)'
            : 'Online & Fully Synchronized (Click for system diagnostics)'
        }
        className={`group relative flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 min-h-[36px] sm:min-h-[44px] rounded-xl border text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          !isOnline
            ? 'border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200 hover:bg-amber-500/25 ring-1 ring-amber-500/20 shadow-2xs'
            : pendingCount > 0
            ? 'border-orange-500/40 bg-orange-500/10 text-orange-900 dark:text-orange-200 hover:bg-orange-500/20 ring-1 ring-orange-500/20 shadow-2xs'
            : 'border-emerald-500/40 dark:border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:shadow-[0_0_16px_rgba(16,185,129,0.35)]'
        }`}
      >
        {/* Animated Sync-Progress or Modern Rhythmic LIVE Pulse */}
        <div className="relative flex items-center justify-center shrink-0">
          {pendingCount > 0 || totalItems > 0 ? (
            <div className="relative flex items-center justify-center w-4 h-4" title={`${pendingPercentage}% pending (${pendingCount}/${totalItems || pendingCount} items)`}>
              <svg className={`w-4 h-4 transform -rotate-90 animate-in fade-in duration-200 ${isSyncing ? 'animate-pulse' : ''}`} viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-border opacity-40"
                  fill="none"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="var(--primary-color)"
                  strokeWidth="2.5"
                  className="transition-all duration-500 ease-out"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 9}
                  strokeDashoffset={
                    (2 * Math.PI * 9) - ((pendingPercentage / 100) * (2 * Math.PI * 9))
                  }
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[7px] font-mono font-bold" style={{ color: 'var(--primary-color)' }}>
                {pendingCount}
              </span>
            </div>
          ) : !isOnline ? (
            <>
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <WifiOff className="h-3 w-3 text-amber-600 dark:text-amber-400 animate-pulse" />
            </>
          ) : isSyncing ? (
            <RefreshCw className="h-3 w-3 text-emerald-500 animate-spin" />
          ) : (
            /* Premium Rhythmic Animated LIVE Signal Wave & Glowing Pulse Dot */
            <div className="flex items-center gap-1 shrink-0">
              {/* Rhythmic 3-Bar Audio/Signal Equalizer Waves */}
              <div className="flex items-end gap-[1.5px] h-3 w-2.5 shrink-0 justify-center">
                <span className="w-[2px] bg-emerald-500 dark:bg-emerald-400 rounded-full animate-live-bar-1" />
                <span className="w-[2px] bg-emerald-400 dark:bg-emerald-300 rounded-full animate-live-bar-2" />
                <span className="w-[2px] bg-emerald-500 dark:bg-emerald-400 rounded-full animate-live-bar-3" />
              </div>
              {/* Concentric Pulsing Glow Rings */}
              <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
              </span>
            </div>
          )}
        </div>

        {/* Text Labels & Compact LIVE Badge */}
        <div className="flex items-center gap-1 min-w-0">
          {!isOnline ? (
            <div className="flex items-center gap-1">
              <span className="font-bold text-amber-900 dark:text-amber-200 text-[11px]">
                {isSimulatedOffline
                  ? (language === 'th' ? 'ออฟไลน์ (จำลอง)' : 'Offline (Sim)')
                  : (language === 'th' ? 'ออฟไลน์' : 'Offline')}
              </span>
            </div>
          ) : isSyncing ? (
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px] flex items-center gap-1 font-mono">
              <span>{language === 'th' ? 'ซิงก์...' : 'Sync...'}</span>
            </span>
          ) : pendingCount > 0 ? (
            <span className="text-[11px] font-bold text-orange-700 dark:text-orange-300">
              {language === 'th' ? 'รอซิงก์' : 'Pending'}
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <span className="px-1 py-0.2 rounded bg-emerald-500/20 dark:bg-emerald-500/25 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-black font-mono tracking-wider uppercase">
                LIVE
              </span>
            </div>
          )}

          {/* Pending Outbox Count Pill */}
          {pendingCount > 0 && (
            <span
              id="connectivity-pending-pill"
              className="flex items-center gap-0.5 px-1 py-0.2 rounded-full bg-orange-500 text-white font-black font-mono text-[9px] shadow-2xs animate-pulse"
              title={`${pendingCount} pending task(s)`}
            >
              {pendingCount}
            </span>
          )}

          <ChevronDown
            className={`h-3 w-3 text-text/40 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Interactive Diagnostics Popover & Outbox Task Monitor */}
      {isOpen && (
        <div
          id="connectivity-diagnostics-popover"
          role="dialog"
          aria-label={language === 'th' ? 'สถานะการเชื่อมต่อและคลังข้อมูลออฟไลน์' : 'Connectivity & Offline Outbox Status'}
          className="absolute right-0 top-full mt-2 w-84 sm:w-96 rounded-2xl border border-border border-crisp bg-card shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-text"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border border-crisp">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-lg ${
                  !isOnline
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : pendingCount > 0
                    ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {!isOnline ? (
                  <WifiOff className="h-4 w-4" />
                ) : isSyncing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-text flex items-center gap-1.5">
                  <span>{language === 'th' ? 'สถานะการเชื่อมต่อ & Outbox' : 'Connectivity & Outbox'}</span>
                  {isSyncing && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                  )}
                </div>
                <div className="text-[10px] text-text/60 font-mono">
                  PRODX Resilience Engine · Offline-First
                </div>
              </div>
            </div>

            <button
              type="button"
              id="connectivity-popover-close-btn"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-text/50 hover:text-text hover:bg-background cursor-pointer transition-colors"
              aria-label="Close popover"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Connection Status Banner */}
          <div className="mt-3">
            {!isOnline ? (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    {isSimulatedOffline
                      ? (language === 'th' ? 'โหมดจำลองออฟไลน์เปิดใช้งานอยู่' : 'Offline Simulation Active')
                      : (language === 'th' ? 'การเชื่อมต่ออินเทอร์เน็ตขาดหาย' : 'Network Disconnected')}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  {language === 'th'
                    ? 'คำสั่งซื้อและการเคลื่อนไหวสต็อกจะถูกบันทึกลงในคลังข้อมูลภายในเบราว์เซอร์ (LocalStorage Outbox) ด้วยสถานะ pending_sync_offline โดยอัตโนมัติ'
                    : 'All sales and transactions are safely queued in the browser Outbox with "pending_sync_offline" status. They will auto-sync once connection returns.'}
                </p>
              </div>
            ) : pendingCount > 0 ? (
              <div className="p-3 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-900 dark:text-orange-200 text-xs">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <RefreshCw className={`h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>
                    {language === 'th'
                      ? `มี ${pendingCount} รายการพร้อมซิงก์สู่ระบบหลัก`
                      : `${pendingCount} offline task(s) waiting for server sync`}
                  </span>
                </div>
                <p className="text-[11px] text-orange-800 dark:text-orange-300/90 leading-relaxed">
                  {language === 'th'
                    ? 'ระบบออนไลน์แล้ว คุณสามารถกดปุ่มซิงก์ข้อมูลทันทีเพื่อยืนยันคำสั่งซื้อกับเซิร์ฟเวอร์'
                    : 'Connection is active. Click "Sync Outbox Now" or wait for automatic background synchronization.'}
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-xs">
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{language === 'th' ? 'ระบบออนไลน์และข้อมูลซิงก์ครบถ้วน' : 'System Online & Synchronized'}</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90">
                  {language === 'th'
                    ? 'คำสั่งซื้อทั้งหมดได้รับการยืนยันและบันทึกลงฐานข้อมูลกลางเรียบร้อย'
                    : 'All operations are authoritatively committed to the central database.'}
                </p>
              </div>
            )}
          </div>

          {/* Sync Status Counters Grid */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="p-2 rounded-xl bg-background/80 border border-border text-center">
              <div className="text-[10px] font-semibold text-text/60 uppercase">
                {language === 'th' ? 'รอซิงก์' : 'Queued'}
              </div>
              <div className={`text-base font-black font-mono mt-0.5 ${pendingCount > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-text/80'}`}>
                {pendingCount}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-background/80 border border-border text-center">
              <div className="text-[10px] font-semibold text-text/60 uppercase">
                {language === 'th' ? 'ซิงก์สำเร็จ' : 'Synced'}
              </div>
              <div className="text-base font-black font-mono mt-0.5 text-emerald-600 dark:text-emerald-400">
                {syncedCount}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-background/80 border border-border text-center">
              <div className="text-[10px] font-semibold text-text/60 uppercase">
                {language === 'th' ? 'ล้มเหลว' : 'Failed'}
              </div>
              <div className={`text-base font-black font-mono mt-0.5 ${failedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-text/40'}`}>
                {failedCount}
              </div>
            </div>
          </div>

          {/* Local Storage Details & Last Synced Timestamp */}
          <div className="mt-3 p-2.5 rounded-xl bg-background/60 border border-border flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-text/60 min-w-0">
              <HardDrive className="h-3.5 w-3.5 text-text/40 shrink-0" />
              <span className="truncate">Outbox Key: <code className="text-amber-600 dark:text-amber-400 font-mono text-[10px]">prodx_pos_outbox</code></span>
            </div>
            <div className="flex items-center gap-1 text-text/60 font-mono text-[10px] shrink-0">
              <Clock className="h-3 w-3 text-text/40 shrink-0" />
              <span>{formatTime(lastSyncedAt)}</span>
            </div>
          </div>

          {/* Outbox Tasks List & Tracker */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-text/80 uppercase tracking-wide flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-text/40" />
                <span>{language === 'th' ? 'รายการภารกิจใน Outbox' : 'Synchronization Tasks'}</span>
              </span>
              {syncedCount > 0 && (
                <button
                  type="button"
                  id="clear-synced-outbox-btn"
                  onClick={clearSyncedItems}
                  className="text-[10px] text-text/60 hover:text-text underline cursor-pointer"
                >
                  {language === 'th' ? 'ล้างที่ซิงก์แล้ว' : 'Clear Synced'}
                </button>
              )}
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5" id="outbox-task-list">
              {outbox.length === 0 ? (
                <div className="py-4 text-center rounded-xl bg-background/40 border border-dashed border-border border-crisp">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-1 opacity-70" />
                  <p className="text-xs font-semibold text-text/80">
                    {language === 'th' ? 'ไม่มีภารกิจค้างใน Outbox' : 'No queued tasks in Outbox'}
                  </p>
                  <p className="text-[10px] text-text/50 mt-0.5">
                    {language === 'th' ? 'ระบบพร้อมทำงานและมีเสถียรภาพ' : 'All transactions are cleanly committed.'}
                  </p>
                </div>
              ) : (
                outbox.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTaskId(selectedTaskId === item.id ? null : item.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      selectedTaskId === item.id
                        ? 'border-primary/60 bg-primary/10'
                        : item.syncState === 'failed'
                        ? 'border-rose-500/30 bg-rose-50/30 dark:bg-rose-950/20 hover:border-rose-500/50'
                        : item.syncState === 'queued'
                        ? 'border-orange-500/30 bg-orange-50/20 dark:bg-orange-950/10 hover:border-orange-500/50'
                        : item.syncState === 'syncing'
                        ? 'border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/10'
                        : 'border-border bg-background/50 hover:bg-background/90'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-text text-xs flex items-center gap-1.5 truncate">
                          <span className="truncate">{getTaskTypeLabel(item.type)}</span>
                        </div>
                        <div className="text-[10px] text-text/50 font-mono truncate mt-0.5 flex items-center gap-1.5">
                          <span>Idem: {item.idempotencyKey.slice(0, 12)}...</span>
                          <span>·</span>
                          <span>{formatTime(item.createdAt)}</span>
                        </div>
                      </div>

                      <Badge
                        variant={
                          item.syncState === 'synced'
                            ? 'success'
                            : item.syncState === 'failed'
                            ? 'danger'
                            : item.syncState === 'syncing'
                            ? 'primary'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {item.syncState}
                      </Badge>
                    </div>

                    {/* Detailed Accordion for Inspecting Payload / Errors */}
                    {selectedTaskId === item.id && (
                      <div className="mt-2 pt-2 border-t border-border text-[10px] font-mono text-text/80 space-y-1">
                        <div><strong className="text-text/50">ID:</strong> {item.id}</div>
                        <div><strong className="text-text/50">Attempts:</strong> {item.attempts}</div>
                        {item.serverConfirmedId && (
                          <div className="text-emerald-600 dark:text-emerald-400">
                            <strong>Server Confirmed:</strong> {item.serverConfirmedId}
                          </div>
                        )}
                        {item.lastError && (
                          <div className="text-rose-600 dark:text-rose-400 bg-rose-500/10 p-1.5 rounded">
                            <strong>Error:</strong> {item.lastError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Footer Buttons */}
          <div className="mt-3.5 pt-3 border-t border-border border-crisp flex items-center justify-between gap-2">
            <Button
              id="connectivity-toggle-sim-btn"
              size="sm"
              variant={isSimulatedOffline ? 'primary' : 'outline'}
              onClick={toggleSimulatedOffline}
              className="flex-1 text-xs"
            >
              {isSimulatedOffline
                ? (language === 'th' ? 'ปิดโหมดจำลอง (Go Online)' : 'End Offline Sim')
                : (language === 'th' ? 'จำลองเน็ตหลุด (Test Offline)' : 'Simulate Offline')}
            </Button>

            <Button
              id="connectivity-trigger-sync-btn"
              size="sm"
              variant="primary"
              onClick={() => triggerSync()}
              disabled={!isOnline || pendingCount === 0 || isSyncing}
              isLoading={isSyncing}
              leftIcon={<RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />}
              className="flex-1 text-xs font-semibold"
            >
              {language === 'th' ? 'ซิงก์ข้อมูลทันที' : 'Sync Outbox Now'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

