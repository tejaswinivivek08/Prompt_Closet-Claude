import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface WardrobeItem {
  id: string;
  image_url: string;
  category: string;
  colors: string[] | null;
  occasions: string[] | null;
  suggested_name: string | null;
  formality_score: number | null;
  season: string[] | null;
  style_notes?: string | null;
}

// Occasion keyword mapping
const OCCASION_KEYWORDS: Record<string, string[]> = {
  casual: ["casual", "relaxed", "everyday", "home", "lounge"],
  office: ["office", "work", "professional", "formal office", "corporate"],
  festive: [
    "festive",
    "celebration",
    "party",
    "diwali",
    "holi",
    "christmas",
    "eid",
  ],
  wedding: ["wedding", "marriage", "reception", "ceremony", "bride", "groom"],
  party: ["party", "nightout", "club", "evening", "celebration"],
  temple: ["temple", "religious", "puja", "spiritual"],
  beach: ["beach", "vacation", "swim", "summer"],
  date: ["date", "romantic", "dinner", "valentine"],
  sport: ["sport", "gym", "workout", "fitness", "yoga"],
};

// Season keyword mapping
const SEASON_KEYWORDS: Record<string, string[]> = {
  summer: ["summer", "hot", "humid", "sweat", "light"],
  winter: ["winter", "cold", "warm", "sweater", "jacket"],
  monsoon: ["monsoon", "rain", "wet", "umbrella"],
};

// Formality keywords
const FORMALITY_HIGH = [
  "formal",
  "office",
  "professional",
  "diplomatic",
  "interview",
];
const FORMALITY_MID = ["smart", "semiformal", "date", "party"];
const FORMALITY_LOW = ["casual", "relaxed", "lounge", "beach"];

// Color keyword mapping
const COLOR_KEYWORDS: Record<string, string[]> = {
  red: ["red", "maroon", "crimson", "scarlet"],
  blue: ["blue", "navy", "indigo", "denim"],
  green: ["green", "olive", "emerald", "sage"],
  yellow: ["yellow", "gold", "mustard", "ochre"],
  pink: ["pink", "rose", "magenta", "fuscia"],
  purple: ["purple", "violet", "lavender", "plum"],
  orange: ["orange", "peach", "coral", "apricot"],
  white: ["white", "cream", "ivory", "off-white"],
  black: ["black", "charcoal", "dark"],
  brown: ["brown", "tan", "beige", "caramel", "chocolate"],
};

// Demo look detection — special "Full Black Look" for investor demo
const DEMO_LOOK_KEYWORDS = [
  "full black",
  "all black",
  "black look",
  "black outfit",
  "monochrome",
  "all black outfit",
  "full black outfit",
];

function isDemoLookQuery(query: string): boolean {
  const q = query.toLowerCase();
  return DEMO_LOOK_KEYWORDS.some((kw) => q.includes(kw));
}

interface ParsedQuery {
  occasions: string[];
  colors: string[];
  seasons: string[];
  formality: "high" | "mid" | "low" | null;
  searchTerms: string[];
}

/**
 * Parse user query to extract structured filters
 */
function parseQuery(query: string): ParsedQuery {
  const q = query.toLowerCase();
  const words = q.split(/\s+/);

  const occasions: string[] = [];
  const colors: string[] = [];
  const seasons: string[] = [];
  let formality: "high" | "mid" | "low" | null = null;
  const searchTerms: string[] = [];

  // Match occasion keywords
  for (const [occasion, keywords] of Object.entries(OCCASION_KEYWORDS)) {
    if (keywords.some((kw) => q.includes(kw))) {
      occasions.push(occasion);
    }
  }

  // Match season keywords
  for (const [season, keywords] of Object.entries(SEASON_KEYWORDS)) {
    if (keywords.some((kw) => q.includes(kw))) {
      seasons.push(season);
    }
  }

  // Match color keywords
  for (const [color, keywords] of Object.entries(COLOR_KEYWORDS)) {
    if (keywords.some((kw) => q.includes(kw))) {
      colors.push(color);
    }
  }

  // Match formality level
  if (FORMALITY_HIGH.some((kw) => q.includes(kw))) {
    formality = "high";
  } else if (FORMALITY_MID.some((kw) => q.includes(kw))) {
    formality = "mid";
  } else if (FORMALITY_LOW.some((kw) => q.includes(kw))) {
    formality = "low";
  }

  // Add remaining significant words as search terms
  const skipWords = [
    ...Object.values(OCCASION_KEYWORDS).flat(),
    ...Object.values(SEASON_KEYWORDS).flat(),
    ...Object.values(COLOR_KEYWORDS).flat(),
    ...FORMALITY_HIGH,
    ...FORMALITY_MID,
    ...FORMALITY_LOW,
  ];
  for (const word of words) {
    if (
      word.length > 2 &&
      !skipWords.includes(word) &&
      ![
        "outfit",
        "wear",
        "dress",
        "clothes",
        "matching",
        "suggest",
        "show",
        "find",
        "get",
        "me",
        "for",
        "the",
        "a",
        "an",
        "with",
        "and",
        "combo",
        "look",
      ].includes(word)
    ) {
      searchTerms.push(word);
    }
  }

  return { occasions, colors, seasons, formality, searchTerms };
}

