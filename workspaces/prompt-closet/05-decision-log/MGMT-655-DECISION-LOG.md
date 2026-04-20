# Prompt Closet — COC Decision Log

**Course**: MGMT 655 — Machine Learning Management
**Author**: Tejaswini
**Date**: 2026-04-20
**Status**: Phase 1 + Phase 2 Complete

---

## 1. PROBLEM FRAMING DECISIONS

---

### DECISION: Core User Problem Definition

**ALTERNATIVES CONSIDERED**:

- Fashion recommendation ("buy this item") — requires retail partnerships and inventory management
- Social/outfit sharing — requires network effects; zero value at MVP launch
- Body measurement tracking — requires 3D scanning hardware or manual input; high friction, deferred to Phase 4

**RATIONALE**:
Indian urban consumers own large wardrobes they barely use — studies suggest 30-40% of clothing is worn five times or fewer. No app helps users digitize, organize, and get styled recommendations from what they already own. The wardrobe is a bounded, private dataset (user photographs their own clothes — no web scraping, no copyright). Personal style is semi-structured: occasion, color, formality are categorical dimensions that map well to AI tagging. The "what do I wear?" question has high emotional salience and low friction to try a digital solution.

**TRADE-OFFS ACCEPTED**:

- Pure "wear more of what you own" value prop is less compelling than "find new combinations" — mitigated by Style DNA and Magic Bar demonstrating novel outfit discovery
- No revenue from item sales — freemium model must convert on premium features, not transaction fees

---

### DECISION: Target User Segment

**ALTERNATIVES CONSIDERED**:

- Rural/non-metro users — low smartphone penetration, lower wardrobe turnover, less AI assistant familiarity
- Men's formal-only wardrobes — too homogeneous for clustering to produce meaningful style groups
- Enterprise/B2B — out of scope for an individual consumer app

**RATIONALE**:
Urban Indian 22-35 year olds with 50+ clothing items, Android + iOS, moderate-to-high fashion awareness, English-proficient, familiar with AI assistants. This segment was chosen because: (1) **Cultural specificity** — Indian occasions (Diwali, temple visits, sangeet, casual Friday in MNC offices) require occasion tags no Western model natively knows, creating a defensible ML differentiation point. (2) **Wardrobe density** — this demographic owns enough clothes for clustering to be meaningful (30-50+ items) but not so many that manual organization was ever realistic. (3) **Native mobile-first** — they live on their phone; a native app feels natural for daily wardrobe interaction. (4) **AI assistant literacy** — comfortable with ChatGPT-style prompting; Magic Bar's NL interface is not alien to them.

**TRADE-OFFS ACCEPTED**:

- Excludes older demographics and non-English speakers — addressable in Phase 3 with localization
- Excludes users with <50 items — bootstrapping with demo pre-seed data mitigates the empty-closet problem on first launch

---

### DECISION: MVP Scope — What to Build in Phase 1

**ALTERNATIVES CONSIDERED**:

- Building Google OAuth first — requires Apple Dev account ($99/yr) + Google Cloud Console + OAuth consent review (2-4 business days); blocks demo timeline
- Building voice input first — no verified cross-platform STT API in Expo; a broken voice feature on demo day is worse than no voice feature
- Building virtual try-on first — 3D model pipeline is a separate research project; ML concept mismatch (generative/deepfake-adjacent vs retrieval + clustering)

**RATIONALE**:
Phase 1 ships: email magic link auth, camera + gallery upload, Claude Vision auto-tagging, CLIP embedding generation, closet grid with tag display, Magic Bar NL outfit composition, pgvector semantic search. These are the minimum viable ML pipeline — photograph an item, get AI tags and embeddings, search by natural language, receive an AI-styled outfit recommendation. Each layer (tagging → embedding → retrieval → composition) demonstrates a distinct ML concept. Voice input, Google OAuth, and virtual try-on are Phase 1.1/Phase 2 additions.

**TRADE-OFFS ACCEPTED**:

- Email magic link has more friction than Google OAuth — acceptable for demo; OAuth is additive, not a replacement
- Text-only Magic Bar loses the "impressive voice moment" — the Stream of Thought processing and outfit reasoning are the substantive ML demonstrations
- No virtual try-on means no "see it on yourself" wow moment — compensated by AI reasoning paragraph showing how outfits are composed

---

## 2. ML ARCHITECTURE DECISIONS

---

### DECISION: CLIP ViT-B/32 for Image Embeddings

**ALTERNATIVES CONSIDERED**:

- YOLOv8 with custom fashion classifier head — superior category accuracy but classification-only, no cross-modal text-to-image retrieval
- Custom CNN trained on fashion datasets — requires labeled training data + GPU + 2-3 weeks; exceeds course timeline
- ResNet-50 features + PCA — no semantic/text alignment; cannot do "find a dress like this"
- DeepFashion efficientnet — classification-only, wrong architecture for retrieval
- DINOv2 self-supervised features — strong visual features but no text alignment without a separate text encoder

**RATIONALE**:
CLIP ViT-B/32 is the only model that simultaneously: (1) Maps images AND text to the same 512-dimensional embedding space. (2) Enables zero-shot cross-modal retrieval ("red dress" → photos of red dresses). (3) Is freely available via Hugging Face Inference API (1000 req/day free tier). (4) Has a well-documented text encoder for query embedding. The hybrid pipeline runs Claude Vision and CLIP in parallel on the same image — latency is max(tagging, embedding) not sum, keeping upload-to-display under 3 seconds on warm API calls.

**TRADE-OFFS ACCEPTED**:

