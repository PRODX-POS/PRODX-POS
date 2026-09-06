import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const styles: Record<AlertType, { bg: string; border: string; icon: React.ReactNode; text: string; title: string }> = {
  info: {
    bg: 'bg-blue-50/80 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-900',
    icon: <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />,
    text: 'text-blue-800 dark:text-blue-200',
    title: 'text-blue-900 dark:text-blue-100',
  },
  success: {
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-900',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    text: 'text-emerald-800 dark:text-emerald-200',
    title: 'text-emerald-900 dark:text-emerald-100',
  },
  warning: {
    bg: 'bg-amber-50/80 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-900',
    icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />,
    text: 'text-amber-800 dark:text-amber-200',
    title: 'text-amber-900 dark:text-amber-100',
  },
  error: {
    bg: 'bg-rose-50/80 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-900',
    icon: <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />,
    text: 'text-rose-800 dark:text-rose-200',
    title: 'text-rose-900 dark:text-rose-100',
  },
};

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onDismiss,
  className = '',
}) => {
  const current = styles[type];

  return (
    <div
      className={`rounded-xl border p-4 flex items-start gap-3 text-xs leading-relaxed ${current.bg} ${current.border} ${current.text} ${className}`}
      role="alert"
    >
      <div className="mt-0.5">{current.icon}</div>
      <div className="flex-1">
        {title && <h4 className={`font-semibold mb-0.5 ${current.title}`}>{title}</h4>}
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-text/50 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
