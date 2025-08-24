// lib/validators/message.ts
import { z } from 'zod';

/**
 * Zod schema for validating a new chat message.
 */
export const messageCreateSchema = z.object({
  quote_id: z.string().uuid('Invalid quote ID.'),
  content: z.string().min(1, 'Message cannot be empty.').max(1000, 'Message is too long.'),
  attachments: z.array(z.object({
    file_url: z.string().url('Invalid attachment URL.'),
    file_name: z.string().min(1, 'Attachment file name is required.'),
    mime_type: z.string().optional(),
    size: z.number().int().positive().optional(),
  })).optional().nullable(),
});

export type MessageCreateInput = z.infer<typeof messageCreateSchema>;

/**
 * Zod schema for validating an attachment file during upload (client-side).
 */
export const attachmentFileSchema = z.custom<File>((file) => file instanceof File, {
  message: 'Expected an attachment file.',
})
.refine((file) => file.size < 5 * 1024 * 1024, `Attachment size must be less than 5MB.`) // Max 5MB per attachment
.refine((file) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain', 'application/zip'];
  return allowedMimeTypes.includes(file.type);
}, 'Invalid attachment type. Only images, PDFs, text, and zip files are allowed.');
