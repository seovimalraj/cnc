// app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase'; // Assuming you have this type generated

/**
 * This route handler is used by Supabase to exchange the auth code
 * received during OAuth flows (like Google) for a session.
 * It's also used for magic link callbacks after email verification.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard'; // Default redirect after callback

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    // After successful session exchange, check if user profile exists.
    // If not, create a default profile. This handles initial signup from OAuth.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') { // No rows returned
        // Profile does not exist, create one with default role
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            // role will default to 'customer' as per schema definition
          });

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent('Failed to create user profile.')}`);
        }
      } else if (profileError) {
        console.error('Error checking user profile:', profileError);
        return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent('Failed to retrieve user profile.')}`);
      }
    }
  }

  // URL to redirect to after successful sign in
  return NextResponse.redirect(`${requestUrl.origin}${next}`);
}
