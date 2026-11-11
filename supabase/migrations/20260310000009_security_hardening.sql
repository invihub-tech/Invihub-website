-- Migration 20260310000009_security_hardening.sql
-- 1. Enable RLS on customization tables
ALTER TABLE public.customization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customization_files ENABLE ROW LEVEL SECURITY;

-- 2. Add access token hash columns to customization_requests for secure guest tracking
ALTER TABLE public.customization_requests
  ADD COLUMN IF NOT EXISTS access_token_hash text,
  ADD COLUMN IF NOT EXISTS access_token_expires_at timestamptz;

-- 3. Row Level Security policies for customization_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'customization_requests_select_own' AND tablename = 'customization_requests'
  ) THEN
    CREATE POLICY customization_requests_select_own ON public.customization_requests
      FOR SELECT TO authenticated
      USING (customer_id = auth.uid() OR public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'customization_requests_admin_all' AND tablename = 'customization_requests'
  ) THEN
    CREATE POLICY customization_requests_admin_all ON public.customization_requests
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- 4. Row Level Security policies for customization_files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'customization_files_select_own' AND tablename = 'customization_files'
  ) THEN
    CREATE POLICY customization_files_select_own ON public.customization_files
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.customization_requests r
          WHERE r.id = request_id AND (r.customer_id = auth.uid() OR public.is_admin())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'customization_files_admin_all' AND tablename = 'customization_files'
  ) THEN
    CREATE POLICY customization_files_admin_all ON public.customization_files
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- 5. Revoke direct client write access (Edge Functions use service_role)
REVOKE INSERT, UPDATE, DELETE ON public.customization_requests FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.customization_files FROM anon, authenticated;

-- 6. Harden Storage Policy for customizations bucket
-- Drop permissive anon insert and restrict to allowed CAD/image/document file extensions
DROP POLICY IF EXISTS customizations_anon_insert ON storage.objects;
DROP POLICY IF EXISTS customizations_insert ON storage.objects;

CREATE POLICY customizations_insert ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'customizations'
    AND lower(storage.extension(name)) IN (
      'stl', 'obj', '3mf', 'step', 'stp', 'iges', 'igs',
      'png', 'jpg', 'jpeg', 'webp', 'pdf'
    )
  );

-- 7. Safe product deletion cascading & unlinking
ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;
ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_product_id_fkey;
ALTER TABLE public.inventory_movements ADD CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- 8. Support multiple categories on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_ids_json text NOT NULL DEFAULT '[]';

UPDATE public.products
SET category_ids_json = json_build_array(category_id)::text
WHERE category_id IS NOT NULL AND (category_ids_json IS NULL OR category_ids_json = '[]');



