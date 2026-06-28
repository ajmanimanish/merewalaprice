import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Configure them in .env.local.'
  );
}

// Client for public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client with elevated permissions for server actions (scrapers, background notifications, bypass RLS)
export function getSupabaseService() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceKey) {
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY is missing in env. Falling back to default supabase client.'
    );
    return supabase;
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
