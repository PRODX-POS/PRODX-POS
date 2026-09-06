import React, { useEffect, useState } from 'react';
import { Save, RotateCcw, AlertCircle, Check } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { useLanguage } from '../../../context/LanguageContext';

export interface StickyActionBarProps {
  isVisible: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  dirtyCount?: number;
  label?: string;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  isVisible,
  isSaving,
  onSave,
  onDiscard,
  dirtyCount = 1,
  label,
}) => {
  const { language } = useLanguage();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent));
  }, []);

  if (!isVisible) return null;

  const saveShortcut = isMac ? '⌘S' : 'Ctrl+S';
  const discardShortcut = 'Esc';

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:max-w-xl z-40 transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-5"
      role="region"
      aria-live="polite"
      aria-label={language === 'th' ? 'แถบแจ้งเตือนการแก้ไขที่ยังไม่ได้บันทึก' : 'Unsaved changes bar'}
    >
      <div className="bg-card/95 backdrop-blur-md border border-primary/40 shadow-2xl rounded-lg p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 text-text">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <AlertCircle className="h-4 w-4 animate-pulse text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-text truncate flex items-center gap-1.5">
              <span>{language === 'th' ? 'มีการแก้ไขที่ยังไม่ได้บันทึก' : 'Unsaved Changes'}</span>
              {dirtyCount > 1 && (
                <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-mono font-bold">
                  {dirtyCount} {language === 'th' ? 'รายการ' : 'fields'}
                </span>
              )}
            </div>
            <div className="text-[11px] text-text/60 truncate">
              {label || (language === 'th' ? 'กดปุ่มบันทึกหรือคีย์ลัดเพื่อนำการตั้งค่าไปใช้' : 'Commit changes to apply across the terminal')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onDiscard}
            disabled={isSaving}
            className="text-xs h-8 px-2.5 sm:px-3 font-semibold rounded-md border-border hover:bg-background/80"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            <span>{language === 'th' ? 'ยกเลิก' : 'Discard'}</span>
            <kbd className="hidden sm:inline-block ml-1.5 px-1.5 py-0.5 text-[9px] font-mono font-bold bg-background/80 text-text/60 rounded border border-border">
              {discardShortcut}
            </kbd>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onSave}
            isLoading={isSaving}
            className="text-xs h-8 px-3 sm:px-4 font-bold rounded-md bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            <span>{language === 'th' ? 'บันทึก' : 'Save'}</span>
            <kbd className="hidden sm:inline-block ml-1.5 px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded">
              {saveShortcut}
            </kbd>
          </Button>
        </div>
      </div>
    </div>
  );
};

