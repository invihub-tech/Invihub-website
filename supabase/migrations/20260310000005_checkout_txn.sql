-- Atomic checkout: totals from DB prices, stock lock, order+items+payment+reserve in one transaction.
-- Called only by Edge Functions (service_role).

create or replace function public.checkout_create_order(
  p_cart_id text,
  p_customer_id uuid,
  p_checkout_token_hash text,
  p_access_token_hash text,
  p_access_token_expires_at timestamptz,
  p_shipping jsonb,
  p_payment_method text,
  p_payment_gateway text,
  p_payment_status text,
  p_gateway_order_id text,
  p_payment_client_json text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  settings jsonb;
  shipping_charge numeric;
  free_threshold numeric;
  tax_rate numeric;
  subtotal numeric := 0;
  discount numeric := 0;
  shipping_amt numeric := 0;
  tax_amt numeric := 0;
  total_amt numeric := 0;
  item record;
  order_id text;
  order_number text;
  y text;
  m text;
  d text;
  r text;
begin
  if p_payment_method not in ('RAZORPAY', 'UPI', 'COD', 'BANK') then
    raise exception 'Invalid payment method';
  end if;

  select coalesce(json::jsonb, '{}'::jsonb) into settings
  from public.store_settings where id = 'default';
  shipping_charge := coalesce((settings->>'shippingCharge')::numeric, 100);
  free_threshold := coalesce((settings->>'freeShippingThreshold')::numeric, 5000);
  tax_rate := coalesce((settings->>'taxRate')::numeric, 18);

  -- Lock cart lines + product rows
  if not exists (select 1 from public.cart_items where cart_id = p_cart_id) then
    raise exception 'Cart is empty';
  end if;

  for item in
    select ci.quantity, p.id as product_id, p.name, p.sku, p.price, p.stock, p.allow_backorders, p.status,
           p.payment_methods_json
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = p_cart_id
    for update of p
  loop
    if item.status <> 'ACTIVE' then
      raise exception 'Product unavailable';
    end if;
    if item.stock < item.quantity and not item.allow_backorders then
      raise exception '% is out of stock', item.name;
    end if;
    subtotal := subtotal + (item.price * item.quantity);
  end loop;

  subtotal := round(subtotal::numeric, 2);
  if subtotal >= free_threshold then
    shipping_amt := 0;
  else
    shipping_amt := shipping_charge;
  end if;
  tax_amt := round(((subtotal - discount) * tax_rate / 100)::numeric, 2);
  total_amt := round((subtotal - discount + shipping_amt + tax_amt)::numeric, 2);

  y := to_char(now() at time zone 'utc', 'YYYY');
  m := to_char(now() at time zone 'utc', 'MM');
  d := to_char(now() at time zone 'utc', 'DD');
  r := lpad((floor(random() * 9999))::int::text, 4, '0');
  order_number := 'INV-' || y || m || d || '-' || r;

  insert into public.orders (
    order_number, customer_id, subtotal, discount, shipping, tax, total,
    payment_status, order_status, checkout_token_hash, access_token_hash, access_token_expires_at,
    shipping_name, shipping_email, shipping_phone, shipping_line1, shipping_line2,
    shipping_city, shipping_state, shipping_pin, stock_reserved
  ) values (
    order_number, p_customer_id, subtotal, discount, shipping_amt, tax_amt, total_amt,
    'PENDING', 'PENDING', p_checkout_token_hash, p_access_token_hash, p_access_token_expires_at,
    p_shipping->>'name', p_shipping->>'email', p_shipping->>'phone', p_shipping->>'line1',
    coalesce(p_shipping->>'line2', ''), p_shipping->>'city', p_shipping->>'state', p_shipping->>'pinCode',
    false
  )
  returning id into order_id;

  insert into public.order_items (order_id, product_id, name, sku, quantity, unit_price, line_total)
  select order_id, p.id, p.name, p.sku, ci.quantity, p.price, round((p.price * ci.quantity)::numeric, 2)
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.cart_id = p_cart_id;

  insert into public.payments (
    order_id, gateway, method, status, amount, gateway_order_id, raw_json
  ) values (
    order_id, p_payment_gateway, p_payment_method, p_payment_status, total_amt,
    coalesce(p_gateway_order_id, ''), coalesce(p_payment_client_json, '{}')
  );

  -- Reserve stock inside same transaction
  perform public.reserve_order_stock(order_id);

  delete from public.cart_items where cart_id = p_cart_id;

  return jsonb_build_object(
    'orderId', order_id,
    'orderNumber', order_number,
    'totals', jsonb_build_object(
      'subtotal', subtotal,
      'discount', discount,
      'shipping', shipping_amt,
      'tax', tax_amt,
      'total', total_amt
    )
  );
end;
$$;

revoke all on function public.checkout_create_order(
  text, uuid, text, text, timestamptz, jsonb, text, text, text, text, text
) from public;
grant execute on function public.checkout_create_order(
  text, uuid, text, text, timestamptz, jsonb, text, text, text, text, text
) to service_role;
