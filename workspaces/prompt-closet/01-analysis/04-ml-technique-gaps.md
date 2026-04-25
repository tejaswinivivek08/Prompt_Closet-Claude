# ML Technique Gaps Analysis: Prompt Closet Phase 2 vs MGMT 655 Rubric

## Executive Summary

Phase 1 uses zero-shot CLIP inference and cosine similarity for retrieval. This is **NOT machine learning** in the MGMT 655 course sense. It is classic information retrieval with pre-trained model inference. Phase 2 must add supervised learning components with actual model training, labeled datasets, and evaluation metrics to demonstrate ML competence. The HAC clustering in style-learning.md is genuine unsupervised learning and covers that topic. The gap is supervised learning.

**Complexity: Moderate** — Phase 2 needs 2-3 training pipelines with user feedback loops and evaluation frameworks.

---

## 1. Current ML Architecture Assessment

### What Exists

| Component | Technique | ML Classification | MGMT 655 Topic |
|-----------|-----------|-------------------|----------------|
| CLIP embeddings | Pre-trained ViT-B/32, HF Inference API | Zero-shot inference only | Neural networks / embeddings |
| Cosine similarity | `embedding <=> query` in pgvector | Distance metric, NOT learning | Information retrieval |
| Auto-tagging | Claude Vision API call | API call, NOT training | Rule-based classification (近似) |
| Magic Bar decomposition | Claude LLM reasoning | API call, NOT training | Heuristic decomposition |
| Style clustering (style-learning.md) | HAC with cosine distance + Ward linkage | **Genuine unsupervised learning** | Clustering |
| Style DNA visualization | Tag frequency analysis | Descriptive statistics | Data aggregation |

### The Core Problem: CLIP Is Inference, Not Learning

```
MGMT 655 "ML" means:  train a model on data → improve via gradient descent
Prompt Closet "ML":   call a pre-trained API → return fixed result
```

CLIP ViT-B/32 is:
- Pre-trained by OpenAI on 400M image-text pairs
- Fixed at inference time — no weight updates
- Zero-shot classification via cosine similarity in embedding space
- The 512-dim vector is frozen; CLIP does NOT learn your wardrobe

**This is acceptable for MGMT 655 ONLY if**:
- You explicitly frame it as "pre-trained embedding + retrieval" (legitimate topic)
- You add supervised fine-tuning or a learned layer on top

