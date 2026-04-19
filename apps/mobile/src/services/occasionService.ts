/**
 * Indian Occasion Logic Service
 *
 * Dedicated occasion profiles for Tamil Wedding, Punjabi Wedding, Diwali,
 * Navratri, Temple, and Eid with saree draping, dupatta pairing,
 * and regional formality codes.
 *
 * Reference: specs/indian-occasion-logic.md
 */

export interface OccasionContext {
  detected: string | null;
  query: string;
  formalityBoost: number;
  culturalNotes: string[];
  sareeDrapingTip?: string;
  dupattaTip?: string;
  colorsToWear?: string[];
  colorsToAvoid?: string[];
  regionHint?: string;
}

// ============================================================
// KEYWORD DETECTION
// ============================================================

const INDIAN_OCCASION_KEYWORDS: Record<string, string[]> = {
  tamil_wedding: [
    "tamil wedding",
    "brahmin wedding",
    "south indian wedding",
    "kanjeevaram",
  ],
  punjabi_wedding: ["punjabi wedding", "sikh wedding", "batwana", "lagge"],
  diwali: ["diwali", "deepavali", "festival of lights"],
  navratri: ["navratri", "navratri", "garba", "dandiya", "durga puja"],
  eid: [
    "eid",
    "eid-ul-fitr",
    "eid-ul-adha",
    "ramzan",
    "bakrid",
    "eid celebration",
  ],
  temple: ["temple", "puja", "aarti", "prayer", "spiritual", "darshan"],
  holi: ["holi", "festival of colors"],
  casual: ["brunch", "lunch", "outing", "hangout", "relaxed"],
  party: ["party", "club", "night out", "celebration"],
  formal: ["meeting", "interview", "presentation", "conference", "office"],
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

// ============================================================
// REGIONAL CONTEXT
// ============================================================

export type Region = "tamil" | "punjabi" | "north_indian" | "generic";

export function detectRegion(text: string): Region {
  const lower = text.toLowerCase();
  if (
    lower.includes("tamil") ||
    lower.includes("chennai") ||
    lower.includes("south indian") ||
    lower.includes("brahmin")
  )
    return "tamil";
  if (
    lower.includes("punjabi") ||
    lower.includes("sikh") ||
    lower.includes("amritsar") ||
    lower.includes("delhi punjabi")
  )
    return "punjabi";
  if (
    lower.includes("north") ||
    lower.includes("delhi") ||
    lower.includes("mumbai") ||
    lower.includes("gujarati")
  )
    return "north_indian";
  return "generic";
}

// ============================================================
// NAVRATRI — PER-DAY COLOR LOGIC
// ============================================================

export interface NavratriDay {
  day: number;
  color: string;
  deity: string;
  significance: string;
  stylingTip: string;
}

export const NAVRATRI_COLOR_MAP: NavratriDay[] = [
  {
    day: 1,
    color: "Yellow",
    deity: "Shailputri",
    significance: "First form; welcomed with brightness",
    stylingTip: "Easiest to style; gold accessories are a natural fit",
  },
  {
    day: 2,
    color: "Green",
    deity: "Brahmacharini",
    significance: "Penance, devotion",
    stylingTip: "Emerald green, jade; traditional temple jewelry pairs well",
  },
  {
    day: 3,
    color: "Grey",
    deity: "Chandraghanta",
    significance: "Bravery, grace",
    stylingTip: "Unusual color; silver accessories and subtle embroidery help",
  },
  {
    day: 4,
    color: "Orange",
    deity: "Kushmanda",
    significance: "Cosmic egg; hidden wealth",
    stylingTip: "Auspicious and the easiest color for all ages to wear",
  },
  {
    day: 5,
    color: "White",
    deity: "Skandamata",
    significance: "Mother of Kartikeya",
    stylingTip:
      "Peaceful palette; pair with heavy jewelry and full accessories",
  },
  {
    day: 6,
    color: "Red",
    deity: "Katyayani",
    significance: "Warrior goddess; sought for marriage",
    stylingTip: "Most popular day; bridal-inspired styling with heavy jewelry",
  },
  {
    day: 7,
    color: "Blue",
    deity: "Kalaratri",
    significance: "Dark/terrifying form",
    stylingTip: "Royal and rich; gold and kundan work especially well",
  },
  {
    day: 8,
    color: "Pink",
    deity: "Mahagauri",
    significance: "Purity, forgiveness",
    stylingTip: "Softest palette day; pastel lehengas and minimal jewelry",
  },
  {
    day: 9,
    color: "Purple",
    deity: "Siddhidatri",
    significance: "Fulfillment, perfection",
    stylingTip:
      "Most formal day; heaviest embellishment expected; wear your finest",
  },
];

/**
 * Get Navratri color for a specific day (1-9).
 * Falls back to "Orange" (Day 4) for invalid day numbers.
 */
export function getNavratriColor(day: number): NavratriDay {
  return NAVRATRI_COLOR_MAP.find((d) => d.day === day) ?? NAVRATRI_COLOR_MAP[3];
}

/**
 * Get today's Navratri color (requires external lunar date source).
 * Returns null if not in Navratri period.
 */
export function getCurrentNavratriDay(
  lunarDay: number,
  lunarMonth: string,
): NavratriDay | null {
  if (lunarMonth.toLowerCase() !== "ashwin") return null;
  if (lunarDay < 1 || lunarDay > 9) return null;
  return getNavratriColor(lunarDay);
}

// ============================================================
// SAREE DRAPING STYLES
// ============================================================

export interface SareeDrapingStyle {
  region: Region;
  occasion: string;
  style: string;
  description: string;
  tip: string;
  blouseCut: string;
}

export const SAREE_DRAPING_STYLES: SareeDrapingStyle[] = [
  // Tamil Brahmin styles
  {
    region: "tamil",
    occasion: "tamil_wedding",
    style: "Brahmastram / Seedha Pallu",
    description:
      "Classic Tamil Brahmin drape: pallu goes from right to left over the left shoulder, pleats in front. The most traditional and respected style at Brahmin weddings.",
    tip: "Ensure pleats are sharp and even — the number of pleats (usually 5-7) signals family status at Brahmin weddings. Gold border should be visible at the feet.",
    blouseCut: "Full sleeves, high neck, fitted — traditional brahmin cut",
  },
  {
    region: "tamil",
    occasion: "diwali",
    style: "Mumtaz / Seedha Pallu with modern twist",
    description:
      "Elegant seedha pallu drape with the pallu brought to the right side and tucked at the waist, allowing the border to fan beautifully at the back.",
    tip: "For Diwali, choose silk sarees with contrast borders (red with green, gold with maroon). The contrast border is the statement piece.",
    blouseCut:
      "Short sleeves acceptable for parties; full sleeves for family events",
  },
  // Punjabi styles
  {
    region: "punjabi",
    occasion: "punjabi_wedding",
    style: "Pavadai Davani (lehenga style)",
    description:
      "Long skirt (lehenga) with fitted blouse and dupatta draped over the shoulder. This is NOT a saree drape — but for Punjabi weddings, lehenga is the default. If wearing a saree, prefer anarkali style instead.",
    tip: "At Punjabi weddings, lehenga with phulkari dupatta is the expected norm. A saree is only acceptable if the host family specifically invites South Indian guests.",
    blouseCut:
      "Crop top or short blouse acceptable for modern guests; full coverage for family",
  },
  // General festive
  {
    region: "generic",
    occasion: "festive",
    style: "Nivi Drape (Standard)",
    description:
      "The most common pan-Indian saree drape. Pleats in the center, pallu over the right shoulder, border visible at the feet. Universally appropriate for all festive occasions.",
    tip: "Works for all body types and all occasions. Modern innovation: pin the pallu at the left shoulder instead of right for a contemporary look.",
    blouseCut: "Any style works; match formality to the occasion",
  },
  {
    region: "generic",
    occasion: "temple",
    style: "Seamless South Indian Drape",
    description:
      "Minimal pleating, pallu draped simply from right shoulder to left waist. Focuses on the saree's beauty rather than drape complexity.",
    tip: "Choose cotton or silk sarees. At temple visits, simplicity is respected — avoid heavy embroidery and flashy borders. Muted colors and simple gold jewelry are ideal.",
    blouseCut: "Full sleeves, high back, traditional cut",
  },
];

export function getSareeDrapingStyle(
  region: Region,
  occasion: string,
): SareeDrapingStyle {
  const match = SAREE_DRAPING_STYLES.find(
    (s) => s.region === region && s.occasion === occasion,
  );
  if (match) return match;
  // Fallback to generic festive style
  return SAREE_DRAPING_STYLES[SAREE_DRAPING_STYLES.length - 1];
}

// ============================================================
// DUPPATA PAIRING LOGIC
// ============================================================

export interface DupattaTip {
  occasion: string;
  region: Region;
  pairing: string;
  drapingStyle: string;
  colorGuidance: string;
}

export const DUPATTA_PAIRING: DupattaTip[] = [
  {
    occasion: "punjabi_wedding",
    region: "punjabi",
    pairing: "Phulkari dupatta with lehenga or sharara",
    drapingStyle:
      "Pinned at right shoulder, leaving left shoulder free for movement during bhangra",
    colorGuidance:
      "Phulkari (hand-embroidered) in vibrant colors: hot pink, orange, gold. Match the dupatta color to your lehenga's dominant shade.",
  },
  {
    occasion: "tamil_wedding",
    region: "tamil",
    pairing: "Contrast silk dupatta with Kanjeevaram",
    drapingStyle:
      "Loose drape over the left shoulder, trailing behind. Often pinned at the left shoulder with a flower garland.",
    colorGuidance:
      "Contrast is key: a green dupatta with a red Kanjeevaram, or a gold dupatta with a navy blue silk. The dupatta should complement, not match.",
  },
  {
    occasion: "diwali",
    region: "generic",
    pairing: "Net or chiffon dupatta with silk or georgette saree",
    drapingStyle:
      "One end pinned at the left shoulder, other end loosely flowing. Can be draped in a figure-hugging style for parties.",
    colorGuidance:
      "Avoid matching the dupatta to the saree exactly — a contrast color or sequinned dupatta adds the festive drama Diwali calls for.",
  },
  {
    occasion: "navratri",
    region: "generic",
    pairing: "Chaniya cholis come with matching dupattas — use them",
    drapingStyle:
      "At garba: dupatta must be pinned securely at both shoulders. At dandiya: one shoulder pinned, other end held while dancing.",
    colorGuidance:
      "Match the dupatta color to the chaniya choli or use the Navratri day color (see NAVRATRI_COLOR_MAP). Silver or gold zari dupattas work all 9 days.",
  },
  {
    occasion: "temple",
    region: "generic",
    pairing: "Simple cotton or silk dupatta",
    drapingStyle:
      "Draped over both shoulders or just the left shoulder. Keep it simple — the focus should be on the deity, not the dupatta.",
    colorGuidance:
      "White, cream, or light pastel dupattas at temples. Avoid heavily embroidered or sequinned dupattas — they are considered inappropriate for prayer.",
  },
];

export function getDupattaTip(
  region: Region,
  occasion: string,
): DupattaTip | null {
  return (
    DUPATTA_PAIRING.find(
      (d) => d.region === region && d.occasion === occasion,
    ) ??
    DUPATTA_PAIRING.find(
      (d) => d.region === "generic" && d.occasion === occasion,
    ) ??
    null
  );
}

// ============================================================
// OCCASION CONTEXT (expanded)
// ============================================================

function buildOccasionContext(
  occasion: string,
  region: Region,
): OccasionContext {
  const contextMap: Record<string, OccasionContext> = {
    tamil_wedding: {
      detected: "tamil_wedding",
      query:
        "tamil wedding guest, silk saree kanjeevaram, temple jewelry, formal ethnic",
      formalityBoost: 3,
      culturalNotes: [
        "Kanjeevaram silk only for bride's family; Banarasi acceptable for others",
        "Red, maroon, green, gold — no black, no white",
        "Temple jewelry strongly preferred; flowers in hair traditional",
      ],
      sareeDrapingTip: getSareeDrapingStyle(region, "tamil_wedding")
        .description,
      dupattaTip: getDupattaTip(region, "tamil_wedding")?.pairing ?? undefined,
      colorsToWear: ["red", "maroon", "green", "gold", "deep pink"],
      colorsToAvoid: ["black", "white", "grey", "navy blue"],
      regionHint: "Tamil Nadu / South Indian Brahmin tradition",
    },
    punjabi_wedding: {
      detected: "punjabi_wedding",
      query:
        "punjabi wedding lehenga, phulkari, sharara, festive vibrant, heavy embroidery",
      formalityBoost: 3,
      culturalNotes: [
        "Lehenga is default — not saree — at Punjabi weddings",
        "Phulkari dupatta mandatory; bright colors: pink, orange, gold, fuchsia",
        "Sharara and Patiala salwar also accepted for older relatives",
        "Hair covered with dupatta or paranda (braid ribbon)",
      ],
      sareeDrapingTip:
        "At Punjabi weddings, lehenga is preferred over saree. If wearing a saree, choose anarkali style. Standard Nivi drape works for non-Punjabi guests.",
      dupattaTip:
        getDupattaTip(region, "punjabi_wedding")?.pairing ?? undefined,
      colorsToWear: [
        "pink",
        "fuchsia",
        "orange",
        "gold",
        "red",
        "mint",
        "peach",
      ],
      colorsToAvoid: ["black"],
      regionHint: "Punjab / North Indian Sikh tradition",
    },
    diwali: {
      detected: "diwali",
      query:
        "diwali festive, gold red green, silk saree, indo-western, celebratory",
      formalityBoost: 2,
      culturalNotes: [
        "Gold and red are the signature Diwali colors",
        "Fusion options accepted: dhoti pants + crop top, palazzo + kurta",
        "Evening parties: Indo-western and contemporary options open",
        "Morning puja: Traditional silk or cotton preferred; white strictly avoided",
      ],
      sareeDrapingTip: getSareeDrapingStyle(region, "diwali").description,
      dupattaTip: getDupattaTip(region, "diwali")?.pairing ?? undefined,
      colorsToWear: ["gold", "red", "green", "yellow", "orange", "pink"],
      colorsToAvoid: ["black", "dark grey"],
      regionHint: "Pan-India festival",
    },
    navratri: {
      detected: "navratri",
      query:
        "navratri garba dandiya, chaniya choli, colorful traditional, comfortable for dancing",
      formalityBoost: 1,
      culturalNotes: [
        "Wear the Navratri day color for maximum auspiciousness (Day 1=Yellow, Day 6=Red is most popular)",
        "Chaniya choli (skirt + crop top) with dupatta is the traditional outfit",
        "Avoid black all 9 days; white avoided especially on Days 4-9",
        "Comfort is critical — you'll be dancing for hours at garba",
      ],
      sareeDrapingTip:
        "Chaniya choli is traditional, not saree. If wearing saree, choose Nivi drape with comfortable fabric. Pin dupatta at both shoulders for garba safety.",
      dupattaTip: getDupattaTip(region, "navratri")?.pairing ?? undefined,
      colorsToWear: [
        "yellow",
        "green",
        "grey",
        "orange",
        "white",
        "red",
        "blue",
        "pink",
        "purple",
      ],
      colorsToAvoid: ["black"],
      regionHint: "Pan-India (Ashwin lunar month)",
    },
    eid: {
      detected: "eid",
      query:
        "eid elegant, modest traditional, cream white pastel, coord set, kurta, sheer fabric",
      formalityBoost: 2,
      culturalNotes: [
        "White and cream are traditional for Eid — signifies purity and new beginnings",
        "Modesty is paramount: arms covered to wrist, legs to ankles, loose fit",
        "Emerald green is deeply traditional",
        "Palazzo sets, coord sets, Anarkali kurtas accepted",
      ],
      sareeDrapingTip:
        "Saree with full-sleeve blouse is very appropriate for Eid. Choose georgette or chiffon for comfort. Contrast blouses work well: white saree with colored blouse.",
      dupattaTip:
        "Simple silk or chiffon dupatta draped loosely over one shoulder. Avoid heavy embroidery.",
      colorsToWear: [
        "white",
        "cream",
        "pastel pink",
        "mint",
        "lavender",
        "emerald green",
        "gold",
      ],
      colorsToAvoid: ["black"],
      regionHint: "Pan-India Islamic celebration",
    },
    temple: {
      detected: "temple",
      query:
        "temple visit modest traditional, cotton silk, simple jewelry, respectful coverage",
      formalityBoost: 1,
      culturalNotes: [
        "Cover shoulders and knees at minimum — South Indian temples stricter",
        "White is associated with mourning/widowhood — strictly avoid at South Indian temples",
        "Black avoided at all temples — inauspicious color",
        "Remove footwear before entering; socks acceptable",
      ],
      sareeDrapingTip: getSareeDrapingStyle(region, "temple").description,
      dupattaTip: getDupattaTip(region, "temple")?.pairing ?? undefined,
      colorsToWear: [
        "yellow",
        "orange",
        "red",
        "cream",
        "gold",
        "saffron",
        "green",
      ],
      colorsToAvoid: [
        "black",
        "white",
        "dark grey",
        "bright blue",
        "electric green",
      ],
      regionHint: "Tamil Nadu temples especially strict",
    },
    holi: {
      detected: "holi",
      query:
        "holi festival colors, comfortable old clothes, white avoided, easy to wash",
      formalityBoost: 0,
      culturalNotes: [
        "Wear old clothes you don't mind getting ruined by colors",
        "White is traditionally avoided — the colors show up better on colored clothes",
        "Cotton is best — comfortable and easy to wash",
        "Anarkali or kurta-palazzo comfortable AND colorful",
      ],
      sareeDrapingTip:
        "Avoid saree for Holi — the pleats catch color and are hard to clean. Choose easy-to-wash fabrics: cotton kurta, palazzo, or anarkali.",
      colorsToWear: [
        "any bright color",
        "yellow",
        "pink",
        "orange",
        "blue",
        "green",
      ],
      colorsToAvoid: ["white"],
      regionHint: "Pan-India (Phalgun lunar month)",
    },
    casual: {
      detected: "casual",
      query: "casual comfortable, relaxed fit, everyday cotton, easy wear",
      formalityBoost: 0,
      culturalNotes: [],
      colorsToWear: [],
      colorsToAvoid: [],
    },
    party: {
      detected: "party",
      query: "party outfit stylish, indo-western, statement piece, fashionable",
      formalityBoost: 2,
      culturalNotes: [
        "Indo-western fusion is widely accepted at parties",
        "Sequins and embellishments appropriate for evening parties",
        "Indo gowns are a safe and stylish choice",
      ],
      colorsToWear: [
        "gold",
        "red",
        "black",
        "emerald",
        "royal blue",
        "fuchsia",
      ],
      colorsToAvoid: [],
    },
    formal: {
      detected: "formal",
      query: "formal business, professional ethnic or western, crisp ironed",
      formalityBoost: 2,
      culturalNotes: [],
      colorsToWear: [],
      colorsToAvoid: [],
    },
  };

  return (
    contextMap[occasion] ?? {
      detected: occasion,
      query: `${occasion} outfit, appropriate for occasion`,
      formalityBoost: 1,
      culturalNotes: [],
    }
  );
}

// ============================================================
// MAIN ENTRY POINTS
// ============================================================

export function parseCalendarEvent(eventText: string | null): OccasionContext {
  if (!eventText) {
    return { detected: null, query: "", formalityBoost: 0, culturalNotes: [] };
  }
  const occasion = detectOccasion(eventText);
  if (!occasion) {
    return { detected: null, query: "", formalityBoost: 0, culturalNotes: [] };
  }
  const region = detectRegion(eventText);
  return buildOccasionContext(occasion, region);
}

export function detectIndianOccasion(text: string): string | null {
  return detectOccasion(text);
}

export { detectOccasion };
