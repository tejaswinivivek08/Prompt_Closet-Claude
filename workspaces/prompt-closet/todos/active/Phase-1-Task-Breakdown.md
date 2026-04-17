# Phase 1 Task Breakdown — Prompt Closet

**Generated:** 2026-04-17
**Tech stack:** React Native (Expo) + Supabase + Claude Vision API + CLIP embeddings
**Spec authority:** `specs/` (all spec files at project root)

---

## DECISIONS — READ BEFORE STARTING

### D1: Google OAuth in Phase 1?

Your brief includes "email + Google OAuth" in Phase 1. The `specs/auth.md` defers Google OAuth to Phase 2 because:

- Apple Developer account required for iOS OAuth
- Google Cloud Console app registration required
- OAuth consent screen review takes **2-4 business days** (not same-day)

**Options:**

- **(A) Include in Phase 1** — Start registration NOW. Email magic link ships on Day 1. Google OAuth ships when registration completes (Day 3-5).
- **(B) Email-only for Phase 1** — Ship email magic link first. Add Google OAuth as Phase 1.1 after registration completes.

**Recommendation:** Option B. Ship email auth first; don't block demo on OAuth registration.

---

### D2: Formality Scale: 1-5 (canonical) or 1-10 (UX slider)?

Three specs use 1-5 (data-model.md, auto-tagging.md, embeddings.md). Two UX specs use 1-10 slider (closet-ui.md, magic-bar.md). This is a **silent data loss bug** at the most visible user interaction point.

**Recommendation:** Use 1-5 canonical scale. Update UX specs to match. 5-step slider is still usable with visual tick marks at each step.

---

### D3: Voice Input Deferral

Magic Bar spec includes voice input. The `expo-speech` module has limited STT capability on both iOS and Android. Voice input is deferred to Phase 1.1 for the demo. Text-only Magic Bar ships in Phase 1.

---

## GROUP 0: Foundation (Tasks 1–2)

> ⚠️ Complete these before any other implementation work.

