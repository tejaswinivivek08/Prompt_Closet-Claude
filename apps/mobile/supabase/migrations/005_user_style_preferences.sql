-- ============================================================
-- User Style Preferences — Bayesian prior per style dimension
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_style_preferences (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    dimension       TEXT        NOT NULL,  -- e.g. "casual", "formal", "festive"
    alpha           INTEGER     NOT NULL DEFAULT 1,  -- successes + prior
    beta            INTEGER     NOT NULL DEFAULT 1,   -- failures + prior
    signals         INTEGER     NOT NULL DEFAULT 0,  -- total feedback signals
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, dimension)
);

ALTER TABLE public.user_style_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_style_preferences_own" ON public.user_style_preferences
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_style_preferences_user_id ON public.user_style_preferences(user_id);
