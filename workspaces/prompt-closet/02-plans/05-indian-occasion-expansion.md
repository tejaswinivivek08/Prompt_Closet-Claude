# Prompt Closet -- Indian Occasion Expansion Plan

**Phase**: 02-Plans
**Date**: 2026-04-17
**Status**: Draft for approval

---

## 1. Executive Summary

Phase 2 adds Indian cultural fashion intelligence to Prompt Closet. Where Phase 1 built the wardrobe grid, auto-tagging, semantic search, and Magic Bar, Phase 2 equips the system to understand Indian occasion contexts -- Tamil Wedding vs. Punjabi Wedding vs. Diwali vs. Navratri vs. Temple vs. Eid -- and provide culturally appropriate outfit recommendations with regional nuance.

This document covers data model changes, the multi-factor scoring pipeline, saree draping logic, dupatta pairing, and three ADRs governing knowledge representation, occasion routing, and scoring weights.

---

## 2. Feature Inventory

### 2.1 Occasion Profiles

**What**: Structured cultural knowledge base for six Indian occasion types.

**Deliverables:**

- [ ] `occasion_profiles` table in Supabase
- [ ] Seed data for all six occasions
- [ ] Prompt engineering for Claude to route user queries to correct profile

**Data Model:**

```sql
CREATE TABLE occasion_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,               -- "Tamil Wedding", "Punjabi Wedding", etc.
  region TEXT NOT NULL,              -- "South India", "North India", "All India", "Pan-India"
  min_formality INTEGER NOT NULL CHECK (min_formality BETWEEN 1 AND 5),
  max_formality INTEGER NOT NULL CHECK (max_formality BETWEEN 1 AND 5),
  color_rules JSONB NOT NULL,       -- { "auspicious": [...], "forbidden": [...], "preferred": [...] }
  garment_types TEXT[] NOT NULL,    -- ["saree", "lehenga", "kurta", "sherwani"]
  taboo_items TEXT[] NOT NULL,      -- ["white", "black", "animal embroidery"]
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_occasion_profiles_region ON occasion_profiles(region);
CREATE INDEX idx_occasion_profiles_name ON occasion_profiles(name);
```

**Occasion Profile Seed Data:**

| Occasion           | Region       | Formality Range | Key Colors                    | Key Garments          | Taboos                    |
| ------------------ | ------------ | --------------- | ----------------------------- | --------------------- | ------------------------- |
| Tamil Wedding      | South India  | 4-5            | Gold, Red, Maroon, Green      | Kanjeevaram, Silk saree | White, Black, Western     |
| Punjabi Wedding    | North India  | 4-5            | Red, Gold, Fuchsia, Cream     | Lehenga, Sharara      | All-black, Western formal  |
| Diwali             | Pan-India    | 3-5            | Gold, Orange, Red, Yellow     | Saree, Kurta, Lehenga | Black (many families)     |
| Navratri           | West/North   | 3-5            | Day-specific (see below)      | Chaniya choli, saree  | White, Black              |
| Temple             | Pan-India    | 3-5            | White, Yellow, Saffron, Red   | Saree, Dhoti, Kurta  | Western, Shorts           |
| Eid                | Pan-India    | 4-5            | Emerald, Gold, White, Pastels | Shalwar kameez, Saree | Black (some traditions)    |

**Navratri Day-Color Mapping:**

| Day    | Color       | Significance               |
| ------ | ----------- | -------------------------- |
| Day 1  | Yellow      | Goddess Durga / Happiness  |
| Day 2  | Green       | Goddess Durga / Nature     |
| Day 3  | Grey        | Goddess Durga / Peace       |
| Day 4  | Orange      | Goddess Durga / Courage    |
| Day 5  | White       | Goddess Durga / Purity     |
| Day 6  | Red         | Goddess Durga / Power      |
| Day 7  | Royal Blue  | Goddess Durga / Nobility   |
| Day 8  | Pink        | Goddess Durga / Love       |
| Day 9  | Sky Blue     | Goddess Durga / Devotion   |

**Occasion Routing Prompt (Claude):**

```
You are a cultural fashion advisor specializing in Indian occasions.

Given a user query, identify the occasion type from this list:
- TAMIL_WEDDING
- PUNJABI_WEDDING
- DIWALI
- NAVRATRI
- TEMPLE
- EID
- GENERAL (no specific occasion detected)

Respond with JSON:
{
  "occasion": "OCCASION_CODE",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "inferrable_context": { "formality_hint": "1-5", "region_hint": "if detected" }
}

Examples:
- "cousin's wedding in Chennai" -> TAMIL_WEDDING, confidence 0.95
- "Navratri outfit for day 3" -> NAVRATRI, confidence 1.0
- "something comfy for temple" -> TEMPLE, confidence 0.85
- "casual Friday" -> GENERAL, confidence 0.5
```

