import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { ProdxLogo } from '../../components/common/ProdxLogo';
import {
  Globe,
  ChevronDown,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Fingerprint,
  Loader2,
  X,
  Delete,
  CheckCircle2,
  QrCode,
  KeyRound,
  Terminal,
  Cpu,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { language: lang, setLanguage: setLang } = useLanguage();
  const { addToast } = useToast();

  const [authMode, setAuthMode] = useState<'pin' | 'credentials' | 'biometric'>('pin');
  const [username, setUsername] = useState('alex.vance@prodx.io');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Terminal telemetry
  const storeCode = 'STR-01';
  const registerId = 'REG-01';

  // PIN state
  const [pin, setPin] = useState('');
  const [activeStaffPreset, setActiveStaffPreset] = useState<'alex' | 'sarah' | 'manager'>('alex');

  // Biometric state
  const [showBiometric, setShowBiometric] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');

  // QR state
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrStatus, setQrStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');

  // 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  // Quick staff accounts for quick PIN login demonstration
  const staffAccounts = [
    { id: 'alex', name: 'Alex Vance', role: 'Store Lead', email: 'alex.vance@prodx.io', demoPin: '1234' },
    { id: 'sarah', name: 'Sarah Chen', role: 'Head Cashier', email: 'sarah.chen@prodx.io', demoPin: '5678' },
    { id: 'manager', name: 'Admin Terminal', role: 'Supervisor', email: 'admin@prodx.io', demoPin: '0000' },
  ];

  const handleQrScan = () => {
    if (qrStatus === 'scanning' || qrStatus === 'success') return;
    setQrStatus('scanning');
    setTimeout(() => {
      setQrStatus('success');
      setTimeout(() => {
        login({
          organizationSlug: 'prodx',
          storeCode,
          registerId,
          emailOrPin: 'sarah.chen@prodx.io',
          passwordOrPin: '5678',
        }).catch((err: any) => {
          setQrStatus('failed');
          addToast({
            title: lang === 'th' ? 'สแกน QR ไม่ผ่าน' : 'QR Scan Failed',
            message: err.message || 'Authentication failed',
            type: 'error',
          });
        });
      }, 700);
    }, 1800);
  };

  const handleBiometricScan = () => {
    if (biometricStatus === 'scanning' || biometricStatus === 'success') return;
    setBiometricStatus('scanning');
    setTimeout(() => {
      setBiometricStatus('success');
      setTimeout(() => {
        login({
          organizationSlug: 'prodx',
          storeCode,
          registerId,
          emailOrPin: 'alex.vance@prodx.io',
          passwordOrPin: '1234',
        }).catch((err: any) => {
          setBiometricStatus('failed');
          addToast({
            title: lang === 'th' ? 'ชีวมิติไม่ผ่าน' : 'Biometric Failed',
            message: err.message || 'Authentication failed',
            type: 'error',
          });
        });
      }, 700);
    }, 1500);
  };

  const handleCredentialsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      addToast({
        title: lang === 'th' ? 'ข้อผิดพลาด' : 'Error',
        message: lang === 'th' ? 'กรุณากรอกข้อมูลให้ครบถ้วน' : 'Please enter credentials',
        type: 'error',
      });
      return;
    }
    // Trigger 2FA step
    setShow2FA(true);
  };

  const submit2FA = async () => {
    if (twoFactorCode.length < 6) {
      addToast({
        title: lang === 'th' ? 'รหัสไม่ครบ' : 'Incomplete Code',
        message: lang === 'th' ? 'กรุณากรอกรหัส 6 หลัก' : 'Please enter all 6 digits',
        type: 'error',
      });
      return;
    }
    setIsVerifying2FA(true);
    try {
      await login({
        organizationSlug: 'prodx',
        storeCode,
        registerId,
        emailOrPin: username,
        passwordOrPin: password,
      });
      setShow2FA(false);
    } catch (err: any) {
      addToast({
        title: lang === 'th' ? 'การยืนยันล้มเหลว' : 'Verification Failed',
        message: err.message || 'Authentication failed',
        type: 'error',
      });
      setTwoFactorCode('');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        executePinLogin(nextPin);
      }
    }
  };

  const handlePinDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    setPin('');
  };

  const executePinLogin = async (completedPin: string) => {
    const selectedAccount = staffAccounts.find((a) => a.id === activeStaffPreset) || staffAccounts[0];
    try {
      await login({
        organizationSlug: 'prodx',
        storeCode,
        registerId,
        emailOrPin: selectedAccount.email,
        passwordOrPin: completedPin,
      });
    } catch (err: any) {
      addToast({
        title: lang === 'th' ? 'รหัส PIN ไม่ถูกต้อง' : 'Invalid PIN',
        message: lang === 'th' ? 'กรุณาตรวจสอบรหัส PIN อีกครั้ง' : 'Authentication failed',
        type: 'error',
      });
      setPin('');
    }
  };

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return Math.min(4, score);
  };

  const strengthScore = getPasswordStrength(password);

  const getStrengthColor = () => {
    if (strengthScore === 0) return 'bg-border';
    if (strengthScore <= 1) return 'bg-rose-500';
    if (strengthScore <= 2) return 'bg-amber-500';
    if (strengthScore === 3) return 'bg-primary';
    return 'bg-emerald-500';
  };

  const getStrengthText = () => {
    if (strengthScore === 0) return '';
    if (strengthScore <= 1) return lang === 'th' ? 'ระดับต่ำ' : 'Low';
    if (strengthScore <= 2) return lang === 'th' ? 'ปานกลาง' : 'Medium';
    if (strengthScore === 3) return lang === 'th' ? 'ความปลอดภัยสูง' : 'High';
    return lang === 'th' ? 'ยอดเยี่ยม' : 'Excellent';
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f8fafc] text-text font-sans selection:bg-primary selection:text-white">
      {/* Top Global Utility Bar */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <button
          onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-[#f1f5f9] text-text text-xs font-bold rounded-lg border border-border shadow-xs transition-all cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>{lang === 'th' ? 'ไทย' : 'EN'}</span>
          <ChevronDown className="w-3 h-3 text-text/50" />
        </button>
      </div>

      {/* LEFT PANEL: Premium Tech Enterprise Branding (Visible on lg+ screens) */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative flex-col justify-between p-12 lg:p-16 bg-[#0a0f1d] text-white overflow-hidden border-r border-slate-800">
        {/* Subtle decorative grid/orbs background */}
        <div 
          className="absolute inset-0 opacity-[0.06] pointer-events-none" 
          style={{
            backgroundImage: 'radial-gradient(rgba(99, 102, 241, 0.4) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Brand Identity Header */}
        <div className="relative z-10 space-y-8">
          <ProdxLogo variant="horizontal" size="lg" showTagline={true} />
          
          <div className="space-y-4 pt-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ENTERPRISE GRADE</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              {lang === 'th' ? 'ระบบจัดการหน้าร้านอัจฉริยะ' : 'Enterprise POS Workstation'}
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              {lang === 'th'
                ? 'ระบบขายหน้าร้านมาตรฐานองค์กรระดับไฮเอนด์ มาพร้อมสถาปัตยกรรมกันไฟดับ ตรวจสอบสิทธิ์แบบออฟไลน์ และความปลอดภัยระดับสูงสุด'
                : 'High-performance cloud POS workstation featuring offline resiliency, automated data synchronization, and absolute hardware-level security.'}
            </p>
          </div>
        </div>

        {/* Telemetry Realtime Monitor Grid */}
        <div className="relative z-10 py-8 border-y border-slate-800/60 my-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">TERMINAL STATUS</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div className="font-mono text-xs font-bold text-slate-200 mt-2">
                ONLINE & SYNCED
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">Latency: 14ms (SSL)</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">SECURITY SHIELD</span>
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="font-mono text-xs font-bold text-slate-200 mt-2">
                PCI-DSS AES-256
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">FIPS 140-2 Encrypted</div>
            </div>
          </div>
        </div>

        {/* Telemetry Footer */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-primary" />
            <span>NODE: STR-01-REG-01</span>
          </div>
          <div className="font-mono">
            <span>CORE V4.2.0 (STABLE)</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Sleek Authentication Form */}
      <div className="w-full lg:w-7/12 xl:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 relative bg-[#f8fafc]">
        <div className="w-full max-w-sm sm:max-w-md space-y-6 mx-auto">
          {/* Mobile Brand Header */}
          <div className="flex lg:hidden flex-col items-center justify-center text-center pb-4">
            <ProdxLogo variant="horizontal" size="md" showTagline={true} />
          </div>

          {/* Mode Switcher Tabs (Segmented Control style) */}
          <div className="p-1 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setAuthMode('pin');
                setPin('');
              }}
              className={`flex-1 min-h-[42px] flex items-center justify-center gap-2 text-xs font-extrabold rounded-lg transition-all duration-200 cursor-pointer ${
                authMode === 'pin'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-text/70 hover:text-text hover:bg-white/40'
              }`}
            >
              <KeyRound className={`w-4 h-4 ${authMode === 'pin' ? 'text-primary' : ''}`} />
              <span>PIN</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('credentials')}
              className={`flex-1 min-h-[42px] flex items-center justify-center gap-2 text-xs font-extrabold rounded-lg transition-all duration-200 cursor-pointer ${
                authMode === 'credentials'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-text/70 hover:text-text hover:bg-white/40'
              }`}
            >
              <UserIcon className={`w-4 h-4 ${authMode === 'credentials' ? 'text-primary' : ''}`} />
              <span>{lang === 'th' ? 'รหัสผ่าน' : 'Password'}</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('biometric')}
              className={`flex-1 min-h-[42px] flex items-center justify-center gap-2 text-xs font-extrabold rounded-lg transition-all duration-200 cursor-pointer ${
                authMode === 'biometric'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-text/70 hover:text-text hover:bg-white/40'
              }`}
            >
              <Fingerprint className={`w-4 h-4 ${authMode === 'biometric' ? 'text-primary' : ''}`} />
              <span>Biometric</span>
            </button>
          </div>

          {/* MODE 1: STAFF PIN KEYPAD */}
          {authMode === 'pin' && (
            <div className="p-6 sm:p-8 rounded-2xl border border-slate-200/80 bg-white shadow-sm space-y-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text/50 mb-3 flex justify-between items-center">
                  <span>{lang === 'th' ? 'เลือกบัญชีพนักงาน' : 'Select Staff Member'}</span>
                  <span className="font-mono text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                    PINs: 1234 / 5678 / 0000
                  </span>
                </div>
                
                {/* Staff Selection: Anti-truncation avatar cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  {staffAccounts.map((account) => {
                    const isSelected = activeStaffPreset === account.id;
                    const initials = account.name.split(' ').map((n) => n[0]).join('');
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => {
                          setActiveStaffPreset(account.id as any);
                          setPin('');
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between h-20 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-slate-950 font-bold ring-1 ring-primary shadow-xs'
                            : 'border-slate-200 bg-slate-50 text-text/70 hover:border-slate-300 hover:bg-slate-100/50'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                            isSelected ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600 border border-slate-300/30'
                          }`}>
                            {initials}
                          </span>
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary' : 'bg-transparent'}`} />
                        </div>
                        <div className="mt-2 min-w-0">
                          <div className="text-[11px] font-black leading-tight truncate text-slate-900" title={account.name}>
                            {account.name}
                          </div>
                          <div className="text-[9px] text-text/40 font-bold uppercase tracking-wider mt-0.5 truncate">
                            {account.role}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PIN Code Dots Indicator with security bead styling */}
              <div className="py-2 flex flex-col items-center justify-center">
                <div className="flex gap-4">
                  {[0, 1, 2, 3].map((idx) => {
                    const isFilled = pin.length > idx;
                    return (
                      <div key={idx} className="relative flex items-center justify-center">
                        <div
                          className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                            isFilled
                              ? 'bg-primary border-primary scale-110 shadow-xs'
                              : 'bg-slate-50 border-slate-300'
                          }`}
                        />
                        {isFilled && (
                          <div className="absolute w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tactical numeric keypad */}
              <div className="grid grid-cols-3 gap-2.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinDigit(num)}
                    disabled={isLoading}
                    className="min-h-[58px] h-[58px] rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 active:scale-95 text-xl font-mono font-black text-slate-800 hover:text-slate-950 transition-all cursor-pointer select-none flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handlePinClear}
                  className="min-h-[58px] h-[58px] rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 active:scale-95 text-xs font-bold text-slate-600 hover:text-slate-800 transition-all cursor-pointer flex items-center justify-center uppercase shadow-2xs"
                >
                  {lang === 'th' ? 'ล้าง' : 'Clear'}
                </button>
                <button
                  type="button"
                  onClick={() => handlePinDigit('0')}
                  disabled={isLoading}
                  className="min-h-[58px] h-[58px] rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 active:scale-95 text-xl font-mono font-black text-slate-800 hover:text-slate-950 transition-all cursor-pointer select-none flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinDelete}
                  className="min-h-[58px] h-[58px] rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 active:scale-95 text-slate-600 hover:text-slate-800 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
                  title="Backspace"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: BIOMETRIC LOGIN */}
          {authMode === 'biometric' && (
            <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm text-center space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  {lang === 'th' ? 'ยืนยันตัวตนด้วยชีวมิติ' : 'Biometric Verification'}
                </h3>
                <p className="text-xs text-text/70 leading-relaxed">
                  {lang === 'th' ? 'แตะเซนเซอร์ลายนิ้วมือหรือ FaceID ของอุปกรณ์' : 'Verify via terminal biometric reader'}
                </p>
              </div>
              <div className="py-6 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleBiometricScan}
                  disabled={biometricStatus === 'scanning'}
                  className={`w-24 h-24 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 cursor-pointer shadow-sm ${
                    biometricStatus === 'scanning'
                      ? 'border-primary bg-primary/5 text-primary animate-pulse scale-105'
                      : biometricStatus === 'success'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                      : biometricStatus === 'failed'
                      ? 'border-rose-500 bg-rose-50 text-rose-600'
                      : 'border-slate-200 bg-slate-50 text-primary hover:border-primary/40 hover:bg-slate-100'
                  }`}
                >
                  <Fingerprint className="w-12 h-12" />
                </button>
              </div>
              <div className="text-xs font-mono font-bold">
                {biometricStatus === 'idle' && (
                  <span className="text-slate-500">{lang === 'th' ? 'แตะเพื่อเริ่มสแกน' : 'Tap icon to scan'}</span>
                )}
                {biometricStatus === 'scanning' && (
                  <span className="text-primary animate-pulse">{lang === 'th' ? 'กำลังตรวจสอบชีวมิติ...' : 'Verifying biometric...'}</span>
                )}
                {biometricStatus === 'success' && (
                  <span className="text-emerald-500">{lang === 'th' ? 'ยืนยันตัวตนสำเร็จ!' : 'Authorized'}</span>
                )}
                {biometricStatus === 'failed' && (
                  <span className="text-rose-500">{lang === 'th' ? 'ไม่พบลายนิ้วมือ' : 'Rejected'}</span>
                )}
              </div>
            </div>
          )}

          {/* MODE 3: ENTERPRISE CREDENTIALS */}
          {authMode === 'credentials' && (
            <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  {lang === 'th' ? 'ลงชื่อเข้าใช้ด้วยบัญชีองค์กร' : 'Enterprise Sign In'}
                </h2>
                <p className="text-xs text-text/70 leading-relaxed">
                  {lang === 'th' ? 'กรอกอีเมลและรหัสผ่านเพื่อเข้าถึงระบบ' : 'Enter enterprise credentials with 2FA'}
                </p>
              </div>
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    {lang === 'th' ? 'อีเมลองค์กร / บัญชีพนักงาน' : 'Enterprise Email'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text/40">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="user@prodx.io"
                      className="w-full min-h-[44px] pl-10 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-text text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all placeholder:text-text/40 shadow-inner"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    {lang === 'th' ? 'รหัสผ่าน' : 'Password'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text/40">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full min-h-[44px] pl-10 pr-10 rounded-lg border border-slate-200 bg-slate-50 text-text text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all placeholder:text-text/40 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text/40 hover:text-text focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="mt-2.5 space-y-1">
                      <div className="flex gap-1.5 h-1.5">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-full flex-1 rounded-xs transition-colors duration-200 ${
                              strengthScore >= level ? getStrengthColor() : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">{lang === 'th' ? 'ความซับซ้อน' : 'Complexity'}</span>
                        <span className="font-bold text-primary">{getStrengthText()}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-text/70">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded-xs border-slate-300 text-primary focus:ring-primary bg-slate-50"
                    />
                    <span>{lang === 'th' ? 'จดจำอุปกรณ์นี้' : 'Remember terminal'}</span>
                  </label>
                  <span className="text-slate-400 font-mono text-[11px]">Demo: 1234 / 5678</span>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[48px] h-12 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-bold shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{lang === 'th' ? 'ยืนยันและดำเนินการต่อ' : 'Sign In with 2FA'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBiometricStatus('idle');
                    setShowBiometric(true);
                  }}
                  className="min-h-[42px] flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Fingerprint className="w-4 h-4 text-primary" />
                  <span>Biometric</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQrStatus('idle');
                    setShowQrScanner(true);
                  }}
                  className="min-h-[42px] flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <QrCode className="w-4 h-4 text-primary" />
                  <span>Scan QR</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Copyright */}
          <div className="text-center text-[10px] text-text/40 font-mono uppercase tracking-wider">
            <span>PRODX POS · ENTERPRISE RUNTIME v4.2</span>
          </div>
        </div>
      </div>

      {/* 2FA MODAL */}
      {show2FA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl relative text-center space-y-4">
            <button
              onClick={() => {
                setShow2FA(false);
                setTwoFactorCode('');
              }}
              className="absolute top-4 right-4 p-1 rounded-md text-text/40 hover:text-text hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto text-primary shadow-2xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {lang === 'th' ? 'การยืนยันตัวตนสองขั้นตอน (2FA)' : 'Two-Factor Authentication'}
              </h3>
              <p className="mt-1 text-xs text-text/70 leading-relaxed">
                {lang === 'th' ? 'กรุณากรอกรหัส 6 หลักที่สร้างจาก Authenticator App' : 'Enter the 6-digit numeric security code'}
              </p>
            </div>
            <div className="relative py-2">
              <div className="grid grid-cols-6 gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = twoFactorCode[index] || '';
                  return (
                    <div
                      key={index}
                      className={`h-12 rounded-lg border flex items-center justify-center text-lg font-mono font-black transition-all ${
                        twoFactorCode.length === index
                          ? 'border-primary bg-primary/5 text-slate-950 ring-2 ring-primary/10'
                          : twoFactorCode.length > index
                          ? 'border-slate-300 bg-slate-50 text-slate-900'
                          : 'border-slate-200 bg-white text-text/40'
                      }`}
                    >
                      {digit}
                    </div>
                  );
                })}
              </div>
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-text"
              />
            </div>
            <button
              type="button"
              onClick={submit2FA}
              disabled={isVerifying2FA || twoFactorCode.length < 6}
              className="w-full min-h-[44px] h-11 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {isVerifying2FA ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                lang === 'th' ? 'ตรวจสอบและเข้าสู่ระบบ' : 'Verify & Authorize'
              )}
            </button>
          </div>
        </div>
      )}

      {/* QR SCANNER MODAL */}
      {showQrScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl relative text-center space-y-4">
            <button
              onClick={() => {
                setShowQrScanner(false);
                setQrStatus('idle');
              }}
              className="absolute top-4 right-4 p-1 rounded-md text-text/40 hover:text-text hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {lang === 'th' ? 'สแกนคิวอาร์โค้ดพนักงาน' : 'Staff Mobile QR Login'}
              </h3>
              <p className="mt-1 text-xs text-text/70 leading-relaxed">
                {lang === 'th' ? 'ใช้กล้องสแกน QR Code เพื่อเข้าสู่ระบบด่วน' : 'Scan dynamic mobile authentication pass'}
              </p>
            </div>
            <div className="relative mx-auto w-48 h-48 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
              {qrStatus === 'idle' && (
                <button
                  type="button"
                  onClick={handleQrScan}
                  className="w-full h-full flex flex-col items-center justify-center text-text/60 hover:text-primary transition-colors cursor-pointer"
                >
                  <QrCode className="w-10 h-10 mb-2 text-text/30" />
                  <span className="text-xs font-mono font-bold text-slate-500">{lang === 'th' ? 'คลิกเพื่อจำลองสแกน' : 'Simulate Scan'}</span>
                </button>
              )}
              {qrStatus === 'scanning' && (
                <div className="w-full h-full flex items-center justify-center relative bg-slate-50">
                  <QrCode className="w-24 h-24 text-slate-200" />
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary shadow-[0_0_8px_rgba(96,165,250,1)] animate-[scan_1.6s_ease-in-out_infinite]" />
                </div>
              )}
              {qrStatus === 'success' && (
                <div className="flex flex-col items-center justify-center text-emerald-600 w-full h-full bg-emerald-50">
                  <CheckCircle2 className="w-12 h-12 mb-1" />
                  <span className="text-xs font-mono font-bold">{lang === 'th' ? 'รหัสผ่านถูกต้อง' : 'Token Accepted'}</span>
                </div>
              )}
              {qrStatus === 'failed' && (
                <div className="flex flex-col items-center justify-center text-rose-600 w-full h-full bg-rose-50">
                  <X className="w-12 h-12 mb-1" />
                  <span className="text-xs font-mono font-bold">{lang === 'th' ? 'รหัสไม่ถูกต้อง' : 'Token Expired'}</span>
                </div>
              )}
            </div>
            <div className="text-xs font-mono font-bold">
              {qrStatus === 'idle' && <span className="text-slate-400">{lang === 'th' ? 'รอรับสัญญาณภาพ...' : 'Ready for capture...'}</span>}
              {qrStatus === 'scanning' && <span className="text-primary animate-pulse">{lang === 'th' ? 'กำลังถอดรหัส QR...' : 'Parsing QR...'}</span>}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-26px); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateY(26px); opacity: 1; }
          85% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
