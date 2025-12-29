import { createClient } from '@/lib/supabase/server';
import AccountClient from './AccountClient';

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Middleware ensures user exists, but double-check for type safety
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 wr-bg-primary wr-text-primary">
      <AccountClient user={user} />
    </div>
  );
}
