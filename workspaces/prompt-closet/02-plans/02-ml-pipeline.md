# Prompt Closet -- ML Pipeline Implementation Plan

**Phase**: 02-Plans
**Date**: 2026-04-17
**Status**: Approved for implementation

---

## 1. ML Pipeline Overview

The ML pipeline is a hybrid two-track design that combines Claude Vision (structured tagging) with CLIP embeddings (semantic similarity). This split maximizes both demo quality and ML concept breadth.

```
┌──────────────────────────────────────────────────────────────────┐
│                     ML PIPELINE                                  │
│                                                                  │
│  User uploads photo                                               │
│         │                                                         │
│         ▼                                                         │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ Claude Vision   │    │ CLIP (HF API)    │                    │
│  │ (structured     │    │ (embedding       │                    │
│  │  tagging)       │    │  generation)     │                    │
│  │                 │    │                 │                    │
│  │ Output:         │    │ Output:          │                    │
│  │ - category      │    │ 512-dim vector  │                    │
│  │ - color         │    │                 │                    │
│  │ - pattern       │    │                 │                    │
│  │ - occasion      │    │                 │                    │
│  │ - formality (1-5)│   │                 │                    │
│  └────────┬────────┘    └────────┬────────┘                    │
│           │                      │                             │
│           │     PARALLEL         │                             │
│           └──────────┬────────────┘                             │
│                      ▼                                          │
│         ┌─────────────────────────┐                             │
│         │   Supabase PostgreSQL   │                             │
│         │   pgvector storage      │                             │
│         │                         │                             │
│         │ clothing_items table:   │                             │
│         │ - tags (structured)     │                             │
│         │ - embedding (vector)    │                             │
│         └─────────────────────────┘                             │
│                      │                                          │
│           ┌─────────┴─────────┐                                 │
│           ▼                   ▼                                 │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │ Tag-based Filter │  │ Embedding       │                     │
│  │ (SQL WHERE)      │  │ Rerank          │                     │
│  │                 │  │ (cosine sim)    │                     │
│  └────────┬────────┘  └────────┬────────┘                     │
│           │                   │                                 │
│           └─────────┬─────────┘                                 │
│                     ▼                                           │
│           ┌─────────────────┐                                   │
│           │ Hybrid Search   │                                   │
│           │ Results          │                                   │
│           └─────────────────┘                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase 1a: Foundation + Tagging

**Goal**: User uploads photo and sees auto-generated tags within 3 seconds.

### 2.1 Supabase Setup

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create schema (profiles, clothing_items, outfits)
-- See 01-architecture.md Section 5 for full schema
```

**Verification:**

- [ ] pgvector extension enabled
- [ ] All tables created with correct column types
- [ ] RLS policies created and tested
- [ ] Storage bucket created with RLS policies
- [ ] Profile trigger created (auto-create profile on signup)

### 2.2 Claude Vision Pipeline

**Pipeline flow:**

```
Image URL (Supabase Storage public URL)
    │
    ├── Validate: image accessible, <5MB
    │
    ├── Claude Vision API call:
    │   Model: claude-sonnet-4-20250514
    │   Input: image as URL
    │   System prompt: structured tagging prompt with JSON schema
    │
    ├── Parse response:
    │   - Extract JSON from response
    │   - Validate against allowed values
    │   - On parse failure: retry with stricter prompt
    │
    └── Update Supabase:
        SET tag_status='done',
            category=?, color=?, pattern=?, occasion=?, formality_score=?
```

**Claude Vision Prompt:**

```
[SYSTEM]
You are a clothing item classifier. You receive an image of a single clothing item.
Return ONLY a valid JSON object with these exact fields and no other text:

{
  "category": "<one of: top, bottom, dress, outerwear, footwear, accessory>",
  "color": "<primary color, lowercase, e.g. navy, black, white, burgundy, olive>",
  "pattern": "<one of: solid, striped, plaid, floral, geometric, abstract, paisley, polka-dot, unknown>",
  "occasion": "<one of: casual, business, formal, party, athletic, unknown>",
  "formality_score": <integer 1-5 where 1=very casual, 5=very formal>
}

If the image is unclear or contains multiple items, classify the most prominent item.
If you cannot determine a field, use "unknown" for strings and 3 for formality_score.
Return the JSON object and nothing else. No commentary.

[USER]
[Image attachment]
```

