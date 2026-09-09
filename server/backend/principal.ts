export interface AuthenticatedPrincipal {
  readonly userId: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly permissions: ReadonlySet<string>;
  readonly sessionId?: string;
}

export const hasPermission = (principal: AuthenticatedPrincipal, permission: string): boolean =>
  principal.permissions.has(permission);

export const requirePermission = (principal: AuthenticatedPrincipal, permission: string): void => {
  if (!hasPermission(principal, permission)) {
    throw new Error(`Forbidden: missing permission ${permission}`);
  }
};
