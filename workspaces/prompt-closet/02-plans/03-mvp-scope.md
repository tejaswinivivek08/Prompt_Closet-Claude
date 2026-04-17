# Prompt Closet -- MVP Scope Document

**Phase**: 02-Plans
**Date**: 2026-04-17
**Status**: Approved for implementation

---

## 1. Executive Summary

This document defines the MVP scope for Prompt Closet's Phase 1 demo-grade application. The MVP prioritizes the critical path for a successful MGMT 655 course demo: a working closet with auto-tagged items and a Magic Bar that returns outfit suggestions.

**Scope philosophy**: Demo dies without P0 items. P1 items are visibly weak without. P2 items can wait for Phase 2.

---

## 2. Priority Definitions

| Priority | Definition                   | Consequence if Missing                            |
| -------- | ---------------------------- | ------------------------------------------------- |
| **P0**   | Demo dies without it         | App is unusable or the core narrative breaks      |
| **P1**   | Demo is weak without it      | Demo works but looks incomplete or unprofessional |
| **P2**   | Impressive but not essential | Can be deferred without impacting demo quality    |

---

## 3. P0: Demo Dies Without

### P0-01: Project Scaffold + Auth

**What**: React Native + Expo project with Supabase email authentication.

**Deliverables:**

- [ ] Expo project created with TypeScript
- [ ] Supabase client configured with URL and anon key
- [ ] Email magic link authentication flow
- [ ] Session persistence via Expo SecureStore
- [ ] Auth state listener (`onAuthStateChange`)
- [ ] Login screen with email input
- [ ] Protected routes (redirect to login if not authenticated)
- [ ] Sign out functionality

**Acceptance criteria:**

- User can sign up with email and receive magic link
- User can click magic link and be authenticated
- Auth state persists across app restarts
- User can sign out

**Edge cases:**

- Invalid email format: show inline validation error
- Expired magic link: show error + option to resend
- Network offline: show "Check your connection" error

---

### P0-02: Data Model

**What**: Supabase PostgreSQL schema with all entities and RLS policies.

**Deliverables:**

- [ ] `profiles` table (id, display_name, created_at, updated_at)
- [ ] `clothing_items` table with all columns per spec
- [ ] `outfits` table with all columns per spec
- [ ] `tag_status` CHECK constraint
- [ ] `embedding_status` CHECK constraint
- [ ] `formality_score` CHECK constraint (1-5)
- [ ] Indexes on user_id, category, occasion
- [ ] RLS enabled on all tables
- [ ] RLS policies for CRUD (auth.uid() = user_id)
- [ ] Storage bucket `closet-images` with RLS policies
- [ ] Profile auto-creation trigger on signup

**Acceptance criteria:**

- All tables created without errors
- RLS policies tested: User A cannot see User B's items
- Storage upload works to user-scoped path

---

### P0-03: Camera / Image Upload

**What**: Camera capture and gallery picker with compression and upload to Supabase Storage.

**Deliverables:**

- [ ] Camera capture via Expo ImagePicker
- [ ] Gallery picker for existing photos
- [ ] HEIC to JPEG conversion on iOS
- [ ] Client-side compression (1024x1024, quality 0.7)
- [ ] Thumbnail generation (200x200, quality 0.5)
- [ ] Upload to Supabase Storage with progress indicator
- [ ] Upload state machine (idle → compressing → uploading → done/error)
- [ ] Error handling with retry option

**Acceptance criteria:**

- User can photograph a clothing item and see it upload
- Progress indicator visible during upload
- Image appears in closet grid after upload completes
- Gallery picker works as fallback to camera

**Edge cases:**

- Camera permission denied: show permission request + Settings link
- File too large (>10MB): reject with message
- Upload fails: show retry button
- HEIC format: automatically converted to JPEG

---

### P0-04: Auto-Tagging Pipeline

**What**: Claude Vision API integration to auto-tag uploaded images.

**Deliverables:**

- [ ] Claude Vision API call with structured JSON prompt
- [ ] JSON response parsing with validation
- [ ] Retry logic (max 2 retries on parse failure)
- [ ] Fallback tags on all retries exhausted
- [ ] `clothing_items` row updated with tags
- [ ] `tag_status` state machine (pending → processing → done/failed)
- [ ] Parallel execution with CLIP embedding

**Acceptance criteria:**

