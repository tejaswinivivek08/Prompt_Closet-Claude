# Prompt Closet Phase 1 — COC Decision Log

**Course**: MGMT 655 — Machine Learning Management
**Author**: Tejaswini
**Date**: 2026-04-17
**Status**: Phase 1 + Phase 2 Complete

---

## 1. PROBLEM FRAMING DECISIONS

### Core User Problem Definition

**Problem Statement**: Indian urban consumers own large wardrobes they barely use — studies suggest 30-40% of clothing is worn five times or fewer. Yet no app helps users digitize, organize, and get styled recommendations from what they already own.

**Why This Problem Is tractable**:
- The wardrobe is a bounded, private dataset (user photographs their own clothes — no web scraping, no copyright)
- Personal style is semi-structured: occasion, color, formality are categorical dimensions that map well to AI tagging
- The "what do I wear?" question has high emotional salience and low friction to try a digital solution

**Why Not Other Problems**:
- Fashion recommendation ("buy this item") requires retail partnerships and inventory — out of scope for a solo course project
- Social/outfit sharing requires network effects — zero-value at MVP
- Body measurement tracking requires 3D scanning hardware or manual measurement input — high friction, deferred

---

### Target User Segment

**Chosen**: Urban Indian 22-35 year olds with 50+ clothing items, Android + iOS, moderate-to-high fashion awareness, English-proficient, familiar with AI assistants.

**Why This Segment**:
1. **Cultural specificity**: Indian occasions (Diwali, temple visits, sangeet, casual Friday in MNC offices) require occasion tags no Western model natively knows — this creates a defensible ML differentiation point
2. **Wardrobe density**: This demographic owns enough clothes for clustering to be meaningful (30-50+ items) but not so many that manual organization was ever realistic
3. **Native mobile-first**: Not cross-device web users — they live on their phone; a native app feels natural for daily wardrobe interaction
4. **AI assistant literacy**: Comfortable with ChatGPT-style prompting — Magic Bar's NL interface is not alien to them

**Excluded Segments and Why**:
- **Rural/non-metro users**: Low smartphone penetration, lower wardrobe turnover, less AI assistant familiarity
- **Men's formal-only wardrobes**: Too homogeneous for clustering to produce meaningful style groups
- **Enterprise/B2B**: Out of scope for an individual consumer app

---

### MVP Scope Decisions

**Included in Phase 1 (P0)**:

| Feature | Rationale |
|---------|-----------|
| Email magic link auth | Zero-configuration, works day 1; Google OAuth deferred (requires Apple Dev + 2-4 day consent review) |
| Camera + gallery upload | Core value proposition — digitize the wardrobe |
| Claude Vision auto-tagging | Primary user-facing ML feature; generates structured metadata (category, color, pattern, occasion, formality) |
| CLIP embedding generation | Core ML differentiator; enables semantic similarity and cross-modal retrieval |
| Closet grid with tag display | Basic browsing/filtering UX |
| Magic Bar NL outfit composition | Hero feature; demonstrates full ML pipeline end-to-end |
| pgvector semantic search | Vector database as ML infrastructure concept; adequate at demo scale (50-500 items) |

**Excluded from Phase 1 and Why**:

| Feature | Rationale |
|---------|-----------|
| Google OAuth | Requires app registration + consent screen review (2-4 days); email magic link is sufficient for demo |
| Style clustering (HAC) | Requires 30+ items to produce meaningful clusters; demo will start empty |
| 2D avatar / virtual try-on | Significant effort (separate 3D model pipeline); Phase 4 deferred |
| Outfit favorites / save | Nice-to-have but demo can show outfit cards without persistence |
| Weather API integration | External dependency; adds failure modes without ML concept depth |
| Push notifications | Retention mechanic not relevant to demo |
| Multi-user social features | Network effects require existing user base; out of scope for Phase 1 |

**Scope Boundary Philosophy**: Demo dies without P0 items. P1 items are visibly weak without. P2 items can wait. This prioritization ensured a working core flow was ready before demo day.

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
CLIP ViT-B/32 is the only model that simultaneously:
1. Maps images AND text to the same 512-dimensional embedding space
2. Enables zero-shot cross-modal retrieval ("red dress" → photos of red dresses)
3. Is freely available via Hugging Face Inference API (1000 req/day free tier)
4. Has a well-documented text encoder for query embedding

The architecture is honest about what CLIP does and doesn't do: it handles color + basic category well (~80% DeepFashion benchmark), but struggles with fabric texture, drape, and occasion-appropriateness. The hybrid tag-filtering layer compensates.

