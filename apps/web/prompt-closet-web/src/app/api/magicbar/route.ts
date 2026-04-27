import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MINIMAX_API_URL = "https://api.minimaxi.chat/v1/text/chatcompletion_v2";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface WardrobeItem {
  id: string;
  image_url: string;
  category: string;
  colors: string[] | null;
  occasions: string[] | null;
  suggested_name: string | null;
  formality_score: number | null;
}

/**
 * Fallback text-based search when CLIP embedding is not configured.
 * Matches items by keyword overlap with the query.
 */
async function textSearchWardrobe(
  query: string,
  userId: string,
  supabase: any,
) {
  // Extract keywords from query (simple tokenization)
  const keywords = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w: string) => w.length > 2);

  // Fetch all active wardrobe items for the user
  const { data: items } = await supabase
    .from("wardrobe_items")
    .select(
      "id, image_url, category, colors, occasions, suggested_name, formality_score",
    )
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!items || items.length === 0) return [];

  // Score each item by keyword overlap
  const scored = items.map((item: WardrobeItem) => {
    const fields = [
      item.category,
      item.suggested_name || "",
      ...(item.occasions || []),
      ...(item.colors || []),
    ]
      .join(" ")
      .toLowerCase();

    const score = keywords.reduce((acc: number, kw: string) => {
      return acc + (fields.includes(kw) ? 1 : 0);
    }, 0);

    return { item, score };
  });

  // Return top 20 matched items sorted by score
  return scored
    .filter((s: { score: number }) => s.score > 0)
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, 20)
    .map((s: { item: WardrobeItem }) => ({ item_id: s.item.id }));
}

async function callMiniMaxLLM(query: string, items: any[], miniMaxKey: string) {
  // Try MiniMax first, fall back to Claude
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const itemList = items
    .map(
      (i: any) =>
        `- ID: ${i.id} | ${i.suggested_name || i.category} | Category: ${i.category} | Occasions: ${(i.occasions || []).join(", ") || "any"} | Formality: ${i.formality_score || 3}/5 | Colors: ${(i.colors || []).join(", ")}`,
    )
    .join("\n");

  const systemPrompt = `You are Prompt Closet's AI stylist. You create stylish outfit combinations from a user's wardrobe items. Always suggest complete, well-rounded outfits. For each outfit, choose items that work together in terms of color, formality, and occasion appropriateness. For Indian occasions (Diwali, wedding, festive), consider traditional elegance with appropriate coverage. For office/work, prefer structured, professional pieces. For casual/date, relaxed but intentional styling. Return ONLY a valid JSON array — no markdown, no explanation, no preamble. Schema per outfit: { "outfit_name": string, "item_ids": string[], "occasion_fit": string, "styling_tip": string (2 sentences max), "confidence": number (0.0-1.0), "weather_context": string (e.g. "32°C, Humid — Singapore") }`;

  const userPrompt = `User request: ${query}\n\nAvailable wardrobe items:\n${itemList}\n\nReturn a JSON array with 2-3 outfits. Each outfit must use item IDs that appear in the list above.`;

  // Try MiniMax if configured
  if (miniMaxKey && miniMaxKey !== "your-minimax-api-key-here") {
    try {
      const res = await fetch(MINIMAX_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${miniMaxKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "MiniMax-Text-01",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "[]";
        const match = content.match(/\[[\s\S]*?\]/);
        if (match) {
          const outfits = JSON.parse(match[0]);
          return outfits.map((outfit: any, idx: number) => ({
            ...outfit,
            id: `outfit-${Date.now()}-${idx}`,
            outfit_name: outfit.outfit_name || "Styled Outfit",
            item_ids: Array.isArray(outfit.item_ids) ? outfit.item_ids : [],
            occasion_fit: outfit.occasion_fit || "General",
            styling_tip:
              outfit.styling_tip || "A great choice for the occasion.",
            confidence:
              typeof outfit.confidence === "number" ? outfit.confidence : 0.8,
            weather_context: outfit.weather_context || null,
          }));
        }
      }
    } catch (err) {
      console.log("MiniMax failed, falling back to Claude:", err);
    }
  }

  // Fall back to Claude
  if (!anthropicKey) {
    throw new Error(
      "No AI API key configured. Please add ANTHROPIC_API_KEY to enable AI styling.",
    );
  }

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
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text || "[]";

  const match = content.match(/\[[\s\S]*?\]/);
  if (!match) {
    throw new Error("Failed to parse AI response as JSON");
  }

  const outfits = JSON.parse(match[0]);
  return outfits.map((outfit: any, idx: number) => ({
    ...outfit,
    id: `outfit-${Date.now()}-${idx}`,
    outfit_name: outfit.outfit_name || "Styled Outfit",
    item_ids: Array.isArray(outfit.item_ids) ? outfit.item_ids : [],
    occasion_fit: outfit.occasion_fit || "General",
    styling_tip: outfit.styling_tip || "A great choice for the occasion.",
    confidence: typeof outfit.confidence === "number" ? outfit.confidence : 0.8,
    weather_context: outfit.weather_context || null,
  }));
}

export async function POST(request: Request) {
  const { query, userId } = await request.json();

  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json(
      { error: "User ID is required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const miniMaxKey = process.env.MINIMAX_API_KEY || "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY || "";
  const hfToken = process.env.EXPO_PUBLIC_HF_API_TOKEN || "";

  // Check if at least one AI provider is configured
  if (!miniMaxKey && !anthropicKey) {
    return NextResponse.json({
      error:
        "AI styling will be available soon — add a MiniMax or Anthropic API key to enable.",
    });
  }

  try {
    let matched: any[] = [];

    // Try CLIP embedding if HF token is available
    if (hfToken) {
      try {
        const hfRes = await fetch(
          "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${hfToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: query }),
          },
        );

        if (hfRes.ok) {
          const hfData = await hfRes.json();
          const embedding = hfData[0];

          if (embedding && embedding.length > 0) {
            const rpcRes = await supabase.rpc("match_wardrobe_items", {
              query_embedding: embedding,
              p_user_id: userId,
              match_threshold: 0.3,
              match_count: 20,
            });
            matched = rpcRes.data || [];
          }
        }
      } catch {
        // HF failed — fall through to text search
      }
    }

    // Text-based fallback if no HF embedding or RPC failed
    if (matched.length === 0) {
      matched = await textSearchWardrobe(query, userId, supabase);
    }

    // No matching items found
    if (matched.length === 0) {
      return NextResponse.json({
        error: "I couldn't find anything matching your request.",
      });
    }

    // Get full item details for matched items
    const itemIds = matched.map((m: any) => m.item_id);
    const { data: items } = await supabase
      .from("wardrobe_items")
      .select(
        "id, image_url, category, colors, occasions, suggested_name, formality_score",
      )
      .in("id", itemIds)
      .eq("is_active", true);

    if (!items || items.length === 0) {
      return NextResponse.json({
        error: "I couldn't find anything matching your request.",
      });
    }

    const outfits = await callMiniMaxLLM(query, items, miniMaxKey);
    return NextResponse.json({ outfits });
  } catch (err: any) {
    console.error("Magic bar error:", err);

    // Distinguish error types for friendly UX
    if (err.message.includes("MiniMax API error 401")) {
      return NextResponse.json({
        error:
          "AI styling will be available soon — add your MiniMax API key to enable.",
      });
    }

    if (err.message.includes("MiniMax API error")) {
      return NextResponse.json({
        error: "AI service is temporarily unavailable. Please try again.",
      });
    }

    return NextResponse.json({
      error: "Something went wrong. Try again.",
    });
  }
}