---

### 2.2 User Heritage Schema

**What**: Captures user cultural background to personalize recommendations.

**Deliverables:**

- [ ] `user_heritage` table in Supabase
- [ ] Heritage setup UI in onboarding
- [ ] Heritage preference in retrieval pipeline

**Data Model:**

```sql
CREATE TABLE user_heritage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  primary_region TEXT NOT NULL,                    -- "North India", "South India", "East India", "West India", "Mixed"
  secondary_region TEXT,                          -- Optional second region for mixed heritage
  preference_mode TEXT NOT NULL DEFAULT 'general' CHECK (preference_mode IN ('general', 'my_tradition')),
  -- preference_mode 'general' = system recommends across traditions
  -- preference_mode 'my_tradition' = system prioritizes user's own tradition
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_heritage_user_id ON user_heritage(user_id);
```

**Heritage Selection UI:**

```
+-------------------------------------------+
|  Your Style Background                    |
|  (Optional -- helps us personalize)       |
+-------------------------------------------+
|                                           |
|  Primary Region                           |
|  +-----------------------------------+    |
|  | [South India                   v] |    |
|  +-----------------------------------+    |
|                                           |
|  Secondary Region (optional)              |
|  +-----------------------------------+    |
|  | [None                         v] |    |
|  +-----------------------------------+    |
|                                           |
|  Recommendation Style                     |
|  O General guidance across traditions     |
|  O Focus on my heritage specifically      |
|                                           |
|           [Continue]                      |
+-------------------------------------------+
```

---

### 2.3 Multi-Factor Scoring Pipeline

**What**: Hybrid retrieval that combines CLIP embedding similarity with cultural appropriateness scoring.

**Deliverables:**

- [ ] Modify `semanticSearch` function to accept `occasion_context` parameter
- [ ] Implement five-factor scoring
- [ ] Weight configuration
- [ ] Fallback when no occasion is specified

**Scoring Factors:**

| Factor                  | Weight | Description                                          |
| ---------------------- | ------ | ---------------------------------------------------- |
| CLIP Cosine Similarity | 25%    | Visual/emantic match from Phase 1 vector search      |
| Cultural Appropriateness| 30%    | Is item allowed for this occasion (taboo check)       |
| Formality Match        | 25%    | Item formality tier vs. occasion formality range    |
| Color Symbolism        | 15%    | Auspicious vs. forbidden colors for occasion        |
| Heritage Bonus         | 5%     | Regional preference match from user_heritage         |

**Total = 100%**

**Scoring Algorithm:**

```
score(item, occasion_context, user_heritage):
  clip_score = item.clip_similarity  # 0.0-1.0 from Phase 1

  cultural_score =
    if occasion_context is None: 1.0  # no penalty without occasion context
    else if item.category in occasion.taboo_items: 0.0
    else: 1.0

  formality_score =
    let item_f = item.formality_score  # 1-5 from tagging
    let min_f = occasion_context.min_formality
    let max_f = occasion_context.max_formality
    if min_f <= item_f <= max_f: 1.0
    else: 0.5 * (1 - max(abs(item_f - min_f), abs(item_f - max_f)) / 4)

  color_score =
    if occasion_context is None: 1.0
    else if item.primary_color in occasion.color_rules.forbidden: 0.0
    else if item.primary_color in occasion.color_rules.preferred: 1.0
    else if item.primary_color in occasion.color_rules.auspicious: 0.8
    else: 0.5

  heritage_score =
    if user_heritage is None OR preference_mode = 'general': 0.5
    else if item.detected_region == user_heritage.primary_region: 1.0
    else if item.detected_region == user_heritage.secondary_region: 0.75
    else: 0.25

  total = (0.25 * clip_score) +
          (0.30 * cultural_score) +
          (0.25 * formality_score) +
          (0.15 * color_score) +
          (0.05 * heritage_score)

  return total
```

**API Signature Change:**

```typescript
// Before (Phase 1)
semanticSearch(query: string, filters?: SearchFilters): Promise<ScoredItem[]>

// After (Phase 2)
semanticSearch(
  query: string,
  filters?: SearchFilters,
  occasionContext?: {
    occasion: OccasionCode,
    dayNumber?: number,  // For Navratri
    formalityHint?: number
  }
): Promise<ScoredItem[]>
```

---

### 2.4 Saree Draping Suggestions

