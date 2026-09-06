import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Building2,
  Palette,
  Printer,
  Receipt,
  ShieldCheck,
  Database,
  ChevronRight,
  Settings as SettingsIcon,
  Sparkles,
  Wifi,
  WifiOff,
  User,
  Sliders,
  Layers,
  Sun,
  Moon,
  Monitor,
  Keyboard,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { useToast } from '../../context/ToastContext';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

import {
  SettingsTabId,
  SettingsTabItem,
  StoreProfileFormState,
  TaxAccountingFormState,
  SecurityPoliciesState,
  CustomerDisplayConfigState,
} from './types';

import { GeneralSettingsTab } from './components/GeneralSettingsTab';
import { AppearanceSettingsTab } from './components/AppearanceSettingsTab';
import { HardwareSettingsTab } from './components/HardwareSettingsTab';
import { TaxAccountingSettingsTab } from './components/TaxAccountingSettingsTab';
import { SecurityRolesSettingsTab } from './components/SecurityRolesSettingsTab';
import { DataSyncSettingsTab } from './components/DataSyncSettingsTab';
import { StickyActionBar } from './components/StickyActionBar';
import { SettingsKeyboardShortcutsModal } from './components/SettingsKeyboardShortcutsModal';

const TAB_ITEMS: SettingsTabItem[] = [
  {
    id: 'general',
    label: { th: 'ข้อมูลสาขาและทั่วไป', en: 'General & Store' },
    sublabel: { th: 'โปรไฟล์ร้าน, ภาษา, สกุลเงินหลัก', en: 'Identity, language, base currency' },
    iconName: 'Building2',
  },
  {
    id: 'appearance',
    label: { th: 'รูปลักษณ์และการแสดงผล', en: 'Appearance & Display' },
    sublabel: { th: 'ธีมองค์กร, โลโก้, จอฝั่งลูกค้า CFD', en: 'Themes, branding, customer display' },
    iconName: 'Palette',
  },
  {
    id: 'hardware',
    label: { th: 'อุปกรณ์และฮาร์ดแวร์', en: 'Hardware & Peripherals' },
    sublabel: { th: 'เครื่องพิมพ์ใบเสร็จ, ลิ้นชัก, เสียง', en: 'Thermal printer, cash drawer, sound' },
    iconName: 'Printer',
  },
  {
    id: 'tax_accounting',
    label: { th: 'การเงินและภาษี', en: 'Tax & Accounting' },
    sublabel: { th: 'อัตรา VAT, ช่องทางชำระ, อัตราแลกเปลี่ยน', en: 'VAT basis points, payment rails' },
    iconName: 'Receipt',
  },
  {
    id: 'security_roles',
    label: { th: 'ความปลอดภัยและสิทธิ', en: 'Security & Roles' },
    sublabel: { th: 'รหัส PIN, พักหน้าจอ, การอนุมัติคำสั่ง', en: 'PIN codes, auto-lock, authorizations' },
    iconName: 'ShieldCheck',
  },
  {
    id: 'data_sync',
    label: { th: 'การซิงค์และสำรองข้อมูล', en: 'Offline & Data Sync' },
    sublabel: { th: 'คิว Outbox, แคช IndexedDB, รีเซ็ตระบบ', en: 'Outbox queue, local cache, diagnostics' },
    iconName: 'Database',
  },
];

