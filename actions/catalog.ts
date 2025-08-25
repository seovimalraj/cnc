// actions/catalog.ts
'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { getUserAndProfile } from '@/lib/auth';
import { materialSchema, MaterialInput, finishSchema, FinishInput, toleranceSchema, ToleranceInput } from '@/lib/validators/catalog';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { redirect } from 'next/navigation';

// --- Generic Authorization Helper ---
async function authorizeAdminOrStaff() {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile || !['admin', 'staff'].includes(profile.role)) {
    redirect('/dashboard?error=UnauthorizedAccess'); // Redirect to customer dashboard
    // It's crucial to throw an error here to stop execution if redirect doesn't immediately exit
    throw new Error('Unauthorized: Admin or Staff role required.');
  }
  return { user, profile };
}

// --- Materials  CRUD ---

/**
 * Fetches all materials from the database.
 */
export async function getMaterials() {
  await authorizeAdminOrStaff(); // Ensure only authorized users can fetch
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching materials:', error);
    return { error: 'Failed to retrieve materials.' };
  }
  return { data };
}

/**
 * Creates a new material.
 */
export async function createMaterial(input: MaterialInput) {
  const { profile } = await authorizeAdminOrStaff();
  const validatedInput = materialSchema.safeParse(input);
  if (!validatedInput.success) {
    console.error('Validation error creating material:', validatedInput.error);
    return { error: 'Invalid material data provided.', details: validatedInput.error.flatten() };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('materials')
    .insert({ ...validatedInput.data, created_by: profile.id })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating material:', error);
    return { error: `Failed to create material: ${error.message}` };
  }
  revalidatePath('/admin/materials');
  revalidatePath('/instant-quote'); // Also revalidate customer quote page if materials changed
  return { data };
}

/**
 * Updates an existing material.
 */
export async function updateMaterial(id: string, input: MaterialInput) {
  await authorizeAdminOrStaff();
  const validatedInput = materialSchema.omit({ id: true }).safeParse(input); // Omit ID from validation input
  if (!validatedInput.success) {
    console.error('Validation error updating material:', validatedInput.error);
    return { error: 'Invalid material data provided.', details: validatedInput.error.flatten() };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('materials')
    .update({ ...validatedInput.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating material:', error);
    return { error: `Failed to update material: ${error.message}` };
  }
  revalidatePath('/admin/materials');
  revalidatePath('/instant-quote');
  return { data };
}

/**
 * Deletes a material.
 */
export async function deleteMaterial(id: string) {
  await authorizeAdminOrStaff();
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting material:', error);
    return { error: `Failed to delete material: ${error.message}` };
  }
  revalidatePath('/admin/materials');
  revalidatePath('/instant-quote');
  return { data: { message: 'Material deleted successfully.' } };
}


// --- Finishes CRUD ---

/**
 * Fetches all finishes from the database.
 */
export async function getFinishes() {
  await authorizeAdminOrStaff();
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('finishes')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching finishes:', error);
    return { error: 'Failed to retrieve finishes.' };
  }
  return { data };
}

/**
 * Creates a new finish.
 */
export async function createFinish(input: FinishInput) {
  const { profile } = await authorizeAdminOrStaff();
  const validatedInput = finishSchema.safeParse(input);
  if (!validatedInput.success) {
    console.error('Validation error creating finish:', validatedInput.error);
    return { error: 'Invalid finish data provided.', details: validatedInput.error.flatten() };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('finishes')
    .insert({ ...validatedInput.data, created_by: profile.id })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating finish:', error);
    return { error: `Failed to create finish: ${error.message}` };
  }
  revalidatePath('/admin/finishes');
  revalidatePath('/instant-quote');
  return { data };
}

/**
 * Updates an existing finish.
 */
export async function updateFinish(id: string, input: FinishInput) {
  await authorizeAdminOrStaff();
  const validatedInput = finishSchema.omit({ id: true }).safeParse(input);
  if (!validatedInput.success) {
    console.error('Validation error updating finish:', validatedInput.error);
    return { error: 'Invalid finish data provided.', details: validatedInput.error.flatten() };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('finishes')
    .update({ ...validatedInput.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating finish:', error);
    return { error: `Failed to update finish: ${error.message}` };
  }
  revalidatePath('/admin/finishes');
  revalidatePath('/instant-quote');
  return { data };
}

/**
 * Deletes a finish.
 */
export async function deleteFinish(id: string) {
  await authorizeAdminOrStaff();
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('finishes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting finish:', error);
    return { error: `Failed to delete finish: ${error.message}` };
  }
  revalidatePath('/admin/finishes');
  revalidatePath('/instant-quote');
  return { data: { message: 'Finish deleted successfully.' } };
}


// --- Tolerances CRUD ---

/**
 * Fetches all tolerances from the database.
 */
export async function getTolerances() {
  await authorizeAdminOrStaff();
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('tolerances')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching tolerances:', error);
    return { error: 'Failed to retrieve tolerances.' };
  }
  return { data };
}

/**
 * Creates a new tolerance.
 */
export async function createTolerance(input: ToleranceInput) {
  const { profile } = await authorizeAdminOrStaff();
  const validatedInput = toleranceSchema.safeParse(input);
  if (!validatedInput.success) {
    console.error('Validation error creating tolerance:', validatedInput.error);
    return { error: 'Invalid tolerance data provided.', details: validatedInput.error.flatten() };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('tolerances')
    .insert({ ...validatedInput.data, created_by: profile.id })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating tolerance:', error);
    return { error: `Failed to create tolerance: ${error.message}` };
  }
  revalidatePath('/admin/tolerances');
  revalidatePath('/instant-quote');
  return { data };
}

/**
 * Updates an existing tolerance.
 */
export async function updateTolerance(id: string, input: ToleranceInput) {
  await authorizeAdminOrStaff();
  const validatedInput = toleranceSchema.omit({ id: true }).safeParse(input);
  if (!validatedInput.success) {
    console.error('Validation error updating tolerance:', validatedInput.error);
    return { error: 'Invalid tolerance data provided.', details: validatedInput.error.flatten() };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('tolerances')
    .update({ ...validatedInput.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating tolerance:', error);
    return { error: `Failed to update tolerance: ${error.message}` };
  }
  revalidatePath('/admin/tolerances');
  revalidatePath('/instant-quote');
  return { data };
}

/**
 * Deletes a tolerance.
 */
export async function deleteTolerance(id: string) {
  await authorizeAdminOrStaff();
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('tolerances')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting tolerance:', error);
    return { error: `Failed to delete tolerance: ${error.message}` };
  }
  revalidatePath('/admin/tolerances');
  revalidatePath('/instant-quote');
  return { data: { message: 'Tolerance deleted successfully.' } };
}
