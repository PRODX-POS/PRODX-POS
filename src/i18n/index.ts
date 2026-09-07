import i18n from './config';
export { default as i18n } from './config';
export * from './types';

import { SupportedLanguage, AVAILABLE_LANGUAGES, LanguageInfo } from './types';
import { STORAGE_KEY } from './config';

export const getSupportedLanguagesList = (): LanguageInfo[] => {
  return Object.values(AVAILABLE_LANGUAGES);
};

export const changeLanguage = async (lng: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(lng);
};

export const getCurrentLanguage = (): SupportedLanguage => {
  const current = (i18n.language || 'th').split('-')[0] as SupportedLanguage;
  if (current in AVAILABLE_LANGUAGES) {
    return current;
  }
  return 'th';
};

export const getLanguageInfo = (lng?: SupportedLanguage): LanguageInfo => {
  const code = lng || getCurrentLanguage();
  return AVAILABLE_LANGUAGES[code] || AVAILABLE_LANGUAGES.th;
};

export { STORAGE_KEY };
export default i18n;

