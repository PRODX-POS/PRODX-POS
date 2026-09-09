import React, { useState } from 'react';
import {
  Sparkles,
  Key,
  Globe,
  Bot,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  Cpu,
  RefreshCw,
} from 'lucide-react';
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
  const [testPrompt, setTestPrompt] = useState(
    isThai ? 'สวัสดีครับ ขอทราบสโลแกนสั้นๆ สำหรับร้านกาแฟคุณภาพหน่อยครับ' : 'Hello! Suggest a short catchy slogan for a premium coffee shop.'
  );
  const [testResponse, setTestResponse] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = () => {
    aiService.saveConfig(config);
    addToast({
      title: isThai ? 'บันทึกการตั้งค่า AI สำเร็จ' : 'AI Settings Saved',
      message: isThai ? 'การตั้งค่าการเชื่อมต่อ AI ถูกบันทึกลงระบบแล้ว' : 'AI connection settings have been saved.',
      type: 'success',
    });
  };

  const handleReset = () => {
    setConfig(DEFAULT_AI_CONFIG);
    aiService.saveConfig(DEFAULT_AI_CONFIG);
    addToast({
      title: isThai ? 'รีเซ็ตเป็นค่าเริ่มต้น' : 'Reset to Default',
      message: isThai ? 'คืนค่าการตั้งค่า AI เป็นค่ามาตรฐานแล้ว' : 'Reset AI configuration to default settings.',
      type: 'info',
    });
  };

  const handleTestConnection = async () => {
    if (!config.apiKey.trim()) {
      addToast({
        title: isThai ? 'กรุณากรอก API Key' : 'API Key Required',
        message: isThai ? 'โปรดระบุ Bearer Token / API Key ก่อนทำการทดสอบ' : 'Please provide an API Key before testing.',
        type: 'warning',
      });
      return;
    }

    setIsTesting(true);
    setTestStatus('idle');
    setTestResponse('');

    try {
      const response = await aiService.chatCompletion(
        [
          { role: 'system', content: 'You are a helpful AI assistant for a retail POS system.' },
          { role: 'user', content: testPrompt },
        ],
        config
      );

      setTestResponse(response);
      setTestStatus('success');
      addToast({
        title: isThai ? 'เชื่อมต่อ AI สำเร็จ!' : 'AI Connected Successfully!',
        message: isThai ? 'ระบบสามารถสื่อสารกับ AI API ได้อย่างสมบูรณ์' : 'Successfully received response from the AI API.',
        type: 'success',
      });
    } catch (err: any) {
      setTestStatus('error');
      setTestResponse(err.message || 'Error occurred while contacting AI service');
      addToast({
        title: isThai ? 'การเชื่อมต่อล้มเหลว' : 'Connection Failed',
        message: err.message || 'Failed to connect to AI endpoint',
        type: 'error',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 text-white shadow-md">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md shadow-inner shrink-0">
              <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  {isThai ? 'KKU AI & Gemini Assistant Engine' : 'KKU AI & Gemini Assistant Engine'}
                </h2>
                <Badge variant="success" className="bg-emerald-500 text-white font-bold border-0 shadow-2xs">
                  Ready
                </Badge>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                {isThai
                  ? 'เชื่อมต่อระบบปัญญาประดิษฐ์ (KKU AI / Gemini) เพื่อสรุปวิเคราะห์ยอดขาย, แนะนำสินค้า ณ จุดขาย และบริหารจัดการคลังสินค้าอัจฉริยะ'
                  : 'Connect AI endpoint to power sales insights, cashier recommendations, and smart stock replenishment.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              {isThai ? 'ค่าเริ่มต้น' : 'Default'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="font-bold shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {isThai ? 'บันทึกการตั้งค่า' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form Column */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{isThai ? 'การตั้งค่าการเชื่อมต่อ API' : 'API Connection Settings'}</CardTitle>
                <CardDescription>
                  {isThai ? 'กำหนด Endpoint และ API Key สำหรับเรียกใช้ AI' : 'Configure API endpoint & authentication key'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {/* Endpoint */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-slate-400" />
                    {isThai ? 'API Endpoint URL' : 'API Endpoint URL'}
                  </span>
                </label>
                <input
                  type="text"
                  value={config.endpoint}
                  onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                  placeholder="https://gen.ai.kku.ac.th/okmd/api/v1/chat/completions"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {isThai ? 'ค่าเริ่มต้น: https://gen.ai.kku.ac.th/okmd/api/v1/chat/completions' : 'Standard OpenAI-compatible chat completions endpoint'}
                </p>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <span className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="h-4 w-4 text-amber-500" />
                      {isThai ? 'API Key / Bearer Token' : 'API Key / Bearer Token'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {showApiKey ? (isThai ? 'ซ่อน' : 'Hide') : (isThai ? 'แสดง' : 'Show')}
                    </button>
                  </span>
                </label>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder={isThai ? 'วาง API Key ของคุณที่นี่...' : 'Paste your API Key / Token here...'}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {isThai
                    ? 'API Key จะถูกจัดเก็บอย่างปลอดภัยใน Local Storage ของเครื่องนี้'
                    : 'Stored securely in local application storage for API requests'}
                </p>
              </div>

              {/* Model & Temperature */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Bot className="h-4 w-4 text-indigo-500" />
                      {isThai ? 'โมเดล AI (Model)' : 'AI Model'}
                    </span>
                  </label>
                  <select
                    value={config.model}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (เร็วสุด/ประหยัด)</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro (ฉลาดสูงสุด)</option>
                    <option value="custom">กำหนดเอง (Custom)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="h-4 w-4 text-slate-400" />
                        {isThai ? 'ความคิดสร้างสรรค์ (Temp)' : 'Temperature'}
                      </span>
                      <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                        {config.temperature}
                      </span>
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                    className="w-full mt-2 accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>{isThai ? 'แม่นยำ/ตรงไปตรงมา' : 'Precise'}</span>
                    <span>{isThai ? 'สร้างสรรค์' : 'Creative'}</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Feature Highlights Card */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{isThai ? 'ฟีเจอร์ AI ที่พร้อมใช้งานในระบบ' : 'Enabled AI Features in System'}</CardTitle>
                <CardDescription>
                  {isThai ? 'ความสามารถของ AI ที่เชื่อมต่อกับระบบ POS ปัจจุบัน' : 'System modules enhanced with AI'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 mb-1.5 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                  <Cpu className="h-4 w-4" />
                  {isThai ? '1. Dashboard Insights' : '1. Dashboard Insights'}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {isThai ? 'วิเคราะห์ยอดขาย สรุปกำไร และกลยุทธ์สินค้าขายดี' : 'Sales summaries, revenue patterns & manager recommendations'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 mb-1.5 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                  <Sparkles className="h-4 w-4" />
                  {isThai ? '2. POS Cashier AI' : '2. POS Cashier AI'}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {isThai ? 'แนะนำโปรโมชั่นและสินค้าคู่กันขณะคิดเงิน' : 'Smart upselling & cross-selling suggestions at checkout'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 mb-1.5 text-purple-600 dark:text-purple-400 font-semibold text-sm">
                  <Bot className="h-4 w-4" />
                  {isThai ? '3. Inventory Assistant' : '3. Inventory Assistant'}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {isThai ? 'วิเคราะห์ของขาดสต็อกและช่วยเขียนข้อมูลสินค้า' : 'Stock replenishment planner & auto product detail generator'}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Live Test Console Column */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div>
                <CardTitle>{isThai ? 'ทดสอบการส่งคำสั่ง (Live Test Console)' : 'Live Test Console'}</CardTitle>
                <CardDescription>
                  {isThai ? 'ทดสอบการเชื่อมต่อและดูการตอบกลับจาก AI' : 'Test prompt execution and inspect raw response'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardBody className="flex-1 flex flex-col space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isThai ? 'ข้อความทดสอบ (Prompt):' : 'Test Prompt:'}
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    placeholder={isThai ? 'พิมพ์คำถามหรือคำสั่งที่นี่...' : 'Type prompt here...'}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isThai ? 'กำลังติดต่อ AI...' : 'Connecting to AI...'}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {isThai ? 'ทดสอบส่งข้อความ (Test AI API)' : 'Send Test Request'}
                  </>
                )}
              </Button>

              {/* Status and Response Display */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {isThai ? 'ผลลัพธ์จาก AI:' : 'AI Response:'}
                  </span>
                  {testStatus === 'success' && (
                    <span className="flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      200 OK
                    </span>
                  )}
                  {testStatus === 'error' && (
                    <span className="flex items-center text-xs font-medium text-rose-600 dark:text-rose-400">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      Failed
                    </span>
                  )}
                </div>

                <div
                  className={`flex-1 min-h-[160px] p-3.5 rounded-xl border text-sm leading-relaxed overflow-y-auto whitespace-pre-wrap font-sans ${
                    testStatus === 'error'
                      ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300'
                      : testStatus === 'success'
                      ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-200'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-500'
                  }`}
                >
                  {testResponse || (
                    <span className="text-slate-400 italic">
                      {isThai
                        ? 'กดปุ่ม "ทดสอบส่งข้อความ" ด้านบนเพื่อดูการตอบกลับจาก AI'
                        : 'Click "Send Test Request" above to view live AI response.'}
                    </span>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
