// app/(public)/signup/page.tsx
'use client'; // This component uses client-side hooks

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { signInWithGoogle } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { FcGoogle } from 'react-icons/fc'; // For Google icon

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Handle messages from URL params
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

  // Handle email/password signup
  const handleEmailSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`, // Redirect after email confirmation
        },
      });

      if (error) {
        toast({
          title: 'Signup Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Check your email',
          description: 'A confirmation link has been sent to your email address. Please verify to complete signup.',
          variant: 'default',
        });
        // Optionally redirect to a 'check email' page
        router.push('/login?message=Please check your email to confirm your account.');
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

  // Handle Google OAuth signup/login
  const handleGoogleSignUp = async () => {
    setLoading(true);
    // signInWithGoogle is a server action
    await signInWithGoogle();
    // Server action will handle redirect
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          Join Us!
        </h2>
        <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
          Create your account
        </p>

        <form onSubmit={handleEmailSignup} className="space-y-4">
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
              placeholder="•••••••• (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-700 dark:hover:bg-green-800"
            disabled={loading}
          >
            {loading ? 'Signing up...' : 'Sign Up'}
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
            onClick={handleGoogleSignUp}
            disabled={loading}
          >
            <FcGoogle className="h-5 w-5" />
            Sign up with Google
          </Button>
        </div>

        <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
