// actions/custom_form.ts
'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { getUserAndProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { customFormSchema, CustomFormDefinition } from '@/lib/validators/form';

// --- Generic Authorization Helper (reused) ---
async function authorizeAdminOrStaff() {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile || !['admin', 'staff'].includes(profile.role)) {
    redirect('/dashboard?error=UnauthorizedAccess'); // Redirect to customer dashboard
    throw new Error('Unauthorized: Admin or Staff role required.');
  }
  return { user, profile };
}

// Admin-specific form input schema (extends base schema for form properties)
export const adminFormInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Form name is required.').max(100, 'Name cannot exceed 100 characters.'),
  description: z.string().max(500, 'Description cannot exceed 500 characters.').optional().nullable(),
  audience: z.enum(['customer', 'admin', 'public']), // Who can see/fill this form
  schema: customFormSchema, // The actual JSON schema for the form fields
  is_active: z.boolean().default(true),
});

export type AdminFormInput = z.infer<typeof adminFormInputSchema>;


/**
 * Server Action to fetch all custom form definitions for the admin panel.
 */
export async function getAllCustomFormsForAdmin() {
  await authorizeAdminOrStaff();
  const supabase = createServerSupabase();

  const { data: customForms, error } = await supabase
    .from('custom_forms')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all custom forms for admin:', error);
    return { error: 'Failed to retrieve custom forms.' };
  }
  return { data: customForms };
}

/**
 * Server Action to fetch a single custom form definition for the admin panel.
 */
export async function getCustomFormDetailsForAdmin(formId: string) {
  await authorizeAdminOrStaff();
  const supabase = createServerSupabase();

  const { data: form, error } = await supabase
    .from('custom_forms')
    .select('*')
    .eq('id', formId)
    .single();

  if (error) {
    console.error(`Error fetching custom form ${formId} for admin:`, error);
    if (error.code === 'PGRST116') { // No rows found
      return { error: 'Form not found.' };
    }
    return { error: 'Failed to retrieve form details.' };
  }

  // Validate the fetched schema against the CustomFormDefinition
  const parsedSchema = customFormSchema.safeParse(form.schema);
  if (!parsedSchema.success) {
      console.error(`Invalid internal schema for form ${formId}:`, parsedSchema.error);
      return { error: 'Form has an invalid internal schema definition.' };
  }

  return { data: { ...form, schema: parsedSchema.data } };
}


/**
 * Server Action to create a new custom form definition.
 */
export async function createCustomForm(input: AdminFormInput) {
  const { profile } = await authorizeAdminOrStaff();
  const validatedInput = adminFormInputSchema.safeParse(input);
  if (!validatedInput.success) {
    console.error('Validation error creating custom form:', validatedInput.error);
    return { error: 'Invalid form data provided.', details: validatedInput.error.flatten() };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('custom_forms')
    .insert({
      name: validatedInput.data.name,
      description: validatedInput.data.description,
      audience: validatedInput.data.audience,
      schema: validatedInput.data.schema, // Store as JSONB
      is_active: validatedInput.data.is_active,
      created_by: profile.id,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating custom form:', error);
    return { error: `Failed to create custom form: ${error.message}` };
  }
  revalidatePath('/admin/forms');
  revalidatePath('/admin/dashboard'); // If form counts affect dashboard
  return { data };
}

/**
 * Server Action to update an existing custom form definition.
 */
export async function updateCustomForm(formId: string, input: AdminFormInput) {
  await authorizeAdminOrStaff();

  const validatedInput = adminFormInputSchema.omit({id: true}).safeParse(input);
  if (!validatedInput.success) {
    console.error('Validation error updating custom form:', validatedInput.error);
    return { error: 'Invalid form data provided.', details: validatedInput.error.flatten() };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('custom_forms')
    .update({
      name: validatedInput.data.name,
      description: validatedInput.data.description,
      audience: validatedInput.data.audience,
      schema: validatedInput.data.schema, // Store as JSONB
      is_active: validatedInput.data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', formId)
    .select('*')
    .single();

  if (error) {
    console.error(`Error updating custom form ${formId}:`, error);
    return { error: `Failed to update custom form: ${error.message}` };
  }
  revalidatePath('/admin/forms');
  revalidatePath(`/admin/forms/${formId}`); // Revalidate specific form page if it exists
  revalidatePath('/admin/dashboard');
  revalidatePath('/forms/[formId]'); // Revalidate the customer-facing view
  return { data };
}

/**
 * Server Action to delete a custom form definition.
 * IMPORTANT: This will NOT delete associated custom_form_responses.
 * You might want a separate process or admin action for that.
 */
export async function deleteCustomForm(formId: string) {
  await authorizeAdminOrStaff();
  const supabase = createServerSupabase();

  const { error } = await supabase
    .from('custom_forms')
    .delete()
    .eq('id', formId);

  if (error) {
    console.error(`Error deleting custom form ${formId}:`, error);
    return { error: `Failed to delete custom form: ${error.message}` };
  }

  revalidatePath('/admin/forms');
  revalidatePath('/admin/dashboard'); // If form counts affect dashboard
  // Responses will still exist in custom_form_responses and can be queried by form_id

  return { data: { message: 'Custom form deleted successfully.' } };
}