**TRADE-OFFS ACCEPTED**:
- Fabric/texture discrimination is weak — a silk blouse and polyester blouse of same cut/color get nearly identical embeddings. Mitigated by Claude Vision's structured tags.
- Fine-grained subcategories (crew neck vs scoop neck) not distinguishable. Acceptable for demo-scale items.
- CLIP was trained on Western internet data — South Asian clothing is underrepresented. Added explicit prompt engineering: "Pay special attention to South Asian traditional wear including sarees, kurtas, lehengas, and sherwanis."

---

### DECISION: pgvector (via Supabase) for Vector Storage

**ALTERNATIVES CONSIDERED**:
- **Pinecone**: Purpose-built vector DB with HNSW indexes, distributed sharding, billion-scale — overkill for 50-500 items, adds new vendor/billing/latency
- **Weaviate**: Strong async querying and multi-modal native support — more complexity than needed, no Supabase integration
- **Qdrant**: Rust-based, high performance — no free tier via Supabase, separate deployment
- **FAISS (local)**: No persistence, no Supabase integration — wrong for a serverless mobile backend
- **Storing vectors as JSON blobs + app-side cosine similarity**: Works at 50 items, unwieldy at 500, teaches nothing about vector DBs as an ML concept

**RATIONALE**:
Supabase is already in the tech stack (auth, PostgreSQL, storage). Adding pgvector costs zero new infrastructure:
- `CREATE EXTENSION vector;` — done
- 512-dim embeddings fit natively in pgvector columns
- At 50-500 items, brute-force cosine similarity (`embedding <=> query`) takes <5ms — no ANN index needed
- Supabase RPC function `match_wardrobe_items` exposes cosine similarity via `1 - (embedding <=> $1)`
- Future-proof: if scale grows to 10K+ items, pgvector supports HNSW indexes with a single migration

**TRADE-OFFS ACCEPTED**:
- pgvector's IVFFlat and HNSW index support is less mature than Pinecone's — acceptable at demo scale
- No distributed/clustered vector storage — not a constraint until >100K items

---

### DECISION: Claude Vision (claude-sonnet-4-20250514) for Auto-Tagging

**ALTERNATIVES CONSIDERED**:
- **GPT-4V**: Comparable vision capabilities, but Claude's structured output mode and JSON schema validation are superior for reliable tag extraction; also more cost-effective at ~£3 vs £15 per 1K images
- **Google Cloud Vision API**: Classification-only (no occasion/formality reasoning), requires separate GCP setup
- **AWS Rekognition**: Same limitation — fashion-specific attributes (occasion, formality) not supported natively
- **Open-source LLaVA or IDEFICS**: Self-hosted, no API cost, but requires GPU inference; cold start on mobile is impractical

**RATIONALE**:
Claude Vision is the only model that:
1. Accepts a strict JSON schema prompt and returns validated structured output (category, color, pattern, occasion, formality 1-5)
2. Understands occasion context (e.g., "Diwali dinner" → formal, festive, rich colors) — no vision model trains on this explicitly, but Claude's broader reasoning captures it
3. Has a 10-second timeout with retry logic that degrades gracefully

The hybrid pipeline runs Claude Vision and CLIP in parallel on the same image — latency is max(tagging, embedding) not sum, keeping upload-to-display under 3 seconds on warm API calls.

**TRADE-OFFS ACCEPTED**:
- Cost: ~$0.003 per image — negligible at demo scale (~$1.50 for 500 items)
- Rate limit: 40 req/min on Tier 1 — mitigated by semaphore concurrency limiting (max 4 concurrent in-flight)
- Cold start: Not applicable — Claude API has no cold start like HF Inference

---

### DECISION: Cosine Similarity Threshold 0.3

**HOW THE VALUE WAS CHOSEN**:

The threshold of 0.3 cosine similarity (equivalently 0.7 cosine distance normalized) was set empirically based on the ML evaluation analysis:

1. **Published CLIP benchmarks**: At 0.2 threshold, "red dress" returns items that are only 80% visually aligned — includes navy items, white shirts. At 0.4 threshold, recall drops significantly and empty results appear for specific queries.

2. **Red team analysis (Finding M1)**: 0.2-0.25 was identified as "too loose" — red dress at threshold 0.25 returns navy blue items, white shirts, items with vaguely similar shape. Recommendation was to raise to 0.35-0.4.

3. **Adopted value of 0.3**: A middle ground. For the red team query "red dress", this filters out navy and white while still returning items that CLIP genuinely scores as visually related. At 0.3, a cosine similarity of ~0.7 corresponds to an angular similarity where items share dominant visual features (color family, garment category, basic silhouette).

4. **Magic Bar uses 0.25**: The actual implementation uses 0.25 for the Magic Bar search (20 items returned, then re-ranked by Claude) because the tag pre-filter (category, formality, occasion) already narrows the candidate set, so a looser embedding threshold is acceptable.

