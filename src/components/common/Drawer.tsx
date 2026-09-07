import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getZIndexClass } from '../../utils/ZIndexManager';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'right' | 'left';
  width?: string;
  id?: string;
  noPadding?: boolean;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  width = 'w-full sm:max-w-md',
  id,
  noPadding = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      id={id}
      className={`fixed inset-0 ${getZIndexClass('modal')} overflow-hidden bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-150`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`fixed inset-y-0 ${side === 'right' ? 'right-0' : 'left-0'} flex max-w-full`}>
        <div
          className={`${width} bg-card border-crisp ${
            side === 'right' ? 'border-l' : 'border-r'
          } border-border flex flex-col h-full shadow-xl animate-in slide-in-from-${
            side === 'right' ? 'right' : 'left'
          } duration-200 text-text`}
        >
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-crisp border-border shrink-0 bg-card">
            <div>
              <h3 className="text-heading-3 text-text">{title}</h3>
              {description && (
                <p className="mt-0.5 text-caption text-text/70">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-text/50 hover:text-text hover:bg-background transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto bg-card text-text ${noPadding ? '' : 'p-6'}`}>{children}</div>

          {footer && (
            <div className="p-5 border-t border-crisp border-border bg-card shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