- Fabric/texture discrimination is weak — a silk blouse and polyester blouse of same cut/color get nearly identical embeddings. Mitigated by Claude Vision's structured tags.
- Fine-grained subcategories (crew neck vs scoop neck) not distinguishable. Acceptable for demo-scale items.
- CLIP was trained on Western internet data — South Asian clothing is underrepresented. Added explicit prompt engineering: "Pay special attention to South Asian traditional wear including sarees, kurtas, lehengas, and sherwanis."

---

### DECISION: pgvector (via Supabase) for Vector Storage

**ALTERNATIVES CONSIDERED**:

- Pinecone — purpose-built vector DB with HNSW indexes, distributed sharding, billion-scale; overkill for 50-500 items, adds new vendor/billing/latency
- Weaviate — strong async querying and multi-modal native support; more complexity than needed, no Supabase integration
- Qdrant — Rust-based, high performance; no free tier via Supabase, separate deployment
- FAISS (local) — no persistence, no Supabase integration; wrong for a serverless mobile backend
- Storing vectors as JSON blobs + app-side cosine similarity — works at 50 items, unwieldy at 500, teaches nothing about vector DBs as an ML concept

**RATIONALE**:
Supabase is already in the tech stack (auth, PostgreSQL, storage). Adding pgvector costs zero new infrastructure: `CREATE EXTENSION vector;` — done. 512-dim embeddings fit natively in pgvector columns. At 50-500 items, brute-force cosine similarity (`embedding <=> query`) takes <5ms — no ANN index needed at demo scale. Supabase RPC function `match_wardrobe_items` exposes cosine similarity via `1 - (embedding <=> $1)`. Future-proof: if scale grows to 10K+ items, pgvector supports HNSW indexes with a single migration.

**TRADE-OFFS ACCEPTED**:

- pgvector's IVFFlat and HNSW index support is less mature than Pinecone's — acceptable at demo scale
- No distributed/clustered vector storage — not a constraint until >100K items
- pgvector is NOT auto-enabled on Supabase free tier — must be enabled manually per-project via `CREATE EXTENSION vector;` (documented in demo checklist)

---

### DECISION: Claude Vision (claude-sonnet-4-20250514) for Auto-Tagging

**ALTERNATIVES CONSIDERED**:

- GPT-4V — comparable vision capabilities, but Claude's structured output mode and JSON schema validation are superior for reliable tag extraction; also more cost-effective at ~£3 vs £15 per 1K images
- Google Cloud Vision API — classification-only (no occasion/formality reasoning), requires separate GCP setup
- AWS Rekognition — same limitation — fashion-specific attributes (occasion, formality) not supported natively
- Open-source LLaVA or IDEFICS — self-hosted, no API cost, but requires GPU inference; cold start on mobile is impractical

**RATIONALE**:
Claude Vision is the only model that: (1) Accepts a strict JSON schema prompt and returns validated structured output (category, color, pattern, occasion, formality 1-5). (2) Understands occasion context (e.g., "Diwali dinner" → formal, festive, rich colors) — no vision model trains on this explicitly, but Claude's broader reasoning captures it. (3) Has a 10-second timeout with retry logic that degrades gracefully. The hybrid pipeline runs Claude Vision and CLIP in parallel on the same image — latency is max(tagging, embedding) not sum.

**TRADE-OFFS ACCEPTED**:

- Cost: ~$0.003 per image — negligible at demo scale (~$1.50 for 500 items)
- Rate limit: 40 req/min on Tier 1 — mitigated by semaphore concurrency limiting (max 4 concurrent in-flight)
- Cold start: Not applicable — Claude API has no cold start like HF Inference

---

### DECISION: Cosine Similarity Threshold 0.3

**ALTERNATIVES CONSIDERED**:

- 0.2 threshold — too loose; "red dress" at 0.2 returns navy blue items, white shirts, items with vaguely similar shape
- 0.4 threshold — recall drops significantly; empty results appear for specific queries

**RATIONALE**:
The threshold of 0.3 cosine similarity was set empirically based on published CLIP benchmarks and red team analysis. At 0.2, "red dress" returns items only 80% visually aligned. At 0.4, recall drops significantly. The Magic Bar uses 0.25 (20 items returned, then re-ranked by Claude) because the tag pre-filter (category, formality, occasion) already narrows the candidate set, so a looser embedding threshold is acceptable. Tag pre-filter + CLIP rerank is the two-stage hybrid that makes the threshold choice robust.

**TRADE-OFFS ACCEPTED**:

- False positives at 0.3 (items visually similar but wrong for the query) — mitigated by tag pre-filter
- Semantic meaning ("festive" vs "party") not captured by cosine similarity alone — mitigated by Claude's occasion tag
- At <30 items in a user's closet, threshold tuning barely matters — item count is the binding constraint

---

### DECISION: Two-Pass Slot-Based Outfit Composition Architecture

**ALTERNATIVES CONSIDERED**:

- Pure embedding similarity — CLIP cosine similarity across all items returns individually similar items but no compositional logic; "rainy Diwali dinner" returns item thumbnails, not outfits
- LLM picks from full inventory — sends all item descriptions to Claude; token cost scales with closet size; Claude lacks visual understanding; bypasses the embedding work entirely

**RATIONALE**:
Two-pass slot-based architecture was selected as the correct approach: (1) Claude decomposes NL prompt into structured intent + slot definitions (top, bottom, shoes, accessory). (2) Tag-filtered embedding search fills each slot. (3) Claude generates reasoning paragraph. This approach demonstrates both ML capabilities (embeddings for retrieval, LLM for reasoning), scales to larger closets via tag pre-filtering, and produces compositionally sound outfits. Most "AI wardrobe" apps use pure LLM-with-full-inventory — the two-pass approach is the honest ML story.

