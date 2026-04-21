-- Migration 007: Add profile and wardrobe item columns
-- Date: 2026-04-21

-- Add columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS style_preferences TEXT[];

COMMENT ON COLUMN public.profiles.username IS 'User handle/username';
COMMENT ON COLUMN public.profiles.style_preferences IS 'Array of style preference tags e.g. {Minimalist,Festive}';

-- Add columns to wardrobe_items table
ALTER TABLE public.wardrobe_items
ADD COLUMN IF NOT EXISTS suggested_name TEXT,
ADD COLUMN IF NOT EXISTS style_notes TEXT;

COMMENT ON COLUMN public.wardrobe_items.suggested_name IS 'AI-suggested item name e.g. Navy Linen Blazer';
COMMENT ON COLUMN public.wardrobe_items.style_notes IS 'AI-generated style notes and description';

-- Make suggested_name and style_notes visible in RLS policies
-- (already covered by existing policies on wardrobe_items since they are just additional columns)
