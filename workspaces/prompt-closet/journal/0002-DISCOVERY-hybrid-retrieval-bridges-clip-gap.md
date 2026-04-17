# DISCOVERY: CLIP Embeddings Need Tag Prefiltering — They Can't Reason About Occasion

**Phase**: 01-analysis
**Date**: 2026-04-17

## Finding

CLIP ViT-B/32 achieves ~60-65% accuracy on fine-grained clothing categories (DeepFashion benchmarks). More importantly, CLIP has **no concept of social occasion or cultural context** — it cannot reason that "Diwali dinner" implies semi-formal, warm-toned, festive, or that rain requires waterproof footwear.

## The Gap

A query like "rainy Diwali dinner" sent directly to CLIP returns items visually similar to images captioned with related text — dining, Indian contexts, evening events. But:

- CLIP does not encode "rainy" → footwear waterproofness
- CLIP does not encode "Diwali" → cultural/festive formality
- CLIP does not encode "dinner" → evening formal/semi-formal

## The Bridge

Claude Vision tags each item with structured attributes (occasion, formality_score). The hybrid search pipeline:

1. Claude interprets NL prompt → structured filter (occasion, formality_min, color_preferences)
2. SQL WHERE clause pre-filters by tags
3. CLIP reranks within filtered set by cosine similarity

This is the honest ML story: **tag filtering provides structured reasoning; CLIP embeddings provide visual similarity ranking**.

## Filed As

- `specs/embeddings.md` §4 (Hybrid Search)
- `01-analysis/02-ml-evaluation.md` §4.2
