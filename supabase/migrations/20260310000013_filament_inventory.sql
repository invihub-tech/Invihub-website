-- Create filaments table
CREATE TABLE IF NOT EXISTS public.filaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    material TEXT NOT NULL, -- PLA, PLA+, PETG, ABS, ASA, TPU, etc.
    color_name TEXT NOT NULL,
    color_hex TEXT DEFAULT '#000000',
    diameter NUMERIC(4, 2) NOT NULL DEFAULT 1.75, -- 1.75 or 2.85 mm
    weight_grams NUMERIC(10, 2) NOT NULL DEFAULT 1000, -- spool weight in grams (e.g. 1000g = 1kg)
    stock_spools INTEGER NOT NULL DEFAULT 0,
    sku TEXT UNIQUE,
    supplier TEXT,
    cost_per_spool NUMERIC(10, 2) DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create filament stock movements/audit log
CREATE TABLE IF NOT EXISTS public.filament_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filament_id UUID NOT NULL REFERENCES public.filaments(id) ON DELETE CASCADE,
    delta_spools INTEGER NOT NULL,
    resulting_stock INTEGER NOT NULL,
    reason TEXT NOT NULL, -- 'received', 'used', 'adjustment', 'order_deduct', 'order_restore'
    notes TEXT,
    order_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create product filament variations join table (product_id is TEXT matching public.products(id))
CREATE TABLE IF NOT EXISTS public.product_filament_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    filament_id UUID NOT NULL REFERENCES public.filaments(id) ON DELETE CASCADE,
    price_adjustment NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_product_filament UNIQUE(product_id, filament_id)
);

-- Enable RLS
ALTER TABLE public.filaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filament_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_filament_variations ENABLE ROW LEVEL SECURITY;

-- Create policies for anon, authenticated, service_role
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public can view active filaments" ON public.filaments;
    CREATE POLICY "Public can view active filaments" ON public.filaments FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Admins can manage filaments" ON public.filaments;
    CREATE POLICY "Admins can manage filaments" ON public.filaments FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public can view filament movements" ON public.filament_movements;
    CREATE POLICY "Public can view filament movements" ON public.filament_movements FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Admins can manage filament movements" ON public.filament_movements;
    CREATE POLICY "Admins can manage filament movements" ON public.filament_movements FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public can view product filament variations" ON public.product_filament_variations;
    CREATE POLICY "Public can view product filament variations" ON public.product_filament_variations FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Admins can manage product filament variations" ON public.product_filament_variations;
    CREATE POLICY "Admins can manage product filament variations" ON public.product_filament_variations FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_filaments_material ON public.filaments(material);
CREATE INDEX IF NOT EXISTS idx_filaments_sku ON public.filaments(sku);
CREATE INDEX IF NOT EXISTS idx_filament_movements_filament_id ON public.filament_movements(filament_id);
CREATE INDEX IF NOT EXISTS idx_product_filament_variations_product_id ON public.product_filament_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_filament_variations_filament_id ON public.product_filament_variations(filament_id);

NOTIFY pgrst, 'reload schema';