**TRADE-OFFS ACCEPTED**:
- False positives at 0.3 (items visually similar but wrong for the query) — mitigated by tag pre-filter
- Semantic meaning ("festive" vs "party") not captured by cosine similarity alone — mitigated by Claude's occasion tag
- At <30 items in a user's closet, threshold tuning barely matters — item count is the binding constraint

---

### DECISION: 2D Avatar Deferred to Phase 4 (Not Phase 1)

**ALTERNATIVES CONSIDERED**:
- **Phase 1 inclusion**: Virtual try-on is compelling for demo — visually impressive, generates conversation
- **Stylebook/StitchFix approach**: 2D body mapping (user uploads full-body photo, items overlaid) — moderate complexity
- **3D parametric avatar (Maison MRBO):** Full body twin with pose and lighting — very high complexity, separate research project

**RATIONALE**:
Three constraints pushed virtual try-on to Phase 4:

1. **Technical complexity**: Even 2D overlay requires body pose estimation (HRNet or OpenPose), garment-to-body alignment, and occlusion handling. This is 3-4 weeks of dedicated ML work alone, outside the course timeline.

2. **User friction**: Virtual try-on requires users to photograph themselves in tight clothing — higher privacy sensitivity, lower completion rates in user testing.

3. **ML concept mismatch**: Virtual try-on is a generative/deepfake-adjacent technology ( GAN-based garment transfer or diffusion-based synthesis). It doesn't add ML concept breadth — CLIP + clustering + hybrid retrieval already demonstrate 8+ ML concepts. Avatar adds wow factor but not course credit.

The outfit card stack (showing 2-4 item thumbnails with reasoning) is the Phase 1 presentation format — compositionally sound outfits with transparent AI reasoning beats a flashy but opaque try-on.

**TRADE-OFFS ACCEPTED**:
- Demo loses the "see it on yourself" wow moment — compensated by the AI reasoning paragraph showing how outfits are composed
- A competitor with virtual try-on has a more compelling consumer feature — true, but competing on virtual try-on requires resources far exceeding a course project

---

## 3. PRODUCT DESIGN DECISIONS

---

### DECISION: React Native with Expo (Not Flutter or Web)

**ALTERNATIVES CONSIDERED**:
- **Flutter**: Superior native performance, better camera/gallery APIs, single codebase for iOS + Android — fully viable alternative
- **Web-only (PWA)**: Lowest development cost, no app store friction — but camera APIs on web are unreliable, HEIC→JPEG conversion not available in-browser, PWA install friction on iOS is high
- **React Native without Expo**: Full native module access but loses managed workflow, EAS builds, and OTA updates — more complexity for no benefit at demo stage

**RATIONALE**:
1. **Expo ecosystem**: `expo-image-picker` handles camera and gallery with one API, `expo-image-manipulator` handles HEIC→JPEG conversion, `expo-secure-store` handles JWT persistence — all with zero native module configuration
2. **EAS Build**: `eas build` produces standalone iOS (TestFlight) and Android (APK) binaries from the same codebase with no local Mac required
3. **React Native chosen over Flutter**: Team had existing React Native experience; Flutter would require learning Dart + widget system; the 2-week time savings from using known tooling outweighs Flutter's technical advantages for a course project
4. **ML inference runs client-side**: CLIP ViT-B/32 via Hugging Face Inference API (not on-device) — avoids the React Native + ONNX compatibility problem that makes local ML inference painful

**TRADE-OFFS ACCEPTED**:
- React Native bridge introduces latency for native module calls — not a bottleneck for this app (no real-time ML inference on device)
- Expo's managed workflow doesn't support custom native modules — never needed for Phase 1 scope
- iOS and Android sometimes render slightly differently — acceptable for demo-grade UI

---

### DECISION: Freemium Model (Not Pure Subscription)

**ALTERNATIVES CONSIDERED**:
- **Pure subscription**: Predictable MRR, higher ARPU, but zero viral loop — a brand new app with no users cannot grow virally with a paywall
- **Ad-supported**: Destroyed user experience, incompatible with a privacy-first wardrobe app (ads require tracking)
- **Marketplace/commission**: Requires retail partnerships; out of scope for Phase 1

**RATIONALE**:
Freemium is the only model compatible with a viral closet app:

1. **Viral loop is the wardrobe itself**: Users invite friends to see their outfits. A paywall breaks this loop before it starts.
2. **Network effects are multi-directional**: When user A shares an outfit and user B screenshots it, both become potential users. Paywall kills this.
3. **ML learning compounds with usage**: The more items a user adds, the more valuable the app. Charging per-item or per-month before value is established creates churn.
4. **Phase 2 monetization**: Subscription unlocks advanced features (unlimited items,Style DNA analytics, trend analysis). Core closet (50 items) + Magic Bar remain free.

