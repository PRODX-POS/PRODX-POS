/** Production offline-sync adapter. */
import type { ISyncApi, CheckoutResponse } from './types';
import type { OutboxItem } from '../domain/sync';

const API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL;

const requireBaseUrl = (): string => {
  if (!API_BASE_URL) {
    throw new Error('Production synchronization is not configured: VITE_AUTH_API_BASE_URL is missing.');
  }
  return API_BASE_URL.replace(/\/$/, '');
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${requireBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Synchronization API request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
};

export const productionSyncApi: ISyncApi = {
  async syncOutboxItem(item: OutboxItem) {
    const response = await request<{ result: CheckoutResponse; syncedAt: string }>('/api/v1/sync/commands', {
      method: 'POST',
      body: JSON.stringify({
        commandId: item.id,
        type: item.type,
        idempotencyKey: item.idempotencyKey,
        payload: item.payload,
      }),
    });
    return { confirmedOrder: response.result.order, syncedAt: response.syncedAt };
  },
  async ping(clientTimestamp) {
    void clientTimestamp;
    const start = performance.now();
    const response = await request<{ status: 'ok' }>('/api/v1/health');
    return {
      serverTimestamp: new Date().toISOString(),
      roundTripLatencyMs: Math.max(1, Math.round(performance.now() - start)),
      status: response.status === 'ok' ? 'ok' : 'degraded',
    };
  },
};
