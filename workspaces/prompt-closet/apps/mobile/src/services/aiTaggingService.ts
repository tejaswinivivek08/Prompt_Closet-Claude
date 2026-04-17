/**
 * AI Tagging Service (STUB)
 *
 * In Phase 1, this returns mock data.
 * In production, this calls Claude Vision API.
 */
import type { AITagResult } from "@/types";

const MOCK_TAGS: AITagResult[] = [
  {
    category: "top",
    subcategory: "kurta",
    colors: ["navy", "white"],
    pattern: "embroidered",
    occasions: ["festive", "party", "wedding"],
    formality_score: 4,
    confidence: 0.92,
  },
  {
    category: "bottom",
    subcategory: "churidar",
    colors: ["gold"],
    pattern: "solid",
    occasions: ["festive", "party"],
    formality_score: 4,
    confidence: 0.88,
  },
  {
    category: "dress",
    subcategory: null,
    colors: ["coral"],
    pattern: "floral",
    occasions: ["casual", "date"],
    formality_score: 2,
    confidence: 0.95,
  },
  {
    category: "top",
    subcategory: "blazer",
    colors: ["black"],
    pattern: "solid",
    occasions: ["office", "party"],
    formality_score: 5,
    confidence: 0.91,
  },
  {
    category: "traditional",
    subcategory: "saree",
    colors: ["red", "gold"],
    pattern: "embroidered",
    occasions: ["wedding", "festive"],
    formality_score: 5,
    confidence: 0.97,
  },
];

let callCount = 0;

/**
 * Analyze an image and return AI-generated tags.
 * STUB: Returns random mock data with a simulated delay.
 *
 * @param imageUrl - The public URL of the uploaded image
 * @param onProgress - Optional callback for analysis progress
 */
export async function analyzeImage(
  imageUrl: string,
  onProgress?: (stage: "uploading" | "analyzing" | "done") => void,
): Promise<AITagResult> {
  // Simulate analysis delay (2-4 seconds)
  onProgress?.("analyzing");
  await delay(2000 + Math.random() * 2000);

  // Return a rotating mock result
  const result = MOCK_TAGS[callCount % MOCK_TAGS.length];
  callCount++;

  onProgress?.("done");
  return result;
}

/**
 * Simulate delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if the tagging service is available (STUB always returns true)
 */
export function isTaggingServiceAvailable(): boolean {
  return true;
}
