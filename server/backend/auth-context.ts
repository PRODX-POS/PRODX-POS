import type { AuthenticatedPrincipal } from './principal';

export interface AuthenticatedRequestContext {
  readonly principal: AuthenticatedPrincipal;
}

/**
 * Boundary for the real authentication backend. Implementations must derive
 * identity, organization, store and permissions from verified credentials or
 * server-side session state. Browser-supplied identity fields are never
 * authoritative.
 */
export interface AuthenticationContextResolver {
  resolve(request: unknown): Promise<AuthenticatedRequestContext | null>;
}

export const assertAuthenticated = (
  context: AuthenticatedRequestContext | null,
): AuthenticatedRequestContext => {
  if (!context) throw new Error('Unauthenticated');
  return context;
};
