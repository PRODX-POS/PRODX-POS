import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 rounded-lg border-crisp border border-dashed border-border bg-card text-text ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background border-crisp border border-border text-text/40 mb-3.5">
        {icon || <PackageOpen className="h-6 w-6" />}
      </div>
      <h3 className="text-heading-4 text-text">{title}</h3>
      {description && (
        <p className="mt-1 text-caption text-text/70 max-w-sm">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
