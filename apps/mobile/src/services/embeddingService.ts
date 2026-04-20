/**
 * CLIP Embedding Service — Hugging Face Inference API
 *
 * Uses CLIP ViT-B/32 to generate 512-dimensional vectors for:
 * 1. Image embedding: semantic understanding of clothing items
 * 2. Text embedding: natural language search queries
 *
 * Embeddings enable cosine similarity search via pgvector in Supabase.
 */

import { supabase } from "../lib/supabase";

// ============================================================
// TYPES
// ============================================================

export interface EmbeddingResult {
  embedding: number[];
  latency_ms: number;
}

export interface SearchResult {
  item_id: string;
  similarity: number;
  // Joined wardrobe item data
  item?: {
    id: string;
    image_url: string;
    thumbnail_url: string | null;
    category: string;
    suggested_name?: string;
    ai_tags?: Record<string, unknown>;
    colors: string[];
    pattern: string;
    occasions: string[];
    formality_score: number;
  };
}

// ============================================================
// CONSTANTS
// ============================================================

const HF_API_URL =
  "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32";
const EMBEDDING_DIM = 512;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2_000;
const HF_TIMEOUT_MS = 60_000;

// ============================================================
// ENV
// ============================================================

const HF_API_KEY = process.env.EXPO_PUBLIC_HF_API_TOKEN ?? "";
const IS_MOCK = process.env.MOCK_EMBEDDING === "true";

// ============================================================
// MOCK EMBEDDINGS
// ============================================================

/**
 * Generate a deterministic mock embedding for development.
 * Returns a stable 512-dim vector seeded by the input string.
 */
function generateMockEmbedding(seed: string): number[] {
  const embedding = new Array<number>(EMBEDDING_DIM);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  // Simple LCG to generate deterministic floats
  let state = hash;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    embedding[i] = state / 0xffffffff;
  }
  // Normalize to unit length (required for cosine similarity)
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map((v) => v / norm);
}

const MOCK_TEXT_EMBEDDINGS: Record<string, number[]> = {
  "party dress": generateMockEmbedding("party_dress_formal_elegant"),
  "casual summer": generateMockEmbedding("casual_summer_outdoor_comfortable"),
  "office formal": generateMockEmbedding("office_formal_business_professional"),
  "festive traditional": generateMockEmbedding(
    "festive_traditional_indian_celebration",
  ),
  "wedding guest": generateMockEmbedding("wedding_formal_elegant_ceremony"),
  "beach casual": generateMockEmbedding("beach_casual_tropical_summer"),
  "date night": generateMockEmbedding("date_night_elegant_romantic"),
  "sports athletic": generateMockEmbedding("sports_athletic_fitness_active"),
};

let mockCallCount = 0;

// ============================================================
// FETCH WRAPPER
// ============================================================

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = HF_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ============================================================
// HF API CALL
// ============================================================

interface HFEmbeddingResponse {
  error?: string;
  estimated_model?: string;
}

async function callHFEndpoint(
  payload: unknown,
  retries = 0,
): Promise<number[]> {
  if (!HF_API_KEY) {
    throw new Error(
      "EXPO_PUBLIC_HF_API_TOKEN is not set. Set it in your .env file or use MOCK_EMBEDDING=true.",
    );
  }

  const startTime = Date.now();

  try {
    const response = await fetchWithTimeout(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const latency_ms = Date.now() - startTime;

    // Handle rate limiting with exponential backoff
    if (response.status === 429) {
      if (retries < MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, retries);
        console.warn(
          `[EmbeddingService] HF API rate limited. Retrying in ${backoff}ms (attempt ${retries + 1}/${MAX_RETRIES})`,
        );
        await new Promise((r) => setTimeout(r, backoff));
        return callHFEndpoint(payload, retries + 1);
      }
      throw new Error("HF_API_RATE_LIMITED");
    }

    if (response.status === 503) {
      // Model loading — retry after delay
      if (retries < MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, retries);
        console.warn(
          `[EmbeddingService] HF model loading (503). Retrying in ${backoff}ms (attempt ${retries + 1}/${MAX_RETRIES})`,
        );
        await new Promise((r) => setTimeout(r, backoff));
        return callHFEndpoint(payload, retries + 1);
      }
      throw new Error("HF_MODEL_UNAVAILABLE");
    }

    if (!response.ok) {
      throw new Error(
        `HF API error: ${response.status} ${response.statusText}`,
      );
    }

    const data: number[] | HFEmbeddingResponse = await response.json();

    if (!Array.isArray(data)) {
      if ((data as HFEmbeddingResponse).error) {
        throw new Error(`HF API error: ${(data as HFEmbeddingResponse).error}`);
      }
      throw new Error("Invalid HF API response: expected number array");
    }

    // Validate dimension
    if (data.length !== EMBEDDING_DIM) {
      console.warn(
        `[EmbeddingService] Unexpected embedding dimension: ${data.length} (expected ${EMBEDDING_DIM})`,
      );
    }

    const latencyMsTotal = Date.now() - startTime;
    console.log(
      `[EmbeddingService] Embedding generated in ${latencyMsTotal}ms (HF: ${latency_ms}ms)`,
    );

    return data;
  } catch (err) {
    const latencyMsTotal = Date.now() - startTime;
    if (err instanceof Error) {
      console.error(
        `[EmbeddingService] Error after ${latencyMsTotal}ms: ${err.message}`,
      );
    }
    throw err;
  }
}

