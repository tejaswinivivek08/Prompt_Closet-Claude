# Prompt Closet -- Technical Architecture Plan

**Phase**: 02-Plans
**Date**: 2026-04-17
**Status**: Approved for implementation

---

## 1. Architecture Overview

Prompt Closet is a mobile-first AI stylist application built with a three-tier architecture:

- **Frontend**: React Native with Expo (iOS + Android from one codebase)
- **Backend**: Supabase (auth, PostgreSQL, pgvector, storage)
- **ML Pipeline**: Claude Vision API (tagging) + CLIP via Hugging Face Inference API (embeddings)

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE CLIENT                             │
│                    (React Native + Expo)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│
│  │ Closet   │  │ Magic    │  │ Camera   │  │ Style            ││
│  │ Grid     │  │ Bar      │  │ Upload   │  │ Profile          ││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘│
│       │             │             │                  │           │
│       └──────────────┴─────────────┴──────────────────┘           │
│                            │                                      │
│                   ┌─────────▼─────────┐                          │
│                   │   Supabase Client │                          │
│                   │   (auth + data)   │                          │
│                   └─────────┬─────────┘                          │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────▼───────────────────────────────────┐
│                      SUPABASE LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐│
│  │ Auth         │  │ PostgreSQL +  │  │ Storage                 ││
│  │ (email, JWT) │  │ pgvector      │  │ (images, thumbnails)     ││
│  └──────────────┘  └──────────────┘  └──────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
      ┌────────────┐  ┌────────────┐  ┌────────────┐
      │ Claude     │  │ Hugging    │  │ Supabase   │
      │ Vision API │  │ Face       │  │ Edge       │
      │ (tagging) │  │ Inference  │  │ Functions  │
      └────────────┘  │ API        │  │ (optional) │
                       │ (embeddings) └────────────┘
                       └────────────┘
```

---

## 2. Integration Seams

The application has five primary integration seams, listed in dependency order:

| Seam | Components                        | Direction               | Risk Level |
| ---- | --------------------------------- | ----------------------- | ---------- |
| S1   | Expo -> Supabase Auth             | Client to Backend       | Medium     |
| S2   | Expo -> Supabase Storage          | Client to Backend       | High       |
| S3   | Supabase Storage -> Claude Vision | Backend to External API | Medium     |
| S4   | Supabase Storage -> CLIP (HF API) | Backend to External API | High       |
| S5   | Expo -> pgvector (via Supabase)   | Client to Backend DB    | Low        |

### Seam S1: Expo-to-Supabase Auth

```
React Native (Expo)
    │
    ├── supabase.auth.signInWithOtp({ email })  → Magic link email
    ├── supabase.auth.signInWithPassword()        → Password login
    └── supabase.auth.onAuthStateChange()          → Session listener
```

**Key integration points:**

- JWT tokens stored in Expo SecureStore (persists across app restarts)
- Refresh token handled automatically by Supabase client
- RLS policies enforce user scoping on all tables

**Failure modes:**

- Deep link URI mismatch for magic link (OAuth redirect)
- Session expires during long upload process
- Token refresh fails on poor network

### Seam S2: Expo-to-Supabase Storage

```
Expo ImagePicker → FormData → supabase.storage.upload()
    │
    └── POST /storage/v1/object/closet-images/{user_id}/{uuid}.jpeg
```

**Key integration points:**

- FormData with `uri` field (not Blob — React Native compatibility)
- HEIC to JPEG conversion on iOS (expo-image-manipulator)
- Progress tracking via XMLHttpRequest upload events
- RLS policies enforce user-scoped access

**Failure modes:**

- Upload progress hidden (user thinks app is frozen)
- RLS policy misconfigured (upload returns "Unauthorized")
- Storage quota exceeded silently

### Seam S3: Supabase Storage -> Claude Vision

```
Supabase Storage (public URL)
    │
    └── Claude Vision API (claude-sonnet-4-20250514)
            │
            └── Structured JSON: { category, color, pattern, occasion, formality_score }
                    │
                    └── UPDATE clothing_items SET tag_status='done', ...
```

**Key integration points:**

- Image passed as public URL (no base64 encoding needed)
- Strict JSON schema for structured output
- Parallel execution with Seam S4 (independent operations)

**Failure modes:**

- Malformed JSON response from Claude
- Rate limit (429) during batch upload
- Image exceeds 5MB limit

### Seam S4: Supabase Storage -> CLIP (Hugging Face)

```
Supabase Storage (public URL)
    │
    └── Hugging Face Inference API (clip-ViT-B-32)
            │
            └── 512-dim float vector
                    │
                    └── UPDATE clothing_items SET embedding=vector, embedding_status='done'
