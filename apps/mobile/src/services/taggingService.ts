/**
 * AI Auto-Tagging Service — Claude Vision API
 *
 * SECURITY NOTE: Calling the Anthropic API directly from React Native exposes the
 * API key in the client bundle. For production, proxy this through a Supabase
 * Edge Function or server-side route that holds the key server-side.
 * The MOCK_TAGGING=true mode bypasses this entirely and is recommended for
 * local development.
 */

// EXPO_PUBLIC_* vars are available directly on process.env in Expo
const API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? "";
const MOCK_MODE = process.env.MOCK_TAGGING === "true";

// ============================================================
// TYPES
// ============================================================

export type ClothingCategory =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "footwear"
  | "accessory"
  | "traditional";

export type ClothingPattern =
  | "solid"
  | "striped"
  | "floral"
  | "printed"
  | "embroidered"
  | "checkered"
  | "paisley"
  | "geometric"
  | "abstract";

export type Occasion =
  | "casual"
  | "office"
  | "party"
  | "festive"
  | "wedding"
  | "temple"
  | "beach"
  | "date"
  | "sport";

export type Season = "all-season" | "summer" | "winter" | "monsoon";

export interface ClothingTags {
  category: ClothingCategory;
  subcategory: string;
  colors: string[]; // max 3
  pattern: ClothingPattern;
  fabric: string;
  occasions: Occasion[];
  formality_score: 1 | 2 | 3 | 4 | 5;
  season: Season[];
  suggested_name: string;
  style_notes: string;
}

export interface TaggingResult {
  tags: ClothingTags;
  is_fallback: boolean;
  tokens_used?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ============================================================
// CONSTANTS
// ============================================================

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_CONCURRENT = 3;
const MAX_RETRIES = 2;
const API_TIMEOUT_MS = 30_000;

// ============================================================
// SCHEMA FOR PROMPTING
// ============================================================

const CLOTHING_SCHEMA = {
  category:
    "top | bottom | dress | outerwear | footwear | accessory | traditional",
  subcategory:
    "string, e.g. kurta, saree, blazer, jeans, shirt, salwar, lehenga, sherwani",
  colors: 'array of up to 3 color strings, lowercase, e.g. ["navy", "white"]',
  pattern:
    "solid | striped | floral | printed | embroidered | checkered | paisley | geometric | abstract",
  fabric:
    "string, best guess from visual texture, e.g. cotton, silk, linen, polyester, denim",
  occasions:
    "array of: casual, office, party, festive, wedding, temple, beach, date, sport",
  formality_score:
    "integer 1-5: 1=very casual, 3=business casual, 5=very formal",
  season: "array of: all-season, summer, winter, monsoon",
  suggested_name: 'string, e.g. "Navy Linen Blazer", "Red Embroidered Kurta"',
  style_notes:
    'string, 1 sentence describing the style for Magic Bar context, e.g. "This elegant navy kurta features subtle embroidery perfect for festive celebrations."',
};

const SYSTEM_PROMPT = `You are a professional fashion analyst with expertise in Indian and contemporary global fashion. Analyze clothing items precisely and return structured JSON only.`;

// ============================================================
// RATE LIMITER
// ============================================================

// Simple semaphore for concurrency control
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    const next = this.queue.shift();
    if (next) {
      this.permits--;
      next();
    }
  }
}

const semaphore = new Semaphore(MAX_CONCURRENT);

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_RESULTS: ClothingTags[] = [
  {
    category: "top",
    subcategory: "kurta",
    colors: ["navy", "white"],
    pattern: "embroidered",
    fabric: "cotton",
    occasions: ["festive", "party", "wedding"],
    formality_score: 4,
    season: ["all-season"],
    suggested_name: "Navy Embroidered Cotton Kurta",
    style_notes:
      "This elegant navy kurta features subtle thread embroidery on the collar and placket, making it perfect for festive celebrations and semi-formal occasions.",
  },
  {
    category: "traditional",
    subcategory: "saree",
    colors: ["red", "gold"],
    pattern: "embroidered",
    fabric: "silk",
    occasions: ["wedding", "festive", "party"],
    formality_score: 5,
    season: ["all-season"],
    suggested_name: "Red Silk Embroidered Saree",
    style_notes:
      "This rich red silk saree with gold zari embroidery is a showstopper for weddings and grand celebrations, radiating timeless elegance.",
  },
  {
    category: "bottom",
    subcategory: "churidar",
    colors: ["charcoal", "grey"],
    pattern: "solid",
    fabric: "cotton",
    occasions: ["casual", "office", "party"],
    formality_score: 3,
    season: ["summer", "all-season"],
    suggested_name: "Charcoal Grey Cotton Churidar",
    style_notes:
      "A versatile charcoal grey cotton churidar that pairs effortlessly with both casual kurtas and formal shirts, ideal for everyday wear.",
  },
  {
    category: "dress",
    subcategory: null,
    colors: ["coral", "pink"],
    pattern: "floral",
    fabric: "chiffon",
    occasions: ["party", "date", "beach"],
    formality_score: 2,
    season: ["summer", "monsoon"],
    suggested_name: "Coral Pink Floral Chiffon Dress",
    style_notes:
      "This breezy coral pink floral chiffon dress captures summer charm with its delicate print and flowing silhouette, perfect for garden parties.",
  },
  {
    category: "outerwear",
    subcategory: "blazer",
    colors: ["black"],
    pattern: "solid",
    fabric: "wool",
    occasions: ["office", "party", "formal"],
    formality_score: 5,
    season: ["winter", "all-season"],
    suggested_name: "Black Wool Blend Formal Blazer",
    style_notes:
      "This sharp black wool blazer with a tailored cut elevates any outfit for business meetings or formal evenings, offering timeless sophistication.",
  },
];

