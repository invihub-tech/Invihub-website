-- Migration 20260310000007_product_parts.sql
-- Add parts_json column to products table for multi-color / multi-part configurations

ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS parts_json text NOT NULL DEFAULT '[]';

-- Add comment explaining parts_json structure
COMMENT ON COLUMN public.products.parts_json IS 'JSON array of component parts for multi-color config, e.g. [{"id":"p1","name":"Main Body","allowedColors":["Black","White","Orange"]}]';