**Retry Prompt (on JSON parse failure):**

```
Your previous response was not valid JSON. Return ONLY the JSON object with these exact fields:
{"category": "...", "color": "...", "pattern": "...", "occasion": "...", "formality_score": ...}
No explanation, no text outside the JSON.
```

**Concurrency:**

- Max 4 concurrent Claude Vision calls (stay under 40 req/min rate limit)
- Use `Promise.all` with concurrency limit via semaphore pattern

**Implementation:**

```typescript
// ml/claude-vision.ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY!,
});

const TAGGING_SYSTEM_PROMPT = `You are a clothing item classifier...
Return ONLY a valid JSON object with these exact fields...`;

const RETRY_PROMPT = `Your previous response was not valid JSON.
Return ONLY the JSON object with no additional text.`;

interface TagResult {
  category: string;
  color: string;
  pattern: string;
  occasion: string;
  formality_score: number;
}

export async function tagImageWithClaude(
  imageUrl: string,
  maxRetries = 2,
): Promise<TagResult> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system: attempt === 0 ? TAGGING_SYSTEM_PROMPT : RETRY_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "url", url: imageUrl },
              },
              {
                type: "text",
                text: "Analyze this clothing item and return the JSON.",
              },
            ],
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      const parsed = JSON.parse(text);
      return validateAndNormalize(parsed);
    } catch (error) {
      if (attempt === maxRetries) {
        // Fallback tags on all retries exhausted
        return {
          category: "uncategorized",
          color: "unknown",
          pattern: "unknown",
          occasion: "casual",
          formality_score: 3,
        };
      }
      // Retry on parse error or API error
      continue;
    }
  }
  throw new Error("Unexpected: maxRetries exhausted without return");
}

function validateAndNormalize(raw: any): TagResult {
  const validCategories = [
    "top",
    "bottom",
    "dress",
    "outerwear",
    "footwear",
    "accessory",
  ];
  const validPatterns = [
    "solid",
    "striped",
    "plaid",
    "floral",
    "geometric",
    "abstract",
    "paisley",
    "polka-dot",
    "unknown",
  ];
  const validOccasions = [
    "casual",
    "business",
    "formal",
    "party",
    "athletic",
    "unknown",
  ];

  return {
    category: validCategories.includes(raw.category)
      ? raw.category
      : "uncategorized",
    color: typeof raw.color === "string" ? raw.color.toLowerCase() : "unknown",
    pattern: validPatterns.includes(raw.pattern) ? raw.pattern : "unknown",
    occasion: validOccasions.includes(raw.occasion) ? raw.occasion : "casual",
    formality_score: Math.min(
      5,
      Math.max(1, parseInt(raw.formality_score) || 3),
    ),
  };
}
```

### 2.3 Integration with Upload Flow

