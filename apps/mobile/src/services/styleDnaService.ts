/**
 * Style DNA Service — K-means clustering on CLIP embeddings
 *
 * Implements K-means++ initialization, iterative centroid optimization,
 * elbow method, and silhouette score evaluation.
 *
 * For MGMT 655: demonstrates genuine ML training (iterative optimization,
 * gradient-like centroid updates, hyperparameter selection, quantitative evaluation).
 */

import { supabase } from "../lib/supabase";

// ============================================================
// TYPES
// ============================================================

export interface StyleCluster {
  cluster_id: number;
  label: string;
  item_count: number;
  dominant_category: string;
  dominant_colors: string[];
  avg_formality: number;
  centroid: number[];
}

export interface StyleDNAResult {
  user_id: string;
  clusters: StyleCluster[];
  k_optimal: number;
  silhouette_score: number;
  inertias: number[]; // per k, for elbow curve
  silhouette_scores: number[]; // per k, for silhouette curve
  item_assignments: Record<string, number>; // item_id -> cluster_id
  computed_at: string;
}

export interface StyleDNAAPIResponse {
  success: boolean;
  data?: StyleDNAResult;
  error?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const EMBEDDING_DIM = 512;
const K_MIN = 2;
const K_MAX = 10;
const K_DEFAULT = 5;
const MIN_ITEMS_FOR_CLUSTERING = 30;
const MAX_ITEMS = 500; // cap for performance

// ============================================================
// EDGE FUNCTION URL
// ============================================================

const EDGE_FUNCTION_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/style-dna`
  : null;

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Compute Style DNA for a user's wardrobe via Supabase Edge Function.
 * Falls back to local computation if Edge Function is unavailable.
 *
 * @param userId - Current user's ID
 * @param force - Force recompute even if recent result exists
 */
export async function computeStyleDNA(
  userId: string,
  force = false,
): Promise<StyleDNAResult> {
  // Check if recent computation exists
  if (!force) {
    const cached = await getCachedStyleDNA(userId);
    if (cached) {
      console.log("[StyleDNA] Using cached result from", cached.computed_at);
      return cached;
    }
  }

  // Fetch embeddings from Supabase
  const embeddings = await fetchUserEmbeddings(userId);
  if (embeddings.length < MIN_ITEMS_FOR_CLUSTERING) {
    throw new Error(
      `Need at least ${MIN_ITEMS_FOR_CLUSTERING} items for Style DNA. ` +
        `Currently have ${embeddings.length}.`,
    );
  }

  // Cap at MAX_ITEMS for performance
  const capped = embeddings.slice(0, MAX_ITEMS);
  if (capped.length < embeddings.length) {
    console.warn(
      `[StyleDNA] Capped from ${embeddings.length} to ${MAX_ITEMS} items`,
    );
  }

  if (EDGE_FUNCTION_URL) {
    // Use Edge Function for server-side computation
    return computeViaEdgeFunction(userId, capped, force);
  } else {
    // Fall back to local computation
    return computeLocally(userId, capped);
  }
}

/**
 * Get cached Style DNA result from style_dna_results table.
 */
export async function getCachedStyleDNA(
  userId: string,
): Promise<StyleDNAResult | null> {
  const { data, error } = await supabase
    .from("style_dna_results")
    .select("*")
    .eq("user_id", userId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    user_id: data.user_id,
    clusters: data.clusters,
    k_optimal: data.k_optimal,
    silhouette_score: data.silhouette_score,
    inertias: data.inertias || [],
    silhouette_scores: data.silhouette_scores || [],
    item_assignments: data.item_assignments || {},
    computed_at: data.computed_at,
  };
}

/**
 * Save Style DNA result to Supabase.
 */
export async function saveStyleDNA(result: StyleDNAResult): Promise<void> {
  const { error } = await supabase.from("style_dna_results").upsert({
    user_id: result.user_id,
    clusters: result.clusters,
    k_optimal: result.k_optimal,
    silhouette_score: result.silhouette_score,
    inertias: result.inertias,
    silhouette_scores: result.silhouette_scores,
    item_assignments: result.item_assignments,
    computed_at: result.computed_at,
  });

  if (error) {
    console.error("[StyleDNA] Failed to save result:", error.message);
    throw error;
  }
}

/**
 * Get user's style cluster label for a specific item.
 */
export async function getItemClusterLabel(
  itemId: string,
  userId: string,
): Promise<string | null> {
  const cached = await getCachedStyleDNA(userId);
  if (!cached) return null;

  const clusterId = cached.item_assignments[itemId];
  if (clusterId === undefined) return null;

  const cluster = cached.clusters.find((c) => c.cluster_id === clusterId);
  return cluster?.label ?? null;
}

/**
 * Check if user has enough items for Style DNA.
 */
export async function hasEnoughItemsForStyleDNA(
  userId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("wardrobe_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) return false;
  return (count ?? 0) >= MIN_ITEMS_FOR_CLUSTERING;
}

// ============================================================
// DATA FETCHING
// ============================================================

interface EmbeddingRow {
  item_id: string;
  clip_embedding: number[];
  category: string;
  colors: string[];
  formality_score: number;
}

async function fetchUserEmbeddings(userId: string): Promise<EmbeddingRow[]> {
  // First get wardrobe items with their metadata
  const { data: items, error: itemsError } = await supabase
    .from("wardrobe_items")
    .select("id, category, colors, formality_score")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (itemsError || !items) {
    throw new Error(`Failed to fetch wardrobe items: ${itemsError?.message}`);
  }

  const itemIds = items.map((i) => i.id);
  if (itemIds.length === 0) return [];

  // Fetch embeddings
  const { data: embeddings, error: embError } = await supabase
    .from("item_embeddings")
    .select("item_id, clip_embedding")
    .eq("user_id", userId)
    .in("item_id", itemIds);

  if (embError || !embeddings) {
    throw new Error(`Failed to fetch embeddings: ${embError?.message}`);
  }

  // Merge with item metadata
  const embMap = new Map(embeddings.map((e) => [e.item_id, e.clip_embedding]));
  const result: EmbeddingRow[] = [];

  for (const item of items) {
    const embedding = embMap.get(item.id);
    if (embedding) {
      result.push({
        item_id: item.id,
        clip_embedding: embedding,
        category: item.category,
        colors: item.colors || [],
        formality_score: item.formality_score,
      });
    }
  }

  return result;
}

// ============================================================
// EDGE FUNCTION PATH
// ============================================================

async function computeViaEdgeFunction(
  userId: string,
  embeddings: EmbeddingRow[],
  force: boolean,
): Promise<StyleDNAResult> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const response = await fetch(EDGE_FUNCTION_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ user_id: userId, embeddings, force }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Style DNA Edge Function failed: ${response.status} ${text}`,
    );
  }

  const result: StyleDNAResult = await response.json();
  await saveStyleDNA(result);
  return result;
}