- Image uploaded → tags appear within 3 seconds
- Tags include: category, color, pattern, occasion, formality_score
- Failed tagging shows "Tap to retag" button
- Tags displayed in closet grid item card

**Edge cases:**

- Malformed JSON from Claude: retry with stricter prompt
- Rate limit (429): queue and retry after 60s
- Timeout: mark as failed with retry option
- Ambiguous image: classify most prominent item

---

### P0-05: Closet Grid UI

**What**: Display all wardrobe items in a scrollable grid with filtering.

**Deliverables:**

- [ ] 3-column grid layout (2-column on smaller screens)
- [ ] Item card with thumbnail and primary tags
- [ ] Lazy image loading with placeholder
- [ ] Pull-to-refresh to reload items
- [ ] Empty state with CTA to add first item
- [ ] Filter bar (category, color, occasion, formality)
- [ ] Filter chips with (x) to remove
- [ ] "Clear all filters" button

**Acceptance criteria:**

- Closet grid displays all user's items
- Scroll is smooth (60fps) with 50+ items
- Tap on item shows detail view
- Filter bar filters items in real-time
- Empty state shown when closet is empty

**Edge cases:**

- Image fails to load: show placeholder
- Slow network: skeleton loading state
- No items match filter: "No items match" state

---

### P0-06: Outfit Composer (Magic Bar)

**What**: Natural language prompt input that returns outfit suggestions composed from closet items.

**Deliverables:**

- [ ] Magic Bar UI (persistent rail above tab bar)
- [ ] Expanded overlay with text input
- [ ] Prompt interpretation via Claude (NL → structured filter)
- [ ] Slot-based outfit composition (top, bottom, shoes, accessory)
- [ ] Tag pre-filter + CLIP embedding rerank
- [ ] Outfit card display (2-5 items + reasoning)
- [ ] "Save to Style" button

**Acceptance criteria:**

- User types "outfit for a rainy Diwali dinner"
- Magic Bar shows "thinking" state with reasoning
- Outfit card appears with 2-5 items from user's closet
- Each item has thumbnail + color + category
- Reasoning paragraph explains why items work together

**Edge cases:**

- No items match prompt: "I couldn't find the right pieces" + suggestions
- Closet too small (< 5 items): "Add more clothes to get outfit suggestions"
- AI failure: show error with retry button
- Empty closet: Magic Bar disabled with "Add clothes first" message

---

### P0-07: Error Handling Pipeline

**What**: Explicit error states at each pipeline stage with user-visible retry actions.

**Deliverables:**

- [ ] Upload error: "Upload failed. Check your connection." + retry button
- [ ] Tag failure: "Couldn't identify this item" + "Tap to retag" button
- [ ] Embedding failure: item still appears, search works on tag-only
- [ ] Auth error: redirect to login
- [ ] Network offline: banner at top of screen
- [ ] Storage quota: "Storage full. Delete some items."

**Acceptance criteria:**

- No silent failures — user always knows if something went wrong
- Every error has a retry or corrective action
- Error messages are user-friendly (not raw API errors)

---

## 4. P1: Demo Is Weak Without

### P1-01: Tag Editing UI

**What**: Allow user to correct mis-tagged items by tapping to edit.

**Deliverables:**

- [ ] Tap on item tag to enter edit mode
- [ ] Dropdown/picker for category selection
- [ ] Dropdown/picker for color selection
- [ ] Dropdown/picker for pattern selection
- [ ] Dropdown/picker for occasion selection
- [ ] Slider for formality score (1-5)
- [ ] Save button to persist changes
- [ ] Supabase row update on save

**Acceptance criteria:**

- User can correct a wrong tag in 3 taps
- Corrected tags persist and appear in closet grid
- Cancel dismisses changes without saving

---

### P1-02: Upload Progress States

**What**: Visible progress indicator through the upload-to-tag pipeline.

**Deliverables:**

- [ ] "Compressing..." state with spinner
- [ ] "Uploading..." state with progress bar (0-100%)
- [ ] "Analyzing..." state (Claude Vision running)
- [ ] "Almost done..." state (CLIP embedding running)
- [ ] "Done!" state with checkmark before grid update
- [ ] Time estimates where possible

**Acceptance criteria:**

- User always knows what is happening during upload
- No blank spinners for more than 2 seconds
- Progress bar reflects actual upload progress

---

