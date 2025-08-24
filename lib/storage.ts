// lib/storage.ts - browser-friendly helpers

import { createClient } from '@/lib/supabase/client';

const SHORT_TTL_SECONDS = 60 * 5; // 5 minutes

export async function getSignedUrl(bucketName: string, filePath: string, expiresInSeconds: number = SHORT_TTL_SECONDS) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    console.error(`Error creating signed URL for ${filePath}:`, error.message);
    return { signedUrl: null, error };
  }

  return { signedUrl: data?.signedUrl, error: null };
}