```typescript
// services/upload-service.ts
export async function uploadAndTagImage(
  userId: string,
  imageUri: string,
  onProgress: (state: UploadState) => void,
): Promise<ClothingItem> {
  try {
    // 1. Compress image
    onProgress({ status: "compressing", progress: 0 });
    const compressed = await ImageManipulator.manipAsync(imageUri, [
      { resize: { width: 1024 } },
      { format: ImageManipulator.SaveFormat.JPEG, quality: 0.7 },
    ]);

    // 2. Generate thumbnail
    const thumbnail = await ImageManipulator.manipAsync(imageUri, [
      { resize: { width: 200 } },
      { format: ImageManipulator.SaveFormat.JPEG, quality: 0.5 },
    ]);

    // 3. Upload to Supabase Storage
    onProgress({ status: "uploading", progress: 0 });
    const itemId = generateUUID();
    const imagePath = `${userId}/${itemId}.jpeg`;
    const thumbnailPath = `${userId}/${itemId}_thumb.jpeg`;

    await supabase.storage
      .from("closet-images")
      .upload(imagePath, await fetch(compressed.uri).then((r) => r.blob()), {
        contentType: "image/jpeg",
      });

    await supabase.storage
      .from("closet-images")
      .upload(thumbnailPath, await fetch(thumbnail.uri).then((r) => r.blob()), {
        contentType: "image/jpeg",
      });

    // 4. Get public URLs
    const {
      data: { publicUrl: imageUrl },
    } = supabase.storage.from("closet-images").getPublicUrl(imagePath);

    const {
      data: { publicUrl: thumbnailUrl },
    } = supabase.storage.from("closet-images").getPublicUrl(thumbnailPath);

    // 5. Insert row with pending status
    onProgress({ status: "tagging", itemId });
    const { data: item, error } = await supabase
      .from("clothing_items")
      .insert({
        id: itemId,
        user_id: userId,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        image_storage_path: imagePath,
        tag_status: "processing",
        embedding_status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // 6. Fire Claude Vision and CLIP in parallel
    const [tags, embedding] = await Promise.all([
      tagImageWithClaude(imageUrl),
      generateClipEmbedding(imageUrl),
    ]);

    // 7. Update with tags and embedding
    const { error: updateError } = await supabase
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

    if (updateError) throw updateError;

    onProgress({ status: "done", item: { ...item, ...tags } });
    return { ...item, ...tags };
  } catch (error) {
    onProgress({ status: "error", message: error.message, retryable: true });
    throw error;
  }
}
```

### 2.4 Verification Criteria

- [ ] Image upload completes and item appears in closet grid
- [ ] Tags appear within 3 seconds of upload completion
- [ ] Tags are correct for at least 80% of well-lit photos
- [ ] Tag editing UI allows correction of mis-tagged items
- [ ] Failed tagging shows "Tap to retag" button
- [ ] Upload progress states visible (compressing → uploading → tagging → done)
- [ ] Multiple concurrent uploads processed correctly (max 4 at a time)

---

## 3. Phase 1b: Embeddings + Similarity

**Goal**: Semantic search returns visually similar items ranked by cosine similarity.

### 3.1 CLIP Embedding Generation

**Model**: `sentence-transformers/clip-ViT-B-32`

- Dimensions: 512
- Latency: 1-3s (warm), 10-30s (cold start)
- Cost: Free tier (1000 req/day)

**Pipeline:**

```
Image URL (Supabase Storage public URL)
    │
    ├── Hugging Face Inference API call:
    │   Endpoint: https://api-inference.huggingface.co/models/sentence-transformers/clip-ViT-B-32
    │   Method: POST
    │   Body: { "inputs": imageUrl }
    │   Response: 512-dim float array
    │
    └── Store in pgvector:
        UPDATE clothing_items
        SET embedding = $1, embedding_status = 'done'
        WHERE id = $2
```

**Implementation:**

```typescript
// ml/clip-service.ts
const HF_INFERENCE_URL =
  "https://api-inference.huggingface.co/models/sentence-transformers/clip-ViT-B-32";

export async function generateClipEmbedding(
  imageUrl: string,
  signal?: AbortSignal,
): Promise<number[] | null> {
  try {
    const response = await fetch(HF_INFERENCE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: imageUrl }),
      signal,
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited — return null, caller queues for retry
        return null;
      }
      throw new Error(`HF API error: ${response.status}`);
    }

    const embedding = await response.json();
    return embedding; // 512-dim float array
  } catch (error) {
    if (error.name === "AbortError") {
      return null; // Cancelled, not failed
    }
    throw error;
  }
}

// For text queries (Magic Bar input)
export async function embedText(
  query: string,
  signal?: AbortSignal,
): Promise<number[] | null> {
  try {
    const response = await fetch(HF_INFERENCE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: query }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HF API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      return null;
    }
    throw error;
  }
}
```

### 3.2 pgvector Storage

**Schema:**

```sql
-- Embedding column already in clothing_items table:
embedding vector(512)

-- No index needed at demo scale (<500 items)
-- For production at 1000+ items, add IVFFlat index:
-- CREATE INDEX idx_clothing_items_embedding
--   ON clothing_items USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);
```

