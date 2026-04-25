# Prompt Closet -- Indian Occasion Flows

**Phase**: User Flows
**Date**: 2026-04-17
**Product**: Prompt Closet

---

## Flow Overview

Five user flows covering occasion detection, heritage setup, saree draping, Diwali outfitting, and Navratri day-color matching. These flows extend the Magic Bar from Phase 1 with cultural context awareness.

---

## Flow 1: Occasion Query Flow

**Trigger**: User types an occasion-referenced query into the Magic Bar.

**Entry Point**: Magic Bar expanded or rail tapped.

---

### Screen: Magic Bar Input

```
+-------------------------------------------+
|  [x]                    Style Assistant   |
+-------------------------------------------+
|                                           |
|  Recent:                                  |
|  > "rainy day outfit"        2 outfits    |
|                                           |
+-------------------------------------------+
|  [mic]  Something for my cousin's        |
|          Tamil wedding in Chennai         |
|                              [send >]    |
+-------------------------------------------+
```

**User types**: "something for my cousin's Tamil wedding in Chennai"

**Interactions**:

- Voice input available (mic icon)
- Typing autocomplete from past queries
- Submit via send button or keyboard return

---

### Screen: Occasion Detection

```
+-------------------------------------------+
|  [x]                    Style Assistant   |
+-------------------------------------------+
|                                           |
|  Detected: Tamil Wedding                  |
|  +-----------------------------------+    |
|  |  We see this is a South Indian    |    |
|  |  wedding. Showing lehenga and      |    |
|  |  silk saree options.               |    |
|  +-----------------------------------+    |
|                                           |
|  Confirm occasion:                        |
|  [Tamil Wedding v]  [Change]              |
|                                           |
+-------------------------------------------+
```

**System Behavior**:

1. Query sent to Claude occasion router
2. Returns: `TAMIL_WEDDING`, region hint: South India
3. Show detection card with confirmation option
4. "Change" allows user to override to a different occasion

**Confidence Threshold**:
- If confidence >= 0.8: auto-detect, show confirmation
- If confidence 0.6-0.8: show with "Are you sure?" prompt
- If confidence < 0.6: "What kind of occasion is this?" with quick-select

---

### Screen: Loading -- Cultural Context Loading

```
+-------------------------------------------+
|  [x]                    Style Assistant   |
+-------------------------------------------+
|                                           |
|  Finding outfits for Tamil Wedding...     |
|                                           |
|  Applying cultural filters:               |
|  [OK] Tier matching                      |
|  [OK] Color appropriateness              |
|  [OK] Region preference                  |
|  [..] Taboo check                        |
|                                           |
+-------------------------------------------+
```

**System Behavior**:

- Stream of consciousness: shows which scoring factors are being applied
- This is the Phase 1 streaming UI adapted to show cultural processing steps

---

### Screen: Results -- Outfit Suggestions

```
+-------------------------------------------+
|  [x]        Tamil Wedding Outfits         |
+-------------------------------------------+
|
|  +----------------------------------+     |
|  | [IMG]                            |     |
|  | Kanjeevaram Silk Saree           |     |
|  | Deep red with gold zari border   |     |
|  |                                  |     |
|  | Tier 4 (Formal) | Region: South  |     |
|  |                                  |     |
|  | [Cultural note]                   |     |
|  | "This follows Tamil bride guest  |     |
|  | guidelines -- jewel tones with    |     |
|  | gold preferred"                  |     |
|  |                                  |     |
|  | [Save to Outfit]  [View Details] |     |
|  +----------------------------------+     |
|                                           |
|  +----------------------------------+     |
|  | [IMG]                            |     |
|  | Embroidered Lehenga Choli         |     |
|  | Maroon with contrast blouse      |     |
|  |                                  |     |
|  | Tier 4 (Formal) | Region: North  |     |
|  |                                  |     |
|  | [Cultural note]                   |     |
|  | "Lehenga is widely accepted at   |     |
|  | South Indian weddings; opt for    |     |
|  | rich fabrics like silk or velvet" |     |
|  |                                  |     |
|  | [Save to Outfit]  [View Details] |     |
|  +----------------------------------+     |
|                                           |
|  +----------------------------------+     |
|  | [IMG]                            |     |
|  | Contrast Saree with Blouse       |     |
|  | Gold saree, red silk blouse     |     |
|  |                                  |     |
|  | Tier 4 (Formal) | Region: Mixed  |     |
|  |                                  |     |
|  | [Cultural note]                   |     |
|  | "Gold is deeply auspicious at    |     |
|  | South Indian weddings; avoids     |     |
|  | white and black entirely"        |     |
|  |                                  |     |
|  | [Save to Outfit]  [View Details] |     |
|  +----------------------------------+     |
|                                           |
+-------------------------------------------+
|  [mic]  Something for my cousin's        |
|          Tamil wedding in Chennai         |
+-------------------------------------------+
```

