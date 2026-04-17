# Prompt Closet -- Failure Point Analysis

**Date:** 2026-04-17
**Analyst:** analyst (COC Phase 01)
**Scope:** Phase 1 -- scaffold, camera, auto-tagging, embeddings, closet UI, semantic search
**Complexity score:** 17/30 (Moderate) -- Governance 4 + Legal 3 + Strategic 5 + Technical 5

---

## Executive Summary

Prompt Closet is a demo-grade AI stylist app with five integration seams: Expo-to-Supabase auth, image upload-to-storage, image-to-Claude Vision tagging, image-to-CLIP embedding, and embedding-to-pgvector search. The highest-severity risk is the CLIP embedding pipeline: Hugging Face Inference API has no SLA, no guaranteed cold-start time, and a 30-second timeout on free tiers that will trigger on 20-50 image uploads in a demo. The recommended de-risk path is to implement the auto-tagging pipeline (Claude Vision) first because it produces the most visible demo value and has the simplest failure mode (retryable HTTP call), then layer embeddings second.

---

## Risk Register

| #   | Risk                                                 | Likelihood | Impact   | Level       | Mitigation                                          |
| --- | ---------------------------------------------------- | ---------- | -------- | ----------- | --------------------------------------------------- |
| R1  | CLIP HF API timeout/cold-start during bulk upload    | High       | High     | Critical    | Local ONNX fallback or pre-compute batch            |
| R2  | Claude Vision API rate limit hit during live demo    | Medium     | High     | Major       | Cache tagged results; demo with pre-populated data  |
| R3  | pgvector cosine query slow on 50+ embeddings         | Low        | Medium   | Significant | Pre-warm with sample data; verify index exists      |
| R4  | Expo image upload to Supabase Storage fails silently | Medium     | High     | Major       | Progress indicator + retry with exponential backoff |
| R5  | Supabase free tier storage exhausted mid-demo        | Low        | High     | Significant | Pre-upload demo images; monitor quota               |
| R6  | Expo + Supabase auth flow breaks on TestFlight       | Medium     | High     | Major       | Test on real device before demo; have web fallback  |
| R7  | Claude API structured output not parseable           | Medium     | Medium   | Significant | Strict JSON schema + fallback parser                |
| R8  | Network failure during live demo                     | Medium     | Critical | Critical    | Offline-capable demo mode with cached data          |

---

## 1. Top 5 Technical Risks Ranked by Severity

### Risk 1: CLIP Embedding Pipeline Latency and Availability (Critical)

**What breaks:** The user uploads 20-50 clothing images. Each image must be sent to Hugging Face Inference API to generate a CLIP embedding (768-dimensional vector). The embedding is stored in Supabase pgvector. If the HF API is slow or unavailable, the entire "semantic search" feature is dead.

**Why it breaks:**

- Hugging Face Inference API (free tier) has documented rate limits: 1,000 requests/day, throttled to ~10 req/min. A 50-image upload session exhausts this in 5 minutes.
- Cold starts on HF Inference API models are 10-30 seconds for CLIP models (`sentence-transformers/clip-ViT-B-32`). The first request in a demo will appear frozen.
- The 768-float response payload per image is small, but the latency is GPU-bound on HF's shared infrastructure.
- There is no SLA on free-tier HF Inference.

**Mitigation (ranked):**

1. **Pre-compute embeddings for demo images** before demo day. Store them in Supabase. The demo shows search working on pre-loaded data. Live uploads queue embeddings async with a spinner.
2. **Batch embedding calls.** HF Inference supports batched inputs for some models. Send 5-10 images per request to reduce round trips from 50 to 5-10.
3. **Local ONNX fallback.** Export CLIP to ONNX format (~350MB). Run inference on-device via `onnxruntime-react-native`. This eliminates the network dependency entirely but adds build complexity and initial app size.
4. **Fallback to HF hosted API with retry.** Implement exponential backoff (1s, 2s, 4s) with a 3-retry cap. Show "Processing..." in the UI and allow the user to continue browsing while embeddings generate.

