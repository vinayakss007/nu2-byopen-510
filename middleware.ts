import { NextRequest, NextResponse } from 'next/server';

// Performance middleware
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add timing header for debugging
  const startTime = Date.now();
  response.headers.set('X-Request-ID', crypto.randomUUID());

  // CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