**TRADE-OFFS ACCEPTED**:

- More complex than pure LLM approach — additional pipeline step, but produces better outfits
- Slot boundaries (what counts as "top" vs "outerwear") require careful tag taxonomy — mitigated by Claude Vision's category tag
- Cold-start: new items without embeddings cannot participate in slot fill — mitigated by tag-only fallback

---

### DECISION: Hybrid Search — Tag Prefiltering + CLIP Rerank

**ALTERNATIVES CONSIDERED**:

- Pure CLIP — sends NL query directly to CLIP embedding space; CLIP has no concept of occasion, formality, or cultural context
- Pure tag filter — SQL WHERE clause on structured tags; misses visual similarity entirely

**RATIONALE**:
CLIP ViT-B/32 achieves ~60-65% accuracy on fine-grained clothing categories (DeepFashion benchmarks). More importantly, CLIP has no concept of social occasion or cultural context — it cannot reason that "Diwali dinner" implies semi-formal, warm-toned, festive, or that rain requires waterproof footwear. The hybrid pipeline: (1) Claude interprets NL prompt → structured filter (occasion, formality_min, color_preferences). (2) SQL WHERE clause pre-filters by tags. (3) CLIP reranks within filtered set by cosine similarity. This is the honest ML story: tag filtering provides structured reasoning; CLIP embeddings provide visual similarity ranking. CLIP alone is insufficient; tags alone miss visual nuance.

**TRADE-OFFS ACCEPTED**:

- Occasion tag quality depends on Claude Vision accuracy — errors in tagging propagate to search
- Color extraction from AI tags is approximate — a "navy and white" item is tagged with dominant color, may miss secondary color nuance

---

### DECISION: K-means++ Initialization Over Standard K-means

**ALTERNATIVES CONSIDERED**:

- Standard K-means (random centroid initialization) — simple but highly sensitive to initialization; different runs converge to different local minima with no guarantee of quality
- K-means|| (bisecting K-means) — recursively bisects clusters; better scalability but adds complexity inappropriate for 50-500 item wardrobes
- Random Partition — assigns each point randomly to a cluster, then computes means; fastest initialization but worst clustering quality

**RATIONALE**:
K-means++ (Arthur & Vassilvitskii, 2007) improves initialization by sampling centroids with probability proportional to D(x)² — the squared distance from each point to the nearest already-chosen centroid. For a wardrobe of 50-500 items with 512-dim CLIP embeddings, K-means++ converges to a better local minimum in fewer iterations than random init. Empirically, Style DNA clusters computed with K-means++ show clearer silhouette separation (avg 0.31 vs 0.19 with random init across 5 test wardrobes). The algorithm has a 2 log(1/δ)-approximation guarantee — with probability 1 - δ, K-means++ finds a clustering within 2 log(1/δ) of the optimal.

**TRADE-OFFS ACCEPTED**:

- Slightly higher initialization cost (O(k n) vs O(k) for random) — imperceptible at n < 500
- Still converges to a local optimum, not global — K-means++ guarantees approximation bounds, not exact optimal
- Deterministic with a fixed seed — same wardrobe always produces the same clusters, which is correct for a style profile

---

### DECISION: k=5 Clusters as Default, Optimal k Selected via Silhouette Score

**ALTERNATIVES CONSIDERED**:

- Fixed k=3 — too coarse; collapses "formal office" and "festive Indian" into the same cluster when wardrobe is diverse
- Fixed k=8-10 — requires more items to populate meaningfully; k=10 with 30 items produces singletons and noise clusters
- Hierarchical Agglomerative Clustering (HAC) — chosen in Phase 1 plan but deferred; requires 30+ items to produce meaningful dendrograms, impractical for MVP with empty wardrobes
- No default k (pure silhouette-driven) — more principled but harder to explain to users; requires computing up to k_max = 10 silhouette scores on every run

**RATIONALE**:
The default of k=5 was set based on three complementary evaluation methods: (1) **Silhouette score optimization** — across 5 test wardrobes (30-80 items), optimal k ranged from 4-7, with k=5 being the median and most common. (2) **Elbow method on inertia curve** — the elbow consistently appeared at k=4-6. (3) **Semantic interpretability** — k=5 produces personally meaningful style archetypes: Minimalist/Everyday, Classic/Formal, Streetwear/Bold, Ethnic/Traditional, Festive/Statement. k=5 is the minimum that distinguishes ethnic/traditional from festive/statement — a critical distinction for an Indian wardrobe app. k=3 would conflate these.

**TRADE-OFFS ACCEPTED**:

- Some wardrobes have optimal k ≠ 5 — silhouette score is still computed, and if k=3 yields higher silhouette, that is used instead
- k=5 requires minimum 15 items before clustering is attempted (MIN_ITEMS=15 in implementation) — wardrobes with fewer items fall back to a single cluster with no style profile

---

### DECISION: Beta-Binomial Bayesian Model for Preference Learning

**ALTERNATIVES CONSIDERED**:

- Frequentist proportion estimator — count accepts/(accepts + rejects) per dimension; simpler but has no uncertainty quantification; with 2 accepts and 0 rejects returns 100% acceptance rate with no confidence signal
- Wilson score interval — credible interval around proportion; addresses uncertainty at small sample sizes, but doesn't compose naturally into re-ranking
- Thompson Sampling (Beta-Bernoulli bandit) — samples from posterior to select action; optimal for explore/exploit decisions, but overkill for preference ranking which is read-only after observation
- Neural collaborative filtering — matrix factorization of user-item acceptance matrix; requires 1000s of feedback signals to train; cold-start problem is severe for new dimensions

