import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { ProdxLogo } from '../../components/common/ProdxLogo';
import { Globe, ChevronDown, User as UserIcon, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Fingerprint, ScanFace, Loader2, X, Delete, CheckCircle2, QrCode, KeyRound, Terminal, Cpu, Activity, Layers, Sparkles, Zap, Settings2, ShieldAlert, Clock, Wifi, Users } from 'lucide-react';
import { playScannerSound } from '../../services/soundService';
import { PasskeyEnrollModal } from '../../components/auth/PasskeyEnrollModal';
import { analyzePassword } from '../../utils/passwordSecurity';
import { PasswordStrengthMeter } from '../../components/auth/PasswordStrengthMeter';
import { AccountPasswordModal } from '../../components/auth/AccountPasswordModal';
import { authenticatePasskey, checkWebAuthnCapability, getRegisteredPasskeys, PasskeyCredentialRecord, WebAuthnCapability } from '../../services/webauthnService';

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { language: lang, setLanguage: setLang } = useLanguage();
  const { addToast } = useToast();
  const [authMode, setAuthMode] = useState<'pin' | 'credentials' | 'biometric'>('pin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const storeCode = 'STR-01';
  const registerId = 'REG-01';
  const [pin, setPin] = useState('');
  const [activeStaffPreset, setActiveStaffPreset] = useState<'john' | 'sarah' | 'alex'>('john');
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [biometricFeedback, setBiometricFeedback] = useState('');
  const [capability, setCapability] = useState<WebAuthnCapability | null>(null);
  const [enrolledPasskeys, setEnrolledPasskeys] = useState<PasskeyCredentialRecord[]>([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrStatus, setQrStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [showAccountPasswordModal, setShowAccountPasswordModal] = useState(false);
  const [showPasswordPolicyGuide, setShowPasswordPolicyGuide] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })), 1000);
    return () => clearInterval(timer);
  }, []);

  const staffAccounts = [
    { id: 'john' as const, userId: 'usr-cashier-john', name: 'John Doe', role: 'Head Cashier', roleKey: 'cashier', email: 'john.doe@prodx.io', employeeCode: 'EMP-108', defaultPin: '0000', badgeColor: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
    { id: 'sarah' as const, userId: 'usr-manager-sarah', name: 'Sarah Connor', role: 'Shift Manager', roleKey: 'manager', email: 'sarah.connor@prodx.io', employeeCode: 'EMP-014', defaultPin: '5678', badgeColor: 'border-amber-200 bg-amber-50 text-amber-800' },
    { id: 'alex' as const, userId: 'usr-admin-alex', name: 'Alex Vance', role: 'Store Lead & Admin', roleKey: 'admin', email: 'alex.vance@prodx.io', employeeCode: 'EMP-001', defaultPin: '1234', badgeColor: 'border-indigo-200 bg-indigo-50 text-indigo-800' },
  ];

  const refreshPasskeys = async (): Promise<void> => {
    const keys = getRegisteredPasskeys(); setEnrolledPasskeys(keys);
    const cap = await checkWebAuthnCapability(); setCapability(cap);
  };
  useEffect(() => { refreshPasskeys(); }, []);

  useEffect(() => {
    if (authMode !== 'pin' || show2FA || showQrScanner || showEnrollModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key >= '0' && e.key <= '9') { e.preventDefault(); handlePinDigit(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); handlePinDelete(); }
      else if (e.key === 'Escape') { e.preventDefault(); handlePinClear(); }
    };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authMode, pin, activeStaffPreset, show2FA, showQrScanner, showEnrollModal]);

  const handleQrScan = () => {
    if (qrStatus === 'scanning' || qrStatus === 'success') return;
    setQrStatus('scanning'); playScannerSound('click');
    setTimeout(() => { setQrStatus('success'); playScannerSound('success'); addToast({ title: lang === 'th' ? 'สแกนสำเร็จ' : 'Scan successful', message: lang === 'th' ? 'ยืนยันตัวตนผ่าน QR แล้ว' : 'QR authentication verified.', type: 'success' }); }, 900);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    try {
      const result = await login(username, password, { storeCode, registerId });
      if (result?.requires2FA) { setShow2FA(true); return; }
      if (result?.success) addToast({ title: lang === 'th' ? 'เข้าสู่ระบบสำเร็จ' : 'Signed in', message: lang === 'th' ? 'ยืนยันตัวตนสำเร็จ' : 'Authentication succeeded.', type: 'success' });
    } catch (err: any) { playScannerSound('error'); addToast({ title: lang === 'th' ? 'เข้าสู่ระบบไม่สำเร็จ' : 'Sign in failed', message: err?.message ?? (lang === 'th' ? 'ไม่สามารถเข้าสู่ระบบได้' : 'Unable to sign in.'), type: 'error' }); }
  };

  const handleQuickDemoFill = (account: (typeof staffAccounts)[0]) => { setActiveStaffPreset(account.id); setUsername(account.email); setPassword(''); setAuthMode('credentials'); addToast({ title: lang === 'th' ? 'เลือกบัญชีแล้ว' : 'Account selected', message: lang === 'th' ? 'กรุณากรอกรหัสผ่านจากระบบ Authentication Server' : 'Enter the password provided by the Authentication Server.', type: 'info' }); };
  const passwordAnalysis = analyzePassword(password, { email: username });

  return <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] text-text font-sans">
    <div className="w-full max-w-md p-5">
      <div className="mb-4 flex items-center justify-between text-xs text-slate-500"><span className="font-mono">TERMINAL {registerId}</span><span className="font-mono">{currentTime}</span></div>
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 space-y-5">
        <div><ProdxLogo variant="horizontal" size="md" showTagline={true}/><h2 className="text-xl font-black text-slate-900 mt-4">{lang === 'th' ? 'เข้าสู่ระบบ' : 'Sign in'}</h2><p className="text-xs text-slate-500 mt-1">{lang === 'th' ? 'Authentication Server เป็นแหล่งยืนยันตัวตนหลัก' : 'The Authentication Server is the credential authority.'}</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => setAuthMode('pin')} className="flex-1 rounded-lg px-3 py-2 text-xs font-bold border">PIN</button><button type="button" onClick={() => setAuthMode('credentials')} className="flex-1 rounded-lg px-3 py-2 text-xs font-bold border">Password</button><button type="button" onClick={() => setAuthMode('biometric')} className="flex-1 rounded-lg px-3 py-2 text-xs font-bold border">Passkey</button></div>
        {authMode === 'pin' && <div className="space-y-4"><div className="text-sm font-bold">{lang === 'th' ? 'เลือกบัญชี' : 'Select account'}</div><div className="grid grid-cols-3 gap-2">{staffAccounts.map((acc) => <button key={acc.id} type="button" onClick={() => setActiveStaffPreset(acc.id)} className="rounded-lg border p-2 text-left"><div className="text-xs font-bold">{acc.name.split(' ')[0]}</div><div className="text-[10px] text-slate-500">{acc.roleKey}</div></button>)}</div><div className="grid grid-cols-3 gap-2">{['1','2','3','4','5','6','7','8','9','0'].map((digit) => <button key={digit} type="button" onClick={() => handlePinDigit(digit)} className="rounded-lg border py-3 font-mono">{digit}</button>)}</div><button type="button" onClick={handlePinClear} className="w-full rounded-lg border py-2 text-xs">{lang === 'th' ? 'ล้าง PIN' : 'Clear PIN'}</button></div>}
        {authMode === 'credentials' && <form onSubmit={handleCredentialsSubmit} className="space-y-4"><div><label className="block text-xs font-bold mb-1">Email</label><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="user@prodx.io"/></div><div><label className="block text-xs font-bold mb-1">Password</label><div className="relative"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="w-full rounded-lg border px-3 py-2 pr-10 text-sm" placeholder={lang === 'th' ? 'กรอกรหัสผ่านองค์กร' : 'Enter enterprise password'}/><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2">{showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button></div>{password && <div className="mt-2"><PasswordStrengthMeter analysis={passwordAnalysis} language={lang} showCriteriaList={true} showEntropyInfo={true} compact={false}/></div>}</div><button disabled={isLoading} className="w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm font-bold">{isLoading ? 'Signing in…' : 'Continue'}</button><button type="button" onClick={() => setShowAccountPasswordModal(true)} className="w-full text-xs font-bold text-primary">{lang === 'th' ? 'จัดการ / รีเซ็ตรหัสผ่าน' : 'Manage / Reset Password'}</button></form>}
        {authMode === 'biometric' && <div className="space-y-4 text-center"><Fingerprint className="w-10 h-10 mx-auto"/><button type="button" onClick={() => handlePasskeyLogin()} className="w-full rounded-lg bg-slate-900 text-white py-2.5 font-bold">{lang === 'th' ? 'ยืนยันด้วย Passkey' : 'Authenticate with Passkey'}</button><p className="text-xs text-slate-500">{biometricFeedback}</p></div>}
      </div>
    </div>
    {show2FA && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-sm rounded-2xl bg-white p-6 space-y-4"><h3 className="font-black">2FA</h3><input value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="w-full rounded-lg border px-3 py-2" placeholder="000000"/><button type="button" disabled={isVerifying2FA} onClick={submit2FA} className="w-full rounded-lg bg-slate-900 text-white py-2">{isVerifying2FA ? 'Verifying…' : 'Verify'}</button></div></div>}
    <AccountPasswordModal isOpen={showAccountPasswordModal} onClose={() => setShowAccountPasswordModal(false)} language={lang}/>
    {showEnrollModal && <PasskeyEnrollModal isOpen={showEnrollModal} onClose={() => setShowEnrollModal(false)} language={lang} onEnrolled={refreshPasskeys}/>}
  </div>;
};