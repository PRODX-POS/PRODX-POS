/**
 * PRODX POS - Cart & Register State Management
 * 
 * Invariant: All financial totals are deterministically computed via decimal-safe Money arithmetic.
 */

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Product } from '../domain/catalog';
import { useToast } from './ToastContext';
import { useLanguage } from './LanguageContext';
import {
  CartLineItem,
  CartTotals,
  Customer,
  TenderPayment,
  PaymentMethod,
  calculateLineItem,
  computeCartTotals,
} from '../domain/order';
import { Money, createMoney, ZERO_USD } from '../domain/money';
import { customerDisplayService } from '../services/customerDisplayChannel';
import { useAuth } from './AuthContext';
import { CurrencyService } from '../services/currency/currencyService';

export interface StagedTenderPaymentInput {
  method: PaymentMethod;
  amount: Money;
  tenderedCash?: Money;
  changeGiven?: Money;
  authCode?: string;
  cardLastFour?: string;
  terminalReference?: string;
}

export interface HeldCart {
  id: string;
  savedAt: string;
  label: string;
  items: CartLineItem[];
  customer?: Customer;
  orderDiscountBps: number;
  notes?: string;
  stagedPayments?: TenderPayment[];
}

interface CartContextType {
  items: CartLineItem[];
  totals: CartTotals;
  customer: Customer | null;
  orderDiscountBps: number;
  notes: string;
  heldCarts: HeldCart[];
  stagedPayments: TenderPayment[];
  totalTenderedAmount: Money;
  remainingBalanceDue: Money;
  changeDue: Money;
  isFullyTendered: boolean;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (lineId: string, delta: number) => void;
  setItemQuantity: (lineId: string, quantity: number) => void;
  setItemPrice: (lineId: string, price: Money) => void;
  setItemDiscount: (lineId: string, discountBps: number) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer | null) => void;
  setOrderDiscount: (discountBps: number) => void;
  setNotes: (notes: string) => void;
  holdCurrentCart: (label?: string) => void;
  recallHeldCart: (id: string) => void;
  deleteHeldCart: (id: string) => void;
  addPaymentTender: (tenderInput: StagedTenderPaymentInput) => TenderPayment;
  removePaymentTender: (tenderId: string) => void;
  clearPaymentTenders: () => void;
  // Multi-currency Support
  exchangeRates: { [currency: string]: number };
  activeSecondaryCurrency: string;
  setActiveSecondaryCurrency: (currency: string) => void;
  setExchangeRate: (currency: string, rate: number) => void;
  secondaryTotals: CartTotals | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const baseCurrency = session?.currentStore?.currency || 'THB';

  const { addToast } = useToast();
  const { language } = useLanguage();
  const [items, setItems] = useState<CartLineItem[]>([]);

  // Safety threshold stock check
  const checkStockSafety = (product: Product, previousQty: number, nextQty: number) => {
    const cachedThreshold = localStorage.getItem('prodx_low_stock_threshold');
    const threshold = cachedThreshold ? parseInt(cachedThreshold, 10) : 15;
    
    const previousRemaining = product.currentStock - previousQty;
    const remaining = product.currentStock - nextQty;
    
    // Check if the remaining quantity drops below or equal to the threshold,
    // AND previously it was above the threshold!
    if (remaining <= threshold && previousRemaining > threshold) {
      addToast({
        title: language === 'th' ? 'ระดับสต็อกเตือนภัยคุกคาม' : 'Low Stock Safety Alert',
        message: language === 'th'
          ? `สินค้า "${product.name}" เหลือคลังพร้อมขายเพียง ${remaining} ${product.unitOfMeasure} (เกณฑ์ปลอดภัย: ${threshold})`
          : `"${product.name}" remaining quantity dropped to ${remaining} ${product.unitOfMeasure} (Safety threshold: ${threshold})`,
        type: 'warning',
      });
    }
  };
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orderDiscountBps, setOrderDiscountBps] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [stagedPayments, setStagedPayments] = useState<TenderPayment[]>([]);

  // Multi-currency state & persistence
  const [exchangeRates, setExchangeRatesState] = useState<{ [currency: string]: number }>(() => {
    return CurrencyService.getExchangeRates(baseCurrency);
  });

  const [activeSecondaryCurrency, setActiveSecondaryCurrencyState] = useState<string>(() => {
    return localStorage.getItem('prodx_active_secondary_currency') || 'THB';
  });

  // Keep exchange rates synchronized when store base currency switches
  useEffect(() => {
    setExchangeRatesState(CurrencyService.getExchangeRates(baseCurrency));
  }, [baseCurrency]);

  const setExchangeRate = (currency: string, rate: number) => {
    const upper = currency.toUpperCase();
    const updated = { ...exchangeRates, [upper]: rate };
    setExchangeRatesState(updated);
    CurrencyService.saveExchangeRates(baseCurrency, updated);
  };

  const setActiveSecondaryCurrency = (currency: string) => {
    const upper = currency.toUpperCase();
    setActiveSecondaryCurrencyState(upper);
    localStorage.setItem('prodx_active_secondary_currency', upper);
  };

  const totals = useMemo(() => {
    return computeCartTotals(items, orderDiscountBps, baseCurrency);
  }, [items, orderDiscountBps, baseCurrency]);

  const secondaryTotals = useMemo<CartTotals | null>(() => {
    if (!activeSecondaryCurrency) return null;
    const rate = exchangeRates[activeSecondaryCurrency] || 1.0;
    
    const convert = (m: Money): Money => {
      const convertedCents = Math.round(m.amountInCents * rate);
      return createMoney(convertedCents, activeSecondaryCurrency);
    };

    return {
      grossSubtotal: convert(totals.grossSubtotal),
      itemDiscounts: convert(totals.itemDiscounts),
      orderDiscount: convert(totals.orderDiscount),
      netSubtotal: convert(totals.netSubtotal),
      totalTax: convert(totals.totalTax),
      grandTotal: convert(totals.grandTotal),
      totalItemsCount: totals.totalItemsCount,
    };
  }, [totals, activeSecondaryCurrency, exchangeRates]);

  const { totalTenderedAmount, remainingBalanceDue, changeDue, isFullyTendered } = useMemo(() => {
    const currency = totals.grandTotal.currency;
    let totalTenderedCents = 0;
    let totalChangeGivenCents = 0;

    for (const payment of stagedPayments) {
      totalTenderedCents += payment.amount.amountInCents;
      if (payment.changeGiven) {
        totalChangeGivenCents += payment.changeGiven.amountInCents;
      }
    }

    const remainingCents = Math.max(0, totals.grandTotal.amountInCents - totalTenderedCents);
    const isComplete = totalTenderedCents >= totals.grandTotal.amountInCents && totals.grandTotal.amountInCents > 0;

    return {
      totalTenderedAmount: createMoney(totalTenderedCents, currency),
      remainingBalanceDue: createMoney(remainingCents, currency),
      changeDue: createMoney(totalChangeGivenCents, currency),
      isFullyTendered: isComplete,
    };
  }, [stagedPayments, totals.grandTotal]);

  // Sync state to Customer-Facing Display
  useEffect(() => {
    customerDisplayService.publish({
      status: items.length > 0 ? 'scanning' : 'idle',
      storeName: 'PRODX Flagship Store',
      items,
      totals,
      customer: customer || undefined,
      lastUpdated: new Date().toISOString(),
    });
  }, [items, totals, customer]);

  const addItem = (product: Product, quantity = 1) => {
    const existing = items.find((item) => item.product.id === product.id);
    const previousQty = existing ? existing.quantity : 0;
    const nextQty = previousQty + quantity;

    checkStockSafety(product, previousQty, nextQty);

    setItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existingIdx !== -1) {
        const existingItem = prev[existingIdx];
        const updated = calculateLineItem(product, nextQty, existingItem.discountBps);
        const next = [...prev];
        next[existingIdx] = updated;
        return next;
      } else {
        const newItem = calculateLineItem(product, quantity, 0);
        return [newItem, ...prev];
      }
    });
  };

  const updateQuantity = (lineId: string, delta: number) => {
    const current = items.find((i) => i.lineId === lineId);
    if (!current) return;

    const previousQty = current.quantity;
    const nextQty = previousQty + delta;

    if (delta > 0) {
      checkStockSafety(current.product, previousQty, nextQty);
    }

    setItems((prev) => {
      const targetIdx = prev.findIndex((i) => i.lineId === lineId);
      if (targetIdx === -1) return prev;

      if (nextQty <= 0) {
        return prev.filter((i) => i.lineId !== lineId);
      }

      const updated = calculateLineItem(current.product, nextQty, current.discountBps, current.unitPrice, current.lineId);
      const next = [...prev];
      next[targetIdx] = updated;
      return next;
    });
  };

  const setItemQuantity = (lineId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(lineId);
      return;
    }
    const current = items.find((i) => i.lineId === lineId);
    if (!current) return;

    const previousQty = current.quantity;

    if (quantity > previousQty) {
      checkStockSafety(current.product, previousQty, quantity);
    }

    setItems((prev) => {
      const targetIdx = prev.findIndex((i) => i.lineId === lineId);
      if (targetIdx === -1) return prev;

      const updated = calculateLineItem(current.product, quantity, current.discountBps, current.unitPrice, current.lineId);
      const next = [...prev];
      next[targetIdx] = updated;
      return next;
    });
  };

  const setItemDiscount = (lineId: string, discountBps: number) => {
    setItems((prev) => {
      const targetIdx = prev.findIndex((i) => i.lineId === lineId);
      if (targetIdx === -1) return prev;

      const current = prev[targetIdx];
      const updated = calculateLineItem(current.product, current.quantity, discountBps, current.unitPrice, current.lineId);
      const next = [...prev];
      next[targetIdx] = updated;
      return next;
    });
  };

  const setItemPrice = (lineId: string, price: Money) => {
    setItems((prev) => {
      const targetIdx = prev.findIndex((i) => i.lineId === lineId);
      if (targetIdx === -1) return prev;

      const current = prev[targetIdx];
      const updated = calculateLineItem(current.product, current.quantity, current.discountBps, price, current.lineId);
      const next = [...prev];
      next[targetIdx] = updated;
      return next;
    });
  };

  const removeItem = (lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId));
  };

  const clearCart = () => {
    setItems([]);
    setCustomer(null);
    setOrderDiscountBps(0);
    setNotes('');
    setStagedPayments([]);
  };

  const holdCurrentCart = (label?: string) => {
    if (items.length === 0) return;
    const held: HeldCart = {
      id: `hold-${Date.now()}`,
      savedAt: new Date().toISOString(),
      label: label || (customer ? customer.name : `Ticket #${heldCarts.length + 1}`),
      items: [...items],
      customer: customer || undefined,
      orderDiscountBps,
      notes,
      stagedPayments: [...stagedPayments],
    };
    setHeldCarts((prev) => [held, ...prev]);
    clearCart();
  };

  const recallHeldCart = (id: string) => {
    const target = heldCarts.find((h) => h.id === id);
    if (!target) return;
    setItems(target.items);
    setCustomer(target.customer || null);
    setOrderDiscountBps(target.orderDiscountBps);
    setNotes(target.notes || '');
    setStagedPayments(target.stagedPayments || []);
    setHeldCarts((prev) => prev.filter((h) => h.id !== id));
  };

  const deleteHeldCart = (id: string) => {
    setHeldCarts((prev) => prev.filter((h) => h.id !== id));
  };

  const addPaymentTender = (tenderInput: StagedTenderPaymentInput): TenderPayment => {
    const newTender: TenderPayment = {
      id: `tnd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      method: tenderInput.method,
      amount: tenderInput.amount,
      tenderedCash: tenderInput.tenderedCash,
      changeGiven: tenderInput.changeGiven,
      authCode: tenderInput.authCode,
      cardLastFour: tenderInput.cardLastFour,
      terminalReference: tenderInput.terminalReference,
      timestamp: new Date().toISOString(),
    };

    setStagedPayments((prev) => [...prev, newTender]);
    return newTender;
  };

  const removePaymentTender = (tenderId: string) => {
    setStagedPayments((prev) => prev.filter((p) => p.id !== tenderId));
  };

  const clearPaymentTenders = () => {
    setStagedPayments([]);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totals,
        customer,
        orderDiscountBps,
        notes,
        heldCarts,
        stagedPayments,
        totalTenderedAmount,
        remainingBalanceDue,
        changeDue,
        isFullyTendered,
        addItem,
        updateQuantity,
        setItemQuantity,
        setItemPrice,
        setItemDiscount,
        removeItem,
        clearCart,
        setCustomer,
        setOrderDiscount: setOrderDiscountBps,
        setNotes,
        holdCurrentCart,
        recallHeldCart,
        deleteHeldCart,
        addPaymentTender,
        removePaymentTender,
        clearPaymentTenders,
        // Multi-currency Support
        exchangeRates,
        activeSecondaryCurrency,
        setActiveSecondaryCurrency,
        setExchangeRate,
        secondaryTotals,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