### P1-03: Thumbnail Generation

**What**: Optimized thumbnail images for grid display.

**Deliverables:**

- [ ] 200x200 thumbnail on upload
- [ ] Thumbnail stored in Supabase Storage
- [ ] `thumbnail_url` column in clothing_items
- [ ] Grid uses thumbnail_url, detail uses full image_url
- [ ] Thumbnail generation fails gracefully (use full image)

**Acceptance criteria:**

- Grid loads quickly with thumbnails (not full-resolution images)
- Full-resolution image loads on detail view
- Thumbnails look good at 200x200 (center crop, square)

---

### P1-04: Item Deletion

**What**: Allow user to delete unwanted items from closet.

**Deliverables:**

- [ ] Long-press on item card to show delete option
- [ ] Confirmation dialog: "Delete this item?"
- [ ] Delete from Supabase Storage (image + thumbnail)
- [ ] Delete from clothing_items table
- [ ] Grid updates immediately after deletion
- [ ] Undo option (5 seconds) after deletion

**Acceptance criteria:**

- User can delete any item from their closet
- Deletion is permanent (with confirmation)
- Storage cleaned up (no orphaned images)

---

### P1-05: Empty State / Onboarding

**What**: Welcoming empty state for new users with guidance.

**Deliverables:**

- [ ] Empty closet illustration (SVG or image)
- [ ] "Your closet awaits" headline
- [ ] "Photograph your clothes and I will help you put together great outfits." subtext
- [ ] Prominent "Add your first item" CTA button
- [ ] Brief 3-step explanation: Snap → AI tags → Get styled
- [ ] Magic Bar rail visible but grayed out with tooltip

**Acceptance criteria:**

- First-time user knows exactly what to do
- Empty state is inviting, not intimidating
- CTA button is prominent and tappable

---

### P1-06: Magic Bar Prompt Interpretation

**What**: Claude-powered NL understanding for the Magic Bar.

**Deliverables:**

- [ ] Claude interprets prompt into structured filter:
  - formality_threshold (1-5)
  - categories (top, bottom, shoes, etc.)
  - occasion
  - color_preferences
- [ ] CLIP text embedding for search query reformulation
- [ ] Hybrid search: tag filter + embedding rerank
- [ ] Streaming "thinking" states visible to user

**Acceptance criteria:**

- "rainy Diwali dinner" → formality >= 4, occasion = formal/party
- "casual Friday" → formality <= 3, occasion = casual
- "job interview" → formality >= 4, occasion = business/formal
- User sees the AI reasoning in real-time

---

### P1-07: Item Detail View

**What**: Full-screen view of a single item with all tags and options.

**Deliverables:**

- [ ] Full-resolution image
- [ ] All tags displayed (category, color, pattern, occasion, formality)
- [ ] Edit tags button (navigates to tag editor)
- [ ] Delete item button
- [ ] "Find similar" button (triggers semantic search)
- [ ] "Add to outfit" button (for manual outfit building)

**Acceptance criteria:**

- User can see all item details
- User can edit or delete from detail view
- "Find similar" shows semantic search results

---

## 5. P2: Impressive but Not Essential

### P2-01: 2D Avatar / Virtual Try-On

**What**: Digital avatar for virtual outfit try-on.

**Status**: **DEFERRED** to Phase 2

**Rationale**: Significant effort (separate project). For demo, show outfit composition as styled card stack instead.

---

### P2-02: Style Clustering

**What**: HAC clustering to identify style groups in user's wardrobe.

**Status**: **DEFERRED** to Phase 2 (requires 20+ items to be meaningful)

**Rationale**: Clustering on <10 items produces noise. Defer until demo has enough items to show meaningful clusters.

---

### P2-03: Outfit Favorites / Save

**What**: User can save composed outfits to a Style tab.

**Status**: **DEFERRED** to Phase 2

**Rationale**: Nice-to-have but demo can show outfit cards without persistence.

---

### P2-04: Google OAuth

**What**: Google sign-in option alongside email.

**Status**: **DEFERRED** to Phase 2

**Rationale**: Requires app registration and consent screen review (can take days). Email-only auth is sufficient for demo.

---

### P2-05: Weather-Based Suggestions

**What**: Auto-suggest outfits based on current weather.

**Status**: **DEFERRED** to Phase 2

**Rationale**: External API dependency. Interesting ML angle but not needed for demo.

