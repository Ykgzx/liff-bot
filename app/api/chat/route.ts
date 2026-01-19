import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';

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

    // Validate OpenAI API key with better error handling
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({
        error: 'Service configuration error',
        message: 'AI service is not properly configured',
        code: 'SERVICE_CONFIG_ERROR'
      }), {
        status: 500,
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