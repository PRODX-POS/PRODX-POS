import type { ISyncApi } from './types';
import { syncApi as mockSyncApi } from './mockAdapter';
import { productionSyncApi } from './syncApi';

// Security invariant: the in-memory mock is development-only. A production
// build must never silently fall back to a non-authoritative synchronization
// implementation when its API endpoint is misconfigured.
export const syncApi: ISyncApi = import.meta.env.DEV ? mockSyncApi : productionSyncApi;
