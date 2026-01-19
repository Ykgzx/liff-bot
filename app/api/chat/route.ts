import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { searchFAQ } from '@/app/utils/faqSearch';

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
    const rateLimitKey = `rate_limit_${userAgent}`;

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

    // Fallback: use OpenAI streaming when OpenAI key is configured
    const apiKey = process.env.OPENAI_API_KEY;
    const hasValidOpenAI = apiKey && apiKey !== 'your_openai_api_key_here';

    if (!hasValidOpenAI) {
      // No external AI service configured
      // Return a helpful message with setup instructions
      const helpMessage = `ขออภัย ระบบ AI ยังไม่ได้รับการตั้งค่า กรุณาตั้งค่าให้หนึ่งในนี้:\n\n` +
        `1. OpenAI: ตั้งค่า OPENAI_API_KEY ใน .env\n` +
        `2. Dialogflow: ตั้งค่า DIALOGFLOW_PROJECT_ID และ DIALOGFLOW_TOKEN\n\n` +
        `อย่างไรก็ตาม ฉันสามารถตอบคำถามจากฐานข้อมูล FAQ เกี่ยวกับสินค้าอิเล็กทรอนิกส์ได้`;
      
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
    const result = await streamText({
      model: openai('gpt-3.5-turbo'),
      messages: messages.map((message: any) => ({
        role: message.role,
        content: message.content,
      })),
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
    
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Enhanced error handling with specific error types
    if (error instanceof Error) {
      // OpenAI API key errors
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
      
      // Model/content errors
      if (error.message.includes('content_filter') || error.message.includes('safety')) {
        return new Response(JSON.stringify({
          error: 'Content filtered',
          message: 'Your message was filtered for safety reasons. Please try rephrasing.',
          code: 'CONTENT_FILTER_ERROR',
          retryable: false
        }), {
          status: 400,
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