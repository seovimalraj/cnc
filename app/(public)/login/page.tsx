// app/(public)/login/page.tsx
'use client'; // This component uses client-side hooks

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { signInWithGoogle } from '@/lib/auth';
import { Button } from '@/components/ui/button'; // Assuming shadcn/ui Button
import { Input } from '@/components/ui/input';   // Assuming shadcn/ui Input
import { Label } from '@/components/ui/label';   // Assuming shadcn/ui Label
import { useToast } from '@/components/ui/use-toast'; // Assuming shadcn/ui toast hook
import { GithubIcon, GoogleIcon } from 'lucide-react'; // Using Lucide React for icons
import { FcGoogle } from 'react-icons/fc'; // For Google icon

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Handle messages from URL params (e.g., from middleware redirects)
  useEffect(() => {
    const message = searchParams.get('message');
    const error = searchParams.get('error');

    if (message) {
      toast({
        title: 'Info',
        description: message,
        variant: 'default',
      });
    }
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [searchParams, toast]);

  // Handle email/password login (or magic link if password is not provided)
  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: 'Login Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else if (data.user) {
        toast({
          title: 'Login Successful',
          description: 'Redirecting to dashboard...',
          variant: 'success',
        });
        router.push('/dashboard'); // Redirect to dashboard on successful login
      } else {
         // This path is typically hit if signInWithPassword is used without a password
         // and email link is sent. Supabase handles the actual redirect via email.
         toast({
            title: 'Check your email',
            description: 'A magic link has been sent to your email address.',
            variant: 'default',
         });
      }
    } catch (err: any) {
      toast({
        title: 'An unexpected error occurred',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth login
  const handleGoogleSignIn = async () => {
    setLoading(true);
    // signInWithGoogle is a server action
    await signInWithGoogle();
    // Server action will handle redirect
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          Welcome Back!
        </h2>
        <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
          Sign in to your account
        </p>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
              Or continue with
            </span>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md border border-gray-300 dark:border-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <FcGoogle className="h-5 w-5" />
            Sign in with Google
          </Button>
          {/* You can add other OAuth providers here if needed */}
          {/* <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md border border-gray-300 dark:border-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => {
              // Implement GitHub sign-in if needed
              toast({ title: 'Not Implemented', description: 'GitHub sign-in is not yet available.', variant: 'info' });
            }}
            disabled={loading}
          >
            <GithubIcon className="h-5 w-5" />
            Sign in with GitHub
          </Button> */}
        </div>

        <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link href="/signup" className="font-medium text-blue-600 hover:underline dark:text-blue-500">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
