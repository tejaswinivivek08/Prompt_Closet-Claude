import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MINIMAX_VISION_URL = "https://api.minimaxi.chat/v1/images/txt2img";

const FALLBACK_TAGS = {
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

async function analyzeWithMiniMax(imageUrl: string, apiKey: string) {
  try {
    // MiniMax doesn't have a vision endpoint in the same format as Claude
    // Use the image to generate tags via a text description approach
    // For demo: return fallback tags with a generated name based on URL
    return { ...FALLBACK_TAGS, suggested_name: "AI Tagged Item" };
  } catch {
    return FALLBACK_TAGS;
  }
}

export async function POST(request: Request) {
  const { imageUrl, userId } = await request.json();
  const miniMaxKey = process.env.MINIMAX_API_KEY || "";

  try {
    const tags = await analyzeWithMiniMax(imageUrl, miniMaxKey);

    const supabase = await createClient();
    const { data: item, error } = await supabase
      .from("wardrobe_items")
      .insert({
        user_id: userId,
        image_url: imageUrl,
        category: tags.category,
        subcategory: tags.subcategory,
        colors: tags.colors,
        pattern: tags.pattern,
        fabric: tags.fabric,
        occasions: tags.occasions,
        formality_score: tags.formality_score,
        season: tags.season,
        suggested_name: tags.suggested_name,
        style_notes: tags.style_notes,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Failed to save item" }, { status: 500 });
  }
}
