import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

  if (typeof document === 'undefined') return null;

  const isRight = side === 'right';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          id={id}
          className={`fixed inset-0 ${getZIndexClass('modal')} overflow-hidden flex ${
            isRight ? 'justify-end' : 'justify-start'
          }`}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer Slide-In Panel */}
          <motion.div
            initial={{ x: isRight ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRight ? '100%' : '-100%' }}
            transition={{
              type: 'spring',
              damping: 32,
              stiffness: 350,
              mass: 0.8,
            }}
            className={`relative z-10 ${width} bg-card border-crisp ${
              isRight ? 'border-l' : 'border-r'
            } border-border flex flex-col h-full shadow-2xl text-text`}
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
                className="p-1.5 rounded-md text-text/50 hover:text-text hover:bg-background transition-colors cursor-pointer active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto bg-card text-text ${noPadding ? '' : 'p-6'}`}>
              {children}
            </div>

            {footer && (
              <div className="p-5 border-t border-crisp border-border bg-card shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

