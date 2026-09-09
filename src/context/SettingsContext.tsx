import React, { createContext, useContext, useEffect, useState } from 'react';
import ConfigPersistenceManager, { AppConfiguration } from '../services/configPersistenceManager';

interface SettingsContextType {
  config: AppConfiguration;
  updateConfig: (updates: Partial<AppConfiguration>) => void;
  resetConfig: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfiguration>(ConfigPersistenceManager.getConfig());

  const updateConfig = (updates: Partial<AppConfiguration>) => {
    const newConfig = ConfigPersistenceManager.updateConfig(updates);
    setConfig(newConfig);
  };

  const resetConfig = () => {
    ConfigPersistenceManager.resetToDefaults();
    setConfig(ConfigPersistenceManager.getConfig());
  };

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'prodx_enterprise_config_v1') {
        setConfig(ConfigPersistenceManager.getConfig());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <SettingsContext.Provider value={{ config, updateConfig, resetConfig }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
