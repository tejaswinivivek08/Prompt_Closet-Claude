# Prompt Closet Web — Implementation Plan

## Phase 1: Project Scaffold

1. Create `apps/web/prompt-closet-web/` with `create-next-app`
2. Install: `@supabase/supabase-js`, `@supabase/ssr`, `tailwindcss`, `lucide-react`
3. Configure Tailwind with custom colors (ivory, rose-gold, charcoal)
4. Add Inter font via `next/font/google`
5. Create `vercel.json` for Next.js config
6. Create `.env.local.example` with all required env vars

## Phase 2: Supabase Client Setup

1. Create `lib/supabase/client.ts` — browser Supabase client
2. Create `lib/supabase/server.ts` — server component client
3. Create `middleware.ts` — auth protection for `/app/*` routes
4. Create `app/auth/callback/route.ts` — magic link callback handler

## Phase 3: Landing Page

1. Build `app/page.tsx` with hero, stats, feature cards, CTA
2. Use Tailwind only (no component library)
3. "Try it free" CTA → navigates to `/auth`

## Phase 4: Auth Page

1. Build `app/auth/page.tsx` with sign-in/sign-up tabs
2. Supabase email magic link auth (same as mobile)
3. After login → redirect to `/app/closet`

## Phase 5: Closet Page

1. Build `app/app/closet/page.tsx` — Server Component fetches items
2. Client component for filters + add item modal
3. `ItemCard` component — image, category badge, color dots
4. Category filter pills (All | Top | Bottom | Dress | Traditional | Outerwear | Footwear | Accessory)
5. Add item: file input → upload to Supabase Storage → call MiniMax Vision → save tags → refresh
6. Item detail: slide-over modal with edit/delete

## Phase 6: Magic Bar Page

1. Build `app/app/style/page.tsx`
2. Text input + quick prompt chips
3. API route `app/api/magicbar/route.ts`:
   - HuggingFace CLIP text embedding
   - Supabase RPC `match_wardrobe_items` for top 20 items
   - MiniMax LLM to compose outfit suggestions
4. Outfit card: item thumbnails grid, occasion label, explanation, accept/reject buttons
5. Accept → save to `outfits` + `outfit_feedback`; Reject → `outfit_feedback` only

## Phase 7: Digital Twin Page

1. Build `app/app/twin/page.tsx`
2. Upload selfie via drag-drop zone
3. API route `app/api/avatar/route.ts` → MiniMax Image API → avatar URL
4. Display avatar with styling
5. "Try outfit on me": select outfit → MiniMax img2img → result

## Phase 8: Profile Page

1. Build `app/app/profile/page.tsx`
2. Inline editable: name, body metrics, skin tone grid
3. Style preference slider
4. Stats: item count, outfit count from Supabase
5. Save to `profiles` table

## Phase 9: Vercel Deploy

1. Create `vercel.json` at repo root
2. Push to GitHub → Vercel auto-deploys
3. Add env vars to Vercel dashboard
4. Verify deployment

## Tech Decisions

- **No component library** — hand-crafted Tailwind for premium feel
- **No Redux** — React state + Supabase real-time for reactivity
- **No TypeScript strict mode** — speed over ceremony for demo day
- **Server Components** for data fetching, Client Components for interactivity
- **API Routes** for AI calls (keeps keys server-side)
