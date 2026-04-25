import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const HF_API_URL =
  "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32";
const MINIMAX_API_URL = "https://api.minimaxi.chat/v1/text/chatcompletion_v2";

async function getCLIPEmbedding(
  text: string,
  hfToken: string,
): Promise<number[]> {
  const res = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hfToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: text }),
  });
  const data = await res.json();
  return data[0]; // 512-dim normalized vector
}

async function searchWardrobe(
  embedding: number[],
  userId: string,
  supabase: any,
) {
  const { data } = await supabase.rpc("match_wardrobe_items", {
    query_embedding: embedding,
    p_user_id: userId,
    match_threshold: 0.3,
    match_count: 20,
  });
  return data || [];
}

async function callMiniMaxLLM(query: string, items: any[], miniMaxKey: string) {
  const itemList = items
    .map(
      (i: any) =>
        `- ID: ${i.id} | ${i.suggested_name || i.category} | Occasions: ${(i.occasions || []).join(", ")} | Formality: ${i.formality_score || 3}/5`,
    )
    .join("\n");

  const res = await fetch(MINIMAX_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${miniMaxKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "MiniMax-Text-01",
      messages: [
        {
          role: "system",
          content:
            "You are Prompt Closet's AI stylist. You create outfit combinations from a user's wardrobe. Always suggest complete outfits (at minimum: top + bottom OR a dress). Consider the occasion, weather context, and cultural appropriateness. For Indian occasions, apply appropriate formality and coverage norms. Return ONLY a valid JSON array of outfit suggestions.",
        },
        {
          role: "user",
          content: `User request: ${query}\n\nAvailable wardrobe items:\n${itemList}\n\nReturn a JSON array with 2-3 outfits. Each outfit: { "outfit_name": string, "item_ids": string[], "occasion_fit": string, "styling_tip": string, "confidence": number }`,
        },
      ],
    }),
  });
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "[]";
  // Try to parse JSON from response
  const match = content.match(/\[[\s\S]*\]/);
  if (match) {
    return JSON.parse(match[0]);
  }
  return [];
}

export async function POST(request: Request) {
  const { query, userId } = await request.json();
  const supabase = await createClient();
  const miniMaxKey = process.env.MINIMAX_API_KEY || "";
  const hfToken = process.env.EXPO_PUBLIC_HF_API_TOKEN || "";

  try {
    const embedding = await getCLIPEmbedding(query, hfToken);
    const matched = await searchWardrobe(embedding, userId, supabase);

    // Get full item details
    const itemIds = matched.map((m: any) => m.item_id);
    const { data: items } = await supabase
      .from("wardrobe_items")
      .select(
        "id, image_url, category, colors, occasions, suggested_name, formality_score",
      )
      .in("id", itemIds)
      .eq("is_active", true);

    const outfits = await callMiniMaxLLM(query, items || [], miniMaxKey);
    return NextResponse.json({ outfits });
  } catch (err) {
    console.error("Magic bar error:", err);
    return NextResponse.json({ outfits: [] });
  }
}
