-- Migration: 20260310000010_product_reviews.sql
-- Description: Dynamic Product Review and Rating System with moderation and automated rating aggregation

-- 1. Add aggregate rating columns to products table if not present
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- 2. Create product_reviews table
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_product_customer_review UNIQUE (product_id, customer_email)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON public.product_reviews(status);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON public.product_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON public.product_reviews(rating);

-- 4. Function to recalculate product rating_average and rating_count
CREATE OR REPLACE FUNCTION public.fn_recalculate_product_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_prod_id TEXT;
  new_avg NUMERIC(3,2);
  new_cnt INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_prod_id := OLD.product_id;
  ELSE
    target_prod_id := NEW.product_id;
  END IF;

  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
    COALESCE(COUNT(*), 0)
  INTO new_avg, new_cnt
  FROM public.product_reviews
  WHERE product_id = target_prod_id AND status = 'APPROVED';

  UPDATE public.products
  SET
    rating_average = new_avg,
    rating_count = new_cnt,
    updated_at = now()
  WHERE id = target_prod_id;

  -- If product_id was updated to a different product, update old product as well
  IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
    SELECT
      COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
      COALESCE(COUNT(*), 0)
    INTO new_avg, new_cnt
    FROM public.product_reviews
    WHERE product_id = OLD.product_id AND status = 'APPROVED';

    UPDATE public.products
    SET
      rating_average = new_avg,
      rating_count = new_cnt,
      updated_at = now()
    WHERE id = OLD.product_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger on product_reviews
DROP TRIGGER IF EXISTS trg_recalculate_product_rating ON public.product_reviews;
CREATE TRIGGER trg_recalculate_product_rating
AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.fn_recalculate_product_rating();

-- 6. Enable RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.product_reviews;
CREATE POLICY "Public can view approved reviews"
  ON public.product_reviews
  FOR SELECT
  USING (status = 'APPROVED');

DROP POLICY IF EXISTS "Public can submit reviews" ON public.product_reviews;
CREATE POLICY "Public can submit reviews"
  ON public.product_reviews
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can update their own reviews" ON public.product_reviews;
CREATE POLICY "Customers can update their own reviews"
  ON public.product_reviews
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
