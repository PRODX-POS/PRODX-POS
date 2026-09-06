/**
 * PRODX POS - Toast Notification System
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { playScannerSound } from '../services/soundService';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  durationMs?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, message, type, durationMs = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const item: ToastItem = { id, title, message, type, durationMs };

      setToasts((prev) => [...prev, item]);

      // Sound feedback triggered by Toast types
      if (type === 'error') {
        playScannerSound('error');
      } else if (type === 'warning') {
        playScannerSound('warning');
      } else if (type === 'success') {
        const isCheckoutSuccess = title.includes('ชำระเงิน') || title.includes('Payment') || title.includes('พิมพ์ใบเสร็จ');
        if (!isCheckoutSuccess) {
          playScannerSound('success');
        }
      } else if (type === 'info') {
        playScannerSound('click');
      }

      if (durationMs > 0) {
        setTimeout(() => {
          removeToast(id);
        }, durationMs);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