**What**: Extends wardrobe items with drape-style metadata and provides occasion-aware draping suggestions.

**Deliverables:**

- [ ] Add `saree_details` column to `wardrobe_items`
- [ ] Create `saree_drape_styles` reference table
- [ ] Drape suggestion logic in outfit engine
- [ ] UI for saree detail entry during item add

**Data Model:**

```sql
-- Reference table for valid drape styles
CREATE TABLE saree_drape_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_code TEXT NOT NULL UNIQUE,  -- "nivi", "bengali", "gujrati", "maharashtrian", "mysore", "madisaar"
  style_name TEXT NOT NULL,          -- "Nivi (Standard)", "Bengali Style", etc.
  description TEXT,
  region TEXT,                       -- Origin region
  best_for TEXT[]                    -- ["wedding", "festival", "casual"]
);

-- Extend wardrobe_items with saree-specific fields
ALTER TABLE wardrobe_items ADD COLUMN saree_details JSONB;
-- Shape: { "drape_style": "nivi", "blouse_color": "maroon", "border_type": "gold_zari", "pallu_design": "contrast" }
```

**Saree Drape Style Reference:**

| Code         | Name                | Region        | Best For                  | Blouse Guidance                            |
| ------------ | ------------------- | ------------- | -------------------------- | ------------------------------------------ |
| nivi         | Nivi (Standard)     | Pan-India     | General, Festival, Wedding | Contrast blouse recommended                |
| bengali      | Bengali Style       | East India    | Festival, Temple           | Matching or contrast, short sleeves        |
| gujrati      | Gujarati Style      | West India    | Navratri, Festival        | Choli style, often matching saree          |
| maharashtrian| Maharashtrian Style | West India    | Festival, Temple           | Contrast blouse, nauvari drape            |
| mysore       | Mysore Style        | South India   | Temple, Wedding            | Silk blouse, traditional zari border       |
| madisaar     | Madisaar            | South India   | Brahminical, Temple       | Traditional, specific to Iyengar communities|

**Draping Suggestion Logic:**

```
suggest_drape(saree, occasion_context, user_heritage):
  if occasion_context.occasion == TAMIL_WEDDING:
    if user_heritage?.primary_region == "South India":
      return { style: "mysore", confidence: 0.9, note: "Traditional for Tamil brides" }
    else:
      return { style: "nivi", confidence: 0.7, note: "Elegant standard drape" }

  else if occasion_context.occasion == NAVRATRI:
    if user_heritage?.primary_region in ["West India", "North India"]:
      return { style: "gujrati", confidence: 0.9, note: "Traditional for Garba/Raas" }
    else:
      return { style: "nivi", confidence: 0.6, note: "Versatile drape works for all" }

  else if occasion_context.occasion == TEMPLE:
    return { style: "bengali", confidence: 0.85, note: "Traditional temple attendance drape" }

  else if occasion_context.occasion == EID:
    return { style: "nivi", confidence: 0.8, note: "Elegant and respectful" }

  else:
    return { style: "nivi", confidence: 0.5, note: "Universal drape" }
```

---

### 2.5 Dupatta Pairing Logic

**What**: Rule-based and prompt-based dupatta pairing for kurta/suit combinations.

**Deliverables:**

- [ ] Dupatta pairing rules engine
- [ ] Claude prompt for advanced pairing suggestions
- [ ] UI to show pairing suggestions on kurta items

**Rule-Based Pairing:**

| Kurti/Kurta Type     | Recommended Dupatta | Reasoning                            |
| -------------------- | ------------------- | ------------------------------------ |
| Silk Kurta           | Georgette Dupatta  | Contrast texture, balance weight     |
| Cotton Kurta         | Cotton Dupatta      | Match weight and breathability        |
| Anarkali             | Chiffon Dupatta     | Flow with Anarkali silhouette        |
| Straight Cut Kurta   | Linen Dupatta       | Structural harmony                   |
| Sharara/Kurta        | Matching Sharara dupatta | Coordinated look              |

**Color Pairing Rules:**

```
pair_dupatta(kurta, occasion_context):
  kurta_color = kurta.primary_color
  kurta_fabric = kurta.fabric_type

  # Contrast pairing (most versatile)
  contrast_pairs = {
    "red": ["green", "gold", "white"],
    "blue": ["silver", "copper", "cream"],
    "green": ["red", "gold", "pink"],
    "yellow": ["maroon", "blue", "green"],
    "maroon": ["cream", "gold", "white"]
  }

  # Match pairing (subtle)
  match_pairs = {
    "red": ["maroon", "burgundy", "pink"],
    "blue": ["navy", "royal blue", "indigo"],
    "green": ["forest", "emerald", "sage"]
  }

  if occasion_context?.occasion in [DIWALI, PUNJABI_WEDDING, TAMIL_WEDDING]:
    # Festive/wedding: prefer contrast + gold accents
    return select_best_contrast_pair(kurta_color, contrast_pairs, prefer_gold=true)
  else if occasion_context?.occasion == TEMPLE:
    # Temple: prefer simple, subtle matching
    return select_best_match_pair(kurta_color, match_pairs)
  else:
    # General: default to contrast
    return select_best_contrast_pair(kurta_color, contrast_pairs)
```

