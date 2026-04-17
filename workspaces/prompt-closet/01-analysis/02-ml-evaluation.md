# ML Architecture Evaluation — Prompt Closet

## Executive Summary

The proposed ML stack (CLIP embeddings + pgvector + cosine similarity + clustering) is architecturally sound for the demo's 50-500 item scale and demonstrates a credible breadth of ML concepts for MGMT 655. However, CLIP is a generalist vision-language model with known weaknesses in clothing-specific feature extraction (fabric texture, drape, fine-grained category distinctions). The evaluation recommends a **hybrid two-track design**: Claude Vision for rich structured tagging (the primary user-facing value) and CLIP embeddings as a secondary similarity index (the primary ML-concept demonstration). This split maximizes both demo quality and course credibility while keeping the architecture honest about what each model actually contributes.

Complexity: **Moderate** (Governance: 3, Legal: 2, Strategic: 5, Technical: 8 = 18/30)

---

## 1. CLIP + pgvector Appropriateness

### 1.1 CLIP for Clothing Items

**What CLIP does well:**

- Broad visual-semantic alignment: "red dress" the text and a photo of a red dress land nearby in embedding space
- Zero-shot classification: can identify "this is a blazer vs a cardigan" without fine-tuning, because those concepts appear in its training data
- Cross-modal retrieval: finding images that match a text description is its core training objective

**What CLIP does poorly for clothing:**

- **Fabric and texture**: CLIP's training data is web-scraped image-text pairs (Conceptual Captions, YFCC, LAION). These pairs describe scenes at the object level, not material level. A silk blouse and a polyester blouse of the same cut and color will have nearly identical embeddings. CLIP cannot distinguish "matte cotton" from "shiny satin" in the way a fashion-aware model would.
- **Drape and silhouette**: These depend on understanding 3D form from a 2D image and material physics. CLIP has no 3D or material understanding. A structured blazer and an unstructured cardigan of similar outline will cluster together.
- **Fine-grained category distinctions**: "Crew neck" vs "scoop neck," "A-line" vs "sheath," "bootcut" vs "straight leg" -- these are subcategory distinctions that CLIP's contrastive training does not reward, because its training pairs rarely describe clothing at that specificity.
- **Occasion and formality**: CLIP has no concept of "appropriate for a Diwali dinner" or "business formal." It can match the phrase to an image if the image looks like images labeled with similar phrases, but it cannot reason about social context.

**Quantitative grounding**: Published benchmarks show CLIP achieves ~60-65% top-1 accuracy on DeepFashion category classification (vs ~85%+ for fashion-specific models). For color matching, it performs better (~80%). For attribute retrieval (sleeve length, neckline type), performance drops significantly.

**Verdict for the demo**: CLIP is adequate but not ideal. For a course demo with 50-500 items, the gap between CLIP and a fashion-specific model will not be catastrophic -- users will see "similar items" that are roughly in the right visual neighborhood. The key is to be honest about this limitation in the demo presentation.

### 1.2 pgvector at This Scale

pgvector for 50-500 items is architecturally appropriate even if quantitatively lightweight. Here is why:

- **Supabase is already in the stack**: Adding pgvector to an existing PostgreSQL costs zero additional infrastructure. A separate vector database (Pinecone, Weaviate, Qdrant) would add a new vendor, new billing, new latency, and new failure mode for a scale that does not require it.
- **pgvector supports exact cosine similarity**: At 500 items x 512-768 dimensions, a brute-force similarity scan takes under 5ms on any modern machine. No ANN index (HNSW, IVFFlat) is needed. pgvector's `<=>` operator handles this natively.
- **Future-proof**: If the app scales beyond 10K items, pgvector supports HNSW indexes. No migration needed.

**What would be overkill**: Pinecone, Weaviate, Milvus, or any dedicated vector database. These solve distribution, sharding, and billion-scale ANN retrieval -- none of which apply here.

**What would be underpowered**: Storing embeddings as JSON blobs and computing cosine similarity in application code. This works at 50 items but becomes unwieldy at 500 and teaches nothing about vector databases as an ML concept.

**Verdict**: pgvector is the right choice. It teaches the vector-database concept without over-engineering.

### 1.3 Alternatives Considered

