/**
 * PRODX POS - Authentication & Multi-Tenant Session Context
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Store, Organization, SessionContext, Permission, hasPermission } from '../domain/auth';
import { authApi, SEED_USERS } from '../adapters/mockAdapter';
import { LoginRequest } from '../adapters/types';

interface AuthContextType {
  session: SessionContext | null;
  isLoading: boolean;
  isLocked: boolean;
  inactivityTimeoutMinutes: number;
  login: (req: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  switchStore: (store: Store) => void;
  updateStoreProfile: (updates: Partial<Store>) => void;
  switchCurrency: (currencyCode: string) => void;
  switchDemoRole: (role: 'admin' | 'manager' | 'cashier') => void;
  can: (permission: Permission) => boolean;
  lockSystem: () => void;
  unlockSystem: (pinOrPassword: string) => Promise<boolean>;
  setInactivityTimeoutMinutes: (mins: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'prodx_pos_session';
const TIMEOUT_STORAGE_KEY = 'prodx_pos_inactivity_timeout';
const CUSTOM_STORE_KEY = 'prodx_custom_store_profile';
const DEMO_ROLE_SWITCH_ENABLED = import.meta.env.DEV;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SessionContext | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutesState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(TIMEOUT_STORAGE_KEY);
      if (stored !== null) return Number(stored);
    } catch {
      // ignore
    }
    return 5; // Default 5 minutes
  });

  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    async function restoreSession() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const storedCustomStore = localStorage.getItem(CUSTOM_STORE_KEY);
        const customStoreOverrides = storedCustomStore ? JSON.parse(storedCustomStore) : null;

        if (raw) {
          const parsed = JSON.parse(raw) as SessionContext;
          const verified = await authApi.verifySession(parsed.token);
          if (verified) {
            const finalStore = customStoreOverrides
              ? { ...parsed.currentStore, ...customStoreOverrides }
              : parsed.currentStore;
            setSession({
              ...parsed,
              currentStore: finalStore,
              organization: verified.organization,
            });
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Session restore error:', err);
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  // Inactivity tracking listeners & timer
  useEffect(() => {
    if (!session || isLocked) return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    const timer = setInterval(() => {
      if (!isLocked && session && inactivityTimeoutMinutes > 0) {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= inactivityTimeoutMinutes * 60 * 1000) {
          setIsLocked(true);
        }
      }
    }, 10000); // Check every 10 seconds

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      clearInterval(timer);
    };
  }, [session, isLocked, inactivityTimeoutMinutes]);

  const login = async (req: LoginRequest) => {
    setIsLoading(true);
    try {
      const newSession = await authApi.login(req);
      setSession(newSession);
      setIsLocked(false);
      lastActivityRef.current = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      setSession(null);
      setIsLocked(false);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const switchStore = (store: Store) => {
    if (!session) return;
    const updated: SessionContext = {
      ...session,
      currentStore: store,
    };
    setSession(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const updateStoreProfile = (updates: Partial<Store>) => {
    if (!session) return;
    const updatedStore: Store = {
      ...session.currentStore,
      ...updates,
    };
    const updatedSession: SessionContext = {
      ...session,
      currentStore: updatedStore,
    };
    setSession(updatedSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
    localStorage.setItem(CUSTOM_STORE_KEY, JSON.stringify(updatedStore));
  };

  const switchCurrency = (currencyCode: string) => {
    if (!session) return;
    const updatedStore: Store = {
      ...session.currentStore,
      currency: currencyCode.toUpperCase(),
    };
    const updated: SessionContext = {
      ...session,
      currentStore: updatedStore,
    };
    setSession(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const switchDemoRole = (role: 'admin' | 'manager' | 'cashier') => {
    if (!DEMO_ROLE_SWITCH_ENABLED || !session) return;
    const targetUser = SEED_USERS.find((u) => u.role === role);
    if (!targetUser) return;
    const updated: SessionContext = {
      ...session,
      currentUser: targetUser,
    };
    setSession(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const can = (permission: Permission): boolean => {
    if (!session) return false;
    return hasPermission(session.currentUser, permission);
  };

  const lockSystem = () => {
    if (session) {
      setIsLocked(true);
    }
  };

  const unlockSystem = async (pinOrPassword: string): Promise<boolean> => {
    if (!session) return false;

    // Universal demo credentials must never be accepted by the application.
    // The current frontend mock supports employee-code unlock only in dev mode.
    // Production lock/unlock must be implemented by the authenticated backend API.
    if (!import.meta.env.DEV) return false;

    const trimmed = pinOrPassword.trim();
    if (!trimmed) return false;

    if (trimmed.toLowerCase() === session.currentUser.employeeCode.toLowerCase()) {
      setIsLocked(false);
      lastActivityRef.current = Date.now();
      return true;
    }

    return false;
  };

  const setInactivityTimeoutMinutes = (mins: number) => {
    setInactivityTimeoutMinutesState(mins);
    try {
      localStorage.setItem(TIMEOUT_STORAGE_KEY, String(mins));
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        isLocked,
        inactivityTimeoutMinutes,
        login,
        logout,
        switchStore,
        updateStoreProfile,
        switchCurrency,
        switchDemoRole,
        can,
        lockSystem,
        unlockSystem,
        setInactivityTimeoutMinutes,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
