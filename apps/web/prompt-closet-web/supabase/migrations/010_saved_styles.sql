-- supabase/migrations/010_saved_styles.sql
-- Run in Supabase SQL Editor: Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.saved_styles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  notes         TEXT,
  thumbnail_url TEXT,
  item_ids      UUID[] NOT NULL DEFAULT '{}',
  item_layers   JSONB NOT NULL DEFAULT '[]',
  gender        TEXT NOT NULL DEFAULT 'female' CHECK (gender IN ('female', 'male')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_styles_user_id ON public.saved_styles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_styles_created_at ON public.saved_styles(created_at DESC);

ALTER TABLE public.saved_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_styles_all_own" ON public.saved_styles;
CREATE POLICY "saved_styles_all_own" ON public.saved_styles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_styles TO authenticated;

SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'saved_styles';