let mockIndex = 0;

function getNextMockResult(): ClothingTags {
  const result = MOCK_RESULTS[mockIndex % MOCK_RESULTS.length];
  mockIndex++;
  return { ...result };
}

// ============================================================
// FALLBACK DEFAULT
// ============================================================

const FALLBACK_TAGS: ClothingTags = {
  category: "top",
  subcategory: "",
  colors: ["unknown"],
  pattern: "solid",
  fabric: "unknown",
  occasions: ["casual"],
  formality_score: 3,
  season: ["all-season"],
  suggested_name: "Tagged Item",
  style_notes: "Item analyzed with AI tagging.",
};

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
      // Strip data URL prefix to get raw base64
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
// CLAUDE API CALL
// ============================================================

interface AnthropicMessageResponse {
  type: string;
  id: string;
  role: string;
  content: Array<{ type: string; text?: string }>;
  model: string;
  stop_reason: string;
  stop_sequence: number | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

async function callClaudeVision(
  base64Image: string,
  mimeType: string,
  retryCount: number,
): Promise<{
  tags: Partial<ClothingTags>;
  tokens: { input_tokens: number; output_tokens: number };
}> {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "EXPO_PUBLIC_CLAUDE_API_KEY is not set. Set it in your .env file or use MOCK_TAGGING=true.",
    );
  }

  const stricterPrompt =
    retryCount > 0
      ? `Your previous response was not valid JSON. Return ONLY the JSON object with no additional text, markdown, or explanation. The JSON must exactly match this schema.`
      : `Analyze this clothing item and return ONLY a valid JSON object matching this exact schema. Be specific about Indian traditional wear categories (kurta, saree, salwar, lehenga, sherwani, etc). Never include markdown, explanation, or extra text — only the JSON object.`;

  const userPrompt = `${stricterPrompt}\n\nRequired JSON schema:\n${JSON.stringify(CLOTHING_SCHEMA, null, 2)}`;

  const body = {
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/webp",
              data: base64Image,
            },
          },
          {
            type: "text",
            text: userPrompt,
          },
        ],
      },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      throw new Error("RATE_LIMITED");
    }

    if (response.status === 401) {
      throw new Error("INVALID_API_KEY");
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: AnthropicMessageResponse = await response.json();

    // Extract text from response
    const textContent = data.content?.find((c) => c.type === "text");
    const rawText = textContent?.text?.trim() ?? "";

    if (!rawText) {
      throw new Error("Empty response from Claude");
    }

    // Parse JSON — strip markdown code blocks if present
    let jsonText = rawText;
    const jsonMatch = rawText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonText) as Partial<ClothingTags>;

    return {
      tags: parsed,
      tokens: {
        input_tokens: data.usage.input_tokens,
        output_tokens: data.usage.output_tokens,
      },
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.message === "RATE_LIMITED") {
      // Wait and retry on rate limit
      await new Promise((r) => setTimeout(r, 60_000));
      throw err;
    }
    throw err;
  }
}

// ============================================================
// VALIDATION
// ============================================================

function validateAndNormalize(raw: Partial<ClothingTags>): ClothingTags {
  const category = normalizeCategory(raw.category);
  const pattern = normalizePattern(raw.pattern);
  const colors = normalizeColors(raw.colors);
  const occasions = normalizeOccasions(raw.occasions);
  const season = normalizeSeason(raw.season);
  const formality_score = normalizeFormality(raw.formality_score);

  return {
    category,
    subcategory: typeof raw.subcategory === "string" ? raw.subcategory : "",
    colors,
    pattern,
    fabric: typeof raw.fabric === "string" ? raw.fabric : "unknown",
    occasions,
    formality_score,
    season,
    suggested_name:
      typeof raw.suggested_name === "string"
        ? raw.suggested_name
        : FALLBACK_TAGS.suggested_name,
    style_notes:
      typeof raw.style_notes === "string"
        ? raw.style_notes
        : FALLBACK_TAGS.style_notes,
  };
}

