import React from 'react';
import { Store, Globe, MapPin, Phone, Clock, FileText, Check, DollarSign, Building2 } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { SUPPORTED_CURRENCIES, CurrencyService } from '../../../services/currency/currencyService';
import { StoreProfileFormState } from '../types';

export interface GeneralSettingsTabProps {
  formData: StoreProfileFormState;
  onChangeField: <K extends keyof StoreProfileFormState>(field: K, value: StoreProfileFormState[K]) => void;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  formData,
  onChangeField,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { session, switchCurrency } = useAuth();
  const { addToast } = useToast();

  if (!session) return null;

  return (
    <div className="space-y-6">
      {/* Store Identity & Profile Card */}
      <Card className="border border-border/80 shadow-sm rounded-lg overflow-hidden">
        <CardHeader className="bg-card/50 border-b border-border/60 py-3.5 px-5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-text truncate">
                {language === 'th' ? 'ข้อมูลสาขาและโปรไฟล์ร้านค้า (Store Profile & Identity)' : 'Store Profile & Identity'}
              </h3>
              <p className="text-[11px] text-text/50 truncate">
                {language === 'th' ? 'ข้อมูลที่แสดงในเอกสารขาย หัวใบเสร็จ และระบบบัญชี' : 'Business identity printed on thermal receipts and export documents.'}
              </p>
            </div>
          </div>
          <Badge variant="primary" size="sm" className="font-mono shrink-0">
            {formData.storeCode || session.currentStore.code}
          </Badge>
        </CardHeader>

        <CardBody className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Store Name */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
                {language === 'th' ? 'ชื่อร้านค้า / แบรนด์ (Store Name)' : 'Store Name'} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => onChangeField('storeName', e.target.value)}
                  placeholder="e.g. PRODX Flagship CentralWorld"
                  className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  required
                />
              </div>
            </div>

