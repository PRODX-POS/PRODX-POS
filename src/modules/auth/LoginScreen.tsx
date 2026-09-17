import React, { FormEvent, useMemo, useState } from 'react';
import { Lock, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { ProdxLogo } from '../../components/common/ProdxLogo';

type AuthMode = 'credentials' | 'pin';

/**
 * Production login boundary.
 *
 * Authentication authority lives on the server. This screen deliberately does
 * not contain seeded credentials, QR bearer tokens, client-only 2FA checks, or
 * browser-side biometric authorization. Those mechanisms require server
 * contracts before they can be exposed as authentication methods.
 */
export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { language: lang, setLanguage: setLang } = useLanguage();
  const { addToast } = useToast();

  const [authMode, setAuthMode] = useState<AuthMode>('credentials');
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');

  const organizationSlug = import.meta.env.VITE_PRODX_ORGANIZATION_SLUG ?? '';
  const storeCode = import.meta.env.VITE_PRODX_STORE_CODE ?? '';
  const registerId = import.meta.env.VITE_PRODX_REGISTER_ID ?? '';

  const configurationReady = useMemo(
    () => Boolean(organizationSlug && storeCode && registerId),
    [organizationSlug, storeCode, registerId],
  );

  const submitLogin = async (event?: FormEvent) => {
    event?.preventDefault();

    if (!configurationReady) {
      addToast({
        title: lang === 'th' ? 'ยังไม่ได้ตั้งค่าเครื่อง' : 'Terminal not configured',
        message:
          lang === 'th'
            ? 'กรุณาตั้งค่า organization, store และ register ของเครื่องก่อนเข้าสู่ระบบ'
            : 'This terminal is missing its organization, store, or register configuration.',
        type: 'error',
      });
      return;
    }

    const normalizedUsername = username.trim();
    const normalizedSecret = secret.trim();

    if (!normalizedUsername || !normalizedSecret) {
      addToast({
        title: lang === 'th' ? 'ข้อมูลไม่ครบถ้วน' : 'Missing credentials',
        message:
          lang === 'th'
            ? 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน/PIN'
            : 'Enter your username and password/PIN.',
        type: 'error',
      });
      return;
    }

    if (authMode === 'pin' && !/^\d{4,12}$/.test(normalizedSecret)) {
      addToast({
        title: lang === 'th' ? 'PIN ไม่ถูกต้อง' : 'Invalid PIN',
        message:
          lang === 'th'
            ? 'PIN ต้องเป็นตัวเลข 4–12 หลัก และจะถูกตรวจสอบโดยเซิร์ฟเวอร์'
            : 'PIN must contain 4–12 digits and is verified by the server.',
        type: 'error',
      });
      return;
    }

    try {
      await login({
        organizationSlug,
        storeCode,
        registerId,
        emailOrPin: normalizedUsername,
        passwordOrPin: normalizedSecret,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      addToast({
        title: lang === 'th' ? 'เข้าสู่ระบบไม่สำเร็จ' : 'Authentication failed',
        message,
        type: 'error',
      });
      setSecret('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <ProdxLogo />
          <button
            type="button"
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900"
          >
            {lang === 'th' ? 'EN' : 'TH'}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="mb-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold">
              {lang === 'th' ? 'เข้าสู่ระบบ POS' : 'Sign in to POS'}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {lang === 'th'
                ? 'บัญชีและสิทธิ์ถูกตรวจสอบโดยเซิร์ฟเวอร์ของร้านที่กำหนดให้เครื่องนี้'
                : 'Your account and permissions are verified by the authoritative store server.'}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('credentials');
                setSecret('');
              }}
              className={`rounded-md px-3 py-2 text-sm ${authMode === 'credentials' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              {lang === 'th' ? 'รหัสผ่าน' : 'Password'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('pin');
                setSecret('');
              }}
              className={`rounded-md px-3 py-2 text-sm ${authMode === 'pin' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              PIN
            </button>
          </div>

          <form onSubmit={submitLogin} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">
                {lang === 'th' ? 'อีเมล / ชื่อผู้ใช้' : 'Email / username'}
              </span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 outline-none focus:border-slate-500"
                  placeholder={lang === 'th' ? 'บัญชีที่องค์กรจัดให้' : 'Provisioned account'}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">
                {authMode === 'pin' ? 'PIN' : lang === 'th' ? 'รหัสผ่าน' : 'Password'}
              </span>
              <input
                type="password"
                inputMode={authMode === 'pin' ? 'numeric' : 'text'}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                autoComplete="current-password"
                maxLength={authMode === 'pin' ? 12 : 256}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-slate-500"
                placeholder={authMode === 'pin' ? '••••' : '••••••••'}
              />
            </label>

            <button
              type="submit"
              disabled={isLoading || !configurationReady}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              {isLoading
                ? lang === 'th'
                  ? 'กำลังตรวจสอบ...'
                  : 'Authenticating...'
                : lang === 'th'
                  ? 'เข้าสู่ระบบ'
                  : 'Sign in'}
            </button>
          </form>

          {!configurationReady && (
            <div className="mt-5 rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-sm text-amber-200">
              {lang === 'th'
                ? 'เครื่องนี้ยังไม่มี configuration ของ organization/store/register จึงไม่อนุญาตให้เข้าสู่ระบบ'
                : 'This terminal is not configured with an organization, store, and register; sign-in is disabled.'}
            </div>
          )}

          <div className="mt-5 text-xs leading-5 text-slate-500">
            {lang === 'th'
              ? 'ไม่มีบัญชีทดลอง, PIN เริ่มต้น, QR token หรือการยืนยัน 2FA/biometric แบบ client-side ใน production login นี้'
              : 'No demo accounts, default PINs, QR bearer tokens, or client-only 2FA/biometric authorization are used by this production login.'}
          </div>
        </div>
      </div>
    </div>
  );
};
