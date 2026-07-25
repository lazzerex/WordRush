import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CustomizeClient from './CustomizeClient';

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic';

export default async function CustomizePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already redirects unauthenticated requests, but this route's
  // own getUser() is a second independent call to the Supabase auth server -
  // a transient hiccup here must not render a blank page (see results/page.tsx
  // for the same pattern).
  if (!user) {
    redirect('/login');
  }

  return <CustomizeClient />;
}
