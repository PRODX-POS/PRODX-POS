/**
 * AI Assistant Service - OpenRouter-compatible chat completions.
 * The production code-review lane is maintained separately in GitHub Actions.
 */

export interface AiConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  temperature: number;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  apiKey: '',
  model: 'openrouter/auto-beta',
  enabled: true,
  temperature: 0.7,
};

const STORAGE_KEY = 'prodx_ai_service_config';

export class AiService {
  private static instance: AiService;
  private constructor() {}
  public static getInstance(): AiService { if (!AiService.instance) AiService.instance = new AiService(); return AiService.instance; }

  public getConfig(): AiConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_AI_CONFIG, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_AI_CONFIG;
  }

  public saveConfig(config: Partial<AiConfig>): AiConfig {
    const updated = { ...this.getConfig(), ...config };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }

  public async chatCompletion(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, customConfig?: Partial<AiConfig>): Promise<string> {
    const config = { ...this.getConfig(), ...customConfig };
    if (!config.apiKey.trim()) throw new Error('กรุณากรอก OpenRouter API Key ในหน้าตั้งค่า AI ก่อนใช้งาน');
    const res = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey.trim()}` },
      body: JSON.stringify({ model: config.model || 'openrouter/auto-beta', messages, temperature: config.temperature ?? 0.7, stream: false }),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      let parsedError = errorText;
      try { const json = JSON.parse(errorText); parsedError = json.error?.message || json.message || errorText; } catch {}
      throw new Error(`AI API Error (${res.status}): ${parsedError || res.statusText}`);
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) throw new Error('ไม่พบคำตอบจาก AI API');
    return reply;
  }

  public async analyzeSalesDashboard(context: { totalRevenue: string; totalOrders: number; topProducts: Array<{ name: string; qty: number; revenue: string }>; paymentBreakdown: Record<string, string>; dateRange: string; timeframe: string }): Promise<string> {
    const systemPrompt = `คุณเป็น AI ผู้เชี่ยวชาญการวิเคราะห์ธุรกิจร้านค้าและการขาย (POS & Retail Analytics Specialist)\nหน้าที่ของคุณคือวิเคราะห์ข้อมูลยอดขาย แนวโน้ม สินค้าขายดี และให้คำแนะนำเชิงกลยุทธ์ที่เป็นรูปธรรมและปฏิบัติได้จริงสำหรับผู้จัดการร้าน\nตอบเป็นภาษาไทยแบบมืออาชีพ กระชับ ชัดเจน จัดหัวข้อเป็นข้อๆ (Bullet points) ให้อ่านง่าย`;
    const userPrompt = `กรุณาวิเคราะห์ข้อมูลผลการดำเนินงานของร้านค้าในช่วง "${context.timeframe}" (${context.dateRange}):\n\n- ยอดขายรวม: ${context.totalRevenue}\n- จำนวนคำสั่งซื้อ: ${context.totalOrders} รายการ\n- ช่องทางการชำระเงิน: ${JSON.stringify(context.paymentBreakdown, null, 2)}\n- 5 อันดับสินค้าขายดี:\n${context.topProducts.map((p, i) => `  ${i + 1}. ${p.name} - ขายได้ ${p.qty} ชิ้น (ยอดขาย ${p.revenue})`).join('\n')}\n\nกรุณาสรุป:\n1. จุดเด่นและแนวโน้มยอดขายที่สำคัญ\n2. สินค้าฮิตและโอกาสการเพิ่มยอดขาย (Cross-selling / Upselling)\n3. ข้อเสนอแนะเชิงกลยุทธ์ 2-3 ข้อสำหรับผู้บริหาร`;
    return this.chatCompletion([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]);
  }

  public async getPosRecommendation(context: { cartItems: Array<{ name: string; qty: number; price: string; category?: string }>; availableProducts: Array<{ name: string; price: string; category?: string; stock: number }>; customerName?: string; customerTier?: string }): Promise<string> {
    const systemPrompt = `คุณคือ AI ผู้ช่วยแคชเชียร์อัจฉริยะประจำจุดขาย (Smart POS Cashier Assistant)\nหน้าที่ของคุณคือแนะนำสินค้าที่ควรเสนอขายคู่กัน (Upselling / Cross-selling) หรือแนะนำโปรโมชั่นที่เหมาะสมกับตะกร้าสินค้าของลูกค้า เพื่อช่วยเพิ่มยอดขายต่อบิล\nตอบเป็นภาษาไทย สุภาพ กระชับ แนะนำ 2-3 ข้ออย่างตรงประเด็น`;
    const userPrompt = `รายการสินค้าในตะกร้าปัจจุบัน:\n${context.cartItems.length > 0 ? context.cartItems.map((item) => `- ${item.name} x${item.qty} (${item.price})`).join('\n') : '(ตะกร้ายังว่างอยู่)'}\n\n${context.customerName ? `ข้อมูลลูกค้า: ${context.customerName} (ระดับ: ${context.customerTier || 'ทั่วไป'})` : 'ลูกค้าทั่วไป'}\n\nสินค้าที่มีในสต็อกร้านค้า:\n${context.availableProducts.slice(0, 15).map((p) => `- ${p.name} (${p.price}, คงเหลือ: ${p.stock})`).join('\n')}\n\nกรุณาแนะนำประโยคพูดสั้นๆ หรือสินค้าที่แคชเชียร์ควรเสนอขายเพิ่มเติมกับลูกค้ารายนี้`;
    return this.chatCompletion([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]);
  }

  public async optimizeInventory(context: { lowStockProducts: Array<{ name: string; stock: number; minStock: number; category: string }>; totalProductsCount: number; outOfStockCount: number }): Promise<string> {
    const systemPrompt = `คุณคือ AI ผู้เชี่ยวชาญการบริหารคลังสินค้าและซัพพลายเชน (Smart Inventory & Stock Replenishment AI)\nหน้าที่ของคุณคือวิเคราะห์สินค้าที่ใกล้หมดหรือหมดสต็อก ประเมินความเสี่ยง และแนะนำแผนการสั่งซื้อเติมสินค้า (Reorder Planning)\nตอบเป็นภาษาไทย ชัดเจน กระชับ เป็นขั้นเป็นตอน`;
    const userPrompt = `รายงานสถานะคลังสินค้าปัจจุบัน:\n- สินค้าทั้งหมดในระบบ: ${context.totalProductsCount} รายการ\n- สินค้าหมดสต็อก: ${context.outOfStockCount} รายการ\n- รายการสินค้าสต็อกต่ำ/ใกล้หมด (${context.lowStockProducts.length} รายการ):\n${context.lowStockProducts.map((p) => `- ${p.name} (หมวดหมู่: ${p.category}) คงเหลือ: ${p.stock} ชิ้น (จุดสั่งซื้อขั้นต่ำ: ${p.minStock} ชิ้น)`).join('\n')}\n\nกรุณาให้คำแนะนำ:\n1. จัดลำดับความเร่งด่วนในการสั่งซื้อ (ด่วนที่สุด / รองลงมา)\n2. แนะนำปริมาณการสั่งเติมสต็อกที่เหมาะสม\n3. เคล็ดลับการจัดการคลังเพื่อป้องกันสต็อกขาดมือ`;
    return this.chatCompletion([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]);
  }

  public async generateProductDetails(productName: string, categoryHint?: string): Promise<{ description: string; suggestedCategory: string; suggestedPrice: number; tags: string[]; sellingPoints: string[] }> {
    const systemPrompt = `คุณคือ AI ช่วยสร้างรายละเอียดสินค้าสำหรับระบบ POS & E-commerce\nเมื่อได้รับชื่อสินค้า ให้สร้างข้อมูลรายละเอียดสินค้าภาษาไทยในรูปแบบ JSON ที่ถูกต้องเท่านั้น (ไม่มี Markdown block อื่นๆ ปน)\nJSON Schema:\n{\n  "description": "คำอธิบายสินค้าที่ดึงดูดและครบถ้วน 2-3 ประโยค",\n  "suggestedCategory": "หมวดหมู่สินค้าที่เหมาะสม (เช่น เครื่องดื่ม, เบเกอรี่, อาหารทานเล่น, ของใช้)",\n  "suggestedPrice": 50,\n  "tags": ["tag1", "tag2", "tag3"],\n  "sellingPoints": ["จุดขาย 1", "จุดขาย 2"]\n}`;
    const raw = await this.chatCompletion([{ role: 'system', content: systemPrompt }, { role: 'user', content: `สร้างรายละเอียดสำหรับสินค้าชื่อ: "${productName}" ${categoryHint ? `(หมวดหมู่แนะนำ: ${categoryHint})` : ''}` }]);
    try {
      const cleanJson = raw.replace(/```json/gi, '').replace(/```/gi, '').trim();
      return JSON.parse(cleanJson);
    } catch {
      return { description: raw, suggestedCategory: categoryHint || 'ทั่วไป', suggestedPrice: 50, tags: [productName], sellingPoints: ['คุณภาพดี', 'คุ้มค่าคุ้มราคา'] };
    }
  }
}

export const aiService = AiService.getInstance();