| Approach                                  | Pros                                                                                             | Cons                                                                              | Verdict                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------- |
| **CLIP (OpenAI `clip-vit-base-patch32`)** | Generalist, free via HF, good zero-shot, 768-dim embeddings                                      | Weak on texture/fabric/occasion                                                   | **Acceptable baseline**                  |
| **CLIP fine-tuned on fashion data**       | Better category/attribute discrimination                                                         | Requires labeled fashion dataset + GPU training time; exceeds demo scope          | **Phase 2 consideration**                |
| **FashionCLIP (community model)**         | CLIP variant fine-tuned on fashion image-text pairs; better at category, color, style attributes | Smaller community, less documented, HF Inference API support varies               | **Best alternative if available via HF** |
| **DeepFashion / efficientnet-based**      | Purpose-built for fashion; superior category and attribute accuracy                              | Classification-only, no cross-modal embeddings; cannot do text-to-image retrieval | **Wrong architecture for this use case** |
| **ResNet-50 features + PCA**              | Simple, well-understood, pure visual features                                                    | No semantic understanding; "red dress" text cannot retrieve red dress images      | **Insufficient for semantic search**     |
| **DINOv2 (self-supervised ViT)**          | Strong visual features without text supervision; excellent for similarity/clustering             | No text-image alignment out of the box; would need a separate text encoder        | **Overkill for this scope**              |

**Recommendation**: Use CLIP (`clip-vit-base-patch32`) as the default. If FashionCLIP is available and stable on Hugging Face Inference API, switch to it with a one-line model name change. The architecture should not depend on which specific embedding model is used -- only on the fact that it produces a fixed-dimension float vector.

### 1.4 ML Depth for Course Demo

CLIP demonstrates the following ML concepts at sufficient depth for MGMT 655:

| ML Concept               | Where It Appears                                           | Depth Level                                    |
| ------------------------ | ---------------------------------------------------------- | ---------------------------------------------- |
| Embedding space          | CLIP maps images to 768-dim vectors                        | Core concept, well-demonstrated                |
| Cosine similarity        | pgvector `<=>` operator for nearest-neighbor search        | Core concept, visualizable                     |
| Cross-modal retrieval    | Text prompt to image matching via shared embedding space   | Advanced concept, strong differentiator        |
| Transfer learning        | Using a pre-trained model (CLIP) without fine-tuning       | Standard practice, well-understood             |
| Dimensionality reduction | Embeddings as compressed representations of visual content | Core concept                                   |
| Vector database          | pgvector as specialized index for similarity search        | Infrastructure concept, increasingly important |

This is sufficient for an MBA-level ML course. The instructor will see: a real pre-trained model, a real vector database, real similarity computation, and a real application of these to a user-facing feature.

---

## 2. Embedding Pipeline Design

### 2.1 Option Analysis

| Option                               | Latency                       | Cost                         | Complexity                                                 | Reliability                  |
| ------------------------------------ | ----------------------------- | ---------------------------- | ---------------------------------------------------------- | ---------------------------- |
| **A: Client-side (Expo)**            | Fast (no network)             | Free                         | High (model download ~600MB, cross-platform compatibility) | Low (device fragmentation)   |
| **B: Supabase Edge Functions**       | Medium (cold start 200-500ms) | Low (included in plan)       | Medium (Deno runtime, limited ML libraries)                | Medium (cold start variance) |
| **C: Hugging Face Inference API**    | Medium (300-800ms)            | Free tier: 1K requests/month | Low (one HTTP call)                                        | High (managed service)       |
| **D: Hybrid (Claude Vision + CLIP)** | Two API calls: ~2-4s total    | Two API costs                | Medium (orchestration)                                     | Medium (two failure points)  |

### 2.2 Recommendation: Option D (Hybrid), Optimized

**Why not Option A (client-side)**: Running CLIP inference on-device in React Native requires either (a) ONNX Runtime for React Native (immature, limited model support) or (b) TensorFlow Lite (requires converting CLIP to TFLite format, which is non-trivial). The model file is ~600MB for ViT-B/32, which is untenable for a mobile app demo. Additionally, Expo's managed workflow does not support native ML runtimes well.

