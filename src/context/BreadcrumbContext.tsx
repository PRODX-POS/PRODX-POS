import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { NavRoute } from '../components/layout/Sidebar';

export interface BreadcrumbLevel {
  id: string;
  label: string | { th: string; en: string };
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  badge?: string | number;
}

interface BreadcrumbContextType {
  subLevels: BreadcrumbLevel[];
  setSubLevels: (levels: BreadcrumbLevel[]) => void;
  clearSubLevels: () => void;
  pushSubLevel: (level: BreadcrumbLevel) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const BreadcrumbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [subLevels, setSubLevelsState] = useState<BreadcrumbLevel[]>([]);

  const setSubLevels = useCallback((levels: BreadcrumbLevel[]) => {
    setSubLevelsState(levels);
  }, []);

  const clearSubLevels = useCallback(() => {
    setSubLevelsState([]);
  }, []);

  const pushSubLevel = useCallback((level: BreadcrumbLevel) => {
    setSubLevelsState((prev) => {
      // Replace existing level if same id, else append
      const filtered = prev.filter((item) => item.id !== level.id);
      return [...filtered, level];
    });
  }, []);

  return (
    <BreadcrumbContext.Provider
      value={{
        subLevels,
        setSubLevels,
        clearSubLevels,
        pushSubLevel,
      }}
    >
      {children}
    </BreadcrumbContext.Provider>
  );
};

export const useBreadcrumb = (): BreadcrumbContextType => {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
  }
  return context;
};