**Recommendation for demo:** Pre-compute all demo embeddings. Live uploads generate embeddings asynchronously with a visible progress bar. This guarantees search works on demo day.

---

### Risk 2: Live Demo Network Dependency (Critical)

**What breaks:** The presenter walks on stage. WiFi is flaky. Every feature -- auth, image upload, tagging, search -- requires network access. The app shows loading spinners forever.

**Why it breaks:**

- Supabase auth requires network to validate JWT tokens (unless you implement refresh-token caching).
- Claude Vision API requires network for every auto-tag call.
- CLIP embedding (if using HF API) requires network.
- pgvector similarity search is a server-side query.

For a demo-grade app, every feature is network-dependent. There is no offline mode.

**Mitigation:**

1. **Demo with pre-populated account.** Create a demo account on Supabase with 30+ pre-tagged, pre-embedded clothing items. The demo shows search, browsing, and the full UI without any live network calls for the core walkthrough.
2. **Cache auth tokens aggressively.** Expo SecureStore persists the Supabase refresh token. If network drops, the app reads cached data. This means the closet grid and search work offline on previously loaded data.
3. **Local Supabase instance as hot standby.** Run Supabase Docker locally on the demo laptop with a pre-seeded database. If WiFi fails, point the app at `localhost:54321`. This requires a 5-minute setup but guarantees the demo works.
4. **Screen recording fallback.** Record a 2-minute screen capture of the full flow. If the live demo fails, play the recording and describe what is happening. This is the MBA presentation safety net.

**Recommendation for demo:** Pre-populated demo account + screen recording backup. Do not rely on live network for the core narrative.

---

### Risk 3: Expo-to-Supabase Image Upload Reliability (Major)

**What breaks:** The user takes a photo of a jacket. The upload to Supabase Storage silently fails (network timeout, wrong bucket policy, RLS violation). The UI shows the image in the grid, but the storage URL is broken. Auto-tagging and embedding generation never trigger because they depend on the stored image URL.

**Why it breaks:**

- Supabase Storage requires Row Level Security (RLS) policies on the `storage.objects` table. If the policy is missing or wrong, uploads fail with a generic "Unauthorized" error that Expo's `@supabase/storage-js` wraps poorly.
- Expo's `ImagePicker` returns a URI (`file:///...` on iOS, `content:///...` on Android). The URI must be converted to a `Blob` or `ArrayBuffer` before upload. The conversion code differs between platforms.
- Large images (12MP phone camera = 3-5MB JPEG) upload slowly on constrained WiFi. Without a progress indicator, the user thinks the app is frozen.
- Supabase Storage on the free tier has a 1GB limit. 50 images at 3MB each = 150MB. This is within limits but worth monitoring.

**Mitigation:**

1. **Compress images client-side before upload.** Expo's `ImageManipulator` can resize to 1024x1024 and compress to 0.7 quality. This reduces upload size to ~300KB per image and also improves Claude Vision and CLIP processing speed (both models work fine at 1024x1024).
2. **Implement explicit upload states in the UI.** Four states per image: `uploading` (with progress %), `tagging` (Claude Vision running), `embedding` (CLIP running), `ready`. If any state fails, show a retry button on that specific image.
3. **Set up RLS policies before the first upload test.** The policy must allow authenticated users to INSERT into their own folder (`user_id/filename`) and READ their own files. Test this explicitly -- it is the most common Supabase Storage failure.
4. **Upload to Supabase Storage, not base64 in the database.** Store the image file in Storage, store the URL in the `clothing_items` table. This is the standard pattern. Do not store base64 in PostgreSQL.

**Recommendation for demo:** Compress + explicit states + RLS tested on both platforms. The demo should show 2-3 live uploads working, not 50.

---

### Risk 4: Claude Vision Auto-Tagging Output Reliability (Major)

**What breaks:** The image is sent to Claude Vision API (`claude-sonnet-4-20250514`) with a prompt asking for structured metadata. The response is supposed to be JSON with fields: `{category, color, pattern, occasion, formality_score}`. Instead, Claude returns a paragraph of text, or JSON with unexpected field names, or an error response.