**Why not Option B (Supabase Edge Functions)**: Supabase Edge Functions run on Deno, which has limited ML library support. Running a CLIP model in a Deno edge function would require either a custom ONNX Runtime build for Deno or shipping the model as a WASM binary. Neither is practical for a course demo timeline.

**Why not Option C alone (HF Inference API)**: This would handle embeddings but not structured tagging. You would need a separate mechanism for extracting category, color, pattern, occasion, and formality. That mechanism would be... Claude Vision. So Option C alone becomes Option D by necessity.

**Option D is the right choice**. Here is the optimized pipeline:

```
User uploads photo
       |
       v
[1] Claude Vision API call
    Input: image
    Output: structured JSON { category, color, pattern, occasion, formality_score, description }
    Latency: ~1-2s
    Cost: ~$0.003 per image (claude-sonnet-4-20250514)
       |
       v
[2] Hugging Face Inference API call (parallel with storage)
    Input: image
    Output: 768-dim CLIP embedding vector
    Latency: ~300-800ms
    Cost: Free tier (within limits)
       |
       v
[3] Store in Supabase
    INSERT INTO closet_items (
      user_id, image_url,
      category, color, pattern, occasion, formality_score,  -- from Claude
      embedding vector(768),                                 -- from CLIP
      created_at
    )
```

**Key optimization**: Calls [1] and [2] can run in parallel since they are independent. Total perceived latency is max(1.5s, 0.6s) = ~1.5s, not 2.1s.

### 2.3 Failure Handling

| Failure Point                   | Impact                                    | Mitigation                                                                 |
| ------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| Claude Vision timeout           | No tags, item appears as "untagged"       | Queue for retry; show "tagging in progress" state                          |
| HF Inference API rate limit     | No embedding, semantic search unavailable | Fall back to tag-only search; generate embedding later                     |
| HF Inference API quota exceeded | Same as above                             | Monitor usage; alert at 80% of free tier                                   |
| Image too large / corrupt       | Both calls fail                           | Client-side validation before upload (max 10MB, JPEG/PNG only)             |
| Claude returns malformed JSON   | Parse error                               | Use structured output with schema validation; retry with simplified prompt |

### 2.4 Cost Estimate

For a course demo with 50-500 items per user, assuming one user:

| Component                       | Per-Image Cost    | 500 Items Total |
| ------------------------------- | ----------------- | --------------- |
| Claude Vision (claude-sonnet-4) | ~$0.003           | ~$1.50          |
| HF Inference API (free tier)    | $0.00             | $0.00           |
| Supabase storage                | $0.00 (free tier) | $0.00           |
| **Total**                       | **~$0.003**       | **~$1.50**      |

This is well within course demo budget.

---

## 3. Clustering Approach

### 3.1 What Does a "Style Cluster" Represent in CLIP Space?

This is the most important conceptual question. A cluster in CLIP embedding space groups items that are **visually similar** -- similar color palettes, similar garment type distributions, similar overall aesthetic appearance. It does NOT group items by:

- Social context ("workwear" vs "weekend")
- Formality level ("business formal" vs "smart casual")
- Seasonality ("summer" vs "winter")
- User preference ("I like this" vs "I don't")

CLIP clusters will look like: "a cluster of dark-colored items," "a cluster of light-colored dresses," "a cluster of blue denim items." These are **visual similarity groups**, not **style profiles**.

**This distinction matters for the demo presentation**: If you present the clustering as "the app learns your personal style," you are overstating what the ML does. If you present it as "the app groups visually similar items to help you discover patterns in your wardrobe," you are being accurate and still demonstrating a valuable concept.

### 3.2 Algorithm Selection

| Algorithm                        | Pros                                                                                              | Cons                                                                                 | Min Items for Meaningful Output |
| -------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------- |
| **K-Means**                      | Simple, fast, deterministic (with seed), easy to explain                                          | Requires choosing K; sensitive to outliers; assumes spherical clusters               | 50+ (with K=3-5)                |
| **DBSCAN**                       | No need to choose K; finds arbitrary shapes; identifies outliers                                  | Sensitive to epsilon parameter; can produce many small clusters or one giant cluster | 100+                            |
| **Hierarchical (Agglomerative)** | Produces a dendrogram (visualizable); no need for K upfront; intuitive for "groups within groups" | O(n^2) memory; harder to extract clean clusters                                      | 30+ (best for small datasets)   |
| **Gaussian Mixture Models**      | Soft clustering (items belong to multiple styles); probabilistic                                  | Assumes Gaussian distribution; may not fit embedding space                           | 100+                            |