/**
 * Score item relevance to query
 */
function scoreItem(item: WardrobeItem, parsed: ParsedQuery): number {
  let score = 0;

  // Occasion match (highest weight)
  if (parsed.occasions.length > 0 && item.occasions) {
    const occasionMatch = item.occasions.some((o) =>
      parsed.occasions.includes(o.toLowerCase()),
    );
    if (occasionMatch) score += 10;
  }

  // Season match
  if (parsed.seasons.length > 0 && item.season) {
    const seasonMatch = item.season.some((s) =>
      parsed.seasons.includes(s.toLowerCase()),
    );
    if (seasonMatch) score += 5;
  }

  // Color match
  if (parsed.colors.length > 0 && item.colors) {
    const colorMatch = item.colors.some((c) =>
      parsed.colors.includes(c.toLowerCase()),
    );
    if (colorMatch) score += 8;
  }

  // Formality match
  if (parsed.formality && item.formality_score) {
    const itemFormality = item.formality_score;
    if (parsed.formality === "high" && itemFormality >= 4) score += 6;
    else if (
      parsed.formality === "mid" &&
      itemFormality >= 2 &&
      itemFormality <= 4
    )
      score += 6;
    else if (parsed.formality === "low" && itemFormality <= 3) score += 6;
  }

  // Search term match
  for (const term of parsed.searchTerms) {
    const itemText =
      `${item.category} ${item.suggested_name || ""} ${(item.occasions || []).join(" ")} ${(item.colors || []).join(" ")}`.toLowerCase();
    if (itemText.includes(term)) score += 2;
  }

  return score;
}

/**
 * Build outfit combinations from items
 * Returns top + bottom + optional accessory combinations
 */
function buildOutfits(items: WardrobeItem[], parsed: ParsedQuery): any[] {
  const tops = items.filter((i) =>
    ["top", "dress", "outerwear", "traditional"].includes(
      i.category.toLowerCase(),
    ),
  );
  const bottoms = items.filter((i) =>
    ["bottom"].includes(i.category.toLowerCase()),
  );
  const accessories = items.filter((i) =>
    ["accessory", "footwear"].includes(i.category.toLowerCase()),
  );

  const outfits: any[] = [];

  // Build outfits with top + bottom
  for (const top of tops.slice(0, 5)) {
    for (const bottom of bottoms.slice(0, 5)) {
      // Check color compatibility (simple complementary check)
      const outfit = {
        item_ids: [top.id, bottom.id],
        occasion_fit: parsed.occasions[0] || top.occasions?.[0] || "casual",
        outfit_name: `${top.suggested_name || top.category} + ${bottom.suggested_name || bottom.category}`,
      };
      outfits.push(outfit);
    }
  }

  // Add dress-only outfits
  const dresses = items.filter((i) => i.category.toLowerCase() === "dress");
  for (const dress of dresses.slice(0, 5)) {
    outfits.push({
      item_ids: [dress.id],
      occasion_fit: parsed.occasions[0] || dress.occasions?.[0] || "casual",
      outfit_name: dress.suggested_name || dress.category,
    });
  }

  // Add accessory combos
  for (const acc of accessories.slice(0, 3)) {
    if (outfits.length > 0) {
      outfits[0].item_ids.push(acc.id);
      outfits[0].outfit_name += ` + ${acc.suggested_name || acc.category}`;
    }
  }

  // Return top 6 outfits
  return outfits.slice(0, 6);
}

/**
 * Build all-black outfit for demo query
 */
