import React, { useState } from 'react';
import { Delete, Check } from 'lucide-react';
import { Button } from './Button';
import { useLanguage } from '../../context/LanguageContext';

export interface VirtualNumpadProps {
  initialValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  title?: string;
  allowDecimal?: boolean;
}

export const VirtualNumpad: React.FC<VirtualNumpadProps> = ({
  initialValue = '',
  onConfirm,
  onCancel,
  title,
  allowDecimal = false,
}) => {
  const [value, setValue] = useState(initialValue);
  const { language } = useLanguage();

  const handleKeyPress = (key: string) => {
    if (key === '.') {
      if (allowDecimal && !value.includes('.')) {
        setValue(value + '.');
      }
    } else {
      setValue(value === '0' ? key : value + key);
    }
  };

  const handleBackspace = () => {
    setValue(value.length > 1 ? value.slice(0, -1) : '');
  };

  const handleConfirm = () => {
    if (value === '' || value === '.') {
      onConfirm('0');
    } else {
      onConfirm(value);
    }
  };

  return (
    <div className="bg-card rounded-xl overflow-hidden shadow-lg border border-border border-crisp">
      {title && (
        <div className="p-3 border-b border-border border-crisp bg-background/50">
          <div className="text-sm font-bold text-center text-text/80">
            {title}
          </div>
        </div>
      )}
      
      <div className="p-4">
        <div className="mb-4 h-12 bg-background rounded-lg flex items-center justify-end px-4">
          <span className="text-2xl font-mono font-bold text-text">
            {value || '0'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-14 bg-card border border-border border-crisp rounded-lg text-xl font-bold text-text hover:bg-background/50 dark:hover:bg-zinc-700 active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
          
          <button
            type="button"
            onClick={allowDecimal ? () => handleKeyPress('.') : onCancel}
            className={`h-14 rounded-lg font-bold transition-all active:scale-95 ${
              allowDecimal 
                ? 'bg-card border border-border border-crisp text-xl text-text hover:bg-background/50 dark:hover:bg-zinc-700'
                : 'text-text/60 hover:text-zinc-700 dark:hover:text-text/60 flex items-center justify-center'
            }`}
          >
            {allowDecimal ? '.' : (language === 'th' ? 'ยกเลิก' : 'Cancel')}
          </button>
          
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 bg-card border border-border border-crisp rounded-lg text-xl font-bold text-text hover:bg-background/50 dark:hover:bg-zinc-700 active:scale-95 transition-all"
          >
            0
          </button>
          
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 bg-card border border-border border-crisp rounded-lg flex items-center justify-center text-text/60 hover:bg-background/50 dark:hover:bg-zinc-700 hover:text-text active:scale-95 transition-all"
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
           {allowDecimal && (
              <Button
                variant="outline"
                className="h-12 border-border border-crisp"
                onClick={onCancel}
              >
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </Button>
           )}
          <Button
            variant="primary"
            className={`h-12 ${!allowDecimal ? 'col-span-2' : ''}`}
            onClick={handleConfirm}
            leftIcon={<Check className="h-5 w-5" />}
          >
            {language === 'th' ? 'ยืนยัน' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
};
