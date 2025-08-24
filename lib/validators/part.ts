// lib/validators/part.ts
import { z } from 'zod';

// Define allowed CAD file extensions
const ALLOWED_CAD_EXTENSIONS = ['.stl', '.step', '.stp', '.iges', '.igs'];
const MAX_FILE_SIZE_MB = 50; // Max file size for CAD uploads

/**
 * Zod schema for validating file uploads (for parts).
 */
export const fileSchema = z.custom<File>((file) => file instanceof File, {
  message: 'Expected a file.',
})
.refine((file) => file.size < MAX_FILE_SIZE_MB * 1024 * 1024, `File size must be less than ${MAX_FILE_SIZE_MB}MB.`)
.refine((file) => {
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  return ALLOWED_CAD_EXTENSIONS.includes(fileExtension);
}, `Invalid file type. Allowed types are: ${ALLOWED_CAD_EXTENSIONS.join(', ')}.`);

/**
 * Zod schema for validating part creation data.
 */
export const partCreateSchema = z.object({
  file_name: z.string().min(1, 'File name is required.'),
  file_url: z.string().url('Invalid file URL.'),
  file_ext: z.string().min(1, 'File extension is required.'),
  size_bytes: z.number().int().positive('File size must be positive.'),
  // These fields will typically be populated server-side after processing
  bbox: z.any().optional(), // JSONB type, can be any object structure
  surface_area_mm2: z.number().optional(),
  volume_mm3: z.number().optional(),
  preview_url: z.string().url('Invalid preview URL.').optional().nullable(),
  owner_id: z.string().uuid('Invalid owner ID.').optional().nullable(), // Optional for anonymous uploads
  customer_id: z.string().uuid('Invalid customer ID.').optional().nullable(),
});

/**
 * Zod schema for validating abandoned quote creation data.
 */
export const abandonedQuoteCreateSchema = z.object({
  email: z.string().email('Invalid email address.').optional().nullable(), // Optional if user abandons before entering email
  part_file_url: z.string().url('Invalid part file URL.'),
  activity: z.record(z.any()).optional().nullable(), // JSONB type for activity log
  is_claimed: z.boolean().default(false).optional(),
});

/**
 * Zod schema for validating email capture for abandoned quotes.
 */
export const emailCaptureSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

export type PartCreateInput = z.infer<typeof partCreateSchema>;
export type AbandonedQuoteCreateInput = z.infer<typeof abandonedQuoteCreateSchema>;
export type EmailCaptureInput = z.infer<typeof emailCaptureSchema>;
