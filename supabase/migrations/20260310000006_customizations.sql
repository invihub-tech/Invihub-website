-- INVIHUB Customization System schema
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allow_customization boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.customization_requests (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  product_id text REFERENCES public.products(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'NEW',
  service_type text NOT NULL DEFAULT 'READY_DESIGN',
  material text NOT NULL DEFAULT 'PLA',
  color text NOT NULL DEFAULT 'Black',
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  dimensions_json text NOT NULL DEFAULT '{}',
  printing_requirements_json text NOT NULL DEFAULT '{}',
  finishing_json text NOT NULL DEFAULT '[]',
  requirements text NOT NULL DEFAULT '',
  admin_notes text NOT NULL DEFAULT '',
  quotation_json text NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customization_requests_status_idx ON public.customization_requests (status);
CREATE INDEX IF NOT EXISTS customization_requests_customer_id_idx ON public.customization_requests (customer_id);
CREATE INDEX IF NOT EXISTS customization_requests_product_id_idx ON public.customization_requests (product_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'customization_requests_updated_at'
  ) THEN
    CREATE TRIGGER customization_requests_updated_at
    BEFORE UPDATE ON public.customization_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.customization_files (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_id text NOT NULL REFERENCES public.customization_requests(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT '',
  file_size bigint NOT NULL DEFAULT 0,
  file_category text NOT NULL DEFAULT 'original',
  storage_path text NOT NULL,
  url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customization_files_request_id_idx ON public.customization_files (request_id);

-- Storage bucket for customer uploads (50 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('customizations', 'customizations', true, 52428800)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'customizations_public_read' AND tablename = 'objects'
  ) THEN
    CREATE POLICY customizations_public_read
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'customizations');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'customizations_anon_insert' AND tablename = 'objects'
  ) THEN
    CREATE POLICY customizations_anon_insert
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'customizations');
  END IF;
END $$;

-- Enable customization on existing engineering/prototyping products by default
UPDATE public.products SET allow_customization = true WHERE slug IN ('invi-e-box', '6-dof-robotic-arm', 'prosthetic-hand', 'buddha-key-chain-black');
