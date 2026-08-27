import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface WardrobeItem {
  id: string;
  image_url: string;
  category: string;
  subcategory?: string | null;
  colors: string[] | null;
  occasions: string[] | null;
  suggested_name: string | null;
  season: string[] | null;
  pattern?: string | null;
  fabric?: string | null;
  style_notes?: string | null;
}

const SYSTEM_PROMPT = `You are the AI fashion intelligence engine and personal stylist for Prompt Closet, an AI-powered digital wardrobe.

Core philosophy: "You already have the wardrobe. I'll help you see its possibilities."

## Your Intelligence

You understand every wardrobe item deeply: category, sub-category, colour, pattern, fabric, style, fit, silhouette, length, season suitability, occasion suitability, whether it is standalone or a layering piece, and how it combines with other items.

Fashion logic you MUST follow:
- A dress is a dress — do NOT suggest wearing trousers underneath it
- A skirt should not be treated like trousers
- A blazer can be used as a layering piece
- Jewellery should complement, not overwhelm
- Shoes and bags are part of the complete look
- Never match items based only on category — evaluate colour theory, silhouette, proportion, occasion
- Never create technically possible but visually ridiculous combinations

## Query Types You Handle

1. ITEM SEARCH — "Show me all my black clothes" / "What dresses do I have?" / "Show me my bags"
   → Return response_type: "items" listing matching item IDs

2. OUTFIT/OCCASION — "Style me for a dinner date" / "What to wear to a wedding?" / "Office outfit"
   → Return response_type: "outfits" with 2–3 complete looks

3. STYLE SEARCH — "Give me quiet luxury" / "Something classy" / "Make me look sophisticated"
   → Return response_type: "outfits"

4. WEATHER/CONTEXT — "It's raining" / "Singapore weather" / "Very hot today"
   → Return response_type: "outfits" appropriate for weather

5. CONSTRAINT — "No heels" / "Use this blazer" / "Haven't worn recently" / "No jeans today"
   → Return response_type: "outfits" respecting constraints

## Colour Theory

Always evaluate: primary colour, contrast, complementary colours, tonal combinations, neutral balancing, warm/cool tones, prints vs solids.

Example: a printed dress with black and gold → suggest black heels + gold earrings + black clutch. Briefly explain the colour logic in styling_tip.

## Outfit Quality Rules

For every outfit ask: Does the category make sense? Does silhouette work? Do proportions work? Do colours work? Is the occasion appropriate? Is it realistically wearable? Are accessories intentional?

Generate complete looks with 2–5 items (clothing + shoes + bag + jewellery when available). Provide 2–3 different outfit options per query. Each look should feel intentional, not just random item combinations.

## Response Format

You MUST respond with ONLY a valid JSON object. No markdown, no explanation outside the JSON.

For item searches:
{
  "response_type": "items",
  "item_ids": ["id1", "id2", ...],
  "message": "Here are all your black items — tap any to view details."
}

For outfit suggestions:
{
  "response_type": "outfits",
  "outfits": [
    {
      "outfit_name": "Short evocative name",
      "item_ids": ["id1", "id2", "id3"],
      "occasion_fit": "dinner date",
      "styling_tip": "1-2 sentence explanation of WHY this works — colour logic, proportion, occasion. Make it sound like a real stylist.",
      "confidence": 0.85,
      "weather_context": null
    }
  ]
}

Rules:
- outfit_name: short, evocative (e.g. "The Gold Edit", "Power Brunch", "Quiet Luxury Monday")
- item_ids: use ONLY IDs from the wardrobe provided — never invent IDs
- confidence: 0.5–1.0 based on how well items match the query
- weather_context: null or short string like "Light layers for Singapore heat"
- styling_tip: always explain the colour or proportion logic briefly — this is what makes you a GREAT stylist, not just a filter
- For item searches, item_ids should list all matching items
- If the wardrobe has no items that work for the query, explain honestly in the message field`;

