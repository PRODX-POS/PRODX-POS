import React from 'react';
import { Money, formatMoney } from '../../domain/money';

export interface CurrencyDisplayProps {
  money: Money;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs font-medium',
  md: 'text-sm font-semibold',
  lg: 'text-lg font-bold',
  xl: 'text-2xl font-black tracking-tight',
};

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  money,
  size = 'md',
  className = '',
}) => {
  const formatted = formatMoney(money);

  return (
    <span className={`font-mono text-text ${sizeClasses[size]} ${className}`}>
      {formatted}
    </span>
  );
};