| #   | Task                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Complexity | Dependencies |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------ |
| 1   | **Scaffold Expo project** — `npx create-expo-app PromptCloset`, install deps (`@react-navigation/native`, `@react-navigation/bottom-tabs`, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `expo-image-picker`, `expo-image-manipulator`, `expo-secure-store`, `expo-speech`), configure `.env` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLAUDE_API_KEY`, `HF_API_TOKEN`. Run `expo prebuild` to generate native dirs. Verify `eas build` compiles.             | M          | None         |
| 2   | **Enable pgvector + create schema** — Run `CREATE EXTENSION IF NOT EXISTS vector;` in Supabase SQL Editor. Create `profiles`, `clothing_items` (with `vector(512)` column for CLIP embeddings), `outfits` tables. Add all indexes. Create RLS policies. Create Storage bucket `closet-images` with INSERT/SELECT/DELETE policies scoped to `auth.uid()`. Verify with SQL: can INSERT as authed user, SELECT only own rows, User B cannot access User A's files. | M          | Task 1       |

---

## GROUP 1: Authentication (Tasks 3–4)

| #   | Task                                                                                                                                                                                                                                                                                        | Complexity | Dependencies |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------ |
| 3   | **Email magic link auth** — Sign-up screen → Supabase `signInWithOtp()`. Magic link email handling via Expo `Linking`. Session persisted in `expo-secure-store`. `onAuthStateChange` listener updates UI. Protected routes redirect to login when unauthenticated. Sign-out clears session. | M          | Tasks 1, 2   |
| 4   | **Google OAuth** _(see Decision D1 above)_ — Requires Apple Developer + Google Cloud registration. Only attempt if registration completed with buffer before demo. If deferred: add to Phase 1.1.                                                                                           | M          | Task 3       |

---

## GROUP 2: Image Pipeline (Tasks 5–6)

| #   | Task                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Complexity | Dependencies |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------ |
| 5   | **Camera + gallery upload** — Camera tab viewfinder (Expo `ImagePicker`). Gallery picker (multi-select up to 10). HEIC → JPEG conversion (use `expo-image-manipulator` with `format: 'jpeg'`). Client-side compression: 1024×1024 @ quality 0.7 → ~300KB. Thumbnail: 200×200 @ quality 0.5 → ~50KB. Upload to `closet-images/{user_id}/{uuid}.jpeg` via Supabase Storage API (FormData with URI field, NOT Blob). Show per-item progress: uploading → tagging → done. On failure: retry button. **Validation**: reject files >10MB or non-JPEG/PNG/HEIC before compression with user-facing error. | L          | Tasks 1, 2   |
| 6   | **Insert clothing_items row** — After upload: INSERT with `image_url`, `thumbnail_url`, `image_storage_path`, `user_id`, `tag_status='pending'`, `embedding_status='pending'`. Parallel-trigger both AI pipelines.                                                                                                                                                                                                                                                                                                                                                                                 | S          | Task 5       |
| 23  | **Cascade deletion trigger** — Postgres trigger: when `clothing_items` row is deleted, remove its UUID from all `outfits.item_ids` arrays. Create function `fn_delete_clothing_item_cleanup()`. Verify: after deleting a clothing_item, `outfits.item_ids` contains no dangling UUID references.                                                                                                                                                                                                                                                                                                   | S          | Task 2       |

---

## GROUP 3: AI Tagging + Embeddings (Tasks 7–8)

> ⚠️ Run these in parallel (not sequential). Total latency: max(tagging, embedding), not sum.

| #   | Task                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Complexity | Dependencies |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------ |
| 7   | **Claude Vision auto-tagging** — After upload: call Claude Vision with structured JSON prompt. Parse response. Validate schema: `category ∈ [top, bottom, dress, outerwear, footwear, accessory]`, `color` (string), `pattern ∈ [solid, striped, plaid, floral, geometric, abstract, paisley, polka-dot]`, `occasion ∈ [casual, business, formal, party, athletic]`, `formality_score ∈ [1-5]`. On JSON parse failure: retry with stricter prompt (max 2). On exhausted retries: fallback `{category: "uncategorized", color: "unknown", pattern: "unknown", occasion: "casual", formality_score: 3}`. Update `clothing_items.tag_status`: pending → processing → done (or failed). | M          | Task 6       |
| 8   | **CLIP embedding + pgvector** — After upload: call Hugging Face Inference API with `sentence-transformers/clip-ViT-B-32`. Receive 512-dim float vector. Store in `clothing_items.embedding` (vector(512)). Handle 429 (wait 60s, retry, max 3). Handle timeout (embedding_status → 'failed'). Update `embedding_status`: pending → processing → done. Parallel with Task 7.                                                                                                                                                                                                                                                                                                         | M          | Task 6       |

---

## GROUP 4: Closet UI (Tasks 9–12)

| #   | Task                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Complexity | Dependencies |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------ |
| 9   | **Closet grid screen** — 3-column FlatList, square cells ~120px, 4px gap. Item card: thumbnail + primary label (color + category). Tap → reveal all tags (150ms fade-in). Long-press (300ms) → Edit/Delete overlay + haptic. Sticky filter bar: category pills, color swatches, occasion dropdown, formality slider 1–5, pattern dropdown. Sort: Recently added / Color grouped / Category grouped. Pull-to-refresh. Empty state: illustration + "Add your first item" CTA. | M          | Tasks 1, 2   |
| 10  | **Tag editing UI** — Edit screen from long-press → shows current AI tags. All fields editable inline. Category (dropdown), color (text), pattern (dropdown), occasion (multi-select), formality_score (slider 1–5). Save → PATCH Supabase row.                                                                                                                                                                                                                              | S          | Task 9       |
| 11  | **Item deletion** — Long-press → Delete → confirmation dialog. On confirm: DELETE from `clothing_items` + DELETE storage files (image + thumbnail). Undo Snackbar for 5 seconds. **Cascade deletion**: via Postgres trigger — when clothing_item is deleted, remove its UUID from all `outfits.item_ids` arrays. Verify: after deletion, `outfits.item_ids` contains no dangling UUID references.                                                                           | S          | Task 9       |
| 12  | **Tab navigation scaffold** — React Navigation bottom tabs: Closet, Style, Camera (prominent center), Search, Profile. Camera tab opens ImagePicker. Stack navigators per tab for sub-screens. Magic Bar rail rendered ABOVE tab bar (not inside tab content).                                                                                                                                                                                                              | M          | Task 1       |

---

## GROUP 5: Semantic Search (Tasks 13–14)

| #   | Task                                                                                                                                                                                                                                                                                                                                | Complexity | Dependencies |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------ |
| 13  | **Semantic search** — Search bar in Closet tab. User types → CLIP text encoder via HF API → 512-dim query vector. pgvector: `SELECT ... ORDER BY embedding <=> $1 LIMIT 20`. Results as closet grid with relevance order. "Back to all" returns to full filtered grid. Items without embeddings excluded. Target: <2s for 50 items. | M          | Tasks 8, 9   |
| 14  | **Wiring verification** — Audit all screens. Replace every instance of: mock data, hardcoded arrays, `TODO` stubs, service-key queries. Every data fetch must use `auth.uid()` scope. Zero mock data in production builds.                                                                                                          | M          | Tasks 3–13   |

---

## GROUP 6: Onboarding + Polish (Tasks 15–17)

| #   | Task                                                                                                                                                                                                                                                                                                                                                                                                     | Complexity | Dependencies |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------ |
| 15  | **Onboarding + empty state** — 3-slide intro: value prop → how it works → get started. Camera/photos permission request on first CTA. Camera tab permission check with link to Settings. Empty closet: illustration + CTA + value loop.                                                                                                                                                                  | S          | Task 12      |
| 16  | **Tag Review screen** — Post-capture: display photo + AI tags inline. Edit tags before save. **Batch**: grid of thumbnails, tap each to edit tags. Both post-capture flow AND closet long-press Edit route to the same screen (same component, two navigation entry points). Save → closet grid.                                                                                                         | S          | Tasks 5, 10  |
| 17  | **Demo pre-seed data** — Script uploads 15 pre-photographed items. All: `tag_status='done'`, `embedding_status='done'`, **real 512-dim CLIP vectors** (call HF API for each image, not stubs). Verify: `SELECT COUNT(*) = 15 WHERE embedding_status = 'done' AND embedding IS NOT NULL` — must return 15. Idempotent — re-runnable to reset. **All formality values must be 1–5** (DB CHECK constraint). | M          | Tasks 7, 8   |

---

## GROUP 7: Build + Demo-Day (Tasks 18–19)

| #   | Task                                                                                                                                                                                                                  | Complexity | Dependencies |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------ |
| 18  | **EAS builds** — `eas.json` for both platforms. iOS: TestFlight build (requires Apple Developer). Android: APK. Physical device test — not simulator. Pre-seed data loads on device. Semantic search works on device. | L          | All above    |
| 19  | **Demo-day checklist + backup** — T-2hr checklist: install → verify pre-seed → live upload test → semantic search test → WiFi check. 2-min screen recording as fallback. Local Supabase hot-standby configured.       | S          | Tasks 17, 18 |

---

## PHASE 1.1: Magic Bar / Outfit Composition (Deferred)

> ⚠️ Not in core Phase 1 scope. **This is the product's hero feature and demo's key moment.** Without it, Phase 1 is just a searchable photo album.

| #   | Task                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Complexity | Dependencies                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------- |
| 21  | **Magic Bar NL → outfit composition** — Two-pass: (1) Claude interprets NL → structured intent + slot definitions; (2) per-slot: tag-filtered pgvector search → top match. Claude generates reasoning paragraph. Outfit card: 2–5 item thumbnails + reasoning + Save/Shuffle/Try Another. Stream of Thought: "Checking 18 items → Matching → Assembling". Follow-up refinement: swap only changed slot. Voice UI button hidden in Phase 1 (non-functional). | L          | Tasks 13, 2 (outfits table) |
| 22  | **Suggestion chip engine** — Tiers 1+3 (time-based + seasonal chips) implemented. Tier 2 (closet-aware) as placeholder. Max 4 chips visible. Tap → pre-fill input (no auto-submit).                                                                                                                                                                                                                                                                         | S          | Task 21                     |
| 24  | **Offline state + network error handling** — NetInfo listener on all screens. Upload queue: if offline, queue uploads locally (AsyncStorage). On reconnect: process queue sequentially. Tagging/embedding failures: show inline error with retry. Semantic search timeout: show "search unavailable" state.                                                                                                                                                 | S          | Tasks 5, 7, 8, 13           |
| 25  | **Style tab** — Saved outfits from outfits table (auth.uid scope). Outfit cards with thumbnails + reasoning. Delete outfit. Style DNA visualization (color palette, category distribution, formality range) visible after 5+ items.                                                                                                                                                                                                                         | M          | Task 21                     |
| 26  | **Update UX specs for formality scale** — Update `specs/closet-ui.md` and `specs/magic-bar.md`: replace 1–10 slider with 5-step segmented control with labeled ticks: [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ] — Casual / Biz / Semi / Dress / Gala. Canonical 1–5 matches DB CHECK constraint.                                                                                                                                                                        | S          | Task 1 (specs exist)        |

---

## Dependency Order (Critical Path)

```
Task 1 (Expo scaffold)
  └─ Task 2 (pgvector + schema + Storage RLS)
       ├─ Task 23 (cascade deletion trigger)
       ├─ Task 3 (email auth)
       │    └─ Task 4 (Google OAuth — defer if no registration)
       ├─ Task 5 (camera + upload)
       │    └─ Task 6 (insert row)
       │         ├─ Task 7 (Claude Vision — parallel with 8)
       │         └─ Task 8 (CLIP embedding — parallel with 7)
       │              └─ Task 13 (semantic search)
       │                   └─ Task 14 (wiring verification)
       ├─ Task 12 (tab navigation)
       │    ├─ Task 9 (closet grid)
       │    │    ├─ Task 10 (tag editing)
       │    │    └─ Task 11 (item deletion)
       │    ├─ Task 15 (onboarding)
       │    └─ Task 16 (Tag Review screen)
       ├─ Task 17 (pre-seed data)
       │    └─ Tasks 18 + 19 (build + demo-day)
       └─ Task 26 (update UX specs for formality)
            └─ [Phase 1.1] Tasks 21, 22, 24, 25 (Magic Bar + chips + offline + Style tab)
