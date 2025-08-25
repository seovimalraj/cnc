// actions/profile.ts
'use server'; // All functions in this file are Server Actions

import { createServerSupabase } from '@/lib/supabase/server';
import { getUserAndProfile, UserProfile } from '@/lib/auth';
import { profileUpdateSchema, ProfileUpdateInput, addressSchema, AddressInput } from '@/lib/validators/profile';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * Server Action to fetch the current user's profile and associated customer data.
 */
export async function fetchUserAccountData() {
  const { user, profile } = await getUserAndProfile();

  if (!user || !profile) {
    return { error: 'Unauthorized: User not authenticated.' };
  }

  const supabase = createServerSupabase();

  // Fetch customer data linked to the profile
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('owner_id', profile.id)
    .single();

  if (customerError && customerError.code !== 'PGRST116') { // PGRST116 = No rows found
    console.error('Error fetching customer data:', customerError);
    return { error: 'Failed to retrieve customer data.' };
  }

  return { data: { profile, customer } };
}

/**
 * Server Action to update the user's profile information.
 */
export async function updateProfile(input: ProfileUpdateInput) {
  const { user, profile } = await getUserAndProfile();

  if (!user || !profile) {
    return { error: 'Unauthorized: User not authenticated.' };
  }

  // Validate input using Zod schema
  const validatedInput = profileUpdateSchema.safeParse(input);
  if (!validatedInput.success) {
    console.error('Validation error for updateProfile:', validatedInput.error);
    return { error: 'Invalid profile data provided.', details: validatedInput.error.flatten() };
  }

  const supabase = createServerSupabase();

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: validatedInput.data.full_name,
      company: validatedInput.data.company,
      phone: validatedInput.data.phone,
      region: validatedInput.data.region,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    return { error: 'Failed to update profile.' };
  }

  // Revalidate paths that might display profile information
  revalidatePath('/account');
  revalidatePath('/dashboard'); // If dashboard shows user name etc.

  return { data: { message: 'Profile updated successfully!' } };
}

/**
 * Server Action to update customer address information (billing or shipping).
 * This will also create a customer record if one doesn't exist for the user.
 */
export async function updateCustomerAddress(type: 'billing_address' | 'shipping_address', address: AddressInput) {
  const { user, profile } = await getUserAndProfile();

  if (!user || !profile) {
    return { error: 'Unauthorized: User not authenticated.' };
  }

  // Validate address input
  const validatedAddress = addressSchema.safeParse(address);
  if (!validatedAddress.success) {
    console.error(`Validation error for ${type}:`, validatedAddress.error);
    return { error: `Invalid ${type} data provided.`, details: validatedAddress.error.flatten() };
  }

  const supabase = createServerSupabase();

  // First, try to find an existing customer record for this profile
  const { data: existingCustomer, error: fetchError } = await supabase
    .from('customers')
    .select('id')
    .eq('owner_id', profile.id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // Not a "no rows" error
    console.error('Error checking for existing customer:', fetchError);
    return { error: 'Failed to check customer record.' };
  }

  if (existingCustomer) {
    // If customer exists, update it
    const updatePayload = {
      [type]: validatedAddress.data, // Dynamically set billing_address or shipping_address
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('customers')
      .update(updatePayload)
      .eq('id', existingCustomer.id);

    if (error) {
      console.error(`Error updating ${type}:`, error);
      return { error: `Failed to update ${type}.` };
    }
  } else {
    // If no customer record, create a new one
    const insertPayload = {
      owner_id: profile.id,
      name: profile.full_name || profile.email, // Use profile name/email as default customer name
      [type]: validatedAddress.data,
    };
    const { error } = await supabase
      .from('customers')
      .insert(insertPayload);

    if (error) {
      console.error(`Error creating customer with ${type}:`, error);
      return { error: `Failed to create customer record with ${type}.` };
    }
  }

  revalidatePath('/account');
  return { data: { message: `${type.replace('_', ' ')} updated successfully!` } };
}