function buildBlackLookOutfit(items: WardrobeItem[]): any[] {
  // Find black tops and black bottoms
  const blackTops = items.filter((i) => {
    if (
      !["top", "shirt", "blouse", "tshirt"].includes(i.category.toLowerCase())
    )
      return false;
    const colors = (i.colors || []).map((c) => c.toLowerCase());
    return colors.some(
      (c) =>
        c.includes("black") || c.includes("#000000") || c.includes("charcoal"),
    );
  });

  const blackBottoms = items.filter((i) => {
    if (
      !["bottom", "trousers", "pants", "jeans"].includes(
        i.category.toLowerCase(),
      )
    )
      return false;
    const colors = (i.colors || []).map((c) => c.toLowerCase());
    return colors.some(
      (c) =>
        c.includes("black") || c.includes("#000000") || c.includes("charcoal"),
    );
  });

  const blackAccessories = items.filter((i) => {
    const colors = (i.colors || []).map((c) => c.toLowerCase());
    return (
      ["accessory", "footwear"].includes(i.category.toLowerCase()) &&
      colors.some(
        (c) =>
          c.includes("black") ||
          c.includes("#000000") ||
          c.includes("charcoal"),
      )
    );
  });

  // Try to build a black top + black bottom combo
  if (blackTops.length > 0 && blackBottoms.length > 0) {
    const outfit: any = {
      item_ids: [blackTops[0].id, blackBottoms[0].id],
      occasion_fit: "party",
      outfit_name: "The All-Black Edit",
      styling_tip:
        "A monochrome black look — sleek, powerful, and effortlessly chic. Perfect for evening events or making a bold statement.",
      confidence: 0.98,
      occasion_fit_display: "Evening · Party · Date",
    };

    // Add a black accessory if available
    if (blackAccessories.length > 0) {
      outfit.item_ids.push(blackAccessories[0].id);
      outfit.outfit_name = "The All-Black Edit + Accessory";
    }

    return [outfit];
  }

  // Fallback: any black items
  const allBlack = items.filter((i) => {
    const colors = (i.colors || []).map((c) => c.toLowerCase());
    return colors.some(
      (c) =>
        c.includes("black") || c.includes("#000000") || c.includes("charcoal"),
    );
  });

  if (allBlack.length > 0) {
    return [
      {
        item_ids: allBlack.slice(0, 3).map((i) => i.id),
        occasion_fit: "party",
        outfit_name: "The All-Black Edit",
        styling_tip:
          "A monochrome black look — sleek, powerful, and effortlessly chic. Perfect for evening events or making a bold statement.",
        confidence: 0.85,
        occasion_fit_display: "Evening · Party · Date",
      },
    ];
  }

  return [];
}

/**
 * Generate styling tip based on outfit and query
 */
function generateStylingTip(
  outfit: any,
  items: WardrobeItem[],
  parsed: ParsedQuery,
): string {
  const outfitItems = items.filter((i) => outfit.item_ids.includes(i.id));
  const mainItem = outfitItems[0];
  const occasion = parsed.occasions[0] || outfit.occasion_fit || "casual";

  if (outfitItems.length === 1) {
    return `This ${mainItem?.category || "piece"} is perfect for ${occasion}. ${mainItem?.style_notes || "Style it with matching accessories."}`;
  }

  const itemNames = outfitItems
    .map((i) => i.suggested_name || i.category)
    .join(" and ");
  const occasionTip =
    occasion === "festive"
      ? "Add traditional jewelry to elevate this look"
      : occasion === "office"
        ? "Pair with formal footwear for a polished look"
        : occasion === "casual"
          ? "Add sneakers or flats for a relaxed vibe"
          : "Complete with matching accessories";

  return `This ${itemNames} combination works great for ${occasion}. ${occasionTip}.`;
}

/**
 * Fetch all wardrobe items for user
 */
async function getWardrobeItems(
  userId: string,
  supabase: any,
): Promise<WardrobeItem[]> {
  const { data } = await supabase
    .from("wardrobe_items")
    .select(
      "id, image_url, category, colors, occasions, suggested_name, formality_score, season",
    )
    .eq("user_id", userId)
    .eq("is_active", true);
  return data || [];
}

/**
 * Try to enhance outfit explanations with LLM
 */
