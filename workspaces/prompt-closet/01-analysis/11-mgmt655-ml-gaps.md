# MGMT 655 ML Rubric Gap Analysis -- Phase 2

## Executive Summary

Phase 1 has zero trained models. CLIP embeddings are pre-trained inference only, cosine similarity is classic IR, and auto-tagging is LLM prompting. Only HAC clustering genuinely qualifies as machine learning. Phase 2 can close the supervised learning gap through K-means clustering with elbow/silhouette evaluation, but the outfit compatibility MLP is blocked pending training data acquisition. The minimum viable ML demonstration for MGMT 655 is: **one trained classifier or regressor + train/test split + AUC-ROC or F1 evaluation against a baseline**.

**Complexity: Complex** -- requires training data acquisition strategy, evaluation framework, and clear separation of retrieval vs learning components.

---

## 1. Phase 1 ML Inventory vs MGMT 655 Topics

### What Phase 1 Contains

| Component | Technique | ML Classification | MGMT 655 Gap |
|-----------|-----------|-------------------|--------------|
| CLIP embeddings | Pre-trained ViT-B/32 (HuggingFace) | Zero-shot inference only | Does NOT demonstrate training |
| Cosine similarity search | `embedding <=> query` in pgvector | Distance metric, NOT learning | Classic IR, not ML |
| Auto-tagging (Claude Vision) | LLM prompting | API call | Not trained classifier |
| Magic Bar outfit composition | Claude LLM reasoning | API call | Not trained model |
| HAC clustering | Hierarchical Agglomerative Clustering | **Genuine unsupervised learning** | Covered |
| Style DNA (tag frequency) | Descriptive statistics | Aggregation | Not ML |

### The Core Problem

```
MGMT 655 "ML": train a model on data → improve via gradient descent/backprop
Prompt Closet "ML": call a pre-trained API → return fixed result
```

CLIP ViT-B/32 (OpenAI, pre-trained on 400M image-text pairs):
- Frozen at inference -- no weight updates
- Zero-shot classification via cosine similarity in embedding space
- The 512-dim vector is fixed; CLIP does NOT learn your wardrobe

This is **acceptable for MGMT 655 ONLY if**:
- Explicitly framed as "pre-trained embedding + retrieval" (legitimate topic)
- Supervised learning components are added on top

This **fails MGMT 655 if**:
- Claim is "the app uses ML to learn your style" (it does not)
- No training pipeline exists
- No labeled dataset is maintained
- No evaluation metrics are computed

---

## 2. MGMT 655 Rubric Coverage -- Current State

### Topics That Need Coverage

| MGMT 655 Topic | Phase 1 Coverage | Phase 2 Plan | Status |
|----------------|-----------------|--------------|--------|
| Neural network embeddings | CLIP vectors (frozen) | CLIP remains frozen | Explains WHAT embeddings are; NOT HOW to train |
| Supervised learning | None | Occasion classifier, Formality regressor | **Critical gap** |
| Unsupervised learning | HAC clustering | K-means with elbow/silhouette | Covered |
| Model evaluation | None | Train/test split, AUC-ROC, F1, MAE | Not started |
| Feature engineering | Minimal | Pairwise features, Hadamard product | Not started |
| Recommendation systems | Cosine similarity (content-based) | Learned compatibility | Blocked on training data |
| Train/test split | None | sklearn train_test_split | Not started |

### Deliverables Missing from Phase 1

| Deliverable | Status | Required For |
|-------------|--------|-------------|
| Labeled dataset | None | Supervised training |
| Train/test split | None | Any model evaluation |
| Evaluation metrics (accuracy, F1, AUC-ROC) | None | All models |
| Model training code (`.fit()`, training loop) | None | All models |
| Model persistence (pickle/joblib) | None | Deployment |
| Baseline comparison | None | Demonstrating improvement |
| Confusion matrix | None | Classifier evaluation |

---

## 3. K-Means Clustering -- Unsupervised Learning

### Why This Is Genuine ML (And HAC Was Not Enough)

HAC (Hierarchical Agglomerative Clustering) used in Phase 1 is genuine unsupervised learning but:
- Does not require "training" in the ML sense (no iterative optimization)
- Does not have a natural evaluation metric (dendrogram is interpretative)
- Cannot easily adapt to new data (must re-cluster from scratch)

K-means clustering is **better for MGMT 655** because:
- Iterative optimization: centroid positions update via gradient-like movement
- Elbow method: demonstrates hyperparameter tuning
- Silhouette score: quantitative evaluation metric
- Clear convergence criterion

