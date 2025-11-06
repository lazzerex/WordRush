import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const authError = requestUrl.searchParams.get('error');
  const nextParam = requestUrl.searchParams.get('next');
  const redirectPath = nextParam && nextParam.startsWith('/') ? nextParam : '/account';
  const redirectUrl = new URL(redirectPath, requestUrl.origin);

  if (authError) {
    console.error('OAuth error from provider:', authError);
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('error', 'google_oauth_failed');
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    return NextResponse.redirect(redirectUrl);
  }

  let response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('Failed to exchange OAuth code for session:', error);
    const errorUrl = new URL('/login', requestUrl.origin);
    errorUrl.searchParams.set('error', 'google_oauth_failed');
    return NextResponse.redirect(errorUrl);
  }

  return response;
}
