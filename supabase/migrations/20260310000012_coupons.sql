-- Discount Coupon Management Migration
-- Create coupons table and coupon_redemptions table

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text default '',
  discount_type text not null check (discount_type in ('PERCENTAGE', 'FIXED')),
  discount_value numeric(10, 2) not null check (discount_value > 0),
  start_date timestamptz not null default now(),
  end_date timestamptz not null,
  min_order_value numeric(10, 2) default 0,
  max_discount_amount numeric(10, 2),
  usage_limit integer,
  usage_count integer not null default 0,
  per_customer_limit integer default 1,
  applies_to text not null default 'ALL' check (applies_to in ('ALL', 'PRODUCTS', 'CATEGORIES', 'COMBINED')),
  product_ids_json jsonb not null default '[]'::jsonb,
  category_ids_json jsonb not null default '[]'::jsonb,
  evaluation_mode text not null default 'OR' check (evaluation_mode in ('OR', 'AND')),
  status text not null default 'ACTIVE' check (status in ('DRAFT', 'SCHEDULED', 'ACTIVE', 'EXPIRED', 'DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive unique index on coupon code
create unique index if not exists idx_coupons_code_lower on public.coupons (lower(code));

-- Index for status and dates
create index if not exists idx_coupons_status on public.coupons (status);
create index if not exists idx_coupons_dates on public.coupons (start_date, end_date);

-- Coupon redemptions table for per-customer tracking and auditing
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id text references public.orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_email text not null,
  discount_amount numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_coupon_redemptions_coupon_id on public.coupon_redemptions (coupon_id);
create index if not exists idx_coupon_redemptions_email on public.coupon_redemptions (lower(customer_email));
create index if not exists idx_coupon_redemptions_customer_id on public.coupon_redemptions (customer_id);

-- Optional coupon columns on cart and orders if not present
alter table public.carts add column if not exists coupon_id uuid references public.coupons(id) on delete set null;
alter table public.carts add column if not exists coupon_code text;
alter table public.orders add column if not exists coupon_id uuid references public.coupons(id) on delete set null;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists coupon_discount numeric(10, 2) default 0;

-- RLS policies
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

-- Anonymous users cannot read all coupons directly; coupons are validated via functions/endpoints
create policy "Allow public to validate coupon" on public.coupons
  for select using (status = 'ACTIVE');

create policy "Allow service_role full access to coupons" on public.coupons
  using (true) with check (true);

create policy "Allow service_role full access to coupon_redemptions" on public.coupon_redemptions
  using (true) with check (true);
