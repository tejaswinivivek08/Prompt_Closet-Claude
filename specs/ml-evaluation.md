# ML Evaluation — Phase 2 Enhancements

**Domain**: ML
**Authority**: This spec covers what ML additions are needed for MGMT 655 grading and how to evaluate them.
**Last Updated**: 2026-04-18

---

## Phase 1 ML Assessment

| Component | ML Technique | Grading Weight |
|-----------|-------------|---------------|
| CLIP embeddings | Frozen ViT-B/32 inference | Low (API call) |
| Cosine similarity search | Classic IR, not ML | None |
| Auto-tagging (Claude Vision) | LLM prompting | Low (API call) |
| Magic Bar outfit composition | LLM prompting | Low (API call) |
| HAC clustering on embeddings | Unsupervised learning | Medium |

**Gap**: Phase 1 is primarily retrieval + API calling. Only HAC clustering qualifies as genuine ML training.

---

## Phase 2 ML Additions

### 1. Outfit Compatibility Scorer (Recommended)

**Approach**: Train a simple neural network (2-layer MLP) on outfit pairs.

**Data**: User-rated outfits from `outfits.rating` field. Pairs where rating ≥ 4 = positive pairs, rating ≤ 2 = negative pairs.

**Model**: PyTorch 2-layer MLP:
```
input: concat(embedding_A, embedding_B)  # 1024-dim
hidden: 256-dim, ReLU, dropout(0.3)
output: 1-dim, sigmoid (compatibility score)
loss: BCEWithLogitsLoss
optimizer: AdamW, lr=1e-3
train/test split: 80/20
evaluation: AUC-ROC, accuracy at threshold=0.5
```

**What it demonstrates**: Neural network training, backpropagation, binary classification evaluation.

**Evaluation metrics**: AUC-ROC, precision@5, recall@5.

### 2. Occasion Classifier (Recommended)

**Approach**: Supervised classifier on CLIP embeddings + tag features.

**Data**: User-corrected tags on wardrobe items (from tag editing flow). Each item has `occasions[]` array from user corrections.

**Model**: LightGBM or LogisticRegression on 512-dim CLIP embedding + tag features.

**What it demonstrates**: Supervised learning, classification metrics (F1, precision, recall), train/test split.

### 3. Formality Regressor (Optional)

**Approach**: GradientBoostingRegressor predicting formality_score from CLIP embedding.

**Data**: All wardrobe items with user-confirmed formality scores.

**Model**: LightGBMRegressor with MAE/R² evaluation.

---

## Evaluation Protocol

### Offline Evaluation

For each ML model added in Phase 2:

1. **Train/test split**: 80% train, 20% test, random split, stratified for classifiers
2. **Metrics to report**:
   - Classification: Accuracy, Precision, Recall, F1 (macro), AUC-ROC
   - Regression: MAE, RMSE, R²
   - Compatibility scorer: AUC-ROC, accuracy@threshold
3. **Baseline comparison**: Cosine similarity baseline vs learned model

### Online Evaluation (A/B)

- Magic Bar with learned scorer vs cosine similarity baseline
- User feedback: "Did this outfit work?" thumbs up/down
- Track: recommendation acceptance rate, user satisfaction

---

## Dataset Requirements

| Model | Min Items | Min Positive Pairs | Notes |
|-------|-----------|-------------------|-------|
| Compatibility scorer | 20 items | 50 rated outfits | More = better |
| Occasion classifier | 10 items per occasion | 30 corrections per class | Needs diversity |
| Formality regressor | 30 items | N/A | Range of formality scores |

---

## MGMT 655 Rubric Mapping

| ML Topic | Phase 1 Coverage | Phase 2 Addition |
|----------|-----------------|------------------|
| Supervised learning | None | Occasion classifier, formality regressor |
| Unsupervised learning | HAC clustering | Style cluster labeling |
| Neural networks | None | Outfit compatibility MLP |
| Model evaluation | None | Train/test split, AUC-ROC, F1 |
| Feature embeddings | CLIP (frozen) | Learned similarity (MLP) |
| Recommendation systems | Content-based (cosine) | Learned compatibility |

---

## Minimum Viable ML for Phase 2

To demonstrate ML competence beyond API calling, Phase 2 should include at minimum:

1. **Outfit compatibility MLP** (trainable in ~50 lines of PyTorch)
2. **Evaluation report** (train/test split, AUC-ROC, baseline comparison)
3. **Online metrics** (recommendation acceptance rate)

This satisfies the MGMT 655 expectation of: "train a model, evaluate it, compare to baseline."
