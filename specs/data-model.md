# Data Model Specification

## Entities

### profiles

Supabase Auth manages the `auth.users` table. We add app-level fields.

| Column            | Type        | Constraints                                                                  | Notes                                            |
| ----------------- | ----------- | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| id                | UUID        | PK, REFERENCES auth.users(id) ON DELETE CASCADE                              | Same as auth UID                                 |
| full_name         | TEXT        | nullable                                                                     | User-chosen display name                         |
| avatar_url        | TEXT        | nullable                                                                     | Profile picture                                  |
| skin_tone_palette | TEXT        | CHECK (fair-cool, fair-warm, medium-cool, medium-warm, deep-cool, deep-warm) | For virtual try-on (Phase 1.1)                   |
| body_measurements | JSONB       | default `{}`                                                                 | height_cm, weight_kg, bust_cm, waist_cm, hips_cm |
| created_at        | TIMESTAMPTZ | DEFAULT NOW()                                                                |                                                  |

### wardrobe_items

One row per clothing item in the user's closet. Replaces the earlier `clothing_items` name per user's request.

| Column          | Type          | Constraints                                                                      | Notes                                                               |
| --------------- | ------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| id              | UUID          | PK, DEFAULT gen_random_uuid()                                                    | Matches Supabase Storage UUID filenames                             |
| user_id         | UUID          | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE                              | RLS: auth.uid() = user_id                                           |
| image_url       | TEXT          | NOT NULL                                                                         | Supabase Storage public URL                                         |
| thumbnail_url   | TEXT          | nullable                                                                         | Resized version for grid display                                    |
| category        | TEXT          | NOT NULL CHECK (top, bottom, dress, outerwear, footwear, accessory, traditional) | Primary category                                                    |
| subcategory     | TEXT          | nullable                                                                         | kurta, saree, blazer, jeans, etc.                                   |
| colors          | TEXT[]        | NOT NULL DEFAULT '{}'                                                            | Array of color names — supports multi-color items                   |
| pattern         | TEXT          | NOT NULL CHECK (solid, striped, floral, printed, embroidered, checkered)         | Single dominant pattern                                             |
| fabric          | TEXT          | nullable                                                                         | cotton, silk, polyester, denim, wool, linen, chiffon                |
| occasions       | TEXT[]        | NOT NULL DEFAULT '{}'                                                            | Array: casual, office, party, festive, wedding, temple, beach, date |
| formality_score | INTEGER       | NOT NULL DEFAULT 3 CHECK 1-5                                                     | 1=very casual, 5=very formal — canonical 1-5 scale (Decision D2)    |
| season          | TEXT[]        | NOT NULL DEFAULT ARRAY['all-season']                                             | all-season, summer, winter, monsoon                                 |
| brand           | TEXT          | nullable                                                                         |                                                                     |
| purchase_price  | NUMERIC(10,2) | nullable                                                                         |                                                                     |
| last_worn_at    | TIMESTAMPTZ   | nullable                                                                         |                                                                     |
| wear_count      | INTEGER       | NOT NULL DEFAULT 0                                                               |                                                                     |
| is_active       | BOOLEAN       | NOT NULL DEFAULT TRUE                                                            | Soft-delete — hidden but retains outfit history                     |
| ai_tags         | JSONB         | nullable                                                                         | Raw Claude Vision response — stored for debugging and re-tagging    |
| created_at      | TIMESTAMPTZ   | DEFAULT NOW()                                                                    |                                                                     |

### item_embeddings

CLIP ViT-B/32 (512-dim) vectors, one per wardrobe item. Separate from `wardrobe_items` because embedding generation and tagging are independent async jobs.

| Column         | Type        | Constraints                                                      | Notes                                 |
| -------------- | ----------- | ---------------------------------------------------------------- | ------------------------------------- |
| id             | UUID        | PK, DEFAULT gen_random_uuid()                                    |                                       |
| item_id        | UUID        | NOT NULL UNIQUE, REFERENCES wardrobe_items(id) ON DELETE CASCADE | One embedding per item                |
| user_id        | UUID        | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE              |                                       |
| clip_embedding | vector(512) | NOT NULL                                                         | CLIP ViT-B/32 — 512 dimensions, fixed |
| created_at     | TIMESTAMPTZ | DEFAULT NOW()                                                    |                                       |

### outfits

Saved outfit compositions from Magic Bar suggestions.

| Column       | Type        | Constraints                                         | Notes                                  |
| ------------ | ----------- | --------------------------------------------------- | -------------------------------------- |
| id           | UUID        | PK, DEFAULT gen_random_uuid()                       |                                        |
| user_id      | UUID        | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE |                                        |
| name         | TEXT        | nullable                                            | User-provided outfit name              |
| item_ids     | UUID[]      | NOT NULL DEFAULT '{}'                               | Ordered array of wardrobe_item IDs     |
| occasion     | TEXT        | nullable                                            | Extracted from NL prompt               |
| rating       | INTEGER     | CHECK 1-5, nullable                                 | User feedback on outfit                |
| worn_on      | DATE        | nullable                                            |                                        |
| notes        | TEXT        | nullable                                            |                                        |
| ai_generated | BOOLEAN     | NOT NULL DEFAULT FALSE                              | Distinguishes AI-suggested from manual |
| created_at   | TIMESTAMPTZ | DEFAULT NOW()                                       |                                        |

