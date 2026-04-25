# Phase 2 Analysis: Indian Occasion Logic Expansion

**Document Type:** Requirements Analysis & Cultural Intelligence Specification
**Project:** Prompt Closet — AI Personal Stylist Mobile App
**Phase:** 2 — Indian Cultural Fashion Intelligence
**Author:** Analysis Specialist
**Date:** 2026-04-17

---

## Executive Summary

Phase 2 of Prompt Closet introduces Indian cultural fashion intelligence to move beyond semantic clothing retrieval into culturally-contextual styling. The core challenge: **CLIP-based semantic matching cannot reason about cultural appropriateness** — a red silk saree is semantically similar to an orange kurta (both warm-colored, formal, Indian garment) but culturally wrong for a Punjabi funeral. Phase 2 must bridge this gap through structured cultural knowledge encoding, not improved embeddings.

**Complexity: MODERATE** — The cultural domain is well-documented but requires careful modeling to avoid stereotypes while providing actionable guidance. The ML gap analysis reveals fundamental limitations of unsupervised retrieval for cultural reasoning tasks.

---

## 1. Occasion Profile Research

### 1.1 Tamil Wedding (South India — Tamil Nadu)

#### Typical Dress Codes

| Guest Role | Expected Attire | Regional Variation |
|------------|-----------------|-------------------|
| Bride's family (close) | Traditional silk saree (pattu) with gold zari, or formal sherwani for men | Heavier gold work for immediate family |
| Groom's family | Same standards apply, slight competitive dressing | More jewelry expected from bride's side |
| Extended family | Good quality silk or cotton saree, formal kurta | Simpler gold, no ceremony-specific requirements |
| Friends/general guests | Clean, formal ethnic wear | Respectful western formal acceptable if ethnic unavailable |

**Critical Note:** Tamil weddings are **textile-significant** events. The saree is not optional for women — a cotton saree at a wedding is perceived as disrespectful to the bride's family. Quality and gold content signal respect.

#### Color Symbolism

| Auspicious/Mandatory | Neutral/Acceptable | Avoid |
|---------------------|-------------------|-------|
| Gold (shenkali) — prosperity, sanctity | Pastels (pink, mint, peach) — modern acceptance | Black — inauspicious, associated with mourning |
| Red (magam) — Lakshmi blessing, fertility | Green — not traditional but accepted | White — widow's color, funeral association |
| Kora (cream/marriage fabric color) | Purple — rare but acceptable | Dark blue — not traditional |
| Paan (betel-leaf green) — married woman color |  |  |

**Why Gold Dominates:** Tamil tradition associates gold (svarna) with Lakshmi. Brides wear red and gold; guests wearing gold acknowledge the prosperity blessing being sought.

#### Formality Tiers

| Tier | Description | Saree Specification | Men's Equivalent |
|------|-------------|----------------------|------------------|
| **Tier 1 — Immediate Family** | Parents, siblings, immediate in-laws | 100% silk, heavy zari border, traditional design (temple border, coin border) | Formal silk sherwani with gold embroidery, traditional veshti (dhoti) with angavastram |
| **Tier 2 — Extended Family** | Cousins, aunts, uncles, close family friends | Quality silk or high-grade cotton silk, visible gold jewelry | Plain silk kurta, formal pants with ethnic jacket |
| **Tier 3 — General Guests** | Friends, colleagues, distant relatives | Clean, well-pressed ethnic wear, some gold acceptable | Formal kurta, no jeans |

#### Key Garment Types

1. **Pattu Saree** — Pure silk with zari work, typically 6-9 meters
2. **Kanjivaram** — Premium silk saree with heavy border, temple design motifs
3. **半套 (Half-saree)** — For unmarried girls, typically bright colors with less gold
4. **Veshti/Dhoti** — Men's lower garment, white or cream with gold border for formal
5. **Angavastram** — Shoulder cloth, draped over shirt for men
6. **Sherwani** — Western-influenced formal menswear, now common in urban Tamil weddings

#### Accessory Notes

- **Jhumka earrings** — Standard for married women, not unmarried
- **Mangalsutra** — Married woman's identifier; guests who are married may wear substitute gold chain
- **Thiruttu (bangles)** — Glass or gold bangles, even number for married women
- **Nose ring (nath)** — Bride-specific, guests should not wear full nath
- **Hair flowers (puvi)** — Jasmine or replica, bride wears more elaborate

---

### 1.2 Punjabi Wedding (North India — Punjab)

#### Typical Dress Codes

| Guest Role | Expected Attire | Key Distinction from Tamil |
|------------|-----------------|--------------------------|
| Bride | Red/gold lehenga, heavily embellished | Heavily embroidered (phulkari), not silk-heavy |
| Groom | Sherwani or traditional kurta-pyjama with turban (pagri) | Turban is **mandatory** for groom, signals honor |
| Women guests | Salwar-kameez, lehenga, or saree | Saree less common than in South; salwar-kameez more prevalent |
| Men guests | Kurta-pyjama, sherwani | Less-formal than groom, no turban |

**Critical Note:** Punjabi weddings are **loud, colorful, and celebratory** — restraint is not the norm. Heavy embroidery, bright colors, and visible wealth display are expected, not ostentatious.

#### Color Symbolism

| Auspicious | Neutral | Avoid |
|-----------|---------|-------|
| Red — joy, fertility, Shakti | Hot pink, magenta — modern acceptance | White — mourning color |
| Gold — prosperity | Orange — acceptable, less traditional | Black — mourning |
| Maroon — deep cultural significance | Yellow — less common, may clash with haldi | Green — not traditional, may conflict |

**Special: Haldi Ceremony Colors**
- **Yellow (haldi)** — Dominant; guests should wear yellow or cream to blend
- Avoid white at haldi (washes out in photos, feels funeral-adjacent)

#### Formality Tiers

