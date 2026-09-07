/**
 * PRODX POS - Global Error Recovery Provider
 * 
 * Intercepts unhandled rendering exceptions across the application and provides
 * a robust enterprise recovery screen featuring a one-click 'Force Reload and Clear Local Cache' mechanism.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  ShieldAlert,
  RotateCcw,
  Trash2,
  RefreshCw,
  Terminal,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { ProdxLogo } from '../components/common/ProdxLogo';

interface GlobalErrorRecoveryProps {
  children: ReactNode;
  /** Optional fallback component or function */
  fallback?: ReactNode | ((error: Error, reset: () => void, clearAndReload: () => void) => ReactNode);
  /** Optional callback fired when recovery action is executed */
  onRecover?: () => void;
}

interface GlobalErrorRecoveryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
  isClearing: boolean;
}

export class GlobalErrorRecoveryProvider extends Component<
  GlobalErrorRecoveryProps,
  GlobalErrorRecoveryState
> {
  constructor(props: GlobalErrorRecoveryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
      isClearing: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<GlobalErrorRecoveryState> {
    return {
      hasError: true,
      error,
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console and store crash diagnostics
    console.error('[PRODX GlobalErrorRecoveryProvider] Unhandled Exception Caught:', error, errorInfo);

    try {
      const crashLog = {
        id: `global_crash_${Date.now()}`,
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
      };

      const existing = localStorage.getItem('prodx_crash_logs');
      const logs = existing ? JSON.parse(existing) : [];
      logs.unshift(crashLog);
      localStorage.setItem('prodx_crash_logs', JSON.stringify(logs.slice(0, 10)));
    } catch {
      // Ignore storage errors during crash handling
    }
  }

  public handleResetBoundary = (): void => {
    if (this.props.onRecover) {
      this.props.onRecover();
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  /**
   * One-click 'Force Reload and Clear Local Cache' mechanism
   */
  public handleForceReloadAndClearCache = (): void => {
    this.setState({ isClearing: true });

    try {
      // 1. Clear application local storage caches (preserving safe tokens if needed or clearing all for pristine state)
      localStorage.clear();
      sessionStorage.clear();

      // 2. Clear service worker caches if supported
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        }).catch(() => {});
      }
    } catch (e) {
      console.error('[GlobalErrorRecovery] Failed to clear local cache:', e);
    }

    // 3. Force hard page reload to reset all React state and modules
    setTimeout(() => {
      window.location.href = window.location.origin + window.location.pathname;
    }, 350);
  };

  private copyErrorReport = (): void => {
    const { error, errorInfo } = this.state;

    const report = `[PRODX Global Critical Crash Report]
Time: ${new Date().toLocaleString()}
Error: ${error?.name || 'Error'}: ${error?.message || 'Unknown error'}

Stack Trace:
${error?.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}

URL: ${window.location.href}
User Agent: ${navigator.userAgent}`;

    navigator.clipboard.writeText(report).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  public override render(): ReactNode {
    const { hasError, error, errorInfo, showDetails, copied, isClearing } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback(
          error || new Error('Unknown error'),
          this.handleResetBoundary,
          this.handleForceReloadAndClearCache
        );
      }
      return fallback;
    }

    return (
      <div
        id="global-error-recovery-container"
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 sm:p-6 bg-background text-text font-sans selection:bg-primary selection:text-white overflow-y-auto"
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center">
          {/* Logo Header */}
          <div className="mb-4">
            <ProdxLogo variant="full" size="sm" showTagline={true} />
          </div>

          {/* Recovery Card */}
          <div
            id="global-error-recovery-card"
            className="w-full bg-card border border-rose-500/30 dark:border-rose-500/40 rounded-[28px] shadow-2xl p-6 sm:p-8 backdrop-blur-xl"
          >
            {/* Shield Alert Icon */}
            <div className="flex items-center justify-center mb-3.5">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm animate-bounce">
                <ShieldAlert className="h-7 w-7" />
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-text">
              Application Recovery Required
            </h1>
            <p className="text-xs sm:text-sm text-text/70 mt-1.5 leading-relaxed">
              ระบบตรวจพบข้อยกเว้นที่ไม่คาดคิดในสตาคการแสดงผล (Rendering Exception) คุณสามารถกู้คืนระบบได้ทันทีด้วยปุ่มล้างแคชและโหลดใหม่
            </p>

            {/* Error Message Box */}
            <div className="mt-4 p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 text-left text-xs font-mono text-rose-800 dark:text-rose-300 break-words">
              <div className="flex items-center gap-1.5 font-bold mb-1 text-[11px] uppercase tracking-wider text-rose-900 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Runtime Exception:</span>
              </div>
              <div className="line-clamp-3">{error?.message || 'An unexpected rendering error occurred.'}</div>
            </div>

            {/* One-Click Force Reload & Clear Local Cache Mechanism */}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                id="btn-force-reload-clear-cache"
                type="button"
                onClick={this.handleForceReloadAndClearCache}
                disabled={isClearing}
                className="w-full py-3 px-5 rounded-xl font-bold text-white text-xs sm:text-sm bg-rose-600 hover:bg-rose-700 active:scale-[0.99] shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {isClearing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>
                  {isClearing
                    ? 'กำลังล้างแคชและรีเซ็ตระบบ...'
                    : 'Force Reload & Clear Local Cache (กู้คืนระบบด่วน)'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-soft-reset"
                  type="button"
                  onClick={this.handleResetBoundary}
                  className="py-2.5 px-3 rounded-xl font-bold text-text text-xs bg-background hover:bg-background/80 border border-border border-crisp active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>ลองใหม่ (Soft Reset)</span>
                </button>

                <button
                  id="btn-copy-error-report"
                  type="button"
                  onClick={this.copyErrorReport}
                  className="py-2.5 px-3 rounded-xl font-bold text-text text-xs bg-background hover:bg-background/80 border border-border border-crisp active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-text/60" />
                      <span>คัดลอกรายงาน</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Diagnostic Logs Toggle */}
            <div className="mt-4 pt-4 border-t border-border border-crisp flex items-center justify-between">
              <button
                id="btn-toggle-diagnostics"
                type="button"
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text/60 hover:text-text transition-colors cursor-pointer"
              >
                <Terminal className="h-3.5 w-3.5 text-primary" />
                <span>{showDetails ? 'ซ่อนข้อมูลเชิงลึก' : 'ดูข้อมูลเชิงลึก (Stack Trace)'}</span>
                {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              <span className="text-[10px] font-mono text-text/40">v2.4.0-recovery</span>
            </div>

            {/* Collapsible Stack Trace */}
            {showDetails && (
              <div className="mt-3 p-3 rounded-xl bg-background text-zinc-200 text-left font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto border border-border animate-in fade-in duration-200">
                <div className="text-amber-400 font-bold mb-1">// Component Stack Trace</div>
                <pre className="whitespace-pre-wrap">{errorInfo?.componentStack || 'No component stack.'}</pre>
                <div className="text-amber-400 font-bold mt-2 mb-1">// JavaScript Error Stack</div>
                <pre className="whitespace-pre-wrap">{error?.stack || 'No JS stack available.'}</pre>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 text-[10px] text-text/40 uppercase tracking-widest font-mono">
            PRODX POS ENTERPRISE · GLOBAL ERROR RECOVERY ENGINE
          </div>
        </div>
      </div>
    );
  }
}