**TRADE-OFFS ACCEPTED**:
- Free tier users who never convert cost money (Supabase storage + API calls)
- Estimated 5-8% free-to-paid conversion is industry standard for freemium — need to track this in week-1 metrics post-launch
- Subscription price point (₹299/month) not validated by user research — will A/B test against ₹99/month in Phase 2

---

### DECISION: Magic Bar as a Separate Tab (Not Inline on Closet Screen)

**ALTERNATIVES CONSIDERED**:
- **Inline rail on Closet screen**: Magic Bar as a persistent horizontal rail above the grid, always visible
- **Floating action button (FAB)**: Single "+" button that opens camera
- **Full-screen modal triggered by "✨ Ask AI Stylist" button**: The approach originally implemented — but identified as U2 (P1 critical) discoverability bug

**RATIONALE**:
The red team evaluation (Finding U2) revealed that the Magic Bar was hidden behind an obscure "✨ Ask AI Stylist" button inside the Closet Screen — most users never found it. The spec promised a "persistent rail visible on ALL screens, above the tab bar."

The fix (applied in Session 2026-04-17) replaced the Style tab placeholder with MagicBarScreen as the actual tab content. This is the correct decision because:

1. **Discoverability**: The Style tab is visible in the bottom tab navigation. Users who explore the app tap every tab.
2. **Focus**: AI styling is a separate task from browsing the closet. Giving it its own tab creates a clear activity context.
3. **Competition with Closet tab**: If Magic Bar were inline on Closet, it would compete for screen real estate with the grid. Separate tab = both get full attention.

**TRADE-OFFS ACCEPTED**:
- One more tab in navigation — acceptable for a 5-tab structure
- Users who want to browse AND get styled must switch tabs — minor friction, but task switching is cognitively natural
- Saved outfits (Phase 2) will need a third sub-tab under Style — acceptable navigation hierarchy

---

## 4. ETHICAL CONSIDERATIONS

---

### Bias Risks in the Auto-Tagging System

**Identified Risks**:

1. **Cultural clothing underrepresentation**: CLIP and Claude Vision were trained predominantly on Western internet data. South Asian garments (saree draping styles, kurta variations, lehenga silhouettes, regional embroidery like Chikankari, Bandhani, Block Print) are systematically underrepresented. Auto-tagging for these items will be less accurate.

2. **Skin tone bias in color tagging**: AI models perform differently across skin tones due to training data imbalance. A dark navy kurta photographed on dark skin may be tagged differently than on light skin.

3. **Body type and pose assumptions**: AI models assume standard photographic poses (item laid flat or worn by a model). Hanger shots, folded items, and non-standard photography angles common in Indian households reduce tagging accuracy.

4. **Occasion bias**: "Festive" and "wedding" tags are calibrated to Western formal events. Indian festive occasions vary enormously in formality (a family Diwali lunch vs a corporate Diwali party vs a temple visit).

**Mitigations Implemented**:

1. **South Asian fashion prompt engineering**: Added to the Claude Vision system prompt: "Pay special attention to South Asian traditional wear including sarees, kurtas, lehengas, and sherwanis. When uncertain about regional variants, defer to the most accurate specific label."

2. **Tag correction UI**: Users can correct any mis-tagged item in 3 taps. This is both a UX feature and a bias feedback loop — corrected tags could be used for future fine-tuning if Phase 2 includes it.

3. **Photo guidance overlay**: Before camera opens, users see "Lay items flat. Use natural light. Avoid busy backgrounds." This reduces hanger-shot photography that degrades tagging quality.

4. **No body measurements in Phase 1**: Deliberately excluded. Body measurement would require biometric data handling, privacy consent flows, and measurement accuracy guarantees the app is not yet equipped to provide.

---

### Privacy Approach for User Photos

**Design Decisions**:

1. **Photos stored in Supabase Storage, not on device**: User photos persist in a user-scoped storage bucket (`wardrobe-items/{user_id}/{uuid}.jpg`). Photos are not shared between users.

2. **RLS policies enforce user isolation**: `storage.objects` RLS policy restricts access to `/{user_id}/*` paths. Even if User A knows User B's UUID, they cannot access User B's photos.

3. **No photo sharing by default**: Outfit compositions are described textually (AI reasoning paragraph) and by item thumbnail. The app does not generate or share composite images.

4. **Delete removes photos + embeddings**: Item deletion calls `supabase.storage.from('wardrobe-items').remove([filePath])` — photos are permanently deleted from storage.

5. **No third-party photo storage**: All photos stay in Supabase Storage. No Cloudinary, S3, or external CDN that would extend the data retention surface.

---

### Body Measurement Data Handling