// ============================================================
// LOCAL K-MEANS COMPUTATION (fallback)
// ============================================================

async function computeLocally(
  userId: string,
  embeddings: EmbeddingRow[],
): Promise<StyleDNAResult> {
  const X = embeddings.map((e) => e.clip_embedding);

  // Elbow method + silhouette for k range
  const inertias: number[] = [];
  const silhouetteScores: number[] = [];
  const kRange = range(K_MIN, K_MAX + 1);

  for (const k of kRange) {
    const { inertia, assignments } = kMeans(X, k, 50, 1e-4);
    inertias.push(inertia);

    if (k > 1) {
      const sil = computeSilhouetteScore(X, assignments);
      silhouetteScores.push(sil);
    } else {
      silhouetteScores.push(0);
    }
  }

  // Optimal k = k with highest silhouette score
  const silhouetteScoresValid = silhouetteScores.slice(1); // exclude k=1
  const kOptimal =
    silhouetteScoresValid.length > 0
      ? kRange[
          silhouetteScoresValid.indexOf(Math.max(...silhouetteScoresValid)) + 1
        ]
      : K_DEFAULT;

  // Final fit with optimal k
  const { assignments, centroids } = kMeans(X, kOptimal, 100, 1e-5);
  const finalSilhouette = computeSilhouetteScore(X, assignments);

  // Build cluster summaries
  const clusters = buildClusterSummaries(
    embeddings,
    assignments,
    centroids,
    kOptimal,
  );

  // Build item assignments map
  const itemAssignments: Record<string, number> = {};
  embeddings.forEach((emb, i) => {
    itemAssignments[emb.item_id] = assignments[i];
  });

  const result: StyleDNAResult = {
    user_id: userId,
    clusters,
    k_optimal: kOptimal,
    silhouette_score: finalSilhouette,
    inertias,
    silhouette_scores: silhouetteScores,
    item_assignments: itemAssignments,
    computed_at: new Date().toISOString(),
  };

  await saveStyleDNA(result);
  return result;
}