### 3.3 Similarity Search

**SQL for semantic search:**

```sql
-- Text-to-image: "warm cozy sweater"
-- 1. Get text embedding via CLIP (application code)
-- 2. Query:
SELECT
  id,
  image_url,
  thumbnail_url,
  category,
  color,
  pattern,
  occasion,
  formality_score,
  1 - (embedding <=> $1) as similarity
FROM clothing_items
WHERE user_id = $2
  AND embedding IS NOT NULL
ORDER BY embedding <=> $1
LIMIT 10;
```

**Note**: pgvector `<=>` operator is cosine distance (0 = identical, 2 = opposite). Use `1 - distance` to get similarity score (1 = identical, -1 = opposite).

**Implementation:**

```typescript
// services/search-service.ts
export async function semanticSearch(
  userId: string,
  query: string,
  filters?: {
    category?: string[];
    formalityMin?: number;
    formalityMax?: number;
    occasion?: string[];
  },
  limit = 10,
): Promise<SearchResult[]> {
  // 1. Get text embedding for query
  const queryEmbedding = await embedText(query);
  if (!queryEmbedding) {
    throw new Error("Failed to generate query embedding");
  }

  // 2. Build query with optional filters
  let supabaseQuery = supabase
    .from("clothing_items")
    .select(
      "id, image_url, thumbnail_url, category, color, pattern, occasion, formality_score",
    )
    .eq("user_id", userId)
    .eq("embedding_status", "done")
    .limit(limit * 3); // Fetch extra for reranking

  if (filters?.category?.length) {
    supabaseQuery = supabaseQuery.in("category", filters.category);
  }
  if (filters?.formalityMin !== undefined) {
    supabaseQuery = supabaseQuery.gte("formality_score", filters.formalityMin);
  }
  if (filters?.formalityMax !== undefined) {
    supabaseQuery = supabaseQuery.lte("formality_score", filters.formalityMax);
  }
  if (filters?.occasion?.length) {
    supabaseQuery = supabaseQuery.in("occasion", filters.occasion);
  }

  const { data: items, error } = await supabaseQuery;
  if (error) throw error;

  // 3. Calculate cosine similarity in application code
  // (pgvector `<=>` operator not directly exposed via Supabase JS client)
  // Alternative: use Supabase RPC or raw SQL via PostgREST

  // For demo simplicity, use tag-based filtering + ordering
  // True pgvector query via Supabase Edge Function:
  const { data: results } = await supabase.rpc("search_by_embedding", {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: limit,
    match_threshold: 0.6,
  });

  return results;
}
```

**Supabase RPC for pgvector search:**

