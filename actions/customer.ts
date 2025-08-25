// actions/customer.ts
'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { getUserAndProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { customerSchema, CustomerInput, customerAddressSchema, CustomerAddressInput } from '@/lib/validators/customer';

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
 * Server Action to fetch all customers for the admin panel.
 * Includes owner profile details for display
 */
export async function getAllCustomersForAdmin() {
  await authorizeAdminOrStaff();
  const supabase = createServerSupabase();

  const { data: customers, error } = await supabase
    .from('customers')
    .select(`
      *,
      profiles (full_name, email, role)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all customers for admin:', error);
    return { error: 'Failed to retrieve customers.' };
  }
  return { data: customers };
}

/**
 * Server Action to fetch a single customer's details for the admin panel.
 */
export async function getCustomerDetailsForAdmin(customerId: string) {
  await authorizeAdminOrStaff();
  const supabase = createServerSupabase();

  const { data: customer, error } = await supabase
    .from('customers')
    .select(`
      *,
      profiles (full_name, email, role)
    `)
    .eq('id', customerId)
    .single();

  if (error) {
    console.error(`Error fetching customer ${customerId} for admin:`, error);
    if (error.code === 'PGRST116') { // No rows found
      return { error: 'Customer not found.' };
    }
    return { error: 'Failed to retrieve customer details.' };
  }
  return { data: customer };
}

/**
 * Server Action to update a customer's main information.
 */
export async function updateCustomerInfo(customerId: string, input: Omit<CustomerInput, 'id' | 'billing_address' | 'shipping_address'>) {
  await authorizeAdminOrStaff();
  const validatedInput = customerSchema.omit({id: true, billing_address: true, shipping_address: true}).safeParse(input);
  if (!validatedInput.success) {
    console.error('Validation error updating customer info:', validatedInput.error);
    return { error: 'Invalid customer info data provided.', details: validatedInput.error.flatten() };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('customers')
    .update({ ...validatedInput.data, updated_at: new Date().toISOString() })
    .eq('id', customerId)
    .select('*')
    .single();

  if (error) {
    console.error(`Error updating customer info for ${customerId}:`, error);
    return { error: `Failed to update customer info: ${error.message}` };
  }
  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${customerId}`);
  return { data };
}

/**
 * Server Action to update a customer's billing or shipping address.
 */
export async function updateCustomerAddressByAdmin(customerId: string, type: 'billing_address' | 'shipping_address', address: CustomerAddressInput) {
  await authorizeAdminOrStaff();
  const validatedAddress = customerAddressSchema.safeParse(address);
  if (!validatedAddress.success) {
    console.error(`Validation error for customer ${type}:`, validatedAddress.error);
    return { error: `Invalid ${type} data provided.`, details: validatedAddress.error.flatten() };
  }

  const supabase = createServerSupabase();
  const updatePayload = {
    [type]: validatedAddress.data,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('customers')
    .update(updatePayload)
    .eq('id', customerId)
    .select('*')
    .single();

  if (error) {
    console.error(`Error updating customer ${type} for ${customerId}:`, error);
    return { error: `Failed to update customer ${type}: ${error.message}` };
  }
  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${customerId}`);
  return { data };
}

/**
 * Server Action to delete a customer record.
 * This will NOT delete the associated profile, but will nullify owner_id in parts/quotes etc.
 * (due to ON DELETE SET NULL constraint in schema)
 */
export async function deleteCustomerByAdmin(customerId: string) {
  await authorizeAdminOrStaff();
  const supabase = createServerSupabase();

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', customerId);

  if (error) {
    console.error(`Error deleting customer ${customerId}:`, error);
    return { error: `Failed to delete customer: ${error.message}` };
  }

  revalidatePath('/admin/customers');
  revalidatePath('/admin/dashboard'); // If customer counts affect dashboard

  return { data: { message: 'Customer deleted successfully.' } };
}