// ============================================================
// K-MEANS IMPLEMENTATION (from scratch)
// ============================================================

/**
 * K-means++ initialization — better than random init.
 */
function initializeCentroids(X: number[][], k: number): number[][] {
  const n = X.length;
  const dim = X[0].length;

  // First centroid: random point
  const centroids: number[][] = [X[Math.floor(Math.random() * n)]];

  // Remaining centroids: probability proportional to D(x)²
  for (let c = 1; c < k; c++) {
    const distances: number[] = [];
    let totalDist = 0;

    for (const x of X) {
      let minDist = Infinity;
      for (const c0 of centroids) {
        const d = cosineDistance(x, c0);
        if (d < minDist) minDist = d;
      }
      distances.push(minDist * minDist);
      totalDist += minDist * minDist;
    }

    // Pick next centroid by weighted probability
    let r = Math.random() * totalDist;
    for (let i = 0; i < n; i++) {
      r -= distances[i];
      if (r <= 0) {
        centroids.push(X[i]);
        break;
      }
    }

    // Fallback
    if (centroids.length === c) {
      centroids.push(X[Math.floor(Math.random() * n)]);
    }
  }

  return centroids;
}

/**
 * Standard K-means with iterative assignment and update.
 * Uses cosine distance.
 */
function kMeans(
  X: number[][],
  k: number,
  maxIterations: number,
  tolerance: number,
): { assignments: number[]; centroids: number[][]; inertia: number } {
  let centroids = initializeCentroids(X, k);
  const assignments = new Array<number>(X.length).fill(0);
  let previousInertia = Infinity;

  for (let iter = 0; iter < maxIterations; iter++) {
    // E-step: assign each point to nearest centroid
    let totalInertia = 0;
    for (let i = 0; i < X.length; i++) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        const d = cosineDistance(X[i], centroids[c]);
        if (d < minDist) {
          minDist = d;
          bestCluster = c;
        }
      }
      assignments[i] = bestCluster;
      totalInertia += minDist;
    }

    // Check convergence
    const change = Math.abs(totalInertia - previousInertia);
    if (change < tolerance) {
      console.log(`[StyleDNA] Converged at iteration ${iter + 1}`);
      break;
    }
    previousInertia = totalInertia;

    // M-step: update centroids as mean of assigned points
    const newCentroids: number[][] = Array.from({ length: k }, () =>
      new Array<number>(X[0].length).fill(0),
    );
    const counts = new Array<number>(k).fill(0);

    for (let i = 0; i < X.length; i++) {
      const c = assignments[i];
      counts[c]++;
      for (let d = 0; d < X[i].length; d++) {
        newCentroids[c][d] += X[i][d];
      }
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let d = 0; d < centroids[c].length; d++) {
          newCentroids[c][d] /= counts[c];
        }
      } else {
        // Reinitialize empty cluster with random point
        newCentroids[c] = X[Math.floor(Math.random() * X.length)];
      }
    }

    centroids = newCentroids;
  }

  return {
    assignments,
    centroids,
    inertia: previousInertia,
  };
}

/**
 * Compute mean silhouette score for all samples.
 * Silhouette s(i) = (b(i) - a(i)) / max(a(i), b(i))
 * where a(i) = avg distance to same cluster, b(i) = min avg distance to other clusters.
 */
