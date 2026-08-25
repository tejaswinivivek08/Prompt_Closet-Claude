-- Prompt Closet — Complete Database Setup
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- Safe to re-run: all statements use IF NOT EXISTS / ON CONFLICT / CREATE OR REPLACE

-- ============================================================
-- 1. WARDROBE ITEMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wardrobe_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url     TEXT,
  image_urls    TEXT[] DEFAULT '{}',
  category      TEXT NOT NULL DEFAULT 'top',
  subcategory   TEXT,
  colors        TEXT[] DEFAULT '{}',
  pattern       TEXT,
  fabric        TEXT,
  occasions     TEXT[] DEFAULT '{}',
  formality_score INTEGER DEFAULT 3,
  season        TEXT[] DEFAULT '{}',
  suggested_name TEXT,
  style_notes   TEXT,
  is_active     BOOLEAN DEFAULT true,
  wear_count    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wardrobe_user_id ON public.wardrobe_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wardrobe_created_at ON public.wardrobe_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wardrobe_category ON public.wardrobe_items(category);

-- ============================================================
-- 2. PROFILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  avatar_url    TEXT,
  skin_tone_palette TEXT,
  body_measurements JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. WARDROBE ITEMS RLS POLICIES
-- (drop and recreate to ensure they're correct)
-- ============================================================

DROP POLICY IF EXISTS "wardrobe_select_own" ON public.wardrobe_items;
DROP POLICY IF EXISTS "wardrobe_insert_own" ON public.wardrobe_items;
DROP POLICY IF EXISTS "wardrobe_update_own" ON public.wardrobe_items;
DROP POLICY IF EXISTS "wardrobe_delete_own" ON public.wardrobe_items;

-- Users can read their own items only
CREATE POLICY "wardrobe_select_own" ON public.wardrobe_items
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert items only for themselves
CREATE POLICY "wardrobe_insert_own" ON public.wardrobe_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own items only
CREATE POLICY "wardrobe_update_own" ON public.wardrobe_items
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own items only
CREATE POLICY "wardrobe_delete_own" ON public.wardrobe_items
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 5. PROFILES RLS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- 6. GRANTS — allow authenticated users to use these tables
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wardrobe_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- ============================================================
-- 7. VERIFY
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('wardrobe_items', 'profiles')
ORDER BY tablename;
