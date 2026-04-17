-- ============================================================
-- Prompt Closet — Initial Schema Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable pgvector extension for CLIP embeddings
-- Note: pgvector is NOT auto-enabled on free tier. Run this manually.
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with app-level profile fields.
--
-- Design decisions:
-- * id = auth.users id: Single source of truth for user identity.
--   No separate user table — Supabase Auth IS the user table.
-- * skin_tone_palette: Required for virtual try-on (Phase 1.1).
--   Stored as enum-like text, validated via CHECK constraint.
-- * body_measurements: JSONB for flexibility. Optional fields
--   mean the schema can evolve without migrations.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       TEXT,
    avatar_url      TEXT,
    skin_tone_palette TEXT     CHECK (skin_tone_palette IN (
        'fair-cool', 'fair-warm', 'medium-cool', 'medium-warm', 'deep-cool', 'deep-warm'
    )),
    body_measurements JSONB     DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile row when a user signs up via auth.users trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- WARDROBE_ITEMS TABLE
-- One row per clothing item in the user's closet.
--
-- Design decisions:
-- * id = gen_random_uuid(): Supabase Storage uses UUIDs for files,
--   matching the primary key avoids joins when deleting.
-- * colors[], occasions[], season[] as ARRAY[TEXT]: A single item
--   can belong to multiple colors (e.g., 'navy AND white' shirt) and
--   multiple occasions (e.g., casual + office). This avoids the
--   EAV antipattern and enables efficient SQL filtering with ANY().
-- * pattern as single TEXT (not array): An item has one dominant
--   pattern. If mixed, tag the dominant one; Phase 2 can add a
--   second_pattern column.
-- * ai_tags as JSONB: Stores the raw Claude Vision response for
--   debugging, audit, and future re-tagging if the model improves.
--   Not used for queries — queryable fields are extracted columns.
-- * embedding FK deferred to item_embeddings: Separates concerns.
--   Tagging and embedding are independent async jobs. An item can
--   exist with tags but no embedding (still queryable by filters).
-- * formality_score: Canonical 1-5 scale (not 1-10). Matches ML
--   evaluation baselines and DB CHECK constraint. See Decision D2.
-- * wear_count, last_worn_at: Simple wear tracking without a
--   separate outfit_wear_logs table. Phase 2 can normalize if needed.
-- * is_active: Soft-delete. Deleted items are hidden but retain
--   history for outfit references.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wardrobe_items (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_url           TEXT        NOT NULL,
    thumbnail_url       TEXT,
    category            TEXT        NOT NULL CHECK (category IN (
        'top', 'bottom', 'dress', 'outerwear', 'footwear', 'accessory', 'traditional'
    )),
    subcategory         TEXT,
    colors              TEXT[]      NOT NULL DEFAULT '{}',
    pattern             TEXT        NOT NULL CHECK (pattern IN (
        'solid', 'striped', 'floral', 'printed', 'embroidered', 'checkered'
    )),
    fabric              TEXT,
    occasions           TEXT[]      NOT NULL DEFAULT '{}',
    formality_score     INTEGER     NOT NULL DEFAULT 3 CHECK (formality_score BETWEEN 1 AND 5),
    season              TEXT[]      NOT NULL DEFAULT ARRAY['all-season'],
    brand               TEXT,
    purchase_price      NUMERIC(10,2),
    last_worn_at        TIMESTAMPTZ,
    wear_count          INTEGER     NOT NULL DEFAULT 0,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    ai_tags             JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user_id       ON public.wardrobe_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_category     ON public.wardrobe_items(user_id, category);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_occasion     ON public.wardrobe_items USING GIN(user_id, occasions);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_formality    ON public.wardrobe_items(user_id, formality_score);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_created_at   ON public.wardrobe_items(user_id, created_at DESC);

-- ============================================================
-- ITEM_EMBEDDINGS TABLE
-- Stores CLIP ViT-B/32 (512-dim) vectors per wardrobe item.
--
-- Design decisions:
-- * Separate from wardrobe_items: Embedding generation is independent
--   of tagging. They run in parallel. Keeping them separate means
--   one can fail without affecting the other (separate status columns).
-- * vector(512): CLIP ViT-B/32 produces 512-dimensional vectors.
--   Do NOT change this dimension — the HF model is fixed at 512.
-- * ivfflat index: Not needed at <1000 items (brute-force is <5ms).
--   Adding it anyway so it's ready when the demo scales. The lists
--   parameter (probes) should be tuned based on dataset size.
-- * item_id FK CASCADE: Deleting a wardrobe item removes its
--   embedding. No orphaned vectors.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.item_embeddings (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id         UUID        NOT NULL UNIQUE REFERENCES public.wardrobe_items(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    clip_embedding  vector(512) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for approximate nearest-neighbor search
-- lists = approximate number of clusters (sqrt of row count is a good starting point)
-- For demo with ~100 items: lists=10 is sufficient
CREATE INDEX IF NOT EXISTS idx_item_embeddings_cosine
    ON public.item_embeddings
    USING ivfflat (clip_embedding vector_cosine_ops)
    WITH (lists = 10);

-- ============================================================
-- OUTFITS TABLE
-- Saved outfit compositions from Magic Bar suggestions.
--
-- Design decisions:
-- * item_ids as UUID[]: Ordered array of wardrobe item references.
--   Simpler than a join table for Phase 1. Cascade trigger ensures
--   dangling UUIDs are cleaned up when items are deleted.
-- * ai_generated: Distinguishes AI-suggested outfits from manually
--   curated ones. Used to surface "You previously saved this" prompts.
-- * rating: Optional 1-5 user feedback on the outfit. NULL = unrated.
-- * reasoning: The AI paragraph explaining why items work together.
--   This is the key differentiator — preserved for re-reading.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outfits (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name            TEXT,
    item_ids        UUID[]      NOT NULL DEFAULT '{}',
    occasion        TEXT,
    rating          INTEGER     CHECK (rating BETWEEN 1 AND 5),
    worn_on         DATE,
    notes           TEXT,
    ai_generated    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outfits_user_id   ON public.outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_outfits_occasion ON public.outfits(user_id, occasion);

-- ============================================================
-- CASCADE DELETION TRIGGER
-- When a wardrobe_item is deleted, remove its UUID from all
-- outfits.item_ids arrays. This prevents dangling references.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_cleanup_outfit_item_references()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all outfits that contain the deleted item
    UPDATE public.outfits
    SET item_ids = ARRAY_REMOVE(item_ids, OLD.id)
    WHERE user_id = OLD.user_id
      AND OLD.id = ANY(item_ids);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_outfit_items ON public.wardrobe_items;
CREATE TRIGGER trg_cleanup_outfit_items
    AFTER DELETE ON public.wardrobe_items
    FOR EACH ROW EXECUTE FUNCTION public.fn_cleanup_outfit_item_references();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- All tables scoped to the authenticated user via auth.uid().
-- Anonymous access is disabled on all user-data tables.
-- ============================================================

-- Profiles: users can read/update their own profile only
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- wardrobe_items: users CRUD only their own items
ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wardrobe_items_all_own" ON public.wardrobe_items
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- item_embeddings: follows wardrobe_items — users can only see embeddings
-- for items they own (enforced via JOIN on wardrobe_items.user_id)
ALTER TABLE public.item_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_embeddings_all_own" ON public.item_embeddings
    FOR ALL USING (
        auth.uid() = user_id
    ) WITH CHECK (auth.uid() = user_id);

-- outfits: users CRUD only their own outfits
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outfits_all_own" ON public.outfits
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- VERIFICATION QUERIES
-- Run these in SQL Editor to verify the setup:
--
-- 1. Check pgvector is enabled:
--    SELECT * FROM pg_extension WHERE extname = 'vector';
--
-- 2. Check RLS is enabled on all tables:
--    SELECT tablename, rowsecurity FROM pg_tables
--    WHERE schemaname = 'public' AND rowsecurity = true;
--
-- 3. Check a user can only see their own data (run as authenticated user):
--    SELECT * FROM public.wardrobe_items WHERE auth.uid() = user_id;
--
-- 4. Check IVFFlat index was created:
--    SELECT indexname, indexdef FROM pg_indexes
--    WHERE tablename = 'item_embeddings';

-- ============================================================
-- SEMANTIC SEARCH RPC FUNCTION
-- Uses pgvector cosine similarity (<=>) to find wardrobe items
-- matching a text query embedding. Called by embeddingService.ts
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_wardrobe_items(
    query_embedding vector(512),
    p_user_id UUID,
    match_threshold FLOAT DEFAULT 0.2,
    match_count INT DEFAULT 10
)
RETURNS TABLE(item_id UUID, similarity FLOAT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ie.item_id,
        1 - (ie.clip_embedding <=> query_embedding) AS similarity
    FROM public.item_embeddings ie
    WHERE ie.user_id = p_user_id
      AND (ie.clip_embedding <=> query_embedding) < (1 - match_threshold)
    ORDER BY ie.clip_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
