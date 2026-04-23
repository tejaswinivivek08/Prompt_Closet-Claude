-- Add image_urls column to wardrobe_items for multi-photo support
-- First photo in the array is the cover/display image

ALTER TABLE public.wardrobe_items
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Backfill: set image_urls to array with single image_url for existing rows
UPDATE public.wardrobe_items
SET image_urls = ARRAY[image_url]
WHERE image_urls IS NULL AND image_url IS NOT NULL;
