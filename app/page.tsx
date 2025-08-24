// app/page.tsx
import { redirect } from 'next/navigation';
import { getUserAndProfile } from '@/lib/auth';

/**
 * The root page of the application.
 * If a user is authenticated, it redirects them to their dashboard.
 * Otherwise, it redirects them to the login page.
 */
export default async function HomePage() {
  const { user } = await getUserAndProfile();

  if (user) {
    // If authenticated, redirect to dashboard
    redirect('/dashboard');
  }

  // If not authenticated, redirect to login
  redirect('/login');
}
