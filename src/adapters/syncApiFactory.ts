import { syncApi as mockSyncApi } from './mockAdapter';
import { createProductionSyncApi } from './productionSyncApi';
import type { ISyncApi } from './types';

export function createSyncApi(token: string): ISyncApi {
  if (import.meta.env.DEV) return mockSyncApi;
  return createProductionSyncApi(token);
}