async function callClaude(
  query: string,
  items: WardrobeItem[],
  styleContext: {
    name: string;
    tags: string[];
    notes: string | null;
    item_ids: string[];
  } | null,
): Promise<any | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.log(
      "[magicbar] ANTHROPIC_API_KEY not set — using keyword fallback",
    );
    return null;
  }
  console.log(
    `[magicbar] Calling Claude with ${items.length} wardrobe items for query: "${query}"`,
  );

  // Build compact wardrobe catalog for Claude
  const catalog = items
    .map((i) => {
      const parts = [
        `ID:${i.id}`,
        `Name:${i.suggested_name || i.category}`,
        `Cat:${i.category}${i.subcategory ? `/${i.subcategory}` : ""}`,
        `Colors:${(i.colors || []).join(",")}`,
        `Occasions:${(i.occasions || []).join(",")}`,
        `Season:${(i.season || []).join(",")}`,
        i.pattern ? `Pattern:${i.pattern}` : "",
        i.fabric ? `Fabric:${i.fabric}` : "",
        i.style_notes ? `Notes:${i.style_notes.slice(0, 80)}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      return parts;
    })
    .join("\n");

  const styleContextBlock = styleContext
    ? `\n\nUser's saved style preset: "${styleContext.name}"
Tags: ${styleContext.tags.join(", ")}${styleContext.notes ? `\nStyling notes: ${styleContext.notes}` : ""}
Preferred item IDs from this preset: ${styleContext.item_ids.join(", ")}
When generating outfits, prefer and prioritise items from this preset where possible. Match the mood and tags of this saved look.`
    : "";

  const userMessage = `User query: "${query}"${styleContextBlock}

My wardrobe (${items.length} items):
${catalog}

Respond with ONLY the JSON object. Use only IDs from the wardrobe above.`;

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
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(
        `[magicbar] Claude API error: status=${res.status} body=${body}`,
      );
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) {
      console.error("[magicbar] Claude returned empty content");
      return null;
    }

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error(
        "[magicbar] Claude response had no JSON object:",
        text.slice(0, 200),
      );
      return null;
    }

    const parsed = JSON.parse(match[0]);
    console.log(
      `[magicbar] Claude responded: response_type=${parsed.response_type} outfits=${parsed.outfits?.length ?? 0} items=${parsed.item_ids?.length ?? 0}`,
    );
    return parsed;
  } catch (err) {
    console.error("[magicbar] Claude call threw:", err);
    return null;
  }
}

// ── Keyword fallback ────────────────────────────────────────────────────────

const OCCASION_KEYWORDS: Record<string, string[]> = {
  casual: ["casual", "relaxed", "everyday", "home", "lounge", "weekend"],
  office: ["office", "work", "professional", "corporate", "meeting", "mba"],
  festive: ["festive", "diwali", "holi", "christmas", "eid", "celebration"],
  wedding: ["wedding", "marriage", "reception", "ceremony"],
  party: ["party", "nightout", "club", "evening", "birthday"],
  temple: ["temple", "religious", "puja", "spiritual"],
  beach: ["beach", "vacation", "swim", "summer holiday"],
  date: ["date", "romantic", "dinner date", "valentine"],
  sport: ["sport", "gym", "workout", "fitness", "yoga"],
  travel: ["travel", "airport", "trip", "holiday"],
  brunch: ["brunch", "lunch", "sunday brunch"],
  dinner: ["dinner", "fine dining", "restaurant"],
};

const COLOR_KEYWORDS: Record<string, string[]> = {
  red: ["red", "maroon", "crimson"],
  blue: ["blue", "navy", "indigo", "denim"],
  green: ["green", "olive", "emerald"],
  yellow: ["yellow", "gold", "mustard"],
  pink: ["pink", "rose", "blush"],
  purple: ["purple", "violet", "lavender"],
  orange: ["orange", "peach", "coral", "rust"],
  white: ["white", "cream", "ivory"],
  black: ["black", "charcoal"],
  brown: ["brown", "tan", "beige", "caramel"],
  grey: ["grey", "gray", "slate"],
};

function keywordFallback(
  query: string,
  items: WardrobeItem[],
): { type: "items" | "outfits"; items?: WardrobeItem[]; outfits?: any[] } {
  const q = query.toLowerCase();

  // Item search: "show me all my X clothes/items/dresses"
  const isItemSearch =
    /show me|what.*have|all my|display|list/.test(q) &&
    !/outfit|style me|what (should|can) i wear/.test(q);

  if (isItemSearch) {
    // Color filter — check hex codes AND item name/notes (colors in DB are stored as hex)
    const HEX_BY_COLOR: Record<string, string[]> = {
      black: ["#000000", "#1c1c1c", "#0a0a0a", "#222"],
      white: ["#ffffff", "#fff", "#fafafa", "#f5f5f5"],
      red: ["#cc0000", "#ff0000", "#dc143c", "#b22222"],
      blue: ["#0000ff", "#3b5998", "#000080", "#1e3a8a"],
      green: ["#008000", "#2e7d32", "#228b22"],
      yellow: ["#ffff00", "#ffd700", "#f5c518"],
      pink: ["#ffb6c1", "#ff69b4", "#ffc0cb"],
      purple: ["#800080", "#8b008b", "#dda0dd"],
      orange: ["#b7410e", "#ff6347", "#ff8c00", "#ffa500"],
      brown: ["#a52a2a", "#8b4513", "#d2691e"],
      grey: ["#808080", "#708090", "#c0c0c0", "#a9a9a9"],
      gold: ["#ffd700", "#c5a028", "#daa520"],
      peach: ["#ffcba4", "#ffdbac", "#ffdab9"],
    };

    for (const [color, kws] of Object.entries(COLOR_KEYWORDS)) {
      if (kws.some((kw) => q.includes(kw))) {
        const hexCodes = HEX_BY_COLOR[color] || [];
        const colorItems = items.filter((i) => {
          // Match by hex code
          const hexMatch = (i.colors || []).some((c) =>
            hexCodes.some((hex) => c.toLowerCase().startsWith(hex)),
          );
          // Match by item name or notes containing the color word
          const nameMatch = kws.some(
            (kw) =>
              (i.suggested_name || "").toLowerCase().includes(kw) ||
              (i.style_notes || "").toLowerCase().includes(kw),
          );
          return hexMatch || nameMatch;
        });
        if (colorItems.length > 0) return { type: "items", items: colorItems };
      }
    }
    // Category filter
    const catMap: Record<string, string[]> = {
      dress: ["dress"],
      top: ["top", "shirt", "blouse", "kurti", "kurta"],
      bottom: ["bottom", "jeans", "trouser", "skirt", "pant"],
      bag: ["bag", "accessory"],
      watch: ["watch"],
      shoes: ["footwear", "shoes"],
      accessory: ["accessory", "jewellery", "earring", "ring", "necklace"],
    };
    for (const [label, cats] of Object.entries(catMap)) {
      if (q.includes(label) || cats.some((c) => q.includes(c))) {
        const catItems = items.filter((i) =>
          cats.some(
            (c) =>
              i.category.toLowerCase().includes(c) ||
              (i.subcategory || "").toLowerCase().includes(c),
          ),
        );
        if (catItems.length > 0) return { type: "items", items: catItems };
      }
    }
    return { type: "items", items: items.slice(0, 12) };
  }

  // Outfit search: match by occasion
  const matchedOccasions: string[] = [];
  for (const [occ, kws] of Object.entries(OCCASION_KEYWORDS)) {
    if (kws.some((kw) => q.includes(kw))) matchedOccasions.push(occ);
  }

  const scoredItems = items.map((item) => {
    let score = 0;
    if (
      matchedOccasions.length > 0 &&
      (item.occasions || []).some((o) =>
        matchedOccasions.includes(o.toLowerCase()),
      )
    )
      score += 10;
    return { item, score };
  });

  const sorted = scoredItems.sort((a, b) => b.score - a.score);
  // Only clothing items with a positive occasion score go into outfit pool.
  // Accessories (bags, watches, jewellery) are always available as accents.
  const matched = sorted.filter((s) => s.score > 0).map((s) => s.item);
  const accessories = items.filter((i) =>
    ["accessory", "footwear"].includes(i.category.toLowerCase()),
  );
  // If nothing matched the occasion, fall back to all clothing items
  const pool =
    matched.length >= 2
      ? matched
      : sorted
          .filter(
            (s) =>
              !["accessory", "footwear"].includes(
                s.item.category.toLowerCase(),
              ),
          )
          .slice(0, 10)
          .map((s) => s.item);

  const tops = pool.filter((i) =>
    ["top", "outerwear", "traditional"].includes(i.category.toLowerCase()),
  );
  const bottoms = pool.filter((i) => i.category.toLowerCase() === "bottom");
  const dresses = pool.filter((i) => i.category.toLowerCase() === "dress");

  const outfits: any[] = [];

  // Dress-only looks
  for (const d of dresses.slice(0, 2)) {
    const acc = accessories[outfits.length] || null;
    outfits.push({
      outfit_name: d.suggested_name || "Dress Look",
      item_ids: acc ? [d.id, acc.id] : [d.id],
      occasion_fit: matchedOccasions[0] || d.occasions?.[0] || "casual",
      styling_tip: `The ${d.suggested_name || "dress"} works beautifully on its own. ${acc ? `The ${acc.suggested_name || "accessory"} adds a finishing touch.` : "Complete with heels or flats depending on the vibe."}`,
      confidence: 0.78,
      weather_context: null,
    });
  }

  // Top + bottom combos
  for (const top of tops.slice(0, 2)) {
    for (const bottom of bottoms.slice(0, 1)) {
      const acc = accessories[outfits.length] || null;
      outfits.push({
        outfit_name: `${top.suggested_name?.split(" ").slice(0, 2).join(" ") || "Top"} & ${bottom.suggested_name?.split(" ").slice(0, 2).join(" ") || "Bottom"}`,
        item_ids: acc ? [top.id, bottom.id, acc.id] : [top.id, bottom.id],
        occasion_fit: matchedOccasions[0] || top.occasions?.[0] || "casual",
        styling_tip: `A balanced look pairing the ${top.suggested_name || top.category} with the ${bottom.suggested_name || bottom.category}. ${acc ? `The ${acc.suggested_name || "accessory"} ties the look together.` : "Add your favourite shoes to complete it."}`,
        confidence: 0.72,
        weather_context: null,
      });
      if (outfits.length >= 3) break;
    }
    if (outfits.length >= 3) break;
  }

  return { type: "outfits", outfits: outfits.slice(0, 3) };
}

async function getWardrobeItems(
  userId: string,
  supabase: any,
): Promise<WardrobeItem[]> {
  const { data } = await supabase
    .from("wardrobe_items")
    .select(
      "id, image_url, category, subcategory, colors, occasions, suggested_name, season, pattern, fabric, style_notes",
    )
    .eq("user_id", userId)
    .eq("is_active", true);
  return data || [];
}

export async function POST(request: Request) {
  const { query, userId, styleContext } = await request.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json(
      { error: "User ID is required." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const items = await getWardrobeItems(userId, supabase);

    if (items.length === 0) {
      return NextResponse.json({
        error:
          "Your wardrobe is empty. Add some items to your closet first, then ask me to style you!",
      });
    }

    // Try Claude first
    const claudeResult = await callClaude(query, items, styleContext ?? null);

    if (claudeResult) {
      if (claudeResult.response_type === "items") {
        const validIds = new Set(items.map((i) => i.id));
        const matchedIds = (claudeResult.item_ids || []).filter((id: string) =>
          validIds.has(id),
        );
        const matchedItems = matchedIds
          .map((id: string) => items.find((i) => i.id === id))
          .filter(Boolean);

        console.log(
          `[magicbar] Claude item search: ${matchedItems.length} items matched`,
        );
        return NextResponse.json({
          response_type: "items",
          source: "claude",
          items: matchedItems.map((i: WardrobeItem) => ({
            id: i.id,
            image_url: i.image_url,
            suggested_name: i.suggested_name,
            category: i.category,
            colors: i.colors,
            occasions: i.occasions,
          })),
          message:
            claudeResult.message || `Found ${matchedItems.length} items.`,
        });
      }

      if (
        claudeResult.response_type === "outfits" &&
        Array.isArray(claudeResult.outfits) &&
        claudeResult.outfits.length > 0
      ) {
        const validIds = new Set(items.map((i) => i.id));
        const outfitsWithPhotos = claudeResult.outfits
          .map((outfit: any) => {
            const validItemIds = (outfit.item_ids || []).filter((id: string) =>
              validIds.has(id),
            );
            if (validItemIds.length === 0) return null;
            return {
              id: crypto.randomUUID(),
              outfit_name: outfit.outfit_name || "Styled Look",
              item_ids: validItemIds,
              occasion_fit: outfit.occasion_fit || "casual",
              styling_tip:
                outfit.styling_tip || "A great combination from your wardrobe.",
              confidence: outfit.confidence || 0.8,
              weather_context: outfit.weather_context || null,
              items: validItemIds.map((id: string) => {
                const item = items.find((i) => i.id === id)!;
                return {
                  id: item.id,
                  image_url: item.image_url,
                  suggested_name: item.suggested_name,
                  category: item.category,
                };
              }),
            };
          })
          .filter(Boolean);

        if (outfitsWithPhotos.length > 0) {
          console.log(
            `[magicbar] Claude outfit suggestions: ${outfitsWithPhotos.length} outfits`,
          );
          return NextResponse.json({
            outfits: outfitsWithPhotos,
            source: "claude",
          });
        }
      }
    }

    // Fallback to keyword search
    console.log("[magicbar] Falling back to keyword search");
    const fallback = keywordFallback(query, items);

    if (fallback.type === "items") {
      return NextResponse.json({
        response_type: "items",
        source: "fallback",
        items: (fallback.items || []).map((i) => ({
          id: i.id,
          image_url: i.image_url,
          suggested_name: i.suggested_name,
          category: i.category,
          colors: i.colors,
          occasions: i.occasions,
        })),
        message: `Showing matching items from your wardrobe.`,
      });
    }

    const outfits = fallback.outfits || [];
    if (outfits.length === 0) {
      return NextResponse.json({
        error:
          "I couldn't find a great match for that. Try rephrasing or add more items to your wardrobe.",
      });
    }

    const outfitsWithPhotos = outfits.map((o: any) => ({
      id: crypto.randomUUID(),
      ...o,
      items: (o.item_ids || [])
        .map((id: string) => {
          const item = items.find((i) => i.id === id);
          return item
            ? {
                id: item.id,
                image_url: item.image_url,
                suggested_name: item.suggested_name,
                category: item.category,
              }
            : null;
        })
        .filter(Boolean),
    }));

    return NextResponse.json({
      outfits: outfitsWithPhotos,
      source: "fallback",
    });
  } catch (err) {
    console.error("[magicbar] Unhandled error:", err);
    return NextResponse.json({ error: "Something went wrong. Try again." });
  }
}
