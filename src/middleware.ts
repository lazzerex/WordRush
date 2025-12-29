import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
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
        request,
      });
      
      // Clear all Supabase auth cookies
      const cookiesToClear = request.cookies.getAll().filter(cookie => 
        cookie.name.startsWith('sb-') || cookie.name.includes('auth-token')
      );
      
      cookiesToClear.forEach(({ name }) => {
        response.cookies.delete(name);
      });
      
      // Redirect to login if trying to access protected routes
      if (request.nextUrl.pathname.startsWith('/account')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      
      return response;
    }
    
    user = data.user;
  } catch (error) {
    // Handle any other auth errors gracefully
    console.error('Auth error in middleware:', error);
  }

  // Protect authenticated routes - redirect to login if not authenticated
  const protectedRoutes = ['/account', '/admin', '/shop', '/customize'];
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('returnTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Protect admin routes - check if user is admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Redirect authenticated users away from login/register pages
  if (
    (request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/register')) &&
    user
  ) {
    return NextResponse.redirect(new URL('/account', request.url));
  }

  return supabaseResponse;
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