| Tier | Women's | Men's |
|------|---------|-------|
| **Tier 1 — Family** | Heavy lehenga or fully-embellished salwar-kameez, full jewelry | Sherwani with turban (pagri), heavy embroidery |
| **Tier 2 — Close Friends** | Mid-weight lehenga, moderate embellishment | Embroidered kurta, no turban |
| **Tier 3 — General** | Clean, festive ethnic wear | Plain kurta-pyjama, no jeans |

#### Key Garment Types

1. **Lehenga Choli** — Skirt + blouse + dupatta; heavily phulkari embroidery for Punjabi style
2. **Salwar-Kameez** — Tunics with pleated trousers; Patiala salwar distinctive
3. **Phulkari** — Embroidered shawl/ dupatta; hallmark of Punjabi textile
4. **Sherwani** — Men's formal, heavily embroidered
5. **Pagri** — Turban; specific to groom, but men may wear for family roles
6. **Dhoti** — Less common in Punjabi tradition

#### Accessory Notes

- **Matha Patti** — Forehead jewelry piece for bride
- **Chooda** — Green/white glass bangles, even number, for bride
- **Kalire** — Gold hair accessories framing face
- **Jutti** — Traditional Punjabi shoes, often embellished

---

### 1.3 Diwali (Festival of Lights — Pan-India)

#### Typical Dress Codes

**Important Contextual Distinction:** Diwali is a **home-centric** festival. Dress code varies significantly by:
- Whether attending puja at temple vs. home gatherings vs. parties
- Region (North vs. South India dressing norms differ)
- Urban vs. rural

| Setting | Women's | Men's |
|---------|---------|-------|
| Home puja/family gathering | Traditional saree or kurta, moderate embellishment | Clean kurta, may skip formal |
| Temple visit | Simple traditional, covered shoulders/knees | Plain kurta, no shorts |
| Social party/ganpati-visiting | Heavier embellishment acceptable, designer wear | Formal ethnic, sherwani acceptable |
| Office celebration | Moderate ethnic, not ostentatious | Standard ethnic Friday dress |

#### Color Symbolism

| Auspicious | Neutral | Avoid |
|-----------|---------|-------|
| Gold — Lakshmi association, wealth | Bright jewel tones (emerald, sapphire, ruby) | Black — absence of light |
| Red — prosperity, warmth | White — acceptable in modern urban settings | — |
| Orange (saffron) — spiritual, sacred | Yellow — acceptable | — |

**Note on White:** Historically white (safa/white) was avoided as funeral-adjacent. Modern urban Diwali tolerates white as "all colors welcome" but traditional households still avoid it at puja.

#### Formality Tiers

Diwali has **no strict formality tiers** — the celebration spans from quiet home puja to lavish parties. App should offer:
- **Casual mode:** Clean ethnic casual
- **Puja mode:** Traditional, covered, respectful
- **Party mode:** Heavier embellishment, jewelry welcome

#### Key Garment Types

- **Saree** — Most universal, all regions
- **Anarkali** — Popular in North, flowing silhouette
- **Lehenga** — Party/celebration wear
- **Kurta-pyjama** — Men's universal
- **Sherwani** — Formals only

---

### 1.4 Navratri (Nine Nights — Gujarat/Maharashtra/North India)

#### Critical Note on Color Coding

Navratri has **mandatory color per day** — this is the app's most actionable feature for this occasion.

| Day | Color | Significance | Ladies' Saree Color | Men's Kurta Color |
|-----|-------|--------------|---------------------|-------------------|
| 1 | Yellow (Pratipada) | Happiness, optimism | Yellow | Yellow |
| 2 | Green (Dwitiya) | Nature, fertility | Green | Green |
| 3 | Grey (Tritiya) | Silence, penance | Grey | Grey |
| 4 | Orange (Chaturthi) | Courage, peace | Orange | Orange |
| 5 | White (Panchami) | Truth, purity | White | White |
| 6 | Red (Shashti) | Beauty, power | Red | Red |
| 7 | Blue (Saptami) | Valor, wisdom | Blue | Blue |
| 8 | Pink (Ashtami) | Divine mother | Pink | Pink |
| 9 | Purple (Navami) | Royalty, wisdom | Purple | Purple |

#### Typical Dress Codes

| Region | Women's Standard | Men's Standard | Notes |
|--------|-----------------|----------------|-------|
| Gujarat | Chaniya choli (ghagra top + skirt + dupatta) | Simple kurta or Indo-western | Chaniya choli is festive, not just Garba wear |
| Maharashtra | Traditional saree or kurta-pajama | Plain kurta | More subdued than Gujarat |
| North (urban) | Mix of all styles | Kurta-pyjama | Color of the day is key signal |

#### Accessory Notes

- **Ghungru** — Small bells tied to feet for Garba dance; functional, not decorative
- ** oxidized jewelry** — Typically silver, matches tribal/folk aesthetic
- **Maang Tikka** — Head jewelry for women
- **Bangles** — Color-coordinated to day's color

---

### 1.5 Temple Visit (South India — Temple Dress Code)

#### Critical Context

Temple dress codes are the **strictest of all occasions**. South Indian temples (especially Brahminical temples) have explicit enforceable dress requirements that visitors are turned away for violating.

| Temple Type | Women's Requirements | Men's Requirements |
|-------------|----------------------|-------------------|
| Brahminical Hindu (Kapaleeshwarar, Tirumala, etc.) | Saree preferred, long skirt/punjabi pants acceptable if covered | Dhoti or formal pants with shirt; no shorts, no half-sleeves |
| Saivaite | Saree mandatory for married women | Veshti (dhoti) mandatory for main deity darshan |
| Vaishnavite | Saree or half-saree | Dhoti with angavastram |
| General temples | Traditional modest ethnic | Formal ethnic |

