-- INVIHUB commerce schema (Supabase). No drops of remote data — create-only.
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Registered customers only (id = auth.users.id). Guest checkouts leave orders.customer_id null.
create table public.customers (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

-- Admins cannot self-assign; insert only via service role / first-admin SQL.
create table public.admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_roles_updated_at
before update on public.admin_roles
for each row execute function public.set_updated_at();

create table public.categories (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text not null default '',
  sort_order int not null default 0,
  status text not null default 'ACTIVE',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create table public.products (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  slug text not null unique,
  sku text not null unique,
  category_id text not null references public.categories (id),
  brand text not null default 'INVIHUB',
  short_description text not null,
  description text not null,
  features_json text not null default '[]',
  tags_json text not null default '[]',
  price double precision not null,
  mrp double precision not null default 0,
  discount double precision not null default 0,
  tax_rate double precision not null default 18,
  stock int not null default 0,
  low_stock_threshold int not null default 5,
  allow_backorders boolean not null default false,
  weight double precision not null default 0,
  length double precision not null default 0,
  width double precision not null default 0,
  height double precision not null default 0,
  status text not null default 'ACTIVE',
  is_featured boolean not null default false,
  is_new boolean not null default false,
  is_best_seller boolean not null default false,
  payment_methods_json text not null default '["RAZORPAY","COD"]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_status_idx on public.products (status);

create trigger products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create table public.product_images (
  id text primary key default gen_random_uuid()::text,
  product_id text not null references public.products (id) on delete cascade,
  url text not null,
  alt text not null default '',
  sort_order int not null default 0,
  is_primary boolean not null default false
);

create index product_images_product_id_idx on public.product_images (product_id);

create table public.product_specifications (
  id text primary key default gen_random_uuid()::text,
  product_id text not null references public.products (id) on delete cascade,
  name text not null,
  value text not null,
  sort_order int not null default 0
);

create index product_specifications_product_id_idx on public.product_specifications (product_id);

create table public.addresses (
  id text primary key default gen_random_uuid()::text,
  customer_id uuid not null references public.customers (id) on delete cascade,
  line1 text not null,
  line2 text not null default '',
  city text not null,
  state text not null,
  pin_code text not null,
  is_default boolean not null default false
);

create index addresses_customer_id_idx on public.addresses (customer_id);

-- token_hash = sha256(hex) of client-held opaque cart token (never store plaintext)
create table public.carts (
  id text primary key default gen_random_uuid()::text,
  token_hash text not null unique,
  customer_id uuid references public.customers (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger carts_updated_at
before update on public.carts
for each row execute function public.set_updated_at();

create table public.cart_items (
  id text primary key default gen_random_uuid()::text,
  cart_id text not null references public.carts (id) on delete cascade,
  product_id text not null references public.products (id),
  quantity int not null check (quantity > 0),
  unique (cart_id, product_id)
);

create index cart_items_cart_id_idx on public.cart_items (cart_id);

create table public.orders (
  id text primary key default gen_random_uuid()::text,
  order_number text not null unique,
  customer_id uuid references public.customers (id) on delete set null,
  subtotal double precision not null,
  discount double precision not null default 0,
  shipping double precision not null,
  tax double precision not null,
  total double precision not null,
  payment_status text not null default 'PENDING',
  order_status text not null default 'PENDING',
  shipping_name text not null,
  shipping_email text not null,
  shipping_phone text not null,
  shipping_line1 text not null,
  shipping_line2 text not null default '',
  shipping_city text not null,
  shipping_state text not null,
  shipping_pin text not null,
  stock_reserved boolean not null default false,
  checkout_token_hash text not null default '',
  access_token_hash text not null default '',
  access_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_shipping_email_idx on public.orders (shipping_email);
create index orders_access_token_hash_idx on public.orders (access_token_hash);

create trigger orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table public.order_items (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references public.orders (id) on delete cascade,
  product_id text not null references public.products (id),
  name text not null,
  sku text not null,
  quantity int not null,
  unit_price double precision not null,
  line_total double precision not null
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

create table public.payments (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references public.orders (id) on delete cascade,
  gateway text not null,
  method text not null default 'TEST',
  status text not null,
  amount double precision not null,
  gateway_order_id text not null default '',
  gateway_payment_id text not null default '',
  raw_json text not null default '{}',
  created_at timestamptz not null default now()
);

create index payments_order_id_idx on public.payments (order_id);

create table public.inventory_movements (
  id text primary key default gen_random_uuid()::text,
  product_id text not null references public.products (id),
  delta int not null,
  reason text not null,
  notes text not null default '',
  admin_name text not null default '',
  created_at timestamptz not null default now()
);

create index inventory_movements_product_id_idx on public.inventory_movements (product_id);

create table public.wishlist_items (
  id text primary key default gen_random_uuid()::text,
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create table public.store_settings (
  id text primary key default 'default',
  json text not null
);

insert into public.store_settings (id, json)
values (
  'default',
  '{"storeName":"INVIHUB Shop","email":"invihub@gmail.com","phone":"7022149521","shippingCharge":100,"freeShippingThreshold":5000,"taxRate":18,"estimatedDeliveryDaysMin":5,"estimatedDeliveryDaysMax":10,"maintenance":false}'
)
on conflict (id) do nothing;

-- Helper: is current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_roles ar where ar.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;