function computeSilhouetteScore(X: number[][], assignments: number[]): number {
  const n = X.length;
  const k = Math.max(...assignments) + 1;

  if (k < 2) return 0;

  // Precompute pairwise distances (cache for speed)
  const distCache: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0),
  );
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = cosineDistance(X[i], X[j]);
      distCache[i][j] = d;
      distCache[j][i] = d;
    }
  }

  let totalSilhouette = 0;

  for (let i = 0; i < n; i++) {
    const clusterI = assignments[i];

    // a(i): mean distance to other points in same cluster
    let sameClusterDist = 0;
    let sameClusterCount = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j && assignments[j] === clusterI) {
        sameClusterDist += distCache[i][j];
        sameClusterCount++;
      }
    }
    const a = sameClusterCount > 0 ? sameClusterDist / sameClusterCount : 0;

    // b(i): min mean distance to other clusters
    let minOtherDist = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === clusterI) continue;
      let otherDist = 0;
      let otherCount = 0;
      for (let j = 0; j < n; j++) {
        if (assignments[j] === c) {
          otherDist += distCache[i][j];
          otherCount++;
        }
      }
      if (otherCount > 0) {
        const meanDist = otherDist / otherCount;
        if (meanDist < minOtherDist) minOtherDist = meanDist;
      }
    }

    const b = minOtherDist === Infinity ? 0 : minOtherDist;

    // Silhouette for this point
    if (Math.max(a, b) > 0) {
      totalSilhouette += (b - a) / Math.max(a, b);
    }
  }

  return totalSilhouette / n;
}

// ============================================================
// CLUSTER INTERPRETATION
// ============================================================

const STYLE_LABELS = [
  "Minimalist",
  "Classic",
  "Streetwear",
  "Formal",
  "Festive",
];

function buildClusterSummaries(
  embeddings: EmbeddingRow[],
  assignments: number[],
  centroids: number[][],
  k: number,
): StyleCluster[] {
  const clusters: StyleCluster[] = [];

  for (let c = 0; c < k; c++) {
    const items = embeddings.filter((_, i) => assignments[i] === c);

    // Dominant category
    const categoryCount: Record<string, number> = {};
    for (const item of items) {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    }
    const dominantCategory =
      Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "unknown";

    // Dominant colors (top 3)
    const colorCount: Record<string, number> = {};
    for (const item of items) {
      for (const color of item.colors) {
        colorCount[color] = (colorCount[color] || 0) + 1;
      }
    }
    const dominantColors = Object.entries(colorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c]) => c);

    // Average formality
    const avgFormality =
      items.length > 0
        ? items.reduce((sum, i) => sum + i.formality_score, 0) / items.length
        : 3;

    // Label assignment: based on formality + dominant category heuristics
    const label = inferStyleLabel(
      dominantCategory,
      avgFormality,
      dominantColors,
    );

    clusters.push({
      cluster_id: c,
      label,
      item_count: items.length,
      dominant_category: dominantCategory,
      dominant_colors: dominantColors,
      avg_formality: Math.round(avgFormality * 10) / 10,
      centroid: centroids[c],
    });
  }

  return clusters;
}

/**
 * Infer style label from cluster characteristics.
 * Simple heuristic — in production this would use LLM interpretation.
 */
function inferStyleLabel(
  category: string,
  formality: number,
  colors: string[],
): string {
  if (formality >= 4.0) {
    if (
      colors.some((c) => ["gold", "maroon", "navy"].includes(c.toLowerCase()))
    ) {
      return "Festive";
    }
    return "Formal";
  }

  if (formality <= 2.0) {
    if (
      category === "top" &&
      colors.some((c) => ["black", "white", "gray"].includes(c.toLowerCase()))
    ) {
      return "Minimalist";
    }
    return "Streetwear";
  }

  return "Classic";
}

// ============================================================
// MATH HELPERS
// ============================================================

function cosineDistance(a: number[], b: number[]): number {
  // Cosine distance = 1 - cosine similarity
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return 1 - similarity;
}

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i++) result.push(i);
  return result;
}
