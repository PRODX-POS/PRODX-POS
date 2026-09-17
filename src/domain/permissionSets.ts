/**
 * PRODX POS - Custom Permission Sets Domain & Storage Module
 * Enterprise RBAC profile definitions, risk calculation, and template presets
 */

import { Permission, Role, PERMISSION_DEFINITIONS, ROLE_PERMISSIONS } from './auth';

export type PermissionRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface CustomPermissionSet {
  id: string;
  name: string;
  nameTh?: string;
  code: string;
  description: string;
  descriptionTh?: string;
  badgeColor: 'primary' | 'amber' | 'emerald' | 'purple' | 'rose' | 'cyan' | 'slate';
  targetRole: Role;
  permissions: Permission[];
  isSystem?: boolean;
  assignedStaffIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export const HIGH_RISK_PERMISSIONS: Record<Permission, { risk: PermissionRiskLevel; warningTh: string; warningEn: string }> = {
  'pos:checkout': { risk: 'low', warningTh: 'การคิดเงินและรับชำระปกติ', warningEn: 'Standard checkout operations' },
  'pos:discount': { risk: 'medium', warningTh: 'สามารถให้ส่วนลดกับลูกค้าได้', warningEn: 'Discretionary discounts' },
  'pos:price_override': { risk: 'high', warningTh: 'สามารถแก้ไขราคาต่อหน่วยของสินค้าได้โดยตรง', warningEn: 'Direct unit price manipulation' },
  'pos:void': { risk: 'high', warningTh: 'สามารถยกเลิกบิลหรือลบรายการสินค้าที่คิดเงินแล้ว', warningEn: 'Void transaction / cancel order' },
  'pos:refund': { risk: 'critical', warningTh: 'สามารถอนุมัติคืนเงินสดหรือเงินโอนให้ลูกค้าได้', warningEn: 'Cash/card refund authorization' },
  'shift:open': { risk: 'low', warningTh: 'เปิดกะและบันทึกเงินทอนเริ่มต้น', warningEn: 'Open cash till with starting float' },
  'shift:close': { risk: 'low', warningTh: 'ปิดกะและนับเงินสดสรุปยอดสิ้นวัน', warningEn: 'Close till and reconcile cash drawer' },
  'shift:pay_movement': { risk: 'medium', warningTh: 'นำเงินสดเข้า-ออกจากลิ้นชัก (Paid In / Paid Out)', warningEn: 'Manual cash float adjustments' },
  'inventory:read': { risk: 'low', warningTh: 'ตรวจสอบจำนวนสินค้าคงเหลือในคลัง', warningEn: 'Stock level visibility' },
  'inventory:adjust': { risk: 'medium', warningTh: 'ปรับยอดสต็อกสินค้าเพิ่มหรือลดในระบบ', warningEn: 'Stock write and ledger adjustment' },
  'customers:read': { risk: 'low', warningTh: 'ดูข้อมูลสมาชิกและประวัติการซื้อ', warningEn: 'Customer loyalty read access' },
  'customers:write': { risk: 'low', warningTh: 'เพิ่มหรือแก้ไขข้อมูลลูกค้าสมาชิก', warningEn: 'Create/modify customer records' },
  'reports:read': { risk: 'medium', warningTh: 'ดูข้อมูลยอดขาย กำไร และสถิติทางการเงิน', warningEn: 'Financial analytics & sales data' },
  'audit:read': { risk: 'high', warningTh: 'เข้าถึงประวัติการเข้าใช้งานและบันทึกความปลอดภัยทั้งหมด', warningEn: 'Security audit trail logs' },
  'settings:manage': { risk: 'critical', warningTh: 'แก้ไขการตั้งค่าร้านค้า ภาษี และนโยบายระบบ', warningEn: 'Master system configuration' },
  'ai:use': { risk: 'medium', warningTh: 'สามารถใช้ความสามารถ AI แบบช่วยเหลือของระบบ', warningEn: 'Assistive AI capabilities' },
};

export function getPermissionRisk(perm: Permission): PermissionRiskLevel {
  return HIGH_RISK_PERMISSIONS[perm]?.risk || 'low';
}

export function calculateSetRisk(permissions: Permission[]): PermissionRiskLevel {
  if (permissions.some((p) => HIGH_RISK_PERMISSIONS[p]?.risk === 'critical')) return 'critical';
  if (permissions.some((p) => HIGH_RISK_PERMISSIONS[p]?.risk === 'high')) return 'high';
  if (permissions.some((p) => HIGH_RISK_PERMISSIONS[p]?.risk === 'medium')) return 'medium';
  return 'low';
}

/**
 * Built-in Enterprise Permission Sets & Presets
 */
export const DEFAULT_PERMISSION_SETS: CustomPermissionSet[] = [
  {
    id: 'pset-admin-master',
    name: 'Administrator Master Profile',
    nameTh: 'ชุดสิทธิ์ผู้ดูแลระบบสูงสุด (Master)',
    code: 'PSET-ADM-01',
    description: 'Full root enterprise access across all POS terminals, stores, settings, audit, and user accounts.',
    descriptionTh: 'สิทธิ์ระดับสูงสุด ควบคุมทุกฟังก์ชัน ทั้งการเงิน สต็อก รายงาน บันทึกความปลอดภัย และการตั้งค่า',
    badgeColor: 'primary',
    targetRole: 'admin',
    permissions: [
      'pos:checkout','pos:discount','pos:price_override','pos:void','pos:refund','shift:open','shift:close','shift:pay_movement','inventory:read','inventory:adjust','customers:read','customers:write','reports:read','audit:read','settings:manage',
    ],
    isSystem: true,
    assignedStaffIds: ['usr-admin-alex'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pset-manager-lead', name: 'Floor Supervisor & Shift Lead', nameTh: 'ผู้จัดการสาขาและหัวหน้ากะ (Shift Lead)', code: 'PSET-MGR-01',
    description: 'Supervisory rights for floor operations, staff shift audits, void/refund authorizations, and inventory.', descriptionTh: 'สิทธิ์ดูแลการปฏิบัติงานหน้าร้าน อนุมัติการยกเลิกบิล คืนเงิน และตรวจนับสต็อกสินค้า', badgeColor: 'amber', targetRole: 'manager',
    permissions: ['pos:checkout','pos:discount','pos:price_override','pos:void','pos:refund','shift:open','shift:close','shift:pay_movement','inventory:read','inventory:adjust','customers:read','customers:write','reports:read','audit:read','settings:manage'],
    isSystem: true, assignedStaffIds: ['usr-manager-sarah'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pset-cashier-std', name: 'Standard Frontline Cashier', nameTh: 'พนักงานแคชเชียร์มาตรฐาน', code: 'PSET-CSH-STD',
    description: 'Standard retail frontline operations: barcode scan, standard discount, shift open/close, and customer lookup.', descriptionTh: 'ปฏิบัติงานคิดเงินหน้าร้านปกติ ให้ส่วนลดตามสิทธิ์ สแกนสินค้า และเปิด-ปิดกะประจำวัน', badgeColor: 'emerald', targetRole: 'cashier',
    permissions: ['pos:checkout','pos:discount','shift:open','shift:close','inventory:read','customers:read','customers:write'],
    isSystem: true, assignedStaffIds: ['usr-cashier-john','usr-cashier-emily'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
];

void PERMISSION_DEFINITIONS;
void ROLE_PERMISSIONS;
