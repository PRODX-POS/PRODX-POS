import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export type ProdxLogoVariant = 'full' | 'horizontal' | 'mark';
export type ProdxLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ProdxLogoProps {
  variant?: ProdxLogoVariant;
  size?: ProdxLogoSize;
  className?: string;
  showTagline?: boolean;
}

export const ProdxLogo: React.FC<ProdxLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showTagline = true,
}) => {
  const { customLogo } = useTheme();
  const { session } = useAuth();
  
  const storeName = session?.currentStore?.name || 'STORE TERMINAL';

  const sizeMap = {
    xs: { icon: 24, title: 'text-sm' },
    sm: { icon: 32, title: 'text-base' },
    md: { icon: 40, title: 'text-lg sm:text-xl' },
    lg: { icon: 56, title: 'text-2xl sm:text-3xl' },
    xl: { icon: 84, title: 'text-4xl sm:text-5xl' },
  };

  const currentSize = sizeMap[size];

  if (customLogo) {
    if (variant === 'mark') {
      return (
        <img
          src={customLogo}
          alt={storeName}
          referrerPolicy="no-referrer"
          className={`object-contain rounded-lg shrink-0 ${className}`}
          style={{ width: currentSize.icon, height: currentSize.icon }}
        />
      );
    }

    if (variant === 'full') {
      const isLg = size === 'lg' || size === 'xl';
      return (
        <div className={`flex flex-col items-center text-center select-none ${className}`}>
          <img
            src={customLogo}
            alt={storeName}
            referrerPolicy="no-referrer"
            className="object-contain rounded-xl mb-2 hover:scale-105 transition-transform duration-300 shadow-sm border border-border"
            style={{ width: isLg ? 110 : 80, height: isLg ? 110 : 80 }}
          />
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-text/40">
            {storeName}
          </div>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-3 select-none ${className}`}>
        <img
          src={customLogo}
          alt={storeName}
          referrerPolicy="no-referrer"
          className="object-contain rounded-lg hover:scale-105 transition-transform duration-200 border border-border"
          style={{ width: currentSize.icon, height: currentSize.icon }}
        />
        <div className="flex flex-col justify-center">
          <span className={`${currentSize.title} text-text uppercase font-bold tracking-tight line-clamp-1`}>
            {storeName}
          </span>
          {showTagline && (
             <span className="text-[9px] font-sans text-text/50 font-semibold tracking-wider uppercase">
               POS SYSTEM
             </span>
          )}
        </div>
      </div>
    );
  }

  // Fallback to text only if no custom logo is configured
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div 
        className="flex items-center justify-center bg-primary/10 text-primary font-bold rounded-lg shrink-0 shadow-2xs"
        style={{ width: currentSize.icon, height: currentSize.icon, fontSize: currentSize.icon * 0.5 }}
      >
        {storeName.charAt(0)}
      </div>
      {variant !== 'mark' && (
        <div className="flex flex-col justify-center min-w-0">
          <span className={`${currentSize.title} text-text uppercase font-black tracking-tight leading-tight whitespace-nowrap`}>
            {storeName}
          </span>
          {showTagline && (
             <span className="text-[9px] font-sans text-text/50 font-bold tracking-wider uppercase">
               POS SYSTEM
             </span>
          )}
        </div>
      )}
    </div>
  );
};
