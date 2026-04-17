# Style Learning Specification

## Overview

The app learns the user's personal style through clustering on CLIP embeddings and tag frequency analysis. Results surface as a "Style DNA" visualization and named "looks."

## Clustering Approach (ADR-002)

**Algorithm**: Hierarchical Agglomerative Clustering (HAC) with cosine distance and Ward linkage.

**Why HAC**:

- No need to pre-specify K (number of clusters)
- Produces a dendrogram — compelling visual for demo
- Works well at small scale (30-500 items)
- Demonstrates multiple ML concepts: distance metrics, linkage criteria, dendrogram cutting

**Minimum data requirements**:

| Item Count | What Works                                                    | What Doesn't                     |
| ---------- | ------------------------------------------------------------- | -------------------------------- |
| 10-30      | Tag frequency analysis, basic stats                           | Meaningful clusters              |
| 30-50      | 2-3 broad visual groups via HAC                               | "Personal style" claims          |
| 50-100     | Stable clusters, labelable ("Dark Formal," "Colorful Casual") | Style recommendations            |
| 100+       | Robust clustering, style profiling                            | Production-grade personalization |

**Demo threshold**: Present 30+ items minimum. Below 30, show tag frequency analysis instead of clusters.

## Implementation

```python
# Server-side or Edge Function
from scipy.cluster.hierarchy import fcluster, linkage
from scipy.spatial.distance import pdist

# embeddings: array of 512-dim vectors from pgvector
# metric: cosine distance
# method: ward linkage

distances = pdist(embeddings, metric='cosine')
Z = linkage(distances, method='ward')
clusters = fcluster(Z, t=0.7, criterion='distance')  # cut threshold
```

## Style DNA Visualization

Appears after 5+ items in the closet:

| Component             | Data Source             | Display                          |
| --------------------- | ----------------------- | -------------------------------- |
| Color palette         | Tag `color` field       | Top 5 color swatches with labels |
| Category distribution | Tag `category` field    | Horizontal bar chart             |
| Formality range       | `formality_score` field | Slider with average marker       |
| Go-to occasions       | Tag `occasion` field    | Percentage breakdown             |

## Cluster Naming

After clustering, use Claude to generate cluster names based on dominant characteristics:

```
[SYSTEM]
You are naming a style cluster. Given the items in this cluster, suggest a short name
(2-3 words) that captures the visual style. Examples: "Office Core", "Weekend Chill",
"Night Out", "Earthy Tones".

Items: {list of item descriptions}

Return ONLY the name, nothing else.
```

## Limitations (Important for Demo Honesty)

- Clusters in CLIP space represent **visual similarity groups** — similar colors, similar garment types
- They do NOT represent social context ("workwear"), formality level, or user preference
- Present as "the app groups visually similar items" not "the AI understands your style"
- Silhouette score should be reported honestly (likely 0.2-0.4 at this scale)

## ML Concepts Demonstrated

- Unsupervised learning (clustering without labels)
- Distance metrics (cosine vs Euclidean)
- Linkage criteria (Ward, average, complete)
- Dendrogram visualization
- Dimensionality reduction (optional: PCA/t-SNE projection for 2D scatter plot)