```sql
CREATE OR REPLACE FUNCTION search_by_embedding(
  query_embedding vector(512),
  match_user_id UUID,
  match_count INT DEFAULT 10,
  match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  image_url TEXT,
  category TEXT,
  color TEXT,
  pattern TEXT,
  occasion TEXT,
  formality_score SMALLINT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id,
    ci.image_url,
    ci.category,
    ci.color,
    ci.pattern,
    ci.occasion,
    ci.formality_score,
    1 - (ci.embedding <=> query_embedding) as similarity
  FROM clothing_items ci
  WHERE ci.user_id = match_user_id
    AND ci.embedding IS NOT NULL
    AND 1 - (ci.embedding <=> query_embedding) >= match_threshold
  ORDER BY ci.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 3.4 Pre-Compute Strategy (Demo)

For demo reliability, pre-compute all embeddings before presentation:

```typescript
// scripts/precompute-embeddings.ts
export async function precomputeDemoEmbeddings(userId: string): Promise<void> {
  // Fetch all items without embeddings
  const { data: items } = await supabase
    .from("clothing_items")
    .select("id, image_url")
    .eq("user_id", userId)
    .is("embedding", null);

  console.log(`Pre-computing embeddings for ${items.length} items...`);

  for (const item of items) {
    console.log(`  Embedding: ${item.id}`);
    const embedding = await generateClipEmbedding(item.image_url);

    await supabase
      .from("clothing_items")
      .update({ embedding, embedding_status: "done" })
      .eq("id", item.id);

    // Small delay to avoid HF rate limits
    await sleep(500);
  }

  console.log("Done!");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Run precompute script:**

```bash
# Before demo day
npx ts-node scripts/precompute-embeddings.ts --user-id <demo-user-id>
```

### 3.5 Verification Criteria

- [ ] CLIP embedding generated for each uploaded image
- [ ] Embedding stored in pgvector correctly (512 dimensions)
- [ ] Semantic search returns items ranked by cosine similarity
- [ ] "Find similar" on any item shows visually related items
- [ ] Pre-computed embeddings work without HF API during demo
- [ ] Embedding generation handles 429 rate limit gracefully (retry after 60s)
- [ ] Embedding failure does not block tagging (parallel execution)

---

## 4. Phase 1c: Style Discovery + Evaluation

**Goal**: HAC clustering identifies style groups; evaluation metrics demonstrate ML quality.

### 4.1 HAC Clustering (Hierarchical Agglomerative Clustering)

**Algorithm**: AgglomerativeClustering from scikit-learn (via Supabase Edge Function or Python microservice)

**Rationale**:

- No need to pre-specify K (unlike K-Means)
- Produces dendrogram visualization (compelling for course demo)
- Works well on small datasets (30-500 items)
- Demonstrates distance metrics, linkage criteria, dendrogram cutting

**Implementation:**

```typescript
// ml/style-clustering.ts
import { DBSCAN } from "scikit-learn"; // Or use @xenova/transformers in browser

interface ClusterResult {
  clusterLabels: number[]; // -1 for noise (DBSCAN) or 0..K-1 for HAC
  centroids?: number[][]; // For visualization
  dendrogram?: DendrogramNode;
}

// HAC via scipy (Python Edge Function)
// For React Native, use a Supabase Edge Function (Python) or pre-compute clusters

/*
POST /functions/v1/cluster-wardrobe
Body: { user_id: string }
Response: {
  clusters: { id: number; item_ids: string[]; dominant_color: string; name: string }[],
  dendrogram: DendrogramNode,
  silhouette_score: number
}
*/

// Dendrogram visualization data structure
interface DendrogramNode {
  id: string;
  children?: DendrogramNode[];
  items?: string[]; // Leaf node with item IDs
  distance?: number; // Merge distance
  label?: string; // Cluster name
}
```

**Cluster interpretation:**

```sql
-- Get dominant characteristics per cluster
SELECT
  cluster_id,
  mode(category) as dominant_category,
  mode(color) as dominant_color,
  AVG(formality_score) as avg_formality,
  COUNT(*) as item_count
FROM (
  SELECT
    unnest($1::int[]) as cluster_id,
    id
  FROM clothing_items
  WHERE user_id = $2
) sub
GROUP BY cluster_id;
```

### 4.2 Hybrid Search (Tag Filter + Embedding Rerank)

**For Magic Bar queries like "rainy Diwali dinner":**

```
1. Claude interprets prompt:
   "Rainy Diwali dinner" → {
     formality: 0.8,
     occasion: "formal",
     weather: "indoor",
     color_preferences: ["gold", "deep_red", "jewel_tones"]
   }

2. Tag pre-filter:
   WHERE formality_score >= 4
     AND occasion IN ('formal', 'party')

3. CLIP reranking:
   ORDER BY embedding <=> clip_text_embedding("elegant formal dinner outfit gold deep red")
```

**Implementation:**

```typescript
// services/outfit-composer.ts
export async function composeOutfit(
  userId: string,
  prompt: string,
): Promise<OutfitResult> {
  // 1. Claude interprets prompt → structured filter
  const interpretation = await interpretPrompt(prompt);

  // 2. Fetch items matching tag filter
  const { data: filteredItems } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("user_id", userId)
    .eq("tag_status", "done")
    .gte("formality_score", interpretation.formality_threshold)
    .in("category", interpretation.categories)
    .limit(50);

  if (!filteredItems?.length) {
    return { success: false, reason: "no_matching_items" };
  }

  // 3. Get CLIP text embedding for prompt
  const queryEmbedding = await embedText(interpretation.search_query);

  // 4. Rank by cosine similarity within filtered set
  const ranked = filteredItems
    .map((item) => ({
      ...item,
      similarity: cosineSimilarity(item.embedding, queryEmbedding),
    }))
    .sort((a, b) => b.similarity - a.similarity);

  // 5. Slot-based outfit composition
  const slots = selectOutfitSlots(ranked, interpretation);

  // 6. Generate reasoning
  const reasoning = await generateOutfitReasoning(slots, prompt);

  return {
    success: true,
    outfit: {
      items: slots,
      reasoning,
      prompt,
      occasion: interpretation.occasion,
    },
  };
}

interface PromptInterpretation {
  formality_threshold: number; // 1-5
  categories: string[]; // e.g., ['top', 'bottom', 'shoes']
  occasion: string;
  weather?: string;
  color_preferences?: string[];
  search_query: string; // CLIP-friendly reformulation
}
```

### 4.3 Evaluation Metrics

| Metric                     | Description                                             | Target       | Measurement                               |
| -------------------------- | ------------------------------------------------------- | ------------ | ----------------------------------------- |
| Tagging Accuracy           | Claude tags vs human-labeled ground truth               | >= 80%       | Pre-labeled test set of 20 items          |
| MRR (Mean Reciprocal Rank) | For "find similar" queries, rank of first relevant item | >= 0.6       | 10 test queries, human relevance judgment |
| Silhouette Score           | Cluster coherence (HAC)                                 | >= 0.2       | Computed on clustering output             |
| Recall@K (Search)          | Relevant items in top-K results                         | >= 0.7 @ K=5 | 10 test queries                           |

**Quantitative Evaluation Setup:**

```typescript
// evaluation/test-set.ts
const EVALUATION_ITEMS = [
  {
    id: "1",
    image: "navy_blazer.jpg",
    category: "outerwear",
    color: "navy",
    expected: ["blazer", "jacket"],
  },
  {
    id: "2",
    image: "red_dress.jpg",
    category: "dress",
    color: "red",
    expected: ["dress", "gown"],
  },
  // ... 20 items total
];

const TEST_QUERIES = [
  { query: "similar to the navy blazer", relevantIds: ["1", "5", "12"] },
  { query: "red dress for a party", relevantIds: ["2", "8"] },
  // ... 10 queries total
];

async function evaluateTaggingAccuracy(): Promise<number> {
  let correct = 0;
  for (const item of EVALUATION_ITEMS) {
    const predicted = await tagImageWithClaude(item.image);
    if (
      predicted.category === item.category &&
      predicted.color === item.color
    ) {
      correct++;
    }
  }
  return correct / EVALUATION_ITEMS.length;
}

async function evaluateSearchMRR(): Promise<number> {
  let reciprocalRankSum = 0;
  for (const { query, relevantIds } of TEST_QUERIES) {
    const results = await semanticSearch(query, { limit: 5 });
    for (let i = 0; i < results.length; i++) {
      if (relevantIds.includes(results[i].id)) {
        reciprocalRankSum += 1 / (i + 1);
        break;
      }
    }
  }
  return reciprocalRankSum / TEST_QUERIES.length;
}
```

### 4.4 Style DNA Visualization

```typescript
// components/StyleDNA.tsx
interface StyleDNAProps {
  items: ClothingItem[];
  clusters?: ClusterResult;
}

export function StyleDNA({ items, clusters }: StyleDNAProps) {
  // Color palette
  const colorDistribution = countBy(items, 'color');

  // Category distribution
  const categoryDistribution = countBy(items, 'category');

  // Average formality
  const avgFormality = items.reduce((sum, i) => sum + i.formality_score, 0) / items.length;

  // Occasion breakdown
  const occasionDistribution = countBy(items.flatMap(i => i.occasion.split(',')), v => v);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Style DNA</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Color Palette</Text>
        <View style={styles.colorRow}>
          {Object.entries(colorDistribution).map(([color, count]) => (
            <View key={color} style={[styles.colorSwatch, { backgroundColor: color }]}>
              <Text style={styles.colorCount}>{count}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Categories</Text>
        {Object.entries(categoryDistribution)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([category, count]) => (
            <View key={category} style={styles.barRow}>
              <Text style={styles.barLabel}>{category}</Text>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${(count / items.length) * 100}%` }]} />
              </View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Formality Range</Text>
        <View style={styles.formalityScale}>
          <Text>Casual</Text>
          <View style={styles.formalityBar}>
            <View style={[styles.formalityMarker, { left: `${(avgFormality / 5) * 100}%` }]} />
          </View>
          <Text>Formal</Text>
        </View>
        <Text style={styles.formalityValue}>Average: {avgFormality.toFixed(1)} / 5</Text>
      </View>
    </View>
  );
}
```

### 4.5 Verification Criteria

- [ ] HAC clustering produces 3-7 style groups at 50+ items
- [ ] Dendrogram visualization renders correctly
- [ ] Cluster labels generated (e.g., "Office Core", "Weekend Casual")
- [ ] Style DNA shows color palette, category distribution, formality range
- [ ] Tagging accuracy >= 80% on pre-labeled test set
- [ ] Search MRR >= 0.6 on test queries
- [ ] Silhouette score >= 0.2 for cluster quality

---

## 5. ML Pipeline Error Handling

### 5.1 Failure Modes and Responses

| Failure                      | Detection          | Response                       | Recovery                        |
| ---------------------------- | ------------------ | ------------------------------ | ------------------------------- |
| Claude Vision timeout        | 10s timeout        | Mark tag_status='failed'       | Show "Tap to retag"             |
| Claude 429 rate limit        | HTTP 429           | Wait 60s, retry                | Batch uploads queue             |
| HF API cold start            | >30s response      | Accept with progress indicator | Pre-warm before demo            |
| HF 429 rate limit            | HTTP 429           | Queue for later                | Pre-compute embeddings          |
| HF quota exceeded            | 1000 req/day       | Stop generating                | Embeddings work on cached items |
| Embedding dimension mismatch | Vector != 512 dims | Reject and log                 | Retry with correct model        |
| Malformed JSON from Claude   | JSON.parse fails   | Retry with stricter prompt     | Fallback tags after 2 retries   |

### 5.2 Retry Logic

```typescript
// ml/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    backoffMs?: number;
    shouldRetry?: (error: any) => boolean;
  } = {},
): Promise<T> {
  const { maxAttempts = 3, backoffMs = 1000, shouldRetry } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
      if (shouldRetry && !shouldRetry(error)) throw error;

      await sleep(backoffMs * Math.pow(2, attempt)); // Exponential backoff
    }
  }
  throw new Error("Unreachable");
}