async function enhanceWithLLM(
  outfits: any[],
  items: WardrobeItem[],
  query: string,
): Promise<any[]> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const miniMaxKey = process.env.MINIMAX_API_KEY;

  // Check if we have a working LLM
  if (!anthropicKey && !miniMaxKey) {
    return outfits.map((o) => ({
      ...o,
      styling_tip: o.styling_tip || "A great outfit combination for you!",
      confidence: 0.7,
      weather_context: null,
      enhanced: false,
    }));
  }

  // Try Claude if available
  if (anthropicKey) {
    try {
      const itemList = items
        .map(
          (i) => `${i.id}: ${i.suggested_name || i.category} (${i.category})`,
        )
        .join(", ");
      const res = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: `You are Prompt Closet's AI stylist. Return ONLY a JSON array of tips, one per outfit. Schema: { "styling_tip": string (1-2 sentences), "confidence": number (0.5-1.0) }`,
          messages: [
            {
              role: "user",
              content: `Query: ${query}\n\nOutfit indices (0-${outfits.length - 1}):\n${outfits.map((o, i) => `${i}: ${o.outfit_name}`).join("\n")}\n\nReturn JSON array of ${outfits.length} tips.`,
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.content?.[0]?.text;
        if (content) {
          const match = content.match(/\[[\s\S]*?\]/);
          if (match) {
            const tips = JSON.parse(match[0]);
            return outfits.map((o, i) => ({
              ...o,
              styling_tip: tips[i]?.styling_tip || o.styling_tip,
              confidence: tips[i]?.confidence || 0.8,
              weather_context: null,
              enhanced: true,
            }));
          }
        }
      }
    } catch (err) {
      console.log("Claude enhancement failed:", err);
    }
  }

  // Return with basic tips if LLM failed
  return outfits.map((o) => ({
    ...o,
    styling_tip: o.styling_tip || "A great outfit combination for you!",
    confidence: 0.7,
    weather_context: null,
    enhanced: false,
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

  try {
    const supabase = await createClient();

    // Fetch all wardrobe items
    const items = await getWardrobeItems(userId, supabase);

    if (items.length === 0) {
      return NextResponse.json({
        error:
          "Your wardrobe is empty. Add some items first to get outfit suggestions!",
      });
    }

    // Check for demo look query first
    if (isDemoLookQuery(query)) {
      const blackOutfits = buildBlackLookOutfit(items);
      if (blackOutfits.length > 0) {
        const outfitsWithPhotos = blackOutfits.map((outfit) => ({
          ...outfit,
          items: items
            .filter((i) => outfit.item_ids.includes(i.id))
            .map((i) => ({
              id: i.id,
              image_url: i.image_url,
              suggested_name: i.suggested_name,
              category: i.category,
            })),
        }));

        return NextResponse.json({
          outfits: outfitsWithPhotos,
          usingKeywordSearch: true,
          isDemoLook: true,
          parsed: {
            occasions: [],
            colors: ["black"],
            seasons: [],
            formality: null,
          },
        });
      }
    }

    // Parse the query
    const parsed = parseQuery(query);

    // Score and filter items
    const scoredItems = items.map((item) => ({
      item,
      score: scoreItem(item, parsed),
    }));

    // Sort by score and take top matches
    const matchedItems = scoredItems
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((s) => s.item);

    // If no keyword matches, use all items (broad search)
    const itemsToUse =
      matchedItems.length > 0 ? matchedItems : items.slice(0, 20);

    // Build outfit combinations
    let outfits = buildOutfits(itemsToUse, parsed);

    // If still no outfits, try pairing any top with any bottom
    if (outfits.length === 0) {
      const anyTops = items
        .filter((i) =>
          ["top", "dress", "traditional", "outerwear"].includes(
            i.category.toLowerCase(),
          ),
        )
        .slice(0, 3);
      const anyBottoms = items
        .filter((i) => i.category.toLowerCase() === "bottom")
        .slice(0, 3);

      for (const top of anyTops) {
        for (const bottom of anyBottoms) {
          outfits.push({
            item_ids: [top.id, bottom.id],
            occasion_fit: parsed.occasions[0] || "casual",
            outfit_name: `${top.suggested_name || top.category} + ${bottom.suggested_name || bottom.category}`,
          });
        }
      }
    }

    // If STILL no outfits, just return single items as "looks"
    if (outfits.length === 0) {
      for (const item of items.slice(0, 6)) {
        outfits.push({
          item_ids: [item.id],
          occasion_fit: item.occasions?.[0] || "casual",
          outfit_name: item.suggested_name || item.category,
        });
      }
    }

    // Generate styling tips
    const outfitsWithTips = outfits.map((o) => ({
      ...o,
      styling_tip: generateStylingTip(o, items, parsed),
      confidence: 0.75,
      weather_context: null,
    }));

    // Try to enhance with LLM (best effort)
    const enhancedOutfits = await enhanceWithLLM(outfitsWithTips, items, query);

    // Attach full item data for photos
    const outfitsWithPhotos = enhancedOutfits.map((outfit) => ({
      ...outfit,
      items: items
        .filter((i) => outfit.item_ids.includes(i.id))
        .map((i) => ({
          id: i.id,
          image_url: i.image_url,
          suggested_name: i.suggested_name,
          category: i.category,
        })),
    }));

    return NextResponse.json({
      outfits: outfitsWithPhotos,
      usingKeywordSearch: true,
      parsed: {
        occasions: parsed.occasions,
        colors: parsed.colors,
        seasons: parsed.seasons,
        formality: parsed.formality,
      },
    });
  } catch (err) {
    console.error("Magic bar error:", err);
    return NextResponse.json({
      error: "Something went wrong. Try again.",
    });
  }
}
