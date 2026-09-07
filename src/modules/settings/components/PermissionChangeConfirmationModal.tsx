/**
 * PRODX POS - Permission & Role Change Confirmation Modal
 * Dedicated confirmation modal shown whenever an administrator updates personnel role access.
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  Role,
  Permission,
  ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  PermissionMeta,
} from '../../../domain/auth';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { getZIndexClass } from '../../../utils/ZIndexManager';
import { recordRbacAuditLog } from '../utils/rbacAudit';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import {
  Shield,
  ShieldCheck,
  Award,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Plus,
  Minus,
  Check,
  X,
  FileText,
  UserCheck,
  Lock,
  Sparkles,
  Info,
} from 'lucide-react';

export interface PermissionChangeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  targetRole: Role;
  customTargetPermissions?: Permission[];
  onConfirm: (note?: string) => void;
  isSubmitting?: boolean;
}

export const PermissionChangeConfirmationModal: React.FC<PermissionChangeConfirmationModalProps> = ({
  isOpen,
  onClose,
  user,
  targetRole,
  customTargetPermissions,
  onConfirm,
  isSubmitting = false,
}) => {
  const { language } = useLanguage();
  const { session, staffUsers, rolePermissions } = useAuth();
  const [auditNote, setAuditNote] = useState<string>('');

  // Reset audit note when modal opens/changes user
  React.useEffect(() => {
    if (isOpen) {
      setAuditNote('');
    }
  }, [isOpen, user, targetRole]);

  // Safety checks
  const adminCount = useMemo(() => {
    return staffUsers.filter((u) => u.role === 'admin' && u.isActive !== false).length;
  }, [staffUsers]);

  const isCurrentSessionUser = session?.currentUser.id === user?.id;
  const isDemotingLastAdmin =
    user?.role === 'admin' && targetRole !== 'admin' && adminCount <= 1;

  // Calculate target permissions
  const nextPermissions: Permission[] = useMemo(() => {
    if (customTargetPermissions && customTargetPermissions.length > 0) {
      return customTargetPermissions;
    }
    return (rolePermissions[targetRole] as Permission[]) || (ROLE_PERMISSIONS[targetRole] as Permission[]) || [];
  }, [customTargetPermissions, targetRole, rolePermissions]);

  // Calculate permissions diff
  const diff = useMemo(() => {
    if (!user) return { added: [] as PermissionMeta[], removed: [] as PermissionMeta[], unchanged: [] as PermissionMeta[] };

    const currentPermSet = new Set(
      user.permissions.length > 0
        ? user.permissions
        : (rolePermissions[user.role] as Permission[]) || (ROLE_PERMISSIONS[user.role] as Permission[]) || []
    );
    const nextPermSet = new Set(nextPermissions);

    const added: PermissionMeta[] = [];
    const removed: PermissionMeta[] = [];
    const unchanged: PermissionMeta[] = [];

    PERMISSION_DEFINITIONS.forEach((meta) => {
      const inCurrent = currentPermSet.has(meta.id);
      const inNext = nextPermSet.has(meta.id);

      if (!inCurrent && inNext) {
        added.push(meta);
      } else if (inCurrent && !inNext) {
        removed.push(meta);
      } else if (inCurrent && inNext) {
        unchanged.push(meta);
      }
    });

    return { added, removed, unchanged };
  }, [user, nextPermissions, rolePermissions]);

  // Sensitive permissions being granted
  const sensitiveAdded = useMemo(() => {
    return diff.added.filter((p) => p.isSensitive);
  }, [diff.added]);

  if (!isOpen || !user) return null;
  if (typeof document === 'undefined') return null;

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'admin':
        return language === 'th' ? 'ผู้ดูแลระบบ (Admin)' : 'Administrator';
      case 'manager':
        return language === 'th' ? 'ผู้จัดการ (Manager)' : 'Shift Manager';
      case 'cashier':
        return language === 'th' ? 'พนักงานขาย (Staff/Cashier)' : 'Staff (Cashier)';
    }
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-primary" />;
      case 'manager':
        return <Award className="w-4 h-4 text-amber-500" />;
      case 'cashier':
        return <ShoppingCart className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRoleBadgeVariant = (role: Role): 'primary' | 'warning' | 'neutral' => {
    switch (role) {
      case 'admin':
        return 'primary';
      case 'manager':
        return 'warning';
      case 'cashier':
        return 'neutral';
    }
  };

  const handleApply = () => {
    if (isDemotingLastAdmin) return;
    recordRbacAuditLog({
      author: session?.currentUser.name || 'Administrator',
      authorEmail: session?.currentUser.email,
      action: `Changed role for ${user.name} (${user.employeeCode}) from ${user.role.toUpperCase()} to ${targetRole.toUpperCase()}`,
      target: user.name,
      details: auditNote.trim() ? `Reason: ${auditNote.trim()}` : undefined,
    });
    onConfirm(auditNote.trim() || undefined);
  };

  const quickNotes = [
    language === 'th' ? 'เลื่อนตำแหน่งเป็นหัวหน้างาน' : 'Promoted to Shift Supervisor',
    language === 'th' ? 'มอบหมายสิทธิ์ดูแลกะประจำวัน' : 'Assigned shift management access',
    language === 'th' ? 'ปรับเปลี่ยนหน้าที่ตามโครงสร้างร้าน' : 'Routine department reallocation',
    language === 'th' ? 'ผ่านการประเมินการฝึกอบรม' : 'Completed staff onboarding',
  ];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-confirm-title"
      className={`fixed inset-0 ${getZIndexClass('modal')} flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-card rounded-2xl border border-border border-crisp shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 id="permission-confirm-title" className="text-sm font-bold text-text">
                {language === 'th'
                  ? 'ยืนยันการเปลี่ยนบทบาทและสิทธิ์พนักงาน'
                  : 'Confirm Permission & Role Change'}
              </h3>
              <p className="text-[11px] text-text/50">
                {language === 'th'
                  ? 'ตรวจสอบระดับสิทธิ์และผลกระทบด้านความปลอดภัยก่อนบันทึก'
                  : 'Review entitlement changes and security impacts before applying.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text/50 hover:text-text hover:bg-background transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Target User Banner */}
          <div className="p-3.5 rounded-xl border border-border border-crisp bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 ${
                  user.role === 'admin'
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : user.role === 'manager'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-card border-border text-text/70'
                }`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-text">{user.name}</span>
                  {isCurrentSessionUser && (
                    <Badge variant="primary" size="sm" className="font-mono text-[9px] uppercase font-bold">
                      {language === 'th' ? 'บัญชีที่คุณใช้งานอยู่' : 'Your Active Session'}
                    </Badge>
                  )}
                  {user.isActive === false && (
                    <Badge variant="neutral" size="sm" className="font-mono text-[9px] uppercase text-text/40">
                      {language === 'th' ? 'ระงับใช้งาน' : 'Inactive'}
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-text/50 font-mono mt-0.5">
                  <span className="font-bold text-text/80">{user.employeeCode}</span> • {user.email}
                </div>
              </div>
            </div>

            <div className="text-right sm:self-center">
              <div className="text-[10px] text-text/40 uppercase font-semibold">
                {language === 'th' ? 'การเปลี่ยนแปลงบทบาท' : 'Role Transition'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={getRoleBadgeVariant(user.role)} size="sm" className="font-mono uppercase font-bold text-[10px]">
                  {user.role}
                </Badge>
                <ArrowRight className="w-3.5 h-3.5 text-text/40" />
                <Badge variant={getRoleBadgeVariant(targetRole)} size="sm" className="font-mono uppercase font-bold text-[10px]">
                  {targetRole}
                </Badge>
              </div>
            </div>
          </div>

          {/* Role Transition Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Current Role Card */}
            <div className="p-3 rounded-xl border border-border bg-card space-y-1.5">
              <div className="text-[10px] font-bold text-text/40 uppercase tracking-wider">
                {language === 'th' ? 'บทบาทปัจจุบัน' : 'Current Role'}
              </div>
              <div className="flex items-center gap-2">
                {getRoleIcon(user.role)}
                <span className="text-xs font-bold text-text">{getRoleLabel(user.role)}</span>
              </div>
              <p className="text-[11px] text-text/60 line-clamp-2">
                {user.role === 'admin' &&
                  (language === 'th'
                    ? 'สิทธิ์เต็มรูปแบบ ดูแลระบบ ตั้งค่าภาษี และจัดการพนักงาน'
                    : 'Unrestricted administration, tax config, and employee directory.')}
                {user.role === 'manager' &&
                  (language === 'th'
                    ? 'อนุมัติการคืนเงิน, ส่วนลดพิเศษ, ปรับสต็อก, และเปิด-ปิดกะ'
                    : 'Supervisor authority for refunds, discounts, voids, and cash floats.')}
                {user.role === 'cashier' &&
                  (language === 'th'
                    ? 'คิดเงินหน้าร้าน, สแกนสินค้า, และรับชำระเงิน'
                    : 'Frontline cashiering, item barcode scanning, and till checkout.')}
              </p>
            </div>

            {/* Target Role Card */}
            <div className="p-3 rounded-xl border border-primary/40 bg-primary/5 space-y-1.5 ring-1 ring-primary/20">
              <div className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center justify-between">
                <span>{language === 'th' ? 'บทบาทใหม่ที่เลือก' : 'New Target Role'}</span>
                <span className="font-mono text-[10px]">
                  {nextPermissions.length}/15 {language === 'th' ? 'สิทธิ์' : 'perms'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getRoleIcon(targetRole)}
                <span className="text-xs font-bold text-text">{getRoleLabel(targetRole)}</span>
              </div>
              <p className="text-[11px] text-text/70 line-clamp-2">
                {targetRole === 'admin' &&
                  (language === 'th'
                    ? 'สิทธิ์เต็มรูปแบบ ดูแลระบบ ตั้งค่าภาษี และจัดการพนักงาน'
                    : 'Unrestricted administration, tax config, and employee directory.')}
                {targetRole === 'manager' &&
                  (language === 'th'
                    ? 'อนุมัติการคืนเงิน, ส่วนลดพิเศษ, ปรับสต็อก, และเปิด-ปิดกะ'
                    : 'Supervisor authority for refunds, discounts, voids, and cash floats.')}
                {targetRole === 'cashier' &&
                  (language === 'th'
                    ? 'คิดเงินหน้าร้าน, สแกนสินค้า, และรับชำระเงิน'
                    : 'Frontline cashiering, item barcode scanning, and till checkout.')}
              </p>
            </div>
          </div>

          {/* Security Guardrail Warnings */}
          {isDemotingLastAdmin && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-700 dark:text-rose-400 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <div className="space-y-1">
                <p className="font-bold">
                  {language === 'th'
                    ? 'ไม่สามารถลดระดับบทบาทของแอดมินคนสุดท้ายได้'
                    : 'Cannot Demote the Last Active Administrator'}
                </p>
                <p className="text-[11px] opacity-90">
                  {language === 'th'
                    ? 'ร้านค้าต้องมีผู้ดูแลระบบ (Admin) ที่เปิดใช้งานอยู่อย่างน้อย 1 คนเสมอ เพื่อความปลอดภัยและการเข้าถึงเมนูตั้งค่า กรุณากำหนดพนักงานอื่นเป็น Admin ก่อน'
                    : 'The system requires at least one active Administrator to prevent lockout. Please promote another staff profile to Admin first.'}
                </p>
              </div>
            </div>
          )}

          {isCurrentSessionUser && !isDemotingLastAdmin && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-700 dark:text-amber-400 text-xs">
              <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
              <div className="space-y-1">
                <p className="font-bold">
                  {language === 'th'
                    ? 'คุณกำลังเปลี่ยนบทบาทของบัญชีที่คุณใช้งานอยู่'
                    : 'Modifying Current Active Session'}
                </p>
                <p className="text-[11px] opacity-90">
                  {language === 'th'
                    ? 'เมื่อยืนยันแล้ว ระบบจะรีเฟรชสิทธิ์การเข้าถึงเมนูต่างๆ ของคุณทันทีตามบทบาทใหม่'
                    : 'Your session permissions and view access will be refreshed immediately upon confirmation.'}
                </p>
              </div>
            </div>
          )}

          {sensitiveAdded.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  {language === 'th' ? 'การมอบสิทธิ์ระดับสำคัญ (Sensitive Privileges):' : 'Elevated Privileges Granted:'}
                </span>{' '}
                <span className="text-[11px]">
                  {sensitiveAdded.map((p) => (language === 'th' ? p.nameTh : p.nameEn)).join(', ')}
                </span>
              </div>
            </div>
          )}

          {/* Entitlement Diff Breakdown */}
          <div className="p-3.5 rounded-xl border border-border border-crisp bg-background space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                {language === 'th' ? 'การเปลี่ยนแปลงสิทธิ์ (Permissions Diff)' : 'Entitlement Impact Diff'}
              </span>
              <span className="font-mono text-text/50 text-[11px]">
                +{diff.added.length} / -{diff.removed.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Granted Permissions */}
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    {language === 'th' ? 'สิทธิ์ที่ได้รับเพิ่ม' : 'Granted Permissions'}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20">
                    +{diff.added.length}
                  </span>
                </div>

                {diff.added.length === 0 ? (
                  <div className="text-[10px] text-emerald-700/60 dark:text-emerald-400/60 italic py-1">
                    {language === 'th' ? 'ไม่มีสิทธิ์เพิ่มเติม' : 'No new permissions added'}
                  </div>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {diff.added.map((p) => (
                      <div
                        key={p.id}
                        className="p-1.5 rounded bg-emerald-500/15 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-[10px] flex items-start gap-1.5"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="font-bold truncate">{language === 'th' ? p.nameTh : p.nameEn}</div>
                          <div className="font-mono text-[9px] opacity-75">{p.id}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Revoked Permissions */}
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-400 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Minus className="w-3.5 h-3.5" />
                    {language === 'th' ? 'สิทธิ์ที่จะถูกยกเลิก' : 'Revoked Permissions'}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20">
                    -{diff.removed.length}
                  </span>
                </div>

                {diff.removed.length === 0 ? (
                  <div className="text-[10px] text-rose-700/60 dark:text-rose-400/60 italic py-1">
                    {language === 'th' ? 'ไม่มีสิทธิ์ที่ถูกถอนออก' : 'No permissions revoked'}
                  </div>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {diff.removed.map((p) => (
                      <div
                        key={p.id}
                        className="p-1.5 rounded bg-rose-500/15 border border-rose-500/20 text-rose-900 dark:text-rose-200 text-[10px] flex items-start gap-1.5"
                      >
                        <X className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="font-bold truncate">{language === 'th' ? p.nameTh : p.nameEn}</div>
                          <div className="font-mono text-[9px] opacity-75">{p.id}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audit Trail Note Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text uppercase tracking-wider">
                {language === 'th' ? 'บันทึกเหตุผลการเปลี่ยนสิทธิ์ (Audit Reason)' : 'Reason for Permission Change'}
              </label>
              <span className="text-[10px] text-text/40">
                {language === 'th' ? 'บันทึกใน Audit Log' : 'Recorded in audit trail'}
              </span>
            </div>

            <input
              type="text"
              value={auditNote}
              onChange={(e) => setAuditNote(e.target.value)}
              placeholder={
                language === 'th'
                  ? 'ระบุเหตุผล เช่น ผ่านการอบรมหัวหน้ากะ, มอบหมายงานใหม่...'
                  : 'e.g. Promoted to supervisor, scheduled shift cover...'
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Quick Note Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-text/40">
                {language === 'th' ? 'คำแนะนำด่วน:' : 'Quick tags:'}
              </span>
              {quickNotes.map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => setAuditNote(note)}
                  className="px-2 py-0.5 rounded text-[10px] bg-card border border-border text-text/70 hover:text-text hover:border-primary/40 transition-colors cursor-pointer"
                >
                  {note}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-card shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-lg text-xs"
          >
            {language === 'th' ? 'ยกเลิก' : 'Cancel'}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleApply}
            disabled={isDemotingLastAdmin || isSubmitting}
            className="rounded-lg font-bold text-xs"
            leftIcon={<Check className="w-4 h-4" />}
          >
            {isSubmitting
              ? language === 'th'
                ? 'กำลังบันทึก...'
                : 'Applying...'
              : language === 'th'
              ? 'ยืนยันและบันทึกสิทธิ์'
              : 'Confirm & Apply Permissions'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
