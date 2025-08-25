// app/api/upload/part/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { uploadFileToStorage } from '@/lib/storage-server';
import { partCreateSchema, abandonedQuoteCreateSchema, fileSchema } from '@/lib/validators/part';
import { z } from 'zod';

/**
 * API Route to handle CAD file uploads and metadata persistence.
 * Supports both authenticated user uploads and anonymous abandoned quote capture.
 */
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const isAnonymousStr = formData.get('isAnonymous') as string | null;
  const isAnonymous = isAnonymousStr === 'true';

  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  // Validate file using Zod schema
  try {
    fileSchema.parse(file);
  } catch (e: any) {
    const errorMessage = e instanceof z.ZodError ? e.errors[0]?.message : 'Invalid file provided.';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  let ownerId: string | null = null;
  let customerId: string | null = null;
  if (user) {
    ownerId = user.id;
    // Attempt to find customer_id if user is logged in
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching profile for customer ID:', profileError);
      return NextResponse.json({ error: 'Failed to retrieve user profile for customer ID.' }, { status: 500 });
    }
    // Assuming profile.id directly relates to customer_id if they are the same in the profiles table.
    // In a more complex setup, you might have a dedicated customers table and link profiles to customers.
    customerId = profile?.id || null;
  } else if (!isAnonymous) {
    // If not anonymous and no user, it's an unauthorized request
    return NextResponse.json({ error: 'Unauthorized: No authenticated user.' }, { status: 401 });
  }

  // Upload file to Supabase Storage
  const { filePath, error: uploadError } = await uploadFileToStorage(file, 'parts', ownerId || 'anonymous');

  if (uploadError || !filePath) {
    console.error('File upload failed:', uploadError?.message);
    return NextResponse.json({ error: 'Failed to upload file to storage.' }, { status: 500 });
  }

  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

  const partData = {
    owner_id: ownerId,
    customer_id: customerId,
    file_url: filePath, // This is the path in the bucket, not a public URL yet
    file_name: file.name,
    file_ext: fileExtension,
    size_bytes: file.size,
    status: 'uploaded', // Initial status
    // bbox, surface_area_mm2, volume_mm3 would typically be populated by a CAD processing service
    // For now, we leave them null or set default/placeholder values.
  };

  // Validate part data before inserting
  const parsedPartData = partCreateSchema.safeParse(partData);
  if (!parsedPartData.success) {
    console.error('Part data validation failed:', parsedPartData.error);
    // Attempt to delete the uploaded file if part data is invalid to clean up
    await supabase.storage.from('parts').remove([filePath]);
    return NextResponse.json({ error: 'Invalid part data provided.', details: parsedPartData.error.flatten() }, { status: 400 });
  }

  if (isAnonymous) {
    // If anonymous, create an abandoned quote entry
    const abandonedQuoteData = {
      email: null, // Will be captured later via modal
      part_file_url: filePath,
      activity: { type: 'part_uploaded', file_name: file.name, size_bytes: file.size, timestamp: new Date().toISOString() },
    };

    const parsedAbandonedQuoteData = abandonedQuoteCreateSchema.safeParse(abandonedQuoteData);
    if (!parsedAbandonedQuoteData.success) {
      console.error('Abandoned quote data validation failed:', parsedAbandonedQuoteData.error);
      await supabase.storage.from('parts').remove([filePath]); // Clean up uploaded file
      return NextResponse.json({ error: 'Invalid abandoned quote data.', details: parsedAbandonedQuoteData.error.flatten() }, { status: 400 });
    }

    const { data: abandonedQuote, error: abandonedQuoteError } = await supabase
      .from('abandoned_quotes')
      .insert(parsedAbandonedQuoteData.data)
      .select('id, part_file_url')
      .single();

    if (abandonedQuoteError) {
      console.error('Error inserting abandoned quote:', abandonedQuoteError);
      await supabase.storage.from('parts').remove([filePath]); // Clean up uploaded file
      return NextResponse.json({ error: 'Failed to log abandoned quote activity.' }, { status: 500 });
    }

    // For anonymous flow, return the file_url to prompt for email capture
    return NextResponse.json({
      message: 'Anonymous part uploaded, please provide email to save progress.',
      part: {
        file_url: filePath,
        id: abandonedQuote.id, // Using abandoned quote ID as a temporary identifier
      },
    }, { status: 200 });

  } else {
    // If authenticated, insert part into 'parts' table
    const { data: part, error: partInsertError } = await supabase
      .from('parts')
      .insert(parsedPartData.data)
      .select('*')
      .single();

    if (partInsertError) {
      console.error('Error inserting part:', partInsertError);
      await supabase.storage.from('parts').remove([filePath]); // Clean up uploaded file
      return NextResponse.json({ error: 'Failed to record part metadata.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Part uploaded and recorded successfully.', part: part }, { status: 200 });
  }
}