function normalizeCategory(val: unknown): ClothingCategory {
  const valid: ClothingCategory[] = [
    "top",
    "bottom",
    "dress",
    "outerwear",
    "footwear",
    "accessory",
    "traditional",
  ];
  if (typeof val === "string" && valid.includes(val as ClothingCategory)) {
    return val as ClothingCategory;
  }
  return "top";
}

function normalizePattern(val: unknown): ClothingPattern {
  const valid: ClothingPattern[] = [
    "solid",
    "striped",
    "floral",
    "printed",
    "embroidered",
    "checkered",
    "paisley",
    "geometric",
    "abstract",
  ];
  if (typeof val === "string" && valid.includes(val as ClothingPattern)) {
    return val as ClothingPattern;
  }
  return "solid";
}

function normalizeColors(val: unknown): string[] {
  if (Array.isArray(val) && val.length > 0) {
    const colors = val
      .slice(0, 3)
      .filter((c) => typeof c === "string")
      .map((c) => c.toLowerCase().trim());
    return colors.length > 0 ? colors : ["unknown"];
  }
  if (typeof val === "string") {
    return [val.toLowerCase().trim()];
  }
  return ["unknown"];
}

function normalizeOccasions(val: unknown): Occasion[] {
  const valid: Occasion[] = [
    "casual",
    "office",
    "party",
    "festive",
    "wedding",
    "temple",
    "beach",
    "date",
    "sport",
  ];
  if (Array.isArray(val)) {
    const filtered = val.filter((o): o is Occasion =>
      valid.includes(o as Occasion),
    );
    return filtered.length > 0 ? filtered : ["casual"];
  }
  return ["casual"];
}

function normalizeSeason(val: unknown): Season[] {
  const valid: Season[] = ["all-season", "summer", "winter", "monsoon"];
  if (Array.isArray(val)) {
    const filtered = val.filter((s): s is Season =>
      valid.includes(s as Season),
    );
    return filtered.length > 0 ? filtered : ["all-season"];
  }
  if (typeof val === "string" && valid.includes(val as Season)) {
    return [val as Season];
  }
  return ["all-season"];
}

function normalizeFormality(val: unknown): 1 | 2 | 3 | 4 | 5 {
  const n = Number(val);
  if (Number.isInteger(n) && n >= 1 && n <= 5) {
    return n as 1 | 2 | 3 | 4 | 5;
  }
  return 3;
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Analyze a clothing item image and return structured tags.
 *
 * @param imageUrl - Public URL of the uploaded image in Supabase Storage
 * @returns TaggingResult with validated tags and token usage
 */
export async function analyzeClothingItem(
  imageUrl: string,
): Promise<TaggingResult> {
  // Mock mode for development
  if (process.env.MOCK_TAGGING === "true") {
    console.log("[TaggingService] MOCK mode — returning mock result");
    return {
      tags: getNextMockResult(),
      is_fallback: false,
    };
  }

  await semaphore.acquire();

  try {
    console.log(`[TaggingService] Analyzing: ${imageUrl}`);

    // Fetch image and convert to base64
    const base64Image = await fetchImageAsBase64(imageUrl);
    const mimeType = "image/jpeg"; // Supabase Storage serves as JPEG after upload

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { tags: raw, tokens } = await callClaudeVision(
          base64Image,
          mimeType,
          attempt,
        );

        // Validate and normalize
        const validated = validateAndNormalize(raw);

        console.log(
          `[TaggingService] Success — tokens: ${tokens.input_tokens} in / ${tokens.output_tokens} out`,
        );

        return {
          tags: validated,
          is_fallback: false,
          tokens_used: tokens,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (
          lastError.message === "RATE_LIMITED" ||
          lastError.message === "RATE_LIMITED"
        ) {
          // Already handled with wait inside callClaudeVision
          continue;
        }

        // Parse error or network error — retry
        const isRetryable =
          lastError.message.includes("JSON") ||
          lastError.message.includes("Unexpected token") ||
          lastError.message.includes("Empty response") ||
          lastError.message.includes("API error");

        if (isRetryable && attempt < MAX_RETRIES) {
          console.warn(
            `[TaggingService] Parse error, retrying (${attempt + 1}/${MAX_RETRIES})`,
          );
          continue;
        }

        // Non-retryable error or exhausted retries
        break;
      }
    }

    // All retries failed — return fallback
    console.warn(
      `[TaggingService] All retries failed, returning fallback: ${lastError?.message}`,
    );
    return {
      tags: { ...FALLBACK_TAGS },
      is_fallback: true,
    };
  } finally {
    semaphore.release();
  }
}

/**
 * Check if tagging service is available (API key present or mock mode)
 */
export function isTaggingAvailable(): boolean {
  return (
    process.env.MOCK_TAGGING === "true" ||
    !!process.env.EXPO_PUBLIC_CLAUDE_API_KEY
  );
}
