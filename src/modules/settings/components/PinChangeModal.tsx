import React, { useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { useLanguage } from '../../../context/LanguageContext';

export interface PinChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * PIN changes are intentionally disabled until the Authentication Server
 * exposes an audited credential-management endpoint. No PIN may be written to
 * localStorage or treated as an authentication authority by the browser.
 */
export const PinChangeModal: React.FC<PinChangeModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const initialInputRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      id="pin-change-modal"
      isOpen={isOpen}
      onClose={onClose}
      initialFocusRef={initialInputRef}
      title={language === 'th' ? 'เปลี่ยนรหัส PIN ผู้ใช้งาน' : 'Change User PIN'}
      description={language === 'th' ? 'การจัดการ PIN ต้องดำเนินการโดย Authentication Server' : 'PIN management must be performed by the Authentication Server.'}
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <div>
            <div className="font-bold mb-1">{language === 'th' ? 'ยังไม่เปิดใช้งาน' : 'Not available yet'}</div>
            <div>
              {language === 'th'
                ? 'ระบบจะไม่สร้าง เปลี่ยน หรือเก็บ PIN บนเครื่อง POS จนกว่าจะมี API ฝั่งเซิร์ฟเวอร์ที่ผ่านการตรวจสอบและมี Audit Trail ครบถ้วน'
                : 'The POS will not create, change, or store PINs locally until an audited server-side credential-management API is available.'}
            </div>
          </div>
        </div>
        <div className="pt-3 border-t border-border flex justify-end">
          <Button ref={initialInputRef} type="button" variant="secondary" size="sm" onClick={onClose} className="rounded-md">
            {language === 'th' ? 'ปิด' : 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