**Men's Specific Rules:**
- **Tirumala (Tirupati):** Only dhoti allowed for main darshan; pants rejected at security
- **Kapaleeshwarar (Chennai):** Dhoti preferred, formal pants tolerated for general darshan
- **Padmanabhaswamy (Thiruvananthapuram):** Traditional mundu/veshti mandatory

#### What Gets You Denied Entry

| Violation | Why Enforced |
|-----------|--------------|
| Shorts/ bermuda on men | Exposed legs considered disrespectful |
| Sleeveless on women | Shoulder coverage mandatory |
| Jeans on anyone | Perceived as western, disrespectful |
| Short skirts | Exposed legs/ knees |
| Caps/hats on men | Head covering in temple is forbidden (Sikh temples require covering, Hindu temples prohibit it) |

#### Color Symbolism (Temple-Specific)

| Appropriate | Neutral | Inappropriate |
|------------|---------|---------------|
| White — purity, temple-white | Pastels | Black — mourning color |
| Yellow — spiritual significance | Cream | Bright red — bridal color, not general puja |
| Orange (saffron) — spiritual | Light blue | Dark/黑/black |

#### Formality Tiers (Temple)

| Tier | Requirement |
|------|------------|
| **Main deity darshan** | Strict: saree/dhoti mandatory |
| **General temple complex** | Moderate: traditional modest ethnic |
| **Temple festival (Brahmotsavam)** | Formal: best traditional wear |

---

### 1.6 Eid (Islamic Celebration — Pan-India, regional variations)

#### Critical Context

Eid dressing varies by:
- **Eid al-Fitr:** Celebrates end of Ramadan; slightly more relaxed, pastels and whites common
- **Eid al-Adha:** More solemn; traditional formal preferred
- **Regional:** South Indian Muslims (Tamil Nadu) vs. North Indian (UP, Bihar) vs. Deccani

#### Typical Dress Codes

| Gender | Traditional | Semi-Formal | Formal |
|--------|-------------|--------------|--------|
| Women | Abaya, burqa with colorful hijabs | Fancy abaya, designer scarf | Embroidered salwar-kameez, saree (Indian Muslim women) |
| Men | Kurta-pajama, pathani | Sherwani, formal kurta | Western formal acceptable |

**Key Distinction from Hindu Events:** Eid does **not** require Indian ethnic wear. Abaya and kurta are equally valid. The app should NOT suggest saree/lehenga unless user indicates Indian Muslim dressing preference.

#### Color Symbolism

| Auspicious | Neutral | Avoid |
|-----------|---------|-------|
| White — Eid al-Fitr, purity, new beginnings | Pastels (pink, mint, lavender) | Black — not traditionally festive |
| Gold — celebration, prosperity | Emerald green — Islamic significance | — |
| Light blue — common in abaya culture | Peach, cream | — |

#### Accessory Notes

- **Men:** Prayer cap (topi) for mosque visits
- **Women:** Bangles, subtle jewelry, typically not heavy gold (abaya covers)

---

## 2. Saree Draping Styles — Technical Specification

### 2.1 Nivi Style (Andhra Pradesh / Telangana)

**Most common modern style; default unless specified otherwise.**

#### Technique
1. Tuck plain end at left hip, wrap once clockwise around body
2. Pleat remaining fabric at navel center (8-10 pleats, facing right)
3. Take pallu (decorated end) from back, drape over left shoulder
4. Pallu falls from left shoulder to below hip
5. Pallu can be taken under right arm and pinned at left shoulder for dance/formality

#### When to Suggest
- **Default for:** Modern occasions, office, semi-formal events
- **Region:** Pan-India urban; origin is Andhra/Telangana
- **Body type note:** Nivi drape elongates torso visually

#### CLIP Retrieval Guidance
Nivi drape is **not visually distinctive** from other modern drapes. CLIP will not distinguish Nivi from Bollywood. Only the garment's zari/embroidery pattern (Andhra temple border, Kanchi border) signals origin.

---

### 2.2 Bollywood Style

**Loose pallu, modern interpretation; dominant in film and urban fashion.**

#### Technique
1. Tuck at left hip, wrap counter-clockwise (pallu goes to left first)
2. Minimal or no pleating at center — fluid fall
3. Pallu draped loosely over one or both shoulders
4. Pallu often trails longer than Nivi
5. Often worn with statement jewelry that rests on the pallu

#### When to Suggest
- **Modern/westernized Indian events**
- **Reception events** (less formal than ceremony)
- **Photo-heavy occasions** (dramatic pallu fall photographs well)

#### Visual Distinguishing Features
- Pallu often worn over BOTH shoulders (Nivi typically one)
- Less structured pleating
- Often paired with heavy statement jewelry (Nivi more traditional jewelry)

---

### 2.3 Maharashtrian Style

**Distinct drape with pomegranate pleats; worn with unique petticoat.**

#### Technique
1. Saree wrapped from left, plain end at left hip
2. **Pleats tucked at back, not front** — this is the key differentiator
3. Pallu brought from back to front over right shoulder
4. Pallu tucked into petticoat at right hip OR brought up to head
5. Worn with **petni (petticoat)** that is visibly colored and embellished at hem
6. **Maharashtrian contrast border** (usually green-red) visible

#### When to Suggest
- **Maharashtrian cultural events**
- **Ganesh Chaturthi** (Maharashtra)
- **When user indicates Maharashtra heritage**

#### Visual Distinguishing Features
- **Pleats at BACK, not front** — unique to Maharashtrian
- Worn with petticoat that shows below saree (most other styles hide petticoat)
- Often bright colors with contrast border

---

### 2.4 South Indian Style (Tamil Nadu / Karnataka / Kerala)

**Two variants: pleats at back (Tamil) or pleats at front with temple drape (Kerala).**

#### Tamil/Karnataka Variant
1. Tuck at left hip
2. Pleats at center navel (like Nivi)
3. Pallu goes OVER right shoulder, falls behind
4. **For bridal/formal:** Pallu taken under left arm, pinned at right shoulder, end falls across chest

