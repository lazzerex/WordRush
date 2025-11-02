import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AccountClient from './AccountClient';

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <AccountClient user={user} />;
}
