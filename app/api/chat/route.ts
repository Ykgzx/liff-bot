import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';
import { searchProducts, formatProductsForAI } from '@/app/utils/productSearch';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    console.log('Received messages:', messages?.length);

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

    console.log('Valid messages after filter:', validMessages.length);

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

    console.log('Last user message:', lastUserMessage.content.substring(0, 50));

    // Check API key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('Missing GOOGLE_GENERATIVE_AI_API_KEY');
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

    // Search for relevant products (with error handling)
    let productContext = 'ยังไม่มีข้อมูลสินค้า';
    try {
      const relevantProducts = await searchProducts(lastUserMessage.content, 15);
      productContext = formatProductsForAI(relevantProducts);
      console.log('Products found:', relevantProducts.length);
    } catch (productError) {
      console.error('Product search error:', productError);
    }

    // System prompt
    const systemPrompt = `คุณเป็นผู้ช่วยที่ปรึกษาสินค้าอาหารเสริม Amsel 
คุณสามารถตอบคำถามเกี่ยวกับสินค้าจากข้อมูลด้านล่างนี้

## สินค้าในระบบ:
${productContext}

## แนวทางการตอบ:
1. ตอบคำถามเกี่ยวกับสินค้าโดยอิงจากข้อมูลด้านบน
2. ถ้าลูกค้าถามถึงสินค้าที่ไม่มีในรายการ ให้แจ้งว่าไม่พบสินค้านั้น
3. แนะนำสินค้าที่เหมาะสมตามความต้องการของลูกค้า
4. ตอบเป็นภาษาไทยเสมอ
5. กระชับ เป็นมิตร และเป็นมืออาชีพ`;

    // Initialize Gemini
    console.log('Initializing Gemini...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt
    });

    // Convert messages to Gemini format (filter out invalid and ensure proper structure)
    const geminiHistory = validMessages
      .filter((m: any) => m.role !== 'system' && m.content && m.content.trim())
      .slice(0, -1) // Remove last message (will be sent as current input)
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.trim() }]
      }));

    console.log('Gemini history length:', geminiHistory.length);

    // Start chat session and stream response
    try {
      const chat = model.startChat({
        history: geminiHistory.length > 0 ? geminiHistory : undefined
      });
      console.log('Sending message to Gemini...');
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
          } catch (streamError) {
            console.error('Stream error:', streamError);
            controller.error(streamError);
          }
        }
      });

      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

    } catch (geminiError: any) {
      console.error('Gemini API error:', geminiError);

      // Return friendly error message
      const errorMessage = geminiError.message?.includes('API key')
        ? 'API key ไม่ถูกต้อง กรุณาตรวจสอบการตั้งค่า'
        : 'ขออภัย ระบบ AI ไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';

      const stream = new ReadableStream({
        start(controller) {
          const payload = `0:${JSON.stringify({ type: 'text-delta', textDelta: errorMessage })}\n`;
          controller.enqueue(new TextEncoder().encode(payload));
          controller.close();
        }
      });
      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

  } catch (error) {
    console.error('Chat API error:', error);

    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_ERROR'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}