import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { PauseCircle, ArrowRight } from 'lucide-react';
import { playScannerSound } from '../../services/soundService';

export interface ParkCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (label: string) => void;
  defaultLabel?: string;
}

export const ParkCartModal: React.FC<ParkCartModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultLabel = '',
}) => {
  const { language } = useLanguage();
  const [label, setLabel] = useState(defaultLabel);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLabel(defaultLabel);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultLabel]);

  const handleConfirm = () => {
    playScannerSound('click');
    onConfirm(label);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'th' ? 'พักบิล (Hold Cart)' : 'Park Cart'}
      description={language === 'th' ? 'ระบุชื่อหรือรายละเอียดสำหรับบิลนี้ เพื่อให้เรียกคืนได้ง่ายในภายหลัง' : 'Enter a label or reference for this cart to easily recall it later.'}
      maxWidth="sm"
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {language === 'th' ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleConfirm} rightIcon={<ArrowRight className="h-4 w-4" />}>
            {language === 'th' ? 'พักบิล' : 'Park Cart'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text/70">
            {language === 'th' ? 'ชื่ออ้างอิง / โต๊ะ / ลูกค้า' : 'Reference / Table / Customer'}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
            }}
            placeholder={language === 'th' ? 'เช่น โต๊ะ 5, คุณสมชาย' : 'e.g., Table 5, John Doe'}
            className="w-full min-h-[44px] bg-card border-crisp border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-text/40 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow shadow-2xs"
          />
        </div>
      </div>
    </Modal>
  );
};
