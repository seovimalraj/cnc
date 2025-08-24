// Unified Supabase clients for App Router
// - Default export = createServerClient (to satisfy existing default imports)
// - Named exports: createServerClient, createBrowserClient

import { cookies } from "next/headers";
import { createServerComponentClient, createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";

export const createBrowserClient = () =>
  createBrowserSupabaseClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  });

export const createServerClient = () =>
  createServerComponentClient({ cookies });

export default createServerClient;
