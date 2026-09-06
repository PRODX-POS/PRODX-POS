import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Lock, ShieldAlert, Delete, LogOut, ArrowRight, UserCheck } from 'lucide-react';
import { ProdxLogo } from '../common/ProdxLogo';

export const LockScreenModal: React.FC = () => {
  const { session, unlockSystem, logout, isLocked } = useAuth();
  const { language } = useLanguage();
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isLocked || !session) return null;

  const handleDigit = (digit: string) => {
    if (pinInput.length < 8) {
      setPinInput((prev) => prev + digit);
      setErrorMsg('');
    }
  };

  const handleDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMsg('');
  };

  const handleUnlock = async () => {
    if (!pinInput) {
      setErrorMsg(language === 'th' ? 'กรุณากรอกรหัส PIN หรือรหัสพนักงาน' : 'Please enter PIN or Employee Code');
      return;
    }
    setIsUnlocking(true);
    setErrorMsg('');
    try {
      const success = await unlockSystem(pinInput);
      if (success) {
        setPinInput('');
      } else {
        setErrorMsg(
          language === 'th'
            ? 'รหัสไม่ถูกต้อง (ลองใช้ PIN เริ่มต้น: 1234 หรือ EMP-108)'
            : 'Invalid PIN or Code (Try default PIN: 1234 or EMP-108)'
        );
      }
    } catch {
      setErrorMsg(language === 'th' ? 'เกิดข้อผิดพลาดในการปลดล็อก' : 'Unlock verification error');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200 bg-slate-950/70 backdrop-blur-sm">
      <div className="relative z-10 w-full max-w-md rounded-lg bg-card border border-border border-crisp shadow-xl p-6 sm:p-7 flex flex-col items-center text-center">
        {/* Top Lock Badge */}
        <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs mb-3.5">
          <Lock className="h-6 w-6" />
        </div>

        {/* Brand & Title */}
        <div className="mb-2">
          <ProdxLogo variant="horizontal" size="sm" showTagline={false} />
        </div>
        <h2 className="text-base font-semibold text-text tracking-tight mt-1">
          {language === 'th' ? 'หน้าจอถูกล็อกชั่วคราว' : 'Terminal Locked'}
        </h2>
        <p className="text-xs text-text/60 mt-1 max-w-xs leading-relaxed">
          {language === 'th'
            ? 'เนื่องจากไม่มีการใช้งานระบบตามเวลาที่กำหนด กรุณากรอกรหัสเพื่อปลดล็อก'
            : 'Terminal locked due to inactivity timeout. Enter your PIN or Employee Code to resume.'}
        </p>

        {/* Current User Info */}
        <div className="my-4 w-full p-3 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 border border-border border-crisp flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100/60 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200/50 dark:border-blue-800/50">
            {session.currentUser.name.charAt(0)}
          </div>
          <div className="text-left min-w-0 flex-1">
            <div className="font-semibold text-xs sm:text-sm text-text truncate">
              {session.currentUser.name}
            </div>
            <div className="text-xs text-text/60 flex items-center gap-2 mt-0.5">
              <span className="capitalize px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-semibold text-[10px] border border-blue-200/50 dark:border-blue-800/50">
                {session.currentUser.role}
              </span>
              <span className="font-mono text-[11px]">{session.currentUser.employeeCode}</span>
            </div>
          </div>
          <div className="text-right shrink-0 font-mono text-xs text-text/40">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* PIN Input Indicator */}
        <div className="w-full mb-3.5">
          <div className="flex items-center justify-center gap-3 h-11 rounded-lg bg-background/80 border border-border border-crisp px-4 font-mono text-xl tracking-widest text-text">
            {pinInput ? pinInput.replace(/./g, '•') : <span className="text-xs text-text/50 tracking-normal font-sans">{language === 'th' ? 'กรอกรหัส PIN (เช่น 1234)' : 'Enter PIN (e.g. 1234)'}</span>}
          </div>
          {errorMsg && (
            <div className="mt-2 text-xs font-medium text-rose-500 dark:text-rose-400 flex items-center justify-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* PIN Keypad */}
        <div className="grid grid-cols-3 gap-2 w-full mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((btn) => (
            <button
              key={btn}
              type="button"
              onClick={() => {
                if (btn === 'C') handleClear();
                else if (btn === 'DEL') handleDelete();
                else handleDigit(btn);
              }}
              className="h-11 min-h-[44px] rounded-lg bg-card border border-border border-crisp hover:bg-background text-text font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center active:scale-95"
            >
              {btn === 'DEL' ? <Delete className="h-4 w-4" /> : btn}
            </button>
          ))}
        </div>

        {/* Unlock Action Button */}
        <div className="w-full flex flex-col gap-2">
          <button
            type="button"
            onClick={handleUnlock}
            disabled={isUnlocking || !pinInput}
            className="w-full h-11 min-h-[44px] rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm transition-colors active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <span>{language === 'th' ? 'ปลดล็อกหน้าจอ' : 'Unlock Terminal'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full h-9 min-h-[36px] rounded-lg bg-transparent hover:bg-background/80 text-text/60 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 text-rose-500" />
            <span>{language === 'th' ? 'ออกจากระบบแทน' : 'Sign out instead'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
