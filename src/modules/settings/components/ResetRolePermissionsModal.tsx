/**
 * PRODX POS - Reset Role Permissions Confirmation Modal
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { getZIndexClass } from '../../../utils/ZIndexManager';
import { Button } from '../../../components/common/Button';
import { RotateCcw, AlertTriangle, X, Check, Shield } from 'lucide-react';

export interface ResetRolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResetRolePermissionsModal: React.FC<ResetRolePermissionsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { language } = useLanguage();

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-role-confirm-title"
      className={`fixed inset-0 ${getZIndexClass('modal')} flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-card rounded-2xl border border-border border-crisp shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 id="reset-role-confirm-title" className="text-sm font-bold text-text">
                {language === 'th' ? 'คืนค่าสิทธิ์มาตรฐานทุกตำแหน่ง' : 'Reset Role Permissions to Baseline'}
              </h3>
              <p className="text-[11px] text-text/50">
                {language === 'th' ? 'กู้คืนการตั้งค่าสิทธิ์ตั้งต้นจากโรงงาน' : 'Restore factory default role permissions'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text/50 hover:text-text hover:bg-background transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-700 dark:text-amber-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                {language === 'th' ? 'คำเตือน: การรีเซ็ตสิทธิ์ระบบ' : 'Warning: Global Permission Baseline Reset'}
              </p>
              <p className="text-[11px] opacity-90">
                {language === 'th'
                  ? 'สิทธิ์ทั้งหมดของตำแหน่ง Admin, Manager, และ Cashier จะถูกคืนค่าเป็นค่ามาตรฐานเดิม การปรับแต่งสิทธิ์รายตำแหน่งที่เคยทำไว้จะถูกลบล้าง'
                  : 'All permission entitlements for Admin, Manager, and Cashier will be reset to factory defaults. Custom per-role matrices will be overwritten.'}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="text-[11px] font-bold text-text uppercase tracking-wider">
              {language === 'th' ? 'โครงสร้างสิทธิ์มาตรฐานหลังรีเซ็ต:' : 'Standard baseline after reset:'}
            </div>
            <ul className="space-y-1 text-text/70 text-[11px]">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span><strong>Admin:</strong> 15/15 {language === 'th' ? 'สิทธิ์เต็มรูปแบบ' : 'Full access permissions'}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span><strong>Manager:</strong> 11/15 {language === 'th' ? 'สิทธิ์หัวหน้างาน (คืนเงิน, ปรับราคา, สต็อก)' : 'Supervisor access (Refunds, voids, inventory)'}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span><strong>Staff (Cashier):</strong> 6/15 {language === 'th' ? 'คิดเงินหน้าร้าน, ลูกค้า, เปิด-ปิดกะ' : 'POS Checkout, basic customer and shift operations'}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-card">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-lg text-xs">
            {language === 'th' ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="rounded-lg font-bold text-xs"
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            {language === 'th' ? 'ยืนยันการคืนค่ามาตรฐาน' : 'Confirm Reset to Defaults'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