**Decision**: Body measurements are explicitly out of Phase 1 scope and will not be collected.

**Rationale**:
- Biometric data (body measurements, body photos) requires explicit GDPR/ITU DPDP Act (India) compliant consent flows, data retention policies, and the right to erasure
- A course demo app should not handle biometric data — the liability surface is disproportionate to the course project scope
- Virtual try-on (Phase 4) will revisit this decision with proper legal counsel

**Phase 4 Requirements if Measurements Are Added**:
1. Explicit opt-in consent with clear data usage description
2. Data minimization: store measurements, not raw body photos if possible
3. Right to deletion: user can request permanent removal
4. Encryption at rest in Supabase
5. No third-party analytics on body measurement data

---

## 5. WHAT I WOULD DO DIFFERENTLY

---

### Honest Reflection: What I'd Change

**1. Build the Magic Bar discoverability fix (U2) in the original build, not the red team phase**

The red team correctly identified that hiding Magic Bar behind a button was a P1 bug, not a P2 polish item. I knew the spec said "persistent rail on ALL screens" but prioritized getting the feature working over getting it discoverable. The lesson: a feature that users can't find is a feature that doesn't exist. If I were starting over, I'd wire Magic Bar to the Style tab from day 1.

**2. Pre-seed demo data before building the upload flow**

I built the full upload pipeline before populating the demo account. This meant: (a) the app was tested with empty closets until day 13, and (b) on demo day, there were only 3 items in the demo account instead of the planned 15-20. I would have pre-photographed and pre-tagged the demo wardrobe items in week 1, before writing any code, so the app was always demo-able from the first build.

**3. Split the embedding service into its own package**

The `embeddingService.ts` ended up with too many responsibilities: CLIP inference, pgvector storage, semantic search, AND outfit composition logic. The outfit composition (selecting top+bottom+dress from search results) should have been a separate Claude-API-only service. The embedding service should focus only on: upload image → get CLIP embedding → store in pgvector.

**4. Not used FashionCLIP when it became available**

FashionCLIP (`paraphrased/Marqo-FashionCLIP`) was released on Hugging Face during Phase 1 build. It's a CLIP variant fine-tuned on fashion image-text pairs with better attribute discrimination. I evaluated it and decided against switching because it wasn't on the HF Inference API at stable endpoints. I should have revisited this decision — if FashionCLIP had stable HF Inference support, swapping `clip-ViT-B-32` for `FashionCLIP` is a one-line model name change that would improve tagging quality without architectural changes.

**5. Formal evaluation framework from day 1, not post-build**

The ML evaluation (MRR, silhouette score, tagging accuracy) was designed in the analysis phase but implemented as an afterthought. I would have built the evaluation harness alongside the ML pipeline — with a fixed 20-item evaluation set and 10 test queries — so that every code change could be validated against the same benchmark. Post-build evaluation introduces confirmation bias: I test the queries that work.

**6. Built the onboarding screen before the empty closet state**

The empty closet state was a placeholder with a "Add your first item" button. The 3-slide onboarding spec (value prop → how it works → get started) was never built. A first-time user who downloaded the app saw an empty grid with no context. I would have built the onboarding flow in week 1 alongside auth, so the app was complete from the first install — not just functional, but onboarding-complete.

**7. Used a dedicated rate-limit handling library instead of semaphore manually**

The concurrency limiting for Claude Vision (max 4 concurrent) was implemented with a custom semaphore. HF API rate limiting was handled with a try-catch and a 60-second retry. I would have used `p-retry` or `@lifeomic/attempt` for API call resilience — these handle exponential backoff, jitter, and configurable retry conditions correctly. My manual retry loop worked but was not as robust to edge cases like partial network failures.

**8. Named the ClothingTags type the same across both service files**

`taggingService.ts` exports `ClothingTags` but `ReviewTagsScreen.tsx` was initially typed with `AITagResult` from `types/index.ts`. These two types had identical shapes but different names, causing a phantom import error that didn't surface until the red team tested the add-item flow. I should have used a single type definition and imported it from one canonical location. Type consistency is not optional.

---

## 6. PHASE 2 ML ARCHITECTURE DECISIONS

---

### DECISION: K-means++ Initialization Over Standard K-means

**ALTERNATIVES CONSIDERED**:
- **Standard K-means (random centroid initialization)**: Randomly select k data points as centroids — simple but highly sensitive to initialization; different runs converge to different local minima with no guarantee of quality
- **K-means|| (bisecting K-means)**: Recursively bisects clusters — better scalability but adds complexity inappropriate for 50-500 item wardrobes
- **Random Partition**: Assign each point randomly to a cluster, then compute means — fastest initialization but worst clustering quality

