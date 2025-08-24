// lib/validators/catalog.ts
import { z } from 'zod';

// --- Material Schema ---
export const materialSchema = z.object({
  id: z.string().uuid().optional(), // For updates, ID is present
  name: z.string().trim().min(1, 'Material name is required.').max(100, 'Name cannot exceed 100 characters.'),
  density_kg_m3: z.number().positive('Density must be a positive number.').optional().nullable(),
  cost_per_kg: z.number().positive('Cost per kg must be a positive number.'),
  machinability_factor: z.number().min(0.1, 'Machinability factor must be at least 0.1.').max(5.0, 'Machinability factor cannot exceed 5.0.').default(1.0),
  is_active: z.boolean().default(true),
  meta: z.record(z.any()).optional().nullable(), // For additional JSON metadata
});

export type MaterialInput = z.infer<typeof materialSchema>;

// --- Finish Schema ---
export const finishSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Finish name is required.').max(100, 'Name cannot exceed 100 characters.'),
  type: z.string().trim().max(100, 'Type cannot exceed 100 characters.').optional().nullable(),
  cost_per_m2: z.number().min(0, 'Cost per m² cannot be negative.').default(0),
  setup_fee: z.number().min(0, 'Setup fee cannot be negative.').default(0),
  lead_time_days: z.number().int().min(0, 'Lead time cannot be negative.').default(0),
  is_active: z.boolean().default(true),
  meta: z.record(z.any()).optional().nullable(),
});

export type FinishInput = z.infer<typeof finishSchema>;

// --- Tolerance Schema ---
export const toleranceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Tolerance name is required.').max(100, 'Name cannot exceed 100 characters.'),
  tol_min_mm: z.number().optional().nullable(), // Can be negative
  tol_max_mm: z.number().optional().nullable(), // Can be positive
  cost_multiplier: z.number().min(0.1, 'Cost multiplier must be at least 0.1.').default(1.0),
  is_active: z.boolean().default(true),
  meta: z.record(z.any()).optional().nullable(),
}).refine(data => {
    // Ensure tol_max_mm is greater than tol_min_mm if both are provided
    if (data.tol_min_mm !== null && data.tol_max_mm !== null && data.tol_min_mm !== undefined && data.tol_max_mm !== undefined) {
      return data.tol_max_mm >= data.tol_min_mm;
    }
    return true;
  }, {
    message: 'Max tolerance must be greater than or equal to Min tolerance.',
    path: ['tol_max_mm'],
  });

export type ToleranceInput = z.infer<typeof toleranceSchema>;
