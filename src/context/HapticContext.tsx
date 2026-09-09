import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  isHapticSupported,
  isHapticEnabled,
  setHapticEnabled as saveHapticEnabled,
  getHapticIntensity,
  setHapticIntensity as saveHapticIntensity,
  triggerHaptic,
  haptic,
  HapticFeedbackType,
  HapticIntensity,
} from '../services/hapticService';

interface HapticContextType {
  isSupported: boolean;
  hapticEnabled: boolean;
  setHapticEnabled: (enabled: boolean) => void;
  intensity: HapticIntensity;
  setIntensity: (intensity: HapticIntensity) => void;
  trigger: (type?: HapticFeedbackType | number | number[]) => boolean;
  haptic: typeof haptic;
  lastTriggered: { type: string; timestamp: number } | null;
}

const HapticContext = createContext<HapticContextType | undefined>(undefined);

export const HapticProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supported, setSupported] = useState<boolean>(false);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [intensity, setIntensityState] = useState<HapticIntensity>('medium');
  const [lastTriggered, setLastTriggered] = useState<{ type: string; timestamp: number } | null>(null);

  useEffect(() => {
    setSupported(isHapticSupported());
    setEnabled(isHapticEnabled());
    setIntensityState(getHapticIntensity());

    const handleHapticChange = () => {
      setEnabled(isHapticEnabled());
      setIntensityState(getHapticIntensity());
    };

    const handleHapticTriggered = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: string; pattern: any; success: boolean }>;
      setLastTriggered({
        type: String(customEvent.detail?.type || 'light'),
        timestamp: Date.now(),
      });
    };

    window.addEventListener('prodx_haptic_change', handleHapticChange);
    window.addEventListener('prodx_haptic_triggered', handleHapticTriggered);

    return () => {
      window.removeEventListener('prodx_haptic_change', handleHapticChange);
      window.removeEventListener('prodx_haptic_triggered', handleHapticTriggered);
    };
  }, []);

  const handleSetEnabled = useCallback((newEnabled: boolean) => {
    setEnabled(newEnabled);
    saveHapticEnabled(newEnabled);
  }, []);

  const handleSetIntensity = useCallback((newIntensity: HapticIntensity) => {
    setIntensityState(newIntensity);
    saveHapticIntensity(newIntensity);
  }, []);

  const trigger = useCallback((type?: HapticFeedbackType | number | number[]) => {
    return triggerHaptic(type);
  }, []);

  return (
    <HapticContext.Provider
      value={{
        isSupported: supported,
        hapticEnabled: enabled,
        setHapticEnabled: handleSetEnabled,
        intensity,
        setIntensity: handleSetIntensity,
        trigger,
        haptic,
        lastTriggered,
      }}
    >
      {children}
    </HapticContext.Provider>
  );
};

export const useHaptic = () => {
  const context = useContext(HapticContext);
  if (!context) {
    // Graceful fallback if called outside provider
    return {
      isSupported: isHapticSupported(),
      hapticEnabled: isHapticEnabled(),
      setHapticEnabled: saveHapticEnabled,
      intensity: getHapticIntensity(),
      setIntensity: saveHapticIntensity,
      trigger: triggerHaptic,
      haptic,
      lastTriggered: null,
    };
  }
  return context;
};
