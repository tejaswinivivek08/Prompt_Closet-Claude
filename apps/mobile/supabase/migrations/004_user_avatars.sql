-- ============================================================
-- User Avatars — MiniMax-generated styled avatars
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_avatars (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    avatar_url      TEXT        NOT NULL,
    style           TEXT        NOT NULL DEFAULT 'illustration',
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_avatars_own" ON public.user_avatars
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_avatars_user_id ON public.user_avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_avatars_active ON public.user_avatars(user_id, is_active) WHERE is_active = TRUE;