            {/* Store Code */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
                {language === 'th' ? 'รหัสสาขา (Store / Branch Code)' : 'Store / Branch Code'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.storeCode}
                onChange={(e) => onChangeField('storeCode', e.target.value)}
                placeholder="e.g. BKK-01"
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs font-mono font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                required
              />
            </div>

            {/* Branch Name / Sub-label */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
                {language === 'th' ? 'ชื่อสาขาย่อย (Branch Name)' : 'Branch Name'}
              </label>
              <input
                type="text"
                value={formData.branchName}
                onChange={(e) => onChangeField('branchName', e.target.value)}
                placeholder="e.g. สาขาเซ็นทรัลเวิลด์ ชั้น 4"
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
                {language === 'th' ? 'เบอร์โทรศัพท์สาขา (Phone)' : 'Contact Phone'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.storePhone}
                  onChange={(e) => onChangeField('storePhone', e.target.value)}
                  placeholder="e.g. 02-123-4567, 089-999-8888"
                  className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
            </div>
          </div>

          {/* Store Address for Receipts */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
              {language === 'th' ? 'ที่อยู่สาขาสำหรับพิมพ์หัวใบเสร็จ (Receipt Header Address)' : 'Store Address (Printed on Receipts)'}
            </label>
            <textarea
              rows={2}
              value={formData.storeAddress}
              onChange={(e) => onChangeField('storeAddress', e.target.value)}
              placeholder="e.g. 999/9 ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ 10330"
              className="w-full p-2.5 rounded-md border border-border bg-background text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-none"
            />
          </div>

          {/* Receipt Custom Messages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
                {language === 'th' ? 'ข้อความต้อนรับหัวบิล (Header Note)' : 'Header Welcome Note'}
              </label>
              <input
                type="text"
                value={formData.receiptHeaderMsg}
                onChange={(e) => onChangeField('receiptHeaderMsg', e.target.value)}
                placeholder="e.g. ยินดีต้อนรับสู่ PRODX Flagship"
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
                {language === 'th' ? 'ข้อความขอบคุณท้ายบิล (Footer Note)' : 'Footer Thank You Note'}
              </label>
              <input
                type="text"
                value={formData.receiptFooterMsg}
                onChange={(e) => onChangeField('receiptFooterMsg', e.target.value)}
                placeholder="e.g. ขอบคุณที่ใช้บริการ / สินค้าซื้อแล้วไม่รับเปลี่ยนคืน"
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Regional & Localization Settings Card */}
      <Card className="border border-border/80 shadow-sm rounded-lg overflow-hidden">
        <CardHeader className="bg-card/50 border-b border-border/60 py-3.5 px-5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
              <Globe className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-text truncate">
                {language === 'th' ? 'การตั้งค่าระดับภูมิภาคและภาษา (Regional & Localization)' : 'Regional & Localization'}
              </h3>
              <p className="text-[11px] text-text/50 truncate">
                {language === 'th' ? 'กำหนดภาษาหน้าจอ โซนเวลา และสกุลเงินมาตรฐานของระบบ' : 'Interface language, time zone alignment, and standard monetary base.'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-5 space-y-5">
          {/* Language Selector */}
          <div className="space-y-2.5">
            <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
              {language === 'th' ? 'ภาษาของระบบ (System Interface Language)' : 'System Language'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <button
                type="button"
                onClick={() => {
                  setLanguage('th');
                  addToast({
                    title: 'เปลี่ยนภาษาเป็น ภาษาไทย',
                    message: 'ระบบได้สลับการแสดงผลเป็นภาษาไทยเรียบร้อยแล้ว',
                    type: 'info',
                  });
                }}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  language === 'th'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-border bg-card text-text hover:bg-background'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🇹🇭</span>
                  <div className="text-left">
                    <div className="text-xs font-semibold">ภาษาไทย (TH)</div>
                    <div className="text-[10px] text-text/50">Thai Localization</div>
                  </div>
                </div>
                {language === 'th' && <Check className="h-4 w-4 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLanguage('en');
                  addToast({
                    title: 'Language set to English',
                    message: 'System display language has been switched to English.',
                    type: 'info',
                  });
                }}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  language === 'en'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-border bg-card text-text hover:bg-background'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🇺🇸</span>
                  <div className="text-left">
                    <div className="text-xs font-semibold">English (EN)</div>
                    <div className="text-[10px] text-text/50">Global Standard</div>
                  </div>
                </div>
                {language === 'en' && <Check className="h-4 w-4 text-primary" />}
              </button>
            </div>
          </div>

          {/* Timezone and Date Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/60">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>{language === 'th' ? 'เขตเวลาสาขา (Timezone)' : 'Store Timezone'}</span>
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => onChangeField('timezone', e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              >
                <option value="Asia/Bangkok">Asia/Bangkok (UTC+07:00 Indochina Time)</option>
                <option value="Asia/Singapore">Asia/Singapore (UTC+08:00 Singapore Standard Time)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (UTC+09:00 Japan Standard Time)</option>
                <option value="Asia/Hong_Kong">Asia/Hong_Kong (UTC+08:00 HKT)</option>
                <option value="Europe/London">Europe/London (UTC+00:00 GMT/BST)</option>
                <option value="America/New_York">America/New_York (UTC-05:00 EST)</option>
                <option value="Australia/Sydney">Australia/Sydney (UTC+10:00 AEST)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
                {language === 'th' ? 'รูปแบบวันที่ (Date Format)' : 'Date Format'}
              </label>
              <select
                defaultValue="DD/MM/YYYY"
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 24/10/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
                <option value="D MMM YYYY">D MMM YYYY (e.g. 24 Oct 2026)</option>
              </select>
            </div>
          </div>

          {/* Base Currency Selection */}
          <div className="space-y-3 pt-3 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-[11px] font-bold text-text/80 uppercase tracking-wide">
                  {language === 'th' ? 'สกุลเงินหลักประจำเครื่อง (Base Currency)' : 'Store Base Currency'}
                </label>
                <span className="text-[11px] text-text/50">
                  {language === 'th' ? 'สกุลเงินที่ใช้ลงบัญชีและคำนวณราคาสินค้าในแคตตาล็อก' : 'All catalog prices and shift drawer balances are tracked in this currency.'}
                </span>
              </div>
              <Badge variant="success" size="sm" className="font-mono">
                {session.currentStore.currency || 'THB'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {SUPPORTED_CURRENCIES.map((cur) => {
                const isActive = (session.currentStore.currency || 'THB') === cur.code;
                return (
                  <button
                    key={cur.code}
                    type="button"
                    onClick={() => {
                      switchCurrency(cur.code);
                      CurrencyService.setBaseCurrency(cur.code);
                      onChangeField('baseCurrency', cur.code);
                      addToast({
                        title: language === 'th' ? 'สลับสกุลเงินหลักสำเร็จ' : 'Base Currency Updated',
                        message: language === 'th'
                          ? `ระบบอัปเดตสกุลเงินหลักเป็น ${cur.code} (${cur.symbol}) แล้ว`
                          : `Successfully set system base currency to ${cur.code} (${cur.symbol}).`,
                        type: 'success',
                      });
                    }}
                    className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                        : 'border-border bg-card text-text hover:bg-background'
                    }`}
                  >
                    <span className="text-xl">{cur.flag}</span>
                    <span className="text-xs font-bold">{cur.code} ({cur.symbol})</span>
                    <span className="text-[10px] text-text/50">{cur.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