---

### P2-06: Style DNA Visualization

**What**: Profile tab showing user's style profile (color palette, category distribution, formality range).

**Status**: **DEFERRED** to Phase 2

**Rationale**: Requires 10+ items to produce meaningful analytics. Nice to have but not essential for demo.

---

## 6. Outfit Composition Logic

### 6.1 Slot-Based Approach

The Magic Bar decomposes outfit requests into slots:

| Slot      | Required                | Description                              |
| --------- | ----------------------- | ---------------------------------------- |
| Top       | Yes (unless Dress)      | Upper body garment                       |
| Bottom    | Yes (unless Dress)      | Lower body garment                       |
| Dress     | Yes (unless Top+Bottom) | Full-body garment                        |
| Shoes     | Yes                     | Footwear                                 |
| Accessory | No                      | Optional accessory (bag, jewelry, scarf) |
| Outerwear | No                      | Optional layer for cold weather          |

### 6.2 Compatibility Rules

```typescript
const COMPATIBILITY_RULES = {
  // Dress is standalone — no top/bottom needed
  dress: { excludes: ["top", "bottom"] },

  // Formal tops pair with formal bottoms
  formal_top: { requires: ["formal_bottom", "formal_shoes"] },

  // Athletic wear is its own category
  athletic_top: { excludes: ["formal_bottom", "dress", "formal_shoes"] },

  // Shoes bridge categories
  boots: { pairs_with: ["jeans", "trousers", "dress"] },
  sneakers: { pairs_with: ["jeans", "casual_top", "athletic_top"] },
  heels: { pairs_with: ["dress", "formal_bottom"] },
};
```

### 6.3 Selection Algorithm

```
1. Interpret prompt → structured filter (formality, occasion, categories)
2. Fetch items matching filter from closet
3. Group by category
4. For each required slot:
   a. Get items matching slot category + filters
   b. Rank by CLIP similarity to prompt embedding
   c. Select top item
5. Check compatibility between selected items
6. If incompatible, try next-best alternative
7. Generate reasoning paragraph
8. Return outfit card
```

---

## 7. Screen-by-Screen Breakdown

### 7.1 Auth Screen

| State   | UI                                               |
| ------- | ------------------------------------------------ |
| Default | Email input field, "Send magic link" button      |
| Loading | Button shows spinner, input disabled             |
| Success | "Check your email!" message with email shown     |
| Error   | Red error message below input, button re-enabled |

### 7.2 Closet Grid Screen

| State     | UI                                         |
| --------- | ------------------------------------------ |
| Loading   | Skeleton grid (6 placeholder cards)        |
| Empty     | Illustration + "Add your first item" CTA   |
| Populated | 3-column grid of ItemCards                 |
| Filtering | Filter chips above grid, "Clear all" if 2+ |
| Error     | Error banner + "Retry" button              |

### 7.3 Item Card

| State             | UI                                                            |
| ----------------- | ------------------------------------------------------------- |
| Default           | Thumbnail + primary label (color + category)                  |
| Tapped            | Tags revealed (category, color, pattern, occasion, formality) |
| Long-pressed      | Action menu (Edit, Delete, Find Similar)                      |
| Loading thumbnail | Gray placeholder with spinner                                 |
| Failed thumbnail  | Broken image icon                                             |

### 7.4 Camera Screen

| State              | UI                                                  |
| ------------------ | --------------------------------------------------- |
| Permission request | System permission dialog                            |
| Permission denied  | Screen with "Enable camera in Settings" message     |
| Viewfinder         | Camera preview with capture button + gallery button |
| Capturing          | Brief shutter animation                             |
| Processing         | Full-screen overlay with progress states            |

### 7.5 Tag Review Screen

| State        | UI                                  |
| ------------ | ----------------------------------- |
| Tags loading | Skeleton tags with shimmer          |
| Tags ready   | Photo + editable tag fields         |
| Saving       | "Saving..." overlay                 |
| Saved        | Checkmark + auto-navigate to closet |

### 7.6 Magic Bar (Expanded)

| State      | UI                                                  |
| ---------- | --------------------------------------------------- |
| Idle       | Text input + suggestion chips                       |
| Thinking   | "Looking through your closet..." with animated dots |
| Assembling | "Putting it together..." with slot-by-slot reveal   |
| Complete   | OutfitCard displayed                                |
| No matches | "Couldn't find the right pieces" + suggestions      |
| Error      | "Something went wrong" + "Try again" button         |

