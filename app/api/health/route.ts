/**
 * Health check endpoint for network connectivity monitoring
 * Used by error handling system to detect network issues
 */

import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  return new Response('OK', {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

export async function HEAD(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}