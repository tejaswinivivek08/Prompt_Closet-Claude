# Prompt Closet Web — Architecture Analysis

## Next.js 14 App Router vs Pages Router

Next.js 14 App Router chosen per user request. App Router provides:

- Server Components by default (better performance for data fetching)
- Layouts and nested layouts
- Server Actions for form mutations
- Middleware for auth protection

## Tailwind CSS Setup

Use `@tailwindcss/vite` plugin (Vite-based Next.js) or built-in Tailwind.
Custom theme colors matching design system:

- `ivory`: #F5F0EA
- `rose-gold`: #C9847A
- `charcoal`: #2B2B2B
- `white`: #FFFFFF

## Supabase Auth Strategy

Supabase JS `@supabase/ssr` package provides:

- `createServerClient` for server components
- `createBrowserClient` for client components
- `middleware.ts` for route protection via Edge Middleware

Auth flow: email magic link (same as mobile)
Edge Middleware intercepts `/app/*` routes, redirects to `/auth` if no session.

## API Routes vs Server Actions

For AI integrations (MiniMax, HuggingFace):

- API Routes (`app/api/`) for streaming responses (Magic Bar LLM output)
- Server Actions for form submissions (add item, save outfit)

## MiniMax API Integration

MiniMax has 3 endpoints needed:

1. **Vision** (`POST /v1/images/txt2img`) — avatar generation for Digital Twin
2. **LLM** (`POST /v1/text/chatcompletion_v2`) — Magic Bar outfit generation
3. **Image-to-Image** (`POST /v1/images/{id}/generate`) — try outfit on avatar

Base URL: `https://api.minimaxi.chat/v1`
Auth: `Authorization: Bearer $MINIMAX_API_KEY`

## HuggingFace CLIP Integration

Used for semantic search embeddings:

- Text embedding: `POST https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32`
- Image embedding: same endpoint with base64 image
- 512-dimensional vectors, L2 normalized
- Match threshold: 0.3 cosine similarity

## Storage: Supabase Storage

Bucket: `wardrobe-items` (already exists, public)
Path: `{user_id}/{uuid}.jpg`
Avatar bucket: `user-content` at `avatars/{user_id}/{avatar_id}.png`

## Shared Schema

All tables already exist. Web app reads/writes same tables:

- `profiles` — user profile
- `wardrobe_items` — clothing items
- `item_embeddings` — CLIP vectors
- `outfits` — saved outfits
- `outfit_feedback` — accept/reject signals
- `user_avatars` — generated avatars

## Routing Structure

```
app/
  page.tsx                    → Landing (/)
  auth/page.tsx               → Auth (/auth)
  app/
    layout.tsx                → Protected layout with nav
    closet/page.tsx           → Closet grid (/app/closet)
    style/page.tsx            → Magic Bar (/app/style)
    twin/page.tsx             → Digital Twin (/app/twin)
    profile/page.tsx           → Profile (/app/profile)
  api/
    upload/route.ts           → Image upload handler
    minimax/
      avatar/route.ts         → Avatar generation
      chat/route.ts           → Magic Bar LLM
    huggingface/
      embed/route.ts          → CLIP embeddings
```

## Auth Middleware

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const supabase = createServerClient(...)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session && request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }
}
```

## Design System (Tailwind)

```javascript
// tailwind.config.js
colors: {
  ivory: '#F5F0EA',
  'rose-gold': '#C9847A',
  charcoal: '#2B2B2B',
}
fontFamily: { inter: ['Inter', 'sans-serif'] }
```

## Component Library

Build reusable components:

- `ItemCard` — closet grid card with image + tags
- `FilterPill` — category filter button
- `OutfitCard` — Magic Bar outfit suggestion
- `AvatarDisplay` — Digital Twin avatar
- `BottomSheet` — modal/slide-over for item detail
- `UploadZone` — drag-and-drop file upload
