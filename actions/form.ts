// actions/form.ts
'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { getUserAndProfile } from '@/lib/auth';
import { customFormSchema, CustomFormDefinition, customFormResponseSchema, CustomFormResponseInput } from '@/lib/validators/form';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * Server Action to fetch a custom form definition by its ID.
 * Accessible to customers if form audience is 'customer' and active.
 */
export async function fetchCustomFormById(formId: string) {
  const { user, profile } = await getUserAndProfile();
  const supabase = createServerSupabase();

  // If no user, only allow if form audience is 'public' (which isn't directly supported by our schema yet, but for future thought)
  // For now, require user to be logged in to view customer-facing form
  if (!user || !profile) {
    return { error: 'Unauthorized: User not authenticated.' };
  }

  const { data: form, error } = await supabase
    .from('custom_forms')
    .select('*')
    .eq('id', formId)
    .eq('is_active', true)
    .eq('audience', 'customer') // Only fetch forms explicitly for customers via this route
    .single();

  if (error) {
    console.error(`Error fetching custom form ${formId}:`, error);
    if (error.code === 'PGRST116') { // No rows found
      return { error: 'Form not found or not active.' };
    }
    return { error: 'Failed to retrieve form definition.' };
  }

  // Validate the fetched schema using Zod
  const parsedForm = customFormSchema.safeParse(form.schema);
  if (!parsedForm.success) {
    console.error(`Invalid form schema for form ${formId}:`, parsedForm.error);
    return { error: 'Invalid form definition on server.' };
  }

  return { data: { ...form, schema: parsedForm.data as CustomFormDefinition } };
}

/**
 * Server Action to submit a response for a custom form.
 */
export async function submitCustomFormResponse(formId: string, responseData: CustomFormResponseInput) {
  const { user, profile } = await getUserAndProfile();
  const supabase = createServerSupabase();

  if (!user || !profile) {
    return { error: 'Unauthorized: User not authenticated.' };
  }

  // First, ensure the form exists, is active, and is for customers
  const { data: form, error: formError } = await supabase
    .from('custom_forms')
    .select('id, schema')
    .eq('id', formId)
    .eq('is_active', true)
    .eq('audience', 'customer')
    .single();

  if (formError || !form) {
    console.error('Error fetching form for response submission:', formError);
    return { error: 'Form not found, inactive, or not accessible.' };
  }

  // Validate the incoming response data against a generic schema
  const parsedResponse = customFormResponseSchema.safeParse(responseData);
  if (!parsedResponse.success) {
    console.error('Invalid form response data:', parsedResponse.error);
    return { error: 'Invalid form response data submitted.', details: parsedResponse.error.flatten() };
  }

  // For a production app, you might want to dynamically generate a Zod schema
  // from `form.schema` and validate `responseData` against that specific schema.
  // This would provide more granular validation based on the admin-defined form.
  // For now, we rely on client-side validation using the dynamic schema in DynamicForm
  // and generic server-side validation.

  const { data: newResponse, error: insertError } = await supabase
    .from('custom_form_responses')
    .insert({
      form_id: formId,
      respondent_id: profile.id,
      data: parsedResponse.data, // Store the response as JSONB
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error inserting custom form response:', insertError);
    return { error: 'Failed to submit form response.' };
  }

  // Log activity
  const { error: activityError } = await supabase
    .from('activities')
    .insert({
      actor_id: user.id,
      customer_id: profile.id,
      type: 'custom_form_submitted',
      data: { formId: formId, responseId: newResponse.id, formName: form.name },
    });

  if (activityError) {
    console.warn('Failed to log custom form submission activity:', activityError);
  }

  revalidatePath(`/forms/${formId}`); // Revalidate the form page itself
  revalidatePath('/dashboard'); // If form submissions impact dashboard, though unlikely for this feature

  return { data: { message: 'Form submitted successfully!', responseId: newResponse.id } };
}
