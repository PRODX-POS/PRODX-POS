import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { ProdxLogo } from '../../components/common/ProdxLogo';
import { Fingerprint, Eye, EyeOff } from 'lucide-react';
import { playScannerSound } from '../../services/soundService';
import { analyzePassword } from '../../utils/passwordSecurity';
import { PasswordStrengthMeter } from '../../components/auth/PasswordStrengthMeter';
import { AccountPasswordModal } from '../../components/auth/AccountPasswordModal';
import { checkWebAuthnCapability, WebAuthnCapability } from '../../services/webauthnService';

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { language: lang } = useLanguage();
  const { addToast } = useToast();
  const [authMode, setAuthMode] = useState<'pin' | 'credentials' | 'biometric'>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const storeCode = 'STR-01';
  const registerId = 'REG-01';
  const [pin, setPin] = useState('');
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'failed'>('idle');
  const [biometricFeedback, setBiometricFeedback] = useState('');
  const [capability, setCapability] = useState<WebAuthnCapability | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [showAccountPasswordModal, setShowAccountPasswordModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }));

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    checkWebAuthnCapability().then(setCapability).catch(() => setCapability(null));
  }, []);

  const authenticateWithServer = async (credential: string): Promise<void> => {
    await login({ organizationSlug: 'prodx', storeCode, registerId, emailOrPin: username.trim(), passwordOrPin: credential });
  };

  const handleCredentialsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      addToast({ title: lang === 'th' ? 'ข้อมูลไม่ครบถ้วน' : 'Missing Information', message: lang === 'th' ? 'กรุณากรอกอีเมลและรหัสผ่าน' : 'Enter your email and password.', type: 'error' });
      return;
    }
    const passwordAnalysis = analyzePassword(password, { email: username });
    if (!passwordAnalysis.isPolicyCompliant) {
      addToast({ title: lang === 'th' ? 'คำแนะนำความปลอดภัยรหัสผ่าน' : 'Password Security Advisory', message: lang === 'th' ? 'รหัสผ่านไม่ตรงตามเกณฑ์ความปลอดภัยองค์กร' : 'Password does not meet enterprise security criteria.', type: 'warning' });
    }
    setShow2FA(true);
  };

  const submit2FA = async () => {
    if (twoFactorCode.length !== 6) {
      addToast({ title: lang === 'th' ? 'รหัสไม่ครบ' : 'Incomplete Code', message: lang === 'th' ? 'กรุณากรอกรหัสความปลอดภัย 6 หลัก' : 'Enter the 6-digit security code.', type: 'error' });
      return;
    }
    setIsVerifying2FA(true);
    try {
      await authenticateWithServer(password);
      setShow2FA(false);
      setTwoFactorCode('');
    } catch (error) {
      addToast({ title: lang === 'th' ? 'การยืนยันล้มเหลว' : 'Verification Failed', message: error instanceof Error ? error.message : 'Authentication failed.', type: 'error' });
      setTwoFactorCode('');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4) return;
    playScannerSound('click');
    const nextPin = pin + digit;
    setPin(nextPin);
    if (nextPin.length === 4) void executePinLogin(nextPin);
  };

  const executePinLogin = async (completedPin: string) => {
    if (!username.trim()) {
      setAuthMode('credentials');
      addToast({ title: lang === 'th' ? 'ต้องระบุบัญชี' : 'Account Required', message: lang === 'th' ? 'กรุณาระบุอีเมลบัญชี Authentication Server ก่อนใช้ PIN' : 'Enter the Authentication Server account email before using PIN.', type: 'error' });
      setPin('');
      return;
    }
    try {
      await authenticateWithServer(completedPin);
      playScannerSound('success');
    } catch (error) {
      playScannerSound('error');
      addToast({ title: lang === 'th' ? 'PIN ไม่ถูกต้อง' : 'Invalid PIN', message: error instanceof Error ? error.message : 'The PIN could not be verified.', type: 'error' });
      setPin('');
    }
  };

  const handlePasskeyUnavailable = () => {
    setBiometricStatus('failed');
    setBiometricFeedback(lang === 'th' ? 'Passkey ต้องผ่าน WebAuthn API ฝั่งเซิร์ฟเวอร์และยังไม่เปิดใช้งาน' : 'Passkey requires server-side WebAuthn assertion verification and is not enabled yet.');
    addToast({ title: lang === 'th' ? 'Passkey ยังไม่พร้อม' : 'Passkey Unavailable', message: lang === 'th' ? 'ระบบไม่ใช้ credential ที่สร้างหรือเก็บใน Browser เพื่อยืนยันตัวตน' : 'The browser cannot create or store credentials for authentication.', type: 'warning' });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] text-text font-sans">
      <div className="w-full max-w-md p-5">
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono">TERMINAL {registerId}</span>
          <span className="font-mono">{currentTime}</span>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <ProdxLogo variant="horizontal" size="md" showTagline={true} />
            <h2 className="text-xl font-black text-slate-900 mt-4">{lang === 'th' ? 'เข้าสู่ระบบ' : 'Sign in'}</h2>
            <p className="text-xs text-slate-500 mt-1">{lang === 'th' ? 'Authentication Server เป็นแหล่งยืนยันตัวตนหลัก' : 'The Authentication Server is the credential authority.'}</p>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setAuthMode('pin')} className="flex-1 rounded-lg px-3 py-2 text-xs font-bold border">PIN</button>
            <button type="button" onClick={() => setAuthMode('credentials')} className="flex-1 rounded-lg px-3 py-2 text-xs font-bold border">Password</button>
            <button type="button" onClick={() => setAuthMode('biometric')} className="flex-1 rounded-lg px-3 py-2 text-xs font-bold border">Passkey</button>
          </div>

          {(authMode === 'pin' || authMode === 'credentials') && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Email</label>
                <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="user@prodx.io" />
              </div>
              {authMode === 'pin' && (
                <>
                  <p className="text-xs text-slate-500">{lang === 'th' ? 'PIN จะถูกส่งไปตรวจสอบกับ Authentication Server เท่านั้น' : 'The PIN is verified only by the Authentication Server.'}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['1','2','3','4','5','6','7','8','9','0'].map((digit) => <button key={digit} type="button" onClick={() => handlePinDigit(digit)} className="rounded-lg border py-3 font-mono">{digit}</button>)}
                  </div>
                  <button type="button" onClick={() => setPin('')} className="w-full rounded-lg border py-2 text-xs">{lang === 'th' ? 'ล้าง PIN' : 'Clear PIN'}</button>
                </>
              )}
              {authMode === 'credentials' && (
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">Password</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="w-full rounded-lg border px-3 py-2 pr-10 text-sm" placeholder={lang === 'th' ? 'กรอกรหัสผ่านองค์กร' : 'Enter enterprise password'} />
                      <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-2">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                    {password && <div className="mt-2"><PasswordStrengthMeter analysis={analyzePassword(password, { email: username })} language={lang} showCriteriaList={true} showEntropyInfo={true} compact={false} /></div>}
                  </div>
                  <button disabled={isLoading} className="w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm font-bold">{isLoading ? 'Signing in…' : 'Continue'}</button>
                  <button type="button" onClick={() => setShowAccountPasswordModal(true)} className="w-full text-xs font-bold text-primary">{lang === 'th' ? 'จัดการ / รีเซ็ตรหัสผ่าน' : 'Manage / Reset Password'}</button>
                </form>
              )}
            </div>
          )}

          {authMode === 'biometric' && (
            <div className="space-y-4 text-center">
              <Fingerprint className="w-10 h-10 mx-auto" />
              <button type="button" onClick={handlePasskeyUnavailable} className="w-full rounded-lg bg-slate-900 text-white py-2.5 font-bold">{lang === 'th' ? 'ยืนยันด้วย Passkey' : 'Authenticate with Passkey'}</button>
              <p className="text-xs text-slate-500">{biometricFeedback || (capability?.isSupported ? capability.platformSummary : 'Server-side WebAuthn verification required')}</p>
            </div>
          )}
        </div>
      </div>

      {show2FA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 space-y-4">
            <h3 className="font-black">2FA</h3>
            <input value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="w-full rounded-lg border px-3 py-2" placeholder="000000" />
            <button type="button" disabled={isVerifying2FA} onClick={submit2FA} className="w-full rounded-lg bg-slate-900 text-white py-2">{isVerifying2FA ? 'Verifying…' : 'Verify'}</button>
          </div>
        </div>
      )}

      <AccountPasswordModal isOpen={showAccountPasswordModal} onClose={() => setShowAccountPasswordModal(false)} language={lang} />
    </div>
  );
};
