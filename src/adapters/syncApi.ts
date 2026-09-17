/** Production offline-sync adapter. */
import type { ISyncApi, CheckoutResponse } from './types';
import type { OutboxItem } from '../domain/sync';
import type { SessionContext } from '../domain/auth';

const API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL;
const SESSION_STORAGE_KEY = 'prodx_pos_session';

const requireBaseUrl = (): string => {
  if (!API_BASE_URL) {
    throw new Error('Production synchronization is not configured: VITE_AUTH_API_BASE_URL is missing.');
  }
  return API_BASE_URL.replace(/\/$/, '');
};

const requireSessionToken = (): string => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) throw new Error('Production synchronization requires an authenticated session.');
    const session = JSON.parse(raw) as Partial<SessionContext>;
    if (typeof session.token !== 'string' || !session.token.trim()) {
      throw new Error('Production synchronization requires an authenticated session.');
    }
    return session.token;
  } catch (error) {
    if (error instanceof Error && error.message.includes('requires an authenticated session')) throw error;
    throw new Error('Production synchronization requires an authenticated session.');
  }
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = requireSessionToken();
  const response = await fetch(`${requireBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
