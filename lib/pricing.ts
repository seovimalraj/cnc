// lib/pricing.ts
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase'; // Assuming you have this type generated
import { z } from 'zod';

// --- Type Definitions for Pricing Inputs and Outputs ---

// Geometry data from a CAD part
export const geometryDataSchema = z.object({
  volume_mm3: z.number().positive(),
  surface_area_mm2: z.number().positive(),
  bbox: z.any().optional(), // Bounding box, can be complex JSON
});

export type GeometryData = z.infer<typeof geometryDataSchema>;

// Input for the pricing utility
export const pricingInputSchema = z.object({
  partId: z.string().uuid('Invalid Part ID.'),
  materialId: z.string().uuid('Invalid Material ID.'),
  finishId: z.string().uuid('Invalid Finish ID.'),
  toleranceId: z.string().uuid('Invalid Tolerance ID.'),
  quantity: z.number().int().positive('Quantity must be a positive integer.'),
  region: z.string().min(1, 'Region is required for pricing.').optional(), // To select rate card
});

export type PricingInput = z.infer<typeof pricingInputSchema>;

// Detailed pricing breakdown for a line item
export type PricingBreakdown = {
  material_cost_raw: number;
  material_cost_total: number;
  machining_time_min: number;
  machining_cost_raw: number;
  machining_cost_total: number;
  finish_cost_raw: number;
  finish_cost_total: number;
  subtotal_before_discount: number;
  quantity_discount_percentage: number;
  subtotal_after_discount: number;
  tolerance_multiplier: number;
  final_subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_price: number;
  currency: string;
  notes?: string;
};

// Full quote result for a single line item
export type QuoteLineItemResult = {
  part_id: string;
  material_id: string;
  finish_id: string;
  tolerance_id: string;
  quantity: number;
  unit_price: number; // Final price per unit
  line_total: number; // Total for this line item (unit_price * quantity)
  pricing_breakdown: PricingBreakdown;
};

// --- Helper Functions and Heuristics ---

/**
 * Heuristic for estimating machining time based on part geometry.
 * This is a simplified example. In a real application, this would be a more complex model
 * potentially involving ML, detailed CAD analysis, or extensive lookup tables.
 *
 * @param {number} volume_mm3 Volume of the part in cubic millimeters.
 * @param {any} bbox Bounding box data.
 * @returns {number} Estimated machining time in minutes.
 */
function estimateMachiningTime(volume_mm3: number, bbox: any): number {
  // Simple heuristic: Larger volume means more machining.
  // We can add more complexity here, e.g., aspect ratios from bbox, feature count (if available).
  const volumeFactor = Math.pow(volume_mm3, 1/3) / 10; // cube root of volume, scaled
  const baseTime = 10; // Base setup time

  // Add more sophisticated logic here if bbox contains useful data like dimensions, complexity scores etc.
  // For now, it's primarily volume-driven.
  return baseTime + volumeFactor;
}

// --- Main Pricing Utility Function ---

/**
 * Calculates the instant quote for a single part based on selected options.
 *
 * @param {PricingInput} input The pricing input parameters.
 * @returns {Promise<QuoteLineItemResult | null>} The calculated quote line item or null if an error occurs.
 */
