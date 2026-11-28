-- ==============================================================================
-- INVIHUB Delivery & Shipping Engine: Database Migration Schema
-- Run this script in the Supabase SQL Editor.
-- ==============================================================================

-- 1. Add Shipping & Physical Dimension columns to products table
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS dead_weight_grams INT DEFAULT 200,
  ADD COLUMN IF NOT EXISTS length_cm NUMERIC(8, 2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS width_cm NUMERIC(8, 2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(8, 2) DEFAULT 10.00;

-- 2. Shipping Global Settings Table (Single-row configuration)
CREATE TABLE IF NOT EXISTS public.shipping_global_settings (
  id INT PRIMARY KEY DEFAULT 1,
  warehouse_pin_prefix VARCHAR(10) NOT NULL DEFAULT '56',
  packaging_buffer_grams INT NOT NULL DEFAULT 80,
  free_shipping_min_cart NUMERIC(10, 2) NOT NULL DEFAULT 599.00,
  enable_free_shipping BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row_check CHECK (id = 1)
);

-- Seed default global settings row if not present
INSERT INTO public.shipping_global_settings (id, warehouse_pin_prefix, packaging_buffer_grams, free_shipping_min_cart, enable_free_shipping)
VALUES (1, '56', 80, 599.00, true)
ON CONFLICT (id) DO UPDATE SET
  warehouse_pin_prefix = EXCLUDED.warehouse_pin_prefix,
  packaging_buffer_grams = EXCLUDED.packaging_buffer_grams,
  free_shipping_min_cart = EXCLUDED.free_shipping_min_cart,
  enable_free_shipping = EXCLUDED.enable_free_shipping;

-- 3. Shipping Zones Table
CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id TEXT PRIMARY KEY,
  zone_name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  pin_prefixes TEXT[], -- Array of 2-digit PIN prefixes mapped to this zone (e.g. ARRAY['56', '57', '58', '59'])
  estimated_days VARCHAR(50) NOT NULL DEFAULT '3-5 business days',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default zones
INSERT INTO public.shipping_zones (id, zone_name, display_name, description, pin_prefixes, estimated_days, is_active)
VALUES
  ('zone-local', 'local', 'Local (Intra-City / Same Prefix)', 'Bangalore and local pin codes with prefix 56', ARRAY['56'], '1-2 business days', true),
  ('zone-regional', 'regional', 'Regional (South India)', 'Karnataka, Tamil Nadu, Kerala, Andhra Pradesh, Telangana', ARRAY['57', '58', '59', '60', '61', '62', '63', '64', '67', '68', '69', '50', '51', '52', '53'], '2-4 business days', true),
  ('zone-national', 'national', 'National (Rest of India)', 'All standard serviceable Indian states and metros', ARRAY[]::TEXT[], '4-6 business days', true),
  ('zone-special', 'special_zone', 'Special Zone (NE, J&K, Islands)', 'Jammu & Kashmir, Northeast states, Andaman & Nicobar, Lakshadweep', ARRAY['18', '19', '78', '79', '73', '74', '744', '682'], '6-9 business days', true)
ON CONFLICT (id) DO UPDATE SET
  zone_name = EXCLUDED.zone_name,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  pin_prefixes = EXCLUDED.pin_prefixes,
  estimated_days = EXCLUDED.estimated_days,
  is_active = EXCLUDED.is_active;

-- 4. Shipping Rate Cards Table
CREATE TABLE IF NOT EXISTS public.shipping_rate_cards (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  base_500g_price NUMERIC(10, 2) NOT NULL DEFAULT 45.00,
  additional_500g_price NUMERIC(10, 2) NOT NULL DEFAULT 30.00,
  gst_percentage NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  estimated_days VARCHAR(50) NOT NULL DEFAULT '3-5 business days',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed rate cards
INSERT INTO public.shipping_rate_cards (id, zone_id, base_500g_price, additional_500g_price, gst_percentage, estimated_days, is_active)
VALUES
  ('zone-local', 'zone-local', 40.00, 25.00, 18.00, '1-2 business days', true),
  ('zone-regional', 'zone-regional', 50.00, 30.00, 18.00, '2-4 business days', true),
  ('zone-national', 'zone-national', 65.00, 40.00, 18.00, '4-6 business days', true),
  ('zone-special', 'zone-special', 90.00, 60.00, 18.00, '6-9 business days', true)
ON CONFLICT (id) DO UPDATE SET
  base_500g_price = EXCLUDED.base_500g_price,
  additional_500g_price = EXCLUDED.additional_500g_price,
  gst_percentage = EXCLUDED.gst_percentage,
  estimated_days = EXCLUDED.estimated_days,
  is_active = EXCLUDED.is_active;

-- 5. Admin Shipping Audit Logs Table
CREATE TABLE IF NOT EXISTS public.shipping_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  performed_by VARCHAR(100) DEFAULT 'admin',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable Row Level Security (RLS) & Grant access
ALTER TABLE public.shipping_global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public / anon read access so storefront checkout calculation can read active rates
DO $$ BEGIN
  CREATE POLICY "Allow public read access to active shipping settings"
    ON public.shipping_global_settings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public read access to shipping zones"
    ON public.shipping_zones FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public read access to shipping rate cards"
    ON public.shipping_rate_cards FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow service role full access
DO $$ BEGIN
  CREATE POLICY "Allow all access to service role for shipping_global_settings"
    ON public.shipping_global_settings FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all access to service role for shipping_rate_cards"
    ON public.shipping_rate_cards FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all access to service role for shipping_audit_logs"
    ON public.shipping_audit_logs FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
