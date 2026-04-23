-- outfit_feedback: Implicit feedback on AI-generated outfit suggestions
-- Accept/Reject buttons in MagicBar capture user preference for learning

CREATE TABLE IF NOT EXISTS public.outfit_feedback (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    query_text    TEXT        NOT NULL,          -- what the user searched for
    outfit_name   TEXT        NOT NULL,          -- AI-suggested outfit name
    item_ids      UUID[]      NOT NULL,          -- items in the suggested outfit
    feedback      TEXT        NOT NULL CHECK (feedback IN ('accepted', 'rejected')),
    -- 'accepted' = user saved the outfit
    -- 'rejected' = user dismissed the outfit
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outfit_feedback_user_id ON public.outfit_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_feedback_created_at ON public.outfit_feedback(created_at);
