-- Row Level Security + grants

alter table public.customers enable row level security;
alter table public.admin_roles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_specifications enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.store_settings enable row level security;

-- Categories: public read active; admin write via service role / policies
create policy categories_public_read on public.categories
  for select to anon, authenticated
  using (status = 'ACTIVE' and length(trim(name)) > 0 and length(trim(slug)) > 0);

create policy categories_admin_all on public.categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Products: public read ACTIVE only
create policy products_public_read on public.products
  for select to anon, authenticated
  using (status = 'ACTIVE');

create policy products_admin_all on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy product_images_public_read on public.product_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'ACTIVE'
    )
  );

create policy product_images_admin_all on public.product_images
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy product_specs_public_read on public.product_specifications
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'ACTIVE'
    )
  );

create policy product_specs_admin_all on public.product_specifications
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Store settings: public can read non-secret shop config; only admins write
create policy store_settings_public_read on public.store_settings
  for select to anon, authenticated
  using (true);

create policy store_settings_admin_write on public.store_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Customers: own row only; no self-insert as admin
create policy customers_select_own on public.customers
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy customers_insert_own on public.customers
  for insert to authenticated
  with check (id = auth.uid());

create policy customers_update_own on public.customers
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy customers_admin_all on public.customers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin roles: readable by self for gate checks; no insert/update/delete for clients
create policy admin_roles_select_self on public.admin_roles
  for select to authenticated
  using (user_id = auth.uid());

-- Addresses
create policy addresses_own on public.addresses
  for all to authenticated
  using (customer_id = auth.uid() or public.is_admin())
  with check (customer_id = auth.uid() or public.is_admin());

-- Wishlist
create policy wishlist_own on public.wishlist_items
  for all to authenticated
  using (customer_id = auth.uid() or public.is_admin())
  with check (customer_id = auth.uid() or public.is_admin());

-- Carts / cart_items / orders / payments / inventory: NO direct client access.
-- All guest cart, checkout, and payment flows go through Edge Functions (service role).
-- Registered users may read their own orders (no payments.raw_json exposure via view).

create policy orders_select_own on public.orders
  for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());

create policy order_items_select_own on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.customer_id = auth.uid() or public.is_admin())
    )
  );

create policy payments_admin_select on public.payments
  for select to authenticated
  using (public.is_admin());

create policy inventory_admin_all on public.inventory_movements
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Explicit grants (RLS still applies)
grant usage on schema public to anon, authenticated;

grant select on public.categories, public.products, public.product_images,
  public.product_specifications, public.store_settings to anon, authenticated;

grant select, insert, update on public.customers to authenticated;
grant select on public.admin_roles to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;
grant select, insert, update, delete on public.wishlist_items to authenticated;
grant select on public.orders, public.order_items to authenticated;

-- Admins need broader DML through policies
grant select, insert, update, delete on public.categories, public.products,
  public.product_images, public.product_specifications, public.store_settings,
  public.customers, public.orders, public.order_items, public.payments,
  public.inventory_movements to authenticated;

-- Cart tables: no grants to anon/authenticated (Edge Functions use service role)
revoke all on public.carts from anon, authenticated;
revoke all on public.cart_items from anon, authenticated;