#### Kerala / Temple Drape Variant
1. Two-piece mundum neriyathum (set mundu) — separate top
2. Saree wrapped around lower body (like a mundu)
3. Pallu draped over shoulder WITHOUT pleats
4. **Temple drape:** Pallu tucked at waist, upper body covered with contrasting blouse

#### Kerala White Saree (Set Saree / Madhurya Kavyam)
- **Mandatory for:** Onam, Kerala temple events
- **Color:** White with gold border (kasu) or plain white
- **Fabric:** Traditional Kerala kasavu cotton or tissue silk
- **Blouse:** Contrasting red or green

#### When to Suggest
- **User indicates South Indian heritage**
- **Kerala temple events**
- **Onam celebrations**
- **Tamil Nadu weddings**

---

### 2.5 Bengali Style (West Bengal)

**Known as Atpourey/Atpana; distinctive white-on-white or red-white combinations.**

#### Technique
1. Base drape similar to Nivi (left hip tuck, clockwise wrap)
2. **Pleats folded very finely** (ath (eight) pleats, hence "athpana")
3. Pallu brought from back and **spread across upper body** — not hanging
4. Pallu spread creates decorative square/border design over torso
5. Border (par 4-6 inches) of saree becomes the visible upper decoration
6. Often worn with **shakha (white bangles)** and **sindoor**

#### When to Suggest
- **Bengali cultural events (Durga Puja, Kali Puja)**
- **Bengali weddings**
- **User indicates Bengali heritage**

#### Visual Distinguishing Features
- **Spread pallu** across chest — not a hanging drape
- Fine, even pleats
- White-on-white or red-white (not gold-heavy)
- Paired with shakha (bangles) and sindoor (vermilion)

---

### 2.6 Pakistani Style (Pakistan, Indian Muslim communities)

**Shoulder drape style; distinctive pallu management.**

#### Technique
1. Tuck at left hip, wrap clockwise
2. **Pallu brought to FRONT from right side, draped over left shoulder**
3. Pallu often pinned at left shoulder and allowed to fall freely behind
4. OR pallu brought forward and tucked at right waist (gharara style influence)
5. Less structured than Nivi; more fluid drape

#### When to Suggest
- **User indicates Pakistani heritage**
- **Eid celebrations (Indian Muslim)**
- **Muslim wedding events**

