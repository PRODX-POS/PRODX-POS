import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary hover:bg-primary-dark active:opacity-90 text-white font-semibold shadow-2xs',
  secondary:
    'bg-card text-text hover:bg-background active:opacity-90 font-medium border-crisp border border-border shadow-2xs',
  outline:
    'bg-transparent text-text hover:bg-background active:opacity-90 border-crisp border border-border font-medium',
  ghost:
    'bg-transparent text-text/70 hover:text-text hover:bg-background font-medium',
  danger:
    'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold',
  success:
    'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-[36px] min-h-[36px] px-3.5 text-xs font-medium gap-1.5 rounded-md',
  md: 'h-[44px] min-h-[44px] px-4 text-sm font-medium gap-2 rounded-lg',
  lg: 'h-[52px] min-h-[52px] px-6 text-base font-semibold gap-2.5 rounded-lg',
  icon: 'h-[44px] w-[44px] min-h-[44px] min-w-[44px] p-0 items-center justify-center rounded-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center transition-all duration-150 active:scale-[0.98] select-none font-medium whitespace-nowrap focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
