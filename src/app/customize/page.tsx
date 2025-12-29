import { createClient } from '@/lib/supabase/server';
import CustomizeClient from './CustomizeClient';

export default async function CustomizePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Middleware ensures user exists, but double-check for type safety
  if (!user) {
    return null;
  }

  return <CustomizeClient />;
}
