import React, { useState } from 'react';
import { CheckCircle2, Cpu, Loader2, RefreshCw, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { useToast } from '../../../context/ToastContext';
import { useLanguage } from '../../../context/LanguageContext';
import { aiService, DEFAULT_AI_CONFIG } from '../../../services/aiService';
import type { AiConfig } from '../../../services/aiService';

export const AiAssistantSettingsTab: React.FC = () => {
  const { addToast } = useToast();
  const { language } = useLanguage();
  const isThai = language === 'th';
  const [config, setConfig] = useState<AiConfig>(() => aiService.getConfig());
  const [testPrompt, setTestPrompt] = useState(
    isThai ? 'ช่วยสรุปแนวคิดสั้นๆ สำหรับยกระดับประสบการณ์ลูกค้าในร้าน POS' : 'Suggest one concise idea to improve the POS customer experience.',
  );
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = () => {
    const saved = aiService.saveConfig(config);
    setConfig(saved);
    addToast({
      title: isThai ? 'บันทึกการตั้งค่า AI สำเร็จ' : 'AI Settings Saved',
      message: isThai ? 'การตั้งค่า AI ถูกบันทึกโดยไม่เก็บ provider credentials ในเบราว์เซอร์' : 'AI preferences saved without storing provider credentials in the browser.',
      type: 'success',
    });
  };

  const handleReset = () => {
    const saved = aiService.saveConfig(DEFAULT_AI_CONFIG);
    setConfig(saved);
    addToast({
      title: isThai ? 'รีเซ็ตเป็นค่าเริ่มต้น' : 'Reset to Default',
      message: isThai ? 'คืนค่าการตั้งค่า AI เป็นค่ามาตรฐานแล้ว' : 'AI preferences reset to safe defaults.',
      type: 'info',
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus('idle');
    setTestResponse('');
    try {
      const response = await aiService.chatCompletion(
        [
          { role: 'system', content: 'You are a helpful AI assistant for a retail POS system.' },
          { role: 'user', content: testPrompt },
        ],
        config,
        'assistant',
      );
      setTestResponse(response);
      setTestStatus('success');
      addToast({
        title: isThai ? 'เชื่อมต่อ AI สำเร็จ!' : 'AI Connected Successfully!',
        message: isThai ? 'คำขอถูกส่งผ่าน PRODX AI Control Plane แล้ว' : 'The request was routed through the PRODX AI Control Plane.',
        type: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI request failed.';
      setTestStatus('error');
      setTestResponse(message);
      addToast({
        title: isThai ? 'การเชื่อมต่อล้มเหลว' : 'Connection Failed',
        message,
        type: 'error',
        });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 text-white shadow-md">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md shrink-0">
              <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">PRODX AI Control Plane</h2>
                <Badge variant="success" className="bg-emerald-500 text-white font-bold border-0">Secure</Badge>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {isThai
                  ? 'AI ทุกงานถูกส่งผ่าน backend ที่ยืนยันตัวตนและเลือกโมเดลตาม workload โดยไม่เปิดเผย API key หรือ provider endpoint ให้เบราว์เซอร์'
                  : 'AI workloads are routed through the authenticated backend control plane; provider credentials and endpoints never live in the browser.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Button variant="outline" size="sm" onClick={handleReset} className="bg-slate-800/80 text-slate-200 border-slate-700">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              {isThai ? 'ค่าเริ่มต้น' : 'Reset'}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} className="font-bold">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {isThai ? 'บันทึก' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>{isThai ? 'การตั้งค่า AI' : 'AI Preferences'}</CardTitle>
            <CardDescription>
              {isThai ? 'ตั้งค่าที่ปลอดภัยสำหรับผู้ใช้ โดยไม่ให้เลือก provider/model โดยตรง' : 'Safe user preferences; provider and model selection remain server-controlled.'}
            </CardDescription>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">{isThai ? 'เปิดใช้งาน AI Assistant' : 'Enable AI Assistant'}</div>
                <div className="text-xs text-slate-500 mt-1">{isThai ? 'ปิดได้โดยไม่กระทบธุรกรรม POS หลัก' : 'Disabling AI never blocks core POS transactions.'}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={config.enabled}
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`relative h-7 w-12 rounded-full transition ${config.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${config.enabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">{isThai ? 'ความคิดสร้างสรรค์' : 'Temperature'}</label>
                <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{config.temperature.toFixed(1)}</span>
              </div>
              <input
                aria-label={isThai ? 'ความคิดสร้างสรรค์' : 'Temperature'}
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature}
                onChange={(event) => setConfig({ ...config, temperature: Number(event.target.value) })}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>{isThai ? 'แม่นยำ' : 'Precise'}</span>
                <span>{isThai ? 'สร้างสรรค์' : 'Creative'}</span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/20 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-900 dark:text-emerald-200">{isThai ? 'Provider credentials อยู่ฝั่ง server' : 'Provider credentials stay server-side'}</div>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1 leading-relaxed">
                    {isThai
                      ? 'หน้านี้ไม่มีช่อง API Key, endpoint หรือ model ID อีกต่อไป การเลือกโมเดลถูกควบคุมโดย AI Task Router และ Model Registry'
                      : 'The browser does not store API keys, provider URLs, or raw model IDs. AI Task Router and Model Registry control model selection.'}
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>{isThai ? 'ทดสอบ AI Control Plane' : 'Test AI Control Plane'}</CardTitle>
            <CardDescription>{isThai ? 'ทดสอบผ่าน authenticated backend route' : 'Test through the authenticated backend route.'}</CardDescription>
          </CardHeader>
          <CardBody className="space-y-4">
            <textarea
              value={testPrompt}
              onChange={(event) => setTestPrompt(event.target.value)}
              rows={5}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <Button variant="primary" onClick={handleTestConnection} disabled={isTesting || !config.enabled} className="w-full">
              {isTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {isTesting ? (isThai ? 'กำลังทดสอบ...' : 'Testing...') : (isThai ? 'ทดสอบการเชื่อมต่อ' : 'Test Connection')}
            </Button>
            {testStatus !== 'idle' && (
              <div className={`rounded-xl border p-3 text-sm ${testStatus === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                {testResponse}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isThai ? 'Workloads ที่ AI รองรับ' : 'AI Workloads'}</CardTitle>
          <CardDescription>{isThai ? 'เลือกตามงาน ไม่เลือกโมเดลโดยตรง' : 'Workload-first routing instead of raw model selection.'}</CardDescription>
        </CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Product', 'assistant · explanation · draft'],
            ['Engineering', 'code · refactor · debug · tests'],
            ['Design', 'UX · UI · CSS · accessibility'],
            ['Review', 'code · architecture · security · DB'],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white"><Cpu className="h-4 w-4 text-indigo-500" />{title}</div>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{detail}</p>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
};
