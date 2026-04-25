import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MINIMAX_API_URL = "https://api.minimaxi.chat/v1/images/txt2img";

export async function POST(request: Request) {
  const { avatarUrl, outfitItemIds } = await request.json();
  const miniMaxKey = process.env.MINIMAX_API_KEY;

  if (!miniMaxKey) {
    return NextResponse.json(
      { error: "MINIMAX_NOT_CONFIGURED" },
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
    .select("category, suggested_name")
    .in("id", outfitItemIds)
    .eq("is_active", true);

  const itemDescriptions = (outfitItems || [])
    .map((item) => item.suggested_name || item.category)
    .filter(Boolean)
    .join(", ");

  const prompt = itemDescriptions
    ? `Fashion model wearing ${itemDescriptions}, full body, neutral studio background, high quality fashion photography, editorial style`
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
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("MiniMax try-on API error:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to generate try-on" },
        { status: 500 },
      );
    }

    const data = await res.json();
    const resultUrl = data.data?.[0]?.url;

    return NextResponse.json({ resultUrl: resultUrl || null });
  } catch (err) {
    console.error("Try-on error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