#### Visual Distinguishing Features
- **Pallu from right to left over shoulder** (vs. Nivi's left-to-right)
- More casual drape overall
- Often paired with heavy jewelry

---

### 2.7 Saree Draping Style — Summary Matrix

| Style | Origin | Key Visual Marker | Appropriate For | Formal? |
|-------|--------|-------------------|-----------------|---------|
| Nivi | Andhra/Telangana | Center pleats, left-shoulder pallu | All modern occasions | Yes |
| Bollywood | Film/Urban | Minimal pleats, both-shoulder pallu, long trail | Receptions, parties | Mid |
| Maharashtrian | Maharashtra | **Pleats at BACK**, petticoat visible | Cultural events, Ganesh Chaturthi | Yes |
| South Indian (Tamil) | Tamil Nadu | Center pleats, over-right-shoulder | Weddings, formal | Yes |
| South Indian (Kerala) | Kerala | Mundum neriyathum, white kasavu | Temple, Onam | Yes |
| Bengali | West Bengal | Spread pallu, fine ath pleats | Durga Puja, Bengali weddings | Yes |
| Pakistani | Pakistan | Right-to-left pallu, shoulder drape | Eid, Muslim events | Yes |

---

## 3. Dupatta Pairing Logic

### 3.1 Color Coordination Rules

#### Matching (Same Color Family)

| Outfit Base | Dupatta | Effect | When Appropriate |
|-------------|---------|--------|------------------|
| Red kurta | Red dupatta (identical) | Cohesive, formal, bridal-adjacent | Weddings, formal events |
| Maroon lehenga | Maroon dupatta | Rich, traditional | Punjabi events |
| Pink suit | Pink dupatta | Soft, coordinated | Eid, family gatherings |

**Risk:** "Same color" matching can look flat if fabric textures are identical. Need texture contrast.

#### Complementary Contrast

| Base Color | Dupatta Color | Why It Works | When Appropriate |
|------------|---------------|--------------|------------------|
| Red | Green | Complementary contrast, classic Indian | Punjabi weddings, celebrations |
| Blue | Gold | Royal contrast | Formal North Indian events |
| Pink | Green | Soft complementary | Navratri, moderate formality |
| White | Red | Bridal contrast, auspicious | South Indian weddings |
| Orange | Blue | Bold complementary | Fashion-forward occasions |

#### Neutral + One Bold

| Base | Dupatta | Effect |
|------|---------|--------|
| Cream/white kurta | Bright red/geometric dupatta | Traditional with focal point |
| Pastel suit | Jewel-toned dupatta | Modern, balanced |
| Grey | Hot pink | Contemporary fusion |

### 3.2 Fabric Pairing Rules

| Kurta/Kameez Fabric | Dupatta Fabric | Appropriate | Notes |
|--------------------|----------------|-------------|-------|
| Cotton | Cotton/voile | Yes | Comfortable, daytime |
| Silk | Silk/georgette | Yes | Formal, wedding |
| Linen | Light cotton | Yes | Summer, office |
| Georgette | Chiffon/silk | Yes | Party, evening |
| Velvet | Silk/chiffon | Yes | Winter formal |
| Brocade | Chiffon/satin | Yes | Heavy + light contrast |
| Chanderi | Chanderi | Yes | Traditional, delicate |
| Khadi | Natural cotton | Yes | Gandhi-era, rustic |

**PROHIBITED PAIRINGS:**
- Heavy brocade kurta + heavy brocade dupatta (visually overwhelming)
- Velvet kurta + velvet dupatta (same-weight without contrast)
- Cotton kurta + silk dupatta (mismatch in formality — looks like costume)

### 3.3 Draping Positions

| Drape Position | Description | Pairing |
|----------------|-------------|---------|
| **Both shoulders** | Dupatta spread across back, ends on both sides | Formal, wedding, when jewelry is minimal |
| **One shoulder (left)** | Pallu-style, single end over left shoulder | South Indian, Nivi saree style |
| **Head cover** | Dupatta over head | Temple visits, religious events |
| **Front drape** | Both ends brought to front, crossed or tucked | Dance, active movement |
| **Loose back drape** | Both ends hanging freely behind | Reception, photo-friendly |
| **Shoulder pad style** | Pallu arranged on one shoulder like a shawl | Pakistani style, fashion-forward |

### 3.4 Dupatta — When to Skip Entirely

**Skip Dupatta When:**
- **Casual summer events** — cotton kurta with pants, no dupatta
- **Reception (bride/groom family already has dupatta)** — avoid clutter
- **Dance/garba** — dupatta is a hazard
- **Active movement events** — DJ/navigation events

**Never Skip:**
- Temple visits (dupatta is head cover backup)
- Wedding ceremony (family photo standard)
- First meeting of families (traditional expectation)

---

## 4. Technical Implementation Approach

### 4.1 Knowledge Encoding Strategy

**Decision: Hybrid Approach — Structured Knowledge Base + Claude Prompt Engineering**

Pure learned approaches (fine-tuned CLIP) fail because:
1. Cultural rules are discrete and exception-laden (Tamil wedding: gold mandatory, not just "warm formal")
2. Rare occasions (Bengali Athpana drape) have too few images for supervised learning
3. Context (who is the user, what's their heritage) is not in the image

#### Layer 1: Structured Occasion Profile (Knowledge Base)

```typescript
interface OccasionProfile {
  id: string;                    // "tamil_wedding", "punjabi_wedding", etc.
  name: string;                   // Display name
  region: string;                 // Primary region
  subRegions?: string[];          // Diaspora regions (e.g., Tamil diaspora in Malaysia)

  // Dress code rules
  formalityTiers: FormalityTier[];
  genderRules: {
    women: GenderDressRule;
    men: GenderDressRule;
  };

  // Color rules
  colorRules: {
    auspicious: ColorRule[];       // Colors expected/welcome
    neutral: ColorRule[];          // Acceptable but not traditional
    forbidden: ColorRule[];        // Culturally inappropriate
    perDay?: DayColorRule[];      // Navratri-specific per-day colors
  };

  // Garment rules
  garmentPreferences: GarmentPreference[];  // Ranked list

  // Accessory notes
  accessories: AccessoryNote[];

  // Saree-specific rules (if applicable)
  sareeRules?: SareeRules;

  // Dupatta rules
  dupattaRules?: DupattaRules;
}

interface ColorRule {
  color: string;                  // HSL or named color
  hex?: string;
  name: string;                   // "Gold", "Magenta"
  intensity?: "light" | "medium" | "dark";
  symbolism?: string;             // "prosperity", "mourning"
}

interface FormalityTier {
  tier: 1 | 2 | 3;
  description: string;
  womenDescription: string;
  menDescription: string;
  garmentExamples: string[];
}
```

#### Layer 2: User Heritage Profile (Context)

```typescript
interface UserHeritage {
  primaryRegion: string;          // "Tamil Nadu", "Punjab", "Kerala"
  diasporaStatus?: string;        // "Indian diaspora - Malaysia", "Indian diaspora - USA"
  religion?: string;             // For Eid/temple routing
  formalityPreference: "traditional" | "modern" | "fusion";
}
```

### 4.2 Claude Prompt Engineering — Occasion Routing

**Architecture:**
```
User Input: "Suggest an outfit for my cousin's wedding in Chennai"

LLM Pipeline:
1. Extract occasion details (wedding, region signal = Chennai)
2. Infer heritage from user profile (if Tamil, route to Tamil Wedding profile)
3. Map formality from "cousin's wedding" → Tier 2
4. Generate outfit recommendation with cultural rules explained
5. Return structured recommendation + reasoning
```

**Prompt Template Structure:**

```
SYSTEM PROMPT (occasion routing):

You are an Indian fashion stylist with expertise in regional cultural dress codes.
Given a user query, you must:

1. IDENTIFY the occasion type (wedding, festival, temple visit, etc.)
2. IDENTIFY the primary region (South India, North India, West Bengal, etc.)
3. ROUTE to the correct occasion profile
4. APPLY formality tier based on relationship cues
5. OUTPUT a structured recommendation

KNOWLEDGE BASE SNAPSHOT (abbreviated for prompt):

TAMIL_WEDDING:
- Formality: Tier 1 = bride's immediate family, gold silk mandatory
- Colors: gold, red, cream auspicious; black/white forbidden
- Garments: Kanjivaram pattu saree, veshti for men
- Saree drape: Nivi or South Indian pleating

PUNJABI_WEDDING:
- Formality: Tier 1 = immediate family, heavy lehenga
- Colors: red, gold, maroon; black/white forbidden
- Garments: lehenga choli, phulkari dupatta, sherwani

...

USER QUERY: {user_input}
USER HERITAGE: {user_heritage}

OUTPUT FORMAT:
{
  occasion: "...",
  formality_tier: 1|2|3,
  recommendation: {
    women: { garment, color, accessories, saree_drapes_if_applicable },
    men: { garment, color, accessories }
  },
  cultural_notes: ["..."],  // Explanation of why recommendation fits
  dupatta_guidance: { color, fabric, drape_position }
}
```

### 4.3 Data Model Additions

#### Supabase Schema Changes

```sql
-- Occasion profiles (static knowledge base, seeded, not user-editable)
CREATE TABLE occasion_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  profile_data JSONB NOT NULL  -- Full OccasionProfile struct
);

-- User heritage (user preference, editable)
CREATE TABLE user_heritage (
  user_id UUID REFERENCES auth.users(id),
  primary_region TEXT,
  religion TEXT,
  formality_preference TEXT CHECK (formality_preference IN ('traditional', 'modern', 'fusion')),
  diaspora_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- Occasion-specific saree knowledge
CREATE TABLE saree_occasion_affinity (
  saree_id UUID REFERENCES wardrobe_items(id),
  occasion_profile_id TEXT REFERENCES occasion_profiles(id),
  appropriateness_score NUMERIC(2,1) CHECK (appropriateness_score BETWEEN 1 AND 5),
  notes TEXT,  -- e.g., "Heavy zari border appropriate for Tier 1 only"
  PRIMARY KEY (saree_id, occasion_profile_id)
);

-- Dupatta-to-outfit pairing rules
CREATE TABLE dupatta_pairing_rules (
  id SERIAL PRIMARY KEY,
  base_garment_type TEXT NOT NULL,       -- 'kurta', 'lehenga', 'anarkali'
  base_fabric TEXT,
  dupatta_fabric TEXT NOT NULL,
  color_rule TEXT NOT NULL,              -- 'matching', 'complementary', 'contrast'
  occasion_context TEXT[],               -- Array of occasion IDs where this pairing applies
  formality_tier INTEGER CHECK (formality_tier BETWEEN 1 AND 3)
);
```

#### Wardrobe Item Schema Additions

```typescript
interface WardrobeItem {
  id: string;
  userId: string;

  // Existing fields
  imageUrl: string;
  embedding: number[];  // CLIP embedding

  // Phase 2 additions
  garmentType: GarmentType;          // 'saree', 'kurta', 'lehenga', 'sherwani', etc.
  primaryColor: string;              // HSL or hex
  secondaryColor?: string;
  fabric: FabricType;                // 'cotton', 'silk', 'georgette', etc.
  work?: WorkType;                   // 'zari', 'embroidery', 'block_print', 'tie_dye', etc.
  occasionTags: string[];             // ['wedding', 'festive', 'casual', 'temple']

  // Regional attributes
  regionOfOrigin?: string;           // 'Tamil', 'Rajasthani', 'Bengali', etc.
  isHeirloom?: boolean;

  // For saree-specific fields
  sareeDetails?: {
    blouseIncluded: boolean;
    blouseColor?: string;
    borderType?: 'temple' | 'kasu' | 'georgette' | 'none';
    palluDesign?: string;
  };
}
```

### 4.4 Retrieval Pipeline

```
USER QUERY: "What should I wear to a Diwali puja at home?"

Pipeline:

1. HERITAGE LOOKUP (Supabase)
   → User heritage: Tamil Nadu, Hindu, modern preference

2. OCCASION PARSING (Claude)
   → Diwali, home puja (not temple, not party)
   → Formality: casual-to-puja (tier ~2.5)

3. KNOWLEDGE BASE QUERY (Supabase)
   → SELECT * FROM occasion_profiles WHERE id = 'diwali_puja'
   → Returns color rules, garment preferences

4. WARDROBE RETRIEVAL (CLIP)
   → Query embedding: "festive ethnic wear home puja"
   → Top-20 wardrobe items retrieved

5. CULTURAL FILTER (Application Logic)
   → Filter out: black (forbidden for Diwali puja)
   → Filter out: white (traditional avoidance at puja)
   → Score by: gold/red presence, fabric formality match

6. RANKING
   → Base score from CLIP similarity
   → Cultural appropriateness multiplier (x1.5 if matches auspicious color)
   → Formality match bonus

7. OUTPUT
   → Top 3 recommendations with cultural explanation
   → Dupatta pairing suggestion
   → Saree drape style (if saree recommended)
```

---

## 5. ML Rubric Gap Analysis — MGMT 655 Framework

### 5.1 What CLIP Retrieval Is Missing

**CLIP's Fundamental Limitation: Semantic Similarity ≠ Cultural Reasoning**

#### The Gap Matrix

| CLIP Retrieval Does | CLIP Retrieval Does NOT Do |
|--------------------|---------------------------|
| Matches "red formal Indian garment" to "wedding guest outfit" | Distinguish Tier 1 vs. Tier 2 formality appropriateness |
| Groups by color/garment type | Know gold is expected at Tamil wedding, not just "warm formal" |
| Returns visually similar items | Apply color symbolism (black = mourning at wedding) |
| Handle "festive wear" queries | Know Navratri has mandated per-day colors |
| Match garment to occasion style | Recognize temple dress code prohibitions (no shorts) |
| Retrieve "similar saree" | Determine which draping style matches user's regional heritage |

#### Concrete Failure Cases

**Failure Case 1: Black Saree at Tamil Wedding**
```
Query: "outfit for Tamil wedding guest"
CLIP retrieval: Returns items by visual similarity — a black silk saree with gold zari
may rank highly (formal + Indian + silk + gold accents)
Cultural reality: Black is forbidden — associated with mourning
Result if not filtered: User wears black to wedding, causes offense
```

**Failure Case 2: White Kurta at Diwali Puja**
```
Query: "what to wear for Diwali puja at home"
CLIP retrieval: White kurta with subtle embroidery ranks highly
(clean + festive + minimal)
Cultural reality: White at Diwali = absence of light, inauspicious
Modern urban reality: Some younger urbanites accept white
Gap: CLIP cannot model this exception → needs explicit rule
```

**Failure Case 3: Navratri Day 3 Grey Saree**
```
Query: "Navratri outfit"
CLIP retrieval: Returns most festive-looking item, ignores day-specific color
Cultural reality: Day 3 = grey mandatory for devotees
Gap: No per-day color awareness without explicit knowledge base
```

**Failure Case 4: Saree Draping Style for Bengali User**
```
Query: "what saree to wear for Durga Puja"
CLIP retrieval: Returns any saree tagged "festive" + "Bengali"
Cultural reality: Bengali Athpana drape is expected, not Nivi
Gap: No drape-style awareness in CLIP embeddings
```

### 5.2 Supervised Learning Additions

#### Addition 1: Occasion-Item Appropriateness Classifier

**Problem:** Binary (appropriate/not appropriate) — CLIP provides continuous similarity, not appropriateness

**Approach:**
```python
# Training data: pairs of (wardrobe_item, occasion_profile) labeled by appropriateness
# Labels: 1=inappropriate, 2=neutral, 3=appropriate, 4=highly_recommended

# Architecture: Fine-tuned classifier on top of CLIP image encoder
class OccasionClassifier(nn.Module):
    def __init__(self, clip_model):
        self.image_encoder = clip_model.encode_image
        self.occasion_embedding = nn.Embedding(num_occasions, 512)
        self.classifier = nn.Linear(1024, 4)  # 4 appropriateness levels

    def forward(self, image_features, occasion_id):
        # Concatenate image features with occasion context
        occasion_vec = self.occasion_embedding(occasion_id)
        combined = torch.cat([image_features, occasion_vec], dim=1)
        return self.classifier(combined)
```

**Data Requirements:**
- 500+ labeled (item, occasion) pairs per occasion type
- Labelers must be Indian fashion cultural experts, not crowdworkers
- Inter-rater reliability testing essential

**Estimated Accuracy:** 75-85% (cultural nuance makes perfect accuracy impossible)

#### Addition 2: Formality Score Regression

**Problem:** Outfit formality is not binary — Tier 1/2/3 is discrete but real-valued formality exists

**Approach:**
```python
# Predict formality score (1-10 continuous)
# Training data: Outfit images labeled with formality score

# Features to predict formality:
# - Fabric weight (silk > cotton > synthetic)
# - Embroidery density
# - Color intensity
# - Gold/zari presence
# - garment type formality ranking

# Architecture: Multi-task learning
# - Primary: formality regression (L2 loss)
# - Auxiliary: garment type classification (cross-entropy)
```

#### Addition 3: Heritage-Aware Style Profile Clustering

**Problem:** "Indian fashion" is not one cluster — Tamil vs. Punjabi vs. Bengali fashion have distinct visual vocabularies

**Approach:**
```python
from sklearn.cluster import KMeans
from sklearn.manifold import TSNE

# Extract CLIP embeddings for Indian fashion images
# Cluster to discover regional style groups

# Hypothesis: Clusters will align with regional fashion even without labels
# (Tamil silk Kanjivaram cluster, Punjabi phulkari cluster, Bengali white cluster)

# Validate by checking cluster membership against labeled regional data
```

**Expected Clusters (hypothesis):**
1. South Indian Silk (Kanjivaram, Banarasi, tissue)
2. Punjabi Phulkari / Lehenja
3. Bengali White-on-White / Satin
4. Western Indian Bandhani / Block Print
5. North Indian Chikankari / Lucknowi
6. Fusion / Contemporary

**Utility:**
- Improve retrieval by biasing toward user's declared heritage
- Identify gaps in user's wardrobe (Tamil user with no silk cluster items)

### 5.3 Outfit Scoring Model Improvements

#### Current CLIP-Only Scoring

```
Score = cosine_similarity(query_embedding, item_embedding)
```

**Limitations:** No cultural awareness, no formality awareness, no complementarity

#### Proposed Multi-Factor Scoring

```python
def outfit_score(
    item: WardrobeItem,
    occasion: OccasionProfile,
    user_heritage: UserHeritage,
    outfit_context: Optional[OutfitContext] = None  # For complete outfit scoring
) -> float:
    # Factor 1: CLIP semantic similarity (0-1)
    clip_score = cosine_similarity(occasion.query_embedding, item.embedding)

    # Factor 2: Cultural appropriateness (0-2 scale mapped to 0-1)
    cultural_score = cultural_appropriateness(item, occasion) / 2.0

    # Factor 3: Formality match (0-1)
    # Exact tier match = 1.0, adjacent tier = 0.7, gap = 0.3
    formality_score = formality_match(item.formality, occasion.formality_tier)

    # Factor 4: Color appropriateness (0-1)
    # Auspicious color in occasion = 1.0, neutral = 0.5, forbidden = 0.0
    color_score = color_appropriateness(item.primaryColor, occasion.colorRules)

    # Factor 5: Region heritage bonus (0-0.2)
    heritage_bonus = 0.2 if item.regionOfOrigin == user_heritage.primaryRegion else 0.0

    # Weighted combination
    weights = {
        'clip': 0.25,
        'cultural': 0.30,
        'formality': 0.25,
        'color': 0.15,
        'heritage': 0.05
    }

    total_score = (
        weights['clip'] * clip_score +
        weights['cultural'] * cultural_score +
        weights['formality'] * formality_score +
        weights['color'] * color_score +
        weights['heritage'] * heritage_bonus
    )

    return total_score
```

#### Scoring Weights Justification

| Factor | Weight | Rationale |
|--------|--------|-----------|
| Cultural appropriateness | 30% | Most differentiating factor for Indian occasions |
| CLIP semantic | 25% | Still handles "find festive items" queries |
| Formality match | 25% | Prevents Tier 3 guest dressing at Tier 1 event |
| Color appropriateness | 15% | Color symbolism is important but not always fatal |
| Heritage bonus | 5% | Small nudge toward user's cultural background |

**Note:** Weights are tunable via A/B testing with user feedback.

### 5.4 Remaining Gaps — Unresolved

#### Gap 1: Exception Handling for Mixed Heritage

**Problem:** User with Tamil mother + Punjabi father wants outfit for "Tamil wedding of cousin"
**Current approach:** Default to Tamil (paternal or maternal preference?)
**What CLIP cannot do:** Resolve cultural conflict preferences

**Proposed mitigation:** Explicit user preference for "whose family" when conflicts exist.

#### Gap 2: Hindu-Muslim Multi-Cultural Users

**Problem:** User is Indian Muslim who wants outfit for Diwali office celebration
**Current approach:** Eid profile vs. Hindu festival profile conflict
**What CLIP cannot do:** Separate religious identity from cultural identity

**Proposed mitigation:** Allow user to specify religion separately from cultural background. Indian Muslim users should get Eid-appropriate suggestions but may celebrate Diwali socially.

#### Gap 3: Second-Generation Diaspora Context

**Problem:** Indian-American user wearing Indian clothes to Diwali party in New York — is this "authentically Indian" or "diaspora fusion"?
**What the app should do:** Acknowledge context; suggest diaspora-fusion interpretations (lighter fabrics, modern cuts) not just traditional.

**Current approach:** Cannot model diaspora context without explicit user flag.

#### Gap 4: Saree Draping Detection

**Problem:** Would require a separate computer vision model to detect draping style from photos
**What CLIP cannot do:** If user uploads a saree image, we know it's a saree but not the drape style

**Proposed mitigation:** Ask user to tag drape style manually, or build drape-specific training set (small, feasible for MVP).

---

## 6. Implementation Roadmap — Phase 2

### Phase 2A: Cultural Knowledge Base (1 session)
- Seed occasion_profiles table with 6 occasion types
- Seed saree_occasion_affinity with basic mappings
- Implement user_heritage table and UI for profile completion

### Phase 2B: Claude Integration (1 session)
- Implement occasion routing prompt
- Connect to Supabase knowledge base
- Return structured recommendations

### Phase 2C: Retrieval Pipeline (1 session)
- Add cultural filter to CLIP retrieval
- Implement multi-factor scoring
- Add dupatta pairing logic

### Phase 2D: UI/UX (1 session)
- Occasion selector (6 occasions + casual)
- Heritage profile onboarding
- Recommendation cards with cultural explanation

### Phase 2E: Saree Draping UI (1 session)
- Drape style selector (7 styles)
- Visual guide for each drape
- Associate drape with wardrobe items

---

## 7. Cross-Reference Audit

### Documents Affected
- `/specs/prompt-closet-spec.md` — Phase 2 scope addition
- `/01-analysis/01-initial-analysis.md` — May need ML gap analysis section added
- Supabase schema — New tables required

### Inconsistencies Found
1. **Phase 1 spec assumed "semantic search" would handle all occasions** — CLIP cannot reason about Tamil wedding gold requirements; Phase 2 knowledge base corrects this
2. **Phase 1 wardrobe schema lacks regionOfOrigin** — Required for heritage-aware retrieval; must be added
3. **Phase 1 saree model has no drape_type field** — Bengali Athpana vs. Nivi distinction impossible without this

### Spec Section Cross-Reference
- `specs/prompt-closet-spec.md` §3.2 (Wardrobe Management) — Add garmentType, regionOfOrigin, fabric, work fields
- `specs/prompt-closet-spec.md` §4.1 (Semantic Search) — Add cultural filter layer after CLIP retrieval
- `specs/prompt-closet-spec.md` §5 (ML Architecture) — Add occasion classifier and formality scorer

---

## 8. Success Criteria — Phase 2

- [ ] User can select occasion (6 types + casual) and receive culturally-appropriate suggestions
- [ ] Black saree NEVER suggested for any wedding occasion
- [ ] Navratri color-of-day correctly routed (all 9 days)
- [ ] Temple visit occasion returns only compliant suggestions (no shorts, no sleeveless)
- [ ] Dupatta pairing offered for applicable garments
- [ ] Saree drape style indicator present on saree recommendations
- [ ] User heritage profile supports regional style biasing
- [ ] Recommendation includes cultural explanation in plain language
- [ ] Cultural filter does not reduce retrieval recall by more than 20% vs. CLIP-only

---

## Appendix A: Color-to-Occasion Quick Reference

| Color | Tamil Wedding | Punjabi Wedding | Diwali | Navratri | Temple | Eid |
|-------|---------------|-----------------|--------|----------|--------|-----|
| Gold | Recommended | Recommended | Recommended | Any | Neutral | Neutral |
| Red | Recommended | Recommended | Recommended | Day 6 only | Neutral | Neutral |
| Black | FORBIDDEN | FORBIDDEN | Avoid | Any | FORBIDDEN | Neutral |
| White | Neutral | Neutral | Avoid | Day 5 only | Neutral | Recommended |
| Green | Neutral | Neutral | Neutral | Day 2 only | Neutral | Recommended |
| Orange | Neutral | Neutral | Recommended | Day 4 only | Neutral | Neutral |
| Pink | Neutral | Neutral | Neutral | Day 8 only | Neutral | Neutral |
| Purple | Neutral | Neutral | Neutral | Day 9 only | Neutral | Neutral |
| Yellow | Neutral | Neutral | Neutral | Day 1 only | Neutral | Neutral |

---

## Appendix B: Region-to-Garment Quick Reference

| Region | Women Primary | Women Secondary | Men Primary | Men Secondary |
|--------|--------------|----------------|------------|--------------|
| Tamil Nadu | Silk saree (pattu) | Cotton saree | Veshti + angavastram | Kurta |
| Punjab | Lehenga choli | Salwar-kameez | Kurta-pyjama | Sherwani |
| Gujarat | Chaniya choli | Saree | Kurta | Sherwani |
| Maharashtra | Saree (Maharashtrian drape) | Kurta-pajama | Dhoti | Kurta |
| West Bengal | Saree (Bengali drape) | Saree (Nivi) | Kurta-pyjama | Sherwani |
| Kerala | Mundum neriyathum | Kasavu saree | Mundu | Kurta |
| Muslim (general) | Abaya + hijab | Saree (Indian Muslim) | Kurta | Sherwani |

---

*Document Version: 1.0 — Phase 2 Analysis*
*Next Phase: /todos → Implementation Planning*
