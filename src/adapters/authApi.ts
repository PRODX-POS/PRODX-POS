/**
 * Production authentication adapter boundary.
 *
 * This module deliberately contains network-only authentication wiring. It does
 * not fall back to the frontend mock adapter. The backend contract is the
 * source of truth for credentials, sessions, and authorization.
 */
import { IAuthApi, LoginRequest } from './types';
import { SessionContext, Store } from '../domain/auth';

const AUTH_API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL;

function requireBaseUrl(): string {
  if (!AUTH_API_BASE_URL) {
    throw new Error(
      'Production authentication is not configured: VITE_AUTH_API_BASE_URL is missing.'
    );
  }
  return AUTH_API_BASE_URL.replace(/\/$/, '');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
    throw new Error(`Authentication API request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

export const productionAuthApi: IAuthApi = {
  login: (req: LoginRequest) =>
    request<SessionContext>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  verifySession: () => request<SessionContext | null>('/auth/session'),
  getStores: (orgSlug: string) =>
    request<readonly Store[]>(`/organizations/${encodeURIComponent(orgSlug)}/stores`),
};
