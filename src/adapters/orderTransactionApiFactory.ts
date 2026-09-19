import { orderApi as mockOrderApi } from './mockAdapter';
import { createProductionOrderTransactionApi } from './productionOrderTransactionApi';

export function createOrderTransactionApi(token: string) {
  if (import.meta.env.DEV) return mockOrderApi;
  return createProductionOrderTransactionApi(token);
}
