import type { Money } from '../domain/money';
import type { RefundItemRestock } from './types';

export type ProductionRefundRequest = { orderId: string; refundAmount: Money; reason: string; refundMethod: 'cash' | 'card' | 'qr_digital'; itemsToRestock?: readonly RefundItemRestock[]; idempotencyKey: string; supervisorAuthorizationToken: string; };

const API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL;

export function createProductionRefundApi(token: string) {
  return {
    async refundOrder(request: ProductionRefundRequest) {
      if (!token.trim()) throw new Error('Authenticated session token is required for refund.');
      if (!API_BASE_URL) throw new Error('Production transaction API is not configured.');
      const response = await fetch(API_BASE_URL.replace(/\/$/, '') + '/api/v1/orders/refund', {
        method: 'POST', credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + token.trim() },
        body: JSON.stringify(request),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message = body && typeof body === 'object' && 'error' in body
          ? String((body as { error?: { message?: unknown } }).error?.message ?? 'Refund request failed.')
          : 'Refund request failed.';
        throw new Error(message);
      }
      return body as { success: true; refundId: string; orderId: string; status: 'server_confirmed' | 'refunded'; refundedAmount: Money; message: string; idempotencyCached: boolean; };
    },
  };
}
