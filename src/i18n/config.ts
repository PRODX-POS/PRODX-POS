import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import th from './locales/th';
import en from './locales/en';
import zh from './locales/zh';
import ja from './locales/ja';
import { SupportedLanguage } from './types';

export const defaultNS = 'translation';

export const resources = {
  th: { translation: th },
  en: { translation: en },
  zh: { translation: zh },
  ja: { translation: ja },
} as const;

export const STORAGE_KEY = 'prodx_pos_language';

const getInitialLanguage = (): SupportedLanguage => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'th' || saved === 'en' || saved === 'zh' || saved === 'ja')) {
      return saved as SupportedLanguage;
    }
  } catch {
    // ignore
  }
  return 'th';
};

const initialLang = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'th',
    defaultNS,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

// Synchronize document.documentElement attributes whenever language changes
i18n.on('languageChanged', (lng: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lng;
      document.documentElement.dir = 'ltr';
    }
  } catch (err) {
    console.error('Failed to persist language preference', err);
  }
});

// Set initial document language
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
}

export default i18n;
