/**
 * PRODX POS - Haptic Feedback Service using Web Vibration API
 * 
 * Provides subtle tactile feedback for button presses, touch gestures,
 * barcode scans, numerical keypads, and checkout completions.
 * 
 * Adheres to tactile UX standards:
 * - Subtle tap (10-15ms) for normal button presses to avoid user fatigue
 * - Medium tap (20-25ms) for state transitions and selection confirmations
 * - Heavy pulse (35-40ms) for critical actions (drawer kicks, checkout entry)
 * - Harmonized patterns for success, payment completion, warnings, and errors
 */

export type HapticFeedbackType =
  | 'light'
  | 'tap'
  | 'selection'
  | 'medium'
  | 'heavy'
  | 'impact'
  | 'numpad'
  | 'success'
  | 'payment_success'
  | 'warning'
  | 'error'
  | 'cash_drawer';

export type HapticIntensity = 'subtle' | 'medium' | 'strong';

const STORAGE_KEY_ENABLED = 'prodx_pos_haptic_enabled';
const STORAGE_KEY_INTENSITY = 'prodx_pos_haptic_intensity';

// Base patterns in milliseconds
const HAPTIC_PATTERNS: Record<HapticFeedbackType, number | number[]> = {
  light: 12,
  tap: 12,
  selection: 15,
  medium: 22,
  heavy: 38,
  impact: 42,
  numpad: 14,
  success: [15, 45, 20],
  payment_success: [20, 45, 20, 45, 35],
  warning: [25, 45, 25],
  error: [40, 50, 40, 50, 50],
  cash_drawer: [35, 45, 18],
};

// Intensity scaling factors
const INTENSITY_SCALERS: Record<HapticIntensity, number> = {
  subtle: 0.7,
  medium: 1.0,
  strong: 1.4,
};

/**
 * Check if the browser and current device support the Vibration API
 */
export function isHapticSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'navigator' in window &&
    typeof navigator.vibrate === 'function'
  );
}

/**
 * Check if haptic feedback is currently enabled by the user
 */
export function isHapticEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ENABLED);
    return saved !== null ? saved === 'true' : true; // Enabled by default
  } catch {
    return true;
  }
}

/**
 * Enable or disable haptic feedback
 */
export function setHapticEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
    window.dispatchEvent(new CustomEvent('prodx_haptic_change', { detail: { enabled } }));
  } catch (err) {
    console.warn('[hapticService] Failed to persist haptic enabled state:', err);
  }
}

/**
 * Get current haptic intensity preference
 */
export function getHapticIntensity(): HapticIntensity {
  if (typeof window === 'undefined') return 'medium';
  try {
    const saved = localStorage.getItem(STORAGE_KEY_INTENSITY) as HapticIntensity | null;
    if (saved === 'subtle' || saved === 'medium' || saved === 'strong') {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'medium';
}

/**
 * Set haptic intensity preference ('subtle' | 'medium' | 'strong')
 */
export function setHapticIntensity(intensity: HapticIntensity): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_INTENSITY, intensity);
    window.dispatchEvent(new CustomEvent('prodx_haptic_change', { detail: { intensity } }));
  } catch (err) {
    console.warn('[hapticService] Failed to persist haptic intensity:', err);
  }
}

/**
 * Scale vibration pattern according to user-selected intensity
 */
function scalePattern(
  pattern: number | number[],
  intensity: HapticIntensity
): number | number[] {
  const factor = INTENSITY_SCALERS[intensity] || 1.0;
  if (typeof pattern === 'number') {
    return Math.max(5, Math.round(pattern * factor));
  }
  return pattern.map((val, idx) => {
    // Only scale vibration pulses (even indices: 0, 2, 4...), keep pauses stable
    if (idx % 2 === 0) {
      return Math.max(5, Math.round(val * factor));
    }
    return val;
  });
}

/**
 * Trigger subtle tactile haptic feedback using the Vibration API
 * 
 * @param type Feedback preset name, or custom millisecond duration / pattern array
 * @returns boolean indicating whether vibration was successfully dispatched
 */
export function triggerHaptic(
  type: HapticFeedbackType | number | number[] = 'light'
): boolean {
  if (!isHapticSupported() || !isHapticEnabled()) {
    return false;
  }

  try {
    const intensity = getHapticIntensity();
    let rawPattern: number | number[];

    if (typeof type === 'string') {
      rawPattern = HAPTIC_PATTERNS[type] ?? HAPTIC_PATTERNS.light;
    } else {
      rawPattern = type;
    }

    const finalPattern = scalePattern(rawPattern, intensity);
    const success = navigator.vibrate(finalPattern);

    // Notify listeners (for visual tactile simulators or debuggers)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('prodx_haptic_triggered', {
          detail: { type, pattern: finalPattern, success },
        })
      );
    }

    return success;
  } catch (err) {
    // Non-fatal, gracefully ignore browser policy or context errors
    console.debug('[hapticService] Vibration ignored:', err);
    return false;
  }
}

/**
 * Convenience methods for common POS actions
 */
export const haptic = {
  /** Subtle 12ms tick for buttons, tabs, and filters */
  tap: () => triggerHaptic('tap'),
  /** Crisp 14ms tick for virtual numerical keypad presses */
  numpad: () => triggerHaptic('numpad'),
  /** 15ms selection feedback */
  selection: () => triggerHaptic('selection'),
  /** 22ms medium confirmation */
  medium: () => triggerHaptic('medium'),
  /** 38ms heavy impact for primary action launches */
  heavy: () => triggerHaptic('heavy'),
  /** Double-tap pulse for barcode scans or item additions */
  success: () => triggerHaptic('success'),
  /** Multi-pulse triumphant fanfare for completed checkout */
  paymentSuccess: () => triggerHaptic('payment_success'),
  /** Warning caution buzz */
  warning: () => triggerHaptic('warning'),
  /** Triple error buzz */
  error: () => triggerHaptic('error'),
  /** Mechanical cash drawer latch feel */
  cashDrawer: () => triggerHaptic('cash_drawer'),
};
