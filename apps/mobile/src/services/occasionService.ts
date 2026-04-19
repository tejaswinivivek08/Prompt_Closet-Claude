/**
 * Occasion Detection Service
 * Parses calendar event text and returns detected occasion filters.
 */

export interface OccasionContext {
  detected: string | null; // "diwali" | "wedding" | "navratri" | "eid" | "temple" | "casual"
  query: string; // enhanced search query with occasion context
  formalityBoost: number; // 0-2 extra formality points
  culturalNotes: string[];
}

const INDIAN_OCCASION_KEYWORDS: Record<string, string[]> = {
  diwali: ["diwali", "deepavali", "festival of lights"],
  wedding: ["wedding", "marriage", "baarat", "mehndi", "sangeet", "reception"],
  navratri: ["navratri", "navratri", "garba", "dandiya", "durga puja"],
  eid: ["eid", "eid-ul-fitr", "eid-ul-adha", "ramzan", "bakrid"],
  temple: ["puja", "aarti", "temple", "prayer", "spiritual"],
  formal: ["meeting", "interview", "presentation", "conference", "office"],
  casual: ["brunch", "lunch", "outing", "hangout", "relaxed"],
  party: ["party", "club", "night out", "celebration"],
};

function detectOccasion(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [occasion, keywords] of Object.entries(INDIAN_OCCASION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return occasion;
    }
  }
  return null;
}

export function parseCalendarEvent(eventText: string | null): OccasionContext {
  if (!eventText) {
    return {
      detected: null,
      query: "",
      formalityBoost: 0,
      culturalNotes: [],
    };
  }

  const occasion = detectOccasion(eventText);

  const occasionMeta: Record<
    string,
    { query: string; formalityBoost: number; notes: string[] }
  > = {
    diwali: {
      query:
        "festive traditional elegant, rich colors gold red green, celebratory",
      formalityBoost: 2,
      notes: [
        "Consider saree, lehenga, or festive kurta",
        "Gold and traditional jewelry pair well",
      ],
    },
    wedding: {
      query:
        "wedding guest outfit, formal ethnic, vibrant colors, embellishments",
      formalityBoost: 2,
      notes: [
        "Navratri: garba outfit or traditional wear",
        "Avoid all-white or all-black",
      ],
    },
    navratri: {
      query:
        "navratri garba dandiya, colorful traditional, comfortable for dancing",
      formalityBoost: 1,
      notes: [
        "Bright colors preferred: red, yellow, green, orange",
        "Chaniya cholis, garba dresses work well",
      ],
    },
    eid: {
      query: "eid outfit, elegant traditional, modest, festive",
      formalityBoost: 1,
      notes: [
        "Curated suits, elegant kurtas, coord sets",
        "Pastel or white for Eid-ul-Fitr",
      ],
    },
    temple: {
      query: "temple visit, modest traditional, comfortable, respectful",
      formalityBoost: 1,
      notes: ["Cover shoulders and knees", "Simple traditional wear"],
    },
    formal: {
      query: "formal office meeting, professional, business attire",
      formalityBoost: 2,
      notes: [],
    },
    casual: {
      query: "casual comfortable, relaxed fit, everyday",
      formalityBoost: 0,
      notes: [],
    },
    party: {
      query: "party outfit, stylish, fashionable, statement piece",
      formalityBoost: 1,
      notes: [],
    },
  };

  if (!occasion) {
    return {
      detected: null,
      query: "",
      formalityBoost: 0,
      culturalNotes: [],
    };
  }

  const meta = occasionMeta[occasion] ?? occasionMeta.casual;

  return {
    detected: occasion,
    query: meta.query,
    formalityBoost: meta.formalityBoost,
    culturalNotes: meta.notes,
  };
}

/**
 * Detect Indian occasion from any text (calendar, user input, etc.)
 */
export function detectIndianOccasion(text: string): string | null {
  return detectOccasion(text);
}
