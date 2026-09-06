import { Customer } from '../domain/order';

const STORAGE_KEY = 'prodx_pos_customers_data';

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-01',
    name: 'Elena Rostova',
    phone: '+66 81 234 5671',
    email: 'elena.r@example.com',
    loyaltyTier: 'VIP',
    loyaltyPoints: 420,
  },
  {
    id: 'cust-02',
    name: 'Marcus Chen',
    phone: '+66 89 876 5432',
    email: 'marcus.c@example.com',
    loyaltyTier: 'Gold',
    loyaltyPoints: 215,
  },
  {
    id: 'cust-03',
    name: 'Sophia Williams',
    phone: '+66 86 555 1234',
    email: 'sophia.w@example.com',
    loyaltyTier: 'Silver',
    loyaltyPoints: 85,
  },
  {
    id: 'cust-04',
    name: 'David Miller',
    phone: '+66 82 333 4444',
    email: 'david.m@example.com',
    loyaltyTier: 'Bronze',
    loyaltyPoints: 20,
  },
];

class CustomersService {
  private customers: Customer[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadCustomers();
  }

  private loadCustomers() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.customers = JSON.parse(saved);
      } else {
        this.customers = [...INITIAL_CUSTOMERS];
        this.saveCustomers();
      }
    } catch {
      this.customers = [...INITIAL_CUSTOMERS];
    }
  }

  private saveCustomers() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customers));
    } catch (e) {
      console.warn('Failed to persist customers to localStorage', e);
    }
    this.notifyListeners();
  }

  public getCustomers(): Customer[] {
    return [...this.customers];
  }

  public addCustomer(newCustomer: Customer): void {
    this.customers = [newCustomer, ...this.customers];
    this.saveCustomers();
  }

  public searchCustomers(query: string): Customer[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.customers;
    return this.customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.loyaltyTier.toLowerCase().includes(q)
    );
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Customer service listener error', err);
      }
    });
  }
}

export const customersService = new CustomersService();
