import React from 'react';
import { Keyboard, Command, Sparkles, Check } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { useLanguage } from '../../../context/LanguageContext';

export interface SettingsKeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsKeyboardShortcutsModal: React.FC<SettingsKeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { language } = useLanguage();
  const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    {
      keys: [`${modKey}`, 'S'],
      action: language === 'th' ? 'บันทึกการตั้งค่าทั้งหมดทันที' : 'Save all configuration changes immediately',
      category: language === 'th' ? 'การจัดการฟอร์ม' : 'Form Management',
    },
    {
      keys: ['Esc'],
      action: language === 'th' ? 'ยกเลิกการแก้ไขฟอร์ม / ปิดหน้าต่าง' : 'Discard unsaved changes / Close active modal',
      category: language === 'th' ? 'การจัดการฟอร์ม' : 'Form Management',
    },
    {
      keys: ['Alt', '1'],
      action: language === 'th' ? 'สลับไปยัง: ข้อมูลสาขาและทั่วไป' : 'Jump to: General & Store tab',
      category: language === 'th' ? 'การสลับหมวดหมู่' : 'Tab Navigation',
    },
    {
      keys: ['Alt', '2'],
      action: language === 'th' ? 'สลับไปยัง: รูปลักษณ์และการแสดงผล' : 'Jump to: Appearance & Display tab',
      category: language === 'th' ? 'การสลับหมวดหมู่' : 'Tab Navigation',
    },
    {
      keys: ['Alt', '3'],
      action: language === 'th' ? 'สลับไปยัง: อุปกรณ์และฮาร์ดแวร์' : 'Jump to: Hardware & Peripherals tab',
      category: language === 'th' ? 'การสลับหมวดหมู่' : 'Tab Navigation',
    },
    {
      keys: ['Alt', '4'],
      action: language === 'th' ? 'สลับไปยัง: การเงินและภาษี' : 'Jump to: Tax & Accounting tab',
      category: language === 'th' ? 'การสลับหมวดหมู่' : 'Tab Navigation',
    },
    {
      keys: ['Alt', '5'],
      action: language === 'th' ? 'สลับไปยัง: ความปลอดภัยและสิทธิ' : 'Jump to: Security & Roles tab',
      category: language === 'th' ? 'การสลับหมวดหมู่' : 'Tab Navigation',
    },
    {
      keys: ['Alt', '6'],
      action: language === 'th' ? 'สลับไปยัง: การซิงค์และสำรองข้อมูล' : 'Jump to: Offline & Data Sync tab',
      category: language === 'th' ? 'การสลับหมวดหมู่' : 'Tab Navigation',
    },
    {
      keys: ['Alt', 'D'],
      action: language === 'th' ? 'เปิดศูนย์วินิจฉัยสุขภาพและโทรมาตรระบบ (System Health Diagnostics)' : 'Open System Diagnostic & Health Telemetry HUD',
      category: language === 'th' ? 'การวินิจฉัยระบบ' : 'System Diagnostics',
    },
    {
      keys: ['↑', '↓', '←', '→'],
      action: language === 'th' ? 'เลื่อนโฟกัสระหว่างแท็บในรายการ' : 'Cycle through sidebar tabs',
      category: language === 'th' ? 'การนำทางด้วยคีย์บอร์ด' : 'Keyboard Navigation',
    },
    {
      keys: [`${modKey}`, 'K'],
      action: language === 'th' ? 'เปิดค้นหาด่วนทั่วทั้งระบบ (Global Search)' : 'Open Global Search Omni-bar',
      category: language === 'th' ? 'ระบบทั่วไป' : 'Global Commands',
    },
  ];

  return (
    <Modal
      id="settings-shortcuts-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'th' ? 'คีย์ลัดศูนย์การตั้งค่า (Keyboard Shortcuts)' : 'Settings Hub Keyboard Shortcuts'}
      description={
        language === 'th'
          ? 'ควบคุมระบบและจัดการการตั้งค่าทั้งหมดได้อย่างรวดเร็วด้วยแป้นพิมพ์'
          : 'Speed up terminal configuration with enterprise keyboard shortcuts and focus controls.'
      }
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-1 gap-2.5">
          {shortcuts.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-background/60 hover:bg-card/80 transition"
            >
              <div className="flex flex-col">
                <span className="font-bold text-text text-xs">{sc.action}</span>
                <span className="text-[10px] text-text/50">{sc.category}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {sc.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="px-2 py-1 min-w-[24px] text-center text-[11px] font-mono font-bold bg-card border border-border text-text rounded shadow-2xs"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-end">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onClose}
            className="rounded-md font-bold text-xs"
          >
            {language === 'th' ? 'เข้าใจแล้ว (Esc)' : 'Got it (Esc)'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
