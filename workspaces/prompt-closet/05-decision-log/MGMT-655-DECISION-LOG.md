# Prompt Closet — COC Decision Log

**Course:** MGMT 655 — Machine Learning for Decision Making
**Author:** Tejaswini Vivek
**Date:** 2026-04-20 to 2026-05-05
**Status:** Complete

---

## Decision Categories

1. [Problem Framing](#1-problem-framing-decisions)
2. [ML Architecture](#2-ml-architecture-decisions)
3. [Data & Storage](#3-data--storage-decisions)
4. [Product Design](#4-product-design-decisions)
5. [Ethical Considerations](#5-ethical-considerations)
6. [What I Would Do Differently](#6-what-i-would-do-differently)

---

## 1. PROBLEM FRAMING DECISIONS

### DECISION: Core User Problem Definition

**What:** Define the primary user problem Prompt Closet solves.

**Alternatives Considered:**
- Fashion recommendation ("buy this item") — requires retail partnerships and inventory management
- Social/outfit sharing — requires network effects; zero value at MVP launch
- Body measurement tracking — requires 3D scanning hardware or manual input; high friction

**Chosen:** Wardrobe utilization — help users wear more of what they already own.

**Rationale:** Indian urban consumers own large wardrobes they barely use. No app helps users digitize, organize, and get styled recommendations from what they already own. The wardrobe is a bounded, private dataset with no copyright concerns. Personal style is semi-structured: occasion, color, formality map well to AI tagging.

**Trade-offs Accepted:**
- "Wear more of what you own" is less compelling than "find new combinations" — mitigated by Style DNA and Magic Bar demonstrating novel discovery
- No revenue from item sales — freemium model must convert on premium features

---

### DECISION: Target User Segment

**What:** Define the primary demographic for Prompt Closet.

**Alternatives Considered:**
- Rural/non-metro users — low smartphone penetration, lower wardrobe turnover
- Men's formal-only wardrobes — too homogeneous for meaningful clustering
- Enterprise/B2B — out of scope for individual consumer app

**Chosen:** Urban Indian 22–35 year olds with 50+ clothing items, Android + iOS, moderate-to-high fashion awareness.

**Rationale:**
1. **Cultural specificity** — Indian occasions (Diwali, temple visits, corporate Fridays) require occasion tags no Western model natively knows
2. **Wardrobe density** — 30–50+ items needed for clustering to be meaningful
3. **Mobile-first** — they live on their phone
4. **AI assistant literacy** — comfortable with ChatGPT-style prompting

**Trade-offs Accepted:**
- Excludes older demographics — addressable in Phase 3
- Excludes users with <50 items — bootstrapped with demo pre-seed data

---

### DECISION: MVP Scope

**What:** Determine what to build in Phase 1.

**Alternatives Considered:**
- Google OAuth first — requires Apple Dev account ($99/yr) + OAuth consent review (2–4 business days)
- Voice input first — no verified cross-platform STT API in Expo
- Virtual try-on first — 3D model pipeline is separate research project

**Chosen:** Email magic link auth + camera upload + Claude Vision auto-tagging + CLIP embeddings + closet grid + Magic Bar NL outfit composition.

**Rationale:** Minimum viable ML pipeline demonstrating distinct ML concepts: tagging → embedding → retrieval → composition. Each layer teaches a different course concept.

**Trade-offs Accepted:**
- Email magic link has more friction than Google OAuth — acceptable for demo
- Text-only Magic Bar loses "impressive voice moment" — styling reasoning is the substantive demonstration
- No virtual try-on — compensated by AI reasoning paragraph

---

## 2. ML ARCHITECTURE DECISIONS

### DECISION: CLIP ViT-B/32 for Image Embeddings

**What:** Select the visual embedding model for wardrobe items.

**Alternatives Considered:**
- YOLOv8 with custom fashion classifier — classification-only, no cross-modal retrieval
- Custom CNN trained on fashion datasets — requires labeled data + GPU + 2–3 weeks
- ResNet-50 features + PCA — no semantic/text alignment
- DeepFashion EfficientNet — classification-only, wrong architecture for retrieval
- DINOv2 self-supervised — no text alignment without separate text encoder

**Chosen:** CLIP ViT-B/32 via Hugging Face Inference API.

**Rationale:**
1. Maps images AND text to same 512-dimensional embedding space
2. Enables zero-shot cross-modal retrieval ("red dress" → photos of red dresses)
3. Freely available via Hugging Face (1000 req/day free tier)
4. Well-documented text encoder for query embedding

**Trade-offs Accepted:**
- Fabric/texture discrimination is weak — mitigated by Claude Vision's structured tags
- CLIP trained on Western internet data — South Asian clothing underrepresented; added explicit prompt engineering for South Asian traditional wear

---

### DECISION: pgvector (via Supabase) for Vector Storage

**What:** Select the vector database for embedding storage.

**Alternatives Considered:**
- Pinecone — purpose-built vector DB, overkill for 50–500 items, adds new vendor/billing
- Weaviate — more complexity than needed, no Supabase integration
- Qdrant — Rust-based, no free tier via Supabase
- FAISS (local) — no persistence, no Supabase integration
- JSON blobs + app-side cosine similarity — unwieldy at 500 items

**Chosen:** Supabase pgvector — `CREATE EXTENSION vector;` — zero new infrastructure.

**Rationale:** Already in tech stack (auth, PostgreSQL, storage). 512-dim embeddings fit natively. At 50–500 items, brute-force cosine similarity takes <5ms — no ANN index needed. Future-proof: HNSW indexes available via single migration if scale grows.

**Trade-offs Accepted:**
- pgvector's IVFFlat and HNSW support less mature than Pinecone — acceptable at demo scale
- pgvector NOT auto-enabled on Supabase free tier — must be enabled manually per project

---

### DECISION: Claude Vision for Auto-Tagging

**What:** Select the vision model for clothing image analysis.

**Alternatives Considered:**
- GPT-4V — comparable vision but Claude's structured output and JSON schema validation superior; more cost-effective
- Google Cloud Vision API — classification-only, no occasion/formality reasoning
- AWS Rekognition — same limitation, no fashion-specific attributes
- Open-source LLaVA or IDEFICS — self-hosted, requires GPU inference

**Chosen:** Claude Vision (claude-sonnet-4-20250514) with structured JSON output.

**Rationale:**
1. Accepts strict JSON schema prompt, returns validated structured output
2. Understands occasion context ("Diwali dinner" → formal, festive, rich colors)
3. Parallel execution with CLIP — latency is max(tagging, embedding), not sum

**Trade-offs Accepted:**
- Cost: ~$0.003 per image — negligible at demo scale (~$1.50 for 500 items)
- Rate limit: 40 req/min on Tier 1 — mitigated by semaphore concurrency limiting

---

### DECISION: Cosine Similarity Threshold 0.3

**What:** Set the embedding similarity threshold for retrieval.

**Alternatives Considered:**
- 0.2 threshold — too loose; "red dress" at 0.2 returns navy blue items
- 0.4 threshold — recall drops significantly; empty results for specific queries

**Chosen:** 0.3 cosine similarity + tag pre-filter + CLIP rerank.

**Rationale:** Threshold of 0.3 set empirically based on CLIP benchmarks and red team analysis. Magic Bar uses 0.25 (20 items returned, then re-ranked by Claude) because tag pre-filter already narrows the candidate set.

**Trade-offs Accepted:**
- False positives at 0.3 — mitigated by tag pre-filter
- Semantic meaning ("festive" vs "party") not captured by cosine alone — mitigated by occasion tag

---

### DECISION: Two-Pass Slot-Based Outfit Composition

**What:** Design the outfit recommendation architecture.

**Alternatives Considered:**
- Pure embedding similarity — returns individually similar items, no compositional logic
- LLM picks from full inventory — token cost scales with closet size; LLM lacks visual understanding

**Chosen:** Two-pass slot-based architecture: (1) Claude decomposes NL prompt into structured intent + slot definitions. (2) Tag-filtered embedding search fills each slot. (3) Claude generates reasoning paragraph.

**Rationale:** Demonstrates both ML capabilities (embeddings for retrieval, LLM for reasoning), scales to larger closets via tag pre-filtering, produces compositionally sound outfits.

**Trade-offs Accepted:**
- More complex than pure LLM — additional pipeline step but better outfits
- Slot boundaries require careful tag taxonomy — mitigated by Claude Vision's category tag

---

### DECISION: K-means++ Initialization for Style DNA

**What:** Select clustering algorithm for wardrobe segmentation.

**Alternatives Considered:**
- Standard K-means (random init) — sensitive to initialization, converges to different local minima
- K-means|| (bisecting) — better scalability, inappropriate for 50–500 item wardrobes
- Random Partition — fastest init but worst clustering quality

**Chosen:** K-means++ (Arthur & Vassilvitskii, 2007).

**Rationale:** Samples centroids with probability proportional to D(x)². For 50–500 items with 512-dim CLIP embeddings, K-means++ converges to better local minimum in fewer iterations. 2 log(1/δ)-approximation guarantee.

**Trade-offs Accepted:**
- Slightly higher initialization cost — imperceptible at n < 500
- Still converges to local optimum, not global — acceptable for style archetypes

---

### DECISION: k=5 Clusters with Silhouette Score Selection

**What:** Determine the default number of style clusters.

**Alternatives Considered:**
- Fixed k=3 — too coarse; collapses "formal office" and "festive Indian"
- Fixed k=8–10 — requires more items; produces singletons with 30 items
- Hierarchical Agglomerative Clustering — deferred; requires 30+ items
- Pure silhouette-driven (no default) — harder to explain to users

**Chosen:** k=5 default with silhouette score optimization — optimal k ranged from 4–7 across test wardrobes, k=5 was median.

**Rationale:** k=5 produces meaningful style archetypes: Minimalist/Everyday, Classic/Formal, Streetwear/Bold, Ethnic/Traditional, Festive/Statement. k=3 would conflate ethnic/traditional from festive/statement.

**Trade-offs Accepted:**
- Some wardrobes have optimal k ≠ 5 — silhouette score computed; if k=3 yields higher, it is used instead
- k=5 requires minimum 15 items — wardrobes with fewer items fall back to single cluster

---

### DECISION: Beta-Binomial Bayesian for Preference Learning

**What:** Select the recommendation personalization model.

**Alternatives Considered:**
- Frequentist proportion estimator — overconfident at small samples; with 2 accepts and 0 rejects returns 100%
- Wilson score interval — addresses uncertainty but doesn't compose naturally into re-ranking
- Thompson Sampling — optimal for explore/exploit but overkill for read-only ranking
- Neural collaborative filtering — requires 1000s of signals; severe cold-start problem

**Chosen:** Beta-Binomial conjugate inference with O(1) posterior updates.

**Rationale:**
1. **Conjugate prior means O(1) updates** — after observing feedback, posterior is Beta(α+accepts, β+rejects)
2. **Posterior mean = MAP estimate** — directly usable as dimension-level preference score
3. **Effective sample size drives confidence weighting** — when ESS < 3, dimension prior considered uninformative
4. **Privacy-preserving** — integer counts only, no individual item IDs stored

**Trade-offs Accepted:**
- Assumes i.i.d. feedback — context (weather, occasion) moderates feedback interpretation
- Prior of Beta(1, 1) is uniform — ignores self-reported preferences from onboarding

---

### DECISION: MiniMax Image API for Digital Twin

**What:** Select the avatar generation service.

**Alternatives Considered:**
- FASHN virtual try-on — raises significant DPA concerns (body photos = biometric data under GDPR/ITU DPDP Act)
- fal.ai Stable Diffusion XL — higher per-image cost, slower, no native fashion illustration style
- Self-hosted Lambda with SDXL — ~$2.79/hr GPU inference, operational overhead
- Stable Diffusion via Replicate — requires separate LoRA fine-tune for fashion look

**Chosen:** MiniMax Image API for stylized fashion illustration avatars.

**Rationale:**
1. **Appropriate abstraction level** — digital twin as artistic/fashion-illustration representation, not photorealistic try-on
2. **Lower biometric sensitivity** — generates stylized avatar from fashion photos, reduces DPI surface
3. **Cost efficiency and speed** — free tier available; 3–8 second generation; no GPU infrastructure

**Trade-offs Accepted:**
- Not photorealistic — users cannot see exact fit; avatar is "style twin" not "try-on mirror"
- DPA risk remains for any service processing user photos — privacy policy review needed before production
- Style consistency — generated avatars may vary; stored URL ensures consistency

---

## 3. DATA & STORAGE DECISIONS

### DECISION: GIN Index Fix for Occasion Queries

**What:** Fix invalid PostgreSQL multi-column GIN index.

**Problem:** Original migration contained `USING GIN(user_id, occasions)` — invalid syntax since GIN indexes operate on a single column.

**Chosen:** Two separate indexes — B-tree for user_id, GIN for occasions array.

**Rationale:** PostgreSQL GIN indexes only work on single columns. The GIN index on occasions enables efficient `WHERE occasions @> 'festive'` and `WHERE occasions && ARRAY['casual','office']` queries for the hybrid tag pre-filter.

**Trade-offs Accepted:**
- Two indexes instead of one — slightly more storage, negligible at demo scale
- GIN index on append-only array has minimal write overhead

---

### DECISION: NOW() Partial Index Replacement

**What:** Fix NOW() usage in dead-weight detection index.

**Problem:** `NOW()` in partial index WHERE clause is STABLE (not IMMUTABLE) — PostgreSQL cannot guarantee the WHERE clause condition is constant.

**Chosen:** Plain B-tree index on (user_id, worn_last_at); query-time filtering in application layer.

**Rationale:** The date comparison is performed at query time rather than baked into the index definition. At <500 items, the query planner uses the plain index efficiently.

**Trade-offs Accepted:**
- Plain index slightly less targeted than partial — acceptable at demo scale
- More rows scanned by index — acceptable at 500 items

---

## 4. PRODUCT DESIGN DECISIONS

### DECISION: React Native with Expo

**What:** Select the mobile development framework.

**Alternatives Considered:**
- Flutter — superior native performance, but requires learning Dart + widget system
- Web-only (PWA) — lowest cost but camera APIs unreliable on web
- React Native without Expo — full native module access but loses managed workflow

**Chosen:** React Native with Expo.

**Rationale:**
1. **Expo ecosystem** — expo-image-picker handles camera/gallery, expo-image-manipulator handles HEIC→JPEG, expo-secure-store handles JWT
2. **EAS Build** — produces standalone iOS/Android binaries from same codebase
3. **Existing experience** — team had React Native experience; 2-week time savings from known tooling

**Trade-offs Accepted:**
- React Native bridge introduces latency — not a bottleneck for this app
- Expo's managed workflow doesn't support custom native modules — never needed for Phase 1

---

### DECISION: Freemium Model

**What:** Select the monetization strategy.

**Alternatives Considered:**
- Pure subscription — predictable MRR but zero viral loop
- Ad-supported — destroys UX, incompatible with privacy-first app
- Marketplace/commission — requires retail partnerships

**Chosen:** Freemium with three tiers.

**Rationale:**
1. **Viral loop is the wardrobe itself** — users invite friends to see outfits; paywall breaks this loop
2. **ML learning compounds with usage** — charging before value established creates churn
3. **Network effects are multi-directional** — when User A shares and User B screenshots, both become potential users

**Trade-offs Accepted:**
- Free tier users who never convert cost money — acceptable at demo scale
- 5–8% conversion rate industry standard — need to track post-launch

---

### DECISION: Magic Bar as Separate Tab

**What:** Determine Magic Bar discoverability and placement.

**Alternatives Considered:**
- Inline rail on Closet screen — competes with grid for screen space
- Floating action button — single "+" button for camera
- Full-screen modal — hidden behind obscure button (identified as P1 discoverability bug by red team)

**Chosen:** Separate Style tab with Magic Bar as primary content.

**Rationale:**
1. **Discoverability** — Style tab visible in bottom navigation; users explore all tabs
2. **Focus** — AI styling is separate task from browsing closet; full tab attention
3. **Red team finding** — original "✨ Ask AI Stylist" button inside Closet Screen was found by 0% of test users

**Trade-offs Accepted:**
- One more tab in navigation — acceptable for 5-tab structure
- Task switching between tabs — minor friction, cognitively natural

---

### DECISION: Email-Only Auth for Phase 1

**What:** Determine authentication method.

**Alternatives Considered:**
- Build Google OAuth in Phase 1 — requires Apple Developer account + OAuth consent review (2–4 business days)

**Chosen:** Email magic link via Supabase.

**Rationale:** Built-in, zero-configuration auth that works on day 1. Google OAuth is additive (Phase 1.1) not a replacement.

**Trade-offs Accepted:**
- Some users prefer one-click Google sign-in — friction increase for Phase 1, eliminated once OAuth added
- Magic link can be slower — mitigated by arrival within seconds on mobile

---

## 5. ETHICAL CONSIDERATIONS

### DECISION: South Asian Clothing Bias Mitigation

**Identified Risk:** CLIP and Claude Vision trained predominantly on Western data. South Asian garments (saree draping, kurta variations, lehenga silhouettes, Chikankari, Bandhani, Block Print) are underrepresented.

**Mitigation Implemented:** Added to Claude Vision prompt: "Pay special attention to South Asian traditional wear including sarees, kurtas, lehengas, and sherwanis."

**Remaining Risk:** Fine-grained regional variants still underrepresented.

---

### DECISION: Body Measurement Data Exclusion

**Identified Risk:** Biometric data (body measurements, body photos) requires GDPR/ITU DPDP Act compliant consent flows.

**Chosen:** Body measurements explicitly excluded from Phase 1 scope.

**Rationale:** Course demo app should not handle biometric data; liability disproportionate to scope. Virtual try-on (Phase 4) will revisit with proper legal counsel.

**Phase 4 Requirements if Added:**
- Explicit opt-in consent with clear data usage description
- Data minimization: store measurements, not raw body photos
- Right to deletion
- Encryption at rest
- No third-party analytics on measurement data

---

### DECISION: Privacy-Preserving Feedback Storage

**Chosen:** outfit_feedback table stores only integer counts per style dimension — not individual item IDs with feedback.

**Rationale:** The outfit hash (sorted item IDs → integer) prevents double-counting without storing outfit content. Beta-Binomial priors store only alpha/beta counts per dimension — 10 integers per user. No outfit, item, or timestamp data retained that could reconstruct individual choices.

---

## 6. WHAT I WOULD DO DIFFERENTLY

### 1. Build Magic Bar Discoverability in Original Build, Not Red Team

The red team correctly identified that hiding Magic Bar behind a button was a P1 bug. The lesson: a feature users cannot find is a feature that does not exist. Wire Magic Bar to the Style tab from day 1.

### 2. Pre-Seed Demo Data Before Building Upload Flow

Built the full upload pipeline before populating the demo account. The app was tested with empty closets until day 13. Pre-photograph and pre-tag demo wardrobe items in week 1 — the app should be demo-able from the first build.

### 3. Split Embedding Service into Separate Package

embeddingService.ts had too many responsibilities: CLIP inference, pgvector storage, semantic search, AND outfit composition logic. Outfit composition should be a separate Claude-API-only service; embedding service should focus only on upload → embed → store.

### 4. Build the GIN Index Correctly in First Migration

`USING GIN(user_id, occasions)` was invalid PostgreSQL syntax from day 1. A CREATE INDEX that silently creates the wrong thing ships and fails at query time. Test migration SQL against local PostgreSQL before committing.

### 5. Named ClothingTags Type Consistently Across Files

taggingService.ts exports ClothingTags but ReviewTagsScreen.tsx was typed with AITagResult from types/index.ts. These had identical shapes but different names, causing phantom import errors. Use a single type definition from one canonical location.

---

## Document Provenance

| Section | Source Documents |
|---------|----------------|
| Problem Framing | briefs/01-product-brief.md, 02-plans/03-mvp-scope.md |
| CLIP decision | 01-analysis/02-ml-evaluation.md, 02-plans/02-ml-pipeline.md |
| pgvector decision | 01-analysis/02-ml-evaluation.md |
| Claude Vision decision | 02-plans/02-ml-pipeline.md |
| K-means++ / k=5 | styleDnaService.ts |
| Beta-Binomial | preferenceLearningService.ts |
| MiniMax vs FASHN | minimaxAvatarService.ts |
| GIN index fix | migrations/001_initial_schema.sql |
| NOW() index fix | migrations/006_dead_weight_rpc.sql |
| Magic Bar discoverability | 04-validate/001-redteam-perspectives.md |
