import { useEffect, useRef, useState, useCallback } from 'react';

export interface BarcodeScannerOptions {
  /**
   * Callback invoked when a valid hardware barcode scan sequence is detected.
   */
  onScan: (barcode: string) => void;
  /**
   * Callback invoked when an error occurs during scanning.
   */
  onError?: (error: Error) => void;
  /**
   * Maximum interval in milliseconds between keystrokes to be considered part of a hardware scan.
   * Standard USB/Bluetooth wedge scanners output characters in 5ms-35ms bursts.
   * Human typing is usually >80ms. Default: 60ms.
   */
  maxInterval?: number;
  /**
   * Minimum length of the barcode string. Default: 3.
   */
  minLength?: number;
  /**
   * Keys that trigger the completion of a barcode scan. Default: ['Enter', 'NumpadEnter', 'Tab'].
   */
  terminators?: string[];
  /**
   * Whether the scanner listener is currently active. Default: true.
   */
  enabled?: boolean;
  /**
   * If true, prevents default event propagation (e.g. form submission or newline) when a scan terminator is fired. Default: true.
   */
  preventDefault?: boolean;
  /**
   * If true, also intercepts hardware scan bursts even when an <input> or <textarea> has focus. Default: true.
   */
  captureInInputs?: boolean;
  /**
   * Optional prefix key/character if the scanner is configured with a preamble.
   */
  prefix?: string;
}

export interface BarcodeScannerState {
  /**
   * The most recently scanned barcode.
   */
  lastScannedBarcode: string | null;
  /**
   * Timestamp of the last scan.
   */
  lastScannedAt: Date | null;
  /**
   * Total number of scans detected during the session.
   */
  scanCount: number;
  /**
   * Whether a fast keystroke burst is currently in progress.
   */
  isScanning: boolean;
  /**
   * Manually trigger a simulated scan (useful for UI test buttons, camera scanners, or dev tools).
   */
  simulateScan: (barcode: string) => void;
  /**
   * Clear the last scanned barcode state.
   */
  clearLastScan: () => void;
}

/**
 * Custom React Hook to detect and capture hardware barcode scanner inputs (USB / Bluetooth Keyboard Wedge).
 *
 * Hardware scanners behave as fast keyboard devices emitting sequential characters in rapid bursts (<50ms)
 * terminated by an Enter/Tab key. This hook discriminates between human typing and hardware scanners,
 * preventing rogue form submissions while providing immediate callback execution.
 */
export function useBarcodeScanner({
  onScan,
  onError,
  maxInterval = 60,
  minLength = 3,
  terminators = ['Enter', 'NumpadEnter', 'Tab'],
  enabled = true,
  preventDefault = true,
  captureInInputs = true,
  prefix,
}: BarcodeScannerOptions): BarcodeScannerState {
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [lastScannedAt, setLastScannedAt] = useState<Date | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Internal buffer refs to avoid unnecessary re-renders during fast keystroke bursts
  const bufferRef = useRef<string[]>([]);
  const lastKeyTimeRef = useRef<number>(0);
  const isScanningTimeoutRef = useRef<number | null>(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  // Keep callback refs fresh
  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  const dispatchScan = useCallback(
    (scannedString: string) => {
      let finalBarcode = scannedString.trim();

      // Strip optional prefix if configured
      if (prefix && finalBarcode.startsWith(prefix)) {
        finalBarcode = finalBarcode.slice(prefix.length);
      }

      if (finalBarcode.length >= minLength) {
        setLastScannedBarcode(finalBarcode);
        const now = new Date();
        setLastScannedAt(now);
        setScanCount((prev) => prev + 1);
        setIsScanning(false);

        try {
          onScanRef.current(finalBarcode);
        } catch (err) {
          if (onErrorRef.current && err instanceof Error) {
            onErrorRef.current(err);
          } else {
            console.error('[useBarcodeScanner] Error in onScan callback:', err);
          }
        }
      }
    },
    [prefix, minLength]
  );

  const simulateScan = useCallback(
    (barcode: string) => {
      dispatchScan(barcode);
    },
    [dispatchScan]
  );

  const clearLastScan = useCallback(() => {
    setLastScannedBarcode(null);
    setLastScannedAt(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = [];
      setIsScanning(false);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const now = performance.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      const target = event.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // Check if this key is a terminator
      const isTerminator = terminators.includes(event.key);

      if (isTerminator) {
        const bufferedString = bufferRef.current.join('');

        // If we have accumulated characters within rapid hardware timing thresholds
        if (bufferedString.length >= minLength) {
          if (preventDefault) {
            event.preventDefault();
            event.stopPropagation();
          }

          // If focused on an input element, clear the text if desired so the raw barcode isn't left in the input
          if (isInputFocused && captureInInputs && target instanceof HTMLInputElement) {
            if (target.type === 'text' || target.type === 'search') {
              // Clear the input value so the raw barcode digits do not clutter the search or barcode field
              target.value = '';
              // Force React synthetic input state change
              const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
              if (valueSetter) {
                valueSetter.call(target, '');
              }
              target.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }

          bufferRef.current = [];
          dispatchScan(bufferedString);
          return;
        }

        // Not enough chars or not rapid enough, clear buffer
        bufferRef.current = [];
        setIsScanning(false);
        return;
      }

      // If key is a standard printable character (single character key)
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        // If the gap between keys is too long, it's human typing — reset buffer
        if (timeSinceLastKey > maxInterval && bufferRef.current.length > 0) {
          bufferRef.current = [];
          setIsScanning(false);
        }

        bufferRef.current.push(event.key);

        // Mark scanning in progress if at least 2 characters came in fast
        if (bufferRef.current.length >= 2 && timeSinceLastKey <= maxInterval) {
          setIsScanning(true);

          if (isScanningTimeoutRef.current) {
            window.clearTimeout(isScanningTimeoutRef.current);
          }

          isScanningTimeoutRef.current = window.setTimeout(() => {
            setIsScanning(false);
          }, maxInterval * 3);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (isScanningTimeoutRef.current) {
        window.clearTimeout(isScanningTimeoutRef.current);
      }
    };
  }, [enabled, maxInterval, minLength, terminators, preventDefault, captureInInputs, dispatchScan]);

  return {
    lastScannedBarcode,
    lastScannedAt,
    scanCount,
    isScanning,
    simulateScan,
    clearLastScan,
  };
}
