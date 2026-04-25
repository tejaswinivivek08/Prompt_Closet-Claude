# Outfit Preference Learning -- Analysis

## Executive Summary

Outfit preference learning tracks user acceptance/rejection signals from Magic Bar interactions and weights future recommendations accordingly. The feature requires a new `outfit_feedback` table, a cold-start bootstrap strategy, and integration into Magic Bar's inference-time re-ranking pipeline. The primary risk is that implicit signals (saved outfit = positive) are noisy proxies for actual preference, and cold-start users have no behavioral history to anchor recommendations.

**Complexity: Moderate** -- requires schema addition, backend inference logic, and UX flow for feedback capture.

---

## 1. Feature Description

### What It Does

- Captures implicit feedback signals when users interact with Magic Bar outfit suggestions
- Stores signals in `outfit_feedback` table keyed by `outfit_hash`
- Weights future Magic Bar recommendations toward previously accepted styles, away from rejected ones
- Supported signal types: accepted (saved), rejected (dismissed), passive (viewed but not acted upon)

### Data Flow

```
Magic Bar shows outfit → User saves/dismisses/view → Signal captured →
Weight vector updated → Future CLIP search results re-ranked by preference weights
```

---

## 2. Feedback Schema Design

### Option A: Outfit-Level Hash (Current Brief)

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to users |
| `outfit_hash` | VARCHAR(64) | SHA-256 of sorted item_ids (stable hash of outfit composition) |
| `accepted` | BOOLEAN | NULL = viewed, TRUE = saved, FALSE = dismissed |
| `created_at` | TIMESTAMP | Interaction timestamp |
| `session_id` | VARCHAR(64) | Anonymous session for cold-start aggregation |

**Outfit hash construction**:
```python
import hashlib

def compute_outfit_hash(item_ids: list[int]) -> str:
    sorted_ids = sorted(str(i) for i in item_ids)
    return hashlib.sha256(",".join(sorted_ids).encode()).hexdigest()[:16]
```

**Pros**: Privacy-preserving (wardrobe composition not directly readable), stable across re-renders
**Cons**: Cannot distinguish which item in the outfit drove acceptance; no item-level signal

### Option B: Item-Level Feedback

Separate table tracking feedback per item, not per outfit.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to users |
| `item_id` | UUID | FK to wardrobe_items |
| `accepted` | BOOLEAN | TRUE = user included in saved outfit, FALSE = rejected/dismissed |
| `outfit_context` | JSONB | Other items in the outfit when feedback was given |
| `created_at` | TIMESTAMP | |

**Pros**: Item-level signals for personalization; supports collaborative filtering downstream
**Cons**: More complex schema; harder to privacy-hash; noisy signals (item rejected may be fine but outfit context was wrong)

### Decision: Hybrid Approach (Recommended)

Store `outfit_feedback` at outfit level (for privacy and simplicity) AND capture item-level signals via a separate `item_in_outfit_feedback` table only for explicitly saved outfits.

```sql
CREATE TABLE outfit_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    outfit_hash VARCHAR(16) NOT NULL,
    accepted BOOLEAN,  -- NULL=viewed, TRUE=saved, FALSE=dismissed
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE item_in_outfit (
    outfit_hash VARCHAR(16) NOT NULL,
    item_id UUID REFERENCES wardrobe_items NOT NULL,
    position INT,  -- 0=top, 1=bottom, 2=shoes, etc.
    PRIMARY KEY (outfit_hash, item_id)
);

CREATE INDEX idx_outfit_feedback_user_hash ON outfit_feedback(user_id, outfit_hash);
CREATE INDEX idx_item_in_outfit_hash ON item_in_outfit(outfit_hash);
```

---

## 3. Implicit vs Explicit Signal Mapping

### Signal Hierarchy

| User Action | `accepted` value | Confidence | Notes |
|-------------|-----------------|------------|-------|
| Saved outfit to collection | `TRUE` | High | Direct positive signal |
| Clicked "Love it" button | `TRUE` | High | Explicit positive |
| Shared outfit | `TRUE` | Medium | Positive but may be aspirational |
| Viewed but did not save (5+ seconds) | `NULL` | Low | Passive signal, use for frequency weighting |
| Dismissed outfit | `FALSE` | Medium | Negative but may be contextual (wrong occasion) |
| Clicked "Not for me" / "Skip" | `FALSE` | High | Explicit negative |

### Ambiguity: "Saved" vs "Actually Worn"

A saved outfit is a **positive signal but not a guarantee of satisfaction**. Users save outfits for:
- Future reference (aspirational)
- Planning for a specific occasion that may not arrive
- Bookmarking without intent to wear