### 7.7 Outfit Card

| State     | UI                                          |
| --------- | ------------------------------------------- |
| Revealing | Items fade in one by one                    |
| Complete  | Prompt + items + reasoning + action buttons |
| Saved     | "Saved!" toast notification                 |

---

## 8. Demo Day Pre-Seeded Data

### 8.1 Required Items (15-20 items)

Pre-photograph and pre-tag these items before demo day:

| Item                   | Category  | Color      | Formality | Occasion     |
| ---------------------- | --------- | ---------- | --------- | ------------ |
| Navy silk blouse       | Top       | Navy       | 7         | Work, Date   |
| Charcoal wool trousers | Bottom    | Charcoal   | 8         | Work, Formal |
| Cream cashmere sweater | Outerwear | Cream      | 5         | Casual, Work |
| Brown leather boots    | Shoes     | Brown      | 4         | Casual, Work |
| Burgundy wrap dress    | Dress     | Burgundy   | 7         | Date, Party  |
| Dark denim jeans       | Bottom    | Indigo     | 3         | Casual       |
| White cotton t-shirt   | Top       | White      | 2         | Casual       |
| Black blazer           | Outerwear | Black      | 9         | Work, Formal |
| Gold earrings          | Accessory | Gold       | 6         | Party, Date  |
| Olive chinos           | Bottom    | Olive      | 4         | Casual, Work |
| Floral silk scarf      | Accessory | Multi      | 5         | Work, Date   |
| Black pumps            | Shoes     | Black      | 8         | Work, Formal |
| Grey wool coat         | Outerwear | Grey       | 7         | Work, Formal |
| Striped linen shirt    | Top       | Blue/White | 4         | Casual       |
| Red clutch             | Accessory | Red        | 7         | Party, Date  |

### 8.2 Pre-Computed Embeddings

Run precompute script on all 15-20 items before demo day:

```bash
npx ts-node scripts/precompute-embeddings.ts --user-id <demo-user-id>
```

This eliminates HF API dependency during the live demo.

---

## 9. Implementation Phasing

### Phase 1a: Foundation (Days 1-4)

- P0-01: Project scaffold + auth
- P0-02: Data model + storage
- P1-05: Empty state / onboarding

### Phase 1b: Ingestion (Days 5-8)

- P0-03: Camera / image upload
- P0-04: Auto-tagging pipeline
- P1-02: Upload progress states
- P1-03: Thumbnail generation

### Phase 1c: Retrieval + Composition (Days 9-12)

- P0-05: Closet grid UI
- P0-06: Outfit composer
- P1-06: Magic Bar prompt interpretation
- P1-01: Tag editing UI

### Phase 1d: Polish (Days 13-14)

- P0-07: Error handling pipeline
- P1-04: Item deletion
- P1-07: Item detail view
- Pre-seed demo data
- Screen recording backup
- Demo rehearsal

---

## 10. Scope Boundary

### In Scope for MVP

- Email authentication
- Camera + gallery image upload
- Claude Vision auto-tagging
- CLIP embedding generation
- Semantic similarity search
- Slot-based outfit composition
- Magic Bar with NL input
- Closet grid with filtering

### Out of Scope for MVP (Phase 2)

- Google OAuth
- Style clustering (HAC)
- 2D avatar / virtual try-on
- Outfit favorites / save
- Style DNA visualization
- Weather-based suggestions
- Share to social media
- Wear tracking
- Multi-user social features
- Push notifications

---

## 11. Success Criteria

The MVP is complete when:

- [ ] User can sign up with email and see an empty closet with onboarding CTA
- [ ] User can photograph a clothing item and see it appear in the closet grid within 10 seconds
- [ ] Tags are correct for 80%+ of items in typical home lighting conditions
- [ ] User can correct a wrong tag by tapping it
- [ ] User can type "outfit for a casual Friday" and receive a composed set of 2-4 items
- [ ] Outfit compositions are plausible (no formal jacket with gym shorts)
- [ ] Failed uploads show an error message with a retry action, not silent failure
- [ ] Demo runs with 15-20 pre-loaded items without network dependency for core features
- [ ] App builds successfully for iOS (TestFlight) and Android (APK)
- [ ] Screen recording backup available if live demo fails
