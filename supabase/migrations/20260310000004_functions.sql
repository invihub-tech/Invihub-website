-- Optional transactional helpers used by Edge Functions (service role).
-- SECURITY DEFINER with fixed search_path; execute revoked from public clients.

create or replace function public.reserve_order_stock(p_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  item record;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if o.stock_reserved then
    return;
  end if;

  update public.orders set stock_reserved = true where id = p_order_id;

  for item in
    select * from public.order_items where order_id = p_order_id
  loop
    update public.products
      set stock = stock - item.quantity
      where id = item.product_id;
    insert into public.inventory_movements (product_id, delta, reason, admin_name)
      values (item.product_id, -item.quantity, 'Order ' || o.order_number, 'System');
  end loop;
end;
$$;

revoke all on function public.reserve_order_stock(text) from public;
grant execute on function public.reserve_order_stock(text) to service_role;

create or replace function public.fulfill_paid_order(p_order_id text, p_gateway_payment_id text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  settings jsonb;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  select coalesce(json::jsonb, '{}'::jsonb) into settings
  from public.store_settings where id = 'default';

  if o.payment_status = 'PAID' then
    return jsonb_build_object(
      'alreadyPaid', true,
      'orderNumber', o.order_number,
      'estimatedDelivery', jsonb_build_object(
        'min', coalesce((settings->>'estimatedDeliveryDaysMin')::int, 5),
        'max', coalesce((settings->>'estimatedDeliveryDaysMax')::int, 10)
      )
    );
  end if;

  update public.orders
    set payment_status = 'PAID', order_status = 'PROCESSING'
    where id = p_order_id;

  update public.payments
    set status = 'SUCCESSFUL',
        gateway_payment_id = coalesce(nullif(p_gateway_payment_id, ''), 'pay_mock_' || p_order_id)
    where order_id = p_order_id;

  perform public.reserve_order_stock(p_order_id);

  return jsonb_build_object(
    'alreadyPaid', false,
    'orderNumber', o.order_number,
    'payment', 'Successful',
    'estimatedDelivery', jsonb_build_object(
      'min', coalesce((settings->>'estimatedDeliveryDaysMin')::int, 5),
      'max', coalesce((settings->>'estimatedDeliveryDaysMax')::int, 10)
    )
  );
end;
$$;

revoke all on function public.fulfill_paid_order(text, text) from public;
grant execute on function public.fulfill_paid_order(text, text) to service_role;
