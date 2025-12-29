import { createClient } from '@/lib/supabase/server';
import ShopClient from './ShopClient';

export default async function ShopPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Middleware ensures user exists, but double-check for type safety
  if (!user) {
    return null;
  }

  return <ShopClient />;
}
