/**
 * PRODX POS - Staff Member Create / Edit Modal
 */

import React, { useState, useEffect } from 'react';
import { User, Role } from '../../../domain/auth';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import {
  UserPlus,
  UserCheck,
  Shield,
  KeyRound,
  Mail,
  Hash,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser?: User | null;
  onSave: (data: {
    name: string;
    email: string;
    role: Role;
    employeeCode: string;
    pin?: string;
    isActive?: boolean;
    roleAssignmentNote?: string;
    assignedPermissionSetId?: string;
  }) => void;
}

export const StaffFormModal: React.FC<StaffFormModalProps> = ({
  isOpen,
  onClose,
  editingUser,
  onSave,
}) => {
  const { language } = useLanguage();
  const { getStaffPin, customPermissionSets } = useAuth();

  const [name, setName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('cashier');
  const [pin, setPin] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [roleAssignmentNote, setRoleAssignmentNote] = useState('');
  const [assignedPermissionSetId, setAssignedPermissionSetId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingUser) {
        setName(editingUser.name);
        setEmployeeCode(editingUser.employeeCode);
        setEmail(editingUser.email);
        setRole(editingUser.role);
        setIsActive(editingUser.isActive !== false);
        setPin(getStaffPin(editingUser.id) || '');
        setRoleAssignmentNote(editingUser.roleAssignmentNote || '');
        setAssignedPermissionSetId(editingUser.assignedPermissionSetId || '');
      } else {
        setName('');
        setEmployeeCode(`EMP-${Math.floor(100 + Math.random() * 900)}`);
        setEmail('');
        setRole('cashier');
        setIsActive(true);
        setPin('');
        setRoleAssignmentNote('');
        setAssignedPermissionSetId('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, editingUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = employeeCode.trim().toUpperCase();
    const trimmedEmail = email.trim();
    const trimmedPin = pin.trim();

    if (!trimmedName) {
      setErrorMsg(language === 'th' ? 'กรุณาระบุชื่อ-นามสกุลพนักงาน' : 'Please enter staff name');
      return;
    }

    if (!trimmedCode) {
      setErrorMsg(language === 'th' ? 'กรุณาระบุรหัสพนักงาน' : 'Please enter employee code');
      return;
    }

    if (trimmedPin && (trimmedPin.length < 4 || trimmedPin.length > 6 || !/^\d+$/.test(trimmedPin))) {
      setErrorMsg(language === 'th' ? 'รหัส PIN ต้องเป็นตัวเลข 4 - 6 หลัก' : 'PIN must be 4 to 6 numeric digits');
      return;
    }

    onSave({
      name: trimmedName,
      employeeCode: trimmedCode,
      email: trimmedEmail || `${trimmedCode.toLowerCase()}@prodx.io`,
      role,
      pin: trimmedPin || undefined,
      isActive,
      roleAssignmentNote: roleAssignmentNote.trim() || undefined,
      assignedPermissionSetId: assignedPermissionSetId || undefined,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingUser
          ? language === 'th'
            ? 'แก้ไขข้อมูลพนักงาน'
            : 'Edit Staff Account'
          : language === 'th'
          ? 'เพิ่มพนักงานใหม่'
          : 'Add New Staff Member'
      }
      description={
        language === 'th'
          ? 'กำหนดข้อมูลประจำตัว สิทธิการเข้าถึงระบบ และรหัส PIN ส่วนตัว'
          : 'Configure staff identity, operational role, and security credentials.'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold text-text mb-1">
            {language === 'th' ? 'ชื่อ - นามสกุล' : 'Full Name'} *
          </label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMsg(null);
              }}
              placeholder={language === 'th' ? 'เช่น สมชาย ใจดี' : 'e.g. Alex Vance'}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>

        {/* Employee Code & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-text mb-1">
              {language === 'th' ? 'รหัสพนักงาน' : 'Employee Code'} *
            </label>
            <div className="relative">
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => {
                  setEmployeeCode(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="EMP-108"
                className="w-full px-3 py-2 text-sm font-mono uppercase rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text mb-1">
              {language === 'th' ? 'อีเมล' : 'Email Address'}
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@prodx.io"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Assigned Role */}
        <div>
          <label className="block text-xs font-bold text-text mb-1.5">
            {language === 'th' ? 'ระดับสิทธิ์การใช้งาน (Assigned Role)' : 'Assigned System Role'} *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              {
                id: 'cashier' as Role,
                titleTh: 'แคชเชียร์ (Staff)',
                titleEn: 'Cashier (Staff)',
                descTh: 'คิดเงินหน้าร้าน, สแกนสินค้า, ดูสต็อก',
                descEn: 'Register sales, scanning, catalog',
                badgeVariant: 'neutral' as const,
              },
              {
                id: 'manager' as Role,
                titleTh: 'ผู้จัดการ (Manager)',
                titleEn: 'Shift Manager',
                descTh: 'อนุมัติคำสั่ง, ตรวจกะ, ดูรายงาน',
                descEn: 'Overrides, shifts, dashboard',
                badgeVariant: 'warning' as const,
              },
              {
                id: 'admin' as Role,
                titleTh: 'ผู้ดูแลระบบ (Admin)',
                titleEn: 'Administrator',
                descTh: 'สิทธิ์เต็ม 100% ทุกส่วนของระบบ',
                descEn: 'Full system access & settings',
                badgeVariant: 'primary' as const,
              },
            ].map((r) => {
              const isSelected = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border bg-card hover:bg-background'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-text">
                      {language === 'th' ? r.titleTh : r.titleEn}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-[11px] text-text/60 leading-tight">
                    {language === 'th' ? r.descTh : r.descEn}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick PIN */}
        <div>
          <label className="block text-xs font-bold text-text mb-1">
            {language === 'th' ? 'รหัสผ่านด่วน PIN (4-6 หลัก)' : 'Quick Security PIN (4-6 digits)'}
          </label>
          <div className="relative">
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setPin(val);
                setErrorMsg(null);
              }}
              placeholder="1234"
              className="w-full px-3 py-2 text-sm font-mono tracking-widest rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <p className="text-[11px] text-text/50 mt-1">
            {language === 'th'
              ? 'ใช้สำหรับปลดล็อกหน้าจอเครื่องคิดเงิน และอนุมัติคำสั่ง Supervisor Override'
              : 'Used for quick terminal unlocking and supervisor overrides.'}
          </p>
        </div>

        {/* Custom Permission Set Selection (Optional) */}
        {customPermissionSets.some((s) => s.targetRole === role) && (
          <div>
            <label className="block text-xs font-bold text-text mb-1">
              {language === 'th' ? 'ผูกชุดสิทธิ์กำหนดเอง (Custom Permission Set)' : 'Link Custom Permission Set (Optional)'}
            </label>
            <select
              value={assignedPermissionSetId}
              onChange={(e) => setAssignedPermissionSetId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">
                {language === 'th' ? '– ใช้สิทธิ์มาตรฐานตามตำแหน่ง (Standard Baseline) –' : '– Standard Role Baseline –'}
              </option>
              {customPermissionSets
                .filter((s) => s.targetRole === role)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {language === 'th' ? s.nameTh || s.name : s.name} ({s.permissions.length} perms)
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Role Assignment Note */}
        <div>
          <label className="block text-xs font-bold text-text mb-1 flex items-center justify-between">
            <span>{language === 'th' ? 'บันทึกเหตุผลการมอบหมายบทบาท (Audit Note)' : 'Role Assignment Note / Reason'}</span>
            <span className="text-[10px] text-text/40 font-normal">{language === 'th' ? 'ไม่บังคับ' : 'Optional'}</span>
          </label>
          <input
            type="text"
            value={roleAssignmentNote}
            onChange={(e) => setRoleAssignmentNote(e.target.value)}
            placeholder={
              language === 'th'
                ? 'เช่น บรรจุเป็นพนักงานประจำ, เปลี่ยนหน้าที่, ผ่านทดลองงาน...'
                : 'e.g. Completed onboarding, assigned to weekend branch supervisor...'
            }
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {language === 'th' ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {editingUser
              ? language === 'th'
                ? 'บันทึกข้อมูล'
                : 'Save Changes'
              : language === 'th'
              ? 'สร้างบัญชีพนักงาน'
              : 'Create Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