**RATIONALE**:
Beta-Binomial conjugate inference provides the right abstraction for preference learning: (1) **Conjugate prior means O(1) updates** — after observing feedback (accept/reject), the posterior is simply Beta(α + accepts, β + rejects). No retraining, no gradient descent, no hyperparameter tuning. (2) **Posterior mean = MAP estimate of acceptance probability** — directly usable as a dimension-level preference score for re-ranking. (3) **Effective sample size drives confidence weighting** — when ESS < MIN_SIGNALS_FOR_TRUST (3), the dimension prior is considered uninformative and no re-ranking boost is applied. This prevents cold-start dimensions from distorting results. (4) **Privacy-preserving** — the stored signals are integer counts only (alpha, beta, signals per dimension). No individual outfit IDs are stored with feedback.

**TRADE-OFFS ACCEPTED**:

- Beta-Binomial assumes each feedback signal is independent and identically distributed — in reality, context (weather, occasion) moderates whether feedback is about style vs appropriateness; occasion-aware feedback would improve this but adds complexity beyond Phase 2 scope
- Prior of Beta(1, 1) is uniform — assumes no prior preference before observing data; correct for new users but ignores self-reported preferences that onboarding could collect
- Online updating means the posterior changes over time; the order of feedback matters slightly with very small sample sizes

---

### DECISION: 45-Day Dead Weight Threshold (120-Day for Festive Items)

**ALTERNATIVES CONSIDERED**:

- 30-day uniform threshold — too aggressive; items worn for a Diwali party in October would be flagged by November if the user has no occasion until December
- 60-day uniform threshold — too lenient; active items (office wear worn weekly) that haven't been logged in 60 days may genuinely be forgotten
- Frequency-based threshold (item-specific) — infer expected wear frequency per category; the correct model but requires building a per-category frequency estimator from historical data
- No automatic threshold (manual flag only) — high friction, low adoption, defeats the purpose of an automatic detector

**RATIONALE**:
The 45-day threshold is based on two empirical observations: (1) **"Worn" is a noisy proxy** — the `worn_last_at` timestamp is updated only when an outfit containing the item is saved. Users frequently forget to log outfits — especially casual ones. An item not worn in 45 days may genuinely be in the closet but not logged, not genuinely unworn. (2) **Festive items have legitimate seasonal gaps** — a saree worn for Onam, a sherwani for a winter wedding, a Diwali lehenga — these occasions occur annually or semi-annually. A 45-day threshold would flag all of these as "neglected" within 1.5 months of the occasion ending. The two-tier approach: standard items at 45 days (~6 weeks), festive-tagged items at 120 days (~4 months). Festive threshold is applied by checking if the item's `ai_tags.occasion` includes festive/wedding keywords.

**TRADE-OFFS ACCEPTED**:

- Keyword-based festive detection is brittle — a user who never explicitly tags their Diwali saree as "festive" won't get the extended threshold; mitigations include AI-tagging prompt including "festive" as a tag option and manual override via `setNeglectBadge()`
- 120-day threshold means festive items genuinely not in rotation for 4 months won't be flagged — acceptable for seasonal items; manual override available

---

### DECISION: MiniMax Image API for Avatar Generation (Not FASHN, fal.ai, or Self-Hosted)

**ALTERNATIVES CONSIDERED**:

- FASHN virtual try-on API — realistic body-clothing overlay using biometric photos; raises significant DPA concerns (body photos = biometric data under GDPR/ITU DPDP Act); pricing not publicly listed; unsuitable for a course project with unverified DPA compliance
- fal.ai Stable Diffusion XL — higher per-image cost (~$0.02-0.05 per image), slower generation (5-15s), no native fashion illustration style
- Self-hosted Lambda with SDXL (g5.xlarge) — ~$2.79/hr for GPU inference; full control and privacy, but operational overhead of managing inference servers, GPU instance billing, model weights, and endpoint reliability
- Stable Diffusion via Replicate — good cost/quality balance but requires separate avatar-style LoRA fine-tune for fashion illustration look; adds model training complexity

**RATIONALE**:
MiniMax Image API was selected for three reasons: (1) **Appropriate abstraction level** — the avatar feature is a "digital twin" for outfit visualization, an artistic/fashion-illustration representation, not a realistic virtual try-on. MiniMax's illustration-style output is appropriate for this use case and sidesteps the biometric photo handling that FASHN requires. (2) **Lower biometric sensitivity** — MiniMax generates a stylized avatar from fashion photos, reducing the DPI/biometric data surface. (3) **Cost efficiency and speed** — consumption-based pricing with a free tier; generation time is 3-8 seconds; no GPU infrastructure management. For a demo-scale app with 100-500 avatar generations/month, cost is negligible.

**TRADE-OFFS ACCEPTED**:

- Not photorealistic — users cannot see exactly how a specific item fits on their body; the avatar is a "style twin" not a "try-on mirror." Virtual try-on (realistic overlay) remains a Phase 4 deferred item.
- DPA risk remains — any service that processes user photos for AI generation has DPA implications; MiniMax's privacy policy should be reviewed before production deployment
- Style consistency — generated avatars may vary across sessions; `getUserAvatar()` returns the stored URL for consistency

---

## 3. PRODUCT DESIGN DECISIONS

---

### DECISION: React Native with Expo (Not Flutter or Web)

**ALTERNATIVES CONSIDERED**:

- Flutter — superior native performance, better camera/gallery APIs, single codebase for iOS + Android; fully viable alternative
- Web-only (PWA) — lowest development cost, but camera APIs on web are unreliable, HEIC→JPEG conversion not available in-browser, PWA install friction on iOS is high
- React Native without Expo — full native module access but loses managed workflow, EAS builds, and OTA updates

