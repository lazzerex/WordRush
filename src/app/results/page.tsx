import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ResultsClient from './ResultsClient';

export default async function ResultsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <ResultsClient user={user} />;
}