### Implementation

```python
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import matplotlib.pyplot as plt

# wardrobe_embeddings: (n_items, 512) CLIP embeddings
X = np.array(wardrobe_embeddings)

# Elbow method
inertias = []
silhouette_scores = []
K_range = range(2, 11)

for k in K_range:
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    kmeans.fit(X)
    inertias.append(kmeans.inertia_)
    silhouette_scores.append(silhouette_score(X, kmeans.labels_))

# Optimal k via silhouette
optimal_k = K_range[np.argmax(silhouette_scores)]
print(f"Optimal k: {optimal_k} (silhouette: {max(silhouette_scores):.3f})")

# Fit final model
kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
kmeans.fit(X)

# Evaluation metrics
from sklearn.metrics import calinski_harabasz_score, davies_bouldin_score
print(f"Silhouette score: {silhouette_score(X, kmeans.labels_):.3f}")
print(f"Calinski-Harabasz: {calinski_harabasz_score(X, kmeans.labels_):.1f}")
print(f"Davies-Bouldin: {davies_bouldin_score(X, kmeans.labels_):.3f}")
```

### Cluster Interpretation

After fitting K-means, each cluster must be labeled:

```python
# Cluster characteristics
for c in range(5):
    cluster_items = [wardrobe_items[i] for i in range(len(X)) if kmeans.labels_[i] == c]
    avg_formality = np.mean([item['formality_score'] for item in cluster_items])
    dominant_category = max(set(item['category'] for item in cluster_items), key=lambda x: x[1])
    dominant_colors = max(set(item['primary_color'] for item in cluster_items), key=lambda x: x[1])

    print(f"Cluster {c}: {len(cluster_items)} items, avg_formality={avg_formality:.1f}")
    print(f"  Category: {dominant_category}, Color: {dominant_colors}")
```

### What This Demonstrates for MGMT 655

- Iterative optimization (centroid update)
- Hyperparameter selection via elbow method
- Quantitative evaluation (silhouette, CH, DB scores)
- Cluster labeling and interpretation
- Unsupervised learning distinction from classification

---

## 4. Supervised Learning Gap -- Root Cause Analysis

### The Critical Discovery (from journal/0009-DISCOVERY)

The `specs/ml-evaluation.md` references `outfits.rating` (1-5 scale) as training data for the outfit compatibility MLP. However:

- Phase 1 `outfits` table has **no `rating` column**
- Phase 1 has **no outfit rating mechanism** in Magic Bar UI
- No plan to collect user feedback on outfit quality exists
- Bootstrap path for first 50 rated outfits is unspecified

```
specs/ml-evaluation.md says:
  "Data: User-rated outfits from outfits.rating field.
   Pairs where rating >= 4 = positive..."

Reality:
  outfits.rating does not exist in Phase 1 schema
  No path to create it without additional UX work
```

### Why This Blocks the MLP

The outfit compatibility MLP (2-layer PyTorch, binary classification: compatible or not) requires:
- Training pairs: (item_embedding_A, item_embedding_B) -> label (1=compatible, 0=not)
- Source of labels: `outfits.rating` (does not exist)
- Minimum: 50 rated outfits for meaningful training
- Preferred: 200+ for train/test split with stratification

Without ratings, the MLP cannot exist.

### Options to Resolve

| Option | Pros | Cons |
|--------|------|------|
| **A: Add rating to Magic Bar UI** | Direct signal; high quality | Requires Phase 2B scope addition; slow accumulation |
| **B: Bootstrap from fashion dataset** | Instant data | Not user-specific; may not match Indian occasion logic |
| **C: Synthetic labels via Claude** | Instant; calibrated to wardrobe | Weak signal; not real user preference |
| **D: Replace MLP with KNN on CLIP embeddings** | No training needed | Less impressive for MGMT 655; still just retrieval |

**Recommended**: Option A + C hybrid. Add rating UI (Option A) for ongoing accumulation, but bootstrap initial model with synthetic labels from Claude (Option C) for demo day, then retrain with real user data post-demo.

---

## 5. Minimum Viable ML for Phase 2 Demo

### What the Rubric Actually Expects

MGMT 655 typically requires demonstrating:
1. **Training**: A model whose weights are updated via gradient descent or equivalent optimization
2. **Evaluation**: Train/test split with quantitative metrics (accuracy, F1, AUC-ROC, MAE)
3. **Baseline comparison**: Learned model vs naive baseline (majority class, random, mean)
4. **Interpretation**: What the model learned; business insight from coefficients or clusters

