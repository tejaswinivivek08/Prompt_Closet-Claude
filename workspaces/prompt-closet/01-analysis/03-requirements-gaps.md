# Prompt Closet -- Phase 1 Requirements Gaps Analysis

**Analyst:** analyst
**Date:** 2026-04-17
**Source:** `workspaces/prompt-closet/briefs/01-product-brief.md`
**Complexity:** Moderate (score: 16/30)

---

## Executive Summary

The Phase 1 scope covers the data ingestion pipeline (photograph, tag, embed, store, display, search) but omits three features the product concept promises: outfit composition logic behind the Magic Bar, the 2D avatar for virtual try-on, and style learning via clustering. Additionally, the scope lacks essential cross-cutting concerns -- error handling for the camera/Vision/CLIP chain, a data model definition, state management for multi-step upload, and any mechanism for the user to correct bad tags. The Phase 1 scope is well-chosen for an ingestion MVP, but the brief's promise of a "Magic Bar for outfit suggestions" creates a gap between what the demo will show (semantic search returning single items) and what the audience will expect (outfit compositions). This gap is the highest-priority fix.

---

## 1. Brief Traceability Matrix

Every sentence fragment in the product concept mapped to Phase 1 coverage.

| Concept Statement                                                         | Phase 1 Feature                | Coverage | Gap Description                                                                                                                     |
| ------------------------------------------------------------------------- | ------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| "photograph their wardrobe"                                               | Camera/image upload flow (#2)  | COVERED  | --                                                                                                                                  |
| "AI auto-tags each item (category, color, pattern, occasion)"             | Auto-tagging pipeline (#3)     | COVERED  | No mechanism for user to correct bad tags                                                                                           |
| "natural language Magic Bar"                                              | Basic semantic search (#6)     | PARTIAL  | Search returns items, not outfits. "Show me something for a rainy Diwali dinner" implies composing 3-5 items, not finding one shirt |
| "outfit suggestions"                                                      | --                             | MISSING  | No outfit composition logic. No outfit data model. No notion of compatible items                                                    |
| "2D digital avatar virtual try-on"                                        | --                             | MISSING  | Entirely absent from Phase 1 scope. No avatar renderer, no garment overlay, no body model                                           |
| "learns personal style over time using clustering on clothing embeddings" | CLIP embedding generation (#4) | PARTIAL  | Embeddings exist but no clustering algorithm, no style profile, no feedback loop, no "over time" mechanism                          |

**Verdict:** 2 of 6 concept statements are fully covered. 2 are partially covered (infrastructure exists, behavior does not). 2 are entirely missing.

---

## 2. Missing from Phase 1 Scope

### 2.1 Gaps That Block a Working Demo (P0)

| #   | Gap                                                  | Why It Blocks the Demo                                                                                                                                                                                                                                                              | Proposed Resolution                                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | **Outfit composition logic**                         | The product's signature feature ("Magic Bar") is described as returning outfit suggestions. Phase 1 returns single items via search. A demo where the user types "outfit for a rainy Diwali dinner" and gets back one shirt is a failed demo.                                       | Build a lightweight outfit composer that takes the Magic Bar prompt, asks Claude to decompose it into item slots (top, bottom, shoes, accessories), then fills each slot via semantic search against the user's closet. Output is a grouped set, not a single item. |
| G2  | **Error handling for the upload-to-embedding chain** | The pipeline is: camera -> upload -> Claude Vision -> CLIP -> pgvector. Any link failing silently produces a closet with missing tags or no embedding, making search return garbage. Demo-audience members will photograph poorly lit items, blurry items, multiple items in frame. | Add explicit error states at each pipeline stage. Surface "retake photo" / "we couldn't identify this item" to the user. Do not silently skip failed items.                                                                                                         |
| G3  | **Data model definition**                            | Phase 1 lists features but not the schema. Without a defined data model, each feature will invent its own shape and they will not compose.                                                                                                                                          | Define entities before implementation: `users`, `wardrobe_items` (with fields: id, user_id, image_url, thumbnail_url, tags JSONB, embedding vector, created_at), `outfits` (id, user_id, item_ids array, name, occasion, created_at).                               |
| G4  | **Tag correction / editing UI**                      | Claude Vision will mis-tag items. A demo where the user cannot fix "blue shirt" that was tagged "green dress" will look broken. At minimum, allow the user to tap a tag and change it.                                                                                              | Add inline tag editing on the closet grid. Patch the Supabase row on change. This is a small UI component but critical for demo credibility.                                                                                                                        |

### 2.2 Gaps That Weaken the Demo (P1)

| #   | Gap                                 | Why It Weakens the Demo                                                                                                                                                                                                                             | Proposed Resolution                                                                                                                                                                                                                                      |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G5  | **Upload state machine**            | Uploading + tagging + embedding is async and takes seconds. The UI needs loading states, retry on failure, and progress indication. Without it, the app appears frozen.                                                                             | Implement a 3-state upload flow: uploading -> processing -> done. Show a spinner with the current stage. Allow retry on failure.                                                                                                                         |
| G6  | **Item deletion**                   | Users will upload duplicates or bad photos. A closet that cannot be cleaned up becomes cluttered fast during a live demo.                                                                                                                           | Swipe-to-delete or long-press delete with confirmation dialog.                                                                                                                                                                                           |
| G7  | **Onboarding / empty state**        | First-time user opens the app, sees an empty closet grid. No guidance on what to do.                                                                                                                                                                | Empty state screen with a CTA: "Add your first item" with camera icon. Brief tooltip on first launch.                                                                                                                                                    |
| G8  | **Thumbnail generation**            | Raw photos from phone cameras are 3-12 MB. Loading a grid of full-resolution images will lag or OOM on older devices.                                                                                                                               | Generate a thumbnail (200x200 or similar) on upload, store in Supabase storage, use thumbnails in the grid, full image on detail view.                                                                                                                   |
| G9  | **Magic Bar prompt interpretation** | "Show me something for a rainy Diwali dinner" requires decomposing the prompt into: formality=semi-formal, weather=rainy, occasion=cultural celebration, color preferences=warm/festive. Raw cosine similarity on embeddings will not do this well. | Use Claude to interpret the prompt into a structured filter (occasion, formality, color family, weather suitability), then combine structured filtering with embedding similarity. Two-pass retrieval: filter by tags, then rank by embedding proximity. |

### 2.3 Gaps That Are Nice-to-Have (P2)

| #   | Gap                           | Notes                                                                                                                                                                         |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G10 | 2D avatar / virtual try-on    | Significant effort. Recommend deferring to Phase 2. For demo, show outfit composition as a styled card stack (top, bottom, shoes laid out visually) rather than on an avatar. |
| G11 | Style learning via clustering | Requires 20+ items per user to produce meaningful clusters. For a demo with <10 items, clustering output is noise. Defer to Phase 2.                                          |
| G12 | Outfit favorites / save       | User likes an outfit suggestion and wants to save it. Useful but not needed for first demo.                                                                                   |
| G13 | Sharing (social)              | Export outfit as image for social media. Out of scope for course demo.                                                                                                        |
| G14 | Weather API integration       | Auto-suggest based on current weather. Interesting ML angle but not needed for demo.                                                                                          |

---

## 3. Scope That Is Too Ambitious for Phase 1

These items are in the current Phase 1 scope but carry risk of over-engineering for a course demo.

| Current Scope Item                               | Risk                                                                                                                                                                                                                                      | Recommendation                                                                                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Supabase auth with email + Google OAuth** (#1) | Google OAuth requires app registration, consent screen review (can take days), and proper redirect URI configuration. For a course demo, this is over-engineered. Email-only auth is sufficient. If Google is needed, defer to Phase 1.1. | Start with email + magic link (Supabase built-in, zero config). Add Google OAuth only if time permits.                                                 |
| **CLIP embeddings via Hugging Face API** (#4)    | Depends on external API availability and latency. Hugging Face inference API has rate limits on free tier. For a course demo with <50 items, the latency is acceptable but the dependency risk is real.                                   | Keep in Phase 1, but add a fallback: if HF API is down, use a pre-computed embedding hash (deterministic from tags) so search still works in the demo. |
| **Full pgvector semantic search** (#6)           | pgvector with cosine similarity is the right long-term choice. For <50 items, brute-force similarity in application code would also work.                                                                                                 | Keep pgvector -- it demonstrates ML sophistication for the course and is not harder than building an in-memory search.                                 |

---

## 4. Requirements Breakdown by Priority

### P0 -- Demo Dies Without It

| ID    | Requirement             | Input                           | Output                                                          | Business Logic                                                                               | Edge Cases                                                   | Complexity |
| ----- | ----------------------- | ------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| P0-01 | Project scaffold + auth | Email                           | Authenticated session                                           | Supabase email auth, session management                                                      | Invalid email, expired session                               | Low        |
| P0-02 | Data model              | Schema definition               | Supabase tables + types                                         | users, wardrobe_items, outfits tables                                                        | Missing fields, type mismatches                              | Low        |
| P0-03 | Camera / image upload   | Camera capture or gallery pick  | Image URL in Supabase storage                                   | Expo ImagePicker -> Supabase storage upload                                                  | Camera denied, large file, no network                        | Medium     |
| P0-04 | Auto-tagging pipeline   | Image URL                       | Structured tags (category, color, pattern, occasion, formality) | Claude Vision API call with structured output prompt                                         | Unrecognizable item, API timeout, ambiguous category         | Medium     |
| P0-05 | Closet grid UI          | List of wardrobe items          | Scrollable grid with thumbnails + tags                          | React Native FlatList, Supabase query                                                        | Empty closet, image loading failure                          | Medium     |
| P0-06 | Outfit composer         | NL prompt                       | Set of 2-5 compatible items                                     | Claude decomposes prompt -> structured filter -> embedding search per slot -> compose outfit | No matching items for a slot, ambiguous prompt, empty closet | High       |
| P0-07 | Error handling pipeline | Failed stage (upload/tag/embed) | User-visible error + retry action                               | State machine with error states at each pipeline stage                                       | Network timeout, API rate limit, corrupt image               | Medium     |

### P1 -- Demo Is Weak Without It

| ID    | Requirement                     | Complexity | Notes                                                           |
| ----- | ------------------------------- | ---------- | --------------------------------------------------------------- |
| P1-01 | Tag editing UI                  | Medium     | Inline edit on closet grid item, patch Supabase row             |
| P1-02 | Upload progress states          | Low        | 3-state machine: uploading -> processing -> done                |
| P1-03 | Thumbnail generation            | Low        | Resize on upload, store alongside original                      |
| P1-04 | Item deletion                   | Low        | Swipe/long-press with confirmation                              |
| P1-05 | Empty state / onboarding        | Low        | CTA screen for empty closet                                     |
| P1-06 | Magic Bar prompt interpretation | Medium     | Claude NL -> structured filter -> tag-filtered embedding search |
| P1-07 | Item detail view                | Low        | Full image + all tags + occasion suggestions                    |

### P2 -- Impressive but Not Essential

| ID    | Requirement               | Complexity | Notes                                    |
| ----- | ------------------------- | ---------- | ---------------------------------------- |
| P2-01 | 2D avatar virtual try-on  | Very High  | Separate project. Defer to Phase 2+.     |
| P2-02 | Style clustering          | Medium     | Needs 20+ items to be meaningful. Defer. |
| P2-03 | Outfit favorites          | Low        | Save composed outfits to outfits table   |
| P2-04 | Google OAuth              | Low        | Requires app registration. Defer.        |
| P2-05 | Weather-based suggestions | Medium     | External API dependency. Defer.          |

---

## 5. Risk Register

| Risk                                                                                        | Likelihood | Impact | Level       | Mitigation                                                                                                                                            |
| ------------------------------------------------------------------------------------------- | ---------- | ------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Vision mis-tags items frequently in demo conditions (bad lighting, wrinkled clothes) | High       | High   | Critical    | Add tag editing (G4). Test tagging pipeline with 20+ real clothing photos before demo. Prepare fallback: manual tag entry if Vision fails.            |
| Outfit composer returns nonsensical combinations                                            | Medium     | High   | Major       | Constrain composer to slot-based logic (one top, one bottom, one shoes). Use tag compatibility rules (formal top does not pair with athletic shorts). |
| Hugging Face CLIP API is down during demo                                                   | Medium     | Medium | Significant | Pre-compute embeddings for demo items. Cache results. Add deterministic tag-hash fallback.                                                            |
| Supabase free tier limits hit during demo (storage, DB rows, bandwidth)                     | Low        | High   | Significant | Pre-load demo closet with items. Monitor quota before demo day. Have backup Supabase project ready.                                                   |
| Google OAuth review not completed in time                                                   | High       | Low    | Significant | Defer Google OAuth to P2. Use email-only auth.                                                                                                        |
| Demo phone camera produces unusable photos                                                  | Medium     | Medium | Significant | Allow gallery upload as fallback. Pre-seed demo closet with good photos.                                                                              |

---

## 6. Architecture Decision: Outfit Composition Approach

**ADR-001: Slot-Based Outfit Composition via Claude Decomposition**

### Status: Proposed

### Context

The Magic Bar accepts NL prompts like "outfit for a rainy Diwali dinner." Phase 1 scope says "basic semantic search" which returns individual items. The demo needs to return outfit compositions (multiple items that work together).

### Decision

Two-pass outfit composition:

1. **Decomposition pass**: Send the user prompt to Claude with a system prompt that extracts structured intent: `{occasion, formality, weather, color_preferences, required_slots: [top, bottom, shoes, accessory]}`.
2. **Retrieval pass**: For each slot, query the user's closet using tag filtering (occasion match, formality match) combined with cosine similarity on CLIP embeddings to rank results within the filtered set. Return the top match per slot.
3. **Composition**: Present the set of items as an outfit card with the prompt as the title.

### Why Not Pure Embedding Search

Cosine similarity on CLIP embeddings captures visual similarity but not compositional logic. A prompt like "rainy Diwali dinner" has cultural and situational semantics that CLIP embeddings alone will miss. Tag-based filtering captures the structured attributes; embeddings rank within the filtered set.

### Why Not Let Claude Pick from All Items

Sending all item descriptions to Claude and asking it to compose an outfit is simpler but: (a) token cost scales linearly with closet size, (b) Claude cannot assess visual compatibility without the images, (c) it bypasses the ML/embedding work that the course evaluates. The two-pass approach demonstrates both LLM reasoning and embedding-based retrieval.

### Consequences

- Positive: Demonstrates both LLM and ML capabilities, which is the course objective.
- Positive: Scales to larger closets because tag filtering reduces the candidate set before embedding search.
- Negative: Requires well-structured tags from the auto-tagging pipeline. Bad tags cascade into bad outfits.
- Negative: Slot-based composition is rigid (always top+bottom+shoes). Cannot suggest "just a dress" or "layered look" without additional logic.

---

## 7. Data Model Proposal

```sql
-- Core entities for Phase 1

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE wardrobe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  tags JSONB NOT NULL DEFAULT '{}',
  -- tags structure: {
  --   "category": "shirt",
  --   "color": "navy blue",
  --   "pattern": "solid",
  --   "occasion": ["casual", "business casual"],
  --   "formality": 3,          -- 1-5 scale
  --   "season": ["fall", "winter"],
  --   "domant_colors": ["navy", "white"]
  -- }
  embedding vector(512),  -- CLIP ViT-B/32 dimension
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,                     -- from the prompt that generated it
  prompt TEXT,                   -- original NL prompt
  item_ids UUID[] NOT NULL,      -- ordered array of wardrobe_item IDs
  occasion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wardrobe_items_user ON wardrobe_items(user_id);
CREATE INDEX idx_outfits_user ON outfits(user_id);

-- pgvector similarity index (IVFFlat for small-medium datasets)
CREATE INDEX idx_wardrobe_items_embedding ON wardrobe_items
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Key design decisions:**

- `tags` as JSONB, not separate columns: flexible schema that accommodates varying tag sets without migrations.
- `embedding` as nullable: items may exist without embeddings during processing or if CLIP fails.
- `outfits.item_ids` as UUID array, not join table: for Phase 1, the array is simpler. Migrate to join table if many-to-many relationships are needed in Phase 2.
- `formality` as integer 1-5: enables range queries ("formality >= 3") for outfit composition.

---

## 8. Cross-Reference Audit

**Source document:** `workspaces/prompt-closet/briefs/01-product-brief.md`

**Inconsistencies found:**

1. **Magic Bar scope mismatch**: Brief line 9 says "natural language Magic Bar lets users prompt their way to outfit suggestions." Phase 1 item 6 says "basic semantic search." These are different features. Semantic search finds similar items; the Magic Bar implies outfit composition. Resolution: the Magic Bar must compose outfits, not just search items.

2. **Tech stack lists "claude-sonnet-4-20250514"**: This is a specific model version. If the demo runs after this model is deprecated or renamed, the hardcoded reference will break. Recommend loading from environment variable, consistent with `rules/env-models.md`.

3. **Phase 1 item 3 lists "occasion" as a tag but item 6 says "basic semantic search"**: Occasion is a structured attribute, not a visual one. CLIP embeddings do not encode occasion semantics well. The auto-tagging pipeline must extract occasion via Claude, not rely on embeddings for occasion matching.

---

## 9. Implementation Roadmap

### Phase 1a -- Foundation (1 session)

- P0-01: Project scaffold + Supabase email auth
- P0-02: Data model (run migrations)
- P1-05: Empty state / onboarding screen

### Phase 1b -- Ingestion Pipeline (1 session)

- P0-03: Camera / image upload flow
- P0-04: Auto-tagging pipeline (Claude Vision)
- P0-05: Closet grid UI (basic, no editing)
- P1-03: Thumbnail generation
- P1-02: Upload progress states

### Phase 1c -- Retrieval + Composition (1 session)

- CLIP embedding generation + pgvector storage
- P1-06: Magic Bar prompt interpretation
- P0-06: Outfit composer (slot-based)
- Outfit display UI

### Phase 1d -- Polish (0.5 session)

- P0-07: Error handling pipeline
- P1-01: Tag editing UI
- P1-04: Item deletion
- P1-07: Item detail view
- Demo rehearsal with real photos

---

## 10. Success Criteria

- [ ] User can sign up with email and see an empty closet with onboarding CTA
- [ ] User can photograph or upload a clothing item and see it appear in the closet grid within 10 seconds, with correct tags
- [ ] Tags are correct for 80%+ of items in typical home lighting conditions
- [ ] User can correct a wrong tag by tapping it
- [ ] User can type "outfit for a casual Friday" in the Magic Bar and receive a composed set of 2-4 items from their closet
- [ ] Outfit compositions are plausible (no formal suit jacket paired with gym shorts)
- [ ] Failed uploads show an error message with a retry action, not a silent failure
- [ ] Demo runs with 10 pre-loaded items without network issues (images cached, embeddings pre-computed)
- [ ] No hardcoded model strings -- all LLM/Vision model names from environment variables
