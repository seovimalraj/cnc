import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export async function requireAuth() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (error || !data || !['admin', 'staff'].includes(data.role)) redirect('/');
  return user;
}
