// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase'; // Assuming you will generate this type from your schema

/**
 * Client-side Supabase client for browser interactions.
 * This client is used in client components for fetching public data or
 * data that doesn't require server-side authentication.
 */
export function createClient() {
  // Ensure these environment variables are correctly set in .env.local and public for client-side
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables are not set for the client.");
    // In a real application, you might want to throw an error or handle this more gracefully.
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  );
}