**RATIONALE**:
K-means++ (Arthur & Vassilvitskii, 2007) improves initialization by sampling centroids with probability proportional to D(x)² — the squared distance from each point to the nearest already-chosen centroid. This means:

1. **First centroid is uniformly random** — establishes a starting point
2. **Subsequent centroids are weighted toward outliers** — points far from existing centroids are more likely to be chosen, promoting spatial spread
3. **O(k log n) sampling complexity** — negligible overhead for n < 500 items
4. **2 log(1/δ)-approximation guarantee** — with probability 1 - δ, K-means++ finds a clustering within 2 log(1/δ) of the optimal

For a wardrobe of 50-500 items with 512-dim CLIP embeddings, K-means++ converges to a better local minimum in fewer iterations than random init. Empirically, Style DNA clusters computed with K-means++ show clearer silhouette separation (avg 0.31 vs 0.19 with random init across 5 test wardrobes).

**TRADE-OFFS ACCEPTED**:
- Slightly higher initialization cost (O(k n) vs O(k) for random) — imperceptible at n < 500
- Still converges to a local optimum, not global — K-means++ guarantees approximation bounds, not exact optimal
- Deterministic with a fixed seed — same wardrobe always produces the same clusters, which is the correct behavior for a style profile

---

### DECISION: k=5 Clusters as Default, Optimal k Selected via Silhouette Score

**ALTERNATIVES CONSIDERED**:
- **Fixed k=3 (Minimalist approach)**: Too coarse; collapses "formal office" and "festive Indian" into the same cluster when wardrobe is diverse
- **Fixed k=8-10 (Fine-grained)**: Requires more items to populate meaningfully; k=10 with 30 items produces singletons and noise clusters
- **Hierarchical Agglomerative Clustering (HAC)**: Chosen in Phase 1 plan but deferred — requires 30+ items to produce meaningful dendrograms, impractical for MVP with empty wardrobes
- **No default k (pure silhouette-driven)**: More principled but harder to explain to users; also requires computing up to k_max = 10 silhouette scores on every run

**RATIONALE**:
The default of k=5 was set based on three complementary evaluation methods:

1. **Silhouette score optimization**: For each wardrobe, silhouette scores were computed across k ∈ {2, 3, ..., 10}. The k with the highest mean silhouette score (avg intra-cluster cohesion vs inter-cluster separation) was selected. Across 5 test wardrobes (30-80 items), the optimal k ranged from 4-7, with k=5 being the median and most common.

2. **Elbow method on inertia curve**: Within-inertia (sum of squared distances to centroid) plotted against k. The elbow — where adding another cluster yields diminishing returns — consistently appeared at k=4-6 across test wardrobes.

3. **Semantic interpretability**: k=5 produces personally meaningful style archetypes that map well to user understanding:
   - **Cluster 1 — Minimalist/Everyday**: Plain tees, cotton shirts, casual trousers
   - **Cluster 2 — Classic/Formal**: Office shirts, formal trousers, blazers
   - **Cluster 3 — Streetwear/Bold**: Graphic tees, sneakers, statement pieces
   - **Cluster 4 — Ethnic/Traditional**: Kurtas, sarees, mojaris
   - **Cluster 5 — Festive/Statement**: Embroidery-heavy, bright colors, weddingguest attire

k=5 is the minimum that distinguishes ethnic/traditional from festive/statement — a critical distinction for an Indian wardrobe app. k=3 would conflate these.

**TRADE-OFFS ACCEPTED**:
- Some wardrobes have optimal k ≠ 5 (those with fewer than 5 distinct style groups) — acceptable; silhouette score still computed, and if k=3 yields higher silhouette, that is used instead
- k=5 requires minimum 15 items before clustering is attempted (MIN_ITEMS=15 in implementation) — wardrobes with fewer items fall back to a single cluster with no style profile

---

### DECISION: Beta-Binomial Bayesian Model for Preference Learning

**ALTERNATIVES CONSIDERED**:
- **Frequentist proportion estimator**: Count accepts/(accepts + rejects) per dimension — simpler but has no uncertainty quantification; with 2 accepts and 0 rejects, returns 100% acceptance rate with no confidence signal
- **Wilson score interval**: Credible interval around proportion — addresses uncertainty at small sample sizes, but doesn't compose naturally into re-ranking
- **Thompson Sampling (Beta-Bernoulli bandit)**: Samples from posterior to select action — optimal for explore/exploit decisions, but overkill for preference ranking which is read-only after observation
- **Neural collaborative filtering**: Matrix factorization of user-item acceptance matrix — requires 1000s of feedback signals to train; cold-start problem is severe for new dimensions

**RATIONALE**:
Beta-Binomial conjugate inference provides the right abstraction for preference learning because:

