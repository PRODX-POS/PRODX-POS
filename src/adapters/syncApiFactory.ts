import type { ISyncApi } from './types';
import { syncApi as mockSyncApi } from './mockAdapter';
import { productionSyncApi } from './syncApi';

export const syncApi: ISyncApi =
  import.meta.env.DEV || !import.meta.env.VITE_AUTH_API_BASE_URL
    ? mockSyncApi
    : productionSyncApi;
