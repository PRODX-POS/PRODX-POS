import { clearAllCachedData } from '../lib/indexedDb';
import { mockState } from '../adapters/mockAdapter';

/**
 * PRODX POS - Complete System Cache & Storage Reset Utility
 * 
 * Clears:
 * 1. IndexedDB offline stores (products, categories, orders)
 * 2. LocalStorage POS settings, themes, custom colors, timeouts, print templates, sound config, outbox
 * 3. SessionStorage
 * 4. In-memory Mock State (restoring pristine seed products, categories, shifts, demo orders)
 */
export async function clearEntireSystemCache(reloadWindow = false): Promise<void> {
  try {
    // 1. Clear IndexedDB offline storage
    await clearAllCachedData();

    // 2. Reset Mock State memory & IndexedDB seed synchronization
    await mockState.resetAllData();

    // 3. Clear all LocalStorage keys
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('prodx_') || key.startsWith('PRODX_') || key.includes('pos_') || key.includes('theme'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }

    // 4. Clear SessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.clear();
    }

    // 5. Broadcast reset event across open tabs
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('prodx_pos_system_events');
        bc.postMessage({ type: 'SYSTEM_CACHE_CLEARED', timestamp: Date.now() });
        bc.close();
      } catch {
        // ignore
      }
    }

    if (reloadWindow && typeof window !== 'undefined') {
      window.location.reload();
    }
  } catch (error) {
    console.error('[SystemReset] Error clearing system cache:', error);
    throw error;
  }
}
