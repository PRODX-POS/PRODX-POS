import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, Sparkles } from 'lucide-react';
import { SupportedLanguage, AVAILABLE_LANGUAGES, LanguageInfo } from '../../i18n/types';
import { changeLanguage } from '../../i18n';
import { useLanguage } from '../../context/LanguageContext';

export interface LanguageSwitcherProps {
  variant?: 'grid' | 'grid-2x2' | 'dropdown' | 'segmented' | 'select' | 'compact';
  className?: string;
  showDetails?: boolean;
  gridColumns?: string;
  onSelect?: (lng: SupportedLanguage) => void;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'grid',
  className = '',
  showDetails = true,
  gridColumns = 'grid-cols-2',
  onSelect,
}) => {
  const { i18n } = useTranslation();
  const { language: currentLang, setLanguage } = useLanguage();
  const activeCode: SupportedLanguage = (currentLang || i18n.language || 'th') as SupportedLanguage;

  const handleLanguageChange = async (lng: SupportedLanguage) => {
    setLanguage(lng);
    await changeLanguage(lng);
    if (onSelect) {
      onSelect(lng);
    }
  };

  const languageList: LanguageInfo[] = Object.values(AVAILABLE_LANGUAGES);

  // Segmented Pill Variant (Compact buttons in a row)
  if (variant === 'segmented') {
    return (
      <div className={`inline-flex p-1 bg-background rounded-xl border border-border border-crisp ${className}`}>
        {languageList.map((lang) => {
          const isActive = activeCode === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text/70 hover:text-text hover:bg-card'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.code.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact Variant (Icon with short language code)
  if (variant === 'compact') {
    const current = AVAILABLE_LANGUAGES[activeCode] || AVAILABLE_LANGUAGES.th;
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Globe className="h-4 w-4 text-text/60" />
        <span className="text-xs font-bold text-text uppercase flex items-center gap-1">
          <span>{current.flag}</span>
          <span>{current.code.toUpperCase()}</span>
        </span>
      </div>
    );
  }

  // Select Element Variant
  if (variant === 'select') {
    return (
      <div className={`relative inline-block ${className}`}>
        <select
          value={activeCode}
          onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
          className="w-full pl-9 pr-8 py-2 text-xs font-bold rounded-xl border border-border border-crisp bg-card text-text appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {languageList.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.nativeName} ({lang.name})
            </option>
          ))}
        </select>
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text/50 pointer-events-none" />
      </div>
    );
  }

  // Full 2-Column x 2-Row Grid Variant
  return (
    <div className={`space-y-3 ${className}`}>
      <div className={`grid ${gridColumns} gap-2.5 sm:gap-3.5`}>
        {languageList.map((lang) => {
          const isActive = activeCode === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={`relative text-left p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.98] ${
                isActive
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                  : 'border-border border-crisp bg-card hover:bg-background/80 hover:border-text/30'
              }`}
            >
              {/* Header: Flag & Active Check */}
              <div className="flex items-center justify-between mb-2 gap-1">
                <span className="text-2xl sm:text-3xl leading-none">{lang.flag}</span>
                {isActive ? (
                  <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-primary text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-xs shrink-0">
                    <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold text-text/40 group-hover:text-text/70 uppercase shrink-0">
                    {lang.code}
                  </span>
                )}
              </div>

              {/* Language Name & Native Name */}
              <div className="mt-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold text-text truncate">
                  {lang.nativeName}
                </div>
                <div className="text-[11px] sm:text-xs text-text/60 font-medium truncate">{lang.name}</div>
              </div>

              {/* Regional & Format Metadata */}
              {showDetails && (
                <div className="mt-2.5 pt-2 border-t border-border/60 border-crisp text-[10px] sm:text-[11px] text-text/50 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="shrink-0">Region:</span>
                    <span className="font-mono text-text/70 text-[9px] sm:text-[10px] truncate max-w-[80px] sm:max-w-[120px] text-right">
                      {lang.region}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="shrink-0">Date:</span>
                    <span className="font-mono text-text/70 text-[9px] sm:text-[10px] text-right">{lang.dateFormat}</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Instant Preview Banner */}
      <div className="p-3.5 rounded-xl border border-border border-crisp bg-background flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-text/70">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span>
            Current Locale: <strong className="text-text">{AVAILABLE_LANGUAGES[activeCode].nativeName}</strong> ({AVAILABLE_LANGUAGES[activeCode].region})
          </span>
        </div>
        <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-card border border-border text-text/60">
          Engine: react-i18next
        </span>
      </div>
    </div>
  );
};
