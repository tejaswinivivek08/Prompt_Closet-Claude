import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MINIMAX_API_URL = "https://api.minimaxi.chat/v1/images/txt2img";

export async function POST(request: Request) {
  const { imageData, userId } = await request.json();
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
          "Professional fashion model photography, full body shot, neutral background, fashion editorial style, high quality, stylized avatar",
      }),
    });

    const data = await res.json();
    // MiniMax returns base64 image in data.images[0]
    const base64Image = data.images?.[0];

    if (!base64Image) {
      return NextResponse.json(
        { error: "Failed to generate avatar" },
        { status: 500 },
      );
    }

    // Convert base64 to data URI for frontend display
    const avatarUrl = `data:image/png;base64,${base64Image}`;

    // Save avatar to Supabase
    const supabase = await createClient();
    await supabase.from("user_avatars").insert({
      user_id: userId,
      avatar_url: avatarUrl,
      style: "fashion_model",
      is_active: true,
    });

    return NextResponse.json({ avatarUrl });
  } catch (err) {
    console.error("Avatar generation error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
