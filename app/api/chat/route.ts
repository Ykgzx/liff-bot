import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';
import { searchProducts, formatProductsForAI } from '@/app/utils/productSearch';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  console.log('[Chat API] Request received');

  try {
    const { messages } = await req.json();
    console.log('[Chat API] Messages count:', messages?.length);

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

    // Filter and validate messages
    const validMessages = messages.filter((msg: any) =>
      msg &&
      msg.role &&
      typeof msg.content === 'string' &&
      msg.content.trim().length > 0 &&
      ['user', 'assistant', 'system'].includes(msg.role)
    );

    if (validMessages.length === 0) {
      return new Response(JSON.stringify({
        error: 'No valid messages',
        message: 'At least one valid message is required',
        code: 'NO_VALID_MESSAGES'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the last user message
    const lastUserMessage = [...validMessages].reverse().find((m: any) => m.role === 'user');
    if (!lastUserMessage) {
      return new Response(JSON.stringify({
        error: 'No user message',
        message: 'At least one user message is required',
        code: 'NO_USER_MESSAGE'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[Chat API] User message:', lastUserMessage.content.substring(0, 30));

    // Check API key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('[Chat API] Missing API key');
      return streamResponse('ขออภัย ระบบ AI ยังไม่ได้รับการตั้งค่า');
    }

    // Search for products (with error handling)
    let productContext = '';
    try {
      let relevantProducts = await searchProducts(lastUserMessage.content, 10);

      // If no text match but user asks about "products", fetch top products (fallback)
      const isProductQuery = /สินค้า|ขายอะไร|มีอะไร|รายการ|ราคา|แนะนำ/i.test(lastUserMessage.content);
      if (relevantProducts.length === 0 && isProductQuery) {
        console.log('[Chat API] No direct match, fetching all products for context...');
        const { getAllProducts } = require('@/app/utils/productSearch');
        const allProducts = await getAllProducts();
        relevantProducts = allProducts.slice(0, 30); // Limit context
      }

      productContext = formatProductsForAI(relevantProducts);
      console.log('[Chat API] Products found:', relevantProducts.length);
    } catch (e) {
      console.error('[Chat API] Product search error:', e);
    }

    // System prompt
    const systemPrompt = `คุณเป็นผู้ช่วยที่ปรึกษาสินค้าอาหารเสริม Amsel ตอบเป็นภาษาไทย กระชับ เป็นมิตร
${productContext ? `\nสินค้าในระบบ:\n${productContext}` : ''}`;

    // Initialize Gemini
    console.log('[Chat API] Calling Gemini API...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt
    });

    // Convert messages to Gemini format
    const geminiHistory = validMessages
      .filter((m: any) => m.role !== 'system')
      .slice(0, -1)
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.trim() }]
      }));

    try {
      // Use non-streaming for reliability
      const chat = model.startChat({
        history: geminiHistory.length > 0 ? geminiHistory : undefined
      });

      const result = await chat.sendMessage(lastUserMessage.content);
      const responseText = result.response.text();

      console.log('[Chat API] Got response:', responseText.substring(0, 50));

      return streamResponse(responseText);

    } catch (geminiError: any) {
      console.error('[Chat API] Gemini error:', geminiError.message, 'Status:', geminiError.status);

      if (geminiError.status === 429) {
        return streamResponse('ขออภัย ระบบมีการใช้งานมากในขณะนี้ กรุณารอสักครู่แล้วลองใหม่');
      }

      return streamResponse('ขออภัย ระบบ AI ไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
    }

  } catch (error) {
    console.error('[Chat API] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// Helper to create streaming response
function streamResponse(text: string): Response {
  const payload = `0:${JSON.stringify({ type: 'text-delta', textDelta: text })}\n`;
  return new Response(payload, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}