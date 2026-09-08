/**
 * PRODX POS - Authentication, Multi-Tenant Session & Enterprise RBAC Context
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User,
  Store,
  Organization,
  SessionContext,
  Permission,
  Role,
  hasPermission,
  getStoredStaffDirectory,
  saveStoredStaffDirectory,
  getStoredRolePermissions,
  saveStoredRolePermissions,
  getStoredStaffPins,
  saveStoredStaffPins,
  ROLE_PERMISSIONS,
  DEFAULT_STAFF_DIRECTORY,
} from '../domain/auth';
import {
  CustomPermissionSet,
  DEFAULT_PERMISSION_SETS,
  getStoredCustomPermissionSets,
  saveStoredCustomPermissionSets,
} from '../domain/permissionSets';
import { authApi } from '../adapters/authApiFactory';
import { LoginRequest } from '../adapters/types';

export interface AddStaffPayload {
  name: string;
  email: string;
  role: Role;
  employeeCode: string;
  pin?: string;
  isActive?: boolean;
}

interface AuthContextType {
  session: SessionContext | null;
  isLoading: boolean;
  isLocked: boolean;
  inactivityTimeoutMinutes: number;
  staffUsers: User[];
  rolePermissions: Record<Role, Permission[]>;
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
  addStaffUser: (payload: AddStaffPayload) => User;
  updateStaffUser: (id: string, updates: Partial<User> & { pin?: string }) => void;
  deleteStaffUser: (id: string) => boolean;
  switchActiveUser: (userOrId: User | string) => void;
  updateRolePermissions: (role: Role, perms: Permission[]) => void;
  resetRolePermissions: () => void;
  getStaffPin: (userId: string) => string;
  setStaffPin: (userId: string, pin: string) => void;
  assignRoleToStaffUser: (
    id: string,
    newRole: Role,
    options?: { permissions?: Permission[]; assignedBy?: string; note?: string; permissionSetId?: string }
  ) => void;
  bulkAssignRoles: (ids: string[], newRole: Role, options?: { assignedBy?: string; note?: string }) => void;
  customPermissionSets: CustomPermissionSet[];
  addCustomPermissionSet: (set: Omit<CustomPermissionSet, 'id' | 'createdAt' | 'updatedAt'>) => CustomPermissionSet;
  updateCustomPermissionSet: (id: string, updates: Partial<CustomPermissionSet>) => void;
  deleteCustomPermissionSet: (id: string) => boolean;
  applyPermissionSetToRole: (setId: string, role: Role) => void;
  applyPermissionSetToStaff: (setId: string, staffId: string) => void;
  resetPermissionSetsToDefaults: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = 'prodx_pos_session';
const TIMEOUT_STORAGE_KEY = 'prodx_pos_inactivity_timeout';
const CUSTOM_STORE_KEY = 'prodx_custom_store_profile';
const DEMO_ROLE_SWITCH_ENABLED = true;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SessionContext | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [staffUsers, setStaffUsers] = useState<User[]>(() => getStoredStaffDirectory());
  const [rolePermissions, setRolePermissions] = useState<Record<Role, Permission[]>>(() => getStoredRolePermissions());
  const [staffPins, setStaffPins] = useState<Record<string, string>>(() => getStoredStaffPins());
  const [customPermissionSets, setCustomPermissionSets] = useState<CustomPermissionSet[]>(() => getStoredCustomPermissionSets());

  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutesState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(TIMEOUT_STORAGE_KEY);
      if (stored !== null) return Number(stored);
    } catch {}
    return 5;
  });
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    async function restoreSession() {
      try {
        const storedCustomStore = localStorage.getItem(CUSTOM_STORE_KEY);
        const customStoreOverrides = storedCustomStore ? JSON.parse(storedCustomStore) : null;
        const verified = await authApi.verifySession();
        if (verified) {
          const finalStore = customStoreOverrides
            ? { ...verified.currentStore, ...customStoreOverrides }
            : verified.currentStore;
          setSession({ ...verified, currentStore: finalStore });
        } else {
          localStorage.removeItem(STORAGE_KEY);
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

  useEffect(() => {
    if (!session || isLocked) return;
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
    const timer = setInterval(() => {
      if (!isLocked && session && inactivityTimeoutMinutes > 0) {
        if (Date.now() - lastActivityRef.current >= inactivityTimeoutMinutes * 60 * 1000) {
          setIsLocked(true);
        }
      }
    }, 10000);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      clearInterval(timer);
    };
  }, [session, isLocked, inactivityTimeoutMinutes]);

  const persistLocalSessionForDev = (nextSession: SessionContext) => {
    if (import.meta.env.DEV) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    }
  };

  const login = async (req: LoginRequest) => {
    setIsLoading(true);
    try {
      const newSession = await authApi.login(req);
      setSession(newSession);
      setIsLocked(false);
      lastActivityRef.current = Date.now();
      persistLocalSessionForDev(newSession);
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
    const updated = { ...session, currentStore: store };
    setSession(updated);
    persistLocalSessionForDev(updated);
  };

  const updateStoreProfile = (updates: Partial<Store>) => {
    if (!session) return;
    const updatedStore = { ...session.currentStore, ...updates };
    const updatedSession = { ...session, currentStore: updatedStore };
    setSession(updatedSession);
    persistLocalSessionForDev(updatedSession);
    if (import.meta.env.DEV) localStorage.setItem(CUSTOM_STORE_KEY, JSON.stringify(updatedStore));
  };

  const switchCurrency = (currencyCode: string) => {
    if (!session) return;
    const updatedStore = { ...session.currentStore, currency: currencyCode.toUpperCase() };
    const updated = { ...session, currentStore: updatedStore };
    setSession(updated);
    persistLocalSessionForDev(updated);
  };

  const switchDemoRole = (role: 'admin' | 'manager' | 'cashier') => {
    if (!import.meta.env.DEV || !DEMO_ROLE_SWITCH_ENABLED || !session) return;
    const targetUser = staffUsers.find((u) => u.role === role);
    if (!targetUser) return;
    switchActiveUser(targetUser);
  };

  const can = (permission: Permission): boolean => {
    if (!session || !session.currentUser) return false;
    const userRole = session.currentUser.role;
    const rolePerms = rolePermissions[userRole] || [];
    return rolePerms.includes(permission) || hasPermission(session.currentUser, permission);
  };

  const lockSystem = () => {
    if (session) setIsLocked(true);
  };

  const unlockSystem = async (pinOrPassword: string): Promise<boolean> => {
    if (!session) return false;
    const trimmed = pinOrPassword.trim();
    if (!trimmed) return false;

    // Production must use server authentication/session policy. Local PIN comparison is development-only.
    if (!import.meta.env.DEV) {
      try {
        const verified = await authApi.login({
          organizationSlug: session.organization.slug,
          storeCode: session.currentStore.code,
          registerId: session.registerId,
          emailOrPin: session.currentUser.email,
          passwordOrPin: trimmed,
        });
        setSession(verified);
        setIsLocked(false);
        lastActivityRef.current = Date.now();
        return true;
      } catch {
        return false;
      }
    }

    const userPin = getStaffPin(session.currentUser.id);
    if (trimmed === userPin || trimmed.toLowerCase() === session.currentUser.employeeCode.toLowerCase()) {
      setIsLocked(false);
      lastActivityRef.current = Date.now();
      return true;
    }

    if (
      (session.currentUser.role === 'admin' && trimmed === '1234') ||
      (session.currentUser.role === 'manager' && trimmed === '5678') ||
      (session.currentUser.role === 'cashier' && (trimmed === '0000' || trimmed === '1111'))
    ) {
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
    } catch {}
  };

  const addStaffUser = (payload: AddStaffPayload): User => {
    const id = `usr-${payload.role}-${Date.now().toString(36)}`;
    const rolePerms = rolePermissions[payload.role] || [];
    const newUser: User = {
      id,
      name: payload.name.trim(),
      email: payload.email.trim(),
      role: payload.role,
      employeeCode: payload.employeeCode.trim().toUpperCase(),
      permissions: rolePerms,
      isActive: payload.isActive !== false,
    };
    const nextUsers = [...staffUsers, newUser];
    setStaffUsers(nextUsers);
    saveStoredStaffDirectory(nextUsers);
    if (payload.pin) setStaffPin(id, payload.pin);
    return newUser;
  };

  const updateStaffUser = (id: string, updates: Partial<User> & { pin?: string }) => {
    const nextUsers = staffUsers.map((u) => {
      if (u.id === id) {
        const nextRole = updates.role || u.role;
        const nextPerms = updates.permissions || (updates.role ? rolePermissions[nextRole] : u.permissions);
        return { ...u, ...updates, role: nextRole, permissions: nextPerms };
      }
      return u;
    });
    setStaffUsers(nextUsers);
    saveStoredStaffDirectory(nextUsers);
    if (updates.pin) setStaffPin(id, updates.pin);
    if (session && session.currentUser.id === id) {
      const updatedUser = nextUsers.find((u) => u.id === id);
      if (updatedUser) {
        const updatedSession = { ...session, currentUser: updatedUser };
        setSession(updatedSession);
        persistLocalSessionForDev(updatedSession);
      }
    }
  };

  const assignRoleToStaffUser = (
    id: string,
    newRole: Role,
    options?: { permissions?: Permission[]; assignedBy?: string; note?: string; permissionSetId?: string }
  ) => {
    const nextPerms = options?.permissions || rolePermissions[newRole] || ROLE_PERMISSIONS[newRole];
    const now = new Date().toISOString();
    const assignedBy = options?.assignedBy || session?.currentUser.name || 'Administrator';
    updateStaffUser(id, {
      role: newRole,
      permissions: [...nextPerms],
      lastRoleAssignedAt: now,
      assignedBy,
      roleAssignmentNote: options?.note || `Assigned to ${newRole.toUpperCase()} by ${assignedBy}`,
      assignedPermissionSetId: options?.permissionSetId,
    });
  };

  const bulkAssignRoles = (ids: string[], newRole: Role, options?: { assignedBy?: string; note?: string }) => {
    const nextPerms = rolePermissions[newRole] || ROLE_PERMISSIONS[newRole];
    const now = new Date().toISOString();
    const assignedBy = options?.assignedBy || session?.currentUser.name || 'Administrator';
    const nextUsers = staffUsers.map((u) => {
      if (ids.includes(u.id)) {
        return {
          ...u,
          role: newRole,
          permissions: [...nextPerms],
          lastRoleAssignedAt: now,
          assignedBy,
          roleAssignmentNote: options?.note || `Batch assigned to ${newRole.toUpperCase()} by ${assignedBy}`,
        };
      }
      return u;
    });
    setStaffUsers(nextUsers);
    saveStoredStaffDirectory(nextUsers);
    if (session && ids.includes(session.currentUser.id)) {
      const updatedUser = nextUsers.find((u) => u.id === session.currentUser.id);
      if (updatedUser) {
        const updatedSession = { ...session, currentUser: updatedUser };
        setSession(updatedSession);
        persistLocalSessionForDev(updatedSession);
      }
    }
  };

  const deleteStaffUser = (id: string): boolean => {
    if (session && session.currentUser.id === id) return false;
    const nextUsers = staffUsers.filter((u) => u.id !== id);
    setStaffUsers(nextUsers);
    saveStoredStaffDirectory(nextUsers);
    return true;
  };

  const switchActiveUser = (userOrId: User | string) => {
    if (!import.meta.env.DEV || !session) return;
    const target = typeof userOrId === 'string' ? staffUsers.find((u) => u.id === userOrId) : userOrId;
    if (!target) return;
    const dynamicPerms = rolePermissions[target.role] || target.permissions;
    const updatedUser: User = { ...target, permissions: dynamicPerms };
    const updatedSession = { ...session, currentUser: updatedUser };
    setSession(updatedSession);
    persistLocalSessionForDev(updatedSession);
  };

  const updateRolePermissions = (role: Role, perms: Permission[]) => {
    const nextMatrix = { ...rolePermissions, [role]: perms };
    setRolePermissions(nextMatrix);
    saveStoredRolePermissions(nextMatrix);
    if (session && session.currentUser.role === role) {
      const updatedUser: User = { ...session.currentUser, permissions: perms };
      const updatedSession = { ...session, currentUser: updatedUser };
      setSession(updatedSession);
      persistLocalSessionForDev(updatedSession);
    }
  };

  const resetRolePermissions = () => {
    const defaults = { admin: [...ROLE_PERMISSIONS.admin], manager: [...ROLE_PERMISSIONS.manager], cashier: [...ROLE_PERMISSIONS.cashier] };
    setRolePermissions(defaults);
    saveStoredRolePermissions(defaults);
  };

  const getStaffPin = (userId: string): string => staffPins[userId] || '';

  const setStaffPin = (userId: string, pin: string) => {
    const next = { ...staffPins, [userId]: pin };
    setStaffPins(next);
    saveStoredStaffPins(next);
  };

  const addCustomPermissionSet = (set: Omit<CustomPermissionSet, 'id' | 'createdAt' | 'updatedAt'>): CustomPermissionSet => {
    const now = new Date().toISOString();
    const newSet: CustomPermissionSet = { ...set, id: `permset-${Date.now().toString(36)}`, createdAt: now, updatedAt: now };
    const next = [...customPermissionSets, newSet];
    setCustomPermissionSets(next);
    saveStoredCustomPermissionSets(next);
    return newSet;
  };

  const updateCustomPermissionSet = (id: string, updates: Partial<CustomPermissionSet>) => {
    const next = customPermissionSets.map((set) => set.id === id ? { ...set, ...updates, updatedAt: new Date().toISOString() } : set);
    setCustomPermissionSets(next);
    saveStoredCustomPermissionSets(next);
  };

  const deleteCustomPermissionSet = (id: string): boolean => {
    const next = customPermissionSets.filter((set) => set.id !== id);
    if (next.length === customPermissionSets.length) return false;
    setCustomPermissionSets(next);
    saveStoredCustomPermissionSets(next);
    return true;
  };

  const applyPermissionSetToRole = (setId: string, role: Role) => {
    const set = customPermissionSets.find((s) => s.id === setId);
    if (!set) return;
    updateRolePermissions(role, [...set.permissions]);
  };

  const applyPermissionSetToStaff = (setId: string, staffId: string) => {
    const set = customPermissionSets.find((s) => s.id === setId);
    if (!set) return;
    updateStaffUser(staffId, { permissions: [...set.permissions], assignedPermissionSetId: setId });
  };

  const resetPermissionSetsToDefaults = () => {
    setCustomPermissionSets(DEFAULT_PERMISSION_SETS);
    saveStoredCustomPermissionSets(DEFAULT_PERMISSION_SETS);
  };

  return (
    <AuthContext.Provider value={{
      session,
      isLoading,
      isLocked,
      inactivityTimeoutMinutes,
      staffUsers,
      rolePermissions,
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
      addStaffUser,
      updateStaffUser,
      deleteStaffUser,
      switchActiveUser,
      updateRolePermissions,
      resetRolePermissions,
      getStaffPin,
      setStaffPin,
      assignRoleToStaffUser,
      bulkAssignRoles,
      customPermissionSets,
      addCustomPermissionSet,
      updateCustomPermissionSet,
      deleteCustomPermissionSet,
      applyPermissionSetToRole,
      applyPermissionSetToStaff,
      resetPermissionSetsToDefaults,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