## Indexes

```sql
CREATE INDEX idx_wardrobe_items_user_id ON wardrobe_items(user_id);
CREATE INDEX idx_wardrobe_items_category ON wardrobe_items(user_id, category);
CREATE INDEX idx_wardrobe_items_occasion ON wardrobe_items USING GIN(user_id, occasions);
CREATE INDEX idx_wardrobe_items_formality ON wardrobe_items(user_id, formality_score);
CREATE INDEX idx_wardrobe_items_created_at ON wardrobe_items(user_id, created_at DESC);
CREATE INDEX idx_item_embeddings_cosine
    ON item_embeddings USING ivfflat (clip_embedding vector_cosine_ops) WITH (lists = 10);
CREATE INDEX idx_outfits_user_id ON outfits(user_id);
CREATE INDEX idx_outfits_occasion ON outfits(user_id, occasion);
```

## RLS Policies

```sql
-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- wardrobe_items
ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wardrobe_items_all_own" ON wardrobe_items FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- item_embeddings
ALTER TABLE item_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_embeddings_all_own" ON item_embeddings FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- outfits
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outfits_all_own" ON outfits FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

## Cascade Deletion Trigger

When a `wardrobe_item` is deleted, a trigger removes its UUID from all `outfits.item_ids` arrays:

```sql
CREATE OR REPLACE FUNCTION fn_cleanup_outfit_item_references()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE outfits
    SET item_ids = ARRAY_REMOVE(item_ids, OLD.id)
    WHERE user_id = OLD.user_id AND OLD.id = ANY(item_ids);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cleanup_outfit_items
    AFTER DELETE ON wardrobe_items
    FOR EACH ROW EXECUTE FUNCTION fn_cleanup_outfit_item_references();
```

## Key Design Decisions

- `colors[]`, `occasions[]`, `season[]` as ARRAY[TEXT]: A single item can have multiple colors and serve multiple occasions. Avoids EAV antipattern and enables efficient SQL `ANY()` filtering.
- `ai_tags` as JSONB: Stores raw Claude Vision response for debugging, audit, and future re-tagging. Queryable fields are extracted flat columns.
- Embedding on separate `item_embeddings` table: Tagging and embedding are independent async jobs. One can fail without affecting the other.
- `vector(512)`: CLIP ViT-B/32 produces exactly 512 dimensions. This is fixed by the HF model — do not change.
- `formality_score` 1-5 with CHECK constraint: Canonical scale matching ML evaluation baselines. UX slider shows 5 ticks. See Decision D2.
- `is_active` for soft-delete: Deleted items are hidden but retain history so `outfits.item_ids` references remain valid.
- `item_ids` as UUID[] (not join table): Simpler for Phase 1. Join table if many-to-many outfit-items emerge in Phase 2.
- IVFFlat index with `lists=10`: Sufficient for ~100 demo items. For 1000+ items, rebuild with `lists=sqrt(n)`.

## TypeScript Interfaces

```typescript
interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  skin_tone_palette?:
    | "fair-cool"
    | "fair-warm"
    | "medium-cool"
    | "medium-warm"
    | "deep-cool"
    | "deep-warm";
  body_measurements?: {
    height_cm?: number;
    weight_kg?: number;
    bust_cm?: number;
    waist_cm?: number;
    hips_cm?: number;
  };
  created_at: string;
}

interface WardrobeItem {
  id: string;
  user_id: string;
  image_url: string;
  thumbnail_url?: string;
  category:
    | "top"
    | "bottom"
    | "dress"
    | "outerwear"
    | "footwear"
    | "accessory"
    | "traditional";
  subcategory?: string;
  colors: string[];
  pattern:
    | "solid"
    | "striped"
    | "floral"
    | "printed"
    | "embroidered"
    | "checkered";
  fabric?: string;
  occasions: (
    | "casual"
    | "office"
    | "party"
    | "festive"
    | "wedding"
    | "temple"
    | "beach"
    | "date"
  )[];
  formality_score: number; // 1-5
  season: ("all-season" | "summer" | "winter" | "monsoon")[];
  brand?: string;
  purchase_price?: number;
  last_worn_at?: string;
  wear_count: number;
  is_active: boolean;
  ai_tags?: Record<string, unknown>;
  created_at: string;
}

interface ItemEmbedding {
  id: string;
  item_id: string;
  user_id: string;
  clip_embedding: number[]; // 512-dim CLIP vector
  created_at: string;
}

interface Outfit {
  id: string;
  user_id: string;
  name?: string;
  item_ids: string[];
  occasion?: string;
  rating?: number; // 1-5
  worn_on?: string; // date
  notes?: string;
  ai_generated: boolean;
  created_at: string;
}
```

## Migration History

| Version | Date       | Change                                                                                               |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| 001     | 2026-04-17 | Initial schema: wardrobe_items, item_embeddings, outfits, profiles with full RLS and cascade trigger |