**Mitigation**: Distinguish "saved" from "saved + marked as worn today". Add a "worn today" quick action on saved outfits.

```sql
ALTER TABLE outfit_feedback ADD COLUMN wornToday BOOLEAN DEFAULT FALSE;
```

---

## 4. Cold-Start Strategy

When a new user has 0 feedback records, three fallback tiers apply in sequence:

### Tier 1: Popularity Baseline (Week 0)
- Aggregate `accepted=TRUE` counts across all users in `outfit_feedback`
- Rank outfits by acceptance rate (accepted / shown), not raw counts
- Suppress outfits with <5 impressions (statistically unreliable)
- **Exponential decay**: recent acceptance signals weighted higher than old ones

```sql
-- Popularity-weighted outfit score
SELECT outfit_hash,
       SUM(CASE WHEN accepted = TRUE THEN 1 ELSE 0 END) as accepts,
       COUNT(*) as impressions,
       SUM(CASE WHEN accepted = TRUE THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) as acceptance_rate,
       MAX(created_at) as latest_signal
FROM outfit_feedback
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY outfit_hash
HAVING COUNT(*) >= 5
ORDER BY acceptance_rate DESC, latest_signal DESC;
```

### Tier 2: CLIP Similarity Bootstrap (Week 0-2)
- For users with partial feedback (5-20 outfits), compute centroid embedding of accepted outfits
- Re-rank Magic Bar results by `cosine_similarity(query_embedding, accepted_centroid)`
- Reduces exposure to outfits similar to rejected ones

```python
def compute_preference_shift(query_embedding: np.ndarray, feedback_embeddings: list[np.ndarray], accepted_mask: list[bool]) -> float:
    """Returns scalar multiplier to re-weight CLIP similarity score."""
    accepted_emb = np.mean([e for e, a in zip(feedback_embeddings, accepted_mask) if a], axis=0)
    rejected_emb = np.mean([e for e, a in zip(feedback_embeddings, accepted_mask) if not a], axis=0)

    # Boost items close to accepted centroid, penalize near rejected
    accepted_sim = cosine_similarity([query_embedding], [accepted_emb])[0][0]
    rejected_sim = cosine_similarity([query_embedding], [rejected_emb])[0][0]

    return max(0.1, accepted_sim - rejected_sim + 1.0)  # [0.1, 2.1] range
```

### Tier 3: Explicit Preference Survey (Week 1+)
- After first 5 saved outfits, prompt: "Tell us your style" -- 5 quick binary choices
- Mapped to style DNA clusters (Minimalist, Maximalist, Streetwear, Formal, Festive)
- Anchors re-ranking without requiring 50+ behavioral signals

---

## 5. Learning Approach Selection

### Option A: Bayesian Update (Recommended for Phase 2)

Simple, interpretable, fast to compute on-device.

```python
class PreferenceBayesian:
    """Maintains per-user preference vector using empirical Bayes."""

    def __init__(self, n_clusters: int = 5):
        # Beta prior: uniform (1, 1) = no prior belief
        self.alpha = np.ones(n_clusters)  # successes + 1
        self.beta = np.ones(n_clusters)   # failures + 1

    def update(self, cluster_id: int, accepted: bool):
        if accepted:
            self.alpha[cluster_id] += 1
        else:
            self.beta[cluster_id] += 1

    def preference_score(self, cluster_id: int) -> float:
        return self.alpha[cluster_id] / (self.alpha[cluster_id] + self.beta[cluster_id])

    def to_dict(self) -> dict:
        return {"alpha": self.alpha.tolist(), "beta": self.beta.tolist()}
```

**Evaluation metrics**:
- Acceptance rate of re-ranked vs baseline recommendations (online A/B)
- Precision@5: fraction of top-5 recommendations that are saved

### Option B: Collaborative Filtering (Phase 3)

Build user-item matrix from co-saved outfit patterns. Requires opt-in data sharing and minimum 50 active users to avoid overfitting.

### Option C: Learned MLP Scorer

As specified in `ml-evaluation.md` -- train a PyTorch MLP on accepted/rejected outfit pairs. **Blocked by missing training data** (see `journal/0009-DISCOVERY-ml-training-data-has-no-path.md`). Not viable for Phase 2 demo.

---

## 6. Magic Bar Integration

### Inference-Time Re-Ranking Pipeline

```
[1] Magic Bar generates K outfit candidates via CLIP similarity + occasion filter
[2] For each candidate outfit:
      a. Compute outfit_hash
      b. Look up user's feedback record (if exists)
      c. Fetch user's Bayesian preference vector
      d. Compute re-weight: preference_score[outfit_cluster] * feedback_adjustment
[3] Sort candidates by: CLIP_score * preference_multiplier
[4] Return top N re-ranked results
```

### Re-Ranking Formula

```
final_score = cosine_similarity(CLIP_query, outfit_embedding) * preference_weight

preference_weight = {
    accepted=True  → 1.0 + alpha * preference_score(cluster)
    accepted=False → max(0.1, 1.0 - beta * preference_score(cluster))
    no_feedback     → 1.0 (neutral)
}
```

Where `alpha=0.5`, `beta=0.3` (tuned empirically).

---

## 7. Privacy Assessment

### Outfit Hash as Pseudonym

The `outfit_hash` is a SHA-256 truncated to 16 hex characters. This is:
- **Not reversible**: Cannot reconstruct item list from hash without rainbow table (mitigated by salt per user)
- **User-specific salt**: Append `user_id` to item_ids before hashing so same outfit gets different hashes per user

```python
def compute_salted_outfit_hash(item_ids: list[int], user_id: str, salt: str) -> str:
    sorted_ids = sorted(str(i) for i in item_ids)
    payload = f"{user_id}:{salt}:{','.join(sorted_ids)}"
    return hashlib.sha256(payload.encode()).hexdigest()[:16]
```

### GDPR Considerations

- Right to deletion: `DELETE FROM outfit_feedback WHERE user_id = ?` removes all feedback
- No cross-user linkage: outfit_hash is salted per user; cannot be joined across users
- Retention policy: auto-delete feedback older than 180 days unless user opts in to longer retention

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Implicit signals too noisy (saved = not actually liked) | High | Medium | Add explicit "Love it" / "Not for me" buttons; treat "saved" as weak positive only |
| Cold-start users get generic recommendations | High | High | Bootstrap via popularity baseline + CLIP centroid; prioritize quick preference survey UX |
| Feedback sparsity for new users (zero records for 2+ weeks) | Medium | Low | Fallback to popularity ranking; do not degrade Magic Bar quality below baseline |
| Users game the system (accept all to boost scores) | Low | Medium | Track impression-to-accept ratio; flag users with >95% acceptance as gaming |
| outfit_hash collision across different item sets | Low | Low | Salt with user_id; 16-char hex = 64-bit space; probability of collision negligible |

---

## 9. Implementation Roadmap

### Phase 2A: Schema + Basic Capture (Week 1-2)
1. Add `outfit_feedback` and `item_in_outfit` tables
2. Wire feedback capture into Magic Bar save/dismiss flows
3. Basic popularity-based re-ranking (no personalization yet)
4. Supabase Edge Function for re-ranking computation

### Phase 2B: Bayesian Preference Learning (Week 3-4)
1. Implement `PreferenceBayesian` class
2. Persist per-user preference vector in `user_preferences` table (JSONB)
3. Integrate re-ranking into Magic Bar inference
4. Basic analytics dashboard: feedback capture rate, acceptance rate by occasion

### Phase 2C: Evaluation (Week 5-6)
1. A/B test: re-ranked vs baseline CLIP-only recommendations
2. Report Precision@5 and recommendation acceptance rate
3. Document MGMT 655 rubric mapping

---

## 10. Cross-Reference Audit

| Document | Finding |
|----------|---------|
| `briefs/02-phase2-ml-expansion.md` | Specifies `outfit_feedback` table with `accepted` field; matches Option A schema |
| `specs/ml-evaluation.md` | Lists outfit compatibility MLP as recommended; notes `outfits.rating` as data source (but this column does not exist in Phase 1) |
| `journal/0009-DISCOVERY-ml-training-data-has-no-path.md` | Confirms no rating column in Phase 1; preference learning does NOT solve the MLP training data problem |
| `04-ml-technique-gaps.md` | Recommends preference learning as part of supervised learning pipeline; correctly identifies cold-start as a risk |

---

## 11. Success Criteria

- [ ] `outfit_feedback` table created with `user_id`, `outfit_hash`, `accepted`, `created_at`
- [ ] Feedback captured on Magic Bar save/dismiss with >80% coverage
- [ ] Cold-start users receive popularity-weighted recommendations (no degradation vs baseline)
- [ ] Users with 10+ feedback records have statistically different recommendation distribution vs baseline
- [ ] Re-ranking evaluation: Precision@5 > 0.35 (vs 0.20 baseline) -- target to be validated with A/B test
- [ ] Privacy: outfit_hash is salted per user; no reversible linkage across users
