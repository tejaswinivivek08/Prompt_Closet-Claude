# Digital Twin Spec — Prompt Closet Web

## Avatar Generation

1. User uploads selfie (drag-drop or click)
2. POST `/api/avatar` with `{ imageData: base64, userId }`
3. Server calls MiniMax Image API → returns avatar URL
4. Save avatar record to `user_avatars` table

## MiniMax Image API

Endpoint: `POST /v1/images/txt2img`
Model: `image-01`
Prompt: "Professional fashion model photography, full body shot, styled outfit, neutral background, fashion editorial style, high quality"

## Avatar Display

- Large centered avatar image
- Style label below
- "Generate New" button

## Try Outfit On Me

1. User selects an outfit from their closet (checkbox mode on closet grid)
2. "Try On" button enabled when outfit selected
3. POST `/api/avatar/tryon` with `{ avatarId, outfitItemIds }`
4. MiniMax img2img endpoint → generates styled result
5. Display result image

## Storage

Avatar images saved to Supabase Storage bucket `user-content` at `avatars/{user_id}/{avatar_id}.png`.
