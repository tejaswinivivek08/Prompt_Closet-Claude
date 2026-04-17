# Outfit Composition Specification

## Overview

The Magic Bar composes outfits using a two-pass approach: Claude interprets the prompt into structured intent, then a tag-filtered embedding search fills item slots.

## Architecture Decision (ADR-001)

**Decision**: Slot-based outfit composition via Claude decomposition.

**Approach**:

1. Claude decomposes the NL prompt into structured intent + required item slots
2. Tag-filtered embedding search fills each slot from the user's closet
3. Claude generates a reasoning paragraph explaining why the items work together

## Pipeline

```
User prompt: "Show me something for a rainy Diwali dinner"
       |
       v
[1] Claude prompt interpretation
    Input: user prompt + closet summary (category counts)
    Output: {
      intent: { occasion, formality, weather, culture, color_preferences },
      slots: [
        { role: "top", filters: { formality_score_min: 4, occasion: ["formal","party"] } },
        { role: "bottom", filters: { formality_score_min: 4 } },
        { role: "footwear", filters: { formality_score_min: 3 } },
        { role: "accessory", filters: { occasion: ["party"] } }
      ],
      search_query: "elegant warm-toned festive evening outfit gold deep red"
    }
       |
       v
[2] For each slot: tag-filtered embedding search
    SQL: SELECT ... WHERE category = slot.role AND formality_score >= min AND ...
    ORDER BY embedding <=> CLIP(search_query) LIMIT 3
       |
       v
[3] Claude reasoning generation
    Input: selected items with tags + original prompt
    Output: "The navy and cream pairing is classic Diwali elegance..."
       |
       v
[4] Present outfit card with 2-5 items + reasoning
```

## Slot Types

| Role      | Required                  | Examples                        |
| --------- | ------------------------- | ------------------------------- |
| top       | Usually                   | shirt, blouse, sweater, t-shirt |
| bottom    | Usually                   | trousers, jeans, skirt, chinos  |
| dress     | Alternative to top+bottom | wrap dress, sheath dress        |
| outerwear | Optional                  | blazer, coat, cardigan          |
| footwear  | Usually                   | shoes, boots, sandals           |
| accessory | Optional                  | earrings, scarf, bag            |

## Claude Prompt Interpretation Template

```
[SYSTEM]
You are a fashion stylist AI. The user has described an occasion. Interpret their request
and determine what clothing items would make an appropriate outfit.

User's closet summary: {category_counts}

Return ONLY a JSON object:
{
  "intent": {
    "occasion": "<string>",
    "formality": <1-5>,
    "weather": "<string or null>",
    "culture": "<string or null>",
    "color_preferences": ["<color1>", "<color2>"]
  },
  "slots": [
    {"role": "<top|bottom|dress|outerwear|footwear|accessory>", "required": true/false,
     "filters": {"category": "<category>", "formality_score_min": <n>, "occasion": ["<occ>"]}}
  ],
  "search_query": "<CLIP-friendly description for embedding search>"
}

The search_query should be a vivid visual description optimized for image retrieval,
not the original prompt.

[USER]
"{user_prompt}"
```

## Fallback Behavior

| Scenario                       | Response                                                    |
| ------------------------------ | ----------------------------------------------------------- |
| No items match a required slot | Skip slot, compose with fewer items                         |
| Empty closet                   | "Add clothes first" message                                 |
| Ambiguous prompt               | Show prompt chips for clarification                         |
| All slots fail                 | "I couldn't find matching pieces. Try a different request." |

## Outfit Card Format

```
+-------------------------------------------+
|  OUTFIT FOR: {prompt}                      |
|  +-----+  +-----+  +-----+  +-----+       |
|  | TOP |  | BTM |  | SHO |  | ACC |       |
|  +-----+  +-----+  +-----+  +-----+       |
|  Navy     Charcoal  Brown     Gold         |
|  blouse   trousers boots     earrings      |
|                                            |
|  WHY THIS WORKS:                           |
|  {reasoning_paragraph}                     |
|                                            |
|  [Save]  [Shuffle]  [Try another]          |
+-------------------------------------------+
```

## Follow-Up Conversation

Follow-ups modify the previous result, not start fresh:

- "Not the trousers, something more festive" → keep other items, swap only trousers
- "Something warmer" → add outerwear slot or swap to warmer items
- "Perfect, save this" → save to outfits table

Thread model: persists for session, max 10 turns.
