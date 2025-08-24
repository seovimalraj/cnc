// app/api/quotes/abandoned-capture/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { emailCaptureSchema } from '@/lib/validators/part'; // Reusing the email capture schema

/**
 * API Route to capture email for an abandoned quote and update the record.
 * This is called after an anonymous user uploads a CAD file and provides their email.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const body = await request.json();

  // Validate the request body
  const parsedBody = emailCaptureSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Invalid email provided.', details: parsedBody.error.flatten() }, { status: 400 });
  }

  const { email, part_file_url } = parsedBody.data;

  if (!part_file_url) {
    return NextResponse.json({ error: 'Part file URL is required to link the email to an abandoned quote.' }, { status: 400 });
  }

  try {
    // Find the abandoned quote by the part_file_url and update its email
    const { data, error } = await supabase
      .from('abandoned_quotes')
      .update({ email: email, updated_at: new Date().toISOString() }) // Update email and timestamp
      .eq('part_file_url', part_file_url)
      .eq('is_claimed', false) // Only update if not already claimed by a registered user
      .select('id, email')
      .single();

    if (error) {
      console.error('Error updating abandoned quote with email:', error);
      return NextResponse.json({ error: 'Failed to update abandoned quote with email.' }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ error: 'Abandoned quote not found or already claimed.' }, { status: 404 });
    }

    // Optionally, log an activity for email capture
    const { error: activityError } = await supabase
      .from('activities')
      .insert({
        type: 'abandoned_quote_email_captured',
        data: { email, abandoned_quote_id: data.id, part_file_url },
        // No actor_id as this is for an anonymous flow
      });

    if (activityError) {
      console.warn('Warning: Failed to log activity for abandoned quote email capture:', activityError);
    }

    return NextResponse.json({ message: 'Email captured and abandoned quote updated successfully.', abandonedQuote: data }, { status: 200 });

  } catch (error: any) {
    console.error('An unexpected error occurred during email capture:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