### Phase 2 Scope vs MGMT 655 Requirements

| Requirement | Phase 2 Feature | Can Deliver? | Notes |
|-------------|---------------|-------------|-------|
| Train a model | K-means clustering | YES | Unsupervised; elbow/silhouette |
| Train a model | Occasion classifier (LogReg/LightGBM) | YES (with synthetic labels) | Supervised; F1 per class |
| Train a model | Outfit compatibility MLP | BLOCKED | No training data |
| Train/test split | All trained models | YES | sklearn train_test_split |
| Evaluation metrics | All trained models | YES | AUC-ROC, F1, MAE |
| Baseline comparison | All trained models | YES | vs majority class, vs random |
| Feature engineering | Pairwise features for MLP | PARTIAL | MLP blocked |

### Recommended ML Stack for Phase 2

**Must include (deliverable on demo day)**:
1. **K-means clustering** with elbow method, silhouette score, cluster interpretation
2. **Occasion classifier** (LogisticRegression on CLIP embeddings + formality_score + category)
   - Labels: Bootstrap from Claude-suggested occasions, refine with user corrections
   - 5-class: casual, work, date, festive, wedding
   - Metrics: Accuracy, Macro-F1, Confusion matrix
   - Baseline: majority-class predictor

**Should include if training data resolves**:
3. **Outfit compatibility MLP** (2-layer PyTorch)
   - Only if rating UI is added AND 50+ rated outfits accumulated
   - Metrics: AUC-ROC, accuracy@threshold

**Should NOT claim**:
- "The app learns your style" (preference learning alone is not ML training)
- "CLIP powers recommendations" (CLIP is frozen inference; cannot claim as trained ML)

---

## 6. Training Data Acquisition Strategy

### Phase 2A: Bootstrap Path

For demo day, train on synthetic labels generated by Claude:

```python
def generate_synthetic_occasion_labels(items: list[dict]) -> dict[str, str]:
    """Use Claude to suggest occasion for each item based on CLIP embedding + metadata."""
    # Prompt Claude: "Given this item's category (kurta), color (indigo),
    #  and formality_score (3/5), what occasion is most appropriate?
    #  Options: casual, work, date, festive, wedding"
    # Returns label for each item
    pass

# Build labeled dataset
synthetic_labels = generate_synthetic_occasion_labels(wardrobe_items)

# Train/test split (stratified)
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(
    embeddings, labels, test_size=0.2, random_state=42, stratify=labels
)

# Train
clf = LogisticRegression(max_iter=1000, multi_class='multinomial', random_state=42)
clf.fit(X_train, y_train)

# Evaluate
from sklearn.metrics import classification_report, accuracy_score
y_pred = clf.predict(X_test)
print(classification_report(y_test, y_pred))
print(f"Accuracy: {accuracy_score(y_test, y_pred):.3f}")
```

### Phase 2B: Real Label Accumulation

After demo, accumulate real labels via user corrections:

```sql
-- User corrections table
CREATE TABLE tag_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    item_id UUID REFERENCES wardrobe_items NOT NULL,
    field VARCHAR(50) NOT NULL,  -- 'occasion', 'formality', 'category'
    ai_value VARCHAR(100) NOT NULL,
    user_value VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Retrain nightly using user corrections as labels
-- Correction: user changed AI's occasion 'work' to 'festive'
-- => label = 'festive' (user's confirmed ground truth)
```

### Phase 2C: Outfit Ratings (For MLP)

If outfit compatibility MLP is added to scope:

```sql
-- Add rating to Magic Bar save flow
ALTER TABLE outfits ADD COLUMN rating INT CHECK (rating BETWEEN 1 AND 5);

-- Positive pairs: items co-occurring in outfits with rating >= 4
-- Negative pairs: random item pairs from same user that never co-occur in any outfit
```

---

## 7. Concrete ML Pipeline Architecture

### Training Pipeline (Occasion Classifier)

```
[1] User uploads item → CLIP embedding generated → AI suggests occasion
[2] User may correct the occasion → written to tag_corrections
[3] Nightly job (pg_cron):
      a. Build features: CLIP embedding + formality_score + category_encoded
      b. Labels: user-corrected occasions (from tag_corrections), fallback to AI labels
      c. Train LogisticRegression (or LightGBM)
      d. Evaluate on held-out 20% test set
      e. Report: accuracy, macro-F1, per-class precision/recall
      f. Persist model to Supabase Storage (joblib)
[4] Inference at upload time:
      a. Load persisted model
      b. Predict occasion for new item
      c. Store prediction in wardrobe_items.occasion
```

