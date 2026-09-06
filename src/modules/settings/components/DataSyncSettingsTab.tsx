import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  Sliders,
  Database,
  Download,
  AlertOctagon,
  HardDrive,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { OfflineSyncProgressIndicator } from '../../../components/common/OfflineSyncProgressIndicator';
import { useLanguage } from '../../../context/LanguageContext';
import { useOffline } from '../../../context/OfflineContext';
import { useToast } from '../../../context/ToastContext';
import { mockState } from '../../../adapters/mockAdapter';
import { clearEntireSystemCache } from '../../../services/systemReset';
import { getCachedProducts, getCachedCategories, getCachedOrders } from '../../../lib/indexedDb';

export const DataSyncSettingsTab: React.FC = () => {
  const { language, t } = useLanguage();
  const {
    isOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    outbox,
    clearOutbox,
    triggerSync,
    isSyncing,
  } = useOffline();
  const { addToast } = useToast();

  const [simulatedLatency, setSimulatedLatency] = useState<number>(() => mockState.getSimulatedLatency());
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // IndexedDB cache inspection counts
  const [cachedStats, setCachedStats] = useState({
    products: 0,
    categories: 0,
    orders: 0,
    isLoading: true,
  });

  const loadCacheStats = async () => {
    setCachedStats((prev) => ({ ...prev, isLoading: true }));
    try {
      const [products, categories, orders] = await Promise.all([
        getCachedProducts(),
        getCachedCategories(),
        getCachedOrders(),
      ]);
      setCachedStats({
        products: products.length,
        categories: categories.length,
        orders: orders.length,
        isLoading: false,
      });
    } catch (e) {
      console.error('Failed to load cache stats', e);
      setCachedStats((prev) => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    loadCacheStats();
  }, []);

  const handleLatencyChange = (ms: number) => {
    mockState.setSimulatedLatency(ms);
    setSimulatedLatency(ms);
    addToast({
      title: language === 'th' ? 'ปรับความหน่วงเครือข่าย' : 'Network Latency Updated',
      message: `Simulated network delay: ${ms}ms`,
      type: 'info',
    });
  };

  const handleManualSync = async () => {
    await triggerSync();
    await loadCacheStats();
    addToast({
      title: language === 'th' ? 'ซิงก์ข้อมูลสำเร็จ' : 'Sync Complete',
      message: language === 'th' ? 'ข้อมูล Outbox ทั้งหมดถูกส่งขึ้นเซิร์ฟเวอร์เรียบร้อย' : 'All outbox records synchronized.',
      type: 'success',
    });
  };

  const handleExportSystemBackup = async () => {
    try {
      const [products, categories, orders] = await Promise.all([
        getCachedProducts(),
        getCachedCategories(),
        getCachedOrders(),
      ]);

      const backupData = {
        exportedAt: new Date().toISOString(),
        system: 'PRODX POS Enterprise Hub',
        version: '2.4.0',
        stats: {
          productsCount: products.length,
          categoriesCount: categories.length,
          ordersCount: orders.length,
        },
        data: {
          products,
          categories,
          orders,
          localStorageKeys: Object.keys(localStorage).reduce((acc, key) => {
            if (key.startsWith('prodx_pos_')) {
              acc[key] = localStorage.getItem(key);
            }
            return acc;
          }, {} as Record<string, string | null>),
        },
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `prodx_pos_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      addToast({
        title: language === 'th' ? 'ดาวน์โหลดไฟล์สำรองข้อมูลสำเร็จ' : 'Backup Exported',
        message: language === 'th' ? 'ไฟล์ JSON สำรองข้อมูลถูกบันทึกลงในอุปกรณ์แล้ว' : 'Full system snapshot saved to your computer.',
        type: 'success',
      });
    } catch (e) {
      addToast({
        title: language === 'th' ? 'การสำรองข้อมูลล้มเหลว' : 'Export Failed',
        message: String(e),
        type: 'error',
      });
    }
  };

  const handleExecuteSystemReset = async () => {
    setIsResetting(true);
    try {
      await clearEntireSystemCache();
      addToast({
        title: language === 'th' ? 'รีเซ็ตระบบและเคลียร์แคชสำเร็จ' : 'System Cache Cleared',
        message: language === 'th'
          ? 'ล้าง IndexedDB, LocalStorage และรีเซ็ตข้อมูล Mock ทั้งหมดแล้ว กำลังโหลดหน้าจอใหม่...'
          : 'Cleared IndexedDB, local storage, and restored clean seed catalog. Reloading...',
        type: 'success',
      });
      setIsResetConfirmOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setIsResetting(false);
      addToast({
        title: language === 'th' ? 'เกิดข้อผิดพลาดในการรีเซ็ต' : 'Reset Failed',
        message: String(err),
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Real-Time Offline Outbox & Visual Sync Progress Indicator */}
      <OfflineSyncProgressIndicator
        showQueueList={true}
        onSyncComplete={loadCacheStats}
      />

      {/* 2. Network Simulation & Connectivity Controls */}
      <Card className="border border-border/80 shadow-sm rounded-lg overflow-hidden">
        <CardHeader className="bg-card/50 border-b border-border/60 py-3.5 px-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Wifi className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                {language === 'th'
                  ? 'การจำลองเครือข่ายและสภาวะออฟไลน์ (Network Simulator)'
                  : 'Network & Offline Simulator'}
              </h3>
              <p className="text-[11px] text-text/50">
                {language === 'th'
                  ? 'ทดสอบการทำงานของระบบ POS เมื่อสัญญาณเน็ตขาดหายหรือหน่วงช้า'
                  : 'Simulate connection drops and high latency to verify zero-downtime offline capability.'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Online/Offline Link Status indicator */}
            <div className="p-4 rounded-lg border border-border/80 bg-card/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-lg ${
                    isOnline
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}
                >
                  {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-text flex items-center gap-2">
                    <span>{language === 'th' ? 'สถานะการเชื่อมต่อคลาวด์' : 'Cloud Link Status'}</span>
                    <Badge variant={isOnline ? 'success' : 'danger'} size="sm" dot>
                      {isOnline
                        ? language === 'th'
                          ? 'ออนไลน์ (Online)'
                          : 'Online'
                        : language === 'th'
                        ? 'ออฟไลน์ (Offline)'
                        : 'Offline'}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-text/50 mt-0.5">
                    {isSimulatedOffline
                      ? language === 'th'
                        ? 'กำลังจำลองสภาวะออฟไลน์โดยผู้ใช้งาน'
                        : 'Running in forced simulated offline mode'
                      : language === 'th'
                      ? 'พร้อมเชื่อมต่อ Realtime WebSocket / API'
                      : 'Direct cloud sync connection operational'}
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle Force Offline Simulator */}
            <div className="p-4 rounded-lg border border-border/80 bg-card/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-text">
                  {language === 'th'
                    ? 'จำลองสภาวะเน็ตหลุด (Simulate Network Drop)'
                    : 'Simulate Offline Mode'}
                </div>
                <div className="text-[11px] text-text/50 mt-0.5">
                  {language === 'th'
                    ? 'ตัดการเชื่อมต่อจำลองเพื่อทดสอบระบบ Outbox และความต่อเนื่องของ POS'
                    : 'Force terminal into offline outbox mode to test offline resilience.'}
                </div>
              </div>
              <button
                type="button"
                id="simulate-offline-toggle-btn"
                onClick={toggleSimulatedOffline}
                className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  isSimulatedOffline ? 'bg-amber-500' : 'bg-border dark:bg-background'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    isSimulatedOffline ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Local IndexedDB Storage Inspector */}
      <Card className="border border-border/80 shadow-sm rounded-lg overflow-hidden">
        <CardHeader className="bg-card/50 border-b border-border/60 py-3.5 px-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <HardDrive className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                {language === 'th' ? 'ตรวจสอบฐานข้อมูลในเครื่อง (IndexedDB Local Storage)' : 'Local Storage & IndexedDB Inspector'}
              </h3>
              <p className="text-[11px] text-text/50">
                {language === 'th'
                  ? 'จำนวนข้อมูลสินค้า หมวดหมู่ และประวัติออเดอร์ที่ถูกแคชไว้ในบราวเซอร์'
                  : 'Local IndexedDB persistence metrics ensuring offline search and catalog availability.'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadCacheStats}
            isLoading={cachedStats.isLoading}
            className="rounded-md font-bold text-xs"
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            {language === 'th' ? 'รีเฟรชสถิติ' : 'Refresh Metrics'}
          </Button>
        </CardHeader>

        <CardBody className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg border border-border/80 bg-card/60 text-center">
              <div className="text-[11px] font-bold text-text/60 uppercase tracking-wide">
                {language === 'th' ? 'สินค้าในแคช (Products)' : 'Cached Products'}
              </div>
              <div className="text-2xl font-black text-text font-mono mt-1">
                {cachedStats.products}
              </div>
              <div className="text-[10px] text-text/40 mt-0.5">IndexedDB 'products'</div>
            </div>

            <div className="p-3.5 rounded-lg border border-border/80 bg-card/60 text-center">
              <div className="text-[11px] font-bold text-text/60 uppercase tracking-wide">
                {language === 'th' ? 'หมวดหมู่ในแคช (Categories)' : 'Cached Categories'}
              </div>
              <div className="text-2xl font-black text-text font-mono mt-1">
                {cachedStats.categories}
              </div>
              <div className="text-[10px] text-text/40 mt-0.5">IndexedDB 'categories'</div>
            </div>

            <div className="p-3.5 rounded-lg border border-border/80 bg-card/60 text-center">
              <div className="text-[11px] font-bold text-text/60 uppercase tracking-wide">
                {language === 'th' ? 'ประวัติออเดอร์ (Orders)' : 'Cached Orders'}
              </div>
              <div className="text-2xl font-black text-text font-mono mt-1">
                {cachedStats.orders}
              </div>
              <div className="text-[10px] text-text/40 mt-0.5">IndexedDB 'orders'</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Developer Diagnostics & Latency Simulator Card */}
      <Card className="border border-border/80 shadow-sm rounded-lg overflow-hidden">
        <CardHeader className="bg-card/50 border-b border-border/60 py-3.5 px-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                {language === 'th' ? 'เครื่องมือจำลองระบบและการบำรุงรักษา (Diagnostics & Maintenance)' : 'Diagnostics & Maintenance Tools'}
              </h3>
              <p className="text-[11px] text-text/50">
                {language === 'th'
                  ? 'จำลองความหน่วงเครือข่าย สำรองข้อมูล และรีเซ็ตแคชระบบทั้งหมด'
                  : 'Network delay simulator, system backup JSON snapshot, and nuclear cache purge.'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-5 space-y-6">
          {/* Network Latency Simulator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
                  {language === 'th' ? 'จำลองความหน่วงเครือข่าย (Network Latency Simulator)' : 'Simulated Network Latency'}
                </label>
                <span className="text-[11px] text-text/50">
                  {language === 'th' ? 'จำลองความเร็วอินเทอร์เน็ตจริงในการตอบสนองคำสั่ง API' : 'Injects artificial latency to simulate realistic mobile POS network environments.'}
                </span>
              </div>
              <Badge variant="primary" size="sm" className="font-mono">
                {simulatedLatency} ms
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="2000"
                step="50"
                value={simulatedLatency}
                onChange={(e) => handleLatencyChange(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-background rounded-lg cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { ms: 0, label: '0ms (Instant)' },
                { ms: 150, label: '150ms (Fast 4G)' },
                { ms: 400, label: '400ms (3G / Edge)' },
                { ms: 1000, label: '1,000ms (Laggy)' },
              ].map((preset) => (
                <button
                  key={preset.ms}
                  type="button"
                  onClick={() => handleLatencyChange(preset.ms)}
                  className={`p-2 rounded-md border text-center text-xs font-mono font-bold cursor-pointer transition ${
                    simulatedLatency === preset.ms
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-text/70 hover:bg-background'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Backup & System Reset Actions */}
          <div className="pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Export Backup JSON */}
            <div className="p-4 rounded-lg border border-border/80 bg-card/60 flex flex-col justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-text flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  <span>{language === 'th' ? 'สำรองข้อมูลทั้งระบบ (Export Backup JSON)' : 'Export Full System Backup'}</span>
                </div>
                <div className="text-[11px] text-text/50 mt-1">
                  {language === 'th'
                    ? 'ดาวน์โหลดสแนปช็อตข้อมูลสินค้า แคตตาล็อก ประวัติคำสั่งซื้อ และการตั้งค่าลงไฟล์ JSON'
                    : 'Download complete system catalog, orders history, and local settings JSON.'}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportSystemBackup}
                className="w-full rounded-md font-bold text-xs"
                leftIcon={<Download className="h-3.5 w-3.5 text-primary" />}
              >
                {language === 'th' ? 'ดาวน์โหลดไฟล์สำรองข้อมูล' : 'Download Backup File'}
              </Button>
            </div>

            {/* Clear Entire System Cache */}
            <div className="p-4 rounded-lg border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/10 flex flex-col justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertOctagon className="h-4 w-4 text-rose-500" />
                  <span>{language === 'th' ? 'เคลียร์แคชและรีเซ็ตค่าเดิมทั้งระบบ (Nuclear Reset)' : 'Purge All Caches & System Reset'}</span>
                </div>
                <div className="text-[11px] text-text/60 mt-1">
                  {language === 'th'
                    ? 'ล้าง IndexedDB ทั้งหมด, เคลียร์ LocalStorage, รีเซ็ตข้อมูลสินค้าและออเดอร์กลับเป็นค่ามาตรฐานเริ่มต้น'
                    : 'Completely wipes IndexedDB, local storage, and resets catalog & orders to clean seed data.'}
                </div>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setIsResetConfirmOpen(true)}
                className="w-full rounded-md font-bold text-xs shadow-xs"
                leftIcon={<AlertOctagon className="h-3.5 w-3.5" />}
              >
                {language === 'th' ? 'เคลียร์แคชและรีเซ็ตระบบทั้งหมด' : 'Execute System Reset'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Double Confirmation Modal for System Reset */}
      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => !isResetting && setIsResetConfirmOpen(false)}
        title={language === 'th' ? 'ยืนยันการเคลียร์แคชและรีเซ็ตค่าระบบทั้งหมด' : 'Confirm Complete System Reset'}
        description={
          language === 'th'
            ? 'การกระทำนี้จะลบข้อมูล IndexedDB, LocalStorage และรีเซ็ตข้อมูลจำลองทั้งหมดกลับสู่ค่าเริ่มต้นจากโรงงาน'
            : 'This will purge all local IndexedDB caches, session storage, and restore default seed catalog.'
        }
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsResetConfirmOpen(false)}
              disabled={isResetting}
              className="rounded-md"
            >
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleExecuteSystemReset}
              isLoading={isResetting}
              className="rounded-md font-bold"
              leftIcon={<AlertOctagon className="h-4 w-4" />}
            >
              {language === 'th' ? 'ยืนยันการล้างข้อมูลทั้งหมด' : 'Confirm Nuclear Reset'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 select-none text-xs">
          <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-500" />
            <div className="space-y-1">
              <div className="font-bold">
                {language === 'th' ? 'คำเตือน: ข้อมูลแคชทั้งหมดจะถูกลบทันที' : 'Warning: Irreversible Local Storage Wipe'}
              </div>
              <p className="text-[11px] opacity-90">
                {language === 'th'
                  ? 'รายการสินค้าที่เพิ่มใหม่, ประวัติออเดอร์, ยอดกะ, และการตั้งค่าเฉพาะเครื่องจะถูกคืนค่าเป็นค่าเริ่มต้น และระบบจะรีโหลดหน้าจอใหม่โดยอัตโนมัติ'
                  : 'All modified product catalog items, custom orders, open shift balances, and terminal overrides will be reset to defaults.'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/80 bg-card/60 space-y-1 text-text/70 text-[11px]">
            <div className="font-bold text-text text-xs">{language === 'th' ? 'ขั้นตอนที่จะดำเนินการ:' : 'Operations to execute:'}</div>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              <li>{language === 'th' ? 'ล้าง Object Stores ใน IndexedDB (products, categories, orders)' : 'Purge IndexedDB stores'}</li>
              <li>{language === 'th' ? 'รีเซ็ต Mock Memory State ใน Ram' : 'Reset in-memory mock repository'}</li>
              <li>{language === 'th' ? 'ล้างแคช LocalStorage / SessionStorage' : 'Clear localized storage preferences'}</li>
              <li>{language === 'th' ? 'กระจายคำสั่งรีเซ็ตผ่าน BroadcastChannel' : 'Broadcast reset event to all tabs'}</li>
              <li>{language === 'th' ? 'รีโหลดหน้าต่างเพื่อดึงค่าเริ่มต้นใหม่' : 'Trigger clean window reload'}</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};
