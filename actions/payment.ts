// actions/payment.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserAndProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// --- Generic Authorization Helper (reused) ---
async function authorizeAdminOrStaff() {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile || !['admin', 'staff'].includes(profile.role)) {
    redirect('/dashboard?error=UnauthorizedAccess'); // Redirect to customer dashboard
    throw new Error('Unauthorized: Admin or Staff role required.');
  }
  return { user, profile };
}

// --- Zod Schema for Payment Update (Admin view) ---
export const adminPaymentUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'completed', 'failed', 'refunded'], {
    errorMap: () => ({ message: 'Invalid payment status.' }),
  }).optional(),
  amount: z.number().positive('Amount must be positive.').optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter code (e.g., USD).').optional(),
  transaction_id: z.string().min(1, 'Transaction ID is required.').optional().nullable(),
  payment_method: z.string().optional().nullable(),
  // Admin might also update payment_intent_id, but usually these are set by gateway
});

export type AdminPaymentUpdateInput = z.infer<typeof adminPaymentUpdateSchema>;

/**
 * Server Action to fetch all payment records for the admin panel.
 * Includes associated quote and customer/payer profile details for display.
 */
export async function getAllPaymentsForAdmin() {
  await authorizeAdminOrStaff();
  const supabase = createClient();

  const { data: payments, error } = await supabase
    .from('payments')
    .select(`
      *,
      quotes (id, customer_id),
      profiles (full_name, email, role)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all payments for admin:', error);
    return { error: 'Failed to retrieve payments.' };
  }
  return { data: payments };
}

/**
 * Server Action to fetch a single payment's details for the admin panel.
 */
export async function getPaymentDetailsForAdmin(paymentId: string) {
  await authorizeAdminOrStaff();
  const supabase = createClient();

  const { data: payment, error } = await supabase
    .from('payments')
    .select(`
      *,
      quotes (id, customer_id, total, currency, status, customers (id, name)),
      profiles (full_name, email, role)
    `)
    .eq('id', paymentId)
    .single();

  if (error) {
    console.error(`Error fetching payment ${paymentId} for admin:`, error);
    if (error.code === 'PGRST116') { // No rows found
      return { error: 'Payment not found.' };
    }
    return { error: 'Failed to retrieve payment details.' };
  }
  return { data: payment };
}

/**
 * Server Action to update a payment record by an administrator.
 */
export async function updatePaymentByAdmin(input: AdminPaymentUpdateInput) {
  await authorizeAdminOrStaff();

  const validatedInput = adminPaymentUpdateSchema.omit({id: true}).safeParse(input);
  if (!validatedInput.success) {
    console.error('Validation error updating payment by admin:', validatedInput.error);
    return { error: 'Invalid payment data provided.', details: validatedInput.error.flatten() };
  }

  const { id, ...updates } = validatedInput.data;
  const supabase = createClient();

  const { data, error } = await supabase
    .from('payments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error(`Error updating payment ${id}:`, error);
    return { error: `Failed to update payment: ${error.message}` };
  }

  // If payment status changes to 'completed', you might also want to update the associated quote's status to 'paid'
  if (data?.status === 'completed' && data.quote_id) {
    const { error: quoteUpdateError } = await supabase
      .from('quotes')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', data.quote_id);
    if (quoteUpdateError) {
      console.warn(`Warning: Failed to update quote status to 'paid' for quote ${data.quote_id}:`, quoteUpdateError);
    }
  }

  revalidatePath('/admin/payments');
  revalidatePath(`/admin/quotes/${data?.quote_id}`); // Revalidate associated quote page
  revalidatePath('/admin/dashboard'); // Payments affect dashboard KPIs
  return { data };
}

/**
 * Server Action to delete a payment record.
 */
export async function deletePaymentByAdmin(paymentId: string) {
  await authorizeAdminOrStaff();
  const supabase = createClient();

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId);

  if (error) {
    console.error(`Error deleting payment ${paymentId}:`, error);
    return { error: `Failed to delete payment: ${error.message}` };
  }

  revalidatePath('/admin/payments');
  revalidatePath('/admin/dashboard'); // Payments affect dashboard KPIs

  return { data: { message: 'Payment deleted successfully.' } };
}
