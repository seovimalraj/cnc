// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase'; // Assuming you will generate this type from your schema

/**
 * Server-side Supabase client for authenticated server component and server action interactions.
 * This client handles cookies to maintain session state securely on the server.
 */
export function createClient() {
  // Ensure these environment variables are correctly set in .env.local
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables are not set for the server.");
    // In a real application, you might want to throw an error or handle this more gracefully.
  }

  const cookieStore = cookies();

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This is a Next.js App Router practical restriction.
            // You can only set cookies in a Server Action or Route Handler.
            // https://nextjs.org/docs/app/api-reference/functions/cookies#cookiessetname-value-options
            console.error("Could not set cookie from Server Component:", error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            console.error("Could not remove cookie from Server Component:", error);
          }
        },
      },
    }
  );
}
