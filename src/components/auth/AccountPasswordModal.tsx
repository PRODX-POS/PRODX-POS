import React from 'react';
import { KeyRound, X } from 'lucide-react';

interface AccountPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
  onPasswordUpdated?: (userId: string, newPass: string) => void;
  preselectedUserId?: string;
}

/**
 * Production safety boundary.
 * Password changes must be performed by an authenticated server-side API.
 * This component intentionally does not accept, store, compare, generate,
 * copy, or persist credentials in browser storage.
 */
export const AccountPasswordModal: React.FC<AccountPasswordModalProps> = ({ isOpen, onClose, language = 'th' }) => {
  if (!isOpen) return null;
  const isThai = language === 'th';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><KeyRound className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base font-black text-slate-900">{isThai ? 'จัดการรหัสผ่านบัญชี' : 'Account Password Management'}</h2>
              <p className="text-[11px] text-slate-500">{isThai ? 'การเปลี่ยนรหัสผ่านต้องดำเนินการผ่านเซิร์ฟเวอร์' : 'Password changes are server-authoritative.'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={isThai ? 'ปิด' : 'Close'} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {isThai
              ? 'ยังไม่มี endpoint เปลี่ยนรหัสผ่านที่ผ่านการยืนยันตัวตนจากเซิร์ฟเวอร์ใน production contract จึงปิดความสามารถนี้ไว้ชั่วคราว เพื่อไม่ให้มีการจัดเก็บหรือยืนยันรหัสผ่านบน browser'
              : 'A server-authenticated password-change endpoint is not yet part of the production contract. This function is intentionally disabled rather than handling credentials in the browser.'}
          </div>
          <button type="button" onClick={onClose} className="w-full h-10 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800">{isThai ? 'ปิด' : 'Close'}</button>
        </div>
      </div>
    </div>
  );
};
