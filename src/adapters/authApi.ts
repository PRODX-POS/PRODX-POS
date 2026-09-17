/**
 * Production authentication adapter boundary.
 * The backend is authoritative for credentials, sessions, and authorization.
 */
import { IAuthApi, LoginRequest, AuthSessionResponse } from './types';
import { SessionContext, Store, Organization, User } from '../domain/auth';

const AUTH_API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL;
function requireBaseUrl(): string {
  if (!AUTH_API_BASE_URL) throw new Error('Production authentication is not configured: VITE_AUTH_API_BASE_URL is missing.');
  return AUTH_API_BASE_URL.replace(/\/$/, '');
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${requireBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) throw new Error(`Authentication API request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

const hydrateSession = async (raw: AuthSessionResponse): Promise<SessionContext> => {
  const session = await request<SessionContext>('/auth/session', {
    headers: { Authorization: `Bearer ${raw.token}` },
  });
  if (!session) throw new Error('Authentication API returned an invalid session.');
  if (session.sessionId !== raw.sessionId || session.token !== raw.token || session.expiresAt !== raw.expiresAt) {
    throw new Error('Authentication API session response failed integrity validation.');
  }
  return session;
};

export const productionAuthApi: IAuthApi = {
  login: async (req: LoginRequest) => {
    const raw = await request<AuthSessionResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(req) });
    return { raw, context: await hydrateSession(raw) } as unknown as never;
  },
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  verifySession: (token: string) => request<SessionContext | null>('/api/v1/auth/session', { headers: { Authorization: `Bearer ${token}` } }),
  getStores: (orgSlug: string) => request<readonly Store[]>(`/organizations/${encodeURIComponent(orgSlug)}/stores`),
};
