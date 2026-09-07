export type SupportedLanguage = 'th' | 'en' | 'zh' | 'ja';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
  region: string;
  dateFormat: string;
  numberLocale: string;
}

export const AVAILABLE_LANGUAGES: Record<SupportedLanguage, LanguageInfo> = {
  th: {
    code: 'th',
    name: 'Thai',
    nativeName: 'ภาษาไทย',
    flag: '🇹🇭',
    dir: 'ltr',
    region: 'Thailand (TH)',
    dateFormat: 'DD/MM/YYYY',
    numberLocale: 'th-TH',
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English (US)',
    flag: '🇺🇸',
    dir: 'ltr',
    region: 'Global / International',
    dateFormat: 'MM/DD/YYYY',
    numberLocale: 'en-US',
  },
  zh: {
    code: 'zh',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    flag: '🇨🇳',
    dir: 'ltr',
    region: 'China / Singapore / Asia',
    dateFormat: 'YYYY-MM-DD',
    numberLocale: 'zh-CN',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    dir: 'ltr',
    region: 'Japan (JP)',
    dateFormat: 'YYYY/MM/DD',
    numberLocale: 'ja-JP',
  },
};

export type TranslationSchema = typeof import('./locales/th').default;
