# Profile Spec — Prompt Closet Web

## Profile Fields

- `full_name` — text input, inline editable
- `body_measurements` — JSONB: `{ height, weight }` — optional
- `skin_tone_palette` — 2D grid picker (fair-cool, fair-warm, medium-cool, medium-warm, deep-cool, deep-warm)
- `style_preferences` — TEXT[] — checkboxes: casual, formal, festive, sporty, minimal

## Stats

- Total wardrobe items: `SELECT COUNT(*) FROM wardrobe_items WHERE user_id = auth.uid()`
- Total outfits created: `SELECT COUNT(*) FROM outfits WHERE user_id = auth.uid()`

## Save

PUT to `/api/profile` or form submit → `supabase.from('profiles').upsert(...)`
