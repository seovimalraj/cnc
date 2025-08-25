// app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getUserAndProfile } from '@/lib/auth';
import { messageCreateSchema } from '@/lib/validators/message';
import { z } from 'zod';
import { uploadFileToStorage, getSignedUrl } from '@/lib/storage-server'; // Re-use storage utility
import { revalidatePath } from 'next/cache';

/**
 * API Route to handle new message creation and potentially attachment uploads.
 * This route is intended for POST requests to create a new message.
 */
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  const { user, profile } = await getUserAndProfile();

  if (!user || !profile) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const formData = await request.formData();
  const quote_id = formData.get('quote_id') as string;
  const content = formData.get('content') as string;
  const files = formData.getAll('attachments') as File[]; // Get all files

  let attachments: { file_url: string; file_name: string; mime_type?: string; size?: number; }[] = [];

  // Handle attachment uploads if files are present
  if (files && files.length > 0) {
    for (const file of files) {
      if (file.size > 0) { // Ensure it's a real file, not an empty entry
        const { filePath, error: uploadError } = await uploadFileToStorage(file, 'attachments', user.id);
        if (uploadError || !filePath) {
          console.error('Attachment upload failed:', uploadError?.message);
          return NextResponse.json({ error: `Failed to upload attachment: ${file.name}` }, { status: 500 });
        }
        attachments.push({
          file_url: filePath, // This is the internal path
          file_name: file.name,
          mime_type: file.type,
          size: file.size,
        });
      }
    }
  }

  const messageData = {
    quote_id,
    content,
    sender_id: user.id,
    sender_role: profile.role,
    attachments: attachments.length > 0 ? attachments : null, // Store as JSONB
  };

  // Validate message data using Zod schema
  const parsedMessageData = messageCreateSchema.safeParse(messageData);
  if (!parsedMessageData.success) {
    console.error('Message data validation failed:', parsedMessageData.error);
    // Optionally, delete uploaded attachments if message data is invalid
    // For simplicity, we skip deletion here, but in production, you might want to implement cleanup.
    return NextResponse.json({ error: 'Invalid message data provided.', details: parsedMessageData.error.flatten() }, { status: 400 });
  }

  const { data: newMessage, error: insertError } = await supabase
    .from('messages')
    .insert(parsedMessageData.data)
    .select('*') // Select all columns of the inserted message
    .single();

  if (insertError) {
    console.error('Error inserting message:', insertError);
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }

  // Log activity
  const { error: activityError } = await supabase
    .from('activities')
    .insert({
      actor_id: user.id,
      customer_id: profile.id, // Assuming profile.id is the customer_id
      quote_id: quote_id,
      type: 'message_sent',
      data: { messageId: newMessage.id, content: newMessage.content.substring(0, 50) + '...' },
    });
  if (activityError) {
    console.warn('Failed to log message activity:', activityError);
  }

  // Revalidate the path for this quote to show new message if it's SSR
  revalidatePath(`/quotes/${quote_id}`);

  return NextResponse.json({ message: 'Message sent successfully.', data: newMessage }, { status: 201 });
}
