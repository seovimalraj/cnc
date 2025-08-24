// actions/user.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserAndProfile, UserProfile } from '@/lib/auth';
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

// --- Zod Schema for User Profile Update (Admin view) ---
// Admins can update more fields than a regular user
export const adminProfileUpdateSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().trim().min(1, 'Full name is required.').max(100, 'Full name cannot exceed 100 characters.').optional().nullable(),
  email: z.string().email('Invalid email address.').optional(), // Email might be updated by admin
  role: z.enum(['admin', 'staff', 'customer'], {
    errorMap: () => ({ message: 'Invalid role selected.' }),
  }),
  company: z.string().trim().max(100, 'Company name cannot exceed 100 characters.').optional().nullable(),
  phone: z.string().trim().max(20, 'Phone number cannot exceed 20 characters.').optional().nullable(),
  region: z.string().trim().max(50, 'Region cannot exceed 50 characters.').optional().nullable(),
  is_active: z.boolean().optional(), // For activating/deactivating users (if we add a column in profile)
});

export type AdminProfileUpdateInput = z.infer<typeof adminProfileUpdateSchema>;


/**
 * Server Action to fetch all user profiles for the admin panel.
 */
export async function getAllUserProfilesForAdmin() {
  await authorizeAdminOrStaff();
  const supabase = createClient();

  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all user profiles for admin:', error);
    return { error: 'Failed to retrieve user profiles.' };
  }
  return { data: profiles as UserProfile[] };
}

/**
 * Server Action to update a user's profile and role by an administrator.
 */
export async function updateUserProfileByAdmin(input: AdminProfileUpdateInput) {
  const { profile: adminProfile } = await authorizeAdminOrStaff(); // Get the admin's profile

  // Validate input using Zod schema
  const validatedInput = adminProfileUpdateSchema.safeParse(input);
  if (!validatedInput.success) {
    console.error('Validation error updating user profile by admin:', validatedInput.error);
    return { error: 'Invalid user profile data provided.', details: validatedInput.error.flatten() };
  }

  const { id, ...updates } = validatedInput.data; // Extract ID and rest of updates

  // Prevent admin from changing their own role (or ensure they don't lock themselves out)
  if (id === adminProfile.id && updates.role && updates.role !== adminProfile.role) {
      return { error: 'You cannot change your own role through this interface.' };
  }
   // Prevent admin from deactivating themselves
  if (id === adminProfile.id && updates.is_active === false) {
    return { error: 'You cannot deactivate your own account.' };
  }

  const supabase = createClient();

  // First, update the public.profiles table
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({
      full_name: updates.full_name,
      email: updates.email, // Allow email update in profile (though auth.users needs separate handling)
      role: updates.role,
      company: updates.company,
      phone: updates.phone,
      region: updates.region,
      // Add is_active if you have this column in your profiles table
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (profileUpdateError) {
    console.error(`Error updating profile ${id}:`, profileUpdateError);
    return { error: `Failed to update user profile: ${profileUpdateError.message}` };
  }

  // --- Handling auth.users email update ---
  // If email is being changed, we should also update it in auth.users
  // Note: Changing email in auth.users sends a verification email by default.
  // This operation requires a service role or a specific Supabase function/hook if done directly from client.
  // Since this is a server action, it could technically use the service role key,
  // but for security, it's generally safer to trigger a RLS-enabled function or let the user re-verify.
  // For now, we update the email in the profile table. If the email in auth.users
  // needs to be updated, a separate mechanism like an email change flow for the user
  // or an admin-triggered backend function would be more robust.
  /*
  if (updates.email && updates.email !== currentProfile.email) { // currentProfile would be fetched before update
      const { error: authUserUpdateError } = await supabase.auth.admin.updateUserById(id, { email: updates.email });
      if (authUserUpdateError) {
          console.error(`Error updating auth.users email for ${id}:`, authUserUpdateError);
          // Decide how to handle this - either revert profile email or inform admin
      }
  }
  */

  revalidatePath('/admin/users');
  revalidatePath('/admin/dashboard'); // If user/role changes affect dashboard
  return { data: { message: 'User profile updated successfully!' } };
}

/**
 * Server Action to delete a user's profile and associated data by an administrator.
 * IMPORTANT: This only deletes from the 'profiles' table.
 * Deleting from 'auth.users' directly from a Server Action is NOT recommended
 * due to security implications and potential for breaking referential integrity.
 * A Supabase Function (Edge Function or SQL Function) triggered by a profile delete
 * or a specific admin workflow should handle 'auth.users' deletion.
 */
export async function deleteUserProfileByAdmin(userId: string) {
  const { profile: adminProfile } = await authorizeAdminOrStaff();

  // Prevent admin from deleting their own account
  if (userId === adminProfile.id) {
      return { error: 'You cannot delete your own account.' };
  }

  const supabase = createClient();

  // First, delete related customer data if it exists
  const { error: deleteCustomerError } = await supabase
    .from('customers')
    .delete()
    .eq('owner_id', userId);

  if (deleteCustomerError) {
    console.warn(`Warning: Failed to delete customer record for user ${userId}:`, deleteCustomerError);
    // Continue with profile deletion even if customer deletion fails, but log it.
  }

  // Then, delete the profile
  const { error: profileDeleteError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (profileDeleteError) {
    console.error(`Error deleting profile ${userId}:`, profileDeleteError);
    return { error: `Failed to delete user profile: ${profileDeleteError.message}` };
  }

  // IMPORTANT: For a full user deletion, you would also need to delete the user
  // from Supabase Auth (auth.users). This is typically done via a Supabase Edge Function
  // or a server-side API endpoint that uses a service role key.
  // Example: await supabase.auth.admin.deleteUser(userId); (Requires service role)
  // Our current RLS setup for profiles references auth.users(id) with ON DELETE CASCADE,
  // so deleting from auth.users *will* cascade to profiles. However, deleting profiles first
  // will *not* cascade to auth.users. The user record in auth.users will remain unless
  // explicitly handled.

  revalidatePath('/admin/users');
  revalidatePath('/admin/dashboard'); // If user counts affect dashboard
  return { data: { message: 'User profile and associated customer data deleted successfully. (Auth user record may persist).' } };
}