**Recommendation for the demo: Hierarchical Agglomerative Clustering (HAC)**.

Rationale:

1. **Small dataset (50-500 items)**: HAC handles small datasets well. K-Means and DBSCAN are designed for larger datasets.
2. **Visualizability**: The dendrogram is a compelling visual for a course demo. You can show "your wardrobe naturally splits into 3-4 style groups."
3. **No K required upfront**: The user does not need to specify how many style groups they have. You can cut the dendrogram at a similarity threshold instead.
4. **Conceptual clarity**: HAC demonstrates the concept of "merging similar items into groups" in a way that is intuitive for non-technical viewers.
5. **ML concept richness**: HAC demonstrates distance metrics (cosine, Euclidean), linkage criteria (ward, average, complete), and dendrogram cutting -- three distinct ML concepts for the price of one algorithm.

### 3.3 Minimum Data Requirements

Clustering becomes meaningful at different thresholds:

| Item Count | What You Can Do                                                                                                                  | What You Should NOT Claim        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 10-30      | Describe the distribution (color breakdown, category breakdown); compute basic statistics                                        | "Personal style clusters"        |
| 30-50      | Run HAC with dendrogram; identify 2-3 broad visual groups; show the dendrogram in the demo                                       | "The AI understands my style"    |
| 50-100     | Stable clusters emerge; you can label them ("Dark Formal," "Colorful Casual"); tag-based and embedding-based clustering converge | "Style recommendations"          |
| 100-500    | Robust clustering; meaningful cosine similarity search; style profiling across multiple dimensions                               | Production-grade personalization |

**For the demo**: Aim for 30-50 items as the minimum viable dataset. Below 30, the clustering is mathematically valid but pragmatically meaningless (3 items per cluster is not a "style group"). Present this threshold honestly: "Once you've uploaded 30+ items, the app identifies your style groups."

### 3.4 Alternatives to Pure Embedding Clustering

| Approach                            | Description                                                                         | ML Concepts Demonstrated                                           | Verdict                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| **Embedding clustering (proposed)** | HAC on CLIP vectors                                                                 | Embeddings, distance metrics, hierarchical clustering, dendrogram  | **Primary approach**                           |
| **Tag frequency analysis**          | Count occurrences of tags; "40% of your items are blue, 60% are casual"             | Descriptive statistics, frequency distribution                     | **Complementary** -- show alongside clustering |
| **User preference vector**          | Build a vector from user's "like/dislike" actions; compare new items to this vector | Preference learning, collaborative filtering concepts              | **Phase 2** -- requires interaction data       |
| **Collaborative filtering**         | "Users with similar closets also liked X"                                           | User-user similarity, item-item similarity, recommendation systems | **Not applicable** -- single-user demo         |
| **Hybrid: tags + embeddings**       | Cluster on concatenated [CLIP embedding, one-hot encoded tags] vector               | Feature engineering, multi-modal feature spaces                    | **Strongest option for ML depth**              |

**Recommendation**: Primary approach is embedding clustering (HAC). Complement it with tag frequency analysis shown as a "wardrobe analytics" dashboard. Together, these demonstrate both unsupervised learning and descriptive statistics.

---

## 4. Semantic Search Quality

### 4.1 The Gap: "Rainy Diwali Dinner"

The product brief's signature query -- "Show me something for a rainy Diwali dinner" -- is a stress test for the ML pipeline. Let me trace what happens with each component:

**CLIP embedding search**:

- CLIP encodes "rainy Diwali dinner" into a 768-dim text embedding
- This embedding captures: dining, Indian cultural context (possibly), indoor, evening
- It does NOT capture: weather (rainy), specific cultural significance (Diwali), formality level
- The top results will be: items visually similar to images labeled with dining-related captions
- Expected result: reasonably relevant but not occasion-aware

**Tag-based filtering (from Claude Vision)**:

- Claude Vision tags items with: category, color, pattern, occasion, formality_score
- Claude Vision can understand "rainy Diwali dinner" as: "formal/semi-formal, indoor evening, Indian cultural context, possibly warm/rich colors"
- Filtering by occasion="formal" AND formality_score >= 0.7 would narrow the closet significantly
- Expected result: occasion-appropriate items, but no visual similarity ranking

**Hybrid approach** (recommended):

```
1. Claude interprets the prompt:
   "Rainy Diwali dinner" -> { occasion: "formal_dinner", formality: 0.8,
                                weather: "indoor", culture: "south_asian",
                                color_preferences: ["gold", "deep_red", "jewel_tones"] }

2. Tag pre-filter:
   SELECT * FROM closet_items
   WHERE formality_score >= 0.7
     AND category IN ('dress', 'kurta', 'saree', 'blazer', 'trousers')

3. CLIP reranking:
   ORDER BY embedding <=> clip_text_embedding("elegant dinner outfit gold deep red")
   LIMIT 5
```

### 4.2 Bridging the Semantic Gap

The gap between CLIP's visual similarity and fashion-appropriate matching is real. Here is how to bridge it:

| Gap                                      | Bridge                                                                                | Implementation                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| CLIP does not understand occasion        | Claude Vision tags occasion on each item; filter by occasion before similarity search | SQL WHERE clause before pgvector query                                                                    |
| CLIP does not understand formality       | Claude Vision assigns formality_score; filter by threshold                            | SQL WHERE formality_score >= :threshold                                                                   |
| CLIP does not understand weather         | Claude Vision can tag seasonality; filter by weather appropriateness                  | SQL WHERE season IN ('all_season', :season)                                                               |
| CLIP text embedding is too broad         | Reformulate the user's prompt into a more CLIP-friendly description via Claude        | Claude rewrites "rainy Diwali dinner" to "elegant warm-toned silk dress for festive evening dinner party" |
| Pure similarity returns too many results | Combine similarity score with tag match count; weighted scoring                       | `score = 0.6 * cosine_similarity + 0.4 * tag_match_ratio`                                                 |

### 4.3 Expected Search Quality at Demo Scale

| Query Type                         | Expected Quality                   | Why                                                                                               |
| ---------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| "Red dress"                        | Good                               | CLIP handles color + basic category well                                                          |
| "Something similar to this blazer" | Good                               | Pure visual similarity is CLIP's strength                                                         |
| "Casual weekend outfit"            | Moderate                           | Requires tag filtering; CLIP alone misses "casual"                                                |
| "Rainy Diwali dinner"              | Moderate with hybrid, Poor without | Requires Claude prompt interpretation + tag filtering + CLIP reranking                            |
| "What goes with these blue jeans"  | Poor                               | This is a composition/recommendation task, not a similarity task; requires outfit-level reasoning |

**For the demo**: Set expectations. Show the hybrid pipeline working for the top 3 query types. Acknowledge the limitations of the last 2. This honesty will impress the instructor more than pretending the system handles all query types equally well.

---

## 5. Course Credibility (MGMT 655)

### 5.1 ML Concepts Demonstrated

The full architecture demonstrates the following ML concepts, mapped to where each appears:

| ML Concept                     | Component                                                   | Demonstration Depth                                                |
| ------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| **Pre-trained model transfer** | CLIP via HF API                                             | Using a model trained on 400M image-text pairs without retraining  |
| **Embedding spaces**           | 768-dim CLIP vectors                                        | Mapping heterogeneous data (images, text) to a shared vector space |
| **Cosine similarity**          | pgvector `<=>` operator                                     | Nearest-neighbor search in high-dimensional space                  |
| **Vector databases**           | pgvector in Supabase                                        | Specialized indexing for similarity search                         |
| **Cross-modal retrieval**      | Text prompt to image matching                               | Zero-shot retrieval across modalities                              |
| **Hierarchical clustering**    | HAC on embeddings                                           | Unsupervised learning, dendrogram visualization                    |
| **Distance metrics**           | Cosine distance for similarity, Ward linkage for clustering | Choice of metric affects results                                   |
| **Hybrid retrieval**           | Tag filtering + embedding reranking                         | Combining structured and unstructured search                       |
| **LLM as feature extractor**   | Claude Vision for structured metadata                       | Using an LLM as a pre-processing step, not a decision-maker        |
| **Feature engineering**        | Combining CLIP embeddings with Claude Vision tags           | Multi-modal feature space construction                             |
| **Descriptive analytics**      | Tag frequency distributions                                 | Statistical summary of user's wardrobe                             |