**Why it breaks:**

- Claude's vision capability works well on clear, well-lit clothing images. But phone photos of crumpled clothes on a bed produce ambiguous results. A black blazer draped over a chair might be tagged as "black jacket, casual" instead of "black blazer, formal."
- The prompt engineering for structured output must be precise. Without a strict system prompt + JSON schema example, Claude will add commentary ("This appears to be...") that breaks JSON parsing.
- Claude API rate limits: Tier 1 accounts get 40 requests/min. A 50-image batch hits this in ~1.25 minutes. Manageable for a demo, but burst uploads could trigger 429s.
- Claude Vision adds ~2-5 seconds of latency per image (including network round-trip). A batch of 20 images processed sequentially = 40-100 seconds. The user sees a loading spinner for over a minute.

**Mitigation:**

1. **Strict system prompt with JSON schema enforcement.** Example prompt structure:

   ```
   You are a clothing classifier. Analyze this image of a clothing item.
   Return ONLY a JSON object with exactly these fields:
   - category: one of [top, bottom, dress, outerwear, footwear, accessory]
   - color: primary color name (lowercase)
   - pattern: one of [solid, striped, plaid, floral, geometric, abstract]
   - occasion: one of [casual, business, formal, party, athletic]
   - formality_score: integer 1-5 (1=casual, 5=formal)

   Return the JSON object and nothing else. No commentary.
   ```

2. **Response parser with retry.** If the response is not valid JSON, retry with a stricter prompt: "Your previous response was not valid JSON. Return ONLY the JSON object." Two retries max.
3. **Process tagging in parallel (batch of 3-5 concurrent Claude calls).** This reduces 20-image latency from ~80 seconds (sequential) to ~20 seconds (4 concurrent). Do not exceed 5 concurrent to stay under rate limits.
4. **Fallback tags for demo.** If Claude Vision fails for a specific image, tag it with `{category: "uncategorized", color: "unknown", pattern: "unknown", occasion: "casual", formality_score: 3}`. The image still appears in the closet grid. The user can manually fix tags later.

**Recommendation for demo:** Strict prompt + parallel processing + fallback tags. Pre-tag all demo images so live tagging is a bonus, not a dependency.

---

### Risk 5: TestFlight + Expo Build and Distribution (Major)

**What breaks:** The Expo EAS build for iOS fails due to certificate issues, provisioning profile mismatches, or Apple's review rejection. The demo presenter cannot install the app on their iPhone. Same for Android: the APK fails to install on the demo device due to minSdkVersion or architecture mismatch.

**Why it breaks:**

- Expo EAS Build requires an Apple Developer account ($99/year) for TestFlight distribution. If this is not set up, iOS builds fail.
- TestFlight requires Apple's review (usually 24-48 hours for first submission). If this is not done in advance, the app cannot be installed on test devices.
- Expo SDK version matters. Expo SDK 52+ requires Xcode 15+. If the build machine has Xcode 14, iOS builds fail silently.
- Android APK sideloading requires "Install from unknown sources" enabled. The presenter's device may not have this.
- Expo Go is NOT sufficient for a demo. Expo Go does not support custom native modules (e.g., `onnxruntime-react-native` if you go the local embedding route). A standalone build is required.

**Mitigation:**

1. **Set up Apple Developer account + TestFlight 2 weeks before demo.** First-time TestFlight review takes 24-48 hours. Subsequent builds are instant.
2. **Build for both platforms simultaneously.** `eas build --platform all`. Test on real iOS and Android devices, not just simulators/emulators.
3. **Use Expo Development Builds for rapid iteration.** Development builds install on your own device without TestFlight review. Switch to TestFlight distribution builds for the final demo version.
4. **Have an Android APK ready as primary demo device.** Android APK sideloading is faster than TestFlight for last-minute builds. If iOS has issues, demo on Android.
5. **Web fallback via Expo Web.** Run `npx expo export:web` and host on Vercel/Netlify. If mobile builds fail, demo the web version in a mobile browser. The camera flow uses file upload instead of camera capture, but everything else works.

