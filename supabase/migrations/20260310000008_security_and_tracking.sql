-- Migration 20260310000008_security_and_tracking.sql
-- 1. Tighten Customizations Storage Bucket Privacy
UPDATE storage.buckets SET public = false WHERE id = 'customizations';

DROP POLICY IF EXISTS customizations_public_read ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'customizations_admin_read' AND tablename = 'objects'
  ) THEN
    CREATE POLICY customizations_admin_read ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'customizations' AND public.is_admin());
  END IF;
END $$;

-- 2. Release order stock helper
CREATE OR REPLACE FUNCTION public.release_order_stock(p_order_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%rowtype;
  item record;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF NOT o.stock_reserved THEN
    RETURN;
  END IF;

  UPDATE public.orders SET stock_reserved = false WHERE id = p_order_id;

  FOR item IN
    SELECT * FROM public.order_items WHERE order_id = p_order_id
  LOOP
    UPDATE public.products
      SET stock = stock + item.quantity
      WHERE id = item.product_id;
    INSERT INTO public.inventory_movements (product_id, delta, reason, admin_name)
      VALUES (item.product_id, item.quantity, 'Stock release: expired/cancelled ' || o.order_number, 'System');
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.release_order_stock(text) FROM public;
GRANT EXECUTE ON FUNCTION public.release_order_stock(text) TO service_role;

-- 3. Automated cleanup of expired pending orders (default 60 mins)
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_orders(p_timeout_minutes int DEFAULT 60)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  cleaned_count int := 0;
BEGIN
  FOR r IN
    SELECT id, order_number FROM public.orders
    WHERE payment_status = 'PENDING'
      AND order_status = 'PENDING'
      AND stock_reserved = true
      AND created_at < now() - (p_timeout_minutes || ' minutes')::interval
  LOOP
    PERFORM public.release_order_stock(r.id);
    UPDATE public.orders
      SET order_status = 'CANCELLED',
          updated_at = now()
      WHERE id = r.id;
    cleaned_count := cleaned_count + 1;
  END LOOP;

  RETURN jsonb_build_object('cleanedCount', cleaned_count);
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_pending_orders(int) FROM public;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_pending_orders(int) TO service_role;
