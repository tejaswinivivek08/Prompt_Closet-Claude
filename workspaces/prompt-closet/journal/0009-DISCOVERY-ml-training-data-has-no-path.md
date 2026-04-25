---
type: DISCOVERY
status: active
date: 2026-04-18
created_at: 2026-04-18T00:00:00Z
author: agent
session_id: current
project: prompt-closet
topic: ml-training-data-has-no-path
phase: analyze
tags: [ml, phase2, gap]
---

# ML training data has no acquisition path in Phase 2

**Discovery**: The Phase 2 plan specifies training an outfit compatibility MLP using `outfits.rating` as training labels, but:
- Phase 1 has no outfit rating mechanism
- `outfits` table has no `rating` column
- No plan to collect user feedback on outfit quality
- Bootstrap path for first 50 rated outfits is unspecified

**Why this matters**: The MGMT 655 rubric requires demonstrating actual model training with evaluation. Without training data, the MLP deliverable cannot exist. The spec is aspirational but hollow.

**Consequence**: Phase 2 ML additions need a bootstrap strategy:
1. Add rating collection to Magic Bar (thumbs up/down on saved outfits)
2. Or bootstrap from a fashion compatibility dataset (Kaggle, etc.)
3. Or simplify to a rule-based scorer for demo day

**For Discussion**:
- Should rating collection be added to Phase 2 scope as a prerequisite?
- Is there an existing outfit compatibility dataset we could use to bootstrap?
- Does MGMT 655 accept a rule-based system if it's well-justified?

**Related**: See `specs/ml-evaluation.md` § Dataset Requirements
