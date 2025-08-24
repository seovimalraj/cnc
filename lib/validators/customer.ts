// lib/validators/customer.ts
import { z } from 'zod';
import { addressSchema } from '@/lib/validators/profile'; // Reusing address schema

/**
 * Zod schema for validating customer updates.
 * Matches fields in the public.customers table.
 */
export const customerSchema = z.object({
  id: z.string().uuid().optional(), // For updates, ID is present
  owner_id: z.string().uuid('Invalid owner ID.').optional().nullable(), // Link to profile if exists
  name: z.string().trim().min(1, 'Customer name is required.').max(100, 'Name cannot exceed 100 characters.'),
  website: z.string().url('Invalid URL format.').optional().nullable(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters.').optional().nullable(),
  billing_address: addressSchema.optional().nullable(),
  shipping_address: addressSchema.optional().nullable(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

/**
 * Zod schema for validating just the customer address part.
 */
export const customerAddressSchema = addressSchema;
export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;
