import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CustomizeClient from './CustomizeClient';

export default async function CustomizePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <CustomizeClient />;
}
