# Demo Specification

## Demo Flow (5-7 minutes, 8 beats)

| Beat               | Duration | Content                                                     | Live? |
| ------------------ | -------- | ----------------------------------------------------------- | ----- |
| 1. Hook            | 30s      | App intro, launch, skip onboarding                          | No    |
| 2. Closet          | 45s      | Pre-seeded 15 items, tap tags, filter by Formal             | No    |
| 3. Add Item        | 60s      | Camera → photo → AI auto-tag → edit one tag → save          | Yes   |
| 4. Magic Bar       | 90s      | "Show me something for a rainy Diwali dinner" → outfit card | Yes   |
| 5. Refinement      | 45s      | "Not the skirt, something more comfortable" → swap          | Yes   |
| 6. Semantic Search | 30s      | "warm and cozy for winter" → CLIP results                   | Yes   |
| 7. Style DNA       | 30s      | Profile tab → color palette, formality, occasions           | No    |
| 8. Close           | 15s      | Summary line                                                | No    |

## Pre-Seed Data (15 items)

| Item                   | Category    | Color      | Formality | Occasion     |
| ---------------------- | ----------- | ---------- | --------- | ------------ |
| Navy silk blouse       | Tops        | Navy       | 7         | Work, Date   |
| Charcoal wool trousers | Bottoms     | Charcoal   | 8         | Work, Formal |
| Cream cashmere sweater | Outerwear   | Cream      | 5         | Casual, Work |
| Brown leather boots    | Shoes       | Brown      | 4         | Casual, Work |
| Burgundy wrap dress    | Dresses     | Burgundy   | 7         | Date, Party  |
| Dark denim jeans       | Bottoms     | Indigo     | 3         | Casual       |
| White cotton t-shirt   | Tops        | White      | 2         | Casual       |
| Black blazer           | Outerwear   | Black      | 9         | Work, Formal |
| Gold earrings          | Accessories | Gold       | 6         | Party, Date  |
| Olive chinos           | Bottoms     | Olive      | 4         | Casual, Work |
| Floral silk scarf      | Accessories | Multi      | 5         | Work, Date   |
| Black pumps            | Shoes       | Black      | 8         | Work, Formal |
| Grey wool coat         | Outerwear   | Grey       | 7         | Work, Formal |
| Striped linen shirt    | Tops        | Blue/White | 4         | Casual       |
| Red clutch             | Accessories | Red        | 7         | Party, Date  |

All 15 items must be pre-tagged AND pre-embedded before demo day.

## Latency Budget

| Action               | Budget | Expected | Headroom |
| -------------------- | ------ | -------- | -------- |
| App to closet        | 2s     | 1.5s     | 0.5s     |
| Camera to capture    | 1s     | 0.5s     | 0.5s     |
| Photo to tagged item | 8s     | 5-7s     | 1-3s     |
| Magic Bar to outfit  | 10s    | 5-8s     | 2-5s     |
| Semantic search      | 3s     | 1-2s     | 1-2s     |
| Grid scroll          | 1s     | 0.3s     | 0.7s     |

## Demo-Day Checklist (T-2 hours)

1. App installs and opens on demo device
2. Pre-populated data loads (15 items, all tagged + embedded)
3. One live upload works end-to-end (< 10s)
4. Semantic search returns relevant results (< 3s)
5. Magic Bar produces outfit for "rainy Diwali dinner"
6. Test on actual presentation WiFi
7. Screen recording backup verified (2 min, plays correctly)

## Fallbacks

| Failure              | Fallback                                                  |
| -------------------- | --------------------------------------------------------- |
| WiFi dead            | Pre-loaded data works offline (cached auth + local data)  |
| Claude API 429       | Pre-tagged demo data; live tag only 2-3 items max         |
| HF API cold start    | All embeddings pre-computed; no live embedding generation |
| App crash            | Screen recording plays from demo laptop                   |
| Magic Bar fail       | Pre-cached outfit response for "rainy Diwali dinner"      |
| Android install fail | iOS TestFlight as backup; web version as emergency        |
