-- Migration 011: Add style_origin and is_full_set for better Indian wear classification
-- Run in Supabase Dashboard → SQL Editor before deploying

ALTER TABLE public.wardrobe_items
  ADD COLUMN IF NOT EXISTS style_origin TEXT NOT NULL DEFAULT 'western'
    CHECK (style_origin IN ('indian', 'western', 'neutral')),
  ADD COLUMN IF NOT EXISTS is_full_set BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.wardrobe_items.style_origin IS
  'indian = Indian ethnic wear, western = Western clothing, neutral = wearable with either (plain white tee, black trousers, etc.)';

COMMENT ON COLUMN public.wardrobe_items.is_full_set IS
  'true for saree, lehenga set, salwar suit set, kurta set with dupatta — items worn as a complete outfit without mixing Western pieces';

-- Backfill: auto-classify existing "traditional" category items as indian
UPDATE public.wardrobe_items
SET style_origin = 'indian'
WHERE category = 'traditional' AND style_origin = 'western';
