import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function createServerSupabase() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url || !anon) throw new Error('Missing Supabase env vars');

  // In App Router, writes to cookies must happen in route handlers or server actions.
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {
        // no-op here; set cookies within route handlers or server actions
      },
      remove() {
        // no-op here; remove cookies within route handlers or server actions
      }
    },
    headers: {
      get(name: string) {
        return headers().get(name) ?? undefined;
      }
    }
  });
}