**Claude Prompt for Advanced Pairing:**

```
You are a fashion styling expert specializing in Indian ethnic wear.

Given a kurta or suit item and an occasion context, suggest dupatta pairing options.

Respond with JSON:
{
  "primary_recommendation": {
    "dupatta_type": "description",
    "color": "suggested color",
    "material": "fabric type",
    "reasoning": "why this works for the occasion"
  },
  "alternative_options": [
    { "dupatta_type": "...", "color": "...", "material": "...", "reasoning": "..." }
  ],
  "avoid": ["colors/materials to avoid", "with reasoning"]
}
```

---

## 3. Implementation Order

| Order | Feature                        | Rationale                                              |
| ----- | ------------------------------ | ------------------------------------------------------ |
| 1     | Occasion Profiles table + seed | All downstream features depend on occasion context     |
| 2     | User Heritage table + UI       | Heritage bonus factor needs this data                  |
| 3     | Modify semanticSearch           | Core retrieval change; affects all searches           |
| 4     | Saree Drape Styles table       | Reference data; simpler than scoring pipeline           |
| 5     | Saree Draping Suggestions      | Depends on occasion profiles + drape styles            |
| 6     | Dupatta Pairing Logic          | Depends on occasion profiles; independent of saree     |

---

## 4. Database Migration Order

```sql
-- Migration 001: Occasion Profiles
CREATE TABLE occasion_profiles (...);
INSERT INTO occasion_profiles (name, region, ...) VALUES ...;

-- Migration 002: User Heritage
CREATE TABLE user_heritage (...);

-- Migration 003: Saree Drape Styles
CREATE TABLE saree_drape_styles (...);
INSERT INTO saree_drape_styles (style_code, style_name, ...) VALUES ...;

-- Migration 004: Extend wardrobe_items
ALTER TABLE wardrobe_items ADD COLUMN saree_details JSONB;
```

---

## 5. Architecture Decision Records

### ADR-001: Knowledge Base Approach -- Rules vs. Learned

**Context**: Indian cultural fashion knowledge (color appropriateness, garment suitability, regional preferences) can be encoded as explicit rules or learned from data.

**Options:**

**A. Pure Rules Engine**
All occasion knowledge hardcoded as explicit if-then rules. Scoring is deterministic.

**B. Learned Embeddings**
Train a model or fine-tune embeddings on cultural fashion data to learn appropriateness scores.

**C. Hybrid (Claude + Rules)**
Use Claude for routing and nuance, rules for deterministic guardrails.

**Decision**: Option C -- Hybrid.

**Rationale**:
- Cultural knowledge has nuance that pure rules miss (e.g., "some families avoid black at Diwali, but not all").
- Pure learned approaches require training data that does not exist yet and would be expensive to collect.
- Claude as the reasoning layer handles edge cases and explains recommendations, which builds user trust.
- Rules provide deterministic guardrails for hard constraints (taboo items always score 0) and prevent Claude hallucination on factual cultural norms.

**Trade-offs**:
- Claude API latency on every search vs. cached results.
- Claude prompt engineering is required to maintain consistency.
- Rules must be maintained as cultural knowledge evolves.

**Review**: After Phase 2, assess whether user feedback indicates Claude is under- or over-fitting cultural rules. If under-fitting, add more explicit rules. If over-fitting, introduce a learning layer for personal preference adaptation.

---

### ADR-002: Occasion Routing -- Claude vs. Classifier

**Context**: User queries like "cousin's wedding in Chennai" or "Garba night" must be routed to the correct occasion profile. Two approaches exist: prompt-based LLM routing or trained classifier.

**Options:**

**A. Claude Prompt Routing**
Send query to Claude with occasion identification prompt, parse JSON response.

**B. Keyword Classifier**
Rule-based or ML classifier using keywords ("wedding", "Garba", "Diwali", region names).

**C. Two-Stage: Classifier + Claude**
Fast keyword classifier for obvious cases; Claude for ambiguous cases.

**Decision**: Option A -- Claude Prompt Routing.

