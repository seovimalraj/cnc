/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/client";

export async function getSession() {
  const supabase = createServerClient();
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function signOut(next = "/(auth)/login") {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  redirect(next);
}