```

**Key integration points:**

- Same image URL as Seam S3 (parallel execution)
- Model: `sentence-transformers/clip-ViT-B-32` (512 dimensions fixed)
- Text query embedding uses same model for consistency

**Failure modes:**

- HF API cold start (10-30s for first request)
- Rate limit exceeded (1000 req/day free tier)
- Network timeout during inference

### Seam S5: Expo -> pgvector (via Supabase)

```
Expo (Magic Bar input)
    │
    ├── CLIP text encoder (HF API) → 512-dim query vector
    │
    └── Supabase PostgreSQL
            │
            └── SELECT ... ORDER BY embedding <=> $1 LIMIT 10
                    │
                    └── Cosine similarity (pgvector <=> operator)
```

**Key integration points:**

- `1 - (embedding <=> $1)` converts cosine distance to similarity score
- Results sorted ascending by distance (0 = identical, 2 = opposite)
- No ANN index needed at demo scale (<500 items)

---

## 3. Build Order (De-Risk Sequence)

Based on the failure analysis, the recommended build order surfaces integration issues earliest and maximizes demo reliability.

### Week 1: Foundation

**Day 1-2: Supabase Project + Auth**

- Create Supabase project
- Enable pgvector extension: `CREATE EXTENSION vector;`
- Run schema migrations (profiles, clothing_items, outfits)
- Configure RLS policies
- Test auth flow: sign up → magic link → session persists
- Verify RLS: confirm User A cannot read User B's items

**Day 3-4: Storage + Image Upload**

- Create `closet-images` storage bucket
- Configure RLS policies on storage.objects
- Implement camera capture (Expo ImagePicker)
- Implement HEIC → JPEG conversion
- Implement compression (1024x1024, quality 0.7)
- Implement thumbnail generation (200x200, quality 0.5)
- Implement upload to Supabase Storage with progress indicator
- Test on physical iOS + Android devices (not just simulators)

**Day 5: Standalone Build Verification**

- Run `eas build --platform all`
- Install on physical iOS (TestFlight or development build)
- Install on physical Android (APK)
- Verify auth flow works on standalone build
- Verify image upload works on standalone build
- **Critical**: Surface certificate/provisioning issues NOW, not week 3

### Week 2: Auto-Tagging Pipeline

**Day 6-7: Claude Vision Integration**

- Implement Claude Vision API call (image URL as input)
- Implement strict JSON schema prompt
- Implement retry logic with fallback tags
- Implement tag_status state machine (pending → processing → done/failed)
- Display tags in closet grid item card
- Implement "Tap to retag" for failed items

**Day 8-9: Tagging UI + Error States**

- Implement upload progress states (uploading → tagging → done)
- Implement tag review screen (edit tags before save)
- Implement parallel tagging (max 4 concurrent)
- Test tagging on varied images: dark clothes, patterned items, accessories
- Verify error messages are user-friendly (not raw API errors)

### Week 3: Embeddings + Search

**Day 10-11: CLIP Embedding Generation**

- Implement HF Inference API call for CLIP ViT-B/32
- Implement embedding_status state machine
- Run embeddings in parallel with Claude Vision (same image)
- Pre-compute embeddings for all demo items
- Verify pgvector storage and cosine similarity query

**Day 12-13: Semantic Search + Magic Bar**

- Implement Magic Bar UI (persistent rail + expanded overlay)
- Implement text query → CLIP text embedding
- Implement hybrid search (tag filter + embedding rerank)
- Implement "Stream of Thought" processing states
- Implement outfit card display
- Implement follow-up conversation flow

**Day 14: Demo Polish + Pre-Seeding**

- Pre-populate demo account with 30+ items
- Pre-compute all embeddings
- Verify search returns relevant results
- Record screen capture backup (2-minute flow)
- Execute demo-day checklist

---

## 4. Component Architecture

### 4.1 React Native Component Tree

```
App
├── AuthProvider (Supabase session context)
│   └── AuthGate
│       ├── LoginScreen (email input + magic link)
│       └── SignUpScreen
│
├── TabNavigator (5 tabs)
│   ├── ClosetStack
│   │   ├── ClosetGridScreen (default)
│   │   │   ├── FilterBar (category, color, occasion, formality)
│   │   │   ├── ItemCard[] (3-column grid)
│   │   │   └── EmptyClosetState
│   │   └── ItemDetailScreen
│   │
│   ├── StyleStack
│   │   ├── SavedOutfitsScreen
│   │   └── OutfitDetailScreen
│   │
│   ├── CameraStack
│   │   ├── CameraScreen (viewfinder)
│   │   ├── GalleryPickerScreen
│   │   └── TagReviewScreen (edit AI tags)
│   │
│   ├── SearchStack
│   │   └── SemanticSearchScreen (Magic Bar)
│   │
│   └── ProfileStack
│       ├── StyleProfileScreen (Style DNA)
│       └── SettingsScreen
│
├── MagicBarRail (persistent, always visible above tab bar)
│   └── MagicBarExpanded (full-screen overlay)
│
└── OutfitCard (displayed after Magic Bar search)
```

### 4.2 State Management

**React Context providers:**

- `AuthContext` — Supabase session, user ID
- `ClosetContext` — wardrobe items, filters, loading states

**Local state (useState):**

- Form inputs
- Modal visibility
- UI toggle states

**Server state (React Query or SWR):**

- Clothing items from Supabase
- Outfit suggestions
- User profile data

### 4.3 API Layer (Supabase Client)

```typescript
// supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
);