export const SettingsScreen: React.FC = () => {
  const { language } = useLanguage();
  const { session, updateStoreProfile } = useAuth();
  const { isOnline, outbox } = useOffline();
  const { addToast } = useToast();
  const { theme, themeMode, setThemeMode } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => {
    const savedTargetTab = localStorage.getItem('prodx_pos_settings_tab') as SettingsTabId | null;
    if (savedTargetTab) {
      localStorage.removeItem('prodx_pos_settings_tab');
      return savedTargetTab;
    }
    return 'general';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  const isMac = typeof window !== 'undefined' && /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);

  // Swipe-to-navigate tabs support
  const tabIds = useMemo(() => TAB_ITEMS.map((t) => t.id), []);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = e.changedTouches[0].clientX - touchStartX;
    const diffY = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(diffX) > 70 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      const currentIndex = tabIds.indexOf(activeTab);
      if (diffX < 0 && currentIndex < tabIds.length - 1) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(30);
        }
        setActiveTab(tabIds[currentIndex + 1]);
      } else if (diffX > 0 && currentIndex > 0) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(30);
        }
        setActiveTab(tabIds[currentIndex - 1]);
      }
    }
  };

  // Tab refs for keyboard arrow navigation
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const handleOpenTab = (e: CustomEvent<{ tab: SettingsTabId }>) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('prodx:open-settings-tab' as any, handleOpenTab);
    return () => {
      window.removeEventListener('prodx:open-settings-tab' as any, handleOpenTab);
    };
  }, []);

  // 1. Store Profile Draft State
  const initialStoreState = useMemo<StoreProfileFormState>(() => {
    return {
      storeName: session?.currentStore.name || 'PRODX Flagship Store',
      storeCode: session?.currentStore.code || 'BKK-01',
      storeAddress: session?.currentStore.address || '999/9 Rama I Road, Pathumwan, Bangkok 10330',
      storePhone: session?.currentStore.phone || '02-123-4567',
      timezone: session?.currentStore.timezone || 'Asia/Bangkok',
      baseCurrency: session?.currentStore.currency || 'THB',
      taxId: localStorage.getItem('prodx_pos_tax_id') || '0105559012345',
      branchName: localStorage.getItem('prodx_pos_branch_name') || 'สาขาหลัก (Headquarters)',
      receiptHeaderMsg: localStorage.getItem('prodx_pos_receipt_header_msg') || 'ยินดีต้อนรับสู่ PRODX Store',
      receiptFooterMsg: localStorage.getItem('prodx_pos_receipt_footer_msg') || 'ขอบคุณที่ใช้บริการ / สินค้าซื้อแล้วไม่รับเปลี่ยนคืน',
    };
  }, [session?.currentStore]);

  const [storeForm, setStoreForm] = useState<StoreProfileFormState>(initialStoreState);

  // 2. Tax & Accounting Draft State
  const initialTaxState = useMemo<TaxAccountingFormState>(() => {
    const savedVat = localStorage.getItem('prodx_pos_tax_rate_bps');
    const savedType = localStorage.getItem('prodx_pos_tax_type') as 'inclusive' | 'exclusive';
    const savedCash = localStorage.getItem('prodx_pos_pay_cash');
    const savedCard = localStorage.getItem('prodx_pos_pay_card');
    const savedPromptPay = localStorage.getItem('prodx_pos_pay_promptpay');
    const savedSplit = localStorage.getItem('prodx_pos_pay_split');

    return {
      defaultTaxRateBps: savedVat ? Number(savedVat) : (session?.currentStore.defaultTaxRateBps ?? 700),
      taxCalculationType: savedType || 'inclusive',
      taxId: localStorage.getItem('prodx_pos_tax_id') || '0105559012345',
      posMachineId: localStorage.getItem('prodx_pos_pos_machine_id') || 'REG-BKK-001',
      enableCash: savedCash !== 'false',
      enableCard: savedCard !== 'false',
      enablePromptPay: savedPromptPay !== 'false',
      enableSplitPayment: savedSplit !== 'false',
    };
  }, [session?.currentStore]);

  const [taxForm, setTaxForm] = useState<TaxAccountingFormState>(initialTaxState);

  // 3. Customer Display (CFD) State
  const initialCfdState = useMemo<CustomerDisplayConfigState>(() => {
    const saved = localStorage.getItem('prodx_pos_cfd_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      enabled: true,
      welcomeMessage: 'ยินดีต้อนรับสู่ PRODX Store',
      subMessage: 'สัมผัสประสบการณ์ช้อปปิ้งพรีเมียมด้วยระบบอัตโนมัติ',
      bannerImageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80',
      autoSlideshow: true,
    };
  }, []);

  const [cfdConfig, setCfdConfig] = useState<CustomerDisplayConfigState>(initialCfdState);

  // 4. Security Policies State
  const initialSecurityState = useMemo<SecurityPoliciesState>(() => {
    const saved = localStorage.getItem('prodx_pos_security_policies');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      inactivityTimeoutMinutes: 5,
      requirePinForVoid: true,
      requirePinForDiscount: true,
      requirePinForDrawerKick: true,
      requirePinForPriceOverride: true,
      allowCashierRefund: false,
    };
  }, []);

  const [securityPolicies, setSecurityPolicies] = useState<SecurityPoliciesState>(initialSecurityState);

  // Sync back if session store profile changes externally
  useEffect(() => {
    setStoreForm(initialStoreState);
  }, [initialStoreState]);

  useEffect(() => {
    setTaxForm(initialTaxState);
  }, [initialTaxState]);

  // Dirty State Calculation
  const isStoreDirty = useMemo(() => {
    return JSON.stringify(storeForm) !== JSON.stringify(initialStoreState);
  }, [storeForm, initialStoreState]);

  const isTaxDirty = useMemo(() => {
    return JSON.stringify(taxForm) !== JSON.stringify(initialTaxState);
  }, [taxForm, initialTaxState]);

  const isCfdDirty = useMemo(() => {
    return JSON.stringify(cfdConfig) !== JSON.stringify(initialCfdState);
  }, [cfdConfig, initialCfdState]);

  const isSecurityDirty = useMemo(() => {
    return JSON.stringify(securityPolicies) !== JSON.stringify(initialSecurityState);
  }, [securityPolicies, initialSecurityState]);

  const isDirty = isStoreDirty || isTaxDirty || isCfdDirty || isSecurityDirty;

  const dirtyCount = useMemo(() => {
    let count = 0;
    if (isStoreDirty) count++;
    if (isTaxDirty) count++;
    if (isCfdDirty) count++;
    if (isSecurityDirty) count++;
    return count;
  }, [isStoreDirty, isTaxDirty, isCfdDirty, isSecurityDirty]);

  // Handlers
  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      // 1. Commit Store Profile to AuthContext & localStorage
      updateStoreProfile({
        name: storeForm.storeName,
        code: storeForm.storeCode,
        address: storeForm.storeAddress,
        phone: storeForm.storePhone,
        timezone: storeForm.timezone,
        currency: storeForm.baseCurrency,
        defaultTaxRateBps: taxForm.defaultTaxRateBps,
      });

      localStorage.setItem('prodx_pos_tax_id', storeForm.taxId);
      localStorage.setItem('prodx_pos_branch_name', storeForm.branchName);
      localStorage.setItem('prodx_pos_receipt_header_msg', storeForm.receiptHeaderMsg);
      localStorage.setItem('prodx_pos_receipt_footer_msg', storeForm.receiptFooterMsg);

      // 2. Commit Tax & Payment configs
      localStorage.setItem('prodx_pos_tax_rate_bps', String(taxForm.defaultTaxRateBps));
      localStorage.setItem('prodx_pos_tax_type', taxForm.taxCalculationType);
      localStorage.setItem('prodx_pos_pos_machine_id', taxForm.posMachineId);
      localStorage.setItem('prodx_pos_pay_cash', String(taxForm.enableCash));
      localStorage.setItem('prodx_pos_pay_card', String(taxForm.enableCard));
      localStorage.setItem('prodx_pos_pay_promptpay', String(taxForm.enablePromptPay));
      localStorage.setItem('prodx_pos_pay_split', String(taxForm.enableSplitPayment));

      // 3. Commit CFD config
      localStorage.setItem('prodx_pos_cfd_config', JSON.stringify(cfdConfig));

      // 4. Commit Security Policies
      localStorage.setItem('prodx_pos_security_policies', JSON.stringify(securityPolicies));

      // Simulated micro-delay for smooth tactile feedback
      await new Promise((resolve) => setTimeout(resolve, 350));

      addToast({
        title: language === 'th' ? 'บันทึกการตั้งค่าเรียบร้อย' : 'Settings Saved Successfully',
        message: language === 'th'
          ? 'ข้อมูลการตั้งค่าทั้งหมดถูกนำไปใช้ในระบบเรียบร้อยแล้ว'
          : 'All enterprise configuration parameters have been committed.',
        type: 'success',
      });
    } catch (e) {
      addToast({
        title: language === 'th' ? 'บันทึกการตั้งค่าล้มเหลว' : 'Save Error',
        message: String(e),
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    storeForm,
    taxForm,
    cfdConfig,
    securityPolicies,
    updateStoreProfile,
    addToast,
    language,
  ]);

  const handleDiscard = useCallback(() => {
    setStoreForm(initialStoreState);
    setTaxForm(initialTaxState);
    setCfdConfig(initialCfdState);
    setSecurityPolicies(initialSecurityState);
    addToast({
      title: language === 'th' ? 'ยกเลิกการแก้ไขแล้ว' : 'Changes Discarded',
      message: language === 'th' ? 'คืนค่าฟอร์มกลับเป็นข้อมูลเดิม' : 'Reverted all unsaved changes.',
      type: 'info',
    });
  }, [initialStoreState, initialTaxState, initialCfdState, initialSecurityState, addToast, language]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if shortcuts modal is open and key is not escape
      if (isShortcutsModalOpen && e.key !== 'Escape') {
        return;
      }

      // Check for Cmd+S or Ctrl+S
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isDirty && !isSaving) {
          handleSaveAll();
        } else if (!isDirty) {
          addToast({
            title: language === 'th' ? 'ไม่มีการเปลี่ยนแปลง' : 'No Changes',
            message: language === 'th' ? 'ไม่มีข้อมูลที่ต้องบันทึก' : 'All settings are up to date.',
            type: 'info',
          });
        }
        return;
      }

      // Check for Alt+1..6 for quick tab jump
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= TAB_ITEMS.length) {
          e.preventDefault();
          const targetTab = TAB_ITEMS[num - 1];
          setActiveTab(targetTab.id);
          tabButtonRefs.current[num - 1]?.focus();
          return;
        }

        // Alt+/ or Alt+? for Shortcuts
        if (e.key === '/' || e.key === '?') {
          e.preventDefault();
          setIsShortcutsModalOpen(true);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isDirty, isSaving, handleSaveAll, isShortcutsModalOpen, language, addToast]);

  // ARIA Tab navigation keydown handler
  const handleTabListKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        nextIndex = (index + 1) % TAB_ITEMS.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = (index - 1 + TAB_ITEMS.length) % TAB_ITEMS.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = TAB_ITEMS.length - 1;
        break;
      default:
        break;
    }

    if (nextIndex !== -1) {
      const nextTab = TAB_ITEMS[nextIndex];
      setActiveTab(nextTab.id);
      tabButtonRefs.current[nextIndex]?.focus();
    }
  };

  const currentTabDef = TAB_ITEMS.find((t) => t.id === activeTab) || TAB_ITEMS[0];

  const getTabIcon = (iconName: string) => {
    switch (iconName) {
      case 'Building2':
        return <Building2 className="h-4 w-4" />;
      case 'Palette':
        return <Palette className="h-4 w-4" />;
      case 'Printer':
        return <Printer className="h-4 w-4" />;
      case 'Receipt':
        return <Receipt className="h-4 w-4" />;
      case 'ShieldCheck':
        return <ShieldCheck className="h-4 w-4" />;
      case 'Database':
        return <Database className="h-4 w-4" />;
      default:
        return <SettingsIcon className="h-4 w-4" />;
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-background text-text no-scrollbar select-none"
    >
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 pb-4 sm:pb-6 border-b border-border/50">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs">
            <SettingsIcon className="h-5 w-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-text">
                {language === 'th' ? 'ศูนย์รวมการตั้งค่าระบบ (Unified Enterprise Settings Hub)' : 'Enterprise Settings Hub'}
              </h1>
              <Badge variant="primary" size="sm" className="font-mono text-[10px]">
                v2.4.0
              </Badge>
            </div>
            <p className="text-xs text-text/60 mt-0.5">
              {language === 'th'
                ? 'จัดการพารามิเตอร์สาขา อุปกรณ์ต่อพ่วง นโยบายความปลอดภัย และการซิงค์ข้อมูล'
                : 'Centralized terminal parameters, hardware peripherals, security governance, and sync.'}
            </p>
          </div>
        </div>

        {/* Status Badges & Theme Mode Switcher Toolbar */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-start md:justify-end text-xs">
          {/* Keyboard Shortcuts Trigger Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsShortcutsModalOpen(true)}
            className="h-7 px-2.5 rounded-lg border-border/80 bg-background/90 text-xs font-semibold hover:text-primary hover:border-primary/40 shadow-2xs"
            leftIcon={<Keyboard className="h-3.5 w-3.5 text-text/50" />}
            title={language === 'th' ? 'ดูคีย์ลัด (Alt+?)' : 'Keyboard Shortcuts (Alt+?)'}
          >
            <span className="hidden sm:inline">{language === 'th' ? 'คีย์ลัด' : 'Shortcuts'}</span>
            <kbd className="ml-1 px-1 py-0.2 text-[9px] font-mono bg-card border border-border rounded text-text/60">Alt+?</kbd>
          </Button>

          {/* Light / Dark / System Mode Switcher */}
          <div
            className="p-0.5 rounded-lg border border-border/80 bg-background/90 flex items-center gap-0.5 shadow-2xs"
            role="group"
            aria-label="Theme mode switcher"
          >
            <button
              type="button"
              onClick={() => {
                setThemeMode('light');
                addToast({
                  title: language === 'th' ? 'สลับโหมดสว่าง' : 'Light Mode Active',
                  message: language === 'th' ? 'เปลี่ยนการแสดงผลเป็นโหมดสว่าง (Light)' : 'Theme switched to Light mode.',
                  type: 'info',
                });
              }}
              title={language === 'th' ? 'โหมดสว่าง (Light)' : 'Light mode'}
              className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
                themeMode === 'light'
                  ? 'bg-card text-text border border-border/70 shadow-xs font-bold'
                  : 'text-text/60 hover:text-text hover:bg-card/40'
              }`}
            >
              <Sun className={`h-3.5 w-3.5 ${themeMode === 'light' ? 'text-amber-500' : 'text-text/50'}`} />
              <span className="hidden sm:inline text-[11px]">{language === 'th' ? 'สว่าง' : 'Light'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setThemeMode('dark');
                addToast({
                  title: language === 'th' ? 'สลับโหมดมืด' : 'Dark Mode Active',
                  message: language === 'th' ? 'เปลี่ยนการแสดงผลเป็นโหมดมืด (Dark)' : 'Theme switched to Dark mode.',
                  type: 'info',
                });
              }}
              title={language === 'th' ? 'โหมดมืด (Dark)' : 'Dark mode'}
              className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
                themeMode === 'dark'
                  ? 'bg-card text-text border border-border/70 shadow-xs font-bold'
                  : 'text-text/60 hover:text-text hover:bg-card/40'
              }`}
            >
              <Moon className={`h-3.5 w-3.5 ${themeMode === 'dark' ? 'text-primary' : 'text-text/50'}`} />
              <span className="hidden sm:inline text-[11px]">{language === 'th' ? 'มืด' : 'Dark'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setThemeMode('system');
                addToast({
                  title: language === 'th' ? 'สลับโหมดอัตโนมัติ (System)' : 'System Mode Active',
                  message: language === 'th'
                    ? 'ปรับเปลี่ยนโทนสีตามการตั้งค่าของระบบปฏิบัติการอัตโนมัติ'
                    : 'Theme automatically adapts to OS preferences.',
                  type: 'info',
                });
              }}
              title={language === 'th' ? 'ตามระบบอุปกรณ์ (System)' : 'Follow system OS theme'}
              className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
                themeMode === 'system'
                  ? 'bg-card text-text border border-border/70 shadow-xs font-bold'
                  : 'text-text/60 hover:text-text hover:bg-card/40'
              }`}
            >
              <Monitor className={`h-3.5 w-3.5 ${themeMode === 'system' ? 'text-primary' : 'text-text/50'}`} />
              <span className="hidden sm:inline text-[11px]">{language === 'th' ? 'ระบบ' : 'System'}</span>
            </button>
          </div>

          <div className="px-2.5 py-1 rounded-md border border-border/70 bg-background/80 flex items-center gap-1.5 text-text/70">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono font-bold text-text">{session?.currentStore.code}</span>
          </div>

          <div className="px-2.5 py-1 rounded-md border border-border/70 bg-background/80 flex items-center gap-1.5 text-text/70">
            <User className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-semibold text-text">{session?.currentUser.name}</span>
            <span className="text-[10px] uppercase font-bold text-text/50">({session?.currentUser.role})</span>
          </div>

          <div className="px-2.5 py-1 rounded-md border border-border/70 bg-background/80 flex items-center gap-1.5">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>ONLINE</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-500 font-bold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>OFFLINE ({outbox.length})</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] lg:grid-cols-[280px_1fr] gap-4 sm:gap-6 items-start">
        {/* Left Column: Navigation Sidebar */}
        <aside className="space-y-2 md:sticky md:top-4">
          <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-text/50">
            <span>{language === 'th' ? 'หมวดหมู่การตั้งค่า' : 'Categories'}</span>
            <span className="text-[10px] font-mono text-text/40 hidden md:inline">Alt+1..6</span>
          </div>

          {/* Mobile Dropdown Category Selector */}
          <div className="block md:hidden mb-2 bg-background/95 backdrop-blur-md pt-1 pb-2 z-20">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as SettingsTabId)}
              aria-label={language === 'th' ? 'เลือกหมวดหมู่การตั้งค่า' : 'Select settings category'}
              className="w-full h-12 px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-bold text-text shadow-xs focus:ring-2 focus:ring-primary focus:outline-hidden cursor-pointer"
            >
              {TAB_ITEMS.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label[language]}
                </option>
              ))}
            </select>
          </div>

          <nav
            role="tablist"
            aria-orientation="vertical"
            aria-label={language === 'th' ? 'หมวดหมู่การตั้งค่า' : 'Settings Categories'}
            className="hidden md:flex bg-card/70 border border-border/80 rounded-lg p-1.5 shadow-xs flex-col gap-1"
          >
            {TAB_ITEMS.map((tab, idx) => {
              const isActive = activeTab === tab.id;
              const hasDirtyOnThisTab =
                (tab.id === 'general' && isStoreDirty) ||
                (tab.id === 'appearance' && isCfdDirty) ||
                (tab.id === 'tax_accounting' && isTaxDirty) ||
                (tab.id === 'security_roles' && isSecurityDirty);

              return (
                <button
                  key={tab.id}
                  id={`settings-tab-${tab.id}`}
                  ref={(el) => {
                    tabButtonRefs.current[idx] = el;
                  }}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`settings-tabpanel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(e) => handleTabListKeyDown(e, idx)}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-[140px] md:min-w-0 w-full text-left p-2.5 sm:p-3 rounded-md transition-all duration-150 flex items-center justify-between gap-2 sm:gap-3 cursor-pointer shrink-0 select-none snap-start focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isActive
                      ? 'bg-primary text-white font-bold shadow-md shadow-primary/20 ring-1 ring-primary/40'
                      : 'text-text/70 hover:text-text hover:bg-background/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-md shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {getTabIcon(tab.iconName)}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="text-xs font-bold truncate">
                        {tab.label[language]}
                      </div>
                      <div
                        className={`text-[10px] truncate hidden md:block ${
                          isActive ? 'text-white/80' : 'text-text/40'
                        }`}
                      >
                        {tab.sublabel[language]}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasDirtyOnThisTab && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isActive ? 'bg-amber-300 ring-2 ring-white/40' : 'bg-primary animate-pulse'
                        }`}
                        title="Unsaved changes in this tab"
                      />
                    )}
                    <span
                      className={`text-[9px] font-mono px-1 rounded hidden lg:inline-block ${
                        isActive ? 'bg-white/20 text-white' : 'text-text/40 bg-background/80'
                      }`}
                    >
                      Alt+{idx + 1}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Column: Active Workspace Panel */}
        <main
          role="tabpanel"
          id={`settings-tabpanel-${activeTab}`}
          aria-labelledby={`settings-tab-${activeTab}`}
          tabIndex={0}
          className="space-y-4 min-w-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-lg"
        >
          {/* Breadcrumbs Navigation */}
          <div className="flex items-center justify-between text-xs text-text/60 px-1">
            <div className="flex items-center gap-2">
              <span className="hover:text-text cursor-default">
                {language === 'th' ? 'การตั้งค่าระบบ' : 'Settings'}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-text/40" />
              <span className="font-bold text-primary">
                {currentTabDef.label[language]}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-text/40 font-mono">
              <span>{isMac ? '⌘S' : 'Ctrl+S'} = Save</span>
              <span>•</span>
              <span>Esc = Discard</span>
            </div>
          </div>

          {/* Active Tab Component Render */}
          <div>
            {activeTab === 'general' && (
              <GeneralSettingsTab
                formData={storeForm}
                onChangeField={(field, val) =>
                  setStoreForm((prev) => ({ ...prev, [field]: val }))
                }
              />
            )}

            {activeTab === 'appearance' && (
              <AppearanceSettingsTab
                cfdConfig={cfdConfig}
                onChangeCfdField={(field, val) =>
                  setCfdConfig((prev) => ({ ...prev, [field]: val }))
                }
              />
            )}

            {activeTab === 'hardware' && <HardwareSettingsTab />}

            {activeTab === 'tax_accounting' && (
              <TaxAccountingSettingsTab
                formData={taxForm}
                onChangeField={(field, val) =>
                  setTaxForm((prev) => ({ ...prev, [field]: val }))
                }
              />
            )}

            {activeTab === 'security_roles' && (
              <SecurityRolesSettingsTab
                policies={securityPolicies}
                onChangePolicy={(field, val) =>
                  setSecurityPolicies((prev) => ({ ...prev, [field]: val }))
                }
              />
            )}

            {activeTab === 'data_sync' && <DataSyncSettingsTab />}
          </div>
        </main>
      </div>

      {/* Floating Sticky Action Bar for Dirty States */}
      <StickyActionBar
        isVisible={isDirty}
        isSaving={isSaving}
        onSave={handleSaveAll}
        onDiscard={handleDiscard}
        dirtyCount={dirtyCount}
        label={
          language === 'th'
            ? 'มีการปรับแต่งค่าในระบบที่ยังไม่ได้บันทึก'
            : 'You have uncommitted setting modifications.'
        }
      />

      {/* Keyboard Shortcuts Reference Modal */}
      {isShortcutsModalOpen && (
        <SettingsKeyboardShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
        />
      )}
    </div>
  );
};

