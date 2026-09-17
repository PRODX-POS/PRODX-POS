/**
 * PRODX POS - WebAuthn Passkeys Enrollment & Terminal Manager Modal
 */
import React, { useState, useEffect } from 'react';
import { X, Fingerprint, ScanFace, ShieldCheck, Plus, Trash2, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { PasskeyCredentialRecord, WebAuthnCapability, checkWebAuthnCapability, getRegisteredPasskeys, registerPasskey, removeEnrolledPasskey, resetPasskeys } from '../../services/webauthnService';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

interface PasskeyEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasskeysUpdated?: () => void;
  onEnrolled?: () => void | Promise<void>;
  initialUserId?: string;
  language?: string;
}

const AVAILABLE_STAFF = [
  { id: 'usr-cashier-john', name: 'John Doe', email: 'john.doe@prodx.io', role: 'cashier' as const },
  { id: 'usr-manager-sarah', name: 'Sarah Connor', email: 'sarah.connor@prodx.io', role: 'manager' as const },
  { id: 'usr-admin-alex', name: 'Alex Vance', email: 'alex.vance@prodx.io', role: 'admin' as const },
];

export const PasskeyEnrollModal: React.FC<PasskeyEnrollModalProps> = ({ isOpen, onClose, onPasskeysUpdated, onEnrolled, initialUserId, language }) => {
  const { language: contextLang } = useLanguage();
  const lang = language === 'th' || language === 'en' ? language : contextLang;
  const { addToast } = useToast();
  const [enrolledKeys, setEnrolledKeys] = useState<PasskeyCredentialRecord[]>([]);
  const [capability, setCapability] = useState<WebAuthnCapability | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialUserId || AVAILABLE_STAFF[0].id);
  const [customDeviceLabel, setCustomDeviceLabel] = useState<string>('');
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'list' | 'enroll'>('list');

  useEffect(() => { if (isOpen) loadData(); }, [isOpen]);
  const loadData = async () => { setEnrolledKeys(getRegisteredPasskeys()); setCapability(await checkWebAuthnCapability()); };
  if (!isOpen) return null;

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const staff = AVAILABLE_STAFF.find((s) => s.id === selectedStaffId);
    if (!staff) return;
    setIsEnrolling(true);
    try {
      const result = await registerPasskey(staff, customDeviceLabel);
      if (result.success && result.credential) {
        addToast({ title: lang === 'th' ? 'ลงทะเบียน Passkey สำเร็จ' : 'Passkey Enrolled', message: lang === 'th' ? `เปิดใช้งานลายนิ้วมือ/Face ID ให้ ${staff.name} เรียบร้อยแล้ว` : `Biometric passkey active for ${staff.name}`, type: 'success' });
        setCustomDeviceLabel(''); setActiveTab('list'); await loadData();
        onPasskeysUpdated?.();
        await onEnrolled?.();
      } else throw new Error(result.error || 'Registration failed');
    } catch (err: any) {
      addToast({ title: lang === 'th' ? 'ลงทะเบียนไม่สำเร็จ' : 'Enrollment Failed', message: err.message || 'Unable to register passkey on this device', type: 'error' });
    } finally { setIsEnrolling(false); }
  };

  const handleDelete = (id: string, name: string) => {
    setEnrolledKeys(removeEnrolledPasskey(id)); onPasskeysUpdated?.();
    addToast({ title: lang === 'th' ? 'ลบ Passkey แล้ว' : 'Passkey Removed', message: `${name} - Passkey removed from terminal`, type: 'info' });
  };
  const handleResetDefaults = () => {
    setEnrolledKeys(resetPasskeys()); onPasskeysUpdated?.();
    addToast({ title: lang === 'th' ? 'คืนค่าเริ่มต้น' : 'Reset to Default', message: 'Restored default terminal cashier passkeys', type: 'info' });
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary"><Fingerprint className="w-5 h-5" /></div><div><h2 className="text-base font-black text-slate-900 leading-tight">{lang === 'th' ? 'จัดการ Passkeys & ชีวมิติแคชเชียร์' : 'Cashier Passkeys & WebAuthn'}</h2><p className="text-xs text-text/60">{lang === 'th' ? 'Touch ID, Face ID และกุญแจความปลอดภัยสำหรับการผลัดกะรวดเร็ว' : 'FIDO2 biometrics for fast shift transitions'}</p></div></div>
        <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer" aria-label="Close"><X className="w-5 h-5" /></button>
      </div>
      <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between text-xs"><div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /><span className="font-semibold text-slate-200">{capability?.platformSummary || 'Checking hardware...'}</span></div><span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">FIDO2 / W3C</span></div>
      <div className="px-5 pt-3 border-b border-slate-100 flex gap-4 text-xs font-bold">
        <button type="button" onClick={() => setActiveTab('list')} className={`pb-2.5 cursor-pointer border-b-2 ${activeTab === 'list' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}>{lang === 'th' ? `Passkeys ที่ลงทะเบียน (${enrolledKeys.length})` : `Enrolled Passkeys (${enrolledKeys.length})`}</button>
        <button type="button" onClick={() => setActiveTab('enroll')} className={`pb-2.5 cursor-pointer border-b-2 flex items-center gap-1.5 ${activeTab === 'enroll' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}><Plus className="w-3.5 h-3.5" /><span>{lang === 'th' ? 'ลงทะเบียนอุปกรณ์ใหม่' : 'Enroll New Device'}</span></button>
      </div>
      <div className="p-5 overflow-y-auto flex-1 space-y-4">
        {activeTab === 'list' && <div className="space-y-3">{enrolledKeys.length === 0 ? <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-3"><Fingerprint className="w-10 h-10 text-slate-300 mx-auto" /><p className="text-xs text-slate-500">{lang === 'th' ? 'ยังไม่มี Passkey ที่ลงทะเบียนบนเครื่องนี้' : 'No passkeys registered on this terminal'}</p><button type="button" onClick={() => setActiveTab('enroll')} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg">{lang === 'th' ? 'ลงทะเบียน Passkey แรก' : 'Enroll First Passkey'}</button></div> : enrolledKeys.map((key) => <div key={key.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><div className="w-9 h-9 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center text-primary shrink-0">{key.authenticatorType === 'face_id' ? <ScanFace className="w-4 h-4" /> : <Fingerprint className="w-4 h-4" />}</div><div className="min-w-0"><div className="flex items-center gap-2"><span className="text-xs font-black text-slate-900 truncate">{key.userName}</span><span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-200 text-slate-700">{key.userRole}</span>{key.isVirtualFallback && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-200/50">Terminal Pass</span>}</div><div className="text-[11px] text-slate-500 truncate mt-0.5">{key.deviceLabel}</div><div className="text-[10px] text-slate-400 font-mono mt-0.5">{lang === 'th' ? 'ใช้งานล่าสุด:' : 'Last used:'} {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'} • {key.counter} logins</div></div></div><button type="button" onClick={() => handleDelete(key.id, key.userName)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 shrink-0"><Trash2 className="w-4 h-4" /></button></div>) }<div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100"><button type="button" onClick={handleResetDefaults} className="hover:text-primary flex items-center gap-1 font-medium"><RefreshCw className="w-3 h-3" /><span>{lang === 'th' ? 'รีเซ็ตเป็นค่าเริ่มต้นระบบ' : 'Restore Default Staff Keys'}</span></button><span className="font-mono text-[10px]">PRODX WEBAUTHN V2</span></div></div>}
        {activeTab === 'enroll' && <form onSubmit={handleEnroll} className="space-y-4"><div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs text-primary"><Sparkles className="w-4 h-4 shrink-0 mt-0.5" /><p>{lang === 'th' ? 'การลงทะเบียน Passkey จะเปิดใช้งานเซนเซอร์ลายนิ้วมือหรือ Face ID ของเครื่องนี้ เพื่อให้แคชเชียร์สลับกะได้ภายใน 1 วินาที' : 'Enrolling a passkey binds this device hardware biometric to the cashier for sub-second shift switches.'}</p></div><div><label className="block text-xs font-bold text-slate-800 mb-1.5">{lang === 'th' ? 'เลือกพนักงานที่ต้องการผูกชีวมิติ' : 'Select Staff Member'}</label><div className="grid grid-cols-1 gap-2">{AVAILABLE_STAFF.map((staff) => <button key={staff.id} type="button" onClick={() => setSelectedStaffId(staff.id)} className={`p-3 rounded-xl border text-left flex items-center justify-between ${selectedStaffId === staff.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 bg-white'}`}><div><div className="text-xs font-black text-slate-900">{staff.name}</div><div className="text-[11px] text-slate-500">{staff.email}</div></div><span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">{staff.role}</span></button>)}</div></div><div><label className="block text-xs font-bold text-slate-800 mb-1.5">{lang === 'th' ? 'ชื่ออุปกรณ์ / ชื่อจุดขาย (ตัวเลือก)' : 'Device Identifier (Optional)'}</label><input type="text" value={customDeviceLabel} onChange={(e) => setCustomDeviceLabel(e.target.value)} placeholder={capability?.biometricLabel || 'Register 01 Touch ID'} className="w-full min-h-[42px] px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" /></div><div className="pt-3 flex gap-2"><button type="button" onClick={() => setActiveTab('list')} className="flex-1 min-h-[44px] rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold">{lang === 'th' ? 'ยกเลิก' : 'Cancel'}</button><button type="submit" disabled={isEnrolling} className="flex-1 min-h-[44px] rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">{isEnrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Fingerprint className="w-4 h-4" /><span>{lang === 'th' ? 'แตะชีวมิติเพื่อลงทะเบียน' : 'Enroll Biometric Passkey'}</span></>}</button></div></form>}
      </div>
    </div>
  </div>;
};
