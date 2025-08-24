-- Enable the pgcrypto extension for generating UUIDs
create extension if not exists pgcrypto;

-- Profiles table to store user metadata and roles
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text unique,
    full_name text,
    role text check (role in ('admin','staff','customer')) default 'customer',
    company text,
    phone text,
    region text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Customers table for customer-specific information
create table public.customers (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid references public.profiles(id) on delete set null,
    name text not null,
    website text,
    billing_address jsonb,
    shipping_address jsonb,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Materials catalog
create table public.materials (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    density_kg_m3 numeric,
    cost_per_kg numeric not null,
    machinability_factor numeric default 1.0,
    is_active boolean default true,
    meta jsonb,
    created_by uuid references public.profiles(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Finishes catalog
create table public.finishes (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    type text,
    cost_per_m2 numeric default 0,
    setup_fee numeric default 0,
    lead_time_days integer default 0,
    is_active boolean default true,
    meta jsonb,
    created_by uuid references public.profiles(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Tolerances catalog
create table public.tolerances (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    tol_min_mm numeric,
    tol_max_mm numeric,
    cost_multiplier numeric default 1.0,
    is_active boolean default true,
    meta jsonb,
    created_by uuid references public.profiles(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Rate cards for regional pricing
create table public.rate_cards (
    id uuid primary key default gen_random_uuid(),
    region text,
    three_axis_rate_per_min numeric,
    five_axis_rate_per_min numeric,
    turning_rate_per_min numeric,
    machine_setup_fee numeric default 0,
    tax_rate numeric default 0,
    shipping_flat numeric default 0,
    is_active boolean default true,
    meta jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Parts table for CAD uploads and metadata
create table public.parts (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid references public.profiles(id) on delete set null,
    customer_id uuid references public.customers(id) on delete set null,
    file_url text not null,
    file_name text,
    file_ext text,
    size_bytes bigint,
    bbox jsonb, -- Bounding box for geometry (e.g., { "x": { "min": 0, "max": 100 }, "y": ... })
    surface_area_mm2 numeric,
    volume_mm3 numeric,
    preview_url text,
    status text default 'uploaded', -- e.g., 'uploaded', 'processed', 'error'
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Quotes table
create table public.quotes (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid references public.customers(id) on delete set null,
    created_by uuid references public.profiles(id) on delete set null,
    status text check (status in ('draft','sent','accepted','rejected','expired','abandoned','paid','in_production','completed')) default 'draft',
    currency text default 'USD',
    subtotal numeric default 0,
    tax numeric default 0,
    shipping numeric default 0,
    total numeric default 0,
    region text,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Quote items (line items within a quote)
create table public.quote_items (
    id uuid primary key default gen_random_uuid(),
    quote_id uuid references public.quotes(id) on delete cascade,
    part_id uuid references public.parts(id) on delete set null,
    material_id uuid references public.materials(id),
    finish_id uuid references public.finishes(id),
    tolerance_id uuid references public.tolerances(id),
    quantity integer not null default 1,
    unit_price numeric not null default 0,
    line_total numeric not null default 0,
    pricing_breakdown jsonb, -- Store the detailed pricing breakdown here
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Messages for real-time chat within quotes
create table public.messages (
    id uuid primary key default gen_random_uuid(),
    quote_id uuid references public.quotes(id) on delete cascade,
    sender_id uuid references public.profiles(id) on delete set null,
    sender_role text,
    content text not null,
    attachments jsonb, -- e.g., [{ "file_url": "...", "file_name": "..." }]
    created_at timestamptz default now()
);

-- Payments table
create table public.payments (
    id uuid primary key default gen_random_uuid(),
    quote_id uuid references public.quotes(id) on delete set null,
    amount numeric not null,
    currency text default 'USD',
    provider text default 'stripe', -- e.g., 'stripe', 'paypal', 'manual'
    external_id text, -- Transaction ID from payment provider
    status text, -- e.g., 'pending', 'completed', 'failed'
    raw jsonb, -- Raw payload from payment provider webhook
    created_at timestamptz default now()
);

-- Activities log for user and system actions
create table public.activities (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid references public.profiles(id) on delete set null,
    customer_id uuid references public.customers(id) on delete set null,
    quote_id uuid references public.quotes(id) on delete set null,
    part_id uuid references public.parts(id) on delete set null,
    type text, -- e.g., 'part_uploaded', 'quote_created', 'message_sent', 'quote_status_changed'
    data jsonb, -- Additional event-specific data
    created_at timestamptz default now()
);

-- Abandoned quotes table for anonymous uploads
create table public.abandoned_quotes (
    id uuid primary key default gen_random_uuid(),
    email text,
    part_file_url text,
    activity jsonb, -- Log of actions taken before abandonment
    is_claimed boolean default false,
    created_at timestamptz default now()
);

-- Custom forms definition table
create table public.custom_forms (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    audience text check (audience in ('customer','admin')) default 'customer', -- Who sees this form
    schema jsonb not null, -- JSON schema for the form
    is_active boolean default true,
    created_by uuid references public.profiles(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Responses to custom forms
create table public.custom_form_responses (
    id uuid primary key default gen_random_uuid(),
    form_id uuid references public.custom_forms(id) on delete cascade,
    respondent_id uuid references public.profiles(id) on delete set null,
    quote_id uuid references public.quotes(id) on delete set null,
    data jsonb not null, -- The submitted form data
    created_at timestamptz default now()
);

-- Row Level Security (RLS) policies
-- These policies will need to be applied after running the schema.
-- Enable RLS for all tables initially.
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.materials enable row level security;
alter table public.finishes enable row level security;
alter table public.tolerances enable row level security;
alter table public.rate_cards enable row level security;
alter table public.parts enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.messages enable row level security;
alter table public.payments enable row level security;
alter table public.activities enable row level security;
alter table public.abandoned_quotes enable row level security;
alter table public.custom_forms enable row level security;
alter table public.custom_form_responses enable row level security;

-- Policies for Profiles
-- Users can see their own profile or if they are admin/staff
create policy profiles_self_or_admin on public.profiles for select using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
-- Users can update their own profile
create policy profiles_self_update on public.profiles for update using (auth.uid() = id);

-- Policies for Customers
-- Admins/Staff can see all customers
create policy admin_customers_select on public.customers for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
-- Customer owners can see their own customers (if a profile has a linked customer record)
create policy customers_owner_select on public.customers for select using (owner_id = auth.uid());
-- Admins/Staff can insert new customers
create policy admin_customers_insert on public.customers for insert with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
-- Admins/Staff can update all customers
create policy admin_customers_update on public.customers for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
-- Admins/Staff can delete all customers
create policy admin_customers_delete on public.customers for delete using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));

-- Policies for Materials (Admin/Staff manage, customers only read active)
create policy admin_materials_crud on public.materials for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
create policy customers_materials_select on public.materials for select using (is_active = true);

-- Policies for Finishes (Admin/Staff manage, customers only read active)
create policy admin_finishes_crud on public.finishes for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
create policy customers_finishes_select on public.finishes for select using (is_active = true);

-- Policies for Tolerances (Admin/Staff manage, customers only read active)
create policy admin_tolerances_crud on public.tolerances for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
create policy customers_tolerances_select on public.tolerances for select using (is_active = true);

-- Policies for Rate Cards (Admin/Staff manage, all can read active)
create policy admin_rate_cards_crud on public.rate_cards for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
create policy all_rate_cards_select on public.rate_cards for select using (is_active = true);

-- Policies for Parts
-- Owners can read/update their own parts; Admin/Staff can read/update all
create policy parts_owner_select on public.parts for select using (owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
create policy parts_owner_update on public.parts for update using (owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
create policy parts_insert on public.parts for insert with check (owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
-- Admin/Staff can delete all parts
create policy admin_parts_delete on public.parts for delete using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));

-- Policies for Quotes
-- Owners can read/update their own quotes; Admin/Staff can read/update all
create policy quotes_owner_select on public.quotes for select using (customer_id in (select id from public.customers where owner_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
create policy quotes_owner_update on public.quotes for update using (customer_id in (select id from public.customers where owner_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
create policy quotes_insert on public.quotes for insert with check (customer_id in (select id from public.customers where owner_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
-- Admin/Staff can delete all quotes
create policy admin_quotes_delete on public.quotes for delete using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));


-- Policies for Quote Items
-- Linked to quotes, so access follows quote policies
create policy quote_items_select on public.quote_items for select using (quote_id in (select id from public.quotes where customer_id in (select id from public.customers where owner_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff'))));
create policy quote_items_crud on public.quote_items for all using (quote_id in (select id from public.quotes where customer_id in (select id from public.customers where owner_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff'))));


-- Policies for Messages
-- Linked to quotes, so access follows quote policies
create policy messages_select on public.messages for select using (quote_id in (select id from public.quotes where customer_id in (select id from public.customers where owner_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff'))));
create policy messages_insert on public.messages for insert with check (quote_id in (select id from public.quotes where customer_id in (select id from public.customers where owner_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff'))));
create policy messages_update on public.messages for update using (sender_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));


-- Policies for Payments
-- Owners can read their own payments; Admin/Staff can read all
create policy payments_owner_select on public.payments for select using (quote_id in (select id from public.quotes where customer_id in (select id from public.customers where owner_id = auth.uid())) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
create policy admin_payments_crud on public.payments for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));

-- Policies for Activities
-- Owners can read their own activities; Admin/Staff can read all
create policy activities_owner_select on public.activities for select using (actor_id = auth.uid() or customer_id in (select id from public.customers where owner_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
create policy activities_insert on public.activities for insert with check (actor_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
create policy admin_activities_delete on public.activities for delete using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));


-- Policies for Abandoned Quotes
-- Only Admin/Staff can access and manage abandoned quotes
create policy admin_abandoned_quotes_crud on public.abandoned_quotes for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));

-- Policies for Custom Forms
-- All authenticated users can read active customer forms; Admin/Staff manage all
create policy all_custom_forms_select on public.custom_forms for select using (is_active = true and audience = 'customer' or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
create policy admin_custom_forms_crud on public.custom_forms for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));

-- Policies for Custom Form Responses
-- Owners can read their own responses; Admin/Staff can read all
create policy custom_form_responses_owner_select on public.custom_form_responses for select using (respondent_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
create policy custom_form_responses_insert on public.custom_form_responses for insert with check (respondent_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
create policy admin_custom_form_responses_delete on public.custom_form_responses for delete using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')));
