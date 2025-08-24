// lib/supabase/client.ts
// Lightweight browser Supabase client

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key';
  return createBrowserSupabaseClient({ supabaseUrl, supabaseKey });
};

// Named export for explicitness
export const createBrowserClient = createClient;

export default createClient;
