# GAP: pgvector Extension Must Be Enabled Manually on Supabase

**Phase**: 01-analysis
**Date**: 2026-04-17

## Gap

Supabase's free tier does **not** enable the `pgvector` extension by default. The extension must be enabled per-project via the Supabase dashboard or SQL (`CREATE EXTENSION vector;`). This is a 2-minute step that is easy to forget and will cause the entire semantic search feature to fail at demo time with a cryptic SQL error.

## Risk Level

**Significant** — pgvector is not optional for Phase 1's semantic search feature. Without it, the app cannot store or query embeddings.

## Mitigation

Document in `specs/demo.md` Demo-Day Checklist: "Verify pgvector extension is enabled (`CREATE EXTENSION IF NOT EXISTS vector;`)".

## Filed As

- `specs/demo.md` § checklist item
- `01-analysis/01-failure-analysis.md` § Risk Register R3
