/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getSession() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function signOut(next = "/(auth)/login") {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  redirect(next);
}
