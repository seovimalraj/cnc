// lib/auth.ts
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';

// Define a type for the user profile, matching your Supabase 'profiles' table
export type UserProfile = {
  id: string;
  email: string;
  full_name?: string | null;
  role: 'admin' | 'staff' | 'customer';
  company?: string | null;
  phone?: string | null;
  region?: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Fetches the authenticated user and their profile from Supabase.
 * If no user is found, it returns null.
 * @returns {Promise<{ user: User | null; profile: UserProfile | null }>} The authenticated user and their profile.
 */
export async function getUserAndProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return { user, profile: null };
  }

  return { user, profile: profile as UserProfile };
}


/**
 * Higher-order function to protect routes, redirecting unauthenticated users to /login.
 * @param {Function} PageComponent The Next.js page component to protect.
 * @param {string} redirectTo The path to redirect to if not authenticated.
 * @returns {Function} The protected page component.
 */
export function requireAuth(redirectTo: string = '/login') {
  return async (props: any) => {
    const { user } = await getUserAndProfile();
    if (!user) {
      redirect(redirectTo);
    }
    // Render the original component with its props
    // We pass user and profile as props for convenience, but they could also be fetched again in the component
    return (props.children || null);
  };
}

/**
 * Higher-order function to protect routes, redirecting users without 'admin' or 'staff' roles.
 * @param {Function} PageComponent The Next.js page component to protect.
 * @param {string} redirectTo The path to redirect to if not authorized.
 * @returns {Function} The protected page component.
 */
export function requireAdminOrStaff(redirectTo: string = '/dashboard') {
  return async (props: any) => {
    const { user, profile } = await getUserAndProfile();

    if (!user || !profile || !['admin', 'staff'].includes(profile.role)) {
      redirect(redirectTo);
    }
    // Render the original component with its props
    return (props.children || null);
  };
}

/**
 * Server action to handle user logout.
 */
export async function logout() {
  'use server'; // Marks this function as a Server Action

  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error logging out:', error);
    // You might want to display a toast notification or similar in a real app
  }
  redirect('/login');
}

/**
 * Server action to handle Google OAuth sign-in.
 */
export async function signInWithGoogle() {
  'use server';

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`, // Ensure this URL is correctly set and configured in Supabase
    },
  });

  if (error) {
    console.error('Error signing in with Google:', error.message);
    redirect('/login?message=Could not authenticate with Google');
  }

  if (data.url) {
    redirect(data.url); // Redirects to the Google OAuth login page
  }
}
