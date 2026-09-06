import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  className = '',
  id,
  ...props
}) => {
  return (
    <div
      id={id}
      className={`bg-card border-border border-crisp rounded-lg text-text shadow-2xs ${
        interactive
          ? 'transition-all duration-150 hover:border-primary/40 hover:shadow-xs cursor-pointer active:scale-[0.99]'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`px-5 py-4 border-b border-border border-crisp text-text flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 text-text ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`px-5 py-3.5 border-t border-border border-crisp bg-card rounded-b-lg text-text flex items-center ${className}`}
    {...props}
  >
    {children}
  </div>
);
