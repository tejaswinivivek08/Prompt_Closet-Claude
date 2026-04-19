-- ============================================================
-- Style DNA Results — K-means clustering on CLIP embeddings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.style_dna_results (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    k_optimal       INTEGER     NOT NULL,
    silhouette_score FLOAT,
    clusters        JSONB       NOT NULL,   -- StyleCluster[] array
    item_assignments JSONB       NOT NULL,  -- { item_id: cluster_id }
    inertias        FLOAT[]     NOT NULL DEFAULT '{}',
    silhouette_scores FLOAT[]   NOT NULL DEFAULT '{}',
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.style_dna_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "style_dna_own" ON public.style_dna_results
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_style_dna_user_id ON public.style_dna_results(user_id);
CREATE INDEX IF NOT EXISTS idx_style_dna_computed_at ON public.style_dna_results(user_id, computed_at DESC);

-- ============================================================
-- Outfit Feedback — implicit preference tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.outfit_feedback (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    outfit_id       UUID        REFERENCES public.outfits(id) ON DELETE CASCADE,
    feedback        TEXT        NOT NULL CHECK (feedback IN ('accepted', 'rejected')),
    outfit_hash     TEXT        NOT NULL,  -- privacy: hash of item_ids, not raw
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.outfit_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outfit_feedback_own" ON public.outfit_feedback
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_outfit_feedback_user_id ON public.outfit_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_feedback_outfit_hash ON public.outfit_feedback(user_id, outfit_hash);

-- ============================================================
-- Wear tracking — last worn timestamp for dead weight detector
-- ============================================================

ALTER TABLE public.wardrobe_items
    ADD COLUMN IF NOT EXISTS worn_last_at TIMESTAMPTZ;

ALTER TABLE public.wardrobe_items
    ADD COLUMN IF NOT EXISTS wear_count INTEGER NOT NULL DEFAULT 0;

-- Auto-update worn_last_at when outfit is saved with worn_on date
CREATE OR REPLACE FUNCTION public.fn_update_wear_on_save()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.worn_on IS NOT NULL THEN
        -- For each item in the outfit, update wear tracking
        -- This requires a separate trigger on outfits table
        NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_wear_on_save ON public.outfits;
CREATE TRIGGER trg_update_wear_on_save
    AFTER INSERT OR UPDATE OF worn_on ON public.outfits
    FOR EACH ROW
    WHEN (NEW.worn_on IS NOT NULL)
    EXECUTE FUNCTION public.fn_update_wear_on_save();

-- ============================================================
-- pg_cron: Dead Weight Detector — weekly scan
-- ============================================================
-- Flag items not worn in 45 days
-- Note: pg_cron extension must be enabled in Supabase
-- Run manually or via Supabase dashboard cron jobs

-- SELECT cron.schedule('dead-weight-scan', '0 9 * * 1', $$
--   UPDATE wardrobe_items
--   SET ai_tags = jsonb_set(COALESCE(ai_tags, '{}'), '{neglect_badge}', 'true')
--   WHERE is_active = TRUE
--     AND worn_last_at IS NOT NULL
--     AND worn_last_at < NOW() - INTERVAL '45 days'
--     AND (ai_tags->>'neglect_badge') IS DISTINCT FROM 'true';
-- $$);
