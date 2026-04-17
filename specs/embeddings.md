# Embeddings & Similarity Search Specification

## Overview

CLIP embeddings provide semantic similarity between wardrobe items and text queries. Embeddings are stored in Supabase pgvector and queried via cosine similarity.

## Model Selection

| Model         | Dimensions | Latency (warm) | Quality | Decision                                 |
| ------------- | ---------- | -------------- | ------- | ---------------------------------------- |
| clip-ViT-B-32 | 512        | 1-3s           | Good    | **Selected** — fastest, smallest storage |
| clip-ViT-B-16 | 512        | 2-5s           | Better  | Not worth tradeoff for demo              |
| clip-ViT-L-14 | 768        | 5-10s          | Best    | Too slow for live use                    |

**Fixed dimension: 512** (vector(512) in pgvector column).

## Pipeline

```
Image uploaded to Supabase Storage
       |
       v
[1] Hugging Face Inference API call (parallel with Claude Vision)
    Input: image
    Output: 512-dim float vector
    Model: sentence-transformers/clip-ViT-B-32
    Expected latency: 1-3s (warm), 10-30s (cold start)
    Cost: Free tier (1000 req/day)
       |
       v
[2] Store in pgvector
    UPDATE clothing_items SET embedding = $1, embedding_status = 'done'
    WHERE id = $2
```

## Failure Handling

| Failure                   | Response                                                |
| ------------------------- | ------------------------------------------------------- |
| HF API timeout            | embedding_status = 'failed', retry later                |
| HF API rate limit (429)   | Queue for retry, show "Embedding pending"               |
| HF API cold start         | Accept up to 30s latency with progress indicator        |
| Quota exceeded (1000/day) | Stop generating, search works on already-embedded items |

## Pre-Compute Strategy (Demo)

All demo items must have embeddings pre-computed before demo day. This eliminates HF API dependency during the live presentation.

## Similarity Search

### Text-to-Image Search

```sql
-- User types "warm cozy sweater"
-- 1. Get text embedding via CLIP text encoder
-- 2. Query:
SELECT id, image_url, category, color, pattern, occasion, formality_score,
       1 - (embedding <=> $1) as similarity
FROM clothing_items
WHERE user_id = $2
  AND embedding IS NOT NULL
ORDER BY embedding <=> $1
LIMIT 10;
```

### Hybrid Search (Tag Filter + Embedding Rerank)

```sql
-- Magic Bar: "outfit for a rainy Diwali dinner"
-- 1. Claude interprets: formality >= 4, occasion = formal/party
-- 2. Filter by tags, then rank by similarity:
SELECT id, image_url, category, color, pattern, occasion, formality_score,
       1 - (embedding <=> $1) as similarity
FROM clothing_items
WHERE user_id = $2
  AND embedding IS NOT NULL
  AND formality_score >= $3
  AND category = ANY($4)  -- e.g. ['dress', 'top', 'bottom']
ORDER BY embedding <=> $1
LIMIT 5;
```

### Image-to-Image Similarity

```sql
-- "Find items similar to this one"
SELECT id, image_url, category, color,
       1 - (embedding <=> (SELECT embedding FROM clothing_items WHERE id = $1)) as similarity
FROM clothing_items
WHERE user_id = $2
  AND id != $1
  AND embedding IS NOT NULL
ORDER BY embedding <=> (SELECT embedding FROM clothing_items WHERE id = $1)
LIMIT 10;
```

## Performance

- 50 items x 512 dims: brute-force cosine similarity < 5ms
- 500 items x 512 dims: still < 50ms
- No ANN index needed at this scale
- Text embedding via HF API: 1-3s (bottleneck for search)

## Limitations

- CLIP does not understand fabric texture, drape, or silhouette
- CLIP has no concept of social occasion or cultural context
- ~60-65% accuracy on fine-grained clothing categories
- Tag pre-filtering is essential for quality results on complex queries
