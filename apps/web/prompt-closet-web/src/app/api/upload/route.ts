import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MINIMAX_API_URL = "https://api.minimaxi.chat/v1/image_generation";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface TagResult {
  category: string;
  subcategory: string;
  colors: string[];
  pattern: string;
  fabric: string;
  occasions: string[];
  formality_score: number;
  season: string[];
  suggested_name: string;
  style_notes: string;
}

const FALLBACK_TAGS: TagResult = {
  category: "top",
  subcategory: "",
  colors: [],
  pattern: "solid",
  fabric: "",
  occasions: ["casual"],
  formality_score: 3,
  season: ["all-season"],
  suggested_name: "New Item",
  style_notes: "",
};

// Analyze image using MiniMax image generation with vision prompt
async function analyzeWithMiniMax(
  imageUrl: string,
  apiKey: string,
): Promise<TagResult | null> {
  if (!apiKey || apiKey === "your-minimax-api-key-here") {
    return null;
  }

  try {
    // Use a vision prompt to analyze the image
    const prompt = `Analyze this clothing image and describe it briefly for tagging. Return only: category (top/bottom/dress/outerwear/footwear/accessory/traditional), main colors (1-2 hex), pattern (solid/striped/floral/printed/embroidered/checks), fabric type if visible, occasion (casual/office/festive/wedding/party/temple/beach/date/sport), and a short name. Example: "Blue cotton kurta for festive occasions"`;

    const res = await fetch(MINIMAX_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "image-01",
        prompt,
        image_urls: [imageUrl],
        num_images: 1,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("MiniMax Vision error:", res.status, errText);
      return null;
    }

    const data = await res.json();
    const imageResult = data.data?.image_urls?.[0];

    if (!imageResult) {
      console.error("No image URL in MiniMax response");
      return null;
    }

    // MiniMax image-01 generates an image description as a new image
    // We can't extract structured tags from it - need Claude Vision for that
    return null;
  } catch (err) {
    console.error("MiniMax Vision error:", err);
    return null;
  }
}

// Analyze image using Claude Vision API
async function analyzeWithClaude(imageUrl: string): Promise<TagResult | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    console.log("No Anthropic API key configured for fallback");
    return null;
  }

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "url",
                  url: imageUrl,
                },
              },
              {
                type: "text",
                text: `Analyze this clothing item and respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "category": "top|bottom|dress|outerwear|footwear|accessory|traditional",
  "subcategory": "specific type like kurti, jeans, saree, etc.",
  "colors": ["main colors in hex like #FF0000"],
  "pattern": "solid|striped|floral|printed|embroidered|checks",
  "fabric": "cotton|silk|linen|polyester|wool|chiffon|georgette|denim|other",
  "occasions": ["casual","office","festive","wedding","party","temple","beach","date","sport"],
  "formality_score": 1-5 (1=very casual, 5=very formal),
  "season": ["summer","winter","monsoon","all-season"],
  "suggested_name": "short descriptive name for this item",
  "style_notes": "brief fashion notes about the item"
}`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Claude Vision error:", res.status, errText);
      return null;
    }

    const data = await res.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      console.error("No content in Claude response");
      return null;
    }

    // Extract JSON from response
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("No JSON found in Claude response");
      return null;
    }

    const parsed = JSON.parse(match[0]);

    // Validate and normalize
    return {
      category: parsed.category || "top",
      subcategory: parsed.subcategory || "",
      colors: Array.isArray(parsed.colors) ? parsed.colors : [],
      pattern: parsed.pattern || "solid",
      fabric: parsed.fabric || "",
      occasions: Array.isArray(parsed.occasions)
        ? parsed.occasions
        : ["casual"],
      formality_score:
        typeof parsed.formality_score === "number"
          ? Math.min(5, Math.max(1, parsed.formality_score))
          : 3,
      season: Array.isArray(parsed.season) ? parsed.season : ["all-season"],
      suggested_name: parsed.suggested_name || "Tagged Item",
      style_notes: parsed.style_notes || "",
    };
  } catch (err) {
    console.error("Claude Vision error:", err);
    return null;
  }
}

export async function POST(request: Request) {
  const { imageUrl, userId, manualTags } = await request.json();

  // If manual tags are provided, use them directly
  if (manualTags) {
    try {
      const supabase = await createClient();
      const { data: item, error } = await supabase
        .from("wardrobe_items")
        .insert({
          user_id: userId,
          image_url: imageUrl,
          ...manualTags,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ item, tagged: "manual" });
    } catch (err) {
      console.error("Upload error:", err);
      return NextResponse.json(
        { error: "Failed to save item" },
        { status: 500 },
      );
    }
  }

  // Try AI tagging
  const miniMaxKey = process.env.MINIMAX_API_KEY || "";
  let tags: TagResult | null = null;

  // Try MiniMax first (for image analysis)
  if (miniMaxKey && miniMaxKey !== "your-minimax-api-key-here") {
    tags = await analyzeWithMiniMax(imageUrl, miniMaxKey);
  }

  // Fall back to Claude Vision
  if (!tags) {
    tags = await analyzeWithClaude(imageUrl);
  }

  // Final fallback to basic tags (user can edit later)
  const finalTags = tags || FALLBACK_TAGS;

  try {
    const supabase = await createClient();
    const { data: item, error } = await supabase
      .from("wardrobe_items")
      .insert({
        user_id: userId,
        image_url: imageUrl,
        category: finalTags.category,
        subcategory: finalTags.subcategory,
        colors: finalTags.colors,
        pattern: finalTags.pattern,
        fabric: finalTags.fabric,
        occasions: finalTags.occasions,
        formality_score: finalTags.formality_score,
        season: finalTags.season,
        suggested_name: finalTags.suggested_name,
        style_notes: finalTags.style_notes,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      item,
      tagged: tags ? "ai" : "fallback",
      needsManualTagging: !tags,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Failed to save item" }, { status: 500 });
  }
}
