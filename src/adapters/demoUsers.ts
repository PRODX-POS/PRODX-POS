/**
 * Development-only demo users.
 *
 * This module is intentionally separate from the authentication adapter so
 * production authentication code cannot depend on mock user fixtures.
 */
import { User, ROLE_PERMISSIONS } from '../domain/auth';

export const SEED_USERS: User[] = [
  {
    id: 'usr-admin-alex',
    name: 'Alex Vance',
    email: 'alex.vance@prodx.io',
    role: 'admin',
    employeeCode: 'EMP-001',
    permissions: ROLE_PERMISSIONS.admin,
  },
  {
    id: 'usr-manager-sarah',
    name: 'Sarah Connor',
    email: 'sarah.connor@prodx.io',
    role: 'manager',
    employeeCode: 'EMP-014',
    permissions: ROLE_PERMISSIONS.manager,
  },
  {
    id: 'usr-cashier-john',
    name: 'John Doe',
    email: 'john.doe@prodx.io',
    role: 'cashier',
    employeeCode: 'EMP-108',
    permissions: ROLE_PERMISSIONS.cashier,
  },
];
