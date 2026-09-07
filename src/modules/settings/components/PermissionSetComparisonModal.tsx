/**
 * PRODX POS - Permission Sets Side-by-Side Comparison Modal
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Minus, Layers, ShieldCheck, ShoppingCart, Receipt, Users, BarChart3, Settings } from 'lucide-react';
import { CustomPermissionSet } from '../../../domain/permissionSets';
import { PERMISSION_DEFINITIONS, Permission } from '../../../domain/auth';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { useLanguage } from '../../../context/LanguageContext';
import { getZIndexClass } from '../../../utils/ZIndexManager';

export interface PermissionSetComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionSets: CustomPermissionSet[];
}

export const PermissionSetComparisonModal: React.FC<PermissionSetComparisonModalProps> = ({
  isOpen,
  onClose,
  permissionSets,
}) => {
  const { language } = useLanguage();

  const [set1Id, setSet1Id] = useState<string>(
    permissionSets[0]?.id || 'pset-cashier-std'
  );
  const [set2Id, setSet2Id] = useState<string>(
    permissionSets[1]?.id || permissionSets[0]?.id || ''
  );

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const set1 = permissionSets.find((s) => s.id === set1Id) || permissionSets[0];
  const set2 = permissionSets.find((s) => s.id === set2Id) || permissionSets[1] || permissionSets[0];

  const categories = [
    { id: 'pos', title: language === 'th' ? 'จุดขายและแคชเชียร์' : 'Point of Sale' },
    { id: 'shift', title: language === 'th' ? 'ลิ้นชักและการเงิน' : 'Shift & Cash Float' },
    { id: 'inventory', title: language === 'th' ? 'คลังสินค้าและสต็อก' : 'Inventory & Catalog' },
    { id: 'customers', title: language === 'th' ? 'ลูกค้าสัมพันธ์ CRM' : 'Customer Loyalty' },
    { id: 'reports', title: language === 'th' ? 'รายงานและสถิติ' : 'Financial Reports' },
    { id: 'settings', title: language === 'th' ? 'ตั้งค่าระบบและความปลอดภัย' : 'Master Settings' },
  ];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 ${getZIndexClass('modal')} flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto`}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-card rounded-2xl border border-border border-crisp shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text">
                {language === 'th'
                  ? 'เปรียบเทียบชุดสิทธิ์แบบเคียงข้าง (Side-by-Side Comparison)'
                  : 'Compare Permission Sets'}
              </h2>
              <p className="text-xs text-text/50">
                {language === 'th'
                  ? 'ตรวจดูความแตกต่างของขอบเขตอำนาจระหว่างสองชุดสิทธิ์'
                  : 'Inspect structural permission differences between two role profiles.'}
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

        {/* Set Selectors Header Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border-b border-border bg-background/50">
          <div className="p-3 rounded-xl border border-border bg-card space-y-2">
            <span className="text-[11px] font-bold text-text/50 uppercase">
              {language === 'th' ? 'ชุดสิทธิ์ที่ 1 (Profile A)' : 'Profile A'}
            </span>
            <select
              value={set1Id}
              onChange={(e) => setSet1Id(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-bold text-text focus:ring-2 focus:ring-primary focus:outline-hidden cursor-pointer"
            >
              {permissionSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {language === 'th' ? s.nameTh || s.name : s.name} ({s.targetRole})
                </option>
              ))}
            </select>
            {set1 && (
              <div className="flex items-center justify-between text-xs text-text/60 font-mono pt-1">
                <span>{set1.permissions.length} / {PERMISSION_DEFINITIONS.length} perms</span>
                <Badge variant="primary" size="sm" className="font-mono text-[9px] uppercase font-bold">
                  {set1.targetRole}
                </Badge>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl border border-border bg-card space-y-2">
            <span className="text-[11px] font-bold text-text/50 uppercase">
              {language === 'th' ? 'ชุดสิทธิ์ที่ 2 (Profile B)' : 'Profile B'}
            </span>
            <select
              value={set2Id}
              onChange={(e) => setSet2Id(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-bold text-text focus:ring-2 focus:ring-primary focus:outline-hidden cursor-pointer"
            >
              {permissionSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {language === 'th' ? s.nameTh || s.name : s.name} ({s.targetRole})
                </option>
              ))}
            </select>
            {set2 && (
              <div className="flex items-center justify-between text-xs text-text/60 font-mono pt-1">
                <span>{set2.permissions.length} / {PERMISSION_DEFINITIONS.length} perms</span>
                <Badge variant="primary" size="sm" className="font-mono text-[9px] uppercase font-bold">
                  {set2.targetRole}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Matrix Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {categories.map((cat) => {
            const catPerms = PERMISSION_DEFINITIONS.filter(
              (p) => p.category === cat.id
            );
            if (catPerms.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-2">
                <div className="text-xs font-bold text-primary uppercase tracking-wider px-1">
                  {cat.title}
                </div>

                <div className="border border-border border-crisp rounded-xl overflow-hidden divide-y divide-border">
                  {catPerms.map((perm) => {
                    const has1 = set1?.permissions.includes(perm.id);
                    const has2 = set2?.permissions.includes(perm.id);
                    const isDiff = has1 !== has2;

                    return (
                      <div
                        key={perm.id}
                        className={`grid grid-cols-12 items-center p-3 text-xs transition-colors ${
                          isDiff ? 'bg-amber-500/5 dark:bg-amber-500/10' : 'bg-card'
                        }`}
                      >
                        <div className="col-span-6 min-w-0 pr-3">
                          <div className="font-bold text-text truncate">
                            {language === 'th' ? perm.nameTh : perm.nameEn}
                          </div>
                          <div className="text-[10px] text-text/50 font-mono truncate">{perm.id}</div>
                        </div>

                        <div className="col-span-3 text-center">
                          {has1 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                              <Check className="h-4 w-4" />
                              <span className="hidden sm:inline text-[11px]">{language === 'th' ? 'มีสิทธิ์' : 'Granted'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-text/40">
                              <Minus className="h-4 w-4" />
                              <span className="hidden sm:inline text-[11px]">{language === 'th' ? 'ไม่มีสิทธิ์' : 'Denied'}</span>
                            </span>
                          )}
                        </div>

                        <div className="col-span-3 text-center">
                          {has2 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                              <Check className="h-4 w-4" />
                              <span className="hidden sm:inline text-[11px]">{language === 'th' ? 'มีสิทธิ์' : 'Granted'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-text/40">
                              <Minus className="h-4 w-4" />
                              <span className="hidden sm:inline text-[11px]">{language === 'th' ? 'ไม่มีสิทธิ์' : 'Denied'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-card/90">
          <Button type="button" variant="primary" size="sm" onClick={onClose} className="rounded-lg text-xs font-bold">
            {language === 'th' ? 'ปิดหน้าต่าง (Close)' : 'Close Comparison'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