// Query helpers
export const queries = {
  // Clothing items
  getItems: (userId: string) =>
    supabase.from("clothing_items").select("*").eq("user_id", userId),

  insertItem: (item: ClothingItemInsert) =>
    supabase.from("clothing_items").insert(item),

  updateItem: (id: string, updates: Partial<ClothingItem>) =>
    supabase.from("clothing_items").update(updates).eq("id", id),

  deleteItem: (id: string) =>
    supabase.from("clothing_items").delete().eq("id", id),

  // Semantic search
  searchSimilar: (embedding: number[], userId: string, limit = 10) =>
    supabase.rpc("match_items", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit,
      user_id: userId,
    }),
};
```

### 4.4 ML Pipeline (Edge Functions or Client-Side)

For Phase 1 demo, ML inference runs client-side to avoid Supabase Edge Function cold starts:

```typescript
// ml-service.ts
export class MLService {
  // Claude Vision for tagging
  async tagImage(imageUrl: string): Promise<Tags> {
    const response = await claude.messages.create({
      model: process.env.CLAUDE_MODEL!,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            { type: "text", text: TAGGING_PROMPT },
          ],
        },
      ],
    });
    return parseTagResponse(response);
  }

  // CLIP for embeddings (Hugging Face Inference API)
  async generateEmbedding(imageUrl: string): Promise<number[]> {
    const response = await fetch(HF_INFERENCE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: imageUrl,
        model: "sentence-transformers/clip-ViT-B-32",
      }),
    });
    return response.json(); // 512-dim float array
  }

  // CLIP text encoder for search queries
  async embedText(query: string): Promise<number[]> {
    const response = await fetch(HF_INFERENCE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: query,
        model: "sentence-transformers/clip-ViT-B-32",
      }),
    });
    return response.json();
  }
}
```

---

## 5. Database Schema

### 5.1 Entity Relationship Diagram

```
┌──────────────┐         ┌─────────────────────┐         ┌──────────────┐
│ auth.users   │         │   clothing_items    │         │   outfits    │
│ (Supabase)   │         │                     │         │              │
├──────────────┤         ├─────────────────────┤         ├──────────────┤
│ id (UUID)    │◄────────│ user_id (UUID)      │         │ user_id      │◄─┐
│ email        │    FK   │ id (UUID)           │         │ id (UUID)    │  │
│              │         │ image_url           │         │ name         │  │
└──────────────┘         │ thumbnail_url       │         │ prompt       │  │
       │                 │ category            │         │ item_ids[]   │  │
       │                 │ color               │         │ reasoning    │  │
       │                 │ pattern             │         │ occasion     │  │
       │                 │ occasion            │         │ created_at   │  │
       │                 │ formality_score     │         └──────────────┘  │
       │                 │ embedding (512)     │                           │
       │                 │ tag_status          │    ┌─────────────────┐    │
       │                 │ embedding_status    │    │ clothing_items  │    │
       │                 │ created_at          │    │  <-> outfits    │    │
       │                 └─────────────────────┘    │  (via item_ids) │    │
       │                                           └─────────────────┘    │
       │                                                                          │
       ▼                                                                          │
