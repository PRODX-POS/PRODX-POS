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
  readonly isActive?: boolean;
  readonly lastRoleAssignedAt?: string;
  readonly assignedBy?: string;
  readonly assignedPermissionSetId?: string;
  readonly roleAssignmentNote?: string;
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
  readonly defaultTaxRateBps: number; // e.g. 700 = 7.00%
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
    'settings:manage',
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

export interface PermissionMeta {
  id: Permission;
  category: 'pos' | 'shift' | 'inventory' | 'customers' | 'reports' | 'settings';
  nameEn: string;
  nameTh: string;
  descEn: string;
  descTh: string;
  isSensitive: boolean;
}

export const PERMISSION_DEFINITIONS: PermissionMeta[] = [
  // POS
  {
    id: 'pos:checkout',
    category: 'pos',
    nameEn: 'POS Cash Register Checkout',
    nameTh: 'คิดเงินและออกใบเสร็จหน้าร้าน',
    descEn: 'Scan products, apply basket items, and tender cash or card payments.',
    descTh: 'สแกนสินค้า เพิ่มรายการ และรับชำระเงินสดหรือบัตร',
    isSensitive: false,
  },
  {
    id: 'pos:discount',
    category: 'pos',
    nameEn: 'Apply Discounts & Promotions',
    nameTh: 'ให้ส่วนลดและโปรโมชั่น',
    descEn: 'Apply percentage or fixed value discounts to cart or line items.',
    descTh: 'ใส่ส่วนลดเปอร์เซ็นต์หรือส่วนลดตามจำนวนเงินต่อรายการ',
    isSensitive: false,
  },
  {
    id: 'pos:price_override',
    category: 'pos',
    nameEn: 'Price Override',
    nameTh: 'ปรับแก้ราคาสินค้าหน้าร้าน',
    descEn: 'Manually modify unit price for active cart line items during checkout.',
    descTh: 'แก้ไขราคาต่อหน่วยของสินค้าในตะกร้าระหว่างขาย',
    isSensitive: true,
  },
  {
    id: 'pos:void',
    category: 'pos',
    nameEn: 'Void Bill / Transaction',
    nameTh: 'ยกเลิกบิล / ล้างรายการขาย',
    descEn: 'Void active orders or cancel completed bills before final settlement.',
    descTh: 'ยกเลิกบิลที่ยังไม่ชำระ หรือยกเลิกคำสั่งซื้อระหว่างคิดเงิน',
    isSensitive: true,
  },
  {
    id: 'pos:refund',
    category: 'pos',
    nameEn: 'Issue Refunds & Returns',
    nameTh: 'คืนเงินและรับคืนสินค้า (Refund)',
    descEn: 'Process customer returns, issue cash or card payment chargebacks.',
    descTh: 'ออกใบคืนเงินและคืนสินค้าให้ลูกค้า พร้อมคืนเงินสดหรือบัตร',
    isSensitive: true,
  },
  // Shift & Cash
  {
    id: 'shift:open',
    category: 'shift',
    nameEn: 'Open Cash Shift',
    nameTh: 'เปิดกะและบันทึกเงินทอนเริ่มต้น',
    descEn: 'Initiate a new register shift and count opening float cash.',
    descTh: 'เริ่มกะการขายใหม่และนับเงินทอนตั้งต้นในลิ้นชัก',
    isSensitive: false,
  },
  {
    id: 'shift:close',
    category: 'shift',
    nameEn: 'Close Cash Shift (X/Z Report)',
    nameTh: 'ปิดกะและพิมพ์สรุปยอด (X/Z-Report)',
    descEn: 'Perform blind cash drop count and finalize register shift reconciliation.',
    descTh: 'นับเงินสดปิดกะ กระทบยอด และออกรายงานสรุปยอดกะ',
    isSensitive: false,
  },
  {
    id: 'shift:pay_movement',
    category: 'shift',
    nameEn: 'Drawer Float & Safe Drop (Pay In/Out)',
    nameTh: 'นำเงินเข้า/ออกลิ้นชัก และส่งเงินเข้าเซฟ',
    descEn: 'Perform pay in, petty cash payouts, and secure safe drop movements.',
    descTh: 'เบิกจ่ายเงินสดย่อย นำเงินเข้า/ออกลิ้นชัก และส่งเงินเข้าตู้เซฟ',
    isSensitive: true,
  },
  // Inventory
  {
    id: 'inventory:read',
    category: 'inventory',
    nameEn: 'View Inventory & Catalog',
    nameTh: 'ดูข้อมูลสินค้าและสต็อกคงคลัง',
    descEn: 'Lookup stock levels, barcode details, and wholesale costs.',
    descTh: 'ตรวจสอบจำนวนสินค้าคงคลัง ข้อมูลบาร์โค้ด และราคาต้นทุน',
    isSensitive: false,
  },
  {
    id: 'inventory:adjust',
    category: 'inventory',
    nameEn: 'Adjust Stock & Inventory Ledger',
    nameTh: 'ปรับยอดสต็อกและบันทึกตัดสต็อก',
    descEn: 'Perform stock count adjustments, write-offs, and receive purchase orders.',
    descTh: 'ปรับยอดสต็อกสินค้า ตัดของเสีย และรับสินค้าเข้าคลัง',
    isSensitive: true,
  },
  // Customers
  {
    id: 'customers:read',
    category: 'customers',
    nameEn: 'View Customer Profiles & Points',
    nameTh: 'ดูข้อมูลสมาชิกและแต้มสะสม',
    descEn: 'Search customer database, view loyalty tiers and transaction history.',
    descTh: 'ค้นหาฐานข้อมูลลูกค้า ตรวจสอบแต้มสะสม และประวัติการซื้อ',
    isSensitive: false,
  },
  {
    id: 'customers:write',
    category: 'customers',
    nameEn: 'Create & Edit Customers',
    nameTh: 'เพิ่มและแก้ไขข้อมูลสมาชิก',
    descEn: 'Register new customers, edit contact information and tax IDs.',
    descTh: 'ลงทะเบียนสมาชิกลูกค้าใหม่ และแก้ไขข้อมูลที่อยู่/เบอร์โทร',
    isSensitive: false,
  },
  // Reports & Analytics
  {
    id: 'reports:read',
    category: 'reports',
    nameEn: 'View Sales & Profit Dashboard',
    nameTh: 'ดูแดชบอร์ดสรุปยอดขายและกำไรขั้นต้น',
    descEn: 'Access high-level revenue figures, store margins, and sales analytics.',
    descTh: 'เข้าถึงสรุปยอดขายรวม กำไรขั้นต้น และรายงานวิเคราะห์ทางการเงิน',
    isSensitive: true,
  },
  {
    id: 'audit:read',
    category: 'reports',
    nameEn: 'View Security & Audit Trail',
    nameTh: 'ดูบันทึกความปลอดภัยและประวัติระบบ (Audit Trail)',
    descEn: 'Inspect immutable system event logs, supervisor overrides, and security alerts.',
    descTh: 'ตรวจสอบบันทึกความปลอดภัย การอนุมัติของผู้จัดการ และเหตุการณ์ในระบบ',
    isSensitive: true,
  },
  // System & Settings
  {
    id: 'settings:manage',
    category: 'settings',
    nameEn: 'System & Financial Settings',
    nameTh: 'จัดการตั้งค่าระบบและนโยบายร้าน',
    descEn: 'Configure tax rates, printer hardware, user permissions, and store profiles.',
    descTh: 'กำหนดอัตราภาษี ตั้งค่าฮาร์ดแวร์ จัดการสิทธิ์ และข้อมูลสาขา',
    isSensitive: true,
  },
];

