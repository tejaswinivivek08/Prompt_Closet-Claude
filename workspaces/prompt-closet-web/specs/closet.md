# Closet Spec — Prompt Closet Web

## Wardrobe Grid

- Responsive grid: 2 cols mobile, 3 cols tablet, 4 cols desktop
- `ItemCard` component: image, category badge, color dots, occasion pills
- Lazy loading with `loading="lazy"` on images
- Pull-to-refresh on mobile (not needed on web — just refetch)

## Category Filters

Pills: All | Top | Bottom | Dress | Traditional | Outerwear | Footwear | Accessory

- Client-side filter (items already loaded)
- Active pill: rose-gold bg, white text
- Inactive: white bg, charcoal text, border
- Each pill shows count: "Top (5)"

## Add Item Flow

1. Click "+" button → file input (accept="image/\*")
2. Preview selected image (or multi-select up to 4)
3. "Analyze with AI" button
4. POST to `/api/upload` → server:
   - Uploads to Supabase Storage: `wardrobe-items/{userId}/{uuid}.jpg`
   - Calls MiniMax Vision API for auto-tags
   - Saves `wardrobe_items` row
   - Saves CLIP embedding via HuggingFace → `item_embeddings`
5. Redirects to closet page (new item appears)

## Item Detail Modal

Slide-over panel from right (not a centered modal — better for web).

- Large image
- Name (editable inline)
- Category select
- Color tags (add/remove)
- Occasion pills (add/remove)
- Pattern, fabric fields
- Wear count
- Delete button (with confirmation dialog)

## Data Fetching

Server Component fetches initial items from Supabase:

```sql
SELECT * FROM wardrobe_items
WHERE user_id = auth.uid() AND is_active = TRUE
ORDER BY created_at DESC
```

## Supabase Storage

Bucket: `wardrobe-items` (public read)
Path: `{user_id}/{uuid}.jpg`
Upload via `@supabase/storage-js` `upload()` method.