```

---

## Sharding Note

Each task above is sized to fit a single autonomous session (≤500 LOC load-bearing logic, ≤5–10 invariants, ≤3–4 call-graph hops). No task should exceed one session to implement. Larger tasks are explicitly marked L and should be completed in one session by one agent.

## Formal Scope vs Extended Scope

| In Your Phase 1 Scope                         | Status                                 |
| --------------------------------------------- | -------------------------------------- |
| Project scaffold + Supabase auth (email only) | Tasks 1–4                              |
| Camera/image upload flow                      | Tasks 5–6                              |
| Auto-tagging pipeline (Claude Vision)         | Task 7                                 |
| CLIP embedding generation + pgvector          | Task 8                                 |
| Closet grid UI with tags                      | Tasks 9–12                             |
| Basic semantic search                         | Tasks 13–14                            |
| Cascade deletion trigger                      | Task 23                                |
| **Magic Bar NL outfit suggestions**           | **Not in scope** → Task 21 (Phase 1.1) |
| Suggestion chips, offline handling, Style tab | Tasks 22, 24, 25 (Phase 1.1)           |

---

## Flags for Your Attention

| Flag               | Issue                                     | Action Needed                          |
| ------------------ | ----------------------------------------- | -------------------------------------- |
| ⚠️ Google OAuth    | Requires 2-4 day registration             | Decide: include (start NOW) or defer   |
| ⚠️ Formality scale | 1-5 (DB) vs 1-10 (UX slider)              | Confirm: 1-5 canonical, update UX      |
| ⚠️ Voice input     | No STT API in stack                       | Defer to Phase 1.1 (text-only in demo) |
| ⚠️ Demo story arc  | Feature tour opening vs Magic Bar opening | Rehearse demo: open on Magic Bar query |
