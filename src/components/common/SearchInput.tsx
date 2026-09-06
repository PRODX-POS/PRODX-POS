import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onClear?: () => void;
  hotkeyPrompt?: string;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  hotkeyPrompt = '/',
  placeholder = 'Search products, SKU, or scan barcode...',
  className = '',
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkey listener for quick search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <div className="absolute left-3.5 text-text/40 pointer-events-none flex items-center">
        <Search className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full min-h-[44px] h-11 rounded-lg border-crisp border border-border bg-card text-text placeholder-text/40 text-sm sm:text-base pl-10.5 pr-14 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors shadow-2xs"
        {...props}
      />
      <div className="absolute right-1 flex items-center gap-1">
        {value ? (
          <button
            type="button"
            onClick={onClear}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text/40 hover:text-text active:scale-95 transition-all cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Clear search"
            aria-label="Clear search query"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          hotkeyPrompt && (
            <kbd className="hidden sm:inline-flex items-center justify-center mr-2.5 px-2 py-0.5 text-[11px] font-mono font-medium text-text/60 bg-background border border-border border-crisp rounded-md pointer-events-none select-none">
              {hotkeyPrompt}
            </kbd>
          )
        )}
      </div>
    </div>
  );
};
