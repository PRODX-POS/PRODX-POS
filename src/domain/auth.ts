/**
 * PRODX POS Domain - Auth, Tenant & RBAC Module
 */

export type Role = 'admin' | 'manager' | 'cashier';

export type Permission =
  | 'pos:checkout'
  | 'pos:discount'
  | 'pos:price_override'
  | 'pos:void'
  | 'pos:refund'
  | 'shift:open'
  | 'shift:close'
  | 'shift:pay_movement'
  | 'inventory:read'
  | 'inventory:adjust'
  | 'customers:read'
  | 'customers:write'
  | 'reports:read'
  | 'audit:read'
  | 'settings:manage';

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
  readonly employeeCode: string;
  readonly avatarUrl?: string;
  readonly permissions: readonly Permission[];
}

export interface Store {
  readonly id: string;
  readonly organizationId: string;
  readonly code: string;
  readonly name: string;
  readonly address: string;
  readonly phone: string;
  readonly currency: string;
  readonly timezone: string;
  readonly defaultTaxRateBps: number; // e.g. 825 = 8.25%
}

export interface Organization {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly stores: readonly Store[];
}

export interface SessionContext {
  readonly organization: Organization;
  readonly currentStore: Store;
  readonly registerId: string;
  readonly currentUser: User;
  readonly token: string;
  readonly expiresAt: string; // ISO 8601 UTC
}

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [
    'pos:checkout',
    'pos:discount',
    'pos:price_override',
    'pos:void',
    'pos:refund',
    'shift:open',
    'shift:close',
    'shift:pay_movement',
    'inventory:read',
    'inventory:adjust',
    'customers:read',
    'customers:write',
    'reports:read',
    'audit:read',
    'settings:manage',
  ],
  manager: [
    'pos:checkout',
    'pos:discount',
    'pos:price_override',
    'pos:void',
    'pos:refund',
    'shift:open',
    'shift:close',
    'shift:pay_movement',
    'inventory:read',
    'inventory:adjust',
    'customers:read',
    'customers:write',
    'reports:read',
    'audit:read',
  ],
  cashier: [
    'pos:checkout',
    'pos:discount',
    'shift:open',
    'shift:close',
    'inventory:read',
    'customers:read',
    'customers:write',
  ],
};

export function hasPermission(user: User, permission: Permission): boolean {
  return user.permissions.includes(permission);
}
