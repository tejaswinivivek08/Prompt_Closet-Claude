# Magic Bar Spec — Prompt Closet Web

## NL Outfit Generation Flow

1. User types query or clicks quick prompt chip
2. POST `/api/magicbar` with `{ query, userId }`
3. Server:
   a. Generate CLIP text embedding via HuggingFace API
   b. Call Supabase RPC `match_wardrobe_items(embedding, userId, 0.3, 20)`
   c. Fetch full item details for matched items
   d. Call MiniMax LLM with item list → get 2-3 outfit suggestions
4. Return `{ outfits: OutfitSuggestion[] }`

## MiniMax LLM Prompt

System: "You are Prompt Closet's AI stylist. Create outfit combinations..."

User: item list + query → JSON array of `{ outfit_name, item_ids, occasion_fit, styling_tip, confidence }`

## Outfit Card

- Item thumbnail grid (2-4 images)
- Outfit name
- Occasion badge
- AI explanation (1-2 sentences)
- Accept button (rose-gold) → saves outfit + records feedback
- Reject button (gray) → records feedback only

## Feedback Recording

Accept: `supabase.from('outfits').insert(...)` + `outfit_feedback` with `feedback='accepted'`
Reject: `outfit_feedback` with `feedback='rejected'` only

## Quick Prompt Chips

"Diwali outfit", "Office Monday", "Casual weekend", "Wedding guest"
