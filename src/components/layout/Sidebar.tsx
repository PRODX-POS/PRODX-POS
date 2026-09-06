import React, { useState } from 'react';
import {
  LayoutGrid,
  ShoppingCart,
  ReceiptText,
  Boxes,
  Users,
  Banknote,
  ShieldCheck,
  Settings,
  ChevronRight,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatMoney } from '../../domain/money';
import { ProdxLogo } from '../common/ProdxLogo';

export type NavRoute =
  | 'pos'
  | 'dashboard'
  | 'orders'
  | 'inventory'
  | 'shift'
  | 'customers'
  | 'audit'
  | 'settings';

export interface SidebarProps {
  currentRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRoute, onNavigate, onCloseMobile }) => {
  const { session, can, logout } = useAuth();
  const { currentShift } = useShift();
  const { language, t } = useLanguage();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navItems: {
    id: NavRoute;
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
    requiredPermission?: Parameters<typeof can>[0];
  }[] = [
    {
      id: 'pos',
      label: t.nav.pos,
      icon: <ShoppingCart className="h-5 w-5" />,
      shortcut: 'F1',
      requiredPermission: 'pos:checkout',
    },
    {
      id: 'dashboard',
      label: t.nav.dashboard,
      icon: <LayoutGrid className="h-5 w-5" />,
      shortcut: 'F2',
      requiredPermission: 'reports:read',
    },
    {
      id: 'orders',
      label: t.nav.orders,
      icon: <ReceiptText className="h-5 w-5" />,
      shortcut: 'F3',
    },
    {
      id: 'inventory',
      label: t.nav.inventory,
      icon: <Boxes className="h-5 w-5" />,
      shortcut: 'F4',
      requiredPermission: 'inventory:read',
    },
    {
      id: 'shift',
      label: t.nav.shift,
      icon: <Banknote className="h-5 w-5" />,
      shortcut: 'F5',
    },
    {
      id: 'customers',
      label: t.nav.customers,
      icon: <Users className="h-5 w-5" />,
      shortcut: 'F6',
      requiredPermission: 'customers:read',
    },
    {
      id: 'audit',
      label: t.nav.audit,
      icon: <ShieldCheck className="h-5 w-5" />,
      shortcut: 'F7',
      requiredPermission: 'audit:read',
    },
    {
      id: 'settings',
      label: t.nav.settings,
      icon: <Settings className="h-5 w-5" />,
      shortcut: 'F8',
      requiredPermission: 'settings:manage',
    },
  ];

  const handleNav = (route: NavRoute) => {
    onNavigate(route);
    if (onCloseMobile) onCloseMobile();
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  return (
    <>
      <aside className="w-full h-full bg-card border-r border-border text-text flex flex-col justify-between">
        {/* ส่วนบน: โลโก้ และ รายการเมนู */}
        <div className="flex flex-col min-h-0">
          <div className="h-16 px-4 flex items-center border-b border-border shrink-0">
            <ProdxLogo variant="horizontal" size="sm" showTagline={true} />
          </div>
          <nav className="p-3 space-y-1.5 overflow-y-auto overflow-x-hidden min-h-0 flex-1 w-full max-w-full">
            {navItems.map((item) => {
              const hasAccess = !item.requiredPermission || can(item.requiredPermission);
              if (!hasAccess) return null;
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 min-h-[44px] rounded-xl text-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-primary text-white font-bold shadow-sm ring-1 ring-primary/20'
                      : 'text-text/70 hover:text-text hover:bg-background/80 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : 'text-text/50'}>
                      {item.icon}
                    </span>
                    <span className="font-semibold">{item.label}</span>
                  </div>
                  {item.shortcut && (
                    <kbd
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-white/20 text-white font-bold'
                          : 'bg-background border border-border text-text/50'
                      }`}
                    >
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ส่วนล่าง: Active Shift Card และ Action Dock */}
        <div className="p-3.5 border-t border-border space-y-2.5 shrink-0 bg-card">
          {/* การ์ด Active Shift จัดข้อความให้อ่านง่าย ชัดเจน */}
          <div
            onClick={() => handleNav('shift')}
            className="p-3 rounded-xl border border-border bg-background hover:border-primary/50 transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="text-text/70">
                {language === 'th' ? 'กะที่กำลังทำงาน' : 'Active Shift'}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  currentShift ? 'bg-emerald-500 animate-pulse' : 'bg-text/30'
                }`}
              />
            </div>
            {currentShift ? (
              <div>
                <div className="text-xs font-bold text-text leading-tight truncate">
                  {currentShift.registerId} · {currentShift.cashierName}
                </div>
                <div className="text-[11px] font-medium text-text/60 mt-0.5">
                  {t.shift.expectedInDrawer}:{' '}
                  <span className="font-mono font-bold text-text">
                    {formatMoney(currentShift.expectedCashInDrawer)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-600 dark:text-amber-500 font-bold flex items-center justify-between">
                <span>{t.shift.noActiveShift}</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* ปุ่มตั้งค่า และ ออกจากระบบ */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleNav('settings')}
              className="min-h-[44px] px-3 rounded-xl border border-border bg-background text-xs font-bold text-text hover:bg-background/80 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs"
            >
              <Settings className="h-4 w-4 text-text/60" />
              <span>{language === 'th' ? 'ตั้งค่า' : 'Settings'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="min-h-[44px] px-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>{language === 'th' ? 'ออกจากระบบ' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text/50 hover:text-text hover:bg-background transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="my-2 flex items-center justify-center">
              <div className="h-12 w-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/30">
                <LogOut className="h-6 w-6" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-text tracking-tight mt-3">
              {language === 'th' ? 'ต้องการออกจากระบบหรือไม่?' : 'Sign out of POS Terminal?'}
            </h3>
            <p className="text-xs text-text/60 mt-1.5 leading-relaxed font-normal">
              {language === 'th'
                ? `คุณกำลังออกจากระบบในนาม ${session?.currentUser.name || ''} (${session?.registerId || ''}) ระบบจะล็อกหน้าจอเพื่อความปลอดภัย`
                : `You are signed in as ${session?.currentUser.name || ''} on ${session?.registerId || ''}. Session will be safely closed.`}
            </p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="h-12 min-h-[48px] px-4 rounded-xl border border-border bg-card text-text/80 hover:bg-background text-xs font-semibold cursor-pointer transition-colors active:scale-95"
              >
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="h-12 min-h-[48px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer transition-colors active:scale-95"
              >
                {language === 'th' ? 'ยืนยันออกระบบ' : 'Confirm Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