**This fails MGMT 655 if**:
- The claim is "the app uses ML to learn your style" (it doesn't)
- No training pipeline exists
- No labeled dataset is maintained
- No evaluation metrics are computed

### MGMT 655 Topics Phase 1 Actually Covers

| Topic | Coverage | Gap |
|-------|----------|-----|
| Neural network embeddings | CLIP ViT-B/32 vectors (512-dim) | Explains WHAT embeddings are; does NOT show HOW to train/learn them |
| Clustering (unsupervised) | HAC on wardrobe embeddings | **Covered** — genuine unsupervised learning with dendrogram |
| Distance metrics | Cosine similarity in pgvector | Covered |
| Information retrieval | Tag-filtered embedding search | Covered |
| Classification | Auto-tagging via Claude Vision | API call, NOT trained classifier |
| Regression | None | Not covered |
| Train/test evaluation | None | Not covered |
| Supervised learning | None | Critical gap |
| Recommendation systems | Cosine similarity reranking | Content-based only; no collaborative filtering |

---

## 2. Phase 2 ML Enhancement Opportunities

### Gap 1: Supervised Occasion Classifier (CRITICAL)

**What**: Train a classifier on user-corrected tags to improve occasion prediction.

**Why MGMT 655 cares**: This is supervised learning with a labeled dataset, train/test split, and measurable accuracy improvement.

**Implementation**:

```python
# Training data: user corrections on auto-tags
# Label: user_corrected_occasion (target)
# Features: CLIP embedding (512-dim) + category + formality_score

from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# Build labeled dataset from user corrections
# corrections table: (item_id, ai_occasion, user_occasion, embedding_id)
# Target: user_occasion
# Features: clip_embedding + category_encoded + formality_score

X_train, X_test, y_train, y_test = train_test_split(
    features, labels, test_size=0.2, random_state=42, stratify=labels
)

clf = LogisticRegression(max_iter=1000, multi_class='multinomial')
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
print(classification_report(y_test, y_pred))
print(f"Accuracy: {accuracy_score(y_test, y_pred):.3f}")
```

**What it demonstrates for grading**:
- Labeled dataset construction from user feedback
- Train/test split with stratification
- Multinomial classification (5 occasions)
- Accuracy, precision, recall per class
- Model persistence (pickle or equivalent)

**Minimum viable**: Logistic regression on CLIP embeddings + formality score.

**Preferred**: LightGBM on embeddings + tag features (handles mixed numeric/categorical).

---

### Gap 2: Outfit Compatibility Scorer (HIGH VALUE)

**What**: Train a binary classifier: given (item_embedding_A, item_embedding_B) → compatible (1) or not (0).

**Why MGMT 655 cares**: This is supervised learning with pairwise features, a learned similarity function, and evaluation.

**Data source**: User ratings on saved outfits. Rating >= 4 = compatible. Rating <= 2 = not compatible. Rating = 3 = discard.

**Implementation**:

```python
# Training pairs from outfits table + ratings
# Positive: items in outfits with rating >= 4
# Negative: random item pairs from same user that never appear together

# Feature engineering: concatenation of two embeddings + element-wise product
embedding_A = item_embeddings[item_id_A].clip_embedding  # 512-dim
embedding_B = item_embeddings[item_id_B].clip_embedding  # 512-dim

# Option 1: concat
features = np.concatenate([embedding_A, embedding_B])    # 1024-dim

# Option 2: hadamard product (element-wise multiply)
features = embedding_A * embedding_B                     # 512-dim

# Option 3: both
features = np.concatenate([embedding_A, embedding_B, embedding_A * embedding_B])  # 1536-dim

clf = LogisticRegression(max_iter=1000)
clf.fit(X_train, y_train)
```

**What it demonstrates**:
- Pairwise feature engineering from embeddings
- Learned similarity vs fixed cosine similarity
- Binary classification with imbalanced classes handling
- AUC-ROC evaluation (not just accuracy)

**Note**: This is the foundational work for a learned similarity metric. A neural network on top of the embeddings would be even better (see Gap 3).

---

### Gap 3: Learned Embedding Projector (NEURAL NETWORK)

**What**: Train a small MLP on CLIP embeddings to predict outfit compatibility or occasion.

**Why MGMT 655 cares**: This is a neural network with gradient descent, not just a pre-trained model call.

**Architecture**:

```python
# Simple 2-layer MLP on 512-dim CLIP embeddings
import torch
import torch.nn as nn

class CompatibilityMLP(nn.Module):
    def __init__(self, embedding_dim=512, hidden_dim=128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(embedding_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )

    def forward(self, emb_a, emb_b):
        x = torch.cat([emb_a, emb_b], dim=-1)
        return self.net(x)

model = CompatibilityMLP()
criterion = nn.BCELoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

# Training loop with backprop
for epoch in range(50):
    optimizer.zero_grad()
    preds = model(emb_a_batch, emb_b_batch)
    loss = criterion(preds, labels_batch)
    loss.backward()
    optimizer.step()
```

**What it demonstrates**:
- Neural network architecture (MLP)
- Backpropagation and gradient descent
- Loss functions (BCELoss)
- PyTorch or TensorFlow training loop
- Overfitting prevention (Dropout)

**This is the most MGMT 655-appropriate addition** because it shows you understand neural network training, not just inference.

---

### Gap 4: Formality Regression Model

**What**: Train a regression model to predict `formality_score` (1-5) from CLIP embedding + color + pattern + category.

**Why MGMT 655 cares**: Regression (not just classification) demonstrates the full spectrum.

**Implementation**:

```python
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# Target: formality_score (1-5)
# Features: CLIP embedding + category one-hot + color one-hot + pattern one-hot

regressor = GradientBoostingRegressor(
    n_estimators=100,
    max_depth=4,
    learning_rate=0.1,
    random_state=42
)
regressor.fit(X_train, y_train)

y_pred = regressor.predict(X_test)
print(f"MAE: {mean_absolute_error(y_test, y_pred):.3f}")
print(f"R2:  {r2_score(y_test, y_pred):.3f}")
```

**What it demonstrates**:
- Regression with continuous target
- MAE and R2 metrics (not just accuracy)
- Feature importance from tree-based model
- Comparison to baseline (mean formality)

---

## 3. MGMT 655 Rubric Coverage Analysis

### Typical MBA ML Course Topics

| Topic | MGMT 655 Emphasis | Prompt Closet Phase 1 | Prompt Closet Phase 2 (Recommended) |
|-------|-------------------|------------------------|-------------------------------------|
| Supervised vs Unsupervised | Must distinguish | Mixes IR with learning | Explicit separate pipelines |
| Classification | Logistic regression, decision trees, evaluation | Auto-tag via API (not trained) | Occasion classifier with user corrections |
| Regression | Linear, logistic, evaluation metrics | None | Formality regression |
| Clustering | k-means, HAC, dendrograms, elbow method | HAC (style-learning.md) | HAC remains; add elbow method |
| Neural Networks | MLP, embeddings, backprop | CLIP (pre-trained, no training) | Trainable MLP on CLIP embeddings |
| Model Evaluation | Train/test split, accuracy, precision, recall, ROC-AUC, MAE, R2 | None | All of the above per model |
| Feature Engineering | Embedding concatenation, one-hot, scaling | Minimal | Pairwise features, Hadamard product |
| Recommendation Systems | Content-based vs collaborative filtering | Cosine similarity (content-based only) | Outfit compatibility scorer (learned similarity) |
| Ethical AI | Bias in training data, model explainability | None | Tag bias analysis, fairness check |

### Specific MGMT 655 Deliverables Missing from Phase 1

| Deliverable | Phase 1 Status | Required for Phase 2 |
|-------------|----------------|---------------------|
| Labeled dataset | None | corrections table with user-approved labels |
| Train/test split | None | sklearn train_test_split with stratification |
| Evaluation metrics | None | accuracy, precision, recall, F1, AUC-ROC, MAE |
| Model training code | None | LogisticRegression.fit(), MLP training loop |
| Model persistence | None | pickle / joblib dump to storage |
| Baseline comparison | None | Majority class predictor vs learned model |
| Confusion matrix | None | sklearn confusion_matrix visualization |
| Learning curve | None | Model performance vs training set size |

---

## 4. Style Learning: HAC Clustering (Already Covered)

The style-learning.md spec correctly identifies HAC with cosine distance + Ward linkage. This IS genuine unsupervised learning. However, the spec is thin on implementation details.

**What to strengthen**:

```python
# Add elbow method / silhouette score to justify cluster count
from sklearn.metrics import silhouette_score

silhouette_scores = []
for k in range(2, 10):
    clusters = fcluster(Z, t=k, criterion='maxclust')
    score = silhouette_score(embeddings, clusters, metric='cosine')
    silhouette_scores.append(score)

optimal_k = silhouette_scores.index(max(silhouette_scores)) + 2
```

**What to add for MGMT 655**:
- Elbow method plot (inertia / within-cluster sum of squares vs k)
- Silhouette score per cluster count
- PCA projection of embeddings for 2D visualization (t-SNE as alternative)
- Interpretation of cluster characteristics (dominant colors, categories, formality)

---

## 5. Recommendation System Framing

### Current: Pure Content-Based Filtering

```
User query → CLIP text embedding → cosine similarity to item embeddings → ranked results
```

This is legitimate content-based recommendation. MGMT 655 would grade this as:
- **Strengths**: No cold-start problem (items have embeddings from upload), interpretable
- **Weaknesses**: No personalization beyond CLIP space, no collaborative signal

### Phase 2 Enhancement: Learned Compatibility

```
(item_A, item_B) → learned compatibility score (LogisticRegression or MLP)
```

This adds a trained model on top of embeddings. MGMT 655 framing:

```
"Unlike Phase 1's cosine similarity baseline (fixed distance metric),
 Phase 2 trains a supervised classifier on user ratings to learn which
 item combinations users actually wear together. The learned model
 outperforms the fixed metric by [X]% on accuracy."
```

### Collaborative Filtering Opportunity (Phase 3)

If multiple users share outfit data (opt-in), pairwise co-occurrence matrix factorization could learn latent "style factors." This is explicitly NOT Phase 2 (requires privacy/consent infrastructure).

---

## 6. Concrete Phase 2 ML Pipeline Architecture

### Training Pipeline

```
[1] User corrects auto-tag (occasion, formality)
    →写入 corrections table (item_id, field, ai_value, user_value, created_at)

[2] Nightly training job (or on-demand):
    a. Build features from item_embeddings + wardrobe_items
    b. Train occasion_classifier (LogisticRegression or LightGBM)
    c. Train formality_regressor (GradientBoostingRegressor)
    d. Train compatibility_classifier (LogisticRegression or MLP)
    e. Evaluate each on held-out test set
    f. Persist models to Supabase Storage or filesystem

[3] Inference:
    a. Load persisted models
    b. Apply to new items at upload time (not retraining, just inference)
```

### Evaluation Dashboard (for grading demo)

```
| Model                  | Metric         | Score  | vs Baseline |
|------------------------|----------------|--------|-------------|
| Occasion Classifier    | Accuracy       | 0.847  | 0.62        |
| Occasion Classifier    | Macro F1       | 0.812  | 0.58        |
| Formality Regressor   | MAE            | 0.43   | 0.71        |
| Formality Regressor   | R2             | 0.723  | 0.184       |
| Compatibility Scorer  | AUC-ROC        | 0.891  | 0.500       |
| Style Clusters        | Silhouette     | 0.312  | n/a         |
```

**Baseline for classification**: majority-class predictor (predicts most frequent class).
**Baseline for regression**: mean formality predictor.
**Baseline for compatibility**: random (0.5 AUC).

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| User corrections too sparse for meaningful training | Medium | High — model accuracy will be poor | Seed with synthetic labels from Claude; collect corrections over 2-4 weeks |
| Outfit compatibility labels highly imbalanced | Medium | Medium — mostly positive pairs | SMOTE or class_weight='balanced'; report AUC not just accuracy |
| Model retraining overwhelms Supabase compute | Low | Medium | Run training jobs off-peak; limit dataset size |
| HAC clustering unstable at small wardrobe sizes (<30 items) | High | Low — already documented | Fall back to tag frequency analysis; threshold at 30 items |
| CLIP embeddings insufficient for fine-grained occasion | High | Medium — model ceiling | Use CLIP embeddings as features alongside tag features (category, formality) |

---

## 8. Implementation Roadmap

### Phase 2A: Supervised Learning Foundation (Week 1-2)

1. **corrections table** — capture user tag corrections with timestamps
2. **Occasion classifier** — LogisticRegression on CLIP embeddings + tags, 5-class
3. **Formality regressor** — GradientBoostingRegressor on same features
4. **Evaluation framework** — train/test split, metrics computation, baseline comparison
5. **Model persistence** — save models to storage, load at inference time

### Phase 2B: Compatibility Learning (Week 3-4)

1. **Outfit pair extraction** — build training pairs from outfits table with ratings
2. **Compatibility scorer** — LogisticRegression on concatenated embeddings
3. **Optional: MLP trainer** — PyTorch 2-layer MLP for learned similarity
4. **AUC-ROC evaluation** against held-out test set
5. **Baseline comparison** — cosine similarity baseline vs learned model

### Phase 2C: Clustering + Evaluation Polish (Week 5-6)

1. **Enhanced HAC** — add silhouette score, elbow method, PCA projection
2. **Learning curve plots** — model performance vs training set size
3. **Confusion matrices** — per-class performance visualization
4. **Demo evaluation dashboard** — one-pager showing all metrics

---

## 9. Success Criteria

- [ ] Labeled dataset of 200+ user corrections (synthetic seed acceptable)
- [ ] Occasion classifier with >75% accuracy vs 62% majority-class baseline
- [ ] Formality regressor with MAE < 0.6 vs 0.71 baseline
- [ ] Compatibility scorer with AUC-ROC > 0.80 vs 0.50 random baseline
- [ ] HAC clustering with silhouette score computed and reported
- [ ] All models have train/test splits and evaluation metrics
- [ ] Phase 2 README explains each ML component and MGMT 655 rubric mapping

---

## Cross-Reference Audit

| Spec File | Finding |
|-----------|---------|
| embeddings.md | CLIP zero-shot only; no training pipeline; cosine similarity stated as-is |
| auto-tagging.md | Claude Vision API call; user corrections captured in `ai_tags` JSONB but no correction table or retraining loop |
| outfit-composition.md | Magic Bar uses LLM reasoning; no learned compatibility scoring |
| style-learning.md | HAC is correct unsupervised learning; spec is thin on evaluation metrics |
| data-model.md | `outfits.rating` exists (1-5) — raw material for compatibility labels; `ai_tags` captures raw responses for debugging |

**Key opportunity**: `outfits.rating` (1-5) and `ai_tags` (raw Claude responses) are already in the schema. These are the labeled dataset sources for Phase 2 training.