export const DEFAULT_STAFF_DIRECTORY: User[] = [
  {
    id: 'usr-admin-alex',
    name: 'Alex Vance',
    email: 'alex.vance@prodx.io',
    role: 'admin',
    employeeCode: 'EMP-001',
    permissions: ROLE_PERMISSIONS.admin,
    isActive: true,
    lastRoleAssignedAt: '2026-01-15T09:00:00.000Z',
    assignedBy: 'System Root',
    roleAssignmentNote: 'Store Owner & Primary Administrator',
  },
  {
    id: 'usr-manager-sarah',
    name: 'Sarah Connor',
    email: 'sarah.connor@prodx.io',
    role: 'manager',
    employeeCode: 'EMP-014',
    permissions: ROLE_PERMISSIONS.manager,
    isActive: true,
    lastRoleAssignedAt: '2026-02-01T10:30:00.000Z',
    assignedBy: 'Alex Vance',
    roleAssignmentNote: 'Promoted to Shift Supervisor & Floor Manager',
  },
  {
    id: 'usr-cashier-john',
    name: 'John Doe',
    email: 'john.doe@prodx.io',
    role: 'cashier',
    employeeCode: 'EMP-108',
    permissions: ROLE_PERMISSIONS.cashier,
    isActive: true,
    lastRoleAssignedAt: '2026-03-10T14:15:00.000Z',
    assignedBy: 'Sarah Connor',
    roleAssignmentNote: 'Frontline register cashier',
  },
  {
    id: 'usr-cashier-emily',
    name: 'Emily Stone',
    email: 'emily.stone@prodx.io',
    role: 'cashier',
    employeeCode: 'EMP-109',
    permissions: ROLE_PERMISSIONS.cashier,
    isActive: true,
    lastRoleAssignedAt: '2026-04-05T08:45:00.000Z',
    assignedBy: 'Sarah Connor',
    roleAssignmentNote: 'Registered cashier profile',
  },
];

