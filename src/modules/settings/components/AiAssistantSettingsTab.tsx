import React, { useState } from 'react';
import { Bot, CheckCircle2, Key, RefreshCw, Send, Sliders } from 'lucide-react';
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
  const [prompt, setPrompt] = useState(isThai ? 'สรุปแนวโน้มยอดขายของร้านแบบสั้นๆ' : 'Summarize the store sales trend briefly.');
  const [response, setResponse] = useState('');
  const [testing, setTesting] = useState(false);

  const save = () => {
    aiService.saveConfig(config);
    addToast({ title: isThai ? 'บันทึกสำเร็จ' : 'Saved', message: isThai ? 'บันทึกการตั้งค่า OpenRouter แล้ว' : 'OpenRouter settings saved.', type: 'success' });
  };

  const reset = () => {
    setConfig(DEFAULT_AI_CONFIG);
    aiService.saveConfig(DEFAULT_AI_CONFIG);
    addToast({ title: isThai ? 'รีเซ็ตแล้ว' : 'Reset', message: isThai ? 'คืนค่า OpenRouter เริ่มต้นแล้ว' : 'OpenRouter defaults restored.', type: 'info' });
  };

  const testConnection = async () => {
    if (!config.apiKey.trim()) {
      addToast({ title: isThai ? 'ต้องมี API Key' : 'API Key required', message: isThai ? 'กรุณาระบุ OpenRouter API Key' : 'Enter an OpenRouter API key first.', type: 'warning' });
      return;
    }
    setTesting(true);
    setResponse('');
    try {
      const result = await aiService.chatCompletion([
        { role: 'system', content: 'You are a helpful assistant for a retail POS system.' },
        { role: 'user', content: prompt },
      ], config);
      setResponse(result);
      addToast({ title: isThai ? 'เชื่อมต่อสำเร็จ' : 'Connected', message: isThai ? 'OpenRouter ตอบกลับสำเร็จ' : 'OpenRouter responded successfully.', type: 'success' });
    } catch (error) {
      setResponse(error instanceof Error ? error.message : String(error));
      addToast({ title: isThai ? 'เชื่อมต่อล้มเหลว' : 'Connection failed', message: error instanceof Error ? error.message : String(error), type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>OpenRouter AI Assistant</CardTitle>
              <CardDescription>{isThai ? 'AI endpoint สำหรับฟีเจอร์ผู้ช่วยของ POS' : 'AI endpoint used by POS assistant features'}</CardDescription>
            </div>
            <Badge variant="success">OpenRouter</Badge>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">API Endpoint</label>
            <input value={config.endpoint} onChange={(e) => setConfig({ ...config, endpoint: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium"><Key className="h-4 w-4" />OpenRouter API Key</label>
            <input type="password" value={config.apiKey} onChange={(e) => setConfig({ ...config, apiKey: e.target.value })} placeholder="sk-or-v1-..." className="w-full rounded-lg border px-3 py-2 font-mono text-sm" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium"><Bot className="h-4 w-4" />Model</label>
              <input value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })} placeholder="openrouter/auto" className="w-full rounded-lg border px-3 py-2 font-mono text-sm" />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium"><Sliders className="h-4 w-4" />Temperature: {config.temperature}</label>
              <input type="range" min="0" max="1" step="0.1" value={config.temperature} onChange={(e) => setConfig({ ...config, temperature: Number(e.target.value) })} className="w-full" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={reset}><RefreshCw className="mr-1.5 h-4 w-4" />{isThai ? 'ค่าเริ่มต้น' : 'Defaults'}</Button>
            <Button variant="primary" size="sm" onClick={save}><CheckCircle2 className="mr-1.5 h-4 w-4" />{isThai ? 'บันทึก' : 'Save'}</Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>{isThai ? 'ทดสอบ OpenRouter' : 'Test OpenRouter'}</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <Button variant="outline" size="sm" onClick={testConnection} disabled={testing}><Send className="mr-1.5 h-4 w-4" />{testing ? (isThai ? 'กำลังทดสอบ...' : 'Testing...') : (isThai ? 'ทดสอบการเชื่อมต่อ' : 'Test connection')}</Button>
          {response && <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">{response}</pre>}
        </CardBody>
      </Card>
    </div>
  );
};