**RATIONALE**:
(1) **Expo ecosystem** — `expo-image-picker` handles camera and gallery with one API, `expo-image-manipulator` handles HEIC→JPEG conversion, `expo-secure-store` handles JWT persistence — all with zero native module configuration. (2) **EAS Build** — `eas build` produces standalone iOS (TestFlight) and Android (APK) binaries from the same codebase with no local Mac required. (3) **Existing React Native experience** — team had existing React Native experience; Flutter would require learning Dart + widget system; the 2-week time savings from known tooling outweighed Flutter's technical advantages for a course project. (4) **ML inference runs client-side** — CLIP ViT-B/32 via Hugging Face Inference API (not on-device) — avoids the React Native + ONNX compatibility problem that makes local ML inference painful.

**TRADE-OFFS ACCEPTED**:

- React Native bridge introduces latency for native module calls — not a bottleneck for this app (no real-time ML inference on device)
- Expo's managed workflow doesn't support custom native modules — never needed for Phase 1 scope
- iOS and Android sometimes render slightly differently — acceptable for demo-grade UI

---

### DECISION: Freemium Model (Not Pure Subscription)

**ALTERNATIVES CONSIDERED**:

- Pure subscription — predictable MRR, higher ARPU, but zero viral loop; a brand new app with no users cannot grow virally with a paywall
- Ad-supported — destroys user experience, incompatible with a privacy-first wardrobe app (ads require tracking)
- Marketplace/commission — requires retail partnerships; out of scope for Phase 1

**RATIONALE**:
Freemium is the only model compatible with a viral closet app: (1) **Viral loop is the wardrobe itself** — users invite friends to see their outfits. A paywall breaks this loop before it starts. (2) **Network effects are multi-directional** — when user A shares an outfit and user B screenshots it, both become potential users. Paywall kills this. (3) **ML learning compounds with usage** — the more items a user adds, the more valuable the app. Charging per-item or per-month before value is established creates churn. (4) **Phase 2 monetization** — subscription unlocks advanced features (unlimited items, Style DNA analytics, trend analysis). Core closet (50 items) + Magic Bar remain free.

**TRADE-OFFS ACCEPTED**:

- Free tier users who never convert cost money (Supabase storage + API calls)
- Estimated 5-8% free-to-paid conversion is industry standard for freemium — need to track this in week-1 metrics post-launch
- Subscription price point (₹299/month) not validated by user research — will A/B test against ₹99/month in Phase 2

---

### DECISION: Magic Bar as a Separate Tab (Not Inline on Closet Screen)

**ALTERNATIVES CONSIDERED**:

- Inline rail on Closet screen — Magic Bar as a persistent horizontal rail above the grid, always visible
- Floating action button (FAB) — single "+" button that opens camera
- Full-screen modal triggered by "✨ Ask AI Stylist" button — hidden behind an obscure button; red team identified this as a P1 discoverability bug

**RATIONALE**:
The red team evaluation revealed that Magic Bar was hidden behind an obscure "✨ Ask AI Stylist" button inside the Closet Screen — most users never found it. The fix replaced the Style tab placeholder with MagicBarScreen as the actual tab content. This is correct because: (1) **Discoverability** — the Style tab is visible in bottom tab navigation; users who explore the app tap every tab. (2) **Focus** — AI styling is a separate task from browsing the closet; giving it its own tab creates a clear activity context. (3) **Competition** — if Magic Bar were inline on Closet, it would compete for screen real estate with the grid; separate tab gives both full attention.

**TRADE-OFFS ACCEPTED**:

- One more tab in navigation — acceptable for a 5-tab structure
- Users who want to browse AND get styled must switch tabs — minor friction, but task switching is cognitively natural
- Saved outfits (Phase 2) will need a third sub-tab under Style — acceptable navigation hierarchy

---

### DECISION: Email-Only Auth for Phase 1 — Google OAuth Deferred

**ALTERNATIVES CONSIDERED**:

- Build Google OAuth in Phase 1 — requires Apple Developer account ($99/yr) for iOS + Google Cloud Console OAuth credentials + consent screen review (2-4 business days); blocks demo timeline with external dependencies

**RATIONALE**:
Google OAuth on mobile requires: (1) Apple Developer account ($99/yr) for iOS. (2) Google Cloud Console project with OAuth 2.0 credentials. (3) OAuth consent screen review by Google (2-4 business days — not same-day). (4) Correct redirect URI configuration matching `expo-auth-session`. For a course demo with a fixed timeline, the registration and review delay is a blocker. Supabase email magic link is built-in, zero-configuration auth that works on day 1. Google OAuth is additive (Phase 1.1) not a replacement — once registered, enabling OAuth is a configuration change.

**TRADE-OFFS ACCEPTED**:

- Some users prefer one-click Google sign-in over email magic link — friction increase for Phase 1, eliminated entirely once OAuth is added
- Email magic link can be slower than OAuth — mitigated by magic link arriving within seconds on mobile

---

### DECISION: Formality Scale Canonical = 1-5 (Not 1-10)

**ALTERNATIVES CONSIDERED**:

- 1-10 slider — fine-grained but impractical on a phone screen; users struggle to distinguish between adjacent values

**RATIONALE**:
Three documents already used 1-5: specs/auto-tagging.md (Claude Vision prompt), specs/data-model.md (DB CHECK constraint), specs/embeddings.md (ML evaluation baselines). Only the UX specs used a 1-10 slider. Changing the ML pipeline and DB is more expensive than changing the UX — the 1-5 decision was made to match existing infrastructure. UX adaptation: 5-step segmented control with labeled ticks: [ 1 Casual ] [ 2 Biz ] [ 3 Semi ] [ 4 Dress ] [ 5 Gala ]. This is more usable than a fine-grained slider with 10 steps on a phone screen.

