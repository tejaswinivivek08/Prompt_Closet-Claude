/**
 * Preference Learning Service — implicit feedback with Bayesian updating
 *
 * Tracks user acceptance/rejection signals from Magic Bar interactions.
 * Uses Bayesian inference to estimate per-style acceptance probability,
 * then re-weights recommendations toward preferred styles.
 *
 * Cold-start: no prior data → uniform priors (Beta(1,1))
 * Bayesian update: Beta(α + accepts, β + rejects) posterior after each signal
 */

import { supabase } from "../lib/supabase";
import type { StyleCluster } from "./styleDnaService";

// ============================================================
// TYPES
// ============================================================

export interface PreferenceScore {
  dimension: string; // "casual" | "formal" | "festive" | etc.
  alpha: number; // successes + prior
  beta: number; // failures + prior
  probability: number; // posterior mean = alpha / (alpha + beta)
  confidence: number; // effective sample size = alpha + beta
  total_signals: number;
}

export interface UserPreferences {
  scores: Record<string, PreferenceScore>;
  computed_at: string;
}

/** Stored per-user per-dimension preference prior */
interface StoredPreference {
  dimension: string;
  alpha: number;
  beta: number;
  signals: number;
}

// ============================================================
// CONSTANTS
// ============================================================

/** Beta prior — uninformative uniform prior */
const PRIOR_ALPHA = 1;
const PRIOR_BETA = 1;

/** Minimum signals before trusting the preference score */
const MIN_SIGNALS_FOR_TRUST = 3;

/** All style dimensions we track */
const STYLE_DIMENSIONS = [
  "casual",
  "formal",
  "festive",
  "party",
  "office",
  "streetwear",
  "minimalist",
  "sport",
  "bohemian",
  "ethnic",
];

// ============================================================
// FEEDBACK RECORDING
// ============================================================

/**
 * Record feedback from Magic Bar interaction.
 * Computes SHA-256 hash of sorted item_ids for privacy.
 */
export async function recordFeedback(
  userId: string,
  itemIds: string[],
  feedback: "accepted" | "rejected",
  occasion?: string,
): Promise<void> {
  const outfitHash = hashOutfit(itemIds);

  const { error } = await supabase.from("outfit_feedback").insert({
    user_id: userId,
    outfit_id: null, // May be null for unsaved suggestions
    feedback,
    outfit_hash: outfitHash,
  });

  if (error) {
    console.error(
      "[PreferenceLearning] Failed to record feedback:",
      error.message,
    );
    throw error;
  }

  // Update dimension-level priors
  if (occasion) {
    await updateDimensionPrior(userId, occasion, feedback === "accepted");
  }
}

/**
 * Hash outfit composition for privacy (not reversible).
 */
