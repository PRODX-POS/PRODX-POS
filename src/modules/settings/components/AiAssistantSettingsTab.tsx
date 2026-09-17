import React, { useState } from 'react';
import { Sparkles, Bot, Sliders, CheckCircle2, AlertCircle, Send, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { useToast } from '../../../context/ToastContext';
import { useLanguage } from '../../../context/LanguageContext';
import { aiService, AiConfig, DEFAULT_AI_CONFIG } from '../../../services/aiService';

export const AiAssistantSettingsTab: React.FC = () => {
  const { addToast } = useToast();
  const { language } = useLanguage();
  const isThai = language === 'th';
  const [config, setConfig] = useState<AiConfig>(() => aiService.getConfig());
  const [testPrompt, setTestPrompt] = useState(isThai ? 'สวัสดีครับ ขอทราบสโลแกนสั้นๆ สำหรับร้านกาแฟคุณภาพหน่อยครับ' : 'Hello! Suggest a short catchy slogan for a premium coffee shop.');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = () => {
    setConfig(aiService.saveConfig(config));
    addToast({ title: isThai ? 'บันทึกการตั้งค่า AI สำเร็จ' : 'AI Settings Saved', message: isThai ? 'AI ใช้ OpenRouter ผ่าน backend ที่ยืนยันตัวตนแล้ว' : 'AI uses OpenRouter through the authenticated backend.', type: 'success' });
  };

  const handleReset = () => {
    setConfig(DEFAULT_AI_CONFIG);
    aiService.saveConfig(DEFAULT_AI_CONFIG);
    addToast({ title: isThai ? 'รีเซ็ตเป็นค่าเริ่มต้น' : 'Reset to Default', message: isThai ? 'ใช้ OpenRouter ค่าเริ่มต้นของระบบแล้ว' : 'System OpenRouter defaults restored.', type: 'info' });
  };

  const handleTestConnection = async () => {
    setIsTesting(true); setTestStatus('idle'); setTestResponse('');
    try {
      const response = await aiService.chatCompletion([
        { role: 'system', content: 'You are a helpful AI assistant for a retail POS system.' },
        { role: 'user', content: testPrompt },
      ], config);
      setTestResponse(response); setTestStatus('success');
      addToast({ title: isThai ? 'เชื่อมต่อ AI สำเร็จ!' : 'AI Connected Successfully!', message: isThai ? 'backend ได้รับคำตอบจาก OpenRouter แล้ว' : 'The backend received a response from OpenRouter.', type: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI request failed.';
      setTestResponse(message); setTestStatus('error');
      addToast({ title: isThai ? 'การเชื่อมต่อล้มเหลว' : 'Connection Failed', message, type: 'error' });
    } finally { setIsTesting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/15"><Sparkles className="h-6 w-6 text-amber-300" /></div>
            <div>
              <div className="flex items-center gap-2"><h2 className="text-lg sm:text-xl font-bold">{isThai ? 'OpenRouter AI Assistant' : 'OpenRouter AI Assistant'}</h2><Badge variant="success">Backend Managed</Badge></div>
              <p className="mt-1 text-xs sm:text-sm text-slate-300">{isThai ? 'AI ทำงานผ่าน PRODX backend และ OpenRouter โดยไม่ส่ง provider API key ไปยัง browser' : 'AI runs through the PRODX backend and OpenRouter; provider API keys never reach the browser.'}</p>
            </div>
          </div>
          <div className="flex gap-2"><Button variant="outline" size="sm" onClick={handleReset}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />{isThai ? 'ค่าเริ่มต้น' : 'Default'}</Button><Button variant="primary" size="sm" onClick={handleSave}><CheckCircle2 className="h-4 w-4 mr-1.5" />{isThai ? 'บันทึก' : 'Save'}</Button></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Card>
            <CardHeader><CardTitle>{isThai ? 'การตั้งค่า OpenRouter' : 'OpenRouter Settings'}</CardTitle><CardDescription>{isThai ? 'Provider credential ถูกจัดการฝั่ง server เท่านั้น' : 'Provider credentials are managed server-side only.'}</CardDescription></CardHeader>
            <CardBody className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">{isThai ? 'Endpoint' : 'Endpoint'}</label><input readOnly value={config.endpoint} className="w-full px-3.5 py-2.5 rounded-lg border bg-slate-50 text-slate-600 text-sm font-mono" /></div>
              <div><label className="block text-sm font-medium mb-1"><span className="flex items-center gap-1.5"><Bot className="h-4 w-4" />{isThai ? 'โมเดล OpenRouter' : 'OpenRouter Model'}</span></label><input type="text" value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })} placeholder="openrouter/free" className="w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm font-mono" /></div>
              <div><label className="block text-sm font-medium mb-1"><span className="flex items-center justify-between"><span className="flex items-center gap-1.5"><Sliders className="h-4 w-4" />{isThai ? 'Temperature' : 'Temperature'}</span><span className="font-mono text-indigo-600">{config.temperature}</span></span></label><input type="range" min="0" max="1" step="0.1" value={config.temperature} onChange={(e) => setConfig({ ...config, temperature: Number(e.target.value) })} className="w-full" /></div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{isThai ? 'API key ของ OpenRouter ไม่สามารถตั้งค่าหรือเก็บใน browser ได้ ต้องกำหนด OPENROUTER_API_KEY เป็น deployment secret ของ backend' : 'OpenRouter API keys cannot be entered or stored in the browser. Configure OPENROUTER_API_KEY as a backend deployment secret.'}</div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card className="h-full flex flex-col"><CardHeader><CardTitle>{isThai ? 'ทดสอบ AI' : 'AI Connection Test'}</CardTitle><CardDescription>{isThai ? 'ทดสอบผ่าน authenticated backend' : 'Test through the authenticated backend.'}</CardDescription></CardHeader><CardBody className="flex-1 flex flex-col space-y-4">
            <textarea rows={4} value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} className="w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm" />
            <Button variant="primary" onClick={handleTestConnection} disabled={isTesting}>{isTesting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{isThai ? 'กำลังทดสอบ...' : 'Testing...'}</> : <><Send className="h-4 w-4 mr-2" />{isThai ? 'ทดสอบ OpenRouter' : 'Test OpenRouter'}</>}</Button>
            <div className={`flex-1 min-h-[160px] p-3.5 rounded-xl border text-sm whitespace-pre-wrap overflow-y-auto ${testStatus === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : testStatus === 'success' ? 'border-emerald-200 bg-emerald-50 text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
              {testStatus === 'error' && <AlertCircle className="inline h-4 w-4 mr-1" />}{testResponse || (isThai ? 'กดทดสอบเพื่อเรียก AI ผ่าน backend' : 'Run a test to call AI through the backend.')}
            </div>
          </CardBody></Card>
        </div>
      </div>
    </div>
  );
};
