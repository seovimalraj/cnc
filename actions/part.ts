// actions/part.ts
'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { getUserAndProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { partCreateSchema } from '@/lib/validators/part'; // Reusing part validation schema
import { getSignedUrl, deleteFileFromStorage } from '@/lib/storage-server'; // Reusing storage helper

// --- Generic Authorization Helper (reused) ---
async function authorizeAdminOrStaff() {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile || !['admin', 'staff'].includes(profile.role)) {
    redirect('/dashboard?error=UnauthorizedAccess'); // Redirect to customer dashboard
    throw new Error('Unauthorized: Admin or Staff role required.');
  }
  return { user, profile };
}

// Admin-specific part update schema (allowing status and metadata updates)
export const adminPartUpdateSchema = partCreateSchema.extend({
  id: z.string().uuid(),
  status: z.enum(['uploaded', 'processing', 'processed', 'error', 'archived', 'deleted'], {
    errorMap: () => ({ message: 'Invalid part status.' }),
  }).optional(),
  // Admin might directly update geometry data or preview URLs after CAD processing
  bbox: z.any().optional().nullable(),
  surface_area_mm2: z.number().positive().optional().nullable(),
  volume_mm3: z.number().positive().optional().nullable(),
  preview_url: z.string().url('Invalid preview URL.').optional().nullable(),
});

export type AdminPartUpdateInput = z.infer<typeof adminPartUpdateSchema>;


/**
 * Server Action to fetch all parts for the admin panel.
 * Includes owner profile details for display.
 */
export async function getAllPartsForAdmin() {
  await authorizeAdminOrStaff();
  const supabase = createServerSupabase();

  const { data: parts, error } = await supabase
    .from('parts')
    .select(`
      *,
      profiles (full_name, email, role)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all parts for admin:', error);
    return { error: 'Failed to retrieve parts.' };
  }
  return { data: parts };
}

/**
 * Server Action to fetch a single part's details for the admin panel.
 */
export async function getPartDetailsForAdmin(partId: string) {
  await authorizeAdminOrStaff();
  const supabase = createServerSupabase();

  const { data: part, error } = await supabase
    .from('parts')
    .select(`
      *,
      profiles (full_name, email, role)
    `)
    .eq('id', partId)
    .single();

  if (error) {
    console.error(`Error fetching part ${partId} for admin:`, error);
    if (error.code === 'PGRST116') { // No rows found
      return { error: 'Part not found.' };
    }
    return { error: 'Failed to retrieve part details.' };
  }
  return { data: part };
}


/**
 * Server Action to update a part's information by an administrator.
 */
export async function updatePartByAdmin(input: AdminPartUpdateInput) {
  await authorizeAdminOrStaff();

  const validatedInput = adminPartUpdateSchema.omit({id: true}).safeParse(input);
  if (!validatedInput.success) {
    console.error('Validation error updating part by admin:', validatedInput.error);
    return { error: 'Invalid part data provided.', details: validatedInput.error.flatten() };
  }

  const { id, ...updates } = validatedInput.data;
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from('parts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error(`Error updating part ${id}:`, error);
    return { error: `Failed to update part: ${error.message}` };
  }
  revalidatePath('/admin/parts');
  revalidatePath(`/admin/parts/${id}`);
  revalidatePath('/parts'); // Revalidate customer parts list
  revalidatePath('/dashboard'); // If dashboard shows recent parts
  revalidatePath('/instant-quote'); // If parts data affects quote page
  return { data };
}

/**
 * Server Action to delete a part record and its associated file from storage.
 */
export async function deletePartByAdmin(partId: string) {
  await authorizeAdminOrStaff();
  const supabase = createServerSupabase();

  // First, retrieve the part details to get the file_url
  const { data: partToDelete, error: fetchError } = await supabase
    .from('parts')
    .select('file_url, preview_url')
    .eq('id', partId)
    .single();

  if (fetchError || !partToDelete) {
    console.error(`Error fetching part ${partId} for deletion:`, fetchError);
    return { error: 'Failed to find part for deletion.' };
  }

  // Delete the file from Supabase Storage
  if (partToDelete.file_url) {
    const { error: deleteFileError } = await deleteFileFromStorage('parts', partToDelete.file_url);
    if (deleteFileError) {
      console.warn(`Warning: Failed to delete main part file ${partToDelete.file_url} from storage:`, deleteFileError);
      // Don't block deletion of DB record if file deletion fails but log warning
    }
  }
  // Delete preview file if it exists
  if (partToDelete.preview_url) {
    const { error: deletePreviewError } = await deleteFileFromStorage('parts', partToDelete.preview_url);
    if (deletePreviewError) {
      console.warn(`Warning: Failed to delete preview file ${partToDelete.preview_url} from storage:`, deletePreviewError);
    }
  }


  // Now, delete the part record from the database
  const { error: deleteDbError } = await supabase
    .from('parts')
    .delete()
    .eq('id', partId);

  if (deleteDbError) {
    console.error(`Error deleting part record ${partId}:`, deleteDbError);
    return { error: `Failed to delete part record: ${deleteDbError.message}` };
  }

  revalidatePath('/admin/parts');
  revalidatePath('/parts'); // Revalidate customer parts list
  revalidatePath('/admin/dashboard'); // If parts counts affect dashboard
  revalidatePath('/instant-quote'); // If part used in quote

  return { data: { message: 'Part and associated files deleted successfully.' } };
}

/**
 * Server Action to get a signed URL for a part file for admin download.
 */
export async function getSignedUrlForPart(filePath: string) {
  await authorizeAdminOrStaff();
  const { signedUrl, error } = await getSignedUrl('parts', filePath, 60 * 60 * 24); // URL valid for 24 hours
  if (error) {
    console.error(`Error generating signed URL for ${filePath}:`, error);
    return { error: 'Failed to generate signed URL.' };
  }
  return { data: signedUrl };
}
