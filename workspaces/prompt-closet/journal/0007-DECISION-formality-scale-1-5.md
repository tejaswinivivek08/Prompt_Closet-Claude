# DECISION: Formality Scale Canonical = 1-5 (Not 1-10)

**Phase**: 02-todos
**Date**: 2026-04-17

## Decision

Canonical formality scale is **1-5** (integer, stored in `SMALLINT` with `CHECK (1-5)`). All UX specs (closet-ui.md, magic-bar.md) must be updated to use a 5-step visual scale, not a 1-10 slider.

## Rationale

Three documents already use 1-5:

- `specs/auto-tagging.md`: Claude Vision prompt outputs `formality_score: integer 1-5`
- `specs/data-model.md`: DB constraint `CHECK (formality_score BETWEEN 1 AND 5)`
- `specs/embeddings.md`: ML evaluation baselines use 1-5

Only the UX specs use 1-10 slider. Changing the ML pipeline and DB is more expensive than changing the UX.

## UX Adaptation

Replace 1-10 slider with a 5-step segmented control with labeled ticks:

```
[ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]
 Casual   Biz   Semi  Dress  Gala
```

This is more usable than a fine-grained slider with 10 steps on a phone screen.

## Filed As

- `todos/active/Phase-1-Task-Breakdown.md` § Decision D2
- `specs/closet-ui.md` (to be updated)
- `specs/magic-bar.md` (to be updated)
- ADR-REDTEAM-001 from `04-validate/01-red-team-audit.md`