// ============================================================
// IMAGE → BASE64
// ============================================================

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch image: ${response.status} ${response.statusText}`,
    );
  }
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to convert image to base64"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}

// ============================================================
// NORMALIZE EMBEDDING
// ============================================================

/**
 * Normalize embedding to unit length (L2 norm).
 * Required for cosine similarity to equal dot product.
 */
function normalizeEmbedding(embedding: number[]): number[] {
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return embedding;
  return embedding.map((v) => v / norm);
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Generate a CLIP embedding for a clothing item image.
 *
 * @param imageUrl - Public URL of the image
 * @returns EmbeddingResult with 512-dim vector and latency in ms
 */
export async function generateImageEmbedding(
  imageUrl: string,
): Promise<EmbeddingResult> {
  if (IS_MOCK) {
    const startTime = Date.now();
    const embedding = generateMockEmbedding(`img_${imageUrl}`);
    const latency_ms = Date.now() - startTime;
    console.log(`[EmbeddingService] MOCK: image embedding in ${latency_ms}ms`);
    return { embedding, latency_ms };
  }

  const startTime = Date.now();
  const base64Image = await fetchImageAsBase64(imageUrl);

  const embedding = await callHFEndpoint({
    inputs: {
      image: base64Image,
    },
  });

  return {
    embedding: normalizeEmbedding(embedding),
    latency_ms: Date.now() - startTime,
  };
}

/**
 * Generate a CLIP text embedding for a search query.
 *
 * @param text - Natural language query (e.g. "festive wedding guest outfit")
 * @returns EmbeddingResult with 512-dim vector and latency in ms
 */
export async function generateTextEmbedding(
  text: string,
): Promise<EmbeddingResult> {
  if (IS_MOCK) {
    const startTime = Date.now();
    // Find closest mock embedding by keyword match
    let embedding = generateMockEmbedding(`text_${text}`);
    for (const [keyword, mockEmb] of Object.entries(MOCK_TEXT_EMBEDDINGS)) {
      if (text.toLowerCase().includes(keyword)) {
        embedding = mockEmb;
        break;
      }
    }
    const latency_ms = Date.now() - startTime;
    mockCallCount++;
    console.log(
      `[EmbeddingService] MOCK: text embedding #${mockCallCount} for "${text}" in ${latency_ms}ms`,
    );
    return { embedding, latency_ms };
  }

  const startTime = Date.now();

  const embedding = await callHFEndpoint({
    inputs: text,
  });

  return {
    embedding: normalizeEmbedding(embedding),
    latency_ms: Date.now() - startTime,
  };
}

/**
 * Save an embedding to the item_embeddings table.
 *
 * @param itemId - wardrobe_items UUID
 * @param userId - profiles UUID
 * @param embedding - 512-dim CLIP vector
 */
export async function saveEmbedding(
  itemId: string,
  userId: string,
  embedding: number[],
): Promise<void> {
  const { error } = await supabase.from("item_embeddings").insert({
    item_id: itemId,
    user_id: userId,
    clip_embedding: embedding,
  });

  if (error) {
    throw new Error(`Failed to save embedding: ${error.message}`);
  }

  console.log(`[EmbeddingService] Saved embedding for item ${itemId}`);
}

/**
 * Search wardrobe items by semantic similarity to a text query.
 *
 * Uses Supabase RPC with pgvector cosine similarity.
 * Falls back to empty results on error.
 *
 * @param userId - Current user's ID
 * @param queryText - Natural language search query
 * @param limit - Max results (default 10)
 * @param matchThreshold - Minimum similarity (default 0.3)
 */
export async function semanticSearch(
  userId: string,
  queryText: string,
  limit = 10,
  matchThreshold = 0.3,
): Promise<SearchResult[]> {
  try {
    // Generate text embedding for the query
    const { embedding: queryEmbedding } =
      await generateTextEmbedding(queryText);

    // Call Supabase RPC for vector similarity search
    const { data, error } = await supabase.rpc("match_wardrobe_items", {
      query_embedding: queryEmbedding,
      p_user_id: userId,
      match_threshold: matchThreshold,
      match_count: limit,
    });

    if (error) {
      console.error(`[EmbeddingService] RPC error: ${error.message}`);
      // Fallback: return empty results (don't crash the UI)
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Fetch full wardrobe item details for each match
    const itemIds = data.map((row: { item_id: string }) => row.item_id);
    const { data: items, error: itemsError } = await supabase
      .from("wardrobe_items")
      .select(
        "id, image_url, thumbnail_url, category, ai_tags, colors, pattern, occasions, formality_score",
      )
      .in("id", itemIds)
      .eq("user_id", userId)
      .eq("is_active", true);

    if (itemsError) {
      console.error(
        `[EmbeddingService] Failed to fetch items: ${itemsError.message}`,
      );
      return [];
    }

    // Merge similarity scores with item data
    const results: SearchResult[] = data.map(
      (row: { item_id: string; similarity: number }) => {
        const item = items?.find((i) => i.id === row.item_id);
        return {
          item_id: row.item_id,
          similarity: row.similarity,
          item: item
            ? {
                id: item.id,
                image_url: item.image_url,
                thumbnail_url: item.thumbnail_url,
                category: item.category,
                suggested_name: (item.ai_tags as Record<string, unknown>)
                  ?.suggested_name as string | undefined,
                ai_tags: item.ai_tags ?? undefined,
                colors: item.colors,
                pattern: item.pattern,
                occasions: item.occasions,
                formality_score: item.formality_score,
              }
            : undefined,
        };
      },
    );

    console.log(
      `[EmbeddingService] semanticSearch("${queryText}"): ${results.length} results`,
    );

    return results;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[EmbeddingService] semanticSearch failed: ${message}`);
    return [];
  }
}

/**
 * Check if embedding service is available
 */
export function isEmbeddingAvailable(): boolean {
  return IS_MOCK || !!HF_API_KEY;
}