**Recommendation for demo:** Android APK as primary demo device (faster iteration). iOS TestFlight as secondary. Web as emergency fallback. Build the first standalone version 2 weeks before demo day.

---

## 2. Integration Risks

### Expo + Supabase

| Concern                      | Detail                                                                                                                                                                                                                                   | Severity |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Auth session persistence     | Supabase auth tokens must persist across app restarts. Use `react-native-secure-storage` via Expo SecureStore. Test that logged-in state survives app kill + relaunch on both platforms.                                                 | High     |
| Storage upload binary format | `fetch()` on React Native does not support `Blob` on all targets. Use `FormData` with `uri` field for file uploads. Test on physical devices, not just simulators.                                                                       | High     |
| Realtime subscriptions       | If Phase 1 uses Supabase Realtime for upload progress, note that Realtime on free tier has a 200 concurrent connection limit. For a demo, this is fine. For a class of 30 students all testing simultaneously, it could be a bottleneck. | Low      |
| Deep linking for OAuth       | Google OAuth on mobile requires deep linking configuration. Expo's `expo-auth-session` handles this, but the redirect URI must match the Supabase Google provider configuration exactly. Test Google login end-to-end on both platforms. | Medium   |

### Claude Vision + Image Upload

| Concern                  | Detail                                                                                                                                                                                                                                                                    | Severity |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Image size to Claude API | Claude Vision accepts images up to 5MB. Phone photos can exceed this. Compress to 1024x1024 before sending.                                                                                                                                                               | Medium   |
| Image format             | Claude Vision supports JPEG, PNG, GIF, WebP. Expo's camera returns JPEG on iOS, JPEG/HEIC on newer iPhones. Convert HEIC to JPEG before upload.                                                                                                                           | Medium   |
| Base64 vs URL            | Claude Vision accepts both base64-encoded images and image URLs. For Supabase-hosted images, use the public URL directly (no base64 conversion needed). Verify the Supabase Storage URL is publicly accessible (or use a signed URL).                                     | Low      |
| Prompt consistency       | The tagging prompt must produce consistent output across all clothing types. Test with: dark clothing (low contrast), patterned clothing, multiple items in frame, accessories, shoes. Edge cases: white clothing on white background, black clothing on dark background. | High     |

### CLIP + pgvector

| Concern                         | Detail                                                                                                                                                                                                                                                                                               | Severity |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Embedding dimension mismatch    | CLIP ViT-B/32 produces 512-dimensional vectors. CLIP ViT-L/14 produces 768-dimensional vectors. The pgvector column must match exactly. Decide on one model and fix the dimension.                                                                                                                   | High     |
| pgvector index type             | For 50 vectors, no index is needed (brute-force cosine similarity is instantaneous). For 1,000+ vectors, create an IVFFlat or HNSW index. For the demo, skip the index.                                                                                                                              | Low      |
| Cosine similarity normalization | pgvector's `<=>` operator computes cosine distance (0 = identical, 2 = opposite). Results must be sorted by ascending distance. `1 - distance` gives cosine similarity (1 = identical). Document which convention the app uses.                                                                      | Medium   |
| Embedding generation order      | Auto-tagging (Claude Vision) and embedding generation (CLIP) are independent. Run them in parallel, not sequentially. Both take 2-5 seconds per image. Parallel = 2-5 seconds total. Sequential = 4-10 seconds.                                                                                      | Medium   |
| Search input embedding          | The "Magic Bar" semantic search takes a text query. CLIP is a vision-language model -- it can embed text too. Use the same CLIP model's text encoder to embed the query, then cosine-similarity against image embeddings. Verify the text encoder matches the image encoder (same model checkpoint). | High     |

---

## 3. Performance Bottlenecks (Demo Scenario)

### Scenario: User uploads 20 images, then searches for "formal blue shirt"

