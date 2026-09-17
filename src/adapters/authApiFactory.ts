/**
 * Authentication adapter selection.
 *
 * Mock authentication is loaded dynamically only in Vite development mode.
 * Production builds always use the network adapter; the production adapter
 * itself fails closed when the backend URL is not configured.
 */
import { IAuthApi } from './types';
import { productionAuthApi } from './authApi';

async function resolveAuthApi(): Promise<IAuthApi> {
  if (import.meta.env.DEV) {
    const module = await import('./mockAdapter');
    return module.authApi;
  }

  return productionAuthApi;
}

export const authApi: IAuthApi = {
  login: (req) => resolveAuthApi().then((api) => api.login(req)),
  logout: () => resolveAuthApi().then((api) => api.logout()),
  verifySession: (token) => resolveAuthApi().then((api) => api.verifySession(token)),
  getStores: (orgSlug) => resolveAuthApi().then((api) => api.getStores(orgSlug)),
};