**Cultural Notes**:
Each suggestion card shows a contextual note explaining why this item fits the detected occasion. These notes come from the occasion profile's description + item-specific color/garment metadata.

**Sort order**: Highest multi-factor score first.

---

### Screen: Results -- Filtered by "Avoid"

```
+-------------------------------------------+
|  [x]        Tamil Wedding Outfits         |
+-------------------------------------------+
|  [Cultural Filter: On] [Edit]             |
|                                           |
|  Showing items avoiding:                  |
|  White, Black, Western formal            |
|                                           |
|  +------------------------------------+   |
|  | Results 1-3 of 12 matched         |   |
|  +------------------------------------+   |
|                                           |
|  [Outfit Card 1 - see above]              |
|  [Outfit Card 2 - see above]              |
|  [Outfit Card 3 - see above]              |
|                                           |
|  [Show items skipped by cultural filter]  |
|                                           |
+-------------------------------------------+
```

**Edit Filter Interaction**:
Tapping "Edit" allows user to toggle specific taboo items on/off for this query.

---

## Flow 2: Heritage Setup Flow

**Trigger**: First launch after Phase 2 deployment OR user navigates to Style Profile and taps "Cultural Background".

**Entry Point**: Style Profile tab OR first-run onboarding (gated optional step).

---

### Screen: Style Profile -- Heritage Section

```
+-------------------------------------------+
|  [<]       Style Profile                  |
+-------------------------------------------+
|                                           |
|  Your Background                          |
|  +----------------------------------+     |
|  | Primary Region                   |     |
|  | South India                   [>] |     |
|  +----------------------------------+     |
|                                           |
|  +----------------------------------+     |
|  | Secondary Region                 |     |
|  | Not set                       [>] |     |
|  +----------------------------------+     |
|                                           |
|  +----------------------------------+     |
|  | Recommendation Style              |     |
|  | Focus on my tradition         [>] |     |
|  +----------------------------------+     |
|                                           |
|  [What's this?]                           |
|                                           |
+-------------------------------------------+
```

---

### Screen: Heritage Selection -- Primary Region

```
+-------------------------------------------+
|  [<]         Primary Region               |
+-------------------------------------------+
|                                           |
|  Which region best describes your         |
|  cultural background?                    |
|                                           |
|  (Optional -- helps personalize)          |
|                                           |
|  +-----------------------------------+    |
|  | [ ] North India                    |    |
|  |     Punjabi, Kashmiri, UP/Bihar   |    |
|  +-----------------------------------+    |
|  | [ ] South India                    |    |
|  |     Tamil, Telugu, Kannada, Malayalam|   |
|  +-----------------------------------+    |
|  | [ ] East India                     |    |
|  |     Bengali, Odia, Assamese        |    |
|  +-----------------------------------+    |
|  | [ ] West India                    |    |
|  |     Gujarati, Marathi, Rajasthani  |    |
|  +-----------------------------------+    |
|  | [ ] Mixed / Multiple Traditions    |    |
|  |     I have family from multiple    |    |
|  |     regions                        |    |
|  +-----------------------------------+    |
|                                           |
|           [Continue]                      |
|                                           |
+-------------------------------------------+
```

**Interactions**:
- Single select radio buttons
- Each option shows example sub-cultures
- Selecting an option highlights the row

---

### Screen: Heritage Selection -- Secondary Region

```
+-------------------------------------------+
|  [<]       Secondary Region               |
+-------------------------------------------+
|
|  Do you have another cultural             |
|  background?                              |
|
|  (Optional)
|
|  +-----------------------------------+
|  | [ ] North India                    |
|  +-----------------------------------+
|  | [ ] South India                    |
|  +-----------------------------------+
|  | [ ] East India                     |
|  +-----------------------------------+
|  | [ ] West India                    |
|  +-----------------------------------+
|  | [x] None -- Single heritage       |  <-- Default selected
|  +-----------------------------------+
|
|           [Continue]
|
+-------------------------------------------+
```

---

### Screen: Heritage Selection -- Recommendation Style

