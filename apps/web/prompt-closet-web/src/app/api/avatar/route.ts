import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MINIMAX_API_URL = "https://api.minimaxi.chat/v1/images/txt2img";

export async function POST(request: Request) {
  const { imageData, userId, regenerate } = await request.json();
  const miniMaxKey = process.env.MINIMAX_API_KEY;

  if (!miniMaxKey) {
    return NextResponse.json(
      { error: "MINIMAX_NOT_CONFIGURED" },
      { status: 500 },
    );
  }

  // If regenerate=true and no imageData, try to use existing avatar image
  let promptImageUrl: string | null = null;
  if (regenerate && !imageData) {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("user_avatars")
      .select("avatar_url")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);
    if (existing?.[0]?.avatar_url) {
      promptImageUrl = existing[0].avatar_url;
    }
  }

  const prompt = promptImageUrl
    ? "Fashion illustration of a person, stylized fashion portrait, vibrant colors, studio lighting, high quality, digital fashion art, detailed illustration"
    : "Professional fashion model photography, full body shot, neutral background, fashion editorial style, high quality, stylized avatar";

  try {
    const requestBody: Record<string, unknown> = {
      model: "image-01",
      prompt,
    };

    // If we have an image URL (for regeneration), pass it
    if (promptImageUrl) {
      requestBody.image_urls = [promptImageUrl];
    } else if (imageData) {
      // Pass base64 image for new avatar
      requestBody.image_urls = [imageData];
    }

    const res = await fetch(MINIMAX_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${miniMaxKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("MiniMax API error:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to generate avatar" },
        { status: 500 },
      );
    }

    const data = await res.json();
    const avatarUrl = data.data?.[0]?.url;

    if (!avatarUrl) {
      return NextResponse.json(
        { error: "Failed to generate avatar" },
        { status: 500 },
      );
    }

    // Deactivate old avatars and save new one
    const supabase = await createClient();
    await supabase
      .from("user_avatars")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);

    const { data: newAvatar } = await supabase
      .from("user_avatars")
      .insert({
        user_id: userId,
        avatar_url: avatarUrl,
        style: "fashion_model",
        is_active: true,
      })
      .select("id")
      .single();

    return NextResponse.json({
      avatarUrl,
      avatarId: newAvatar?.id || null,
    });
  } catch (err) {
    console.error("Avatar generation error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
