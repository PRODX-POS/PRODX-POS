import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { User, Role } from '../../domain/auth';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export interface SupervisorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actionDescription: string;
  requiredRole?: Role;
  onAuthorized: (supervisor: User, notes?: string) => void;
}

/**
 * Privileged supervisor authorization is fail-closed until the Authentication
 * Server exposes an audited re-authentication / WebAuthn authorization API.
 * The browser must never authorize a privileged operation from local PIN data.
 */
export const SupervisorAuthModal: React.FC<SupervisorAuthModalProps> = ({ isOpen, onClose, title, actionDescription }) => {
  const { language } = useLanguage();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || (language === 'th' ? 'ต้องยืนยันสิทธิ์ผู้จัดการ' : 'Supervisor Authorization Required')}
      description={language === 'th' ? 'การอนุมัติรายการสำคัญต้องยืนยันตัวตนกับ Authentication Server' : 'Privileged actions require Authentication Server verification.'}
      maxWidth="md"
      footer={<div className="flex justify-end"><Button variant="outline" size="sm" onClick={onClose}>{language === 'th' ? 'ปิด' : 'Close'}</Button></div>}
    >
      <div className="space-y-4">
        <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div>
            <div className="font-bold mb-1">{language === 'th' ? 'ยังไม่สามารถอนุมัติจากเครื่อง POS ได้' : 'Authorization unavailable on this terminal'}</div>
            <p className="text-xs">{actionDescription}</p>
            <p className="text-xs mt-2">{language === 'th' ? 'ไม่อนุญาตให้ใช้ PIN ที่เก็บใน browser หรือค่า PIN ทดสอบเพื่อข้ามการยืนยัน' : 'Browser-stored PINs and demo PINs cannot be used to bypass server authorization.'}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
