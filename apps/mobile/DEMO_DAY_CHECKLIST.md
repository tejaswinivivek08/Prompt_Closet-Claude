# Prompt Closet — Demo Day Checklist

## Pre-Demo Checklist

### Account Setup

- [ ] Demo Supabase project is active at `uhwzfpedovwopohldtnx.supabase.co`
- [ ] Test user credentials ready:
  - Email: `tejaswini.smu.mba@gmail.com`
  - Password: `demo_password_123`
- [ ] 18 demo items are seeded in the database (run seed script if needed):
  ```bash
  cd apps/mobile
  DEMO_USER_EMAIL=tejaswini.smu.mba@gmail.com \
  DEMO_USER_ID=630c7ebd-9bf1-4ce6-a4f7-17e4aef0d6b5 \
  npx tsx scripts/seed-demo-data.ts
  ```

### Environment Variables

- [ ] `.env` configured with real Supabase URL and anon key
- [ ] `MOCK_TAGGING=true` for demo (avoids Claude API calls during demo)
- [ ] `EXPO_PUBLIC_CLAUDE_API_KEY` set for real AI tagging (optional)
- [ ] `EXPO_PUBLIC_HF_API_TOKEN` set for real CLIP embeddings (optional)

### EAS Build

- [ ] `eas.json` created with build profiles
- [ ] Run `eas login` to authenticate with Expo
- [ ] Run `eas project:create` or `eas project:link`
- [ ] For Android APK: `eas build --platform android --profile preview`
- [ ] For iOS TestFlight: `eas build --platform ios --profile production`
- [ ] Test the built APK/app on a device before demo

## Demo Flow Script

### 1. Onboarding (30 seconds)

1. Open app — show sign-in screen
2. Sign in with demo credentials
3. Show 3-slide onboarding carousel
4. Land on My Closet tab

### 2. My Closet (1 minute)

1. Show the grid of 18 seeded items
2. Tap an item → show Item Detail screen
3. Long-press an item → show delete confirmation
4. Tap "Edit Tags" → show tag editing screen → save changes
5. Pull to refresh (show loading state)

### 3. Add Item (45 seconds)

1. Tap "Add" tab
2. Show camera capture flow
3. Take a photo (or skip and show existing photo)
4. Show Review Tags screen with AI-generated tags
5. Edit a tag (change category, add color)
6. Save → return to closet

### 4. Magic Bar (1 minute)

1. Tap "Style" tab
2. Show "What do you want to wear?" prompt
3. Type: "Office outfit for tomorrow"
4. Show shimmer loading animation
5. Show outfit suggestion card with thumbnails
6. Tap "Save Outfit"
7. Try a quick-prompt chip (e.g., "Something festive")

### 5. Search (30 seconds)

1. Tap "Search" tab
2. Type: "something blue and casual"
3. Show search results with similarity scores
4. Tap an item to view details

### 6. Style History (15 seconds)

1. Tap "Style" tab (or Profile/Style History)
2. Show saved outfit with thumbnails

## Key Screens to Preview

| Screen        | File                     | Notes                           |
| ------------- | ------------------------ | ------------------------------- |
| Sign In       | `SignInScreen.tsx`       | Supabase email auth             |
| Onboarding    | `OnboardingScreen.tsx`   | 3-slide carousel                |
| My Closet     | `ClosetScreen.tsx`       | 3-col grid, pull-to-refresh     |
| Add Item      | `AddItemScreen.tsx`      | Camera + gallery picker         |
| Review Tags   | `ReviewTagsScreen.tsx`   | Edit AI tags before saving      |
| Item Detail   | `ItemDetailScreen.tsx`   | Full item view with Edit/Delete |
| Magic Bar     | `MagicBarScreen.tsx`     | NL outfit composer              |
| Search        | `SearchScreen.tsx`       | Semantic search                 |
| Style History | `StyleHistoryScreen.tsx` | Saved outfits                   |

## Key Features Working

- ✅ Supabase auth (email + password)
- ✅ Onboarding carousel (first-time users)
- ✅ Closet grid with real Supabase data
- ✅ Item detail, edit tags, delete
- ✅ Image capture + AI tagging (Claude Vision)
- ✅ CLIP embeddings (Hugging Face API)
- ✅ Semantic search (pgvector cosine similarity)
- ✅ Magic Bar outfit suggestions (Claude API)
- ✅ Quick prompt chips
- ✅ Search screen with NL queries
- ✅ Style history (saved outfits)
- ✅ Offline banner handling
- ✅ 18 demo items seeded

## Troubleshooting

### App crashes on launch

- Check `npx expo start` runs without errors
- Run `npx tsc --noEmit` for TypeScript errors
- Verify `.env` has correct Supabase URL and keys

### No items in closet

- Run the seed script again
- Check Supabase project is active
- Verify `user_id` in wardrobe_items matches your auth user

### Magic Bar returns no results

- Check `MOCK_EMBEDDING=true` in `.env` for demo mode
- Or verify `EXPO_PUBLIC_HF_API_TOKEN` is set for real CLIP
- Check pgvector extension is enabled in Supabase

### Image capture fails

- Verify camera permissions in `app.json`
- Check device has camera available
- Try using photo library instead

## Post-Demo

1. Note any crashes or bugs encountered
2. Note any UX confusion points
3. Identify which features got the best reaction
4. Review EAS build credentials for future builds
