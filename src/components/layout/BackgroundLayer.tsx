import React from 'react';

export interface BackgroundLayerProps {
  className?: string;
  id?: string;
}

/**
 * BackgroundLayer applies a subtle, persistent tech-grid-mesh texture across
 * the application background, elevating the High-Tech Enterprise aesthetic.
 */
export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({
  className = '',
  id = 'app-background-layer',
}) => {
  return (
    <div
      id={id}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 tech-grid-mesh ${className}`}
    />
  );
};
