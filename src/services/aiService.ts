/**
 * AI Assistant Service - Powered by KKU AI & Gemini API compatible endpoint
 * Endpoint: https://gen.ai.kku.ac.th/okmd/api/v1/chat/completions
 */

export interface AiConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  temperature: number;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  endpoint: 'https://gen.ai.kku.ac.th/okmd/api/v1/chat/completions',
  apiKey: '',
  model: 'gemini-2.5-flash-lite',
  enabled: true,
  temperature: 0.7,
};

const STORAGE_KEY = 'prodx_ai_service_config';

export class AiService {
  private static instance: AiService;

  private constructor() {}

  public static getInstance(): AiService {
    if (!AiService.instance) {
      AiService.instance = new AiService();
    }
    return AiService.instance;
  }

  public getConfig(): AiConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_AI_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_AI_CONFIG;
  }

  public saveConfig(config: Partial<AiConfig>): AiConfig {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }

  /**
   * Send chat completion request to the KKU AI / OpenAI compatible endpoint
   */
  public async chatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    customConfig?: Partial<AiConfig>
  ): Promise<string> {
    const config = { ...this.getConfig(), ...customConfig };

    if (!config.apiKey && !customConfig?.apiKey) {
      // Return helpful message if API key not set yet
      throw new Error('กรุณากรอก API Key ในหน้าตั้งค่า AI (Settings > AI Assistant) ก่อนใช้งาน');
    }

    const res = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: config.model || 'gemini-2.5-flash-lite',
        messages,
        temperature: config.temperature ?? 0.7,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      let parsedError = errorText;
      try {
        const json = JSON.parse(errorText);
        parsedError = json.error?.message || json.message || errorText;
      } catch {
        // use raw
      }
      throw new Error(`AI API Error (${res.status}): ${parsedError || res.statusText}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      throw new Error('ไม่พบคำตอบจาก AI API');
    }
    return reply;
  }

  /**
   * Feature 1: Analyze Sales Dashboard
   */
  public async analyzeSalesDashboard(context: {
    totalRevenue: string;
    totalOrders: number;
    topProducts: Array<{ name: string; qty: number; revenue: string }>;
    paymentBreakdown: Record<string, string>;
    dateRange: string;
    timeframe: string;
  }): Promise<string> {
    const systemPrompt = `คุณเป็น AI ผู้เชี่ยวชาญการวิเคราะห์ธุรกิจร้านค้าและการขาย (POS & Retail Analytics Specialist)
หน้าที่ของคุณคือวิเคราะห์ข้อมูลยอดขาย แนวโน้ม สินค้าขายดี และให้คำแนะนำเชิงกลยุทธ์ที่เป็นรูปธรรมและปฏิบัติได้จริงสำหรับผู้จัดการร้าน
ตอบเป็นภาษาไทยแบบมืออาชีพ กระชับ ชัดเจน จัดหัวข้อเป็นข้อๆ (Bullet points) ให้อ่านง่าย`;

    const userPrompt = `กรุณาวิเคราะห์ข้อมูลผลการดำเนินงานของร้านค้าในช่วง "${context.timeframe}" (${context.dateRange}):

- ยอดขายรวม: ${context.totalRevenue}
- จำนวนคำสั่งซื้อ: ${context.totalOrders} รายการ
- ช่องทางการชำระเงิน: ${JSON.stringify(context.paymentBreakdown, null, 2)}
- 5 อันดับสินค้าขายดี:
${context.topProducts.map((p, i) => `  ${i + 1}. ${p.name} - ขายได้ ${p.qty} ชิ้น (ยอดขาย ${p.revenue})`).join('\n')}

กรุณาสรุป:
1. จุดเด่นและแนวโน้มยอดขายที่สำคัญ
2. สินค้าฮิตและโอกาสการเพิ่มยอดขาย (Cross-selling / Upselling)
3. ข้อเสนอแนะเชิงกลยุทธ์ 2-3 ข้อสำหรับผู้บริหาร`;

    return this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
  }

  /**
   * Feature 2: POS Cashier Assistant / Smart Recommendations
   */
  public async getPosRecommendation(context: {
    cartItems: Array<{ name: string; qty: number; price: string; category?: string }>;
    availableProducts: Array<{ name: string; price: string; category?: string; stock: number }>;
    customerName?: string;
    customerTier?: string;
  }): Promise<string> {
    const systemPrompt = `คุณคือ AI ผู้ช่วยแคชเชียร์อัจฉริยะประจำจุดขาย (Smart POS Cashier Assistant)
หน้าที่ของคุณคือแนะนำสินค้าที่ควรเสนอขายคู่กัน (Upselling / Cross-selling) หรือแนะนำโปรโมชั่นที่เหมาะสมกับตะกร้าสินค้าของลูกค้า เพื่อช่วยเพิ่มยอดขายต่อบิล
ตอบเป็นภาษาไทย สุภาพ กระชับ แนะนำ 2-3 ข้ออย่างตรงประเด็น`;

    const userPrompt = `รายการสินค้าในตะกร้าปัจจุบัน:
${context.cartItems.length > 0 ? context.cartItems.map((item) => `- ${item.name} x${item.qty} (${item.price})`).join('\n') : '(ตะกร้ายังว่างอยู่)'}

${context.customerName ? `ข้อมูลลูกค้า: ${context.customerName} (ระดับ: ${context.customerTier || 'ทั่วไป'})` : 'ลูกค้าทั่วไป'}

สินค้าที่มีในสต็อกร้านค้า:
${context.availableProducts.slice(0, 15).map((p) => `- ${p.name} (${p.price}, คงเหลือ: ${p.stock})`).join('\n')}

กรุณาแนะนำประโยคพูดสั้นๆ หรือสินค้าที่แคชเชียร์ควรเสนอขายเพิ่มเติมกับลูกค้ารายนี้`;

    return this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
  }

  /**
   * Feature 3: Smart Inventory Optimization
   */
  public async optimizeInventory(context: {
    lowStockProducts: Array<{ name: string; stock: number; minStock: number; category: string }>;
    totalProductsCount: number;
    outOfStockCount: number;
  }): Promise<string> {
    const systemPrompt = `คุณคือ AI ผู้เชี่ยวชาญการบริหารคลังสินค้าและซัพพลายเชน (Smart Inventory & Stock Replenishment AI)
หน้าที่ของคุณคือวิเคราะห์สินค้าที่ใกล้หมดหรือหมดสต็อก ประเมินความเสี่ยง และแนะนำแผนการสั่งซื้อเติมสินค้า (Reorder Planning)
ตอบเป็นภาษาไทย ชัดเจน กระชับ เป็นขั้นเป็นตอน`;

    const userPrompt = `รายงานสถานะคลังสินค้าปัจจุบัน:
- สินค้าทั้งหมดในระบบ: ${context.totalProductsCount} รายการ
- สินค้าหมดสต็อก: ${context.outOfStockCount} รายการ
- รายการสินค้าสต็อกต่ำ/ใกล้หมด (${context.lowStockProducts.length} รายการ):
${context.lowStockProducts.map((p) => `- ${p.name} (หมวดหมู่: ${p.category}) คงเหลือ: ${p.stock} ชิ้น (จุดสั่งซื้อขั้นต่ำ: ${p.minStock} ชิ้น)`).join('\n')}

กรุณาให้คำแนะนำ:
1. จัดลำดับความเร่งด่วนในการสั่งซื้อ (ด่วนที่สุด / รองลงมา)
2. แนะนำปริมาณการสั่งเติมสต็อกที่เหมาะสม
3. เคล็ดลับการจัดการคลังเพื่อป้องกันสต็อกขาดมือ`;

    return this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
  }

  /**
   * Feature 3: Generate Product Description & Categorization
   */
  public async generateProductDetails(productName: string, categoryHint?: string): Promise<{
    description: string;
    suggestedCategory: string;
    suggestedPrice: number;
    tags: string[];
    sellingPoints: string[];
  }> {
    const systemPrompt = `คุณคือ AI ช่วยสร้างรายละเอียดสินค้าสำหรับระบบ POS & E-commerce
เมื่อได้รับชื่อสินค้า ให้สร้างข้อมูลรายละเอียดสินค้าภาษาไทยในรูปแบบ JSON ที่ถูกต้องเท่านั้น (ไม่มี Markdown block อื่นๆ ปน)
JSON Schema:
{
  "description": "คำอธิบายสินค้าที่ดึงดูดและครบถ้วน 2-3 ประโยค",
  "suggestedCategory": "หมวดหมู่สินค้าที่เหมาะสม (เช่น เครื่องดื่ม, เบเกอรี่, อาหารทานเล่น, ของใช้)",
  "suggestedPrice": 50,
  "tags": ["tag1", "tag2", "tag3"],
  "sellingPoints": ["จุดขาย 1", "จุดขาย 2"]
}`;

    const userPrompt = `สร้างรายละเอียดสำหรับสินค้าชื่อ: "${productName}" ${categoryHint ? `(หมวดหมู่แนะนำ: ${categoryHint})` : ''}`;

    const raw = await this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    try {
      const cleanJson = raw.replace(/```json/gi, '').replace(/```/gi, '').trim();
      return JSON.parse(cleanJson);
    } catch {
      return {
        description: raw,
        suggestedCategory: categoryHint || 'ทั่วไป',
        suggestedPrice: 50,
        tags: [productName],
        sellingPoints: ['คุณภาพดี', 'คุ้มค่าคุ้มราคา'],
      };
    }
  }
}

export const aiService = AiService.getInstance();