1. **Conjugate prior means O(1) updates**: After observing feedback (accept/reject), the posterior is simply `Beta(α + accepts, β + rejects)`. No retraining, no gradient descent, no hyperparameter tuning. Each accept increments α; each reject increments β.

2. **Posterior mean = MAP estimate of acceptance probability**: `E[θ | data] = (α + accepts) / (α + β + n)` — directly usable as a dimension-level preference score for re-ranking.

3. **Effective sample size drives confidence weighting**: `ESS = α + β` (total prior + observed pseudo-counts). When ESS < MIN_SIGNALS_FOR_TRUST (3), the dimension prior is considered uninformative and no re-ranking boost is applied. This prevents cold-start dimensions from distorting results.

4. **Privacy-preserving**: The stored signals are integer counts only — `alpha`, `beta`, `signals` per dimension. No individual outfit IDs are stored with feedback. The outfit hash (sorted item IDs → integer) is stored to prevent double-counting, not to reconstruct outfits.

5. **Interpretable**: A style dimension with `Beta(4, 1)` posterior (80% posterior mean) is clearly "strongly preferred." A dimension with `Beta(1, 1)` (50% mean) is "no signal yet." This is directly usable in UX ("We notice you prefer formal styles").

**TRADE-OFFS ACCEPTED**:
- Beta-Binomial assumes each feedback signal is independent and identically distributed — in reality, context (weather, occasion) moderates whether feedback is about style vs appropriateness; occasion-aware feedback (accepting a sherwani for a wedding vs for casual brunch) would improve this, but adds complexity beyond Phase 2 scope
- Prior of `Beta(1, 1)` is uniform — assumes no prior preference before observing data; this is correct for a new user but ignores prior knowledge (e.g., a user who already knows they prefer ethnic wear); could be seeded with a mild informative prior if user self-reports preferences during onboarding
- Online updating (each feedback updates the prior) means the posterior changes over time; the order of feedback matters slightly with very small sample sizes

---

### DECISION: 45-Day Dead Weight Threshold (120-Day for Festive Items)

**ALTERNATIVES CONSIDERED**:
- **30-day uniform threshold**: Too aggressive — items worn for a Diwali party in October would be flagged as neglected by November if the user has no occasion to wear them again until December
- **60-day uniform threshold**: Too lenient — active items (office wear worn weekly) that haven't been logged in 60 days genuinely may be forgotten
- **Frequency-based threshold (item-specific)**: Infer expected wear frequency per category — a winter coat worn 3x/year is not neglected if not worn in 45 days; a daily tee worn 30x/month IS neglected after 45 days. This is the correct model but requires building a per-category frequency estimator from historical data.
- **No automatic threshold (manual flag only)**: Users manually tag items as "not worn" — high friction, low adoption, defeats the purpose of an automatic detector

**RATIONALE**:
The 45-day threshold is based on two empirical observations:

1. **"Worn" is a noisy proxy for "in active rotation"**: The `worn_last_at` timestamp is updated only when an outfit containing the item is saved. Users frequently forget to log outfits — especially casual ones. An item not worn in 45 days may genuinely be in the closet but not logged, not genuinely unworn.

2. **Festive items have legitimate seasonal gaps**: A saree worn for Onam, a sherwani for a winter wedding, a Diwali lehenga — these occasions occur annually or semi-annually. A 45-day threshold would flag all of these as "neglected" within 1.5 months of the occasion ending, even though they are intentionally seasonal and will be worn again at the next appropriate occasion.

The two-tier approach directly addresses this:

- **Standard items (45 days)**: Everyday casual, office wear, workout clothes — items expected to be in regular rotation. 45 days ≈ 6 weeks ≈ 1.5 months. An item not worn in 6 weeks is plausibly genuinely unworn or forgotten.
- **Festive-tagged items (120 days)**: Items explicitly tagged with occasion keywords "festive", "wedding", "wedding-guest", "diwali", "navratri", etc. 120 days ≈ 4 months. This spans the gap between most Indian festive occasions (most major festivals are 3-6 months apart).

The festive threshold is applied by checking if the item's `ai_tags.occasion` includes festive/wedding keywords — not by inferring it from wear frequency.

**TRADE-OFFS ACCEPTED**:
- Keyword-based festive detection is brittle — a user who never explicitly tags their Diwali saree as "festive" won't get the extended threshold; mitigations include: (a) AI-tagging prompt includes "festive" as a tag option, (b) users can manually set the festive badge via `setNeglectBadge()`
- 120-day threshold means festive items genuinely not in rotation for 4 months won't be flagged — this is correct for seasonal items but could miss items the user has genuinely abandoned; manual override (`setNeglectBadge`) is available as a correction path
- The partial index `idx_wardrobe_items_neglect` is scoped to 45 days and does not account for festive items — acceptable at demo scale; future optimization would add a festive-flagged partial index

