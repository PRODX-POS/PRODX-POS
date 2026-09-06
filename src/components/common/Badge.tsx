import React from 'react';

export type BadgeVariant =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'
  | 'offline';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
  id?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string; border: string }> = {
  neutral: {
    bg: 'bg-card',
    text: 'text-text/80',
    dot: 'bg-text/40',
    border: 'border-border border-crisp',
  },
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    dot: 'bg-primary',
    border: 'border-primary/30 border-crisp',
  },
  success: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    border: 'border-emerald-500/30 border-crisp',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
    border: 'border-amber-500/30 border-crisp',
  },
  danger: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
    border: 'border-rose-500/30 border-crisp',
  },
  purple: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-700 dark:text-indigo-400',
    dot: 'bg-indigo-500',
    border: 'border-indigo-500/30 border-crisp',
  },
  offline: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500 animate-pulse',
    border: 'border-amber-500/40 border-crisp',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  id,
}) => {
  const styles = variantStyles[variant];
  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      id={id}
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${styles.bg} ${styles.text} ${styles.border} ${sizeCls} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${styles.dot}`} />}
      <span className="whitespace-nowrap">{children}</span>
    </span>
  );
};
