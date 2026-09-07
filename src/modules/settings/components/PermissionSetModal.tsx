/**
 * PRODX POS - Custom Permission Set Create/Edit/Clone Modal
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Copy,
  Save,
  CheckCircle2,
  Lock,
  Layers,
  ShoppingCart,
  Receipt,
  Users,
  BarChart3,
  Settings,
  Info,
} from 'lucide-react';
import { Role, Permission, PERMISSION_DEFINITIONS, PermissionMeta } from '../../../domain/auth';
import {
  CustomPermissionSet,
  PermissionRiskLevel,
  calculateSetRisk,
  getPermissionRisk,
  HIGH_RISK_PERMISSIONS,
  PERMISSION_SET_TEMPLATES,
} from '../../../domain/permissionSets';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { getZIndexClass } from '../../../utils/ZIndexManager';

export interface PermissionSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: Omit<CustomPermissionSet, 'id' | 'createdAt' | 'updatedAt'>,
    applyToRoleImmediately: boolean
  ) => void;
  editingSet?: CustomPermissionSet | null;
  mode: 'create' | 'edit' | 'clone';
}

export const PermissionSetModal: React.FC<PermissionSetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingSet,
  mode,
}) => {
  const { language } = useLanguage();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [nameTh, setNameTh] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionTh, setDescriptionTh] = useState('');
  const [targetRole, setTargetRole] = useState<Role>('cashier');
  const [badgeColor, setBadgeColor] = useState<CustomPermissionSet['badgeColor']>('emerald');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [applyImmediately, setApplyImmediately] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && editingSet) {
      setName(editingSet.name);
      setNameTh(editingSet.nameTh || '');
      setCode(editingSet.code);
      setDescription(editingSet.description);
      setDescriptionTh(editingSet.descriptionTh || '');
      setTargetRole(editingSet.targetRole);
      setBadgeColor(editingSet.badgeColor);
      setPermissions([...editingSet.permissions]);
      setApplyImmediately(false);
      setSelectedTemplateId('');
    } else if (mode === 'clone' && editingSet) {
      setName(`${editingSet.name} (Copy)`);
      setNameTh(editingSet.nameTh ? `${editingSet.nameTh} (คัดลอก)` : '');
      setCode(`${editingSet.code}-COPY`);
      setDescription(editingSet.description);
      setDescriptionTh(editingSet.descriptionTh || '');
      setTargetRole(editingSet.targetRole);
      setBadgeColor(editingSet.badgeColor);
      setPermissions([...editingSet.permissions]);
      setApplyImmediately(false);
      setSelectedTemplateId('');
    } else {
      // New from blank or default template
      setName('');
      setNameTh('');
      setCode(`PSET-CUSTOM-${Math.floor(100 + Math.random() * 900)}`);
      setDescription('');
      setDescriptionTh('');
      setTargetRole('cashier');
      setBadgeColor('emerald');
      setPermissions(['pos:checkout', 'shift:open', 'shift:close', 'customers:read']);
      setApplyImmediately(false);
      setSelectedTemplateId('');
    }
  }, [isOpen, mode, editingSet]);

  if (!isOpen) return null;

  const handleApplyTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = PERMISSION_SET_TEMPLATES.find((t) => t.id === tmplId);
    if (!tmpl) return;

    setName(tmpl.name);
    setNameTh(tmpl.nameTh);
    setCode(tmpl.code);
    setDescription(tmpl.description);
    setDescriptionTh(tmpl.descriptionTh);
    setTargetRole(tmpl.targetRole);
    setBadgeColor(tmpl.badgeColor);
    setPermissions([...tmpl.permissions]);

    addToast({
      title: language === 'th' ? 'โหลดเทมเพลตสำเร็จ' : 'Template Loaded',
      message: language === 'th' ? `นำเข้าสิทธิ์จาก "${tmpl.nameTh}" เรียบร้อยแล้ว` : `Loaded permissions from ${tmpl.name}.`,
      type: 'info',
    });
  };

  const handleTogglePermission = (permId: Permission) => {
    setPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleToggleCategory = (category: string, allInCat: Permission[]) => {
    const areAllSelected = allInCat.every((p) => permissions.includes(p));
    if (areAllSelected) {
      // Uncheck all in this category
      setPermissions((prev) => prev.filter((p) => !allInCat.includes(p)));
    } else {
      // Check all in this category
      const merged = new Set([...permissions, ...allInCat]);
      setPermissions(Array.from(merged));
    }
  };

  const handleSelectAll = () => {
    setPermissions(PERMISSION_DEFINITIONS.map((p) => p.id));
  };

  const handleClearAll = () => {
    setPermissions([]);
  };

  const computedRisk: PermissionRiskLevel = calculateSetRisk(permissions);

  const categories = [
    {
      id: 'pos',
      titleTh: 'จุดขายและแคชเชียร์ (POS)',
      titleEn: 'Cash Register & Checkout',
      icon: ShoppingCart,
      perms: PERMISSION_DEFINITIONS.filter((p) => p.category === 'pos'),
    },
    {
      id: 'shift',
      titleTh: 'ลิ้นชักและการเงิน (Shift Float)',
      titleEn: 'Cash Drawer & Shift',
      icon: Receipt,
      perms: PERMISSION_DEFINITIONS.filter((p) => p.category === 'shift'),
    },
    {
      id: 'inventory',
      titleTh: 'คลังสินค้าและสต็อก (Inventory)',
      titleEn: 'Catalog & Stock Ledger',
      icon: Layers,
      perms: PERMISSION_DEFINITIONS.filter((p) => p.category === 'inventory'),
    },
    {
      id: 'customers',
      titleTh: 'ลูกค้าสัมพันธ์ (Customers CRM)',
      titleEn: 'Customer Profiles & Loyalty',
      icon: Users,
      perms: PERMISSION_DEFINITIONS.filter((p) => p.category === 'customers'),
    },
    {
      id: 'reports',
      titleTh: 'รายงานและการตรวจสอบ (Analytics)',
      titleEn: 'Financial Reports & Audit',
      icon: BarChart3,
      perms: PERMISSION_DEFINITIONS.filter((p) => p.category === 'reports'),
    },
    {
      id: 'settings',
      titleTh: 'ตั้งค่าระบบและความปลอดภัย (Settings)',
      titleEn: 'Master Settings & Security',
      icon: Settings,
      perms: PERMISSION_DEFINITIONS.filter((p) => p.category === 'settings'),
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast({
        title: language === 'th' ? 'กรุณากรอกชื่อชุดสิทธิ์' : 'Name Required',
        message: language === 'th' ? 'ต้องระบุชื่อของชุดสิทธิ์การใช้งาน' : 'Please provide a permission set name.',
        type: 'error',
      });
      return;
    }

    onSave(
      {
        name: name.trim(),
        nameTh: nameTh.trim() || undefined,
        code: code.trim() || `PSET-${Date.now()}`,
        description: description.trim() || 'Custom role permission profile',
        descriptionTh: descriptionTh.trim() || undefined,
        targetRole,
        badgeColor,
        permissions,
        isSystem: false,
        assignedStaffIds: editingSet?.assignedStaffIds || [],
      },
      applyImmediately
    );
  };

  const getRiskBadge = (risk: PermissionRiskLevel) => {
    switch (risk) {
      case 'critical':
        return <Badge variant="danger" size="sm" className="font-bold text-[10px]">CRITICAL RISK</Badge>;
      case 'high':
        return <Badge variant="warning" size="sm" className="font-bold text-[10px]">HIGH RISK</Badge>;
      case 'medium':
        return <Badge variant="neutral" size="sm" className="font-bold text-[10px]">MEDIUM RISK</Badge>;
      default:
        return <Badge variant="success" size="sm" className="font-bold text-[10px]">LOW RISK</Badge>;
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 ${getZIndexClass('modal')} flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto`}
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-card rounded-2xl border border-border border-crisp shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text">
                {mode === 'create'
                  ? language === 'th'
                    ? 'สร้างชุดสิทธิ์การใช้งานใหม่ (New Permission Set)'
                    : 'Create Custom Permission Set'
                  : mode === 'clone'
                  ? language === 'th'
                    ? 'คัดลอกชุดสิทธิ์ (Clone Permission Set)'
                    : 'Clone Permission Set'
                  : language === 'th'
                  ? 'แก้ไขชุดสิทธิ์การใช้งาน (Edit Permission Set)'
                  : 'Edit Permission Set'}
              </h2>
              <p className="text-xs text-text/50">
                {language === 'th'
                  ? 'กำหนดสิทธิ์ละเอียดตามบทบาทพนักงาน สำหรับควบคุมการเข้าถึงระบบ POS'
                  : 'Define granular permissions and authorities for employee roles in PRODX POS.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text/50 hover:text-text hover:bg-background transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="permission-set-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Presets / Templates (for create / clone) */}
          {mode !== 'edit' && (
            <div className="p-4 rounded-xl border border-border/80 bg-background/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  {language === 'th' ? 'เลือกเริ่มต้นจากเทมเพลตมาตรฐาน (Quick Presets)' : 'Start from Template Preset'}
                </span>
                <span className="text-[11px] text-text/50">
                  {language === 'th' ? 'คลิกเพื่อโหลดค่าแนะนำอัตโนมัติ' : 'One-click load default permissions'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {PERMISSION_SET_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedTemplateId === tmpl.id
                        ? 'border-primary bg-primary/10 text-primary shadow-xs'
                        : 'border-border bg-card text-text/80 hover:bg-background'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">
                      {language === 'th' ? tmpl.nameTh : tmpl.name}
                    </div>
                    <div className="text-[10px] text-text/50 mt-0.5 line-clamp-1">
                      {tmpl.permissions.length} {language === 'th' ? 'สิทธิ์' : 'perms'} • {tmpl.targetRole}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Profile Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-text">
                {language === 'th' ? 'ชื่อชุดสิทธิ์ (Name - English)' : 'Permission Set Name (EN)'} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Senior Cashier & Returns"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-medium text-text focus:ring-2 focus:ring-primary focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-text">
                {language === 'th' ? 'ชื่อภาษาไทย (Name - Thai)' : 'Permission Set Name (TH)'}
              </label>
              <input
                type="text"
                value={nameTh}
                onChange={(e) => setNameTh(e.target.value)}
                placeholder="เช่น แคชเชียร์อาวุโสและงานรับคืน"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-medium text-text focus:ring-2 focus:ring-primary focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-text">
                {language === 'th' ? 'รหัสอ้างอิง (Set Code)' : 'Set Code ID'} *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="PSET-CSH-02"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono font-bold text-text uppercase focus:ring-2 focus:ring-primary focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-text">
                {language === 'th' ? 'ตำแหน่งเป้าหมาย (Target Role)' : 'Target Role'} *
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as Role)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-bold text-text focus:ring-2 focus:ring-primary focus:outline-hidden cursor-pointer"
              >
                <option value="cashier">Cashier (แคชเชียร์)</option>
                <option value="manager">Manager (ผู้จัดการ)</option>
                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-text">
                {language === 'th' ? 'สีป้ายประจำชุดสิทธิ์' : 'Badge Color'}
              </label>
              <select
                value={badgeColor}
                onChange={(e) => setBadgeColor(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-bold text-text focus:ring-2 focus:ring-primary focus:outline-hidden cursor-pointer"
              >
                <option value="emerald">Emerald (เขียว - แคชเชียร์)</option>
                <option value="cyan">Cyan (ฟ้า - อาวุโส)</option>
                <option value="amber">Amber (ส้ม - ผู้จัดการ)</option>
                <option value="purple">Purple (ม่วง - สต็อก)</option>
                <option value="primary">Indigo / Primary (น้ำเงิน)</option>
                <option value="rose">Rose (แดง)</option>
                <option value="slate">Slate (เทา - ฝึกงาน)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-text">
                {language === 'th' ? 'ระดับความเสี่ยงที่ประเมิน' : 'Risk Assessment'}
              </label>
              <div className="h-[38px] flex items-center px-3 rounded-lg border border-border bg-background/50">
                {getRiskBadge(computedRisk)}
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
              <label className="block text-xs font-bold text-text">
                {language === 'th' ? 'คำอธิบายชุดสิทธิ์ (Description)' : 'Set Description'}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Authorized to handle product returns, line voids, and customer discounts"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-medium text-text focus:ring-2 focus:ring-primary focus:outline-hidden"
              />
            </div>
          </div>

          {/* Granular Permission Checklist Header */}
          <div className="pt-2 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
              <div>
                <h3 className="text-sm font-bold text-text flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>
                    {language === 'th'
                      ? 'กำหนดสิทธิ์การเข้าถึงแบบละเอียด (Granular Permissions Selection)'
                      : 'Granular Permissions Selection'}
                  </span>
                </h3>
                <p className="text-xs text-text/50">
                  {language === 'th'
                    ? `เลือกเปิดใช้งาน ${permissions.length} จากทั้งหมด ${PERMISSION_DEFINITIONS.length} สิทธิ์`
                    : `${permissions.length} of ${PERMISSION_DEFINITIONS.length} permissions granted.`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="rounded-lg text-xs"
                >
                  {language === 'th' ? 'เลือกทั้งหมด (Select All)' : 'Select All'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="rounded-lg text-xs"
                >
                  {language === 'th' ? 'ล้างทั้งหมด (Clear)' : 'Clear All'}
                </Button>
              </div>
            </div>

            {/* Permissions by Category */}
            <div className="space-y-4">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const catPermIds = cat.perms.map((p) => p.id);
                const selectedCount = catPermIds.filter((p) => permissions.includes(p)).length;
                const isAllSelected = selectedCount === catPermIds.length && catPermIds.length > 0;

                return (
                  <div
                    key={cat.id}
                    className="p-4 rounded-xl border border-border border-crisp bg-background/40 space-y-3"
                  >
                    {/* Category Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-card border border-border text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-text">
                            {language === 'th' ? cat.titleTh : cat.titleEn}
                          </h4>
                          <span className="text-[10px] text-text/50 font-mono">
                            {selectedCount} / {catPermIds.length} {language === 'th' ? 'สิทธิ์' : 'granted'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleCategory(cat.id, catPermIds)}
                        className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        {isAllSelected
                          ? language === 'th'
                            ? 'ยกเลิกทั้งหมวด'
                            : 'Deselect Category'
                          : language === 'th'
                          ? 'เลือกทั้งหมวด'
                          : 'Select Category'}
                      </button>
                    </div>

                    {/* Permissions list in category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {cat.perms.map((p) => {
                        const isChecked = permissions.includes(p.id);
                        const riskInfo = HIGH_RISK_PERMISSIONS[p.id];
                        const isHighRisk = riskInfo?.risk === 'high' || riskInfo?.risk === 'critical';

                        return (
                          <label
                            key={p.id}
                            className={`p-3 rounded-lg border text-left flex items-start gap-3 transition-all cursor-pointer ${
                              isChecked
                                ? 'border-primary/50 bg-primary/5 shadow-2xs'
                                : 'border-border bg-card hover:bg-background/80'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(p.id)}
                              className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-bold text-text">
                                  {language === 'th' ? p.nameTh : p.nameEn}
                                </span>
                                {isHighRisk && (
                                  <Badge
                                    variant={riskInfo.risk === 'critical' ? 'danger' : 'warning'}
                                    size="sm"
                                    className="text-[9px] uppercase font-bold shrink-0"
                                  >
                                    {riskInfo.risk}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-text/50 mt-0.5 leading-snug">
                                {language === 'th' ? p.descTh : p.descEn}
                              </p>
                              {isHighRisk && (
                                <p className="text-[10px] text-rose-500/80 dark:text-rose-400/80 mt-1 flex items-center gap-1 font-mono">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>{language === 'th' ? riskInfo.warningTh : riskInfo.warningEn}</span>
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Apply Checkbox */}
          <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3">
            <input
              type="checkbox"
              id="apply-immediately"
              checked={applyImmediately}
              onChange={(e) => setApplyImmediately(e.target.checked)}
              className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer"
            />
            <label htmlFor="apply-immediately" className="text-xs text-text cursor-pointer select-none">
              <strong className="text-primary font-bold">
                {language === 'th'
                  ? `นำชุดสิทธิ์นี้ไปใช้กับตำแหน่ง ${targetRole.toUpperCase()} ทันที`
                  : `Apply this permission set as the active configuration for ${targetRole.toUpperCase()} role now`}
              </strong>
              <span className="block text-[11px] text-text/60 mt-0.5">
                {language === 'th'
                  ? 'พนักงานทุกคนในตำแหน่งนี้จะได้รับสิทธิ์ใหม่ทันทีโดยไม่ต้องตั้งค่าทีละคน'
                  : 'All active staff with this role will inherit these permissions immediately.'}
              </span>
            </label>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card/90">
          <div className="text-xs text-text/50">
            {language === 'th'
              ? `เลือกแล้ว ${permissions.length} สิทธิ์ (${computedRisk.toUpperCase()} RISK)`
              : `${permissions.length} permissions configured (${computedRisk.toUpperCase()} RISK)`}
          </div>
          <div className="flex items-center gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-lg text-xs">
              {language === 'th' ? 'ยกเลิก (Cancel)' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              form="permission-set-form"
              variant="primary"
              size="sm"
              className="rounded-lg font-bold text-xs"
              leftIcon={<Save className="h-3.5 w-3.5" />}
            >
              {language === 'th' ? 'บันทึกชุดสิทธิ์ (Save Set)' : 'Save Permission Set'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
