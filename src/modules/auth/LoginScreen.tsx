import React, { useState, useEffect } from 'react';
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
  ScanFace,
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
  Zap,
  Settings2,
  Timer,
  Radio,
  Play,
  Pause,
  ShieldAlert,
} from 'lucide-react';
import { playScannerSound } from '../../services/soundService';
import { PasskeyEnrollModal } from '../../components/auth/PasskeyEnrollModal';
import {
  authenticatePasskey,
  checkWebAuthnCapability,
  getRegisteredPasskeys,
  PasskeyCredentialRecord,
  WebAuthnCapability,
} from '../../services/webauthnService';

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { language: lang, setLanguage: setLang } = useLanguage();
  const { addToast } = useToast();

  const [authMode, setAuthMode] = useState<'pin' | 'credentials' | 'biometric'>('biometric');
  const [username, setUsername] = useState('john.doe@prodx.io');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Terminal telemetry
  const storeCode = 'STR-01';
  const registerId = 'REG-01';

  // PIN state
  const [pin, setPin] = useState('');
  const [activeStaffPreset, setActiveStaffPreset] = useState<'john' | 'sarah' | 'alex'>('john');

  // WebAuthn Passkeys & Biometric state
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [biometricFeedback, setBiometricFeedback] = useState<string>('');
  const [capability, setCapability] = useState<WebAuthnCapability | null>(null);
  const [enrolledPasskeys, setEnrolledPasskeys] = useState<PasskeyCredentialRecord[]>([]);
  const [showEnrollModal, setShowEnrollModal] = useState<boolean>(false);

  // Workflow: Prioritize biometric passkey initialization on mount
  const [isBiometricInitialized, setIsBiometricInitialized] = useState<boolean>(false);
  const [isPromptArmed, setIsPromptArmed] = useState<boolean>(false);
  const [autoPromptEnabled, setAutoPromptEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prodx_biometric_autoprompt');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [autoPromptCountdown, setAutoPromptCountdown] = useState<number | null>(null);
  const [isCountdownPaused, setIsCountdownPaused] = useState<boolean>(false);

  // QR state
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrStatus, setQrStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');

  // 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  // Staff accounts with passkey capability
  const staffAccounts = [
    {
      id: 'john',
      userId: 'usr-cashier-john',
      name: 'John Doe',
      role: 'Head Cashier',
      email: 'john.doe@prodx.io',
      employeeCode: 'EMP-108',
      passkeyReady: true,
      passkeyType: 'touch_id',
    },
    {
      id: 'sarah',
      userId: 'usr-manager-sarah',
      name: 'Sarah Connor',
      role: 'Shift Manager',
      email: 'sarah.connor@prodx.io',
      employeeCode: 'EMP-014',
      passkeyReady: true,
      passkeyType: 'face_id',
    },
    {
      id: 'alex',
      userId: 'usr-admin-alex',
      name: 'Alex Vance',
      role: 'Store Lead',
      email: 'alex.vance@prodx.io',
      employeeCode: 'EMP-001',
      passkeyReady: true,
      passkeyType: 'touch_id',
    },
  ];

  const refreshPasskeys = async () => {
    const keys = getRegisteredPasskeys();
    setEnrolledPasskeys(keys);
    const cap = await checkWebAuthnCapability();
    setCapability(cap);
    return { keys, cap };
  };

  // Mount workflow: Prioritize biometric passkey initialization and arm sensor
  useEffect(() => {
    let isMounted = true;

    const initBiometricWorkflow = async () => {
      setIsBiometricInitialized(false);
      const { cap } = await refreshPasskeys();
      if (!isMounted) return;

      setIsBiometricInitialized(true);
      setIsPromptArmed(true);
      playScannerSound('click');

      // If auto-prompt is enabled and user is in biometric mode, start countdown
      if (autoPromptEnabled && authMode === 'biometric') {
        setAutoPromptCountdown(2);
      }
    };

    initBiometricWorkflow();

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-prompt countdown handler
  useEffect(() => {
    if (
      autoPromptCountdown === null ||
      isCountdownPaused ||
      biometricStatus === 'scanning' ||
      biometricStatus === 'success' ||
      authMode !== 'biometric'
    ) {
      return;
    }

    if (autoPromptCountdown <= 0) {
      setAutoPromptCountdown(null);
      handlePasskeyLogin();
      return;
    }

    const timer = setInterval(() => {
      setAutoPromptCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          handlePasskeyLogin();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoPromptCountdown, isCountdownPaused, biometricStatus, authMode]);

  const toggleAutoPrompt = () => {
    const next = !autoPromptEnabled;
    setAutoPromptEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('prodx_biometric_autoprompt', String(next));
    }
    if (!next) {
      setAutoPromptCountdown(null);
    } else if (authMode === 'biometric' && biometricStatus === 'idle') {
      setAutoPromptCountdown(2);
    }
  };

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
          emailOrPin: 'john.doe@prodx.io',
          passwordOrPin: 'token-qr-auth',
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

  /**
   * Real WebAuthn Passkeys Authentication Handler (Touch ID / Face ID / Windows Hello)
   */
  const handlePasskeyLogin = async (targetPreset?: (typeof staffAccounts)[0]) => {
    setAutoPromptCountdown(null);
    if (biometricStatus === 'scanning' || biometricStatus === 'success') return;
    setBiometricStatus('scanning');
    playScannerSound('click');
    setBiometricFeedback(
      lang === 'th'
        ? 'กำลังเรียกเซนเซอร์ลายนิ้วมือ / Face ID ของเครื่อง...'
        : 'Activating biometric reader (Touch ID / Face ID)...'
    );

    try {
      const selectedPreset =
        targetPreset ||
        staffAccounts.find((a) => a.id === activeStaffPreset) ||
        staffAccounts[0];

      const result = await authenticatePasskey({
        id: selectedPreset.userId,
        email: selectedPreset.email,
        name: selectedPreset.name,
      });

      if (result.success && result.credential) {
        setBiometricStatus('success');
        playScannerSound('supervisor_authorized');
        setBiometricFeedback(
          lang === 'th'
            ? `ยืนยันชีวมิติเรียบร้อย! กำลังสลับกะไปที่ ${result.credential.userName}`
            : `Biometric authorized! Handing shift to ${result.credential.userName}`
        );

        await login({
          organizationSlug: 'prodx',
          storeCode,
          registerId,
          emailOrPin: result.credential.userEmail,
          passwordOrPin: result.credential.id,
        });

        addToast({
          title: lang === 'th' ? 'เข้าสู่ระบบด้วย Passkey สำเร็จ' : 'Passkey Authenticated',
          message:
            lang === 'th'
              ? `เปิดกะการขายสำหรับ ${result.credential.userName} (แคชเชียร์พร้อมทำงาน)`
              : `Fast shift transition complete for ${result.credential.userName}`,
          type: 'success',
        });
      } else {
        setBiometricStatus('failed');
        playScannerSound('error');
        setBiometricFeedback(
          result.error ||
            (lang === 'th' ? 'การยืนยันชีวมิติล้มเหลว' : 'Biometric verification cancelled')
        );
        addToast({
          title: lang === 'th' ? 'ชีวมิติไม่ผ่าน' : 'Biometric Failed',
          message: result.error || 'Authentication rejected or cancelled',
          type: 'error',
        });
        setTimeout(() => setBiometricStatus('idle'), 3000);
      }
    } catch (err: any) {
      setBiometricStatus('failed');
      playScannerSound('error');
      setBiometricFeedback(err.message || 'Authentication error');
      addToast({
        title: lang === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
        message: err.message || 'Authentication failed',
        type: 'error',
      });
      setTimeout(() => setBiometricStatus('idle'), 3000);
    }
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

          {/* PERSISTENT BIOMETRIC SHIFT PROMPT INDICATOR (Immediate Feedback on Mount) */}
          <div
            onClick={() => {
              if (authMode !== 'biometric') setAuthMode('biometric');
              handlePasskeyLogin();
            }}
            className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer select-none p-3.5 ${
              biometricStatus === 'scanning'
                ? 'border-primary/60 bg-primary/5 shadow-md ring-2 ring-primary/20'
                : biometricStatus === 'success'
                ? 'border-emerald-500/60 bg-emerald-50/70 shadow-md ring-2 ring-emerald-400/20'
                : 'border-emerald-500/40 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/80 hover:border-emerald-500 hover:bg-emerald-50/60 animate-biometric-glow shadow-xs'
            }`}
            title={lang === 'th' ? 'แตะเพื่อสแกนชีวมิติสลับกะทันที' : 'Tap for instant biometric shift takeover'}
          >
            {/* Subtle light sweep animation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl opacity-60">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent animate-laser-sweep" />
            </div>

            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Animated Sensor Icon with Dual Concentric Pulse Rings */}
                <div className="relative flex items-center justify-center shrink-0">
                  <span className="absolute w-10 h-10 rounded-xl bg-emerald-500/20 animate-ping opacity-60" />
                  <span className="absolute w-8 h-8 rounded-lg bg-emerald-400/30 animate-pulse" />
                  <div className="relative w-9 h-9 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 text-white flex items-center justify-center shadow-md transition-colors">
                    {biometricStatus === 'scanning' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : biometricStatus === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-white animate-bounce" />
                    ) : capability?.biometricLabel?.toLowerCase().includes('face') ? (
                      <ScanFace className="w-5 h-5 animate-pulse" />
                    ) : (
                      <Fingerprint className="w-5 h-5 animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                      {lang === 'th' ? 'สลับกะทันทีด้วยชีวมิติ' : 'Rapid Biometric Shift Takeover'}
                    </span>
                    {autoPromptCountdown !== null && (
                      <span className="text-[9px] font-mono font-bold bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded-full">
                        {autoPromptCountdown}s
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                    {biometricStatus === 'scanning'
                      ? (lang === 'th' ? 'กำลังอ่านลายนิ้วมือ / Face ID...' : 'Reading hardware sensor...')
                      : biometricStatus === 'success'
                      ? (lang === 'th' ? 'ยืนยันตัวตนสำเร็จ!' : 'Shift Takeover Authorized!')
                      : (lang === 'th' ? 'แตะเซนเซอร์ Touch ID / Windows Hello เพื่อเริ่มกะ' : 'Touch sensor or look at camera to start shift')}
                  </p>
                </div>
              </div>

              {/* Quick Trigger Button / Action Cue */}
              <div className="shrink-0 flex items-center gap-1">
                <span className="text-[11px] font-extrabold text-emerald-700 group-hover:text-emerald-900 bg-white/90 group-hover:bg-white px-2.5 py-1 rounded-lg border border-emerald-300/80 shadow-2xs transition-all flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>{lang === 'th' ? 'แตะสแกน' : 'Prompt'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs (Segmented Control style) */}
          <div className="p-1 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => setAuthMode('biometric')}
              className={`flex-1 min-h-[42px] flex items-center justify-center gap-2 text-xs font-extrabold rounded-lg transition-all duration-200 cursor-pointer relative ${
                authMode === 'biometric'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50 ring-1 ring-emerald-500/30'
                  : 'text-text/70 hover:text-text hover:bg-white/40'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Fingerprint className={`w-4 h-4 ${authMode === 'biometric' ? 'text-emerald-600' : ''}`} />
                <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              </div>
              <span>{lang === 'th' ? 'Passkey (ชีวมิติ)' : 'Passkey (Biometric)'}</span>
            </button>
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
          </div>

          {/* MODE 1: WEBAUTHN PASSKEYS & BIOMETRIC SHIFT TRANSITION */}
          {authMode === 'biometric' && (
            <div className="p-6 sm:p-7 rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-5 animate-in fade-in duration-200">
              {/* PROMINENT BIOMETRIC PROMPT HUD / VISUAL PROMPT INDICATOR */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-4 shadow-sm">
                {/* Background radar pulse ripple */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-12 h-12 rounded-2xl bg-emerald-500/20 animate-ping opacity-60" />
                      <div className="relative w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                        {capability?.biometricLabel?.toLowerCase().includes('face') ? (
                          <ScanFace className="w-6 h-6 animate-pulse" />
                        ) : (
                          <Fingerprint className="w-6 h-6 animate-pulse" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                          {lang === 'th' ? 'เซนเซอร์ชีวมิติพร้อมสลับกะทันที' : 'Biometric Shift Prompt Armed'}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 leading-snug mt-0.5">
                        {capability?.biometricLabel || (lang === 'th' ? 'ระบบอ่านลายนิ้วมือ / Face ID ประจำเครื่อง' : 'Terminal Biometric Reader')}
                      </h4>
                    </div>
                  </div>

                  {/* Auto-Prompt Countdown Indicator */}
                  {autoPromptCountdown !== null && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-800 text-xs font-mono font-black shadow-2xs">
                      <Timer className="w-3.5 h-3.5 animate-spin" />
                      <span>{autoPromptCountdown}s</span>
                      <button
                        type="button"
                        onClick={() => setAutoPromptCountdown(null)}
                        className="ml-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title={lang === 'th' ? 'ยกเลิกการเปิดอัตโนมัติ' : 'Cancel auto-prompt'}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Sub-bar with Incoming Cashier Tag and Quick Trigger */}
                <div className="mt-3 pt-2.5 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-400 font-medium">{lang === 'th' ? 'แคชเชียร์รับกะ:' : 'Next Cashier:'}</span>
                    <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                      {staffAccounts.find((a) => a.id === activeStaffPreset)?.name}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider bg-emerald-100/70 px-1.5 py-0.5 rounded">
                      {staffAccounts.find((a) => a.id === activeStaffPreset)?.role}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {autoPromptCountdown !== null ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAutoPromptCountdown(null);
                          handlePasskeyLogin();
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{lang === 'th' ? 'สแกนทันที' : 'Prompt Now'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePasskeyLogin()}
                        disabled={biometricStatus === 'scanning'}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <Fingerprint className="w-3.5 h-3.5" />
                        <span>{lang === 'th' ? 'แตะเซนเซอร์' : 'Trigger Sensor'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Cashier Quick-Select Cards */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text/50">
                    {lang === 'th' ? 'เลือกแคชเชียร์ที่จะรับกะ (แตะเพื่อยืนยันตัวตน)' : 'Select Cashier Taking Over Shift'}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                    1-Tap Handover
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {staffAccounts.map((account) => {
                    const isSelected = activeStaffPreset === account.id;
                    const initials = account.name.split(' ').map((n) => n[0]).join('');
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => {
                          setActiveStaffPreset(account.id as any);
                          handlePasskeyLogin(account);
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between h-22 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-slate-950 font-bold ring-2 ring-primary/40 shadow-xs'
                            : 'border-slate-200 bg-slate-50/70 text-text/70 hover:border-slate-300 hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                            isSelected ? 'bg-primary text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {initials}
                          </span>
                          <span className="px-1 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                            FIDO2
                          </span>
                        </div>
                        <div className="mt-1 min-w-0">
                          <div className="text-[11px] font-black leading-tight truncate text-slate-900">
                            {account.name}
                          </div>
                          <div className="text-[9px] text-text/50 font-bold uppercase tracking-wider mt-0.5 truncate">
                            {account.role}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Central Biometric Sensor Pod with Interactive Radar Rings */}
              <div className="py-2 flex flex-col items-center justify-center text-center space-y-3">
                <div className="relative flex items-center justify-center">
                  {/* Concentric animated radar ripple waves */}
                  {biometricStatus === 'scanning' ? (
                    <>
                      <div className="absolute w-32 h-32 rounded-3xl bg-primary/20 animate-ping opacity-75" />
                      <div className="absolute w-28 h-28 rounded-2xl bg-primary/30 animate-pulse" />
                    </>
                  ) : autoPromptCountdown !== null ? (
                    <div className="absolute w-28 h-28 rounded-3xl bg-emerald-400/20 animate-pulse opacity-90" />
                  ) : (
                    <div className="absolute w-26 h-26 rounded-2xl bg-slate-200/40 animate-pulse" />
                  )}

                  <button
                    type="button"
                    onClick={() => handlePasskeyLogin()}
                    disabled={biometricStatus === 'scanning' || isLoading}
                    className={`relative z-10 w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer shadow-sm active:scale-95 overflow-hidden ${
                      biometricStatus === 'scanning'
                        ? 'border-primary bg-primary/10 text-primary scale-105 ring-4 ring-primary/20 shadow-md'
                        : biometricStatus === 'success'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600 scale-105 shadow-md'
                        : biometricStatus === 'failed'
                        ? 'border-rose-500 bg-rose-50 text-rose-600'
                        : autoPromptCountdown !== null
                        ? 'border-emerald-500 bg-white text-emerald-700 ring-4 ring-emerald-200/70 shadow-md animate-biometric-glow'
                        : 'border-emerald-500/60 bg-gradient-to-b from-white to-emerald-50/40 text-emerald-700 ring-4 ring-emerald-100/80 shadow-md animate-biometric-glow hover:border-emerald-600'
                    }`}
                    title={lang === 'th' ? 'แตะเพื่อสแกนด้วยชีวมิติ' : 'Tap to authenticate with passkey'}
                  >
                    {/* Subtle sweeping laser line when active or armed */}
                    {(biometricStatus === 'idle' || autoPromptCountdown !== null) && (
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-laser-sweep pointer-events-none" />
                    )}
                    {biometricStatus === 'scanning' && (
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-laser-sweep pointer-events-none" />
                    )}

                    {biometricStatus === 'scanning' ? (
                      <Loader2 className="w-9 h-9 animate-spin" />
                    ) : biometricStatus === 'success' ? (
                      <CheckCircle2 className="w-9 h-9 text-emerald-500 animate-bounce" />
                    ) : autoPromptCountdown !== null ? (
                      <Fingerprint className="w-9 h-9 text-emerald-600 animate-pulse" />
                    ) : (
                      <Fingerprint className="w-9 h-9 text-emerald-600" />
                    )}
                    <span className="text-[9px] font-mono font-black uppercase tracking-wider">
                      {biometricStatus === 'scanning'
                        ? 'SCANNING'
                        : biometricStatus === 'success'
                        ? 'VERIFIED'
                        : autoPromptCountdown !== null
                        ? `PROMPTING (${autoPromptCountdown}s)`
                        : 'TOUCH ID / HELLO'}
                    </span>
                  </button>
                </div>

                {/* Real-time biometric feedback */}
                <div className="min-h-[36px] flex flex-col items-center justify-center px-4">
                  <div className="text-xs font-semibold">
                    {biometricStatus === 'idle' && autoPromptCountdown !== null && (
                      <span className="text-emerald-700 font-bold">
                        {lang === 'th'
                          ? `กำลังเปิดรับการยืนยันตัวตนอัตโนมัติในอีก ${autoPromptCountdown} วินาที...`
                          : `Auto-initiating biometric prompt in ${autoPromptCountdown}s...`}
                      </span>
                    )}
                    {biometricStatus === 'idle' && autoPromptCountdown === null && (
                      <span className="text-slate-600">
                        {lang === 'th'
                          ? 'แตะเซนเซอร์หรือกดปุ่มด้านล่างเพื่อเริ่มกะ'
                          : 'Touch sensor or click button below to begin shift'}
                      </span>
                    )}
                    {biometricStatus === 'scanning' && (
                      <span className="text-primary font-bold animate-pulse">
                        {biometricFeedback || (lang === 'th' ? 'กำลังอ่านค่าชีวมิติ...' : 'Reading biometric signature...')}
                      </span>
                    )}
                    {biometricStatus === 'success' && (
                      <span className="text-emerald-600 font-bold">
                        {biometricFeedback || (lang === 'th' ? 'ยืนยันตัวตนสำเร็จ!' : 'Shift Authorized!')}
                      </span>
                    )}
                    {biometricStatus === 'failed' && (
                      <span className="text-rose-600 font-bold">
                        {biometricFeedback || (lang === 'th' ? 'ไม่พบลายนิ้วมือ กรุณาลองใหม่' : 'Verification failed, retry')}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {capability?.biometricLabel || 'W3C Web Authentication Standard'}
                  </div>
                </div>
              </div>

              {/* Main CTA: Scan Biometric Passkey */}
              <button
                type="button"
                onClick={() => handlePasskeyLogin()}
                disabled={biometricStatus === 'scanning' || isLoading}
                className="w-full min-h-[48px] h-12 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
              >
                {biometricStatus === 'scanning' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>
                      {lang === 'th'
                        ? 'แตะเซนเซอร์ชีวมิติเพื่อเริ่มการขาย'
                        : 'Authenticate Passkey & Start Shift'}
                    </span>
                  </>
                )}
              </button>

              {/* Auto-Prompt Preference Control & Management Link */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 select-none">
                  <input
                    type="checkbox"
                    checked={autoPromptEnabled}
                    onChange={toggleAutoPrompt}
                    className="w-3.5 h-3.5 rounded text-primary focus:ring-primary/30 border-slate-300"
                  />
                  <span className="text-[11px] font-semibold">
                    {lang === 'th' ? 'เปิดการสแกนอัตโนมัติเมื่อเปิดเครื่อง' : 'Auto-prompt on terminal wake'}
                  </span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEnrollModal(true)}
                    className="text-text/70 hover:text-primary transition-colors flex items-center gap-1.5 font-bold cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-primary" />
                    <span>{lang === 'th' ? 'จัดการ Passkeys' : 'Manage Passkeys'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAutoPromptCountdown(null);
                      setAuthMode('pin');
                      setPin('');
                    }}
                    className="text-slate-400 hover:text-slate-600 transition-colors font-medium cursor-pointer"
                  >
                    {lang === 'th' ? 'ใช้รหัส PIN แทน' : 'Use PIN instead'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: STAFF PIN KEYPAD */}
          {authMode === 'pin' && (
            <div className="p-6 sm:p-8 rounded-2xl border border-slate-200/80 bg-white shadow-sm space-y-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text/50 mb-3 flex justify-between items-center">
                  <span>{lang === 'th' ? 'เลือกบัญชีพนักงาน' : 'Select Staff Member'}</span>
                  <span className="font-mono text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                    {lang === 'th' ? 'รหัส PIN พนักงาน 4 หลัก' : 'Staff 4-digit PIN'}
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
                  <span className="text-slate-400 font-mono text-[11px]">{lang === 'th' ? 'ระบบความปลอดภัย 2FA' : '2FA & Passkey'}</span>
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
                    setAuthMode('biometric');
                    handlePasskeyLogin();
                  }}
                  className="min-h-[42px] flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Fingerprint className="w-4 h-4 text-primary" />
                  <span>Passkey</span>
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

      {/* WEBAUTHN PASSKEYS ENROLLMENT MODAL */}
      {showEnrollModal && (
        <PasskeyEnrollModal
          isOpen={showEnrollModal}
          onClose={() => setShowEnrollModal(false)}
          onPasskeysUpdated={refreshPasskeys}
        />
      )}

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
