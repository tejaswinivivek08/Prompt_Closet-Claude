# Prompt Closet Web — Product Brief

## Project Overview

Build a web version of Prompt Closet for demo day. Next.js 14 (App Router) + Tailwind CSS. Reuses existing Supabase project and auth. MiniMax API for AI. HuggingFace for CLIP embeddings.

## Tech Stack

- **Framework**: Next.js 14 App Router
- **Styling**: Tailwind CSS
- **Backend**: Supabase (existing project: `https://uhwzfpedovwopohldtnx.supabase.co`)
- **AI - Vision**: MiniMax Vision API (auto-tagging)
- **AI - LLM**: MiniMax LLM (Magic Bar outfit generation)
- **AI - Image**: MiniMax Image API (Digital Twin avatar)
- **Embeddings**: HuggingFace CLIP API (`EXPO_PUBLIC_HF_API_TOKEN`)
- **Location**: `apps/web/prompt-closet-web/`

## Supabase Schema (existing, reuse as-is)

Tables: `profiles`, `wardrobe_items`, `item_embeddings`, `outfits`, `outfit_feedback`, `style_dna_results`

Auth: Same as mobile app (Supabase auth with email magic link)

## Pages

### 1. Landing Page (`/`)

- Hero: "Your AI-Powered Personal Stylist"
- Problem stat: "148 clothes, wear only 20%" (illustrative)
- 3 feature cards: Smart Closet, Magic Bar, Digital Twin
- CTA: "Try it free" → `/app` (auth-gated)
- Clean, premium, ivory (#F5F0EA) + rose gold (#C9847A) design

### 2. Auth Page (`/auth`)

- Sign in / Sign up tabs
- Supabase email magic link auth
- Same credentials as mobile app

### 3. Closet Page (`/app/closet`)

- Responsive grid of wardrobe items from Supabase
- Category filter pills: All | Top | Bottom | Dress | Traditional | Outerwear | Footwear | Accessory
- Add item button → file upload → MiniMax Vision auto-tags → save
- Click item → slide-over/modal detail with: name, category, colors, occasions, pattern, fabric, wear count
- Edit tags inline, delete with confirmation

### 4. Magic Bar Page (`/app/style`)

- Large text input: "What do you want to wear?"
- Placeholder: "Something for a rainy day meeting"
- Quick prompt chips: "Diwali outfit", "Office Monday", "Casual weekend", "Wedding guest"
- MiniMax LLM generates 2-3 outfit combinations from user's wardrobe items (via item IDs)
- Outfit cards: item thumbnail grid, occasion label, AI explanation, styling tip
- Accept/Reject feedback buttons → write to `outfit_feedback` table

### 5. Digital Twin Page (`/app/twin`)

- Upload selfie or drag-drop photo
- MiniMax Image API generates stylized avatar
- Display avatar prominently
- "Try outfit on me" flow: select outfit from closet → show on avatar
- Uses MiniMax's image-to-image generation

### 6. Profile Page (`/app/profile`)

- Name (editable inline)
- Body metrics: height, weight (optional)
- Skin tone picker: 2D grid of tones
- Style preferences: formal/casual slider
- Stats: total items, outfits created

## Design System

```
Background:    #F5F0EA  (ivory)
Primary:       #C9847A  (rose gold)
Text:          #2B2B2B  (charcoal)
Card BG:       #FFFFFF  (white + subtle shadow)
Font:          Inter (Google Fonts)
```

- Mobile responsive (breakpoint: md at 768px)
- Consistent padding: 4/6/8 units
- Cards: white bg, border-radius 12px, shadow-sm

## API Integrations

### MiniMax (`MINIMAX_API_KEY`)

- Base URL: `https://api.minimaxi.chat/v1`
- Vision: auto-tagging uploaded item photos
- LLM: Magic Bar outfit generation (chat completions)
- Image: Digital Twin avatar generation

### HuggingFace (`EXPO_PUBLIC_HF_API_TOKEN`)

- CLIP model for semantic search embeddings
- Text query → embed → cosine similarity in Supabase pgvector

### Supabase

- Existing project URL: `https://uhwzfpedovwopohldtnx.supabase.co`
- Same auth as mobile app
- Existing tables (no migration needed)

## Deployment

- Vercel (next.js built-in support)
- `vercel.json` at repo root
- Auto-deploy on push to `main`
- Environment variables in Vercel dashboard:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `MINIMAX_API_KEY`
  - `EXPO_PUBLIC_HF_API_TOKEN`

## Demo Day Deadline

- Next week
- Priority: all 6 pages functional end-to-end
- Auth must work
- Closet must show real data from Supabase
- Magic Bar must generate real outfit suggestions