**Rationale**:
- Queries are often ambiguous: "family function" could be a wedding, Engagement, or Eid gathering.
- Claude handles multi-intent queries ("Navratri day 3 at a temple") that keyword classifiers cannot parse.
- Keyword classifiers require ongoing maintenance as slang evolves ("Sangeet", "Mendi", "bhangra" all = Punjabi Wedding context).
- Latency is acceptable: routing happens once per Magic Bar submission, not per-item.
- Explainability: Claude provides reasoning for its routing, which surfaces in UI as "We detected this is a Tamil Wedding".

**Trade-offs**:
- Claude API call adds latency (~500ms).
- Claude may mis-route edge cases; we must track error rate and iterate prompts.
- Cost per API call is non-trivial at scale.

**Mitigation**:
- Cache routing results by query fingerprint for 1 hour.
- If confidence < 0.6, prompt user to confirm: "Is this a Tamil Wedding?" with quick-select buttons.
- Track routing accuracy via implicit feedback (did user accept or override?).

**Review**: After 30 days in production, measure override rate. If > 15%, move to two-stage approach.

---

### ADR-003: Multi-Factor Scoring Weights

**Context**: Five scoring factors must be weighted. Initial weights are chosen based on design intuition, but these weights significantly affect recommendation quality.

**Options:**

| Factor                  | Option A (Intuitive) | Option B (Conservative) | Option C (Phase 2 Final) |
| ----------------------- | -------------------- | ---------------------- | ------------------------ |
| CLIP Similarity         | 25%                  | 40%                    | 25%                      |
| Cultural Appropriateness| 30%                  | 20%                    | 30%                      |
| Formality Match         | 25%                  | 20%                    | 25%                      |
| Color Symbolism         | 15%                  | 15%                    | 15%                      |
| Heritage Bonus          | 5%                   | 5%                     | 5%                       |

**Decision**: Option C (Phase 2 Final).

**Rationale**:
- CLIP similarity at 25%: preserves Phase 1 visual search quality while allowing cultural signals to override.
- Cultural Appropriateness at 30%: the highest weight because wearing wrong cultural context (e.g., white to a Hindu wedding) is the most severe failure mode.
- Formality Match at 25%: ensures outfit tier aligns with occasion tier.
- Color Symbolism at 15%: meaningful but not decisive; preferred colors can be flexed.
- Heritage Bonus at 5%: low weight because it is personal preference, not a hard rule.

**Trade-offs**:
- High cultural weight may cause recommendations to feel "too restrictive" for users used to general fashion apps.
- Low heritage bonus means mixed-heritage users get nearly equal weight to all traditions, not deep specialization.

**Review**: After Phase 2 beta, collect explicit feedback ("Did the suggestions feel culturally appropriate?"). Adjust weights based on cohort-level feedback, not individual preference.

---

## 6. Dependencies

| Dependency        | Source                          | Notes                                            |
| ----------------- | ------------------------------ | ------------------------------------------------ |
| CLIP embeddings   | Phase 1                        | Already stored in wardrobe_items                 |
| Formality scores  | Phase 1 auto-tagging           | Already in wardrobe_items.formality_score         |
| Magic Bar         | Phase 1                        | occasion_context injected into existing search     |
| Supabase         | Phase 1                        | New tables added to existing schema               |

---

## 7. Testing Strategy

### Unit Tests

- Scoring algorithm produces correct output for known test cases
- Occasion routing prompt returns expected JSON shape
- Dupatta pairing rules return valid recommendations

### Integration Tests

- Full search pipeline with occasion context returns culturally appropriate items first
- Heritage bonus correctly boosts regional items
- Saree drape suggestions match occasion + region

### E2E Tests

- User queries "cousin's Tamil wedding" -> sees lehenga/silk saree suggestions with "Tamil Wedding" context note
- User queries "something for Navratri day 3" -> sees grey/dark green items with color note

---

## 8. Open Questions

1. **Navratri date inference**: Should the app prompt for Navratri day if the user asks for a Navratri outfit without specifying day? Or require day to be specified?
2. **Black at Diwali**: The taboo on black is family-dependent. Should we add a user preference toggle "My family avoids black at Diwali" or treat it as a soft preference rather than hard taboo?
3. **Mixed heritage**: Users with mixed regional heritage who select "Mixed" as primary region -- should the system treat them as general (no heritage bonus) or spread heritage bonus across all traditions?
4. **Saree drape data entry burden**: Adding saree details (drape style, blouse color, etc.) adds friction to item capture. At what point do we prompt for this -- on every saree add, or lazily on first occasion query?
