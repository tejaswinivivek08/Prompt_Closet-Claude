# DISCOVERY: Slot-Based Outfit Composition Is the Right Architecture

**Phase**: 01-analysis
**Date**: 2026-04-17

## Finding

The Magic Bar's outfit composition should use a **two-pass slot-based architecture**, not pure embedding similarity or LLM-with-full-inventory.

## Detail

**Approach A — Pure embedding similarity**: CLIP cosine similarity across all items returns items individually similar to the prompt, but no compositional logic. A "rainy Diwali dinner" query returns individual items — no outfit.

**Approach B — LLM picks from full inventory**: Send all item descriptions to Claude and ask it to compose. Token cost scales with closet size; Claude lacks visual understanding; bypasses the embedding work entirely.

**Approach C — Two-pass slot-based** (selected):

1. Claude decomposes NL prompt into structured intent + slot definitions (top, bottom, shoes, accessory)
2. Tag-filtered embedding search fills each slot
3. Claude generates reasoning paragraph

This approach demonstrates **both** ML capabilities (embeddings for retrieval, LLM for reasoning), scales to larger closets via tag pre-filtering, and produces compositionally sound outfits.

## Why This Is Non-Obvious

Most "AI wardrobe" apps use Approach B (LLM with full context). The two-pass approach is more complex but is the only one that honestly demonstrates the ML stack's value.

## Filed As

- `specs/outfit-composition.md` (ADR-001)
- `01-analysis/03-requirements-gaps.md` §6
