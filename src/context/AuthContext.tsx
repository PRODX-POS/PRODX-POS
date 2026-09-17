/**
 * PRODX POS - Authentication, Multi-Tenant Session & Enterprise RBAC Context
 *
 * Authentication credentials and terminal unlock authority remain server-side.
 * Browser storage may retain only non-secret UI/session metadata; bearer tokens
 * are never persisted to localStorage.
 */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User, Store, SessionContext, Permission, Role, hasPermission,
  getStoredStaffDirectory, saveStoredStaffDirectory, getStoredRolePermissions,
  saveStoredRolePermissions,
  ROLE_PERMISSIONS,
} from '../domain/auth';
import { CustomPermissionSet, DEFAULT_PERMISSION_SETS, getStoredCustomPermissionSets, saveStoredCustomPermissionSets } from '../domain/permissionSets';
import { authApi } from '../adapters/authApiFactory';
import { LoginRequest } from '../adapters/types';

export interface AddStaffPayload { name: string; email: string; role: Role; employeeCode: string; pin?: string; isActive?: boolean; }
interface AuthContextType {
  session: SessionContext | null; isLoading: boolean; isLocked: boolean; inactivityTimeoutMinutes: number;
  staffUsers: User[]; rolePermissions: Record<Role, Permission[]>; login: (req: LoginRequest) => Promise<void>; logout: () => Promise<void>;
  switchStore: (store: Store) => void; updateStoreProfile: (updates: Partial<Store>) => void; switchCurrency: (currencyCode: string) => void;
  switchDemoRole: (role: Role) => void; can: (permission: Permission) => boolean; lockSystem: () => void; unlockSystem: (pinOrPassword: string) => Promise<boolean>;
  setInactivityTimeoutMinutes: (mins: number) => void; addStaffUser: (payload: AddStaffPayload) => User; updateStaffUser: (id: string, updates: Partial<User> & { pin?: string }) => void;
  deleteStaffUser: (id: string) => boolean; switchActiveUser: (userOrId: User | string) => void; updateRolePermissions: (role: Role, perms: Permission[]) => void;
  resetRolePermissions: () => void; getStaffPin: (userId: string) => string; setStaffPin: (userId: string, pin: string) => void;
  assignRoleToStaffUser: (id: string, newRole: Role, options?: { permissions?: Permission[]; assignedBy?: string; note?: string; permissionSetId?: string }) => void;
  bulkAssignRoles: (ids: string[], newRole: Role, options?: { assignedBy?: string; note?: string }) => void;
  customPermissionSets: CustomPermissionSet[]; addCustomPermissionSet: (set: Omit<CustomPermissionSet, 'id' | 'createdAt' | 'updatedAt'>) => CustomPermissionSet;
  updateCustomPermissionSet: (id: string, updates: Partial<CustomPermissionSet>) => void; deleteCustomPermissionSet: (id: string) => boolean;
  applyPermissionSetToRole: (setId: string, role: Role) => void; applyPermissionSetToStaff: (setId: string, staffId: string) => void; resetPermissionSetsToDefaults: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = 'prodx_pos_session'; const TIMEOUT_STORAGE_KEY = 'prodx_pos_inactivity_timeout'; const CUSTOM_STORE_KEY = 'prodx_custom_store_profile';

function persistSession(session: SessionContext): void {
  const { token: _token, ...safeSession } = session;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(safeSession)); } catch (err) { console.error('[AuthContext] Failed to persist non-secret session state:', err); }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SessionContext | null>(null); const [isLoading, setIsLoading] = useState(true); const [isLocked, setIsLocked] = useState(false);
  const [staffUsers, setStaffUsers] = useState<User[]>(() => getStoredStaffDirectory());
  const [rolePermissions, setRolePermissions] = useState<Record<Role, Permission[]>>(() => getStoredRolePermissions());
  const [customPermissionSets, setCustomPermissionSets] = useState<CustomPermissionSet[]>(() => getStoredCustomPermissionSets());
  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutesState] = useState<number>(() => { try { const stored = localStorage.getItem(TIMEOUT_STORAGE_KEY); if (stored !== null) return Number(stored); } catch {} return 5; });
  const lastActivityRef = useRef(Date.now());

  useEffect(() => { async function restoreSession() { try { const raw = localStorage.getItem(STORAGE_KEY); const storedCustomStore = localStorage.getItem(CUSTOM_STORE_KEY); const customStoreOverrides = storedCustomStore ? JSON.parse(storedCustomStore) : null; if (raw) { const verified = await authApi.verifySession(); if (verified) { const finalStore = customStoreOverrides ? { ...verified.currentStore, ...customStoreOverrides } : verified.currentStore; setSession({ ...verified, currentStore: finalStore }); persistSession({ ...verified, currentStore: finalStore }); } else localStorage.removeItem(STORAGE_KEY); } } catch (err) { console.error('[AuthContext] Session restore error:', err); localStorage.removeItem(STORAGE_KEY); } finally { setIsLoading(false); } } restoreSession(); }, []);
  useEffect(() => { if (!session || isLocked) return; const handleActivity = () => { lastActivityRef.current = Date.now(); }; const events = ['mousemove','mousedown','keydown','touchstart','scroll']; events.forEach(ev => window.addEventListener(ev, handleActivity, { passive: true })); const timer = setInterval(() => { if (!isLocked && session && inactivityTimeoutMinutes > 0 && Date.now() - lastActivityRef.current >= inactivityTimeoutMinutes * 60 * 1000) setIsLocked(true); }, 10000); return () => { events.forEach(ev => window.removeEventListener(ev, handleActivity)); clearInterval(timer); }; }, [session, isLocked, inactivityTimeoutMinutes]);
  const login = async (req: LoginRequest) => { setIsLoading(true); try { const newSession = await authApi.login(req); setSession(newSession); setIsLocked(false); lastActivityRef.current = Date.now(); persistSession(newSession); } finally { setIsLoading(false); } };
  const logout = async () => { setIsLoading(true); try { await authApi.logout(); setSession(null); setIsLocked(false); localStorage.removeItem(STORAGE_KEY); } finally { setIsLoading(false); } };
  const switchStore = (store: Store) => { if (!session) return; const updated = { ...session, currentStore: store }; setSession(updated); persistSession(updated); };
  const updateStoreProfile = (updates: Partial<Store>) => { if (!session) return; const updatedStore = { ...session.currentStore, ...updates }; const updatedSession = { ...session, currentStore: updatedStore }; setSession(updatedSession); persistSession(updatedSession); localStorage.setItem(CUSTOM_STORE_KEY, JSON.stringify(updatedStore)); };
  const switchCurrency = (currencyCode: string) => { if (!session) return; const updatedStore = { ...session.currentStore, currency: currencyCode.toUpperCase() }; const updated = { ...session, currentStore: updatedStore }; setSession(updated); persistSession(updated); };
  const switchDemoRole = (_role: Role) => { return; };
  const can = (permission: Permission) => { if (!session?.currentUser) return false; const rolePerms = rolePermissions[session.currentUser.role] || []; return rolePerms.includes(permission) || hasPermission(session.currentUser, permission); };
  const lockSystem = () => { if (session) setIsLocked(true); };
  const unlockSystem = async (pinOrPassword: string) => { if (!session || !pinOrPassword.trim()) return false; try { const reauthenticated = await authApi.login({ organizationSlug: session.organization.slug, storeCode: session.currentStore.code, registerId: session.registerId, emailOrPin: session.currentUser.email, passwordOrPin: pinOrPassword.trim() }); setSession(reauthenticated); setIsLocked(false); lastActivityRef.current = Date.now(); persistSession(reauthenticated); return true; } catch { return false; } };
  const setInactivityTimeoutMinutes = (mins: number) => { setInactivityTimeoutMinutesState(mins); try { localStorage.setItem(TIMEOUT_STORAGE_KEY, String(mins)); } catch {} };
  const addStaffUser = (payload: AddStaffPayload): User => { const id = `usr-${payload.role}-${Date.now().toString(36)}`; const rolePerms = rolePermissions[payload.role] || []; const newUser: User = { id, name: payload.name.trim(), email: payload.email.trim(), role: payload.role, employeeCode: payload.employeeCode.trim().toUpperCase(), permissions: rolePerms, isActive: payload.isActive !== false }; const nextUsers = [...staffUsers, newUser]; setStaffUsers(nextUsers); saveStoredStaffDirectory(nextUsers); return newUser; };
  const updateStaffUser = (id: string, updates: Partial<User> & { pin?: string }) => { const { pin: _pin, ...safeUpdates } = updates; const nextUsers = staffUsers.map(u => u.id === id ? { ...u, ...safeUpdates, role: safeUpdates.role || u.role, permissions: safeUpdates.permissions || (safeUpdates.role ? rolePermissions[safeUpdates.role] : u.permissions) } : u); setStaffUsers(nextUsers); saveStoredStaffDirectory(nextUsers); if (session?.currentUser.id === id) { const updatedUser = nextUsers.find(u => u.id === id); if (updatedUser) { const updatedSession = { ...session, currentUser: updatedUser }; setSession(updatedSession); persistSession(updatedSession); } } };
  const assignRoleToStaffUser = (id: string, newRole: Role, options?: { permissions?: Permission[]; assignedBy?: string; note?: string; permissionSetId?: string }) => updateStaffUser(id, { role: newRole, permissions: [...(options?.permissions || rolePermissions[newRole] || ROLE_PERMISSIONS[newRole])], lastRoleAssignedAt: new Date().toISOString(), assignedBy: options?.assignedBy || session?.currentUser.name, roleAssignmentNote: options?.note, assignedPermissionSetId: options?.permissionSetId });
  const bulkAssignRoles = (ids: string[], newRole: Role, options?: { assignedBy?: string; note?: string }) => { const nextPerms = rolePermissions[newRole] || ROLE_PERMISSIONS[newRole]; const now = new Date().toISOString(); const assignedBy = options?.assignedBy || session?.currentUser.name; const nextUsers = staffUsers.map(u => ids.includes(u.id) ? { ...u, role: newRole, permissions: [...nextPerms], lastRoleAssignedAt: now, assignedBy, roleAssignmentNote: options?.note } : u); setStaffUsers(nextUsers); saveStoredStaffDirectory(nextUsers); if (session && ids.includes(session.currentUser.id)) { const updatedUser = nextUsers.find(u => u.id === session.currentUser.id); if (updatedUser) { const updatedSession = { ...session, currentUser: updatedUser }; setSession(updatedSession); persistSession(updatedSession); } } };
  const deleteStaffUser = (id: string) => { if (session?.currentUser.id === id) return false; const nextUsers = staffUsers.filter(u => u.id !== id); setStaffUsers(nextUsers); saveStoredStaffDirectory(nextUsers); return true; };
  const switchActiveUser = (userOrId: User | string) => { if (!session) return; const target = typeof userOrId === 'string' ? staffUsers.find(u => u.id === userOrId) : userOrId; if (!target) return; const updatedUser = { ...target, permissions: rolePermissions[target.role] || target.permissions }; const updatedSession = { ...session, currentUser: updatedUser }; setSession(updatedSession); persistSession(updatedSession); };
  const updateRolePermissions = (role: Role, perms: Permission[]) => { const nextMatrix = { ...rolePermissions, [role]: perms }; setRolePermissions(nextMatrix); saveStoredRolePermissions(nextMatrix); if (session?.currentUser.role === role) { const updatedSession = { ...session, currentUser: { ...session.currentUser, permissions: perms } }; setSession(updatedSession); persistSession(updatedSession); } };
  const resetRolePermissions = () => { const defaults = { admin:[...ROLE_PERMISSIONS.admin], manager:[...ROLE_PERMISSIONS.manager], cashier:[...ROLE_PERMISSIONS.cashier] }; setRolePermissions(defaults); saveStoredRolePermissions(defaults); if (session) { const updatedSession = { ...session, currentUser:{...session.currentUser, permissions:defaults[session.currentUser.role]} }; setSession(updatedSession); persistSession(updatedSession); } };
  const getStaffPin = (_userId: string) => '';
  const setStaffPin = (_userId: string, _pin: string) => { console.warn('[AuthContext] Client-side PIN storage is disabled; use the Authentication Server.'); };
  const addCustomPermissionSet = (setPayload: Omit<CustomPermissionSet,'id'|'createdAt'|'updatedAt'>) => { const id = `pset-custom-${Date.now()}`; const now = new Date().toISOString(); const newSet = { ...setPayload, id, createdAt: now, updatedAt: now }; const next=[...customPermissionSets,newSet]; setCustomPermissionSets(next); saveStoredCustomPermissionSets(next); return newSet; };
  const updateCustomPermissionSet = (id: string, updates: Partial<CustomPermissionSet>) => { const next=customPermissionSets.map(s=>s.id===id?{...s,...updates,updatedAt:new Date().toISOString()}:s); setCustomPermissionSets(next); saveStoredCustomPermissionSets(next); };
  const deleteCustomPermissionSet = (id: string) => { const target=customPermissionSets.find(s=>s.id===id); if(!target||target.isSystem)return false; const next=customPermissionSets.filter(s=>s.id!==id); setCustomPermissionSets(next); saveStoredCustomPermissionSets(next); return true; };
  const applyPermissionSetToRole = (setId: string, role: Role) => { const set=customPermissionSets.find(s=>s.id===setId); if(set) updateRolePermissions(role,set.permissions); };
  const applyPermissionSetToStaff = (setId: string, staffId: string) => { const set=customPermissionSets.find(s=>s.id===setId); if(!set)return; const assigned=(set.assignedStaffIds||[]).includes(staffId); setCustomPermissionSets(prev=>{const next=prev.map(s=>s.id===setId?{...s,assignedStaffIds:assigned?(s.assignedStaffIds||[]).filter(id=>id!==staffId):[...(s.assignedStaffIds||[]),staffId]}:s);saveStoredCustomPermissionSets(next);return next;}); updateStaffUser(staffId,{permissions:assigned?[]:[...set.permissions]}); };
  const resetPermissionSetsToDefaults = () => { setCustomPermissionSets(DEFAULT_PERMISSION_SETS); saveStoredCustomPermissionSets(DEFAULT_PERMISSION_SETS); };
  return <AuthContext.Provider value={{session,isLoading,isLocked,inactivityTimeoutMinutes,staffUsers,rolePermissions,login,logout,switchStore,updateStoreProfile,switchCurrency,switchDemoRole,can,lockSystem,unlockSystem,setInactivityTimeoutMinutes,addStaffUser,updateStaffUser,deleteStaffUser,switchActiveUser,updateRolePermissions,resetRolePermissions,getStaffPin,setStaffPin,assignRoleToStaffUser,bulkAssignRoles,customPermissionSets,addCustomPermissionSet,updateCustomPermissionSet,deleteCustomPermissionSet,applyPermissionSetToRole,applyPermissionSetToStaff,resetPermissionSetsToDefaults}}>{children}</AuthContext.Provider>;
};
export function useOptionalAuth(): AuthContextType | null { return useContext(AuthContext) || null; }
export function useAuth(): AuthContextType { const ctx=useContext(AuthContext); if(ctx)return ctx; return {session:null,isLoading:false,isLocked:false,inactivityTimeoutMinutes:15,staffUsers:[],rolePermissions:ROLE_PERMISSIONS as Record<Role,Permission[]>,login:async()=>{},logout:async()=>{},switchStore:()=>{},switchCurrency:()=>{},switchDemoRole:()=>{},switchActiveUser:()=>{},lockSystem:()=>{},unlockSystem:async()=>false,setInactivityTimeoutMinutes:()=>{},can:()=>false,addStaffUser:()=>({} as User),updateStaffUser:()=>{},deleteStaffUser:()=>false,updateRolePermissions:()=>{},resetRolePermissions:()=>{},getStaffPin:()=>'',setStaffPin:()=>{},assignRoleToStaffUser:()=>{},bulkAssignRoles:()=>{},customPermissionSets:[],addCustomPermissionSet:()=>({} as CustomPermissionSet),updateCustomPermissionSet:()=>{},deleteCustomPermissionSet:()=>false,updateStoreProfile:()=>{},applyPermissionSetToRole:()=>{},applyPermissionSetToStaff:()=>{},resetPermissionSetsToDefaults:()=>{}}; }
