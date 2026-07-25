import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AccountClient from './AccountClient';

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
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

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 wr-bg-primary wr-text-primary">
      <AccountClient user={user} />
    </div>
  );
}