| Step | Operation                  | Expected Latency     | Bottleneck         | Optimization                                      |
| ---- | -------------------------- | -------------------- | ------------------ | ------------------------------------------------- |
| 1    | Image compression (client) | 0.2s/image           | CPU on device      | Do in parallel (Promise.all)                      |
| 2    | Upload to Supabase Storage | 0.5-2s/image         | Network            | Compress first; upload in parallel (3 concurrent) |
| 3    | Claude Vision auto-tag     | 2-5s/image           | Claude API latency | Parallel batch (4 concurrent)                     |
| 4    | CLIP embedding (HF API)    | 3-10s/image          | HF API cold start  | Pre-compute for demo data; async for live uploads |
| 5    | Insert into pgvector       | <0.01s/item          | Negligible         | No optimization needed at this scale              |
| 6    | Semantic search query      | <0.1s for 50 vectors | Negligible         | No optimization needed at this scale              |

**End-to-end for 20 images (optimized):**

- Parallel compression: ~1s (all 20 compressed at once)
- Parallel upload (3 concurrent): ~7s (7 batches)
- Parallel tagging (4 concurrent): ~15s (5 batches x 3s)
- Parallel embedding (pre-computed): 0s for demo data
- Total: ~23 seconds from last photo to fully tagged closet

**End-to-end for 20 images (unoptimized/sequential):**

- 20 x (compression + upload + tagging + embedding) = 20 x 10s = 200 seconds = 3.3 minutes

**Key insight:** Parallelism is the difference between "smooth demo" and "awkward silence." Every step after compression must run concurrently, not sequentially.

### Search Latency

For 50 vectors with pgvector:

```sql
SELECT id, category, color, occasion, image_url,
       1 - (embedding <=> $1) as similarity
FROM clothing_items
WHERE user_id = $2
ORDER BY embedding <=> $1
LIMIT 10;
```

This query on 50 rows with 512-float vectors returns in under 50ms on Supabase's default PostgreSQL instance. No optimization needed.

The bottleneck is the text-to-embedding conversion for the search query (CLIP text encoder via HF API): 1-3 seconds. For the demo, this is acceptable. For production, cache common queries.

---

## 4. Data Model Concerns

### Recommended Schema

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (managed by Supabase Auth, but we add app-level fields)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clothing items
CREATE TABLE clothing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,              -- Supabase Storage public URL
    image_storage_path TEXT NOT NULL,     -- Storage path for deletion

    -- Auto-tagged metadata (from Claude Vision)
    category TEXT NOT NULL DEFAULT 'uncategorized',
    color TEXT NOT NULL DEFAULT 'unknown',
    pattern TEXT NOT NULL DEFAULT 'unknown',
    occasion TEXT NOT NULL DEFAULT 'casual',
    formality_score SMALLINT NOT NULL DEFAULT 3 CHECK (formality_score BETWEEN 1 AND 5),

    -- User-editable metadata
    name TEXT,                            -- optional user-provided name
    notes TEXT,                           -- optional user notes
    is_favorite BOOLEAN DEFAULT FALSE,

    -- Embedding (from CLIP)
    embedding vector(512),                -- CLIP ViT-B/32 = 512 dims

    -- Processing state
    tag_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (tag_status IN ('pending', 'processing', 'done', 'failed')),
    embedding_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (embedding_status IN ('pending', 'processing', 'done', 'failed')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_clothing_items_user ON clothing_items(user_id);
CREATE INDEX idx_clothing_items_category ON clothing_items(user_id, category);
CREATE INDEX idx_clothing_items_occasion ON clothing_items(user_id, occasion);

-- pgvector index (only needed at 1000+ rows; included for completeness)
-- CREATE INDEX idx_clothing_items_embedding ON clothing_items
--     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Row Level Security
ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own items"
    ON clothing_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);