```
+-------------------------------------------+
|  [<]     Recommendation Style             |
+-------------------------------------------+
|                                           |
|  How would you like cultural suggestions  |
|  to be tailored?                         |
|                                           |
|  +-----------------------------------+    |
|  |                                   |    |
|  | O General -- across all traditions|    |
|  |   "Show me what's appropriate"   |    |
|  |                                   |    |
|  +-----------------------------------+    |
|                                           |
|  +-----------------------------------+    |
|  |                                   |    |
|  | O My tradition -- personalized    |    |
|  |   "Prioritize my background"     |    |
|  |                                   |    |
|  +-----------------------------------+    |
|                                           |
|           [Continue]                      |
|                                           |
+-------------------------------------------+
```

**Mode Descriptions**:

| Mode         | Behavior                                               |
| ------------ | ------------------------------------------------------ |
| General      | System recommends across all Indian traditions equally  |
| My Tradition | System prioritizes your selected region's preferences |

---

### Screen: Heritage Confirmation

```
+-------------------------------------------+
|  [<]       Style Profile                  |
+-------------------------------------------+
|                                           |
|  +----------------------------------+     |
|  | Background saved                  |     |
|  |                                  |     |
|  | Primary: South India             |     |
|  | Style: My Tradition             |     |
|  +----------------------------------+     |
|                                           |
|  Your next outfit suggestions will        |
|  reflect South Indian cultural            |
|  preferences.                             |
|                                           |
|  [Edit]                                   |
|                                           |
+-------------------------------------------+
```

---

## Flow 3: Saree Drape Suggestion Flow

**Trigger**: User adds a saree item to their closet OR taps an existing saree in their wardrobe.

**Entry Point**: Camera capture completed OR saree item detail screen.

---

### Screen: Review Tags (Saree Item)

```
+-------------------------------------------+
|  [<]         Review Tags                  |
+-------------------------------------------+
|
|  [IMG: saree image]                      |
|
|  Detected: Saree                         |
|  Confidence: High                        |
|
|  Saree Details (Optional)                |
|  +----------------------------------+    |
|  | Drape Style                      |    |
|  | [Not set                      v] |    |
|  +----------------------------------+    |
|                                           |
|  +----------------------------------+    |
|  | Blouse Color                     |    |
|  | [Not set                      v] |    |
|  +----------------------------------+    |
|                                           |
|  +----------------------------------+    |
|  | Border Type                      |    |
|  | [Not set                      v] |    |
|  +----------------------------------+    |
|                                           |
|  +----------------------------------+    |
|  | Pallu Design                    |    |
|  | [Not set                      v] |    |
|  +----------------------------------+    |
|                                           |
|           [Save to Closet]                 |
|                                           |
+-------------------------------------------+
```

**Drape Style Dropdown Options**:

- Not set
- Nivi (Standard) -- Pan-India
- Bengali Style -- East India
- Gujarati Style -- West India
- Maharashtrian Style -- West India
- Mysore Style -- South India
- Madisaar -- South India (Brahminical)

---

### Screen: Occasion Query on Saree

```
+-------------------------------------------+
|  [x]                    Style Assistant   |
+-------------------------------------------+
|                                           |
|  What would you like to wear this         |
|  saree for?                               |
|                                           |
|  +------------------------------------+   |
|  | Search occasions or type naturally |   |
|  +------------------------------------+   |
|                                           |
|  Try:                                     |
|  "Tamil wedding"                         |
|  "Diwali celebration"                    |
|  "Temple visit"                          |
|                                           |
+-------------------------------------------+
```

---

### Screen: Drape Suggestion Result

```
+-------------------------------------------+
|  [x]         Drape Suggestion             |
+-------------------------------------------+
|                                           |
|  [IMG: saree image]                      |
|  Royal Blue Silk Saree                   |
|                                           |
|  For Tamil Wedding:                      |
|  +----------------------------------+    |
|  | We recommend Nivi drape          |    |
|  | with gold zari border styling.   |    |
|  +----------------------------------+    |
|                                           |
|  Suggested blouse: Gold silk blouse      |
|  (contrast with royal blue)              |
|                                           |
|  Pallu style: Classic drape with          |
|  contrast pallu showing                  |
|                                           |
|  +----------------------------------+     |
|  | Why this works:                  |     |
|  | Nivi is the most versatile drape |     |
|  | and is widely accepted at South  |     |
|  | Indian weddings. Gold blouse     |     |
|  | creates auspicious contrast for   |     |
|  | a wedding guest look.            |     |
|  +----------------------------------+     |
|                                           |
|  [Save Drape Notes]  [Start Over]        |
|                                           |
+-------------------------------------------+
```

---

## Flow 4: Diwali Outfit Flow

**Trigger**: User queries "festive Diwali outfit", "Diwali celebration", "Diwali party", or similar.

**Entry Point**: Magic Bar input.

---

### Screen: Magic Bar -- Diwali Query

