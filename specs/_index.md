# Specs Index — Prompt Closet

| File                  | Domain | Description                                                                        |
| --------------------- | ------ | ---------------------------------------------------------------------------------- |
| data-model.md         | Data   | All entities, relationships, constraints, SQL schema, storage layout               |
| auto-tagging.md       | ML     | Claude Vision tagging pipeline: prompt, output schema, failure handling            |
| embeddings.md         | ML     | CLIP embedding generation, pgvector storage, similarity search, hybrid retrieval   |
| outfit-composition.md | ML     | Magic Bar outfit composition: slot-based approach, Claude decomposition, retrieval |
| style-learning.md     | ML     | Clustering approach (HAC), style DNA visualization, minimum data requirements      |
| auth.md               | Auth   | Supabase email auth, session management, RLS policies                              |
| image-pipeline.md     | Infra  | Camera capture, compression, upload, storage, thumbnail generation                 |
| magic-bar.md          | UI     | Magic Bar interaction: input, processing states, output, follow-ups, error states  |
| closet-ui.md          | UI     | Closet grid layout, filtering, item cards, empty state, onboarding                 |
| demo.md               | Demo   | Demo-day checklist, pre-seed data, latency budget, fallbacks                       |

## Brief Traceability Matrix

| Brief Requirement                   | Spec File(s)                        | Status   |
| ----------------------------------- | ----------------------------------- | -------- |
| Digitize wardrobe via photo         | image-pipeline.md, closet-ui.md     | Covered  |
| AI auto-tag (cat/color/pattern/occ) | auto-tagging.md, data-model.md      | Covered  |
| Magic Bar NL outfit suggestions     | magic-bar.md, outfit-composition.md | Covered  |
| 2D avatar virtual try-on (Phase 2)  | —                                   | Deferred |
| Learn style via clustering          | style-learning.md                   | Covered  |
| Semantic search (CLIP embeddings)   | embeddings.md                       | Covered  |
| Demo with pre-seeded data           | demo.md                             | Covered  |