// Usage
const embedding = await withRetry(() => generateClipEmbedding(imageUrl), {
  maxAttempts: 3,
  backoffMs: 2000,
  shouldRetry: (error) => {
    if (error.message.includes("429")) return true; // Rate limit
    if (error.message.includes("timeout")) return true;
    return false;
  },
});
```

---

## 6. ML Pipeline Performance

### 6.1 Latency Budget

| Operation                         | Target | Acceptable | Critical |
| --------------------------------- | ------ | ---------- | -------- |
| CLIP embedding (HF API warm)      | 1s     | 2s         | 5s       |
| CLIP embedding (HF API cold)      | 10s    | 20s        | 30s      |
| Claude Vision tagging             | 2s     | 3s         | 5s       |
| Semantic search (text → results)  | 1.5s   | 3s         | 5s       |
| Total upload-to-tagged (parallel) | 3s     | 5s         | 8s       |

### 6.2 Concurrency Limits

| API              | Limit                          | Strategy                       |
| ---------------- | ------------------------------ | ------------------------------ |
| Claude Vision    | 40 req/min (Tier 1)            | Max 4 concurrent               |
| HF Inference API | 1000 req/day, 10 req/min burst | Max 3 concurrent, queue        |
| Supabase DB      | Connection pool                | Reuse client, connection limit |

### 6.3 Pre-Warming (Demo)

```typescript
// Before demo search, pre-warm HF API
async function prewarmHFAPI() {
  console.log("Pre-warming HF API...");
  const warmupEmbedding = await generateClipEmbedding(
    "https://example.com/warmup-image.jpg",
  );
  console.log("HF API warm!");
}
```

---

## 7. Evaluation Dashboard

### 7.1 Metrics to Track

```typescript
interface MetricsDashboard {
  // Tagging quality
  taggingAccuracy: number; // % correct on eval set
  categoryAccuracy: number; // Per-tag accuracy
  colorAccuracy: number;

