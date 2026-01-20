import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { searchFAQ } from '@/app/utils/faqSearch';
import { processConversationalMessage } from '@/app/utils/conversationalFlow';
import { searchProducts, formatProductsForAI } from '@/app/utils/productSearch';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Enhanced request validation with detailed error messages
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

    // Enhanced message format validation
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

      // Validate message content length
      if (typeof message.content !== 'string' || message.content.length > 4000) {
        return new Response(JSON.stringify({
          error: 'Invalid message content',
          message: `Message at index ${index} content is too long or invalid`,
          code: 'INVALID_MESSAGE_CONTENT'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    // Rate limiting check (basic implementation)
    const userAgent = req.headers.get('user-agent') || 'unknown';
    // const rateLimitKey = `rate_limit_${userAgent}`;

    // Get the last user message
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user') || messages[messages.length - 1];

    // Check FAQ first for electronics-related questions
    const faqMatch = await searchFAQ(lastUserMessage.content);
    if (faqMatch) {
      // Stream FAQ answer
      const stream = new ReadableStream({
        start(controller) {
          const payload = `0:${JSON.stringify({ type: 'text-delta', textDelta: faqMatch.answer })}\n`;
          controller.enqueue(new TextEncoder().encode(payload));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // Check if this is a product consultation conversation
    // Use local conversational flow for product recommendations
    const conversationLower = lastUserMessage.content.toLowerCase();
    const isProductRelated =
      conversationLower.includes('ครีม') ||
      conversationLower.includes('สกินแคร์') ||
      conversationLower.includes('ผลิตภัณฑ์') ||
      conversationLower.includes('ผิว') ||
      conversationLower.includes('เนื้อ') ||
      conversationLower.includes('ได้') ||
      conversationLower.includes('อยาก');

    if (isProductRelated) {
      try {
        const { response } = processConversationalMessage(
          lastUserMessage.content,
          messages.map((m: any) => ({ role: m.role, content: m.content }))
        );

        // Stream conversational response
        const stream = new ReadableStream({
          start(controller) {
            const payload = `0:${JSON.stringify({ type: 'text-delta', textDelta: response })}\n`;
            controller.enqueue(new TextEncoder().encode(payload));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      } catch (e) {
        console.error('Error in conversational flow:', e);
        // Fall through to external AI if conversation processing fails
      }
    }

    // If Dialogflow environment is configured, proxy to Dialogflow REST API
    const dialogflowProjectId = process.env.DIALOGFLOW_PROJECT_ID;
    const dialogflowToken = process.env.DIALOGFLOW_TOKEN; // Bearer token (OAuth2 access token)

    if (dialogflowProjectId && dialogflowToken) {
      const sessionId = req.headers.get('x-session-id') || `session-${Date.now()}`;

      const url = `https://dialogflow.googleapis.com/v2/projects/${encodeURIComponent(dialogflowProjectId)}/agent/sessions/${encodeURIComponent(sessionId)}:detectIntent`;

      const body = {
        queryInput: {
          text: {
            text: lastUserMessage.content,
            languageCode: 'th'
          }
        }
      };

      const dfRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dialogflowToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!dfRes.ok) {
        // Let outer catch handle Response errors
        throw dfRes;
      }

      const dfJson = await dfRes.json();
      const fulfillment = dfJson?.queryResult?.fulfillmentText || '';

      // Stream a single text-delta payload so the client can consume like before
      const stream = new ReadableStream({
        start(controller) {
          const payload = `0:${JSON.stringify({ type: 'text-delta', textDelta: fulfillment })}\n`;
          controller.enqueue(new TextEncoder().encode(payload));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // Gemini Integration
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      // No external AI service configured
      const helpMessage = `ขออภัย ระบบ AI ยังไม่ได้รับการตั้งค่า API Key สำหรับ Google Gemini`;

      const stream = new ReadableStream({
        start(controller) {
          const payload = `0:${JSON.stringify({ type: 'text-delta', textDelta: helpMessage })}\n`;
          controller.enqueue(new TextEncoder().encode(payload));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // Create the streaming response with enhanced error handling
    // Search for relevant products based on user query
    const relevantProducts = await searchProducts(lastUserMessage.content, 15);
    const productContext = formatProductsForAI(relevantProducts);

    // Add system prompt with product data for product-aware responses
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
6. ถ้าลูกค้าต้องการรายละเอียดเพิ่ม สามารถบอกราคา SKU และหมวดหมู่ได้

บริบทการสนทนา: ข้อความทั้งหมด ${messages.length} ข้อความ`;

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      system: systemPrompt,
      messages: messages.map((message: any) => ({
        role: message.role,
        content: message.content,
      })),
    });

    // Create custom stream that client can parse
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            const payload = `0:${JSON.stringify({ type: 'text-delta', textDelta: chunk })}\n`;
            controller.enqueue(encoder.encode(payload));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });

  } catch (error) {
    console.error('Chat API error:', error);

    // Enhanced error handling with specific error types
    if (error instanceof Error) {
      // API key errors
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        return new Response(JSON.stringify({
          error: 'Authentication error',
          message: 'Invalid or missing API key',
          code: 'AUTH_ERROR',
          retryable: false
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Rate limiting errors
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please wait before trying again.',
          code: 'RATE_LIMIT_ERROR',
          retryable: true,
          retryAfter: 60 // seconds
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        });
      }

      // Quota exceeded errors
      if (error.message.includes('quota') || error.message.includes('billing')) {
        return new Response(JSON.stringify({
          error: 'Service quota exceeded',
          message: 'AI service quota has been exceeded. Please try again later.',
          code: 'QUOTA_ERROR',
          retryable: true,
          retryAfter: 3600 // 1 hour
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '3600'
          }
        });
      }

      // Network/timeout errors
      if (error.message.includes('timeout') || error.message.includes('network')) {
        return new Response(JSON.stringify({
          error: 'Network error',
          message: 'Request timed out or network error occurred',
          code: 'NETWORK_ERROR',
          retryable: true
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Generic server error
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_ERROR',
      retryable: true
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}