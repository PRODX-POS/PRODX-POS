import React, { useRef } from 'react';
import { useTheme, THEME_PRESETS } from '../../context/ThemeContext';
import { Palette, Check, Image as ImageIcon, Trash2, Upload, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const ThemePicker: React.FC = () => {
  const {
    activePresetId,
    setPreset,
    customAccentColor,
    setCustomAccentColor,
    customLogo,
    setCustomLogo,
  } = useTheme();
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetAccent = () => {
    setCustomAccentColor(null);
  };

  const handleResetLogo = () => {
    setCustomLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const SWATCHES = [
    '#3B82F6', // Blue
    '#FF6A00', // Sunset Orange
    '#10B981', // Emerald
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#D4AF37', // Gold
    '#EF4444', // Red
    '#06B6D4', // Cyan
  ];

  return (
    <div className="space-y-6">
      {/* Preset Themes List */}
      <div className="p-5 rounded-2xl border border-border border-crisp bg-card shadow-2xs">
        <div className="flex items-center justify-between mb-4 border-b border-border border-crisp pb-3">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-sm font-black text-text">
                {language === 'th' ? 'โมเดิร์นดีไซน์ & พรีเซตธีมระบบ' : 'Design Theme & Presets'}
              </h3>
              <p className="text-[11px] text-text/60 mt-0.5">
                {language === 'th' 
                  ? 'เปลี่ยนรูปแบบ สีสัน และดีไซน์ระบบทั้งหมดได้ง่ายๆ เพียง 1 คลิก' 
                  : 'Instantly transform your POS layout, colors, and styling with 1-click presets.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {THEME_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id && !customAccentColor;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setPreset(preset.id);
                  handleResetAccent(); // reset custom override when preset is selected
                }}
                className={`group relative p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer overflow-hidden ${
                  isActive
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-2xs ring-1 ring-primary'
                    : 'border-border border-crisp bg-background/50/80 dark:bg-white/5 hover:border-border dark:hover:border-white/20 hover:scale-[1.02]'
                }`}
              >
                {/* Preset Mini Canvas Preview */}
                <div className="flex gap-1.5 mb-2.5">
                  <div 
                    className="w-5 h-5 rounded-full border border-border dark:border-white/10 shadow-2xs flex items-center justify-center shrink-0" 
                    style={{ backgroundColor: preset.primary }}
                  >
                    {isActive && <Check className="h-3 w-3 text-white dark:text-text/70 stroke-[3]" />}
                  </div>
                  <div className="flex-1 flex gap-1 h-5 rounded-lg overflow-hidden border border-border border-crisp p-0.5" style={{ backgroundColor: preset.background }}>
                    <div className="w-1/2 h-full rounded-xs shadow-2xs" style={{ backgroundColor: preset.card }} />
                    <div className="w-1/2 h-full rounded-xs" style={{ backgroundColor: preset.primary }} />
                  </div>
                </div>

                {/* Title & Badge */}
                <div className="space-y-0.5">
                  <span className="block text-xs font-extrabold text-text truncate">
                    {language === 'th' ? preset.name.th.split(' (')[0] : preset.name.en}
                  </span>
                  <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-200/60 dark:bg-white/5 text-text/60 capitalize">
                    {preset.isDark ? (language === 'th' ? 'ดาร์กธีม' : 'Dark Mode') : (language === 'th' ? 'ไลท์ธีม' : 'Light Mode')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Accent Color & Logo Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Custom Accent Color Override */}
        <div className="p-5 rounded-2xl border border-border border-crisp bg-card shadow-2xs space-y-4">
          <div>
            <h4 className="text-xs font-extrabold text-text uppercase tracking-wider">
              {language === 'th' ? 'ปรับแต่งโทนสีระบบ (Custom Accent Color)' : 'Custom Accent Color Override'}
            </h4>
            <p className="text-[11px] text-text/60 mt-1">
              {language === 'th'
                ? 'เลือกสีโปรดที่เหมาะกับแบรนด์ร้านค้าของคุณ สีจะเปลี่ยนทั่วอินเตอร์เฟซและแสดงบนใบเสร็จรับเงิน'
                : 'Select a custom color signature matching your brand. Applied live across menus, buttons, and receipt designs.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setCustomAccentColor(color)}
                className="w-8 h-8 rounded-full border border-border border-crisp shadow-sm relative transition-all active:scale-95 cursor-pointer hover:scale-110 flex items-center justify-center shrink-0"
                style={{ backgroundColor: color }}
              >
                {customAccentColor === color && (
                  <Check className="h-4 w-4 text-white stroke-[3.5]" />
                )}
              </button>
            ))}

            {/* Custom Color Input */}
            <div className="flex items-center gap-2 border border-border border-crisp rounded-xl p-1.5 bg-background/50/80 dark:bg-white/5 shrink-0">
              <input
                type="color"
                value={customAccentColor || '#2563EB'}
                onChange={(e) => setCustomAccentColor(e.target.value)}
                className="w-6 h-6 rounded-lg border-0 cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
              />
              <span className="text-[11px] font-mono font-bold text-text/70 pr-1 select-all uppercase">
                {customAccentColor || 'Default'}
              </span>
            </div>

            {/* Reset Accent */}
            {customAccentColor && (
              <button
                type="button"
                onClick={handleResetAccent}
                className="p-1.5 rounded-lg text-text/60 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                title={language === 'th' ? 'รีเซ็ตเป็นสีธีมมาตรฐาน' : 'Reset to Preset Accent'}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Custom Logo Upload */}
        <div className="p-5 rounded-2xl border border-border border-crisp bg-card shadow-2xs space-y-4">
          <div>
            <h4 className="text-xs font-extrabold text-text uppercase tracking-wider">
              {language === 'th' ? 'โลโก้แบรนด์ร้านค้า (Store Logo Branding)' : 'Store Logo Branding'}
            </h4>
            <p className="text-[11px] text-text/60 mt-1">
              {language === 'th'
                ? 'อัปโหลดภาพโลโก้ของร้านค้า ไฟล์นี้จะจัดเก็บในหน่วยความจำเบราว์เซอร์ และพิมพ์บนใบเสร็จอย่างสวยงาม'
                : 'Upload your store branding logo. This is stored offline in the browser cache and custom styled on print templates.'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Logo Preview */}
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-border border-crisp bg-background/50/80 dark:bg-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {customLogo ? (
                <img
                  src={customLogo}
                  alt="Custom Store Logo"
                  className="w-full h-full object-contain p-1"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-text/60 dark:text-white/10" />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{language === 'th' ? 'อัปโหลดภาพ' : 'Upload Image'}</span>
                </button>

                {customLogo && (
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 hover:bg-rose-100 transition active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{language === 'th' ? 'ลบภาพ' : 'Remove'}</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <span className="text-[10px] text-text/40">
                {language === 'th' ? 'แนะนำสัดส่วน 1:1, รองรับไฟล์ JPG, PNG (สูงสุด 1MB)' : '1:1 ratio recommended. Supports JPG, PNG up to 1MB.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
