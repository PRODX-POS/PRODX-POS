/**
 * PRODX POS - Real-time Customer-Facing Display (CFD) Synchronization Channel
 * 
 * Uses standard BroadcastChannel API with localStorage fallback to synchronize
 * live cart, active payment PromptPay QR, and receipt data across dual screens/monitors.
 */

import { CartLineItem, CartTotals, Customer, Order, PaymentMethod } from '../domain/order';

export interface CustomerDisplayState {
  status: 'idle' | 'scanning' | 'payment_promptpay' | 'payment_card' | 'payment_cash' | 'completed';
  storeName: string;
  storeAddress?: string;
  items: readonly CartLineItem[];
  totals: CartTotals;
  customer?: Customer;
  activePayment?: {
    method: PaymentMethod;
    amountDueCents: number;
    currency: string;
    tenderedCents?: number;
    changeCents?: number;
    promptPayPayload?: string;
  };
  completedOrder?: Order;
  lastUpdated: string;
}

const CHANNEL_NAME = 'prodx_pos_customer_display_channel';
const STORAGE_KEY = 'prodx_pos_cfd_state';

class CustomerDisplayService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(state: CustomerDisplayState) => void> = new Set();
  private currentState: CustomerDisplayState | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          if (event.data) {
            this.currentState = event.data;
            this.notifyListeners(event.data);
          }
        };
      } catch (err) {
        console.warn('[CustomerDisplayService] BroadcastChannel init fallback:', err);
      }
    }

    // Fallback: Listen to storage events for cross-tab sync
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            this.currentState = parsed;
            this.notifyListeners(parsed);
          } catch {
            // ignore
          }
        }
      });
    }
  }

  public publish(state: CustomerDisplayState): void {
    this.currentState = state;
    try {
      if (this.channel) {
        this.channel.postMessage(state);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      this.notifyListeners(state);
    } catch (e) {
      console.warn('[CustomerDisplayService] Publish error:', e);
    }
  }

  public subscribe(callback: (state: CustomerDisplayState) => void): () => void {
    this.listeners.add(callback);
    // Immediately emit last known state if present
    if (this.currentState) {
      callback(this.currentState);
    } else {
      const stored = this.getStoredState();
      if (stored) {
        this.currentState = stored;
        callback(stored);
      }
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  public getStoredState(): CustomerDisplayState | null {
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      if (item) return JSON.parse(item);
    } catch {
      // ignore
    }
    return null;
  }

  private notifyListeners(state: CustomerDisplayState): void {
    this.listeners.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error('[CustomerDisplayService] Listener exception:', err);
      }
    });
  }
}

export const customerDisplayService = new CustomerDisplayService();