export async function calculateInstantQuote(input: PricingInput): Promise<QuoteLineItemResult | null> {
  const supabase = createClient();

  try {
    // 1. Fetch Part Geometry
    const { data: part, error: partError } = await supabase
      .from('parts')
      .select('id, volume_mm3, surface_area_mm2, bbox')
      .eq('id', input.partId)
      .single();

    if (partError || !part || !part.volume_mm3 || !part.surface_area_mm2) {
      console.error('Error fetching part geometry or geometry data missing:', partError?.message);
      return null;
    }
    geometryDataSchema.parse(part); // Validate fetched geometry

    // 2. Fetch Catalog Data (Material, Finish, Tolerance)
    const [
      { data: material, error: materialError },
      { data: finish, error: finishError },
      { data: tolerance, error: toleranceError },
    ] = await Promise.all([
      supabase.from('materials').select('*').eq('id', input.materialId).eq('is_active', true).single(),
      supabase.from('finishes').select('*').eq('id', input.finishId).eq('is_active', true).single(),
      supabase.from('tolerances').select('*').eq('id', input.toleranceId).eq('is_active', true).single(),
    ]);

    if (materialError || !material || finishError || !finish || toleranceError || !tolerance) {
      console.error('Error fetching catalog data:', materialError || finishError || toleranceError);
      return null;
    }

    // 3. Fetch Rate Card (based on region)
    // Default to a general rate card if region not specified or specific not found
    const { data: rateCard, error: rateCardError } = await supabase
      .from('rate_cards')
      .select('*')
      .eq('region', input.region || 'default') // Use a 'default' region if none provided
      .eq('is_active', true)
      .single();

    if (rateCardError || !rateCard) {
      console.error('Error fetching rate card:', rateCardError?.message || 'No active rate card found for region.');
      return null; // A quote cannot be generated without a rate card
    }

    // 4. Pricing Algorithm Implementation

    // Ensure all necessary values are numeric and defined
    const density_kg_m3 = material.density_kg_m3 || 1; // Default to 1 if not set
    const cost_per_kg = material.cost_per_kg || 0;
    const machinability_factor = material.machinability_factor || 1.0;
    const cost_per_m2_finish = finish.cost_per_m2 || 0;
    const setup_fee_finish = finish.setup_fee || 0;
    const tolerance_multiplier = tolerance.cost_multiplier || 1.0;
    const regional_rate_per_min = rateCard.three_axis_rate_per_min || rateCard.five_axis_rate_per_min || rateCard.turning_rate_per_min || 0;
    const machine_setup_fee = rateCard.machine_setup_fee || 0;
    const tax_rate = rateCard.tax_rate || 0;
    const shipping_flat = rateCard.shipping_flat || 0;

    // a. Material Cost
    const mass_kg = (part.volume_mm3 / 1e9) * density_kg_m3; // Convert mm3 to m3 for density
    const material_cost_raw = mass_kg * cost_per_kg;
    const material_cost_total = material_cost_raw * input.quantity; // Total for quantity

    // b. Machining Cost
    const machining_time_min = estimateMachiningTime(part.volume_mm3, part.bbox) * machinability_factor;
    const machining_cost_raw = machining_time_min * regional_rate_per_min + machine_setup_fee;
    const machining_cost_total = machining_cost_raw * input.quantity; // Total for quantity

    // c. Finish Cost
    const finish_cost_per_unit = (part.surface_area_mm2 / 1e6) * cost_per_m2_finish + setup_fee_finish; // Convert mm2 to m2
    const finish_cost_total = finish_cost_per_unit * input.quantity; // Total for quantity

    // d. Subtotal Calculation (before discounts and adjustments)
    let subtotal_before_discount = material_cost_total + machining_cost_total + finish_cost_total;

    // e. Apply Quantity Discount
    const quantity_discount_percentage = Math.min(0.2, 1 - (1 / Math.sqrt(input.quantity)));
    subtotal_before_discount *= (1 - quantity_discount_percentage);

    // f. Apply Tolerance Multiplier (applied to the subtotal after quantity discount)
    const final_subtotal = subtotal_before_discount * tolerance_multiplier;

    // g. Tax and Total
    const tax_amount = final_subtotal * tax_rate;
    const total_price = final_subtotal + tax_amount + shipping_flat;

    // Final unit price for display (total_price / quantity)
    const unit_price = total_price / input.quantity;


    const breakdown: PricingBreakdown = {
      material_cost_raw: parseFloat(material_cost_raw.toFixed(2)),
      material_cost_total: parseFloat(material_cost_total.toFixed(2)),
      machining_time_min: parseFloat(machining_time_min.toFixed(2)),
      machining_cost_raw: parseFloat(machining_cost_raw.toFixed(2)),
      machining_cost_total: parseFloat(machining_cost_total.toFixed(2)),
      finish_cost_raw: parseFloat(finish_cost_per_unit.toFixed(2)),
      finish_cost_total: parseFloat(finish_cost_total.toFixed(2)),
      subtotal_before_discount: parseFloat(subtotal_before_discount.toFixed(2)),
      quantity_discount_percentage: parseFloat(quantity_discount_percentage.toFixed(4)), // Up to 4 decimal places for %
      subtotal_after_discount: parseFloat(subtotal_before_discount.toFixed(2)), // Same as before_discount after discount applied to it
      tolerance_multiplier: parseFloat(tolerance_multiplier.toFixed(2)),
      final_subtotal: parseFloat(final_subtotal.toFixed(2)),
      tax_amount: parseFloat(tax_amount.toFixed(2)),
      shipping_amount: parseFloat(shipping_flat.toFixed(2)),
      total_price: parseFloat(total_price.toFixed(2)),
      currency: rateCard.region === 'default' ? 'USD' : 'USD', // Adjust currency based on rate card or config
      notes: `Pricing based on ${material.name}, ${finish.name}, ${tolerance.name}, and ${rateCard.region || 'default'} rate card.`,
    };

    return {
      part_id: input.partId,
      material_id: input.materialId,
      finish_id: input.finishId,
      tolerance_id: input.toleranceId,
      quantity: input.quantity,
      unit_price: parseFloat(unit_price.toFixed(2)),
      line_total: parseFloat(total_price.toFixed(2)),
      pricing_breakdown: breakdown,
    };

  } catch (error: any) {
    console.error('Error calculating instant quote:', error);
    return null;
  }
}