This is a strong breadth of ML concepts. An MBA course instructor expects to see:

1. **A real pre-trained model in use** (CLIP via HF) -- checked
2. **A real vector database** (pgvector) -- checked
3. **A real clustering algorithm with visualization** (HAC dendrogram) -- checked
4. **A real application of these to a user-facing feature** (semantic search, style grouping) -- checked
5. **Honest evaluation of limitations** -- this evaluation document provides the material

### 5.2 What the Instructor Wants to See

Based on typical MBA ML course expectations:

1. **Problem formulation**: "How do we represent clothing items in a way that enables similarity search?" This is the core ML question, and the answer (embeddings) is correct.

2. **Model selection with justification**: Not just "we used CLIP" but "we evaluated CLIP, FashionCLIP, DeepFashion, and ResNet features, and chose CLIP because..." The alternatives table in Section 1.3 provides this.

3. **Data pipeline**: How data flows from user upload to stored embedding. The pipeline diagram in Section 2.2 provides this.

4. **Evaluation**: How do you know the system works? This is where most course projects are weakest. Recommendation:

   **Quantitative evaluation**: For 20 test items, measure:
   - **Tagging accuracy**: Claude Vision tags vs human-labeled ground truth (precision, recall per tag type)
   - **Similarity relevance**: For 10 "find similar" queries, compute Mean Reciprocal Rank (MRR) against human-judged relevance
   - **Cluster coherence**: Silhouette score for HAC clusters

   **Qualitative evaluation**: Demo walkthrough with 3 user scenarios, documenting where the system succeeds and fails.

5. **Limitations and future work**: Every good ML paper has this section. Sections 1.1, 3.1, and 4.1-4.3 provide the material.

### 5.3 Presentation Structure for Course Demo

Recommended structure for the MGMT 655 demo:

```
1. Problem (2 min)
   "People own clothes but can't remember what they have or what goes together."

2. ML Architecture (5 min)
   - Embedding pipeline: image -> CLIP -> 768-dim vector -> pgvector
   - Tagging pipeline: image -> Claude Vision -> structured metadata
   - Hybrid search: tag pre-filter + embedding reranking
   - Style discovery: HAC clustering on embeddings

3. Live Demo (5 min)
   - Upload 3 items, show auto-tagging in real-time
   - Search "red dress" -> show similarity results
   - Show wardrobe analytics (tag distribution chart)
   - Show style clusters (dendrogram or 2D PCA/t-SNE visualization)

4. Evaluation (3 min)
   - Tagging accuracy on test set
   - Similarity search MRR
   - Silhouette score for clusters
   - Known limitations with specific examples

5. ML Concepts Demonstrated (2 min)
   - Quick walkthrough of the concepts table
   - Emphasis on transfer learning, embedding spaces, hybrid retrieval

6. Q&A (3 min)
```

---

## Risk Register

| Risk                                            | Likelihood | Impact | Priority    | Mitigation                                                                   |
| ----------------------------------------------- | ---------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| CLIP produces poor clothing similarity          | Medium     | Medium | Significant | Hybrid search with tag pre-filtering reduces dependence on CLIP quality      |
| HF Inference API rate limits during demo        | Medium     | High   | Major       | Pre-generate embeddings for demo items; cache results locally                |
| Claude Vision returns inconsistent tags         | Medium     | Medium | Significant | Schema validation + retry with simplified prompt; manual tag correction UI   |
| Clustering on <30 items looks trivial           | High       | Low    | Minor       | Set minimum item threshold; supplement with tag frequency analysis           |
| "Rainy Diwali dinner" search fails in live demo | Medium     | High   | Major       | Pre-test the exact query; have fallback demo items that produce good results |
| Supabase pgvector not enabled on free tier      | Low        | High   | Significant | Verify pgvector extension availability on Supabase free plan before building |
| Cost overruns from Claude Vision API            | Low        | Low    | Minor       | Estimate ~$1.50 for 500 items; well within budget                            |