export const DEFAULT_STAFF_PINS: Record<string, string> = {
  'usr-admin-alex': '1234',
  'usr-manager-sarah': '5678',
  'usr-cashier-john': '0000',
  'usr-cashier-emily': '1111',
};

export const STAFF_STORAGE_KEY = 'prodx_pos_staff_directory';
export const ROLE_PERMS_STORAGE_KEY = 'prodx_pos_role_permissions';
export const STAFF_PINS_STORAGE_KEY = 'prodx_pos_staff_pins';

export function getStoredStaffDirectory(): User[] {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse staff directory from storage', e);
  }
  return DEFAULT_STAFF_DIRECTORY;
}

export function saveStoredStaffDirectory(users: User[]): void {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save staff directory to storage', e);
  }
}

export function getStoredRolePermissions(): Record<Role, Permission[]> {
  try {
    const raw = localStorage.getItem(ROLE_PERMS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse role permissions from storage', e);
  }
  return {
    admin: [...ROLE_PERMISSIONS.admin],
    manager: [...ROLE_PERMISSIONS.manager],
    cashier: [...ROLE_PERMISSIONS.cashier],
  };
}

export function saveStoredRolePermissions(matrix: Record<Role, Permission[]>): void {
  try {
    localStorage.setItem(ROLE_PERMS_STORAGE_KEY, JSON.stringify(matrix));
  } catch (e) {
    console.error('Failed to save role permissions to storage', e);
  }
}

export function getStoredStaffPins(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STAFF_PINS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse staff pins from storage', e);
  }
  return { ...DEFAULT_STAFF_PINS };
}

export function saveStoredStaffPins(pins: Record<string, string>): void {
  try {
    localStorage.setItem(STAFF_PINS_STORAGE_KEY, JSON.stringify(pins));
  } catch (e) {
    console.error('Failed to save staff pins to storage', e);
  }
}

export function hasPermission(user: User, permission: Permission): boolean {
  return user.permissions.includes(permission);
}
