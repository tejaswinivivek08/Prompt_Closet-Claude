-- Migration 009: Digital Twin Schema
-- Run this in Supabase SQL Editor

-- Add columns to profiles table for avatar parameters
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_glb_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_params JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skin_tone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height_cm INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weight_kg INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bust_cm INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS waist_cm INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hip_cm INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS body_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hair_style TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hair_color TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clothing_size TEXT;

-- Create try_on_results table for storing virtual try-on outputs
CREATE TABLE IF NOT EXISTS public.try_on_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  avatar_url TEXT NOT NULL,
  outfit_item_ids UUID[] NOT NULL,
  result_image_url TEXT,
  result_glb_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_try_on_results_user_id ON public.try_on_results(user_id);
CREATE INDEX IF NOT EXISTS idx_try_on_results_created_at ON public.try_on_results(created_at DESC);

-- Enable Row Level Security on try_on_results
ALTER TABLE public.try_on_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own try-on results
CREATE POLICY "try_on_own_results" ON public.try_on_results
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.try_on_results TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL of the user avatar image';
COMMENT ON COLUMN public.profiles.avatar_glb_url IS 'URL of the 3D GLB avatar model';
COMMENT ON COLUMN public.profiles.avatar_params IS 'JSON parameters used to generate the avatar';
COMMENT ON COLUMN public.profiles.skin_tone IS 'Hex color code of user skin tone';
COMMENT ON COLUMN public.profiles.height_cm IS 'User height in centimeters';
COMMENT ON COLUMN public.profiles.weight_kg IS 'User weight in kilograms';
COMMENT ON COLUMN public.profiles.bust_cm IS 'User bust measurement in cm';
COMMENT ON COLUMN public.profiles.waist_cm IS 'User waist measurement in inches (stored as INTEGER)';
COMMENT ON COLUMN public.profiles.hip_cm IS 'User hip measurement in inches (stored as INTEGER)';
COMMENT ON COLUMN public.profiles.body_type IS 'Body type classification (slim, average, athletic, curvy)';
COMMENT ON COLUMN public.profiles.hair_style IS 'Hair style (short, medium, long, very_long)';
COMMENT ON COLUMN public.profiles.hair_color IS 'Hair color (black, brown, blonde, etc.)';
COMMENT ON COLUMN public.profiles.clothing_size IS 'Indian clothing size (XS, S, M, L, XL, XXL)';
COMMENT ON TABLE public.try_on_results IS 'Stores virtual try-on results linking avatars with outfits';