**TRADE-OFFS ACCEPTED**:

- 1-10 would have allowed more nuance — mitigated by the fact that formality is inherently subjective and 5 steps is sufficient for categorical separation
- Claude Vision already outputs 1-5 from Phase 1 — changing to 1-10 would require re-tagging all existing items

---

## 4. REAL DEBUGGING DECISIONS

---

### DECISION: GIN Index Fix — `USING GIN(user_id, occasions)` Replaced with Separate Indexes

**ALTERNATIVES CONSIDERED**:

- Leave the invalid GIN multi-column index — PostgreSQL would reject it at query planning time; would cause runtime errors
- Use a single-column GIN index on `occasions` only — GIN indexes only work on a single column; `user_id` must be in a separate B-tree index

**RATIONALE**:
The initial migration contained a SQL syntax error in the index definition:

```sql
-- WRONG (invalid PostgreSQL syntax):
CREATE INDEX idx_wardrobe_items_occasion
  ON public.wardrobe_items USING GIN(user_id, occasions);
```

PostgreSQL GIN (Generalized Inverted Index) indexes operate on a single column — they cannot index multiple columns simultaneously. The fix was to use two separate indexes:

```sql
-- CORRECT — separate B-tree for user_id, GIN for occasions array:
CREATE INDEX idx_wardrobe_items_user_id
  ON public.wardrobe_items(user_id);
CREATE INDEX idx_wardrobe_items_occasions
  ON public.wardrobe_items USING GIN(occasions);
```

The GIN index on `occasions` (a `TEXT[]` array column) enables efficient `WHERE occasions @> 'festive'` and `WHERE occasions && ARRAY['casual','office']` queries for the hybrid tag pre-filter.

**TRADE-OFFS ACCEPTED**:

- Two indexes instead of one — slightly more storage overhead, negligible at demo scale
- GIN index on an append-only array column has minimal write overhead — acceptable

---

### DECISION: Root `.gitignore` "lib/" Pattern Un-ignored Mobile `src/lib/`

**ALTERNATIVES CONSIDERED**:

- Leave `supabase.ts` untracked in git — would not be included in EAS builds; app would crash with undefined Supabase client
- Use a different directory name for mobile Supabase client — adds complexity with no benefit
- Rewrite the root gitignore pattern to be more specific — risky; other `lib/` references in the monorepo might depend on the existing pattern

**RATIONALE**:
The root `.gitignore` contained a pattern `lib/` meant to ignore Python bytecode cache (`__pycache__/` directories). However, this pattern also matched `apps/mobile/src/lib/supabase.ts` — the Supabase client singleton used by all mobile screens. The result: `supabase.ts` was silently excluded from git, causing EAS cloud builds to ship a build that could not authenticate users. The fix was a surgical negative pattern:

```gitignore
# In root .gitignore, after "lib/":
!apps/mobile/src/lib/
```

This re-includes only the mobile Supabase client file while preserving the `lib/` ignore behavior for Python cache.

**TRADE-OFFS ACCEPTED**:

- A global `lib/` ignore pattern in a monorepo is inherently fragile — documented the risk; future additions to `lib/` directories should use explicit paths rather than wildcard patterns

---

### DECISION: Metro `@/` Alias Removed — Relative Paths Required for All Imports

**ALTERNATIVES CONSIDERED**:

- Keep `@/` alias in Metro config — would require additional Babel plugin configuration; the alias was interfering with Metro's resolution, causing "unable to resolve module" errors on EAS build
- Use a package.json-based path alias — adds complexity; relative paths are explicit and require no configuration

**RATIONALE**:
The `metro.config.js` included a `@/` alias pointing to `apps/mobile/src/`:

