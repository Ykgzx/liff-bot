import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';
import { searchProducts, formatProductsForAI } from '@/app/utils/productSearch';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Request validation
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({
        error: 'Invalid request',
        message: 'Messages array is required',
        code: 'INVALID_REQUEST'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Message format validation
    for (const [index, message] of messages.entries()) {
      if (!message.role || !message.content) {
        return new Response(JSON.stringify({
          error: 'Invalid message format',
          message: `Message at index ${index} is missing role or content`,
          code: 'INVALID_MESSAGE_FORMAT'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!['user', 'assistant', 'system'].includes(message.role)) {
        return new Response(JSON.stringify({
          error: 'Invalid message role',
          message: `Message at index ${index} has invalid role: ${message.role}`,
          code: 'INVALID_MESSAGE_ROLE'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Get the last user message
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user') || messages[messages.length - 1];

    // Check API key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      const helpMessage = `ขออภัย ระบบ AI ยังไม่ได้รับการตั้งค่า API Key สำหรับ Google Gemini`;
      const stream = new ReadableStream({
        start(controller) {
          const payload = `0:${JSON.stringify({ type: 'text-delta', textDelta: helpMessage })}\n`;
          controller.enqueue(new TextEncoder().encode(payload));
          controller.close();
        }
      });
      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // Search for relevant products
    const relevantProducts = await searchProducts(lastUserMessage.content, 15);
    const productContext = formatProductsForAI(relevantProducts);

    // System prompt with product data
    const systemPrompt = `คุณเป็นผู้ช่วยที่ปรึกษาสินค้าอาหารเสริม Amsel 
คุณสามารถตอบคำถามเกี่ยวกับสินค้าจากข้อมูลด้านล่างนี้

## สินค้าในระบบ:
${productContext}

## แนวทางการตอบ:
1. ตอบคำถามเกี่ยวกับสินค้าโดยอิงจากข้อมูลด้านบน
2. ถ้าลูกค้าถามถึงสินค้าที่ไม่มีในรายการ ให้แจ้งว่าไม่พบสินค้านั้น
3. แนะนำสินค้าที่เหมาะสมตามความต้องการของลูกค้า
4. ตอบเป็นภาษาไทยเสมอ
5. กระชับ เป็นมิตร และเป็นมืออาชีพ
6. ถ้าลูกค้าต้องการรายละเอียดเพิ่ม สามารถบอกราคา SKU และหมวดหมู่ได้`;

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt
    });

    // Convert messages to Gemini format
    const geminiHistory = messages
      .filter((m: any) => m.role !== 'system')
      .slice(0, -1)
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    // Start chat session and stream response
    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessageStream(lastUserMessage.content);

    // Create stream that client can parse
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              const payload = `0:${JSON.stringify({ type: 'text-delta', textDelta: text })}\n`;
              controller.enqueue(encoder.encode(payload));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        return new Response(JSON.stringify({
          error: 'Authentication error',
          message: 'Invalid or missing API key',
          code: 'AUTH_ERROR'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please wait before trying again.',
          code: 'RATE_LIMIT_ERROR'
        }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } });
      }
    }

    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_ERROR'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}