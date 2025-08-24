// app/(customer)/upload/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PartDropzone } from '@/components/upload/PartDropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { getUserAndProfile, UserProfile } from '@/lib/auth'; // Using client-side profile fetch if needed for initial check
import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { emailCaptureSchema } from '@/lib/validators/part';

// Client-side fetch for user profile to determine if anonymous
async function fetchUserProfileClient(): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile as UserProfile | null;
}

export default function UploadPage() {
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [anonymousFileUrl, setAnonymousFileUrl] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState<boolean | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Determine if the user is authenticated on component mount
  useState(() => {
    fetchUserProfileClient().then(profile => {
      setIsUserAuthenticated(!!profile);
    });
  });

  const handleUploadSuccess = (partId: string) => {
    toast({
      title: 'Part Uploaded!',
      description: 'Your part has been uploaded. Redirecting to instant quote.',
      variant: 'success',
    });
    router.push(`/instant-quote?partId=${partId}`);
  };

  const handleAnonymousUploadSuccess = (fileUrl: string) => {
    setAnonymousFileUrl(fileUrl);
    setShowEmailCapture(true);
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      emailCaptureSchema.parse({ email }); // Validate email using Zod

      // Update the abandoned quote with the captured email
      // This logic will be handled by a server action or API route
      const response = await fetch('/api/quotes/abandoned-capture', { // Create a new API route for this
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, part_file_url: anonymousFileUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to capture email and update abandoned quote.');
      }

      toast({
        title: 'Email Captured!',
        description: 'Thank you for providing your email. We\'ll save your progress.',
        variant: 'success',
      });
      setShowEmailCapture(false);
      router.push('/instant-quote'); // Redirect to instant quote after email capture
    } catch (e: any) {
      const errorMessage = e instanceof z.ZodError ? e.errors[0]?.message : e.message || 'An unexpected error occurred.';
      toast({
        title: 'Email Capture Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Render nothing or a loading spinner until authentication status is known
  if (isUserAuthenticated === null) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-2xl">
      <Card className="rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
            Upload Your CAD File
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Drag and drop your part file here to get an instant quote or add it to your parts library.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PartDropzone
            onUploadSuccess={handleUploadSuccess}
            onAnonymousUploadSuccess={handleAnonymousUploadSuccess}
            isAnonymous={!isUserAuthenticated} // Pass authentication status to the dropzone
          />
        </CardContent>
      </Card>

      {/* Email Capture Dialog for Anonymous Uploads */}
      <Dialog open={showEmailCapture} onOpenChange={setShowEmailCapture}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Don't lose your progress!
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Provide your email to save your uploaded part and continue with the instant quote. We'll link it to your account if you sign up later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEmailSubmit} className="space-y-4 py-4">
            <div>
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="col-span-3 mt-2"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
                {loading ? 'Saving...' : 'Save & Continue'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
