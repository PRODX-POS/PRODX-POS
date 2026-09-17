import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface AccountPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
  onPasswordUpdated?: (userId: string, newPass: string) => void;
  preselectedUserId?: string;
}

/**
 * Password changes are server-authoritative. The previous implementation
 * accepted client-side verification and persisted plaintext passwords in
 * localStorage. That flow is intentionally disabled until a backend password
 * mutation endpoint is wired into the production authentication contract.
 */
export const AccountPasswordModal: React.FC<AccountPasswordModalProps> = ({
  isOpen,
  onClose,
  language: rawLang = 'th',
}) => {
  const lang = rawLang === 'th' ? 'th' : 'en';
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleClose = () => {
    addToast({
      title: lang === 'th' ? 'การจัดการรหัสผ่านถูกปิดไว้' : 'Password management unavailable',
      message:
        lang === 'th'
          ? 'รหัสผ่านต้องเปลี่ยนผ่าน Authentication API ของเซิร์ฟเวอร์เท่านั้น'
          : 'Passwords must be changed through the server-side Authentication API.',
      type: 'warning',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-amber-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-base font-black text-slate-900">
                {lang === 'th' ? 'การเปลี่ยนรหัสผ่าน' : 'Change Password'}
              </h2>
              <p className="text-[11px] text-slate-600">
                {lang === 'th' ? 'การดำเนินการต้องผ่านเซิร์ฟเวอร์' : 'Server-authoritative operation required'}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm leading-6 text-slate-700">
            {lang === 'th'
              ? 'ระบบไม่อนุญาตให้ตรวจสอบหรือจัดเก็บรหัสผ่านใน Browser อีกต่อไป เพื่อป้องกัน credential exposure และ bypass authentication'
              : 'The browser no longer verifies or stores passwords. This prevents credential exposure and client-side authentication bypass.'}
          </p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            {lang === 'th'
              ? 'การเปลี่ยนรหัสผ่านจะเปิดใช้งานอีกครั้งเมื่อมี endpoint ฝั่ง server สำหรับ verify credential เดิม, เปลี่ยน credential และบันทึก audit ครบถ้วน'
              : 'Password changes will be enabled only after the server exposes an authenticated, audited credential-change endpoint.'}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
          >
            {lang === 'th' ? 'ปิด' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
