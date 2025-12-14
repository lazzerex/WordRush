import { createClient } from '@supabase/supabase-js';

// to prevent some accidental import in client-side bundles
if (typeof window !== 'undefined') {
  throw new Error('Admin client cannot be used on the client side!');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. This file must only be imported server-side.');
}

export function createAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
