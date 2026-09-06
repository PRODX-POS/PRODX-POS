export interface AppConfiguration {
  branding: {
    customLogo: string | null;
    customAccentColor: string | null;
  };
  theme: {
    mode: 'light' | 'dark' | 'system';
    presetId: string;
  };
}

const DEFAULT_CONFIG: AppConfiguration = {
  branding: {
    customLogo: null,
    customAccentColor: null,
  },
  theme: {
    mode: 'system',
    presetId: 'enterprise_blue',
  },
};

class ConfigPersistenceManager {
  private static STORAGE_KEY = 'prodx_enterprise_config_v1';

  /**
   * Clears old scattered configuration keys from previous versions
   * to ensure a clean slate as requested by the user.
   */
  static clearLegacyConfigs() {
    const legacyKeys = [
      'prodx_custom_logo',
      'prodx_pos_theme_preset',
      'prodx_custom_accent_color',
      'prodx_pos_theme_mode',
      'prodx_pos_theme'
    ];
    legacyKeys.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Retrieves the current unified configuration.
   */
  static getConfig(): AppConfiguration {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          branding: { ...DEFAULT_CONFIG.branding, ...parsed.branding },
          theme: { ...DEFAULT_CONFIG.theme, ...parsed.theme },
        };
      }
    } catch (e) {
      console.warn('Failed to parse config from localStorage', e);
    }
    return DEFAULT_CONFIG;
  }

  /**
   * Saves partial updates to the unified configuration.
   */
  static updateConfig(updates: {
    branding?: Partial<AppConfiguration['branding']>;
    theme?: Partial<AppConfiguration['theme']>;
  }) {
    const current = this.getConfig();
    const nextConfig: AppConfiguration = {
      branding: { ...current.branding, ...updates.branding },
      theme: { ...current.theme, ...updates.theme },
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(nextConfig));
    return nextConfig;
  }

  /**
   * Clears all configurations and restores defaults.
   */
  static resetToDefaults() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.clearLegacyConfigs();
  }
}

export default ConfigPersistenceManager;
