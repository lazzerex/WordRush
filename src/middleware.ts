import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

function sentryIngestOrigin(): string {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return '';
  try {
    return new URL(dsn).origin;
  } catch {
    return '';
  }
}

function buildCsp(nonce: string) {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https:;
    font-src 'self' data:;
    connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL || ''} ${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace('https://', 'wss://')} ${process.env.UPSTASH_REDIS_REST_URL || ''} ${sentryIngestOrigin()};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function withCsp(response: NextResponse, nonce: string) {
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  return response;
}

export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshing the auth token
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();

    // If there's a refresh token error, clear the auth cookies
    if (error && error.message.includes('refresh_token_not_found')) {
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      // Clear all Supabase auth cookies
      const cookiesToClear = request.cookies
        .getAll()
        .filter((cookie) => cookie.name.startsWith('sb-') || cookie.name.includes('auth-token'));

      cookiesToClear.forEach(({ name }) => {
        response.cookies.delete(name);
      });

      // Redirect to login if trying to access protected routes
      if (request.nextUrl.pathname.startsWith('/account')) {
        return withCsp(NextResponse.redirect(new URL('/login', request.url)), nonce);
      }

      return withCsp(response, nonce);
    }

    user = data.user;
  } catch (error) {
    // Handle any other auth errors gracefully
    logger.error('Auth error in middleware:', error);
  }

  // Protect authenticated routes - redirect to login if not authenticated
  const protectedRoutes = ['/account', '/admin', '/shop', '/customize'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('returnTo', request.nextUrl.pathname);
    return withCsp(NextResponse.redirect(redirectUrl), nonce);
  }

  // Protect admin routes - check if user is admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return withCsp(NextResponse.redirect(new URL('/login', request.url)), nonce);
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return withCsp(NextResponse.redirect(new URL('/', request.url)), nonce);
    }
  }

  // Redirect authenticated users away from login/register pages
  if (
    (request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/register')) &&
    user
  ) {
    return withCsp(NextResponse.redirect(new URL('/account', request.url)), nonce);
  }

  return withCsp(supabaseResponse, nonce);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * will modify this to include more paths for future update
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