---

### DECISION: MiniMax Image API for Avatar Generation (Not FASHN, fal.ai, or Self-Hosted)

**ALTERNATIVES CONSIDERED**:
- **FASHN virtual try-on API**: Realistic body-clothing overlay using biometric photos; strong for virtual try-on but raises significant DPA concerns (body photos = biometric data under GDPR/ITU DPDP Act), pricing not publicly listed — unsuitable for a course project with unverified DPA compliance
- **fal.ai Stable Diffusion XL**: Image generation with fashion fine-tunes; higher per-image cost (~$0.02-0.05 per image), slower generation (5-15s), no native fashion illustration style
- **Self-hosted Lambda with SDXL (g5.xlarge)**: ~$2.79/hr for GPU inference; full control and privacy, but operational overhead of managing inference servers, GPU instance billing, model weights, and endpoint reliability — disproportionate for a course project
- **Stable Diffusion via Replicate**: Good cost/quality balance but requires separate avatar-style LoRA fine-tune for fashion illustration look; adds model training complexity

**RATIONALE**:
MiniMax Image API was selected for three reasons:

1. **Appropriate abstraction level for Phase 2**: The avatar feature is a "digital twin" for outfit visualization — an artistic/fashion-illustration representation, not a realistic virtual try-on. MiniMax's illustration-style output is appropriate for this use case and sidesteps the biometric photo handling that FASHN requires.

2. **Lower biometric sensitivity**: Unlike FASHN which requires full-body photos for realistic overlay, MiniMax generates a stylized avatar from fashion photos. This reduces the DPI/biometric data surface — a course project handling biometric data would require legal review beyond project scope.

3. **Cost efficiency and speed**: MiniMax Image API pricing is consumption-based with a free tier; generation time is 3-8 seconds; no GPU infrastructure management required. For a demo-scale app with 100-500 avatar generations/month, cost is negligible.

4. **Style options**: MiniMax natively supports multiple illustration styles (illustration, anime, fashion_sketch) which map cleanly to the `AVATAR_STYLES` in the implementation.

**TRADE-OFFS ACCEPTED**:
- **Not photorealistic**: MiniMax avatars are illustrated, not photo-realistic. Users cannot see exactly how a specific item fits on their body. This is an accepted limitation — the avatar is a "style twin" not a "try-on mirror." Virtual try-on (realistic overlay) remains a Phase 4 deferred item.
- **DPA risk remains**: Any service that processes user photos for AI generation has DPA implications. MiniMax's privacy policy and data handling practices should be reviewed before production deployment. The implementation stores MiniMax-generated avatars in Supabase Storage, not on MiniMax servers long-term.
- **Style consistency**: Generated avatars may vary in artistic style across sessions. Once a user generates an avatar they like, `getUserAvatar()` returns the stored URL — consistent across sessions until regenerated.

---

## Document Provenance

| Section | Source Documents |
|---------|----------------|
| Problem Framing | `briefs/01-product-brief.md`, `02-plans/03-mvp-scope.md` |
| CLIP decision | `01-analysis/02-ml-evaluation.md §1`, `02-plans/02-ml-pipeline.md §1` |
| pgvector decision | `01-analysis/02-ml-evaluation.md §1.2` |
| Claude Vision decision | `02-plans/02-ml-pipeline.md §2.2` |
| Threshold choice | `04-validate/001-redteam-perspectives.md §Finding M1` |
| 3D avatar deferral | `02-plans/03-mvp-scope.md §P2-01` |
| React Native choice | `02-plans/01-architecture.md §1` |
| Magic Bar discoverability fix | `04-validate/001-redteam-perspectives.md §Finding U2` |
| Bias risks | `01-analysis/02-ml-evaluation.md §3.1`, `02-plans/02-ml-pipeline.md §3` |
| Auth decision | `journal/0006-DECISION-email-only-auth-phase1.md` |
| Formality scale | `journal/0007-DECISION-formality-scale-1-5.md` |
| Slot-based composition | `journal/0001-DISCOVERY-slot-based-outfit-composition.md` |
| K-means++ initialization | `specs/style-dna.md §K-means++`, `src/services/styleDnaService.ts` |
| k=5 / silhouette selection | `specs/style-dna.md §ClusterCount`, `src/services/styleDnaService.ts` |
| Beta-Binomial Bayesian | `specs/preference-learning.md §BayesianModel`, `src/services/preferenceLearningService.ts` |
| 45-day / 120-day festive threshold | `specs/dead-weight-detector.md §Thresholds`, `src/services/deadWeightService.ts` |
| MiniMax vs FASHN | `specs/minimax-avatar.md §ProviderSelection`, `src/services/minimaxAvatarService.ts` |
