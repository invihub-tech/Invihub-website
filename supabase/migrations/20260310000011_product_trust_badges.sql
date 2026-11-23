-- Migration 20260310000011_product_trust_badges.sql
-- Add trust_badges_json column to products table for configurable trust badges per product

ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS trust_badges_json text NOT NULL DEFAULT '[]';

COMMENT ON COLUMN public.products.trust_badges_json IS 'JSON array of selected trust badge IDs or labels, e.g. ["pan_india_shipping", "tested_gear", "warranty_1yr", "returns_7day"]';
