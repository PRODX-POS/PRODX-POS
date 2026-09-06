/**
 * PRODX POS - Offline Resilience & Outbox Synchronization Context
 * 
 * Invariant: Never pretend an offline transaction is server-committed.
 * Transactions created during connectivity drop are queued locally with
 * 'pending_sync_offline' status until authoritative server confirmation is received.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { OutboxItem } from '../domain/sync';
import { syncApi, mockState } from '../adapters/mockAdapter';
import { Order } from '../domain/order';
import { useToast } from './ToastContext';
import { useLanguage } from './LanguageContext';

interface OfflineContextType {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  outbox: OutboxItem[];
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  toggleSimulatedOffline: () => void;
  queueOutboxItem: <T>(type: 'order_transaction' | 'shift_movement' | 'stock_adjustment', idempotencyKey: string, payload: T) => OutboxItem<T>;
  triggerSync: () => Promise<void>;
  clearSyncedItems: () => void;
  clearOutbox: () => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

const OUTBOX_STORAGE_KEY = 'prodx_pos_outbox';
const LAST_SYNCED_STORAGE_KEY = 'prodx_pos_last_synced';

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useToast();
  const { language } = useLanguage();
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_SYNCED_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [outbox, setOutbox] = useState<OutboxItem[]>(() => {
    try {
      const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === OUTBOX_STORAGE_KEY && e.newValue) {
        try {
          setOutbox(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
      if (e.key === LAST_SYNCED_STORAGE_KEY) {
        setLastSyncedAt(e.newValue);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const persistOutbox = (items: OutboxItem[]) => {
    setOutbox(items);
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(items));
  };

  const updateLastSynced = (timestamp: string) => {
    setLastSyncedAt(timestamp);
    localStorage.setItem(LAST_SYNCED_STORAGE_KEY, timestamp);
  };

  const isEffectiveOnline = browserOnline && !isSimulatedOffline;

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (isEffectiveOnline) {
      addToast({
        title: language === 'th' ? 'กลับมาออนไลน์แล้ว' : 'Back Online',
        message: language === 'th' 
          ? 'ระบบเชื่อมต่ออินเทอร์เน็ตสำเร็จ ข้อมูลที่ค้างอยู่จะเริ่มซิงค์อัตโนมัติ' 
          : 'Reconnected successfully. Synchronizing pending transactions...',
        type: 'success'
      });
    } else {
      addToast({
        title: language === 'th' ? 'ระบบเข้าสู่โหมดออฟไลน์' : 'Offline Mode',
        message: language === 'th' 
          ? 'สัญญาณขัดข้องหรือปิดการเชื่อมต่อชั่วคราว ยอดขายจะเซฟเก็บใน IndexedDB อัตโนมัติ' 
          : 'Connection lost. Sales will be securely cached in local IndexedDB.',
        type: 'warning'
      });
    }
  }, [isEffectiveOnline, language, addToast]);

  const toggleSimulatedOffline = () => {
    setIsSimulatedOffline((prev) => {
      const next = !prev;
      mockState.isSimulatedOffline = next;
      return next;
    });
  };

  const queueOutboxItem = <T,>(
    type: 'order_transaction' | 'shift_movement' | 'stock_adjustment',
    idempotencyKey: string,
    payload: T
  ): OutboxItem<T> => {
    const item: OutboxItem<T> = {
      id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      idempotencyKey,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      syncState: 'queued',
    };

    const updated = [item, ...outbox];
    persistOutbox(updated);
    return item;
  };

  const triggerSync = useCallback(async () => {
    if (!isEffectiveOnline || isSyncing) return;
    const queuedItems = outbox.filter((item) => item.syncState === 'queued' || item.syncState === 'failed');
    if (queuedItems.length === 0) return;

    setIsSyncing(true);
    let currentOutbox = [...outbox];

    for (const item of queuedItems) {
      try {
        // Mark syncing
        currentOutbox = currentOutbox.map((i) =>
          i.id === item.id ? { ...i, syncState: 'syncing', attempts: i.attempts + 1 } : i
        );
        persistOutbox(currentOutbox);

        const result = await syncApi.syncOutboxItem(item);

        // Mark synced with server confirmed timestamp
        currentOutbox = currentOutbox.map((i) =>
          i.id === item.id
            ? {
                ...i,
                syncState: 'synced',
                serverConfirmedId: result.confirmedOrder.id,
                serverConfirmedAt: result.syncedAt,
              }
            : i
        );
        persistOutbox(currentOutbox);
      } catch (err: any) {
        console.error('[OfflineContext] Sync failure for item:', item.id, err);
        currentOutbox = currentOutbox.map((i) =>
          i.id === item.id
            ? {
                ...i,
                syncState: 'failed',
                lastError: err?.message || 'Server rejected synchronization request.',
              }
            : i
        );
        persistOutbox(currentOutbox);
      }
    }

    setIsSyncing(false);
    updateLastSynced(new Date().toISOString());
  }, [isEffectiveOnline, isSyncing, outbox]);

  // Auto-trigger sync when transitioning to online
  useEffect(() => {
    if (isEffectiveOnline && outbox.some((i) => i.syncState === 'queued')) {
      triggerSync();
    }
  }, [isEffectiveOnline, outbox, triggerSync]);

  const clearSyncedItems = () => {
    const remaining = outbox.filter((i) => i.syncState !== 'synced');
    persistOutbox(remaining);
  };

  const clearOutbox = () => {
    persistOutbox([]);
  };

  const pendingCount = outbox.filter((i) => i.syncState === 'queued' || i.syncState === 'failed').length;
  const syncedCount = outbox.filter((i) => i.syncState === 'synced').length;
  const failedCount = outbox.filter((i) => i.syncState === 'failed').length;

  return (
    <OfflineContext.Provider
      value={{
        isOnline: isEffectiveOnline,
        isSimulatedOffline,
        outbox,
        pendingCount,
        syncedCount,
        failedCount,
        isSyncing,
        lastSyncedAt,
        toggleSimulatedOffline,
        queueOutboxItem,
        triggerSync,
        clearSyncedItems,
        clearOutbox,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export function useOffline(): OfflineContextType {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return ctx;
}