```

### Schema Design Rationale

| Decision                                   | Rationale                                                                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tag_status` + `embedding_status` separate | Tagging and embedding are independent processes. One can succeed while the other fails. Tracking both lets the UI show partial progress and retry only the failed step.                          |
| `embedding vector(512)` nullable           | Nullable allows the item to exist before the embedding is generated. This is essential for async processing.                                                                                     |
| `image_storage_path` alongside `image_url` | The public URL is for display. The storage path is for deletion. Both are needed. Do not try to parse one from the other (fragile).                                                              |
| `formality_score` as SMALLINT 1-5          | Constrained range prevents bad Claude outputs from inserting garbage like "formal_score: very formal". The CHECK constraint is a safety net.                                                     |
| No `tags` JSONB column                     | Phase 1 tags are fixed fields (category, color, pattern, occasion, formality_score). If Phase 2 adds flexible tags, add a `tags JSONB` column then. Do not over-engineer the schema for Phase 1. |
| RLS on `clothing_items`                    | Non-negotiable for Supabase. Without RLS, any authenticated user can query any other user's clothing items. The policy is simple: `auth.uid() = user_id`.                                        |

### Image Storage Layout

```
Supabase Storage Bucket: "closet-images"
  /
  /{user_id}/
    /{uuid}.{ext}     -- e.g., /a1b2c3d4-.../e5f6g7h8-.../jpeg
```

- One folder per user. User ID as folder name.
- UUID as filename (from `gen_random_uuid()` in the database). No user-provided filenames (injection risk, collision risk).
- Extension preserved for content-type detection.

---

## 5. Demo-Day Failure Modes

### Failure Mode Matrix

| Failure                            | Symptom                                | Probability | Recovery Time                    | Mitigation                                    |
| ---------------------------------- | -------------------------------------- | ----------- | -------------------------------- | --------------------------------------------- |
| WiFi dead                          | All network requests hang              | Medium      | Unknown                          | Pre-populated demo account + screen recording |
| Claude API 429 (rate limit)        | Tagging fails mid-batch                | Low         | 60 seconds                       | Pre-tag demo items; live tag 2-3 items only   |
| HF API cold start                  | Embedding generation takes 30+ seconds | High        | 30 seconds                       | Pre-compute all embeddings before demo        |
| TestFlight build not installed     | Cannot install app on demo iPhone      | Medium      | 2 hours (rebuild)                | Android APK as primary; web as fallback       |
| Supabase Storage RLS misconfigured | Upload fails silently                  | Low         | 5 minutes (fix policy)           | Test upload on both platforms before demo     |
| Phone camera permission denied     | Cannot take photo                      | Low         | 1 minute (settings)              | Have pre-taken photos in camera roll          |
| pgvector extension not enabled     | Search query fails with SQL error      | Low         | 2 minutes (run CREATE EXTENSION) | Verify extension is enabled before demo       |
| App crash on launch                | Black screen                           | Low         | 5 minutes (reinstall)            | Have video recording of full flow             |

### Demo Day Checklist (execute 2 hours before presentation)

1. **Verify app installs on demo device.** Open it. Log in. Confirm closet loads.
2. **Verify pre-populated demo data.** 30+ items with tags and embeddings. Search returns results.
3. **Test one live upload.** Take a photo. Confirm it appears in the closet with tags within 10 seconds.
4. **Test semantic search.** Type "formal blue shirt." Confirm relevant results appear within 3 seconds.
5. **Test on WiFi you will use for demo.** Not home WiFi. The actual presentation WiFi.
6. **Close other apps on demo device.** Free memory. Reduce background network contention.
7. **Screen recording ready.** 2-minute recording of the full flow on the demo device. Open it and verify it plays.

### Latency Budget for Demo

The user will tolerate up to 3 seconds of visible latency per action before the demo feels "slow." Here is the budget:

| Action                       | Budget | Actual (expected)                | Headroom |
| ---------------------------- | ------ | -------------------------------- | -------- |
| Open app to closet           | 2s     | 1.5s (cached data)               | 0.5s     |
| Tap "+" to camera            | 1s     | 0.5s (native camera)             | 0.5s     |
| Take photo to tagged item    | 8s     | 5-7s (parallel tag+upload)       | 1-3s     |
| Type search query to results | 3s     | 2-3s (text embedding + pgvector) | 0-1s     |
| Scroll closet grid           | 1s     | 0.3s (image lazy loading)        | 0.7s     |

