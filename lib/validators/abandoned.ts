// lib/validators/abandoned.ts
import { z } from 'zod';

/**
 * Zod schema for the abandoned_quotes table.
 * Primarily for internal use to define types and basic validation.
 */
export const abandonedQuoteSchema = z.object({
  id: z.string().uuid().optional(),
  part_id: z.string().uuid('Invalid part ID.').optional().nullable(),
  email: z.string().email('Invalid email address.').optional().nullable(),
  contact_info: z.record(z.any()).optional().nullable(), // Store as JSONB
  metadata: z.record(z.any()).optional().nullable(), // Additional JSON metadata
  is_claimed: z.boolean().default(false),
  claimed_by: z.string().uuid().optional().nullable(),
  claimed_at: z.string().datetime().optional().nullable(),
  created_at: z.string().datetime().optional(),
});

export type AbandonedQuoteInput = z.infer<typeof abandonedQuoteSchema>;

/**
 * Schema for claiming an abandoned quote.
 */
export const claimAbandonedQuoteSchema = z.object({
  abandonedQuoteId: z.string().uuid('Invalid abandoned quote ID.'),
  // Options for claiming:
  // 1. Convert to a new full quote (requires more data)
  // 2. Link to an existing quote (if the customer later completes it)
  // For now, a simple claim will just mark it as claimed.
});
