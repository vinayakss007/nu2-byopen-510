import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET_ENV = process.env.JWT_SECRET;
const JWT_SECRET = JWT_SECRET_ENV ? new TextEncoder().encode(JWT_SECRET_ENV) : null;

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/callback',
  '/auth/invite',
  '/health',
  '/docs',
  '/',
  '/setup',
  '/lead-capture',
  '/test-js',
  '/auth/login-simple',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/accept-invite',
  '/api/auth/invite-details',
  '/api/auth/2fa/setup',
  '/api/auth/2fa/verify',
  '/api/auth/2fa/disable',
  '/api/forms/submit',
  '/api/leads/public',
  '/api/webhooks/stripe',
  '/api/webhooks/resend',
  '/api/webhooks/whatsapp',
  '/api/webhooks/inbound',
  '/api/health',
  '/api/track/click',
  '/api/track/open',
  '/api/unsubscribe',
  '/api/keepalive',
  '/api/test-email',
  '/api/cron',
  '/api/metrics',
  '/api/embed',
  '/api/setup/check',
  '/api/setup/create-admin',
  '/api/lead-capture',
  '/api/lead-capture/submit',
];

const PUBLIC_PREFIXES = [
  '/_next',
  '/favicon',
  '/public',
  '/images',
  '/static',
];

export async function proxy(request: NextRequest) {
  console.log(`[Proxy] Handling request: ${request.nextUrl.pathname}`);
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // ── 1. CORS Preflight ───────────────────────────────────
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    const allowedOrigins = (process.env['ALLOWED_ORIGINS'] as string || '').split(',');
    if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, x-cron-secret, x-auth-method');
      response.headers.set('Access-Control-Max-Age', '86400');
    }
    return response;
  }

  // ── 2. Skip static assets and internal paths ─────────────
  const isStaticAsset = pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    pathname.startsWith('/images');

  if (isStaticAsset) {
    const response = NextResponse.next();
    if (origin && pathname.startsWith('/api')) {
      const allowedOrigins = (process.env['ALLOWED_ORIGINS'] as string || '').split(',');
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
    }
    return response;
  }

  // ── 3. Check if path is public ───────────────────────────
  let isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (!isPublic) {
    isPublic = PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
  }

  if (isPublic) {
    const response = NextResponse.next();
    const allowedOrigins = (process.env['ALLOWED_ORIGINS'] as string || '').split(',');
    if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return response;
  }

  // ── 4. Auth Check (Edge) ─────────────────────────────────
  // Allow if no JWT_SECRET configured (degraded/dev mode)
  if (!JWT_SECRET) return NextResponse.next();

  const cookieToken = request.cookies.get('nucrm_session')?.value;
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = cookieToken || bearerToken;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub) throw new Error('Invalid token');
    // Token valid — proceed
    const response = NextResponse.next();
    const allowedOrigins = (process.env['ALLOWED_ORIGINS'] as string || '').split(',');
    if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return response;
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/api/:path*',
  ],
};