```
+-------------------------------------------+
|  [x]                    Style Assistant   |
+-------------------------------------------+
|                                           |
|  Recent:                                  |
|  > "rainy day outfit"        2 outfits   |
|                                           |
+-------------------------------------------+
|  [mic]  festive Diwali outfit            |
|                              [send >]     |
+-------------------------------------------+
```

---

### Screen: Cultural Sensitivity Note

```
+-------------------------------------------+
|  [x]              Diwali Outfits          |
+-------------------------------------------+
|                                           |
|  Detected: Diwali                         |
|  +-----------------------------------+    |
|  |  Note: Some families avoid black  |    |
|  |  at Diwali. We've filtered those |    |
|  |  items but you can toggle this   |    |
|  |  in cultural preferences.       |    |
|  +-----------------------------------+    |
|                                           |
|  [Keep Filter]  [Show All]               |
|                                           |
+-------------------------------------------+
```

**User Choice**:
- "Keep Filter": Apply black-avoidance filter
- "Show All": Include black items with caveat note

---

### Screen: Diwali Results

```
+-------------------------------------------+
|  [x]           Diwali Outfits             |
+-------------------------------------------+
|                                           |
|  Gold and warm tones for Diwali           |
|  +----------------------------------+     |
|                                           |
|  +----------------------------------+     |
|  | [IMG]                            |     |
|  | Gold Silk Saree                  |     |
|  | Rich gold with red border        |     |
|  |                                  |     |
|  | Tier 4 (Formal) | Gold/Auspicious|     |
|  |                                  |     |
|  | [Cultural note]                  |     |
|  | "Gold is the most auspicious    |     |
|  | color for Diwali -- symbolizes   |     |
|  | wealth and prosperity"          |     |
|  +----------------------------------+     |
|                                           |
|  +----------------------------------+     |
|  | [IMG]                            |     |
|  | Maroon Kurta Set                 |     |
|  | Silk kurta with gold embroidery  |     |
|  |                                  |     |
|  | Tier 3-4 | Maroon/Auspicious     |     |
|  |                                  |     |
|  | [Cultural note]                  |     |
|  | "Maroon represents prosperity   |     |
|  | and is warm-tone appropriate    |     |
|  | for Diwali gatherings"         |     |
|  +----------------------------------+     |
|                                           |
|  +----------------------------------+     |
|  | [IMG]                            |     |
|  | Orange Anarkali Suit             |     |
|  | Chiffon with gold print          |     |
|  |                                  |     |
|  | Tier 3 (Festive) | Orange        |     |
|  |                                  |     |
|  | [Cultural note]                  |     |
|  | "Orange is the traditional      |     |
|  | Diwali color -- represents      |     |
|  | new beginnings and joy"          |     |
|  +----------------------------------+    |
|                                           |
|  [Fusion Options] [Traditional Only]      |
|                                           |
+-------------------------------------------+
```

**Tab Filter**: Tapping "Fusion Options" shows contemporary Diwali outfits (Indo-western, fusion wear). "Traditional Only" shows classic ethnic.

---

## Flow 5: Navratri Day-Color Flow

**Trigger**: User queries "something for Navratri" or "Navratri outfit".

**Entry Point**: Magic Bar input.

---

### Screen: Day Selection Prompt

```
+-------------------------------------------+
|  [x]           Navratri Outfits           |
+-------------------------------------------+
|                                           |
|  Detected: Navratri                       |
|  +-----------------------------------+    |
|  | Navratri has specific colors for  |    |
|  | each of its 9 days. Which day    |    |
|  | are you dressing for?            |    |
|  +-----------------------------------+    |
|                                           |
|  Or select a date and we'll infer:       |
|  +-----------------------------------+    |
|  | [October 22, 2026            v]  |    |
|  +-----------------------------------+    |
|                                           |
|  Day-specific colors:                    |
|  Day 1: Yellow    Day 2: Green           |
|  Day 3: Grey      Day 4: Orange          |
|  Day 5: White     Day 6: Red             |
|  Day 7: Royal Blue  Day 8: Pink          |
|  Day 9: Sky Blue                          |
|                                           |
|  [I don't mind which day -- show all]    |
|                                           |
+-------------------------------------------+
```

---

### Screen: Day-Specific Results (Day 3 Grey)

