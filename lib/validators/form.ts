// lib/validators/form.ts
import { z } from 'zod';

// Define the basic structure of a form field within the JSON schema
const formFieldSchema = z.object({
  id: z.string().min(1, 'Field ID is required.'),
  type: z.enum(['text', 'textarea', 'number', 'select', 'checkbox', 'radio']), // Add more types as needed
  label: z.string().min(1, 'Field label is required.'),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // For select, radio
  defaultValue: z.any().optional(),
  min: z.number().optional(), // For number type
  max: z.number().optional(), // For number type
  // Add other field-specific properties as needed (e.g., regex, step for number)
});

// Define the structure of the complete JSON form schema
export const customFormSchema = z.object({
  title: z.string().min(1, 'Form title is required.'),
  description: z.string().optional(),
  fields: z.array(formFieldSchema).min(1, 'Form must have at least one field.'),
});

export type CustomFormDefinition = z.infer<typeof customFormSchema>;

/**
 * Zod schema for validating a custom form response.
 * This will be dynamic based on the form definition, but we can define a generic structure.
 */
export const customFormResponseSchema = z.record(z.string(), z.any()); // Key-value pairs where key is field ID

export type CustomFormResponseInput = z.infer<typeof customFormResponseSchema>;
