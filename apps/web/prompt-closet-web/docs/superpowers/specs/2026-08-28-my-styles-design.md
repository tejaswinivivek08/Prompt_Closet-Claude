# My Styles — Design Spec

**Date:** 2026-08-28  
**Status:** Approved for implementation

---

## Overview

My Styles is a free-form outfit styling board inside the Closet tab. Users pick wardrobe items, drag and resize them onto a black mannequin silhouette, and save the finished look with a name and tags. Saved looks can be referenced in the Magic Bar via a style preset selector.

---

## Navigation

The Closet page gains two sub-tabs at the top of its content area:

- **Wardrobe** — existing wardrobe grid (no change to current behaviour)
- **My Styles** — new section described in this spec

No new bottom nav tab is added. The global nav remains: Closet, Magic Bar, Digital Twin, Profile.

---

## My Styles Tab — Gallery View

Default view when the user lands on the My Styles sub-tab.

**Layout:**

- Top-right: `+ New Look` button (terracotta filled, rounded)
- Content: responsive grid of Look cards (2 columns on mobile, 3 on desktop)
- Empty state: illustration + "No looks yet. Tap + New Look to create your first style."

**Look card contains:**

- Thumbnail snapshot of the mannequin canvas (captured at save time)
- Look name (bold, dark)
- Tag chips (small, terracotta — e.g., Party, Casual)
- Tap → opens builder in edit mode for that look
- Long-press or swipe → delete option with confirmation

---

## Style Builder — Full-Screen Editor

Opened from `+ New Look` or by tapping an existing look card.

### Layout

Three-area layout:

```
┌─────────────────────────────────────────────────┐
│  ← Back       New Look              [Save]       │  ← Top bar
├──────────────┬──────────────────────────────────┤
│              │                                  │
│  Item        │        Mannequin Canvas          │
│  Selector    │        (free-form editor)        │
│  (sidebar)   │                                  │
│              │                                  │
└──────────────┴──────────────────────────────────┘
```

On mobile: item selector is a horizontal scroll strip pinned to the bottom; mannequin canvas fills the remaining screen height.

### Mannequin

- Black silhouette (full-body: head, torso, arms, legs, feet)
- Gender toggle at top of canvas: `♀ Female` / `♂ Male` — switches mannequin shape
- Background: off-white (`#F5F0EA`) to contrast the black silhouette

### Item Selector Panel

- Scrollable list of the user's wardrobe item thumbnails
- Category filter chips at the top: All / Tops / Bottoms / Dresses / Accessories / Footwear
- Tap an item thumbnail → adds it to the center of the canvas as a new draggable layer
- Items already on canvas are highlighted with a terracotta border in the selector
- User can add more items at any time during editing

### Item Manipulation on Canvas

Each item placed on the canvas is an independent layer. When an item is selected (tapped):

- **Drag** — reposition freely anywhere on the canvas
- **Resize** — corner handle appears; drag to enlarge or shrink
- **Layer order** — toolbar shows "Bring Forward" / "Send Back" buttons to control overlap (e.g., tuck a top behind a skirt)
- **Delete** — × button in top-right corner of the selected item removes it from canvas

Items render as their wardrobe photo with transparent background (or cropped to subject). Layers can fully overlap to simulate tucking, layering, or accessory placement.

---

## Save Flow

Tapping **Save** opens a bottom sheet:

| Field     | Type                  | Notes                                                                |
| --------- | --------------------- | -------------------------------------------------------------------- |
| Look name | Text input (required) | e.g., "Diwali 2025", "Power Monday"                                  |
| Tags      | Multi-select chips    | Casual / Party / Date / Office / Festive / Travel / Weekend / Formal |
| Notes     | Text input (optional) | e.g., "tuck the top, belt sits high"                                 |

Tapping **Save Look** (terracotta button):

1. Captures the mannequin canvas as a PNG thumbnail (via `canvas.toDataURL`)
2. Uploads thumbnail to Supabase Storage (`wardrobe-items` bucket, path: `{userId}/styles/{styleId}.png`)
3. Saves look record to `saved_styles` table
4. Returns to gallery view with the new card visible

---

## Data Model

New Supabase table: `saved_styles`

```sql
CREATE TABLE IF NOT EXISTS public.saved_styles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  notes         TEXT,
  thumbnail_url TEXT,
  item_ids      UUID[] NOT NULL DEFAULT '{}',
  -- item_layers stores position/size/z-index per item for re-editing
  item_layers   JSONB NOT NULL DEFAULT '[]',
  gender        TEXT NOT NULL DEFAULT 'female' CHECK (gender IN ('female', 'male')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_styles_user_id ON public.saved_styles(user_id);

ALTER TABLE public.saved_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own styles"
  ON public.saved_styles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

`item_layers` JSONB shape (one entry per placed item):

```json
[
  {
    "item_id": "uuid",
    "x": 120,
    "y": 80,
    "width": 140,
    "height": 160,
    "z_index": 2
  }
]
```

---

## Magic Bar Integration

A style preset row appears above the Magic Bar prompt input:

```
Style preset:  [ None ▾ ]
```

Tapping the selector opens a bottom sheet listing all saved looks:

- Each row shows: thumbnail, look name, tag chips
- Selecting a look attaches it; the selector label updates to the look name
- A selected look passes to the AI: `item_ids`, `tags`, `notes`, and `name` as additional context in the system prompt alongside the user's wardrobe

When a style preset is selected, the Magic Bar prompt placeholder updates to: _"What's the occasion for your [Look Name] style?"_

---

## Files to Create / Modify

| File                                       | Action                                         |
| ------------------------------------------ | ---------------------------------------------- |
| `src/app/app/closet/ClosetClient.tsx`      | Add Wardrobe / My Styles sub-tab switcher      |
| `src/app/app/closet/MyStylesGallery.tsx`   | New — gallery grid of saved looks              |
| `src/app/app/closet/StyleBuilder.tsx`      | New — full-screen canvas editor with mannequin |
| `src/app/app/style/StyleClient.tsx`        | Add style preset selector above prompt input   |
| `src/app/api/saved-styles/route.ts`        | New — GET (list), POST (create)                |
| `src/app/api/saved-styles/[id]/route.ts`   | New — PUT (update), DELETE                     |
| `supabase/migrations/010_saved_styles.sql` | New — table + RLS                              |

---

## Out of Scope (this iteration)

- AI generating an outfit suggestion based on a look (future: Magic Bar can suggest variations)
- Sharing looks with other users
- Outfit scheduling / calendar
- Mannequin skin tone (uses fixed black silhouette)
