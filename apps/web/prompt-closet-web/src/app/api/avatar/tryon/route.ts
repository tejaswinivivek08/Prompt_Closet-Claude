import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MINIMAX_API_URL = "https://api.minimaxi.chat/v1/image_generation";

export async function POST(request: Request) {
  const { avatarUrl, outfitItemIds } = await request.json();
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

  if (!avatarUrl || !outfitItemIds?.length) {
    return NextResponse.json(
      { error: "Avatar and outfit items are required" },
      { status: 400 },
    );
  }

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

  const prompt = itemDescriptions
    ? `Fashion model wearing ${itemDescriptions}, full body, neutral studio background, high quality fashion photography, editorial style, detailed fabric texture`
    : `Fashion model wearing stylish outfit, full body, neutral background, high quality fashion photography`;

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
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from("try_on_results").insert({
        user_id: userId,
        avatar_url: avatarUrl,
        outfit_item_ids: outfitItemIds,
        result_image_url: resultUrl,
      });
    }

    return NextResponse.json({ resultUrl });
  } catch (err) {
    console.error("Try-on error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
