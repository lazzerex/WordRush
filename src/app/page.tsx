import { createClient } from '@/lib/supabase/server';
import HomeClient from './HomeClient';

// Uses cookies for auth (see account/page.tsx for the same pattern).
export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <HomeClient initialIsAuthenticated={!!user} />;
}
