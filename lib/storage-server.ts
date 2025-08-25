// lib/storage.ts
import { createClient } from '@/lib/supabase/client'; // Using browser client for signed URL generation on client
import { v4 as uuidv4 } from 'uuid'; // For generating unique file names
import { FileObject } from '@supabase/storage-js';

// Bucket names as defined in the project plan
const PARTS_BUCKET = 'parts';
const ATTACHMENTS_BUCKET = 'attachments';
const SHORT_TTL_SECONDS = 60 * 5; // 5 minutes for preview URLs

/**
 * Uploads a file to a specified Supabase storage bucket.
 * This function should ideally be called from a Server Action or API route.
 *
 * @param {File} file The file to upload.
 * @param {string} bucketName The name of the storage bucket.
 * @param {string} userId The ID of the user uploading the file.
 * @returns {Promise<{ filePath: string | null; error: Error | null }>} The uploaded file path or an error.
 */
export async function uploadFileToStorage(file: File, bucketName: string, userId: string) {
  const { createServerSupabase } = await import('@/lib/supabase/server');
  const supabase = createServerSupabase(); // Server-side client for auth
  const fileExtension = file.name.split('.').pop();
  const fileName = `${userId}/${uuidv4()}.${fileExtension}`; // Organize by user ID

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, {
      cacheControl: '3600', // Cache for 1 hour
      upsert: false, // Do not overwrite existing files
    });

  if (error) {
    console.error(`Error uploading file to ${bucketName}:`, error.message);
    return { filePath: null, error };
  }

  return { filePath: data?.path, error: null };
}

/**
 * Generates a signed URL for a private file in Supabase storage.
 * This URL provides temporary access to the file.
 * This function is safe to call from client-side if only generating the URL.
 *
 * @param {string} bucketName The name of the storage bucket.
 * @param {string} filePath The path to the file within the bucket.
 * @param {number} expiresInSeconds The duration in seconds the URL will be valid.
 * @returns {Promise<{ signedUrl: string | null; error: Error | null }>} The signed URL or an error.
 */
export async function getSignedUrl(bucketName: string, filePath: string, expiresInSeconds: number = SHORT_TTL_SECONDS) {
  const supabase = createClient(); // Client-side for public anon key usage for signed URL generation
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    console.error(`Error creating signed URL for ${filePath}:`, error.message);
    return { signedUrl: null, error };
  }

  return { signedUrl: data?.signedUrl, error: null };
}

/**
 * Lists files in a Supabase storage bucket for a given user.
 * This function should be called from a Server Action or API route.
 *
 * @param {string} bucketName The name of the storage bucket.
 * @param {string} userId The ID of the user whose files to list.
 * @param {string} prefix The folder prefix (e.g., 'user_id/')
 * @returns {Promise<{ files: FileObject[] | null; error: Error | null }>} The list of files or an error.
 */
export async function listUserFiles(bucketName: string, userId: string, prefix: string = '') {
  const { createServerSupabase } = await import('@/lib/supabase/server');
  const supabase = createServerSupabase();
  const { data, error } = await supabase.storage
    .from(bucketName)
    .list(`${prefix}${userId}`, {
      limit: 100, // Adjust as needed
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    console.error(`Error listing files in ${bucketName} for user ${userId}:`, error.message);
    return { files: null, error };
  }

  return { files: data, error: null };
}

/**
 * Deletes a file from Supabase storage.
 * This function should be called from a Server Action or API route.
 *
 * @param {string} bucketName The name of the storage bucket.
 * @param {string} filePath The full path to the file (e.g., 'user_id/uuid.ext').
 * @returns {Promise<{ error: Error | null }>} An error if deletion fails.
 */
export async function deleteFileFromStorage(bucketName: string, filePath: string) {
  const { createServerSupabase } = await import('@/lib/supabase/server');
  const supabase = createServerSupabase();
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([filePath]);

  if (error) {
    console.error(`Error deleting file from ${bucketName} at path ${filePath}:`, error.message);
    return { error };
  }
  return { error: null };
}