```
+-------------------------------------------+
|  [x]      Navratri -- Day 3 (Grey)        |
+-------------------------------------------+
|                                           |
|  Day 3: Grey                              |
|  +-----------------------------------+    |
|  |  Grey represents peace and calm. |    |
|  |  Some traditions avoid grey --   |    |
|  |  if your family observes this,   |    |
|  |  toggle in preferences.          |    |
|  +-----------------------------------+    |
|                                           |
|  Suggested items in grey tones:           |
|                                           |
|  +----------------------------------+    |
|  | [IMG]                            |     |
|  | Silver-Grey Chaniya Choli        |     |
|  | Grey georgette with silver embroidery|  |
|  |                                  |     |
|  | Tier 3 (Festive) | Grey          |     |
|  |                                  |     |
|  | [Cultural note]                  |     |
|  | "Grey is Day 3's color at       |     |
|  | Navratri -- pair with silver    |     |
|  | accessories for a cohesive look" |     |
|  +----------------------------------+    |
|                                           |
|  +----------------------------------+    |
|  | [IMG]                            |     |
|  | Charcoal Saree with Blouse       |     |
|  | Dark grey silk, contrast blouse  |     |
|  |                                  |     |
|  | Tier 3-4 (Festive) | Dark Grey  |     |
|  |                                  |     |
|  | [Cultural note]                  |     |
|  | "Darker greys work for evening   |     |
|  | Garba sessions; avoid black     |     |
|  | accessories (grey ≠ black)"     |     |
|  +----------------------------------+    |
|                                           |
|  [Show all 9-day color options]           |
|                                           |
+-------------------------------------------+
```

---

### Screen: 9-Day Color Overview

```
+-------------------------------------------+
|  [x]     Navratri Color Guide              |
+-------------------------------------------+
|                                           |
|  Each day has a traditional color:        |
|                                           |
|  Day 1: Yellow  -- Happiness             |
|  Day 2: Green   -- Nature                 |
|  Day 3: Grey   -- Peace                  |
|  Day 4: Orange  -- Courage                |
|  Day 5: White  -- Purity                 |
|  Day 6: Red    -- Power                  |
|  Day 7: Royal Blue -- Nobility            |
|  Day 8: Pink   -- Love                  |
|  Day 9: Sky Blue -- Devotion             |
|                                           |
|  Tap a day to see suggestions:            |
|                                           |
|  [1] [2] [3] [4] [5] [6] [7] [8] [9]    |
|                                           |
+-------------------------------------------+
```

**Interactions**:
- Tap any day number to jump to suggestions for that day
- Shows count badge if user has items matching that day's color

---

## Screen Sketch Appendix

### Magic Bar with Occasion Chip

```
+-------------------------------------------+
|  [sparkle]  Diwali party outfit     [>]  |
+-------------------------------------------+
|  | Closet | Style | Camera | Search | Me  |
+-------------------------------------------+
```

### Occasion Quick-Select Chips

```
+-------------------------------------------+
|  Suggested occasions:                     |
|  [Tamil Wedding] [Diwali] [Navratri]     |
|  [Punjabi Wedding] [Eid] [Temple]         |
+-------------------------------------------+
```

### Cultural Note Badge (on item card)

```
+------------------------------------------+
|  [Cultural Note]                         |
|  "Gold is auspicious at South Indian     |
|  weddings -- avoid white and black"      |
+------------------------------------------+
```

### Heritage Badge (on item card)

```
+------------------------------------------+
|  [Heritage Match]                        |
|  "This matches your South Indian        |
|  background preference"                 |
+------------------------------------------+
```

---

## Error States

### Ambiguous Query

```
+-------------------------------------------+
|  [x]                    Style Assistant   |
+-------------------------------------------+
|                                           |
|  Not sure what occasion you mean.         |
|                                           |
|  Did you mean:                            |
|  [Tamil Wedding]  [Punjabi Wedding]      |
|  [Diwali]         [Navratri]             |
|  [Temple]         [Eid]                   |
|  [Something else / General]               |
|                                           |
+-------------------------------------------+
```

### No Items Match Cultural Filter

```
+-------------------------------------------+
|  [x]                    Style Assistant   |
+-------------------------------------------+
|                                           |
|  No items match all cultural filters.     |
|                                           |
|  We found 3 items that match most rules  |
|  but violate:                            |
|                                           |
|  - 1 item uses white (taboo at this      |
|    occasion)                              |
|  - 2 items are too casual (Tier 2 vs     |
|    required Tier 4)                      |
|                                           |
|  [Show These Anyway] [Relax Filters]      |
|                                           |
+-------------------------------------------+
```

### Heritage Not Set

```
+-------------------------------------------+
|  [x]                    Style Assistant   |
+-------------------------------------------+
|                                           |
|  Detected: Punjabi Wedding               |
|                                           |
|  Set your cultural background to get      |
|  personalized regional suggestions.       |
|                                           |
|  [Set Now]  [Skip / General Mode]        |
|                                           |
+-------------------------------------------+
```
