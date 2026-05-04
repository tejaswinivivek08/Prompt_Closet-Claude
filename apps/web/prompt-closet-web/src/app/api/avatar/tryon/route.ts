import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MINIMAX_API_URL = "https://api.minimaxi.chat/v1/image_generation";

const ETHICAL_GUIDELINES =
  "Create a respectful, dignified fashion illustration. Appropriate clothing coverage maintained at all times. No revealing or inappropriate content. Professional fashion photography style. Suitable for all audiences.";

export async function POST(request: Request) {
  const { avatarUrl, outfitItemIds, demoBlackLook } = await request.json();
  const miniMaxKey = process.env.MINIMAX_API_KEY;

  if (!miniMaxKey || miniMaxKey === "your-minimax-api-key-here") {
    return NextResponse.json(
      {
        error: "MINIMAX_NOT_CONFIGURED",
        message: "MiniMax API key not configured",
      },
      { status: 500 },
    );
  }

  if (!avatarUrl) {
    return NextResponse.json(
      { error: "Avatar URL is required" },
      { status: 400 },
    );
  }

  let prompt: string;

  if (demoBlackLook) {
    // Special demo prompt for the "Full Black Look" investor demo
    prompt = `${ETHICAL_GUIDELINES} Same Indian woman avatar wearing a classic black shirt and slim black trousers, full body view, white background, professional fashion photography, sleek monochrome outfit, high quality fashion editorial`;
  } else {
    // Fetch outfit item details to build a prompt
    const supabase = await createClient();
    const { data: outfitItems } = await supabase
      .from("wardrobe_items")
      .select("category, suggested_name, image_url")
      .in("id", outfitItemIds)
      .eq("is_active", true);

    const itemDescriptions = (outfitItems || [])
      .map((item) => item.suggested_name || item.category)
      .filter(Boolean)
      .join(", ");

    prompt = itemDescriptions
      ? `${ETHICAL_GUIDELINES} Fashion model wearing ${itemDescriptions}, full body, neutral studio background, high quality fashion photography, editorial style, detailed fabric texture`
      : `${ETHICAL_GUIDELINES} Fashion model wearing stylish outfit, full body, neutral background, high quality fashion photography`;
  }

  try {
    const res = await fetch(MINIMAX_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${miniMaxKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "image-01",
        prompt,
        image_urls: [avatarUrl],
        num_images: 1,
        aspect_ratio: "3:4",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("MiniMax try-on API error:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to generate try-on", details: errText },
        { status: 500 },
      );
    }

    const data = await res.json();
    const resultUrl = data.data?.image_urls?.[0];

    if (!resultUrl) {
      return NextResponse.json(
        { error: "Failed to generate try-on - no URL returned" },
        { status: 500 },
      );
    }

    // Save try-on result
    const supabase = await createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from("try_on_results").insert({
        user_id: userId,
        avatar_url: avatarUrl,
        outfit_item_ids: outfitItemIds || [],
        result_image_url: resultUrl,
      });
    }

    return NextResponse.json({ resultUrl });
  } catch (err) {
    console.error("Try-on error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
