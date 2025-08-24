// lib/validators/profile.ts
import { z } from 'zod';

/**
 * Zod schema for validating user profile updates.
 * Matches fields in the public.profiles table.
 */
export const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required.').max(100, 'Full name cannot exceed 100 characters.').optional().nullable(),
  company: z.string().trim().max(100, 'Company name cannot exceed 100 characters.').optional().nullable(),
  phone: z.string().trim().max(20, 'Phone number cannot exceed 20 characters.').optional().nullable(),
  region: z.string().trim().max(50, 'Region cannot exceed 50 characters.').optional().nullable(),
  // Email and role are not updateable by the user through this form
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/**
 * Zod schema for validating customer address details.
 * Addresses are stored as JSONB, so this can be more flexible.
 */
export const addressSchema = z.object({
  line1: z.string().trim().min(1, 'Address line 1 is required.'),
  line2: z.string().trim().optional().nullable(),
  city: z.string().trim().min(1, 'City is required.'),
  state: z.string().trim().min(1, 'State/Province is required.'),
  postal_code: z.string().trim().min(1, 'Postal code is required.'),
  country: z.string().trim().min(1, 'Country is required.'),
});

export type AddressInput = z.infer<typeof addressSchema>;