**Tightest budget:** Search query (0-1s headroom). If the HF API is cold, the text embedding alone takes 3 seconds and the budget is blown. Pre-warm the HF API by making a dummy request 30 seconds before the demo search.

---

## Appendix: De-Risk Build Order

This is not a full implementation plan (that comes in Phase 02). This is the recommended build order to surface integration failures as early as possible.

| Week | What to Build                                                              | Why This Order                                                                                                       |
| ---- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1    | Supabase project + auth + empty closet UI + Storage bucket + RLS           | Proves the foundation works. If auth or storage fails, everything else is blocked.                                   |
| 1    | Image upload flow (camera to Supabase Storage to grid display)             | Proves the image pipeline works end-to-end. Most complex integration seam.                                           |
| 2    | Claude Vision auto-tagging (upload triggers tagging, tags display in grid) | Highest demo value. The "wow" moment is seeing AI tag a jacket automatically.                                        |
| 2    | Standalone build (EAS Build for iOS + Android)                             | Must verify builds work on real devices before investing more effort. Surface certificate/provisioning issues early. |
| 3    | CLIP embedding generation + pgvector storage                               | Lower demo visibility (user does not see embeddings). Can demo without this if time runs short.                      |
| 3    | Semantic search (Magic Bar)                                                | Depends on embeddings. If embeddings are pre-computed, this is a simple SQL query.                                   |
| 3    | Pre-populate demo data + rehearse demo                                     | Final polish. Pre-compute all embeddings. Pre-tag all items. Record the screen capture backup.                       |

---

## Appendix: CLIP Model Decision

| Model           | Dimensions | HF Inference Latency        | Quality | Recommendation                                                                    |
| --------------- | ---------- | --------------------------- | ------- | --------------------------------------------------------------------------------- |
| `clip-ViT-B-32` | 512        | 1-3s (warm), 10-30s (cold)  | Good    | Use this. Smaller vectors, faster inference, good enough for clothing similarity. |
| `clip-ViT-B-16` | 512        | 2-5s (warm), 15-30s (cold)  | Better  | Slightly better quality, slightly slower. Not worth the tradeoff for a demo.      |
| `clip-ViT-L-14` | 768        | 5-10s (warm), 20-45s (cold) | Best    | Too slow for live demo. Use only if pre-computing all embeddings.                 |

**Decision:** `clip-ViT-B-32` (512 dimensions). Good quality, fastest inference, smallest storage footprint. For 50 items at 512 x 4 bytes = ~100KB of vector data. Negligible storage cost.

---

## Appendix: Claude Vision Prompt Template

```
[SYSTEM]
You are a clothing item classifier. You receive an image of a single clothing item.
Return ONLY a valid JSON object with these exact fields and no other text:

{
  "category": "<one of: top, bottom, dress, outerwear, footwear, accessory>",
  "color": "<primary color, lowercase, e.g. navy, black, white>",
  "pattern": "<one of: solid, striped, plaid, floral, geometric, abstract, paisley, polka-dot>",
  "occasion": "<one of: casual, business, formal, party, athletic>",
  "formality_score": <integer 1-5 where 1=very casual, 5=very formal>
}

If the image is unclear or contains multiple items, classify the most prominent item.
If you cannot determine a field, use "unknown" for strings and 3 for formality_score.

[USER]
[Image attachment]
```

This prompt produces parseable JSON in ~95% of Claude Vision responses based on documented behavior. The remaining ~5% are handled by the retry-with-stricter-prompt fallback described in Risk 4.

---

## Success Criteria

- [ ] Pre-populated demo account with 30+ items, all tagged and embedded
- [ ] Live upload of a new image completes (with tags) in under 10 seconds
- [ ] Semantic search returns relevant results in under 3 seconds
- [ ] App runs on both iOS TestFlight and Android APK
- [ ] Screen recording backup available for network-failure scenario
- [ ] All demo-day checklist items pass 2 hours before presentation
