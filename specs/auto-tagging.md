# Auto-Tagging Pipeline Specification

## Overview

Each uploaded clothing image goes through Claude Vision API to extract structured metadata. The pipeline runs in parallel with CLIP embedding generation.

## Pipeline

```
Image uploaded to Supabase Storage
       |
       v
[1] Claude Vision API call (parallel with CLIP)
    Input: image URL (public Supabase Storage URL)
    Output: structured JSON { category, color, pattern, occasion, formality_score }
    Expected latency: 1-3s per image
    Cost: ~$0.003 per image (claude-sonnet-4-20250514)
       |
       v
[2] Schema validation
    Parse JSON response. Validate each field against allowed values.
    On parse failure: retry with stricter prompt (max 2 retries).
       |
       v
[3] Update Supabase row
    SET tag_status = 'done', category = ..., color = ..., etc.
    On failure: SET tag_status = 'failed'
```

## Claude Vision Prompt Template

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

## Retry Prompt (on JSON parse failure)

```
Your previous response was not valid JSON. Return ONLY the JSON object with no additional text.
```

Max 2 retries. On all retries exhausted: tag as `{category: "uncategorized", color: "unknown", pattern: "unknown", occasion: "casual", formality_score: 3}`.

## Allowed Values

| Field           | Values                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| category        | top, bottom, dress, outerwear, footwear, accessory                     |
| color           | free text (lowercase), fallback "unknown"                              |
| pattern         | solid, striped, plaid, floral, geometric, abstract, paisley, polka-dot |
| occasion        | casual, business, formal, party, athletic                              |
| formality_score | integer 1-5                                                            |

## Concurrency

Max 4 concurrent Claude Vision calls to stay under rate limits (Tier 1: 40 req/min).

## Failure Handling

| Failure              | Response                                                                       |
| -------------------- | ------------------------------------------------------------------------------ |
| API timeout (10s)    | Retry once. On second failure, tag as "uncategorized" with tag_status='failed' |
| Rate limit (429)     | Wait 60s, retry once                                                           |
| Malformed JSON       | Retry with stricter prompt (2x), then fallback tags                            |
| Unrecognizable image | Fallback tags with tag_status='done' (not failed — the AI did its best)        |

## UI States

- `pending`: Image uploaded, waiting for tagging
- `processing`: Claude Vision call in flight
- `done`: Tags available, displayed in closet grid
- `failed`: Tagging failed, show "Tap to retag" button

## Quality Expectations

- ~80% accuracy on color identification
- ~60-65% accuracy on fine-grained categories (CLIP benchmarks)
- Higher accuracy on broad categories (top vs bottom vs dress)
- Lower accuracy on occasion (subjective, cultural context)
- Tag editing UI allows user correction of any mis-tag
