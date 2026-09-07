import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { getZIndexClass } from '../../utils/ZIndexManager';

export interface ModalProps {
  fullScreenOnMobile?: boolean;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  id?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const maxWidthStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  id,
  initialFocusRef,
  fullScreenOnMobile = false,
}) => {
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Active focus trapping & Escape key handling
  useFocusTrap(modalContainerRef, {
    isActive: isOpen,
    initialFocusRef,
    returnFocus: true,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  const titleId = id ? `${id}-title` : 'modal-title';
  const descId = id ? `${id}-desc` : 'modal-desc';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      id={id}
      className={`fixed inset-0 ${getZIndexClass('modal')} flex items-center justify-center ${
        fullScreenOnMobile ? 'p-0 sm:p-4' : 'p-3 sm:p-4'
      } bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalContainerRef}
        tabIndex={-1}
        className={`w-full ${maxWidthStyles[maxWidth]} ${
          fullScreenOnMobile
            ? 'h-full sm:h-auto max-h-full sm:max-h-[90vh] sm:rounded-2xl rounded-none sm:border border-0'
            : 'rounded-2xl max-h-[90vh] border'
        } border-crisp border-border bg-card text-text shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col outline-none`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-border border-crisp shrink-0 gap-4 bg-card">
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="text-heading-3 text-text">
              {title}
            </h3>
            {description && (
              <p id={descId} className="mt-1 text-caption text-text/70">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text/50 hover:text-text hover:bg-background transition-colors cursor-pointer shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close dialog (Escape)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 bg-card text-text">{children}</div>

        {footer && (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 p-4 pb-7 sm:pb-4 border-t border-border bg-card/50 shrink-0 [&>button]:min-h-[44px] [&>button]:w-full sm:[&>button]:w-auto [&_button]:min-h-[44px]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
