import React, { useState } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Sparkles,
  Check,
  Tv,
  Monitor,
  ExternalLink,
  Upload,
  Trash2,
  Image as ImageIcon,
  Sliders,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme, THEME_PRESETS } from '../../../context/ThemeContext';
import { useToast } from '../../../context/ToastContext';
import { CustomerDisplayConfigState } from '../types';
import { CustomerDisplayLauncherModal } from '../../../components/customerDisplay/CustomerDisplayLauncherModal';

export interface AppearanceSettingsTabProps {
  cfdConfig: CustomerDisplayConfigState;
  onChangeCfdField: <K extends keyof CustomerDisplayConfigState>(
    field: K,
    value: CustomerDisplayConfigState[K]
  ) => void;
}

export const AppearanceSettingsTab: React.FC<AppearanceSettingsTabProps> = ({
  cfdConfig,
  onChangeCfdField,
}) => {
  const { language } = useLanguage();
  const {
    theme,
    themeMode,
    setThemeMode,
    toggleTheme,
    activePresetId,
    setPreset,
    customAccentColor,
    setCustomAccentColor,
    customLogo,
    setCustomLogo,
  } = useTheme();
  const { addToast } = useToast();

  const isDarkMode = theme === 'dark';
  const currentPreset = THEME_PRESETS.find((p) => p.id === activePresetId) || THEME_PRESETS[0];

  const [isCfdModalOpen, setIsCfdModalOpen] = useState(false);

  const handleLaunchDualMonitor = () => {
    const url = `${window.location.origin}${window.location.pathname}?view=customer-display`;
    const newWindow = window.open(
      url,
      'ProdxCustomerDisplay',
      'width=1080,height=720,menubar=no,toolbar=no,location=no,status=no'
    );

    if (newWindow) {
      addToast({
        title: language === 'th' ? 'เปิดจอฝั่งลูกค้าสำเร็จ' : 'Customer Display Opened',
        message:
          language === 'th'
            ? 'ลากหน้าต่างนี้ไปยังจอมอนิเตอร์ที่ 2 แล้วกด F11 ขยายเต็มจอ'
            : 'Move the window to your 2nd screen and press F11 for fullscreen mode.',
        type: 'success',
      });
    } else {
      addToast({
        title: language === 'th' ? 'บราวเซอร์บล็อกป็อปอัป' : 'Popup Blocked',
        message:
          language === 'th'
            ? 'โปรดอนุญาต Pop-up บนเบราว์เซอร์เพื่อเปิดหน้าต่างจอฝั่งลูกค้า'
            : 'Please allow popups in your browser to launch dual display.',
        type: 'warning',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Theme Presets & Dark Mode Card */}
      <Card className="border border-border/80 shadow-sm rounded-lg overflow-hidden">
        <CardHeader className="bg-card/50 border-b border-border/60 py-3.5 px-5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
              <Palette className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-text truncate">
                {language === 'th' ? 'ธีมและโหมดสีระบบ (Theme & Visual Styles)' : 'Theme & Visual Styles'}
              </h3>
              <p className="text-[11px] text-text/50 truncate">
                {language === 'th'
                  ? 'เลือกพรีเซ็ตธีมองค์กร สลับโหมดกลางวัน/กลางคืน และกำหนดโทนสีหลัก'
                  : 'Enterprise design tokens, light/dark mode switching, and accent personalization.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
                className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer select-none ${
                  themeMode === 'light'
                    ? 'bg-card text-text border border-border/70 shadow-xs font-bold'
                    : 'text-text/60 hover:text-text hover:bg-card/40'
                }`}
              >
                <Sun className={`h-3.5 w-3.5 ${themeMode === 'light' ? 'text-amber-500' : 'text-text/50'}`} />
                <span className="text-[11px]">{language === 'th' ? 'สว่าง' : 'Light'}</span>
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
                className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer select-none ${
                  themeMode === 'dark'
                    ? 'bg-card text-text border border-border/70 shadow-xs font-bold'
                    : 'text-text/60 hover:text-text hover:bg-card/40'
                }`}
              >
                <Moon className={`h-3.5 w-3.5 ${themeMode === 'dark' ? 'text-primary' : 'text-text/50'}`} />
                <span className="text-[11px]">{language === 'th' ? 'มืด' : 'Dark'}</span>
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
                className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer select-none ${
                  themeMode === 'system'
                    ? 'bg-card text-text border border-border/70 shadow-xs font-bold'
                    : 'text-text/60 hover:text-text hover:bg-card/40'
                }`}
              >
                <Monitor className={`h-3.5 w-3.5 ${themeMode === 'system' ? 'text-primary' : 'text-text/50'}`} />
                <span className="text-[11px]">{language === 'th' ? 'ระบบ' : 'System'}</span>
              </button>
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-5 space-y-6">
          {/* Preset Swatches Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
                {language === 'th' ? 'ชุดรูปแบบสำเร็จรูป (Enterprise Theme Presets)' : 'Theme Presets'}
              </label>
              <span className="text-[11px] text-text/50 font-mono">
                Active: {currentPreset.name[language]}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
              {THEME_PRESETS.map((preset) => {
                const isSelected = currentPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setPreset(preset.id);
                      addToast({
                        title: language === 'th' ? 'เปลี่ยนธีมแล้ว' : 'Theme Activated',
                        message: `Switched to ${preset.name[language]}`,
                        type: 'success',
                      });
                    }}
                    className={`p-3 rounded-lg border text-left transition-all duration-150 flex flex-col justify-between gap-2.5 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 shadow-xs bg-card'
                        : 'border-border bg-card/60 hover:bg-card hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full shadow-xs border border-white/20"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <div
                          className="w-3.5 h-3.5 rounded-full shadow-xs border border-white/20"
                          style={{ backgroundColor: preset.background }}
                        />
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary stroke-[3px]" />}
                    </div>

                    <div>
                      <div className="text-xs font-bold text-text truncate">
                        {preset.name[language]}
                      </div>
                      <div className="text-[10px] text-text/50 font-mono">
                        {preset.isDark ? 'Dark Base' : 'Light Base'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color Customization */}
          <div className="pt-4 border-t border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
                  {language === 'th' ? 'สีเน้นหลักระบบ (Primary Accent Override)' : 'Primary Accent Color'}
                </label>
                <span className="text-[11px] text-text/50">
                  {language === 'th' ? 'ปรับแต่งสีปุ่ม สัญลักษณ์ และสถานะแอคทีฟทั่วทั้งแอป' : 'Custom accent color for buttons, badges, and focus rings.'}
                </span>
              </div>
              {customAccentColor && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomAccentColor(null);
                    addToast({
                      title: language === 'th' ? 'คืนค่าสีหลัก' : 'Accent Reset',
                      message: language === 'th' ? 'กลับไปใช้สีมาตรฐานของธีมปัจจุบัน' : 'Reverted to theme default accent.',
                      type: 'info',
                    });
                  }}
                  className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                >
                  {language === 'th' ? 'รีเซ็ตกลับเป็นค่าเริ่มต้น' : 'Reset to Default'}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Dynamic Color Input */}
              <div className="relative w-10 h-9 rounded-md border border-border overflow-hidden cursor-pointer shrink-0 shadow-xs">
                <input
                  type="color"
                  value={customAccentColor || currentPreset.primary}
                  onChange={(e) => setCustomAccentColor(e.target.value)}
                  className="absolute inset-0 w-full h-full scale-150 cursor-pointer border-0 p-0"
                />
              </div>

              {/* Fast Presets Swatches */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { hex: '#3B82F6', name: 'Electric Blue' },
                  { hex: '#4F46E5', name: 'Deep Indigo' },
                  { hex: '#06B6D4', name: 'Cyber Cyan' },
                  { hex: '#10B981', name: 'Emerald' },
                  { hex: '#F97316', name: 'Amber Glow' },
                  { hex: '#EC4899', name: 'Neon Rose' },
                  { hex: '#8B5CF6', name: 'Purple Ray' },
                ].map((presetColor) => (
                  <button
                    key={presetColor.hex}
                    type="button"
                    onClick={() => {
                      setCustomAccentColor(presetColor.hex);
                      addToast({
                        title: language === 'th' ? 'กำหนดสีเน้นแล้ว' : 'Accent Color Selected',
                        message: `${presetColor.name} (${presetColor.hex})`,
                        type: 'success',
                      });
                    }}
                    className={`w-7 h-7 rounded-full border relative flex items-center justify-center transition-all ${
                      customAccentColor === presetColor.hex
                        ? 'ring-2 ring-offset-2 ring-primary border-transparent scale-110 shadow-sm'
                        : 'border-border/60 hover:scale-105'
                    }`}
                    style={{ backgroundColor: presetColor.hex }}
                    title={presetColor.name}
                  >
                    {customAccentColor === presetColor.hex && (
                      <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Store Logo Branding */}
          <div className="pt-4 border-t border-border/60 space-y-3">
            <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
              {language === 'th' ? 'ภาพโลโก้แบรนด์ร้านค้า (Custom Store Logo)' : 'Store Brand Logo'}
            </label>

            <div className="flex items-center gap-4 p-4 rounded-lg border border-border/70 bg-card/60">
              <div className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center bg-background overflow-hidden shrink-0 shadow-xs">
                {customLogo ? (
                  <img
                    src={customLogo}
                    alt="Custom Store Logo"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <div className="text-[10px] text-text/40 text-center font-bold px-1">
                    PRODX
                  </div>
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="text-xs font-bold text-text">
                  {customLogo
                    ? (language === 'th' ? 'ใช้งานโลโก้กำหนดเอง' : 'Custom Brand Logo Active')
                    : (language === 'th' ? 'ใช้งานโลโก้มาตรฐาน PRODX POS' : 'Default PRODX POS Logo Active')}
                </div>
                <div className="text-[11px] text-text/50">
                  {language === 'th'
                    ? 'รองรับไฟล์ PNG, JPG, SVG (แนะนำพื้นหลังโปร่งใส อัตราส่วน 1:1 หรือ 4:1)'
                    : 'Supported formats: PNG, JPG, SVG. Recommended transparent background.'}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <label className="inline-flex items-center justify-center h-7 px-3 rounded-md bg-primary hover:bg-primary/90 text-white font-bold text-xs cursor-pointer transition shadow-xs gap-1.5">
                    <Upload className="h-3 w-3" />
                    <span>{language === 'th' ? 'อัปโหลดโลโก้ใหม่' : 'Upload Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            setCustomLogo(result);
                            addToast({
                              title: language === 'th' ? 'อัปโหลดโลโก้สำเร็จ' : 'Custom Logo Saved',
                              message: language === 'th'
                                ? 'โลโก้ถูกนำไปใช้ในส่วนหัวของแอปและใบเสร็จแล้ว'
                                : 'Brand logo updated across POS and thermal receipts.',
                              type: 'success',
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  {customLogo && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setCustomLogo(null);
                        addToast({
                          title: language === 'th' ? 'ลบโลโก้ร้านค้าแล้ว' : 'Logo Removed',
                          message: language === 'th' ? 'คืนค่าไปใช้โลโก้มาตรฐาน' : 'Reverted to default logo.',
                          type: 'info',
                        });
                      }}
                      className="h-7 text-xs rounded-md"
                      leftIcon={<Trash2 className="h-3 w-3" />}
                    >
                      {language === 'th' ? 'ลบภาพ' : 'Remove'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Factory Reset Branding */}
          <div className="pt-4 border-t border-border/60">
            <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/20 bg-red-500/5">
              <div>
                <h4 className="text-xs font-bold text-red-600 dark:text-red-400">
                  {language === 'th' ? 'คืนค่าเริ่มต้นโรงงาน (Reset to Defaults)' : 'Reset to Factory Defaults'}
                </h4>
                <p className="text-[11px] text-red-600/70 dark:text-red-400/70 mt-0.5">
                  {language === 'th' ? 'ล้างการตั้งค่าธีม สี และโลโก้ที่ปรับแต่งทั้งหมด' : 'Clears all custom branding, accent colors, and resets to default theme.'}
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="shrink-0 font-bold"
                onClick={() => {
                  setThemeMode('system');
                  setPreset('enterprise_blue');
                  setCustomAccentColor(null);
                  setCustomLogo(null);
                  addToast({
                    title: language === 'th' ? 'คืนค่าเริ่มต้นสำเร็จ' : 'Factory Reset Complete',
                    message: language === 'th' ? 'การตั้งค่ารูปลักษณ์ถูกล้างและกลับเป็นค่าเดิมแล้ว' : 'All appearance settings have been restored to default.',
                    type: 'success',
                  });
                }}
              >
                {language === 'th' ? 'คืนค่าเริ่มต้นเป็นค่าโรงงาน' : 'Reset to Factory Defaults'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Customer-Facing Display (CFD) Settings Card */}
      <Card className="border border-border/80 shadow-sm rounded-lg overflow-hidden">
        <CardHeader className="bg-card/50 border-b border-border/60 py-3.5 px-5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
              <Tv className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-text truncate">
                {language === 'th' ? 'หน้าจอฝั่งลูกค้า (Customer-Facing Display - CFD)' : 'Customer-Facing Display (CFD)'}
              </h3>
              <p className="text-[11px] text-text/50 truncate">
                {language === 'th'
                  ? 'กำหนดค่าสำหรับจอมอนิเตอร์ที่ 2 แสดงรายการสแกน ยอดชำระ และ QR พร้อมเพย์'
                  : 'Secondary customer monitor configuration with real-time BroadcastChannel sync.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleLaunchDualMonitor}
              className="rounded-md font-bold text-xs"
              leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              {language === 'th' ? 'เปิดหน้าต่างจอ 2 (Dual Screen)' : 'Launch 2nd Screen'}
            </Button>
          </div>
        </CardHeader>

        <CardBody className="p-5 space-y-5">
          {/* CFD Enable Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/80 bg-card/60">
            <div>
              <div className="font-bold text-text text-xs">
                {language === 'th' ? 'เปิดใช้งานระบบส่งข้อมูลไปยังจอฝั่งลูกค้า (Enable CFD Sync)' : 'Enable Dual-Screen CFD Sync'}
              </div>
              <div className="text-[11px] text-text/50 mt-0.5">
                {language === 'th'
                  ? 'กระจายสถานะตะกร้าสินค้าแบบเรียลไทม์ผ่าน BroadcastChannel ไปยังทุกแท็บหรือหน้าต่าง CFD'
                  : 'Continuously publishes cart lines, totals, discounts, and payment QR states to client displays.'}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={cfdConfig.enabled}
              aria-label={language === 'th' ? 'เปิดใช้งานระบบส่งข้อมูลไปยังจอฝั่งลูกค้า' : 'Enable Dual-Screen CFD Sync'}
              onClick={() => {
                const next = !cfdConfig.enabled;
                onChangeCfdField('enabled', next);
                addToast({
                  title: language === 'th' ? 'อัปเดตระบบ CFD แล้ว' : 'CFD Preference Updated',
                  message: next
                    ? (language === 'th' ? 'เปิดใช้งานจอแสดงผลฝั่งลูกค้า' : 'Customer Display enabled')
                    : (language === 'th' ? 'ปิดใช้งานจอแสดงผลฝั่งลูกค้า' : 'Customer Display disabled'),
                  type: 'info',
                });
              }}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  const next = !cfdConfig.enabled;
                  onChangeCfdField('enabled', next);
                }
              }}
              className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                cfdConfig.enabled ? 'bg-primary' : 'bg-border dark:bg-background'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  cfdConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* CFD Messages & Screensaver Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
                {language === 'th' ? 'ข้อความต้อนรับตอนพักหน้าจอ (Welcome Headline)' : 'Idle Welcome Headline'}
              </label>
              <input
                type="text"
                value={cfdConfig.welcomeMessage}
                onChange={(e) => onChangeCfdField('welcomeMessage', e.target.value)}
                placeholder="e.g. ยินดีต้อนรับสู่ PRODX Store"
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
                {language === 'th' ? 'คำโปรยรอง (Secondary Slogan)' : 'Secondary Slogan'}
              </label>
              <input
                type="text"
                value={cfdConfig.subMessage}
                onChange={(e) => onChangeCfdField('subMessage', e.target.value)}
                placeholder="e.g. คุณภาพระดับพรีเมียม บริการด้วยใจ"
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
          </div>

          {/* Banner Image URL for Screensaver */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
              {language === 'th' ? 'URL รูปภาพโปรโมชันสไลด์พักหน้าจอ (Screensaver Promo Banner)' : 'Screensaver Promo Banner Image URL'}
            </label>
            <input
              type="url"
              value={cfdConfig.bannerImageUrl}
              onChange={(e) => onChangeCfdField('bannerImageUrl', e.target.value)}
              placeholder="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80"
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs font-mono text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />
            <p className="text-[10px] text-text/50">
              {language === 'th'
                ? 'รูปภาพนี้จะแสดงบนจอฝั่งลูกค้าขณะไม่มีการสแกนสินค้าเพื่อโปรโมตแคมเปญ'
                : 'Displayed on customer screen when idle to advertise special promotions.'}
            </p>
          </div>
        </CardBody>
      </Card>

      {isCfdModalOpen && (
        <CustomerDisplayLauncherModal
          isOpen={isCfdModalOpen}
          onClose={() => setIsCfdModalOpen(false)}
        />
      )}
    </div>
  );
};