  // Search quality
  meanReciprocalRank: number; // MRR across test queries
  recallAt5: number; // Relevant in top 5

  // Clustering quality
  silhouetteScore: number; // -1 to 1, higher = better
  numClusters: number;
  avgClusterSize: number;

  // System health
  avgTagLatency: number; // ms
  avgEmbeddingLatency: number; // ms
  hfQuotaUsed: number; // 0-1000
  claudeUsageToday: number; // API calls
}
```

### 7.2 Demo Presentation Metrics

For MGMT 655 course demo, prepare:

1. **Quantitative**: tagging accuracy %, MRR score, silhouette score
2. **Qualitative**: 3 live demo scenarios with success/failure notes
3. **Limitations**: honest discussion of where the system struggles

---

## 8. Implementation Task List

### Phase 1a: Foundation + Tagging

- [ ] Supabase project setup with pgvector
- [ ] Schema migrations (profiles, clothing_items, outfits)
- [ ] Storage bucket with RLS policies
- [ ] Claude Vision integration (tagImageWithClaude)
- [ ] Tag status state machine
- [ ] Tag editing UI
- [ ] Upload progress states

### Phase 1b: Embeddings + Similarity

- [ ] CLIP embedding generation (generateClipEmbedding)
- [ ] Embedding storage in pgvector
- [ ] Similarity search RPC function
- [ ] Semantic search UI (Magic Bar)
- [ ] Pre-compute script for demo items
- [ ] HF API error handling and retry

### Phase 1c: Style Discovery + Evaluation

- [ ] HAC clustering (Supabase Edge Function or Python service)
- [ ] Cluster interpretation and labeling
- [ ] Style DNA visualization
- [ ] Evaluation metrics computation
- [ ] Test set and test queries

---

## 9. Dependencies

| Dependency               | Version | Purpose                        |
| ------------------------ | ------- | ------------------------------ |
| `@anthropic-ai/sdk`      | ^0.27   | Claude Vision API client       |
| `@supabase/supabase-js`  | ^2      | Supabase client                |
| `expo-image-manipulator` | ~13     | Image compression and resizing |
| `expo-image-picker`      | ~15     | Camera and gallery access      |
| `expo-secure-store`      | ~13     | Secure token storage           |

---

## 10. File Structure

```
src/
├── ml/
│   ├── claude-vision.ts     # Tagging pipeline
│   ├── clip-service.ts       # Embedding generation
│   ├── style-clustering.ts   # HAC clustering
│   ├── outfit-composer.ts    # Magic Bar outfit logic
│   ├── evaluation.ts         # Metrics computation
│   └── retry.ts              # Retry with backoff
├── services/
│   ├── supabase.ts           # Supabase client
│   ├── upload-service.ts     # Upload + tag pipeline
│   ├── search-service.ts    # Semantic search
│   └── storage-service.ts    # Image storage
├── components/
│   ├── ClosetGrid.tsx
│   ├── ItemCard.tsx
│   ├── MagicBar.tsx
│   ├── OutfitCard.tsx
│   ├── StyleDNA.tsx
│   └── TagEditor.tsx
├── screens/
│   ├── AuthScreen.tsx
│   ├── ClosetScreen.tsx
│   ├── CameraScreen.tsx
│   ├── TagReviewScreen.tsx
│   ├── SearchScreen.tsx
│   └── ProfileScreen.tsx
└── App.tsx
```
