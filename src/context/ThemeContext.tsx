/**
 * PRODX POS - Theme Management Context
 * Supports 10 premium presets with design system tokens.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import ConfigPersistenceManager from '../services/configPersistenceManager';

export interface ThemePreset {
  id: string;
  name: { th: string; en: string };
  primary: string;
  background: string;
  card: string;
  text: string;
  border: string;
  isDark: boolean;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'enterprise_blue',
    name: { th: 'เอนเตอร์ไพรส์ บลู (Enterprise Blue)', en: 'Enterprise Blue' },
    primary: '#2563EB',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    border: '#E2E8F0',
    isDark: false,
  },
  {
    id: 'deep_obsidian',
    name: { th: 'ดีพ ออบซิเดียน (Deep Obsidian)', en: 'Deep Obsidian' },
    primary: '#3B82F6',
    background: '#090D16',
    card: '#0F172A',
    text: '#F8FAFC',
    border: '#1E293B',
    isDark: true,
  },
  {
    id: 'modern',
    name: { th: 'โมเดิร์น สกาย (Modern Sky)', en: 'Modern Sky' },
    primary: '#3B82F6',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    border: '#E2E8F0',
    isDark: false,
  },
  {
    id: 'minimal',
    name: { th: 'มินิมอล คลีน (Minimal Clean)', en: 'Minimal Clean' },
    primary: '#0F172A',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    border: '#E2E8F0',
    isDark: false,
  },
  {
    id: 'dark_elegant',
    name: { th: 'ดาร์ก พรีเมียม (Dark Elegant)', en: 'Dark Elegant' },
    primary: '#60A5FA',
    background: '#0B0D11',
    card: '#151821',
    text: '#F1F3F5',
    border: '#2A2E3D',
    isDark: true,
  },
  {
    id: 'emerald',
    name: { th: 'เอ็มเมอรัลด์ การ์เดน (Emerald Garden)', en: 'Emerald Garden' },
    primary: '#10B981',
    background: '#F0FDF4',
    card: '#FFFFFF',
    text: '#064E3B',
    border: '#D1FAE5',
    isDark: false,
  },
  {
    id: 'cyberpunk',
    name: { th: 'ไซเบอร์พังก์ นีออน (Cyberpunk Neon)', en: 'Cyberpunk Neon' },
    primary: '#38BDF8',
    background: '#0B0F19',
    card: '#111827',
    text: '#F9FAFB',
    border: '#1E293B',
    isDark: true,
  },
  {
    id: 'sunset',
    name: { th: 'ซันเซ็ต แอมเบอร์ (Sunset Amber)', en: 'Sunset Amber' },
    primary: '#F97316',
    background: '#FFF8F5',
    card: '#FFFFFF',
    text: '#5B1E00',
    border: '#FFE4D6',
    isDark: false,
  },
  {
    id: 'ocean',
    name: { th: 'โอเชี่ยน บรีซ (Ocean Breeze)', en: 'Ocean Breeze' },
    primary: '#0284C7',
    background: '#F0FDFA',
    card: '#FFFFFF',
    text: '#0F172A',
    border: '#E2E8F0',
    isDark: false,
  },
  {
    id: 'lavender',
    name: { th: 'สวีท ลาเวนเดอร์ (Sweet Lavender)', en: 'Sweet Lavender' },
    primary: '#6366F1',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    border: '#E2E8F0',
    isDark: false,
  }
];

export type Theme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  activePresetId: string;
  setPreset: (id: string) => void;
  customAccentColor: string | null;
  setCustomAccentColor: (color: string | null) => void;
  customLogo: string | null;
  setCustomLogo: (logo: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {


  const [activePresetId, setActivePresetId] = useState<string>(() => {
    return ConfigPersistenceManager.getConfig().theme.presetId || 'enterprise_blue';
  });

  const [customAccentColor, setCustomAccentColorState] = useState<string | null>(() => {
    return ConfigPersistenceManager.getConfig().branding.customAccentColor;
  });

  const [customLogo, setCustomLogoState] = useState<string | null>(() => {
    return ConfigPersistenceManager.getConfig().branding.customLogo;
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return ConfigPersistenceManager.getConfig().theme.mode || 'system';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const theme: Theme = themeMode === 'system' ? (systemIsDark ? 'dark' : 'light') : themeMode;

  useEffect(() => {
    const currentPreset = THEME_PRESETS.find((p) => p.id === activePresetId) || THEME_PRESETS[0];
    const isDarkMode = theme === 'dark';
    const root = document.documentElement;

    // Use custom accent color override if configured, otherwise use preset color
    const activeAccentColor = customAccentColor || currentPreset.primary;

    // Resolve color tokens based on theme mode
    let bgColor = currentPreset.background;
    let cardColor = currentPreset.card;
    let textColor = currentPreset.text;
    let borderColor = currentPreset.border;
    let primaryColor = activeAccentColor;
    let primaryDarkColor = '#1D4ED8';
    let primaryGlow = 'rgba(37, 99, 235, 0.2)';

    if (isDarkMode) {
      if (currentPreset.isDark) {
        bgColor = currentPreset.background;
        cardColor = currentPreset.card;
        textColor = currentPreset.text;
        borderColor = currentPreset.border;
        primaryColor = activeAccentColor;
      } else {
        // Light preset forced into dark mode -> use Modern SaaS Obsidian palette
        bgColor = '#090D16';
        cardColor = '#0F172A';
        textColor = '#F8FAFC';
        borderColor = '#1E293B';
        primaryColor = customAccentColor || '#3B82F6';
      }
      primaryDarkColor = '#2563EB';
      primaryGlow = 'rgba(59, 130, 246, 0.25)';
    } else {
      if (!currentPreset.isDark) {
        bgColor = currentPreset.background;
        cardColor = currentPreset.card;
        textColor = currentPreset.text;
        borderColor = currentPreset.border;
        primaryColor = activeAccentColor;
      } else {
        // Dark preset forced into light mode -> use Modern SaaS Light palette
        bgColor = '#F8FAFC';
        cardColor = '#FFFFFF';
        textColor = '#0F172A';
        borderColor = '#E2E8F0';
        primaryColor = customAccentColor || '#2563EB';
      }
      primaryDarkColor = '#1D4ED8';
      primaryGlow = 'rgba(37, 99, 235, 0.2)';
    }

    root.style.setProperty('--primary-color', primaryColor);
    root.style.setProperty('--primary-dark', primaryDarkColor);
    root.style.setProperty('--primary-glow', primaryGlow);
    root.style.setProperty('--bg-color', bgColor);
    root.style.setProperty('--card-color', cardColor);
    root.style.setProperty('--text-color', textColor);
    root.style.setProperty('--border-color', borderColor);

    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Persist current visual settings via the unified config manager
    ConfigPersistenceManager.updateConfig({
      theme: { mode: themeMode, presetId: activePresetId },
      branding: { customLogo, customAccentColor }
    });

    // Persist to localStorage for index.html initial load script
    localStorage.setItem('prodx_pos_theme_mode', themeMode);
    localStorage.setItem('prodx_pos_theme_preset', activePresetId);
    if (customAccentColor) {
      localStorage.setItem('prodx_custom_accent_color', customAccentColor);
    } else {
      localStorage.removeItem('prodx_custom_accent_color');
    }

  }, [theme, themeMode, activePresetId, customAccentColor, customLogo]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeMode(newTheme);
  };
  
  const setPreset = (id: string) => {
    const nextPreset = THEME_PRESETS.find((p) => p.id === id);
    if (nextPreset) {
      setActivePresetId(id);
      setThemeMode(nextPreset.isDark ? 'dark' : 'light');
    }
  };

  const setCustomAccentColor = (color: string | null) => {
    setCustomAccentColorState(color);
  };

  const setCustomLogo = (logo: string | null) => {
    setCustomLogoState(logo);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode,
        toggleTheme,
        setTheme,
        activePresetId,
        setPreset,
        customAccentColor,
        setCustomAccentColor,
        customLogo,
        setCustomLogo,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    const cfg = ConfigPersistenceManager.getConfig();
    return {
      theme: 'light',
      themeMode: 'system',
      setThemeMode: () => {},
      toggleTheme: () => {},
      setTheme: () => {},
      activePresetId: cfg.theme.presetId,
      setPreset: () => {},
      customAccentColor: cfg.branding.customAccentColor,
      setCustomAccentColor: () => {},
      customLogo: cfg.branding.customLogo,
      setCustomLogo: () => {},
    };
  }
  return ctx;
}
