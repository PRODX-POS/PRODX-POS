import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useTranslation, I18nextProvider } from 'react-i18next';
import i18n, {
  changeLanguage as i18nChangeLanguage,
  getCurrentLanguage,
  getLanguageInfo,
  getSupportedLanguagesList,
  STORAGE_KEY,
} from '../i18n';
import { SupportedLanguage, LanguageInfo, TranslationSchema } from '../i18n/types';
import th from '../i18n/locales/th';
import en from '../i18n/locales/en';
import zh from '../i18n/locales/zh';
import ja from '../i18n/locales/ja';

export type Language = SupportedLanguage;

export const translations: Record<SupportedLanguage, TranslationSchema> = {
  th,
  en,
  zh,
  ja,
};

export type Translations = TranslationSchema;

export interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  t: TranslationSchema;
  availableLanguages: LanguageInfo[];
  currentLanguageInfo: LanguageInfo;
  i18n: typeof i18n;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n: i18nInstance } = useTranslation();
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(() => {
    return getCurrentLanguage();
  });

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      const parsed = (lng.split('-')[0] || 'th') as SupportedLanguage;
      if (parsed in translations) {
        setCurrentLang(parsed);
      }
    };

    i18nInstance.on('languageChanged', handleLanguageChanged);
    return () => {
      i18nInstance.off('languageChanged', handleLanguageChanged);
    };
  }, [i18nInstance]);

  const setLanguage = async (newLang: SupportedLanguage) => {
    await i18nChangeLanguage(newLang);
    setCurrentLang(newLang);
  };

  const toggleLanguage = async () => {
    const sequence: SupportedLanguage[] = ['th', 'en', 'zh', 'ja'];
    const currentIndex = sequence.indexOf(currentLang);
    const nextIndex = (currentIndex + 1) % sequence.length;
    await setLanguage(sequence[nextIndex]);
  };

  const activeTranslations: TranslationSchema = useMemo(() => {
    return translations[currentLang] || translations.th;
  }, [currentLang]);

  const currentLanguageInfo = useMemo(() => {
    return getLanguageInfo(currentLang);
  }, [currentLang]);

  const availableLanguages = useMemo(() => {
    return getSupportedLanguagesList();
  }, []);

  const value = useMemo(
    () => ({
      language: currentLang,
      setLanguage,
      toggleLanguage,
      t: activeTranslations,
      availableLanguages,
      currentLanguageInfo,
      i18n: i18nInstance,
    }),
    [currentLang, activeTranslations, currentLanguageInfo, availableLanguages, i18nInstance]
  );

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
    </I18nextProvider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'th',
      setLanguage: async () => {},
      toggleLanguage: async () => {},
      t: translations.th,
      availableLanguages: getSupportedLanguagesList(),
      currentLanguageInfo: getLanguageInfo('th'),
      i18n,
    };
  }
  return context;
}
