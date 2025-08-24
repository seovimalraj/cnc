// actions/abandoned.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserAndProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { abandonedQuoteSchema, claimAbandonedQuoteSchema } from '@/lib/validators/abandoned';

// --- Generic Authorization Helper (reused) ---
async function authorizeAdminOrStaff() {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile || !['admin', 'staff'].includes(profile.role)) {
    redirect('/dashboard?error=UnauthorizedAccess'); // Redirect to customer dashboard
    throw new Error('Unauthorized: Admin or Staff role required.');
  }
  return { user, profile };
}

/**
 * Server Action to fetch all abandoned quote records for the admin panel.
 * Includes associated part details for display.
 */
export async function getAllAbandonedQuotesForAdmin() {
  await authorizeAdminOrStaff();
  const supabase = createClient();

  const { data: abandonedQuotes, error } = await supabase
    .from('abandoned_quotes')
    .select(`
      *,
      parts (id, file_name, created_at, owner_id)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all abandoned quotes for admin:', error);
    return { error: 'Failed to retrieve abandoned quotes.' };
  }
  return { data: abandonedQuotes };
}

/**
 * Server Action to mark an abandoned quote as 'claimed' by an administrator.
 */
export async function claimAbandonedQuote(abandonedQuoteId: string) {
  const { user, profile } = await authorizeAdminOrStaff();
  const supabase = createClient();

  const validatedInput = claimAbandonedQuoteSchema.safeParse({ abandonedQuoteId });
  if (!validatedInput.success) {
    console.error('Validation error claiming abandoned quote:', validatedInput.error);
    return { error: 'Invalid input provided.', details: validatedInput.error.flatten() };
  }

  const { data, error } = await supabase
    .from('abandoned_quotes')
    .update({
      is_claimed: true,
      claimed_by: user.id,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', abandonedQuoteId)
    .select('*')
    .single();

  if (error) {
    console.error(`Error claiming abandoned quote ${abandonedQuoteId}:`, error);
    return { error: `Failed to claim abandoned quote: ${error.message}` };
  }

  // Log activity
  const { error: activityError } = await supabase
    .from('activities')
    .insert({
      actor_id: user.id,
      type: 'abandoned_quote_claimed',
      data: { abandonedQuoteId: abandonedQuoteId, claimedBy: profile.full_name || profile.email },
    });
  if (activityError) {
    console.warn('Failed to log abandoned quote claimed activity:', activityError);
  }

  revalidatePath('/admin/abandoned');
  revalidatePath('/admin/dashboard'); // Affects abandoned funnel KPI

  return { data: { message: 'Abandoned quote claimed successfully.', updatedQuote: data } };
}

/**
 * Server Action to delete an abandoned quote record.
 */
export async function deleteAbandonedQuote(abandonedQuoteId: string) {
  await authorizeAdminOrStaff();
  const supabase = createClient();

  const { error } = await supabase
    .from('abandoned_quotes')
    .delete()
    .eq('id', abandonedQuoteId);

  if (error) {
    console.error(`Error deleting abandoned quote ${abandonedQuoteId}:`, error);
    return { error: `Failed to delete abandoned quote: ${error.message}` };
  }

  revalidatePath('/admin/abandoned');
  revalidatePath('/admin/dashboard'); // Affects abandoned funnel KPI

  return { data: { message: 'Abandoned quote deleted successfully.' } };
}