---

## Architecture Decision Record

### ADR-001: Hybrid Two-Track Embedding + Tagging Pipeline

**Status: Proposed**

**Context**: The app needs both structured metadata (category, color, occasion) and semantic similarity (embedding vectors) for its core features. A single model cannot provide both with sufficient quality. CLIP provides embeddings but poor structured tags. Claude Vision provides rich tags but no embeddings.

**Decision**: Run two parallel API calls on each uploaded image:

1. Claude Vision API -> structured JSON metadata
2. Hugging Face Inference API (CLIP) -> 768-dim embedding vector

Store both in Supabase. Use tags for filtering, embeddings for similarity ranking.

**Consequences**:

- Positive: Best-of-both-worlds quality; each model does what it is good at; parallel execution keeps latency acceptable
- Negative: Two API calls per upload (higher cost, two failure points); more complex error handling

**Alternatives Considered**:

- Claude Vision only (no embeddings): Loses similarity search and clustering -- the core ML differentiators
- CLIP only (no Claude Vision): Loses structured tags -- the primary user-facing value for browsing and filtering
- Local CLIP inference: Eliminates HF dependency but requires native module integration that Expo does not support

**Implementation Plan**:

- Phase 1: Claude Vision tagging pipeline + Supabase storage (user can browse tagged items)
- Phase 2: CLIP embedding generation + pgvector storage (similarity search enabled)
- Phase 3: Hybrid search (tag filter + embedding rerank) + HAC clustering

### ADR-002: Hierarchical Agglomerative Clustering for Style Discovery

**Status: Proposed**

**Context**: The app should identify style groups in a user's wardrobe. Dataset size is 30-500 items. Clustering should be explainable and visualizable for a course demo.

**Decision**: Use HAC with cosine distance and Ward linkage. Cut the dendrogram at a distance threshold that produces 3-7 clusters. Visualize using a dendrogram chart and 2D PCA projection colored by cluster.

**Consequences**:

- Positive: No need to pre-specify K; produces compelling dendrogram visualization; works well at small scale; demonstrates multiple ML concepts
- Negative: O(n^2) memory (acceptable at n<=500); Ward linkage with cosine distance is not always optimal; cluster labels need manual or LLM-generated interpretation

**Alternatives Considered**:

- K-Means: Simpler but requires choosing K; less visually compelling; weaker at small n
- DBSCAN: Does not require K but epsilon tuning is difficult; can produce degenerate results at small n
- No clustering, tag analysis only: Loses the unsupervised learning dimension; weaker ML demonstration

---

## Implementation Roadmap

### Phase 1: Foundation + Tagging (De-risk)

1. Supabase project setup with pgvector extension
2. Claude Vision tagging pipeline (image -> structured JSON -> Supabase row)
3. Closet grid UI with tag-based filtering
4. Verify: user can upload photo, see auto-generated tags, filter closet by tag

### Phase 2: Embeddings + Similarity

5. CLIP embedding generation via HF Inference API
6. pgvector storage and cosine similarity search
7. Semantic search UI ("find similar items")
8. Verify: user can tap an item and see visually similar items ranked by cosine similarity

### Phase 3: Style Discovery + Evaluation

9. HAC clustering on embeddings
10. Wardrobe analytics dashboard (tag frequency, cluster visualization)
11. Hybrid search (tag pre-filter + embedding rerank)
12. Evaluation metrics (tagging accuracy, MRR, silhouette score)
13. Verify: user can see style groups; demo presentation is complete

---

## Success Criteria

- [ ] User uploads a photo and receives structured tags within 3 seconds
- [ ] Semantic search returns top-5 similar items with >= 3/5 being visually relevant (human judgment)
- [ ] Clustering produces 3-7 stable groups at 50+ items (silhouette score > 0.2)
- [ ] Hybrid search handles "rainy Diwali dinner" with >= 2/5 relevant results
- [ ] Total API cost for 500-item demo stays under $5
- [ ] Demo presentation covers at least 8 distinct ML concepts from the table in Section 5.1
- [ ] Evaluation includes at least one quantitative metric (MRR, silhouette score, or tagging precision)
- [ ] Limitations are documented and demonstrated honestly