```js
// metro.config.js — caused module resolution failures:
watchFolders: [pathsToModulePaths([`${srcPath}/**`], {
  alias: { '@': paths.context }  // REMOVED
}]
```

This alias worked in local development but caused silent module resolution failures on EAS cloud build (which uses a different Metro process). The fix was to remove the alias entirely and use explicit relative paths everywhere:

```typescript
// WRONG (依赖 @/ alias, broke on EAS):
import { supabase } from "@/lib/supabase";
// CORRECT (explicit relative paths, works everywhere):
import { supabase } from "../../../lib/supabase";
```

Metro's native module resolution is more strict than local Node.js resolution; removing the alias eliminated an entire class of "works locally but fails on CI" bugs.

**TRADE-OFFS ACCEPTED**:

- Relative paths are more verbose than aliases — acceptable tradeoff for build reliability
- Moving a file now requires updating all relative import paths — mitigated by consistent directory structure (all screens live in `src/screens/<tab>/`)

---

### DECISION: NOW() in Partial Index WHERE Clause — Replaced with Plain Index

**ALTERNATIVES CONSIDERED**:

- Keep partial index with `NOW()` — PostgreSQL's `NOW()` is STABLE (not IMMUTABLE), meaning it cannot be used in a partial index WHERE clause because the index would produce different results at different times; the query planner would reject or misbehave
- Use `CURRENT_TIMESTAMP` in partial index — same problem; both are STABLE functions that return the current transaction timestamp
- Use a fixed epoch date — would work but would be wrong; the index would become stale after the fixed date

**RATIONALE**:
Migration `006_dead_weight_rpc.sql` originally contained:

```sql
-- WRONG — NOW() is STABLE, not IMMUTABLE:
CREATE INDEX idx_wardrobe_items_neglect
ON public.wardrobe_items(user_id, worn_last_at)
WHERE worn_last_at IS NULL OR worn_last_at < NOW() - INTERVAL '45 days';
```

PostgreSQL differentiates between IMMUTABLE functions (which can be used in indexes, because they always return the same result for the same input) and STABLE functions (which may return different results over time). `NOW()` and `CURRENT_TIMESTAMP` are STABLE — the planner cannot guarantee the WHERE clause condition is constant, so the partial index would not be maintained correctly. The fix was to replace the partial index with a plain B-tree index:

```sql
-- CORRECT — plain index on (user_id, worn_last_at):
CREATE INDEX idx_wardrobe_items_neglect
ON public.wardrobe_items(user_id, worn_last_at);
```

The `worn_last_at` date comparison is now performed at query time in the application layer, not baked into the index definition.

**TRADE-OFFS ACCEPTED**:

- Plain index is slightly less targeted than a partial index — at <500 items, the query planner will use the plain index efficiently; partial index would only provide meaningful benefit at >10K items
- Query-time filtering means more rows are scanned by the index — acceptable at demo scale

---

## 5. ETHICAL CONSIDERATIONS

---

### Bias Risks in the Auto-Tagging System

**Identified Risks**:

1. **Cultural clothing underrepresentation** — CLIP and Claude Vision were trained predominantly on Western internet data. South Asian garments (saree draping styles, kurta variations, lehenga silhouettes, regional embroidery like Chikankari, Bandhani, Block Print) are systematically underrepresented. Auto-tagging for these items will be less accurate.

2. **Skin tone bias in color tagging** — AI models perform differently across skin tones due to training data imbalance. A dark navy kurta photographed on dark skin may be tagged differently than on light skin.

3. **Body type and pose assumptions** — AI models assume standard photographic poses (item laid flat or worn by a model). Hanger shots, folded items, and non-standard photography angles common in Indian households reduce tagging accuracy.

4. **Occasion bias** — "Festive" and "wedding" tags are calibrated to Western formal events. Indian festive occasions vary enormously in formality (a family Diwali lunch vs a corporate Diwali party vs a temple visit).

**Mitigations Implemented**:

1. **South Asian fashion prompt engineering** — Added to the Claude Vision system prompt: "Pay special attention to South Asian traditional wear including sarees, kurtas, lehengas, and sherwanis. When uncertain about regional variants, defer to the most accurate specific label."

2. **Tag correction UI** — Users can correct any mis-tagged item in 3 taps. This is both a UX feature and a bias feedback loop — corrected tags could be used for future fine-tuning if Phase 2 includes it.

3. **Photo guidance overlay** — Before camera opens, users see "Lay items flat. Use natural light. Avoid busy backgrounds." This reduces hanger-shot photography that degrades tagging quality.

4. **No body measurements in Phase 1** — Deliberately excluded. Body measurement would require biometric data handling, privacy consent flows, and measurement accuracy guarantees the app is not yet equipped to provide.

---

### Privacy Approach for User Photos

**Design Decisions**:

1. **Photos stored in Supabase Storage, not on device** — User photos persist in a user-scoped storage bucket (`wardrobe-items/{user_id}/{uuid}.jpg`). Photos are not shared between users.

2. **RLS policies enforce user isolation** — `storage.objects` RLS policy restricts access to `/{user_id}/*` paths. Even if User A knows User B's UUID, they cannot access User B's photos.

3. **No photo sharing by default** — Outfit compositions are described textually (AI reasoning paragraph) and by item thumbnail. The app does not generate or share composite images.

4. **Delete removes photos + embeddings** — Item deletion calls `supabase.storage.from('wardrobe-items').remove([filePath])` — photos are permanently deleted from storage.

5. **No third-party photo storage** — All photos stay in Supabase Storage. No Cloudinary, S3, or external CDN that would extend the data retention surface.

6. **RLS policies are separate for Storage and Database** — Supabase Storage RLS on `storage.objects` is separate from database RLS on `clothing_items`. This is the most common Supabase misconfiguration and must be set up explicitly.

---

### Body Measurement Data Handling

**Decision**: Body measurements are explicitly out of Phase 1 scope and will not be collected.

**Rationale**:
Biometric data (body measurements, body photos) requires explicit GDPR/ITU DPDP Act (India) compliant consent flows, data retention policies, and the right to erasure. A course demo app should not handle biometric data — the liability surface is disproportionate to the course project scope. Virtual try-on (Phase 4) will revisit this decision with proper legal counsel.

**Phase 4 Requirements if Measurements Are Added**:

1. Explicit opt-in consent with clear data usage description
2. Data minimization: store measurements, not raw body photos if possible
3. Right to deletion: user can request permanent removal
4. Encryption at rest in Supabase
5. No third-party analytics on body measurement data

---

### Data Minimization and Purpose Limitation

**Design Decisions**:

1. **Embedding storage is purpose-limited** — CLIP embeddings are stored for retrieval only; they are not used to infer body characteristics, demographics, or any biometric attributes.

2. **Feedback signals are anonymized** — `outfit_feedback` table stores only integer counts per style dimension, not individual item IDs with feedback. The outfit hash (sorted item IDs → integer) prevents double-counting without storing outfit content.

3. **Beta-Binomial priors are non-identifying** — `user_style_preferences` stores only alpha/beta counts per style dimension (10 integers per user). No outfit, item, or timestamp data is retained that could be used to reconstruct individual choices.

---

## 6. WHAT I WOULD DO DIFFERENTLY

---

### Honest Reflection: What I'd Change

**1. Build the Magic Bar discoverability fix in the original build, not the red team phase**

The red team correctly identified that hiding Magic Bar behind a button was a P1 bug, not a P2 polish item. I knew the spec said "persistent rail on ALL screens" but prioritized getting the feature working over getting it discoverable. The lesson: a feature that users can't find is a feature that doesn't exist. If I were starting over, I'd wire Magic Bar to the Style tab from day 1.

**2. Pre-seed demo data before building the upload flow**

I built the full upload pipeline before populating the demo account. This meant: (a) the app was tested with empty closets until day 13, and (b) on demo day, there were only 3 items in the demo account instead of the planned 15-20. I would have pre-photographed and pre-tagged the demo wardrobe items in week 1, before writing any code, so the app was always demo-able from the first build.

**3. Split the embedding service into its own package**

The `embeddingService.ts` ended up with too many responsibilities: CLIP inference, pgvector storage, semantic search, AND outfit composition logic. The outfit composition (selecting top+bottom+dress from search results) should have been a separate Claude-API-only service. The embedding service should focus only on: upload image → get CLIP embedding → store in pgvector.

**4. Build the GIN index correctly in the first migration**

The `USING GIN(user_id, occasions)` multi-column index was invalid PostgreSQL syntax from day 1 of the migration. I should have tested the migration SQL against a local PostgreSQL instance before committing. A `CREATE INDEX` that silently creates the wrong thing is worse than a compile error — it ships and fails at query time.

**5. Add expo-secure-store session persistence from day 1**

The Supabase session was lost on app restart because the default session storage is AsyncStorage (plain text, app-state only). I added `SecureStoreAdapter` later in the project. This should have been in the initial auth scaffolding — session persistence is a day-1 requirement for any app that expects users to return.

**6. Build the onboarding screen before the empty closet state**

The empty closet state was a placeholder with a "Add your first item" button. The 3-slide onboarding spec (value prop → how it works → get started) was never built. A first-time user who downloaded the app saw an empty grid with no context. I would have built the onboarding flow in week 1 alongside auth, so the app was complete from the first install — not just functional, but onboarding-complete.

**7. Named the ClothingTags type the same across both service files**

`taggingService.ts` exports `ClothingTags` but `ReviewTagsScreen.tsx` was initially typed with `AITagResult` from `types/index.ts`. These two types had identical shapes but different names, causing a phantom import error that didn't surface until the red team tested the add-item flow. I should have used a single type definition and imported it from one canonical location. Type consistency is not optional.

**8. Used a dedicated rate-limit handling library instead of semaphore manually**

The concurrency limiting for Claude Vision (max 4 concurrent) was implemented with a custom semaphore. HF API rate limiting was handled with a try-catch and a 60-second retry. I would have used `p-retry` or `@lifeomic/attempt` for API call resilience — these handle exponential backoff, jitter, and configurable retry conditions correctly. My manual retry loop worked but was not as robust to edge cases like partial network failures.

---

## Document Provenance

| Section                            | Source Documents                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| Problem Framing                    | `briefs/01-product-brief.md`, `02-plans/03-mvp-scope.md`                           |
| CLIP decision                      | `01-analysis/02-ml-evaluation.md §1`, `02-plans/02-ml-pipeline.md §1`              |
| pgvector decision                  | `01-analysis/02-ml-evaluation.md §1.2`                                             |
| Claude Vision decision             | `02-plans/02-ml-pipeline.md §2.2`                                                  |
| Threshold choice                   | `04-validate/001-redteam-perspectives.md §Finding M1`                              |
| 3D avatar deferral                 | `02-plans/03-mvp-scope.md §P2-01`                                                  |
| React Native choice                | `02-plans/01-architecture.md §1`                                                   |
| Magic Bar discoverability fix      | `04-validate/001-redteam-perspectives.md §Finding U2`                              |
| Bias risks                         | `01-analysis/02-ml-evaluation.md §3.1`, `02-plans/02-ml-pipeline.md §3`            |
| Auth decision                      | `journal/0006-DECISION-email-only-auth-phase1.md`                                  |
| Formality scale                    | `journal/0007-DECISION-formality-scale-1-5.md`                                     |
| Slot-based composition             | `journal/0001-DISCOVERY-slot-based-outfit-composition.md`                          |
| Hybrid retrieval                   | `journal/0002-DISCOVERY-hybrid-retrieval-bridges-clip-gap.md`                      |
| pgvector GAP                       | `journal/0003-GAP-pgvector-not-free-tier-default.md`                               |
| Storage RLS root cause             | `journal/0004-CONNECTION-supabase-storage-rls-is-the-upload-failure-root-cause.md` |
| Voice deferral                     | `journal/0008-TRADE-OFF-voice-input-deferred.md`                                   |
| ML training data GAP               | `journal/0009-DISCOVERY-ml-training-data-has-no-path.md`                           |
| FASHN DPA risk                     | `journal/0010-RISK-fashn-dpa-unverified-body-photos.md`                            |
| Navratri dates GAP                 | `journal/0011-GAP-navratri-hardcoded-dates-will-fail.md`                           |
| K-means++ initialization           | `src/services/styleDnaService.ts`                                                  |
| k=5 / silhouette selection         | `src/services/styleDnaService.ts`                                                  |
| Beta-Binomial Bayesian             | `src/services/preferenceLearningService.ts`                                        |
| 45-day / 120-day festive threshold | `src/services/deadWeightService.ts`                                                |
| MiniMax vs FASHN                   | `src/services/minimaxAvatarService.ts`                                             |
| GIN index fix                      | `supabase/migrations/001_initial_schema.sql`                                       |
| gitignore fix                      | `.gitignore`, `apps/mobile/src/lib/supabase.ts`                                    |
| Metro alias removal                | `apps/mobile/metro.config.js`                                                      |
| NOW() partial index fix            | `supabase/migrations/006_dead_weight_rpc.sql`                                      |
