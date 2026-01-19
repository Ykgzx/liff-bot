/**
 * Unit tests for the chat API route
 * Tests specific examples and error conditions
 */

// Mock globals for Next.js API routes
Object.defineProperty(global, 'Request', {
  value: class MockRequest {
    constructor(public url: string, public init: any = {}) {}
    async json() {
      return JSON.parse(this.init.body || '{}');
    }
  },
});

Object.defineProperty(global, 'Response', {
  value: class MockResponse {
    constructor(public body: any, public init: any = {}) {}
    get status() {
      return this.init.status || 200;
    }
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
  },
});

import { POST } from '../route';

// Mock the AI SDK
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mocked-model'),
}));

jest.mock('ai', () => ({
  streamText: jest.fn(() => ({
    toDataStreamResponse: jest.fn(() => new Response('mocked response')),
  })),
}));

describe('/api/chat route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return 400 for missing messages', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({}),
    }) as any;

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('messages array is required');
  });

  it('should return 400 for invalid messages array', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: 'not-an-array' }),
    }) as any;

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should return 500 for missing API key', async () => {
    delete process.env.OPENAI_API_KEY;
    
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
    }) as any;

    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(await response.text()).toContain('OpenAI API key not configured');
  });

  it('should return 500 for default API key placeholder', async () => {
    process.env.OPENAI_API_KEY = 'your_openai_api_key_here';
    
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
    }) as any;

    const response = await POST(request);
    expect(response.status).toBe(500);
  });

  it('should return 400 for invalid message format', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ 
        messages: [{ role: 'user' }] // missing content
      }),
    }) as any;

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('role and content are required');
  });

  it('should return 400 for invalid message role', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ 
        messages: [{ role: 'invalid', content: 'Hello' }]
      }),
    }) as any;

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Invalid message role');
  });

  it('should process valid request successfully', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ 
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ]
      }),
    }) as any;

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});