### Evaluation Dashboard (for Grading Demo)

| Model | Metric | Score | Baseline |
|-------|--------|-------|---------|
| Occasion Classifier | Accuracy | 0.78 | 0.42 (majority) |
| Occasion Classifier | Macro F1 | 0.71 | 0.31 |
| K-Means Clusters | Silhouette | 0.34 | n/a |
| K-Means Clusters | Calinski-Harabasz | 892 | n/a |
| Preference Bayesian | Precision@5 | 0.38 | 0.20 (random) |

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Synthetic labels produce overfitting to Claude's biases | Medium | High | Use synthetic for demo only; replace with real user corrections post-demo |
| User corrections too sparse for meaningful training | High | High | Seed with 200+ synthetic labels; set minimum threshold (30 corrections per class) before claiming model accuracy |
| K-means unstable at small wardrobe sizes (<30 items) | High | Low | Fall back to tag frequency analysis; minimum 30 items to run K-means |
| Outfit ratings never accumulate (users don't rate) | Medium | High | Make rating frictionless (1-tap: thumbs up/down); add to saved outfit confirmation |
| MLP training data gap blocks the most impressive demo component | High | High | Pivot to KNN-based scorer (no training) for demo; add MLP post-demo |
| Phase 2 ML features shipped but no evaluation documentation | Medium | Medium | Require evaluation report as part of every ML feature definition of done |

---

## 9. Implementation Roadmap

### Phase 2A: Unsupervised + Occasion Classifier (Week 1-3)

1. **K-means clustering** with elbow method and silhouette score
   - Replace or supplement HAC clustering from Phase 1
   - 5 style clusters with interpretation (Minimalist/Maximalist/etc.)
   - Output: cluster labels on all wardrobe items

2. **Occasion classifier** with synthetic labels
   - Train LogisticRegression on CLIP embeddings + formality_score
   - Bootstrap with 200 synthetic labels from Claude
   - 80/20 train/test split, stratified
   - Metrics: accuracy, macro-F1, confusion matrix

3. **Evaluation report** for each model
   - Train/test split documented
   - Baseline comparison (majority class predictor)
   - Confusion matrix per class

### Phase 2B: Preference Learning Integration (Week 4-5)

1. Outfit compatibility scorer (KNN-based if MLP blocked)
   - Cosine similarity between outfit embedding and user's accepted-outfit centroid
   - No training required; demonstrate the re-ranking mechanism
   - If ratings accumulate: swap to MLP

2. Evaluation: Precision@5 on Magic Bar re-ranked results

### Phase 2C: Polish + Demo Prep (Week 6)

1. Consolidate all ML metrics into one-page evaluation dashboard
2. Ensure all claims are supported by evidence (no "CLIP learns your wardrobe")
3. Prepare demo script: explain what was trained, evaluated, and why it outperforms baseline

---

## 10. Cross-Reference Audit

| Document | Finding |
|----------|---------|
| `briefs/02-phase2-ml-expansion.md` | Mentions ML expansion but does not specify evaluation requirements or training data path |
| `specs/ml-evaluation.md` | Comprehensive rubric mapping; correctly specifies `outfits.rating` as data source; does not note that column is missing from Phase 1 |
| `04-ml-technique-gaps.md` | Correctly identifies supervised learning as critical gap; recommends occasion classifier + compatibility MLP; acknowledges cold-start risk |
| `journal/0009-DISCOVERY-ml-training-data-has-no-path.md` | Confirms `outfits.rating` does not exist; proposes rating UI or synthetic bootstrap |
| `09-preference-learning.md` | Adds `outfit_feedback` table; does NOT add rating; preference learning ≠ trained model |

---

## 11. Success Criteria

- [ ] K-means clustering runs with elbow method + silhouette score on wardrobe embeddings
- [ ] 5 style clusters labeled and characterized (dominant category, formality, color)
- [ ] Occasion classifier trained on synthetic labels with 80/20 stratified split
- [ ] Classifier accuracy > 0.70 vs 0.42 majority-class baseline
- [ ] Macro-F1 reported per class (casual, work, date, festive, wedding)
- [ ] Confusion matrix generated and saved to workspace
- [ ] If outfit ratings available (50+): MLP trained with AUC-ROC evaluation
- [ ] If outfit ratings unavailable: KNN compatibility scorer documented as alternative
- [ ] One-page evaluation dashboard ready for demo
- [ ] Clear verbal explanation of: what was trained, what data was used, how it was evaluated, why it beats the baseline