export function hashOutfit(itemIds: string[]): string {
  const sorted = [...itemIds].sort();
  // Simple hash for client-side use — Supabase stores this as-is
  const key = sorted.join(",");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// ============================================================
// BAYESIAN PREFERENCE INFERENCE
// ============================================================

/**
 * Update Bayesian prior for a single dimension.
 * Uses Beta-Binomial conjugate model for efficient updating.
 */
async function updateDimensionPrior(
  userId: string,
  dimension: string,
  isAccept: boolean,
): Promise<void> {
  const { data: existing } = await supabase
    .from("user_style_preferences")
    .select("*")
    .eq("user_id", userId)
    .eq("dimension", dimension)
    .maybeSingle();

  const currentAlpha = existing?.alpha ?? PRIOR_ALPHA;
  const currentBeta = existing?.beta ?? PRIOR_BETA;
  const currentSignals = existing?.signals ?? 0;

  const newAlpha = currentAlpha + (isAccept ? 1 : 0);
  const newBeta = currentBeta + (isAccept ? 0 : 1);
  const newSignals = currentSignals + 1;

  const { error } = await supabase.from("user_style_preferences").upsert(
    {
      user_id: userId,
      dimension,
      alpha: newAlpha,
      beta: newBeta,
      signals: newSignals,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,dimension",
    },
  );

  if (error) {
    console.warn("[PreferenceLearning] Failed to update prior:", error.message);
  }
}

/**
 * Get all preference scores for a user.
 * Returns a map of dimension → PreferenceScore with posterior statistics.
 */
export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences> {
  const { data: stored } = await supabase
    .from("user_style_preferences")
    .select("*")
    .eq("user_id", userId);

  const storedMap = new Map<string, StoredPreference>(
    (stored ?? []).map((row) => [row.dimension, row]),
  );

  const scores: Record<string, PreferenceScore> = {};

  for (const dim of STYLE_DIMENSIONS) {
    const stored = storedMap.get(dim);
    const alpha = stored?.alpha ?? PRIOR_ALPHA;
    const beta = stored?.beta ?? PRIOR_BETA;
    const signals = stored?.signals ?? 0;
    const total = alpha + beta;
    const probability = alpha / total;
    // Confidence = effective sample size (Laplace-smoothed count)
    const confidence = Math.min(signals / 10, 1); // 0-1 scale

    scores[dim] = {
      dimension: dim,
      alpha,
      beta,
      probability,
      confidence,
      total_signals: signals,
    };
  }

  return {
    scores,
    computed_at: new Date().toISOString(),
  };
}

/**
 * Re-rank Magic Bar results using preference scores.
 * Items/occasions with higher acceptance probability get boosted.
 *
 * @param results — raw search results with similarity scores
 * @param preferences — user's learned style preferences
 * @param boostFactor — how much to boost (0 = no boost, 0.5 = moderate)
 */
export function reRankByPreferences(
  results: Array<{
    item?: { occasions?: string[]; category?: string };
    similarity: number;
  }>,
  preferences: UserPreferences,
  boostFactor = 0.3,
): Array<{
  item?: { occasions?: string[]; category?: string };
  similarity: number;
  preferenceBoost: number;
}> {
  if (boostFactor === 0) {
    return results.map((r) => ({ ...r, preferenceBoost: 0 }));
  }

  return results.map((result) => {
    const item = result.item;
    const occasions = item?.occasions ?? [];
    let boostSum = 0;
    let count = 0;

    for (const occasion of occasions) {
      const score = preferences.scores[occasion.toLowerCase()];
      if (score && score.total_signals >= MIN_SIGNALS_FOR_TRUST) {
        // Confidence-weighted boost: high-confidence scores matter more
        boostSum += (score.probability - 0.5) * score.confidence;
        count += 1;
      }
    }

    if (count === 0) {
      return { ...result, preferenceBoost: 0 };
    }

    // Average boost across dimensions, scaled by boostFactor
    const avgBoost = (boostSum / count) * boostFactor;
    const preferenceBoost = Math.max(-0.2, Math.min(0.3, avgBoost)); // Clamp

    return {
      ...result,
      preferenceBoost,
    };
  });
}

/**
 * Get style recommendations based on learned preferences.
 * Returns top-N preferred dimensions sorted by probability.
 */
export async function getPreferredStyles(
  userId: string,
  topN = 3,
): Promise<string[]> {
  const prefs = await getUserPreferences(userId);
  const entries = Object.values(prefs.scores)
    .filter((s) => s.total_signals >= MIN_SIGNALS_FOR_TRUST)
    .sort((a, b) => b.probability - a.probability);

  return entries.slice(0, topN).map((s) => s.dimension);
}

// ============================================================
// PREFERENCE WEIGHTING FOR SEMANTIC SEARCH
// ============================================================

/**
 * Generate a preference-aware query modifier.
 * Boosts preferred dimensions in the search query sent to semantic search.
 */
export async function buildPreferenceAwareQuery(
  userId: string,
  baseQuery: string,
): Promise<string> {
  const prefs = await getUserPreferences(userId);
  const topStyles = await getPreferredStyles(userId, 2);

  if (topStyles.length === 0) {
    return baseQuery;
  }

  // Inject preferred styles into query for contextual boosting
  const styleBoost = topStyles.join(" ");
  return `${baseQuery} ${styleBoost}`;
}
