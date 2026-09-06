/**
 * PRODX POS - IndexedDB Client Cache Storage
 * Provides robust offline storage for products, orders, and categories.
 */

import { Product, Category } from '../domain/catalog';
import { Order } from '../domain/order';

const DB_NAME = 'prodx_pos_offline_cache';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id' });
      }
    };
  });
}

export async function saveProducts(products: Product[]): Promise<void> {
  try {
    const db = await initDB();
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    
    // Clear old products and put new ones
    store.clear();
    for (const product of products) {
      store.put(product);
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error saving products:', error);
  }
}

export async function getCachedProducts(): Promise<Product[]> {
  try {
    const db = await initDB();
    const tx = db.transaction('products', 'readonly');
    const store = tx.objectStore('products');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error loading products:', error);
    return [];
  }
}

export async function saveCategories(categories: Category[]): Promise<void> {
  try {
    const db = await initDB();
    const tx = db.transaction('categories', 'readwrite');
    const store = tx.objectStore('categories');

    store.clear();
    for (const category of categories) {
      store.put(category);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error saving categories:', error);
  }
}

export async function getCachedCategories(): Promise<Category[]> {
  try {
    const db = await initDB();
    const tx = db.transaction('categories', 'readonly');
    const store = tx.objectStore('categories');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error loading categories:', error);
    return [];
  }
}

export async function saveOrders(orders: Order[]): Promise<void> {
  try {
    const db = await initDB();
    const tx = db.transaction('orders', 'readwrite');
    const store = tx.objectStore('orders');

    store.clear();
    for (const order of orders) {
      store.put(order);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error saving orders:', error);
  }
}

export async function saveSingleOrder(order: Order): Promise<void> {
  try {
    const db = await initDB();
    const tx = db.transaction('orders', 'readwrite');
    const store = tx.objectStore('orders');
    store.put(order);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error saving single order:', error);
  }
}

export async function getCachedOrders(): Promise<Order[]> {
  try {
    const db = await initDB();
    const tx = db.transaction('orders', 'readonly');
    const store = tx.objectStore('orders');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        // Sort orders by date descending
        const results = request.result as Order[];
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error loading orders:', error);
    return [];
  }
}

export async function clearAllCachedData(): Promise<void> {
  try {
    const db = await initDB();
    const storeNames = ['products', 'categories', 'orders'];
    for (const name of storeNames) {
      if (db.objectStoreNames.contains(name)) {
        const tx = db.transaction(name, 'readwrite');
        const store = tx.objectStore(name);
        store.clear();
      }
    }
  } catch (error) {
    console.error('[IndexedDB] Error clearing database cache:', error);
  }
}