┌──────────────┐                                                                  │
│  profiles    │                                                                  │
├──────────────┤                                                                  │
│ id (UUID)    │◄─────────────────────────────────────────────────────────────────┘
│ display_name │     (RLS: auth.uid() = user_id on all tables)
│ created_at   │
└──────────────┘
```

### 5.2 Key Constraints

| Constraint             | Enforcement                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| User isolation         | RLS: `auth.uid() = user_id` on all tables                             |
| Formality range        | CHECK: `formality_score BETWEEN 1 AND 5`                              |
| Tag status valid       | CHECK: `tag_status IN ('pending','processing','done','failed')`       |
| Embedding status valid | CHECK: `embedding_status IN ('pending','processing','done','failed')` |
| Image ownership        | Storage RLS: users can only access `/{user_id}/*` paths               |

---

## 6. Security Model

### 6.1 Authentication

- Email + magic link (Phase 1)
- JWT access tokens (1 hour expiry)
- Refresh tokens (30 days, auto-refresh)
- Tokens stored in Expo SecureStore (encrypted)

### 6.2 Row Level Security

Every table with user data has RLS enabled:

```sql
-- clothing_items
CREATE POLICY "Users can CRUD own items"
  ON clothing_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- outfits
CREATE POLICY "Users can CRUD own outfits"
  ON outfits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
```

### 6.3 Storage Security

```sql
-- Users can only upload to their own folder
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'closet-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can only read their own images
CREATE POLICY "Users can read own images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'closet-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can only delete their own images
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'closet-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

### 6.4 API Key Management

| Key                             | Storage                              | Usage                          |
| ------------------------------- | ------------------------------------ | ------------------------------ |
| `EXPO_PUBLIC_SUPABASE_URL`      | .env                                 | Supabase client initialization |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | .env                                 | Supabase client (RLS-scoped)   |
| `CLAUDE_API_KEY`                | .env (server-side) or secure storage | Claude Vision API              |
| `HF_API_KEY`                    | .env (server-side) or secure storage | Hugging Face Inference API     |

**Note**: For Phase 1 demo, ML inference runs client-side. API keys must be in `EXPO_PUBLIC_*` env vars, which are embedded in the app binary. For production, ML inference should move to Supabase Edge Functions with secrets.

---

## 7. Environment Configuration

### 7.1 Required Environment Variables

```bash
# .env (Expo /app)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
CLAUDE_API_KEY=sk-ant-...
HF_API_KEY=hf_...

# Note: EXPO_PUBLIC_* vars are embedded in the app binary
# For Phase 1 demo, this is acceptable. For production, use secure storage.
```

### 7.2 Model Configuration

```typescript
// config/models.ts
export const MODEL_CONFIG = {
  // Claude Vision
  claude: {
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
    maxTokens: 512,
    timeoutMs: 10000,
    maxRetries: 2,
  },

  // CLIP (Hugging Face)
  clip: {
    model: "sentence-transformers/clip-ViT-B-32",
    dimensions: 512,
    hfInferenceUrl:
      "https://api-inference.huggingface.co/models/sentence-transformers/clip-ViT-B-32",
    timeoutMs: 30000,
    maxRetries: 3,
  },
};
```

---

## 8. Error Handling Strategy

### 8.1 Error Categories

| Category       | Example                   | User Experience                 | Recovery                     |
| -------------- | ------------------------- | ------------------------------- | ---------------------------- |
| Network        | Upload fails, API timeout | "Check your connection" + retry | Automatic retry with backoff |
| API Rate Limit | Claude 429, HF 429        | "Processing queued" + progress  | Wait 60s, retry              |
| Validation     | Invalid tags from Claude  | Tags marked editable            | Show "Tap to correct"        |
| Auth           | Session expired           | Redirect to login               | Re-authenticate              |
| Storage        | Quota exceeded            | "Storage full" message          | Delete items or upgrade      |

### 8.2 Pipeline Error States

```typescript
// Upload state machine
type UploadState =
  | { status: "idle" }
  | { status: "compressing"; progress: number }
  | { status: "uploading"; progress: number }
  | { status: "tagging"; itemId: string }
  | { status: "embedding"; itemId: string }
  | { status: "done"; item: ClothingItem }
  | { status: "error"; message: string; retryable: boolean };

// Tag status
type TagStatus = "pending" | "processing" | "done" | "failed";
// Embedding status
type EmbeddingStatus = "pending" | "processing" | "done" | "failed";
```

### 8.3 Graceful Degradation

| Feature         | Degraded Mode                                                               |
| --------------- | --------------------------------------------------------------------------- |
| Semantic search | Falls back to tag-only filtering if embeddings unavailable                  |
| Magic Bar       | Shows "Processing" indefinitely if CLIP fails, user can still browse closet |
| Auto-tagging    | Item appears with "uncategorized" tags, user can manually tag               |
| Image upload    | Supports gallery picker as fallback if camera fails                         |

---

## 9. Performance Targets

### 9.1 Latency Budget

| Action                            | Budget | Target | Notes                        |
| --------------------------------- | ------ | ------ | ---------------------------- |
| App cold start to closet          | 2s     | 1.5s   | With cached auth token       |
| Camera open                       | 1s     | 0.5s   | Native camera launch         |
| Image capture to upload start     | 0.5s   | 0.3s   | Compression runs async       |
| Upload (single image, compressed) | 2s     | 1s     | 3G network assumed           |
| Claude Vision tagging             | 3s     | 2s     | Includes network round-trip  |
| CLIP embedding (HF API warm)      | 2s     | 1s     | After cold start             |
| Semantic search                   | 2s     | 1.5s   | Text embedding is bottleneck |
| Closet grid scroll                | 1s     | 0.3s   | Lazy image loading           |

### 9.2 Parallelization Strategy

```typescript
// On image upload: parallel processing
async function processImage(imageUrl: string) {
  // Fire both simultaneously — they operate on the same image independently
  const [tags, embedding] = await Promise.all([
    mlService.tagImage(imageUrl), // ~2s
    mlService.generateEmbedding(imageUrl), // ~1.5s (warm), ~30s (cold)
  ]);

  // Total: ~2s (max of parallel tasks, not sum)
  await supabase
    .from("clothing_items")
    .update({
      category: tags.category,
      color: tags.color,
      pattern: tags.pattern,
      occasion: tags.occasion,
      formality_score: tags.formality_score,
      tag_status: "done",
      embedding: embedding,
      embedding_status: embedding ? "done" : "failed",
    })
    .eq("id", itemId);
}
```

### 9.3 Pre-Computation (Demo Mode)

For demo reliability, pre-compute embeddings before presentation:

```typescript
// Pre-demo script: compute all embeddings for demo items
async function precomputeDemoEmbeddings(userId: string) {
  const items = await supabase
    .from("clothing_items")
    .select("id, image_url")
    .eq("user_id", userId)
    .eq("embedding_status", "pending");

  for (const item of items.data) {
    const embedding = await mlService.generateEmbedding(item.image_url);
    await supabase
      .from("clothing_items")
      .update({ embedding, embedding_status: "done" })
      .eq("id", item.id);
  }
}
```

---

## 10. Deployment Architecture

### 10.1 Expo EAS Build Configuration

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "enterpriseDomain": "com.promptcloset.app"
      }
    },
    "production": {
      "ios": {
        "simulator": false,
        "enterpriseDomain": "com.promptcloset.app"
      },
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### 10.2 Build Targets

| Platform | Build Type  | Distribution    | Notes                                  |
| -------- | ----------- | --------------- | -------------------------------------- |
| iOS      | Development | Expo Dev Client | Fast iteration, test on own device     |
| iOS      | Preview     | TestFlight      | Demo presentation device               |
| Android  | Preview     | APK             | Primary demo device (faster iteration) |
| Android  | Production  | Play Store      | Future                                 |

### 10.3 Build Timeline

- **Week 1**: Development builds working on physical devices
- **Week 2**: TestFlight + APK preview builds submitted
- **Week 3**: Final polish + screen recording backup ready
- **Demo Day**: Pre-computed embeddings, screen recording available

---

## 11. Integration Checklist

Before proceeding to Phase 03 (implementation), verify:

- [ ] Supabase project created with pgvector enabled
- [ ] Schema migrations run successfully
- [ ] RLS policies tested (User A cannot access User B's data)
- [ ] Storage bucket created with correct RLS policies
- [ ] Auth flow tested: sign up → magic link → session persists across app restart
- [ ] EAS build completes for iOS (development build)
- [ ] EAS build completes for Android (APK)
- [ ] App installs and runs on physical iOS device
- [ ] App installs and runs on physical Android device
- [ ] Camera capture works on physical device
- [ ] Gallery image selection works
- [ ] HEIC → JPEG conversion works on iOS
- [ ] Image upload to Supabase Storage works
- [ ] Progress indicator shows during upload

---

## 12. Risk Mitigation Summary

| Risk                          | Likelihood | Mitigation                        | Fallback              |
| ----------------------------- | ---------- | --------------------------------- | --------------------- |
| HF API cold start during demo | High       | Pre-compute all demo embeddings   | Cached demo responses |
| WiFi failure during demo      | Medium     | Pre-populated demo account        | Screen recording      |
| TestFlight build fails        | Medium     | Android APK as primary            | Web fallback          |
| Claude rate limit             | Low        | Pre-tag demo items                | Manual tagging        |
| Storage quota exceeded        | Low        | Monitor and clean up              | Delete old items      |
| Upload RLS misconfigured      | Medium     | Test explicitly on both platforms | Gallery-only upload   |
