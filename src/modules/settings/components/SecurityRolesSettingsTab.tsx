import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  UserCheck,
  KeyRound,
  Clock,
  AlertTriangle,
  Fingerprint,
  UserCheck2,
  FileX,
  BadgePercent,
  CheckCircle,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { SecurityPoliciesState } from '../types';
import { PinChangeModal } from './PinChangeModal';

export interface SecurityRolesSettingsTabProps {
  policies: SecurityPoliciesState;
  onChangePolicy: <K extends keyof SecurityPoliciesState>(
    field: K,
    value: SecurityPoliciesState[K]
  ) => void;
}

export const SecurityRolesSettingsTab: React.FC<SecurityRolesSettingsTabProps> = ({
  policies,
  onChangePolicy,
}) => {
  const { language } = useLanguage();
  const { session, inactivityTimeoutMinutes, setInactivityTimeoutMinutes, lockSystem } = useAuth();
  const { addToast } = useToast();

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  if (!session) return null;

  return (
    <div className="space-y-6">
      {/* Current User Identity & Quick PIN Card */}
      <Card className="border border-border/80 shadow-sm rounded-lg overflow-hidden">
        <CardHeader className="bg-card/50 border-b border-border/60 py-3.5 px-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                {language === 'th' ? 'ข้อมูลผู้ใช้งานและรหัสผ่าน PIN (Active User & Security Credentials)' : 'Active User & Credentials'}
              </h3>
              <p className="text-[11px] text-text/50">
                {language === 'th'
                  ? 'ข้อมูลประจำตัว สิทธิการเข้าถึงระบบ และรหัสผ่านด่วน PIN สำหรับปลดล็อก'
                  : 'Active staff member profile, role authority, and quick authentication PIN.'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsPinModalOpen(true)}
            className="rounded-md font-bold text-xs"
            leftIcon={<KeyRound className="h-3.5 w-3.5" />}
          >
            {language === 'th' ? 'เปลี่ยนรหัส PIN' : 'Change PIN'}
          </Button>
        </CardHeader>

        <CardBody className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border border-border/80 bg-card/60">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                {session.currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-text">{session.currentUser.name}</h4>
                  <Badge variant="primary" size="sm" className="font-mono uppercase">
                    {session.currentUser.role}
                  </Badge>
                </div>
                <div className="text-xs text-text/60 mt-0.5 flex items-center gap-3">
                  <span>Code: <strong className="text-text font-mono">{session.currentUser.employeeCode || session.currentUser.id}</strong></span>
                  <span>•</span>
                  <span>Store: <strong className="text-text font-mono">{session.currentStore.code}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  lockSystem();
                  addToast({
                    title: language === 'th' ? 'ล็อกระบบทันทีแล้ว' : 'Terminal Locked',
                    message: language === 'th' ? 'ใส่รหัส PIN เพื่อปลดล็อกหน้าจอ' : 'Enter your PIN to resume.',
                    type: 'info',
                  });
                }}
                className="rounded-md font-bold text-xs"
                leftIcon={<Lock className="h-3.5 w-3.5 text-amber-500" />}
              >
                {language === 'th' ? 'ล็อกหน้าจอทันที (Lock Now)' : 'Lock Screen Now'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Inactivity Auto-Lock Policy Card */}
      <Card className="border border-border/80 shadow-sm rounded-lg overflow-hidden">
        <CardHeader className="bg-card/50 border-b border-border/60 py-3.5 px-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                {language === 'th' ? 'การพักหน้าจออัตโนมัติ (Inactivity Auto-Lock Timeout)' : 'Inactivity Auto-Lock Timeout'}
              </h3>
              <p className="text-[11px] text-text/50">
                {language === 'th'
                  ? 'ล็อกหน้าจอ POS อัตโนมัติเมื่อไม่มีการใช้งานตามเวลาที่กำหนดเพื่อความปลอดภัย'
                  : 'Automatically locks cash register and prompts for PIN after a period of idle inactivity.'}
              </p>
            </div>
          </div>
          <Badge variant={inactivityTimeoutMinutes === 0 ? 'warning' : 'success'} size="sm">
            {inactivityTimeoutMinutes === 0
              ? (language === 'th' ? 'ปิดการล็อก' : 'Disabled')
              : `${inactivityTimeoutMinutes} ${language === 'th' ? 'นาที' : 'Min'}`}
          </Badge>
        </CardHeader>

        <CardBody className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { mins: 0, labelTh: 'ไม่ล็อก (ปิด)', labelEn: 'Disabled' },
              { mins: 1, labelTh: '1 นาที', labelEn: '1 Min' },
              { mins: 3, labelTh: '3 นาที', labelEn: '3 Min' },
              { mins: 5, labelTh: '5 นาที (แนะนำ)', labelEn: '5 Min (Default)' },
              { mins: 15, labelTh: '15 นาที', labelEn: '15 Min' },
              { mins: 30, labelTh: '30 นาที', labelEn: '30 Min' },
            ].map((item) => {
              const isSelected = inactivityTimeoutMinutes === item.mins;
              return (
                <button
                  key={item.mins}
                  type="button"
                  onClick={() => {
                    setInactivityTimeoutMinutes(item.mins);
                    onChangePolicy('inactivityTimeoutMinutes', item.mins);
                    addToast({
                      title: language === 'th' ? 'ตั้งเวลาพักหน้าจอแล้ว' : 'Auto-Lock Timeout Updated',
                      message: item.mins === 0
                        ? (language === 'th' ? 'ปิดการพักหน้าจออัตโนมัติ' : 'Auto-lock disabled')
                        : `Auto-lock set to ${item.mins} minutes.`,
                      type: 'success',
                    });
                  }}
                  className={`p-3 rounded-lg border text-center cursor-pointer transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border bg-card text-text/80 hover:bg-background'
                  }`}
                >
                  <div className="text-xs font-bold font-mono">
                    {item.mins === 0 ? 'OFF' : `${item.mins}m`}
                  </div>
                  <div className="text-[10px] text-text/50 truncate mt-0.5">
                    {language === 'th' ? item.labelTh : item.labelEn}
                  </div>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Security Governance & Supervisor Authorizations Card */}
      <Card className="border border-border/80 shadow-sm rounded-lg overflow-hidden">
        <CardHeader className="bg-card/50 border-b border-border/60 py-3.5 px-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                {language === 'th' ? 'นโยบายการอนุมัติระดับผู้จัดการ (Supervisor Authorization Governance)' : 'Supervisor Authorization Governance'}
              </h3>
              <p className="text-[11px] text-text/50">
                {language === 'th'
                  ? 'กำหนดคำสั่งที่จำเป็นต้องให้ผู้จัดการสาขายืนยันรหัส PIN ก่อนดำเนินการ'
                  : 'Enforce high-privilege operations to require supervisor PIN approval.'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-5 space-y-3">
          <div className="space-y-3">
            {/* Require PIN for Void */}
            <div className="p-3.5 rounded-lg border border-border/80 bg-card/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-text flex items-center gap-2">
                  <FileX className="h-4 w-4 text-rose-500" />
                  <span>{language === 'th' ? 'บังคับใส่ PIN ผู้จัดการเมื่อยกเลิกบิล (Require PIN for Order Void)' : 'Require Manager PIN for Order Void'}</span>
                </div>
                <div className="text-[11px] text-text/50 mt-0.5 pl-6">
                  {language === 'th'
                    ? 'ป้องกันการยกเลิกบิลหรือล้างรายการสินค้าโดยพลการ'
                    : 'Restricts voiding paid orders or held bills to authorized supervisors.'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={policies.requirePinForVoid}
                aria-label={language === 'th' ? 'บังคับใส่ PIN ผู้จัดการเมื่อยกเลิกบิล' : 'Require Manager PIN for Order Void'}
                onClick={() => onChangePolicy('requirePinForVoid', !policies.requirePinForVoid)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onChangePolicy('requirePinForVoid', !policies.requirePinForVoid);
                  }
                }}
                className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  policies.requirePinForVoid ? 'bg-primary' : 'bg-border dark:bg-background'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    policies.requirePinForVoid ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Require PIN for High Discounts */}
            <div className="p-3.5 rounded-lg border border-border/80 bg-card/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-text flex items-center gap-2">
                  <BadgePercent className="h-4 w-4 text-amber-500" />
                  <span>{language === 'th' ? 'บังคับใส่ PIN เมื่อให้ส่วนลดพิเศษเกิน 15% (Require PIN for Discount > 15%)' : 'Require Manager PIN for Custom Discounts > 15%'}</span>
                </div>
                <div className="text-[11px] text-text/50 mt-0.5 pl-6">
                  {language === 'th'
                    ? 'ป้องกันการให้ส่วนลดกำหนดเองที่เกินอัตรามาตรฐานสาขา'
                    : 'Requires supervisor authorization for discretionary discount entries over 15%.'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={policies.requirePinForDiscount}
                aria-label={language === 'th' ? 'บังคับใส่ PIN เมื่อให้ส่วนลดพิเศษเกิน 15%' : 'Require Manager PIN for Custom Discounts > 15%'}
                onClick={() => onChangePolicy('requirePinForDiscount', !policies.requirePinForDiscount)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onChangePolicy('requirePinForDiscount', !policies.requirePinForDiscount);
                  }
                }}
                className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  policies.requirePinForDiscount ? 'bg-primary' : 'bg-border dark:bg-background'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    policies.requirePinForDiscount ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Require PIN for Emergency Drawer Kick */}
            <div className="p-3.5 rounded-lg border border-border/80 bg-card/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-text flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <span>{language === 'th' ? 'บังคับใส่ PIN เมื่อสั่งเปิดลิ้นชักฉุกเฉิน (Require PIN for Manual Drawer Open)' : 'Require Manager PIN for Emergency Drawer Open'}</span>
                </div>
                <div className="text-[11px] text-text/50 mt-0.5 pl-6">
                  {language === 'th'
                    ? 'การเปิดลิ้นชักโดยไม่มีรายการขาย (No-Sale Drawer Kick) ต้องบันทึกประวัติการใส่ PIN'
                    : 'Logs no-sale drawer opens with supervisor security credentials.'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={policies.requirePinForDrawerKick}
                aria-label={language === 'th' ? 'บังคับใส่ PIN เมื่อสั่งเปิดลิ้นชักฉุกเฉิน' : 'Require Manager PIN for Emergency Drawer Open'}
                onClick={() => onChangePolicy('requirePinForDrawerKick', !policies.requirePinForDrawerKick)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onChangePolicy('requirePinForDrawerKick', !policies.requirePinForDrawerKick);
                  }
                }}
                className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  policies.requirePinForDrawerKick ? 'bg-primary' : 'bg-border dark:bg-background'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    policies.requirePinForDrawerKick ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Require PIN for Price Override */}
            <div className="p-3.5 rounded-lg border border-border/80 bg-card/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-text flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span>{language === 'th' ? 'บังคับใส่ PIN เมื่อแก้ไขราคาสินค้าหน้าร้าน (Price Override)' : 'Require Manager PIN for Price Override'}</span>
                </div>
                <div className="text-[11px] text-text/50 mt-0.5 pl-6">
                  {language === 'th'
                    ? 'การปรับเปลี่ยนราคาต่อหน่วยระหว่างการคิดเงินต้องได้รับอนุมัติ'
                    : 'Requires supervisor override to alter unit price on active cart items.'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={policies.requirePinForPriceOverride}
                aria-label={language === 'th' ? 'บังคับใส่ PIN เมื่อแก้ไขราคาสินค้าหน้าร้าน' : 'Require Manager PIN for Price Override'}
                onClick={() => onChangePolicy('requirePinForPriceOverride', !policies.requirePinForPriceOverride)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onChangePolicy('requirePinForPriceOverride', !policies.requirePinForPriceOverride);
                  }
                }}
                className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  policies.requirePinForPriceOverride ? 'bg-primary' : 'bg-border dark:bg-background'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    policies.requirePinForPriceOverride ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Change PIN Modal */}
      {isPinModalOpen && (
        <PinChangeModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
        />
      )}
    </div>
  );
};
