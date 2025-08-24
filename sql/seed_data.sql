-- sql/seed_data.sql

-- Seed Materials
INSERT INTO public.materials (name, density_kg_m3, cost_per_kg, machinability_factor, is_active)
VALUES
    ('Aluminum 6061', 2700, 15.00, 1.2, TRUE),
    ('Stainless Steel 304', 8000, 25.00, 0.8, TRUE),
    ('Titanium Grade 5', 4420, 120.00, 0.6, TRUE),
    ('ABS Plastic', 1040, 5.00, 1.5, TRUE),
    ('Brass C360', 8500, 18.00, 1.0, TRUE)
ON CONFLICT (name) DO UPDATE SET
    density_kg_m3 = EXCLUDED.density_kg_m3,
    cost_per_kg = EXCLUDED.cost_per_kg,
    machinability_factor = EXCLUDED.machinability_factor,
    is_active = EXCLUDED.is_active;

-- Seed Finishes
INSERT INTO public.finishes (name, type, cost_per_m2, setup_fee, lead_time_days, is_active)
VALUES
    ('As Machined', 'Surface Finish', 0.00, 0.00, 0, TRUE),
    ('Bead Blast', 'Aesthetic Finish', 5.00, 10.00, 1, TRUE),
    ('Anodize - Clear', 'Protective Coating', 8.00, 15.00, 2, TRUE),
    ('Anodize - Black', 'Protective Coating', 10.00, 15.00, 2, TRUE),
    ('Powder Coat', 'Protective Coating', 12.00, 20.00, 3, TRUE)
ON CONFLICT (name) DO UPDATE SET
    type = EXCLUDED.type,
    cost_per_m2 = EXCLUDED.cost_per_m2,
    setup_fee = EXCLUDED.setup_fee,
    lead_time_days = EXCLUDED.lead_time_days,
    is_active = EXCLUDED.is_active;

-- Seed Tolerances
INSERT INTO public.tolerances (name, tol_min_mm, tol_max_mm, cost_multiplier, is_active)
VALUES
    ('Standard (+/- 0.1mm)', -0.1, 0.1, 1.0, TRUE),
    ('Fine (+/- 0.05mm)', -0.05, 0.05, 1.2, TRUE),
    ('Precision (+/- 0.02mm)', -0.02, 0.02, 1.5, TRUE)
ON CONFLICT (name) DO UPDATE SET
    tol_min_mm = EXCLUDED.tol_min_mm,
    tol_max_mm = EXCLUDED.tol_max_mm,
    cost_multiplier = EXCLUDED.cost_multiplier,
    is_active = EXCLUDED.is_active;

-- Seed Rate Cards (for 'default' region, you might add more for other regions)
INSERT INTO public.rate_cards (region, three_axis_rate_per_min, five_axis_rate_per_min, turning_rate_per_min, machine_setup_fee, tax_rate, shipping_flat, is_active)
VALUES
    ('default', 0.75, 1.50, 0.60, 25.00, 0.08, 15.00, TRUE)
ON CONFLICT (region) DO UPDATE SET
    three_axis_rate_per_min = EXCLUDED.three_axis_rate_per_min,
    five_axis_rate_per_min = EXCLUDED.five_axis_rate_per_min,
    turning_rate_per_min = EXCLUDED.turning_rate_per_min,
    machine_setup_fee = EXCLUDED.machine_setup_fee,
    tax_rate = EXCLUDED.tax_rate,
    shipping_flat = EXCLUDED.shipping_flat,
    is_active = EXCLUDED.is_active;
