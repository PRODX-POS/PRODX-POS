import { useEffect, useRef } from 'react';

export interface UseFocusTrapOptions {
  isActive: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  returnFocus?: boolean;
  onEscape?: () => void;
  preventScroll?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"])',
  'select:not([disabled]):not([aria-hidden="true"])',
  'textarea:not([disabled]):not([aria-hidden="true"])',
  'button:not([disabled]):not([aria-hidden="true"])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ');

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions
) {
  const { isActive, initialFocusRef, returnFocus = true, onEscape, preventScroll = false } = options;
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Save the element that had focus before trapping
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;

    const getFocusableElements = (): HTMLElement[] => {
      if (!container) return [];
      const elements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => {
        return (
          el.offsetParent !== null && // visible check
          !el.hasAttribute('disabled') &&
          el.getAttribute('aria-hidden') !== 'true' &&
          window.getComputedStyle(el).visibility !== 'hidden' &&
          window.getComputedStyle(el).display !== 'none'
        );
      });
      return elements;
    };

    // Initial focus placement
    const focusTimer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus({ preventScroll });
      } else {
        const focusable = getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus({ preventScroll });
        } else {
          container.focus({ preventScroll });
        }
      }
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        e.stopPropagation();
        onEscape();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = getFocusableElements();
        if (focusable.length === 0) {
          e.preventDefault();
          container.focus();
          return;
        }

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];
        const currentActive = document.activeElement;

        if (e.shiftKey) {
          // Shift + Tab: moving backwards
          if (currentActive === firstElement || !container.contains(currentActive)) {
            e.preventDefault();
            lastElement.focus({ preventScroll });
          }
        } else {
          // Tab: moving forwards
          if (currentActive === lastElement || !container.contains(currentActive)) {
            e.preventDefault();
            firstElement.focus({ preventScroll });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown, true);

      // Restore previously focused element
      if (returnFocus && previousActiveElementRef.current) {
        try {
          previousActiveElementRef.current.focus({ preventScroll });
        } catch (err) {
          // ignore if unmounted
        }
      }
    };
  }, [isActive, containerRef, initialFocusRef, returnFocus, onEscape, preventScroll]);
}
