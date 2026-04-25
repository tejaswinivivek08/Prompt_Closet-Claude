import { NextResponse } from "next/server";

const MINIMAX_API_URL = "https://api.minimaxi.chat/v1/images/txt2img";

export async function POST(request: Request) {
  const { avatarUrl, outfitItemIds } = await request.json();
  const miniMaxKey = process.env.MINIMAX_API_KEY || "";

  try {
    const res = await fetch(MINIMAX_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${miniMaxKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "image-01",
        prompt:
          "Fashion model wearing stylish outfit, full body, neutral background, high quality fashion photography",
      }),
    });

    const data = await res.json();
    // MiniMax returns base64 image in data.images[0]
    const base64Image = data.images?.[0];

    if (!base64Image) {
      return NextResponse.json({ resultUrl: null });
    }

    // Convert base64 to data URI for frontend display
    const resultUrl = `data:image/png;base64,${base64Image}`;

    return NextResponse.json({ resultUrl });
  } catch (err) {
    console.error("Try-on error:", err);
    return NextResponse.json({ resultUrl: null });
  }
}
