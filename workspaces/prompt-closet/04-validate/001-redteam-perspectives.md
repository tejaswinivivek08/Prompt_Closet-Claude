# Prompt Closet Phase 1 — Red Team Evaluation

**Date**: 2026-04-17
**Scope**: User experience, ML architecture, investor risk
**Status**: CRITICAL ISSUES FOUND

---

## PERSPECTIVE 1: AS A USER (First-Time Experience)

### Finding U1 — BROKEN ADD FLOW (CRITICAL)

**File**: `src/screens/wardrobe/AddItemScreen.tsx:16`

```typescript
import { analyzeImage } from "@/services/aiTaggingService";
```

The service file is named `taggingService.ts`, not `aiTaggingService.ts`. This is a **runtime crash** — the app will throw `MODULE_NOT_FOUND` the moment a user taps the "+" FAB to add an item. The user never gets to see AI tagging or any of the magic.

**Fix**: Rename the import to `@/services/taggingService` and verify `analyzeImage` is the correct export name from `taggingService.ts`.

---

### Finding U2 — MAGIC BAR IS NOT DISCOVERABLE (MAJOR)

**Spec promise** (`specs/magic-bar.md §2.1`): Magic Bar is a **persistent rail visible on ALL screens**, above the tab bar, always accessible.

**Reality**: Magic Bar is implemented as a separate full-screen modal screen (`MagicBarScreen`) navigable only via the "✨ Ask AI Stylist" button inside `ClosetScreen`. A user exploring the app for the first time who taps the Style tab (which is a `ClosetScreen` placeholder) or Profile tab will **never see the Magic Bar**. It is completely hidden behind an obscure button.

**What the user actually experiences**:

- Downloads the app
- Signs in (auth works ✓)
- Sees the closet grid (works ✓)
- Taps Style tab → sees same closet grid
- Taps Profile tab → sees same closet grid
- Never finds the AI stylist

**Fix**: The Magic Bar must either (a) be the Style tab's actual content replacing the placeholder, or (b) be a visible persistent rail above the tab bar on all screens. Option (a) is faster to implement.

---

### Finding U3 — NO ONBOARDING (MAJOR)

**Spec promise** (`03-user-flows/01-onboarding.md`): 3-slide onboarding with value prop, how-it-works, and get-started → sign up flow.

**Reality**: Task 13 (onboarding) is pending. First-time users land directly on the Closet screen which shows an empty state ("Your closet is empty. Tap + to add your first item"). With the broken add flow (U1), they tap "+", the app crashes. If the crash were fixed, they'd need to figure out camera vs gallery on their own with no guidance.

**Fix**: Build the 3-slide onboarding. The "Get Started" slide should feed directly into sign-up.

---

### Finding U4 — ADD ITEM: CAMERA OR LIBRARY? (MODERATE)

The `AddItemScreen` asks for camera or library but provides no guidance on what makes a good photo. The user flows specify guidance overlays:

> "Position the item flat. Avoid cluttered backgrounds. Good lighting helps me tag better!"

Without photo guidance, the first 5 items a user uploads will be hanger shots, wrinkled items on beds, and blurry selfies — all of which produce garbage AI tags, leading the user to conclude "this app doesn't work."

**Fix**: Add a lightweight guidance overlay before the camera opens (1-2 sentences: "Lay items flat. Use natural light. Avoid busy backgrounds.").

---

### Finding U5 — TAG CORRECTION IS HIDDEN (MODERATE)

The spec says users should be able to correct wrong AI tags. The `ReviewTagsScreen` exists and has a tag editing UI. But the add-item flow does not navigate to it after AI tagging — `AddItemScreen.tsx` appears to skip directly to "done" after analysis.

**Fix**: Verify that after `analyzeImage()` returns, the app navigates to `ReviewTagsScreen` with the image URL and tags for user confirmation. If not wired, add the navigation.

---

### Finding U6 — WHAT IS "SHUFFLE" ON AN EMPTY GRID? (MINOR)

A new user opens the app, closet is empty, they tap the AI Stylist. MagicBarScreen searches with an empty result and shows "I couldn't find anything in your closet for this." with an "Add items to closet" button. This message is correct but the UX is jarring on first use — it immediately tells the user the app doesn't work before they've added anything.

**Fix**: If closet has <3 items, show a different first-run message in Magic Bar: "Add a few items first, then I'll help you find the perfect outfit."

---

## PERSPECTIVE 2: AS A PROFESSOR (ML DEPTH)

### Finding M1 — CLIP THRESHOLD 0.3 IS TOO LOOSE (SIGNIFICANT)

**Current code** (`embeddingService.ts:409`):

```typescript
const results = await semanticSearch(user.id, query, 20, 0.2); // MagicBar uses 0.25
```

0.2–0.25 cosine similarity corresponds to roughly 80–75% angle similarity. At this threshold, "red dress" will return navy blue items, white shirts, and anything with a vaguely similar shape. The result quality degradation is significant for fashion use cases where subtle distinctions matter.

**Fix**: Raise threshold to 0.35–0.4 for production. The analysis doc recommends 0.3 as a starting point — but the analysis also noted CLIP struggles with fine-grained distinctions. A tighter threshold reduces false positives at the cost of fewer results, which is the right tradeoff for a demo.

---

### Finding M2 — NO ACTUAL ML LEARNING (FUNDAMENTAL)

The app is **pure retrieval**:

- CLIP embeddings are pre-computed, fixed at ingestion time
- Semantic search is cosine similarity against a static index
- The "AI stylist" is Claude API calling CLIP-retrieved items — not learning from user behavior

There is zero feedback loop. If a user rejects 10 "festive" outfits, the system never adjusts. If they always pick slim-fit items, the system never infers that preference.

**For the course demo**: This is fine — CLIP + pgvector demonstrates the required ML concepts. But for a pitch, this is a moat question (see §3).

**Fix (Phase 2)**: Add implicit feedback: track saved-vs-rejected outfits. Build a preference embedding that shifts search toward liked items using Bayesian updates or a simple dot-product against a learned preference vector.

---

### Finding M3 — BIAS IN AUTO-TAGGING (UNDERRISKED)

The `taggingService.ts` system prompt says "Analyze clothing items precisely" with no explicit bias mitigation. Claude Vision was trained on internet data that overrepresents Western clothing and underrepresents:

- South Asian traditional wear (saree draping styles, kurta variations, regional embroidery)
- Diverse body types and skin tones in model photos
- Non-standard photography (folded items, hanger shots common in Indian households)

The current fix (per spec) is `MOCK_TAGGING=true` for demo — this sidesteps the bias question rather than addressing it. Real inference on Indian clothing items with a generalist model may produce systematically wrong subcategory labels.

**Fix**: Add a clothing diversity note in the Claude prompt: "Pay special attention to South Asian traditional wear including sarees, kurtas, lehengas, and sherwanis. When uncertain about regional variants, defer to the most accurate specific label." This won't eliminate bias but will reduce it.

---

### Finding M4 — COLD START ON HF API (DEMO CRITICAL)

Confirmed from failure analysis (R1): Hugging Face Inference API free tier has 10 req/min rate limit and 10-30 second cold starts. For a demo uploading 20 images, the first embedding request hangs for 30s, subsequent requests get rate-limited.

**Current mitigations**:

- `MOCK_EMBEDDING=true` in `.env` for local dev
- No pre-computed embeddings for demo account
- No local ONNX fallback

**Fix for demo day**: Either (a) pre-compute all demo embeddings and disable live embedding during demo, or (b) use the mock flag to simulate instant embeddings and show the real flow with pre-seeded data.

---

## PERSPECTIVE 3: AS AN INVESTOR

### Finding V1 — THE MOAT IS NOT REAL (KILLER RISK)

Stylebook (or any closet app) can add CLIP + pgvector in approximately 3 months:

1. Add Supabase SDK + storage (1 week)
2. Integrate CLIP ViT-B/32 via Hugging Face API (1 day — it's one API call)
3. Add pgvector extension + `match_wardrobe_items` SQL function (1 day)
4. Wire to existing closet grid (1 sprint)
5. Add a Claude API call for outfit composition (3 days)

The entire "AI layer" is two API integrations with no proprietary data, no learned user preferences, no social graph, and no network effects. Any engineer at any competitor can replicate it.

**What would actually be a moat**:

- Curated Indian fashion embedding fine-tune dataset (expensive, defensible)
- User preference learning (the more you use it, the better it gets — not achievable in 3 months)
- Social features (outfit sharing, style Following)
- Integration with Indian fashion brands/marketplaces

---

### Finding V2 — FROM DEMO TO PAYING USERS: UNCLEAR PATH (STRATEGIC)

The app currently has no monetization. The path to "₹299/month subscription" is not visible:

- Why would a user pay vs using a free Pinterest board + Google Lens?
- What is the retention mechanic? (Items wear out, users stop opening the app)
- Indian fashion has strong in-store shopping culture — how does this compete?

The Magic Bar is a nice feature, but it's not transformational without the learning loop (M2).

---

### Finding V3 — METRIC FOR WEEK 1 (OPERATIONAL)

**Track**: Weekly active closets (users who added ≥1 item in the week) AND weekly Magic Bar sessions per active closet.

The magic number is: **"Do users add more than 3 items?"** If yes → they're engaged. If no → the add-item flow is broken (confirmed broken in U1).

If users add items but don't use Magic Bar → the feature is discoverable (per U2, it currently isn't).

---

## CRITICAL ISSUES BEFORE DEMO DAY (Priority Order)

### P0 — MUST FIX (App doesn't work at all)

| #   | Issue                                                      | Impact                                          | Fix Effort |
| --- | ---------------------------------------------------------- | ----------------------------------------------- | ---------- |
| U1  | `aiTaggingService` import broken → app crashes on add item | User cannot add items, entire core flow is dead | <30 min    |
| U5  | `ReviewTagsScreen` navigation not wired in add-item flow   | Tags are saved without user review/confirmation | <1 hour    |

### P1 — MUST FIX (Core feature is broken)

| #   | Issue                                                          | Impact                                                       | Fix Effort          |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------ | ------------------- |
| U2  | Magic Bar is hidden behind a button — most users never find it | The #1 feature is invisible                                  | 2-4 hours           |
| U3  | No onboarding — first-time user experience is broken           | User downloads app, sees empty grid, doesn't know what to do | 1 day               |
| U4  | No photo guidance — users upload hanger shots and bad photos   | AI tags are garbage, user blames the app                     | <2 hours            |
| M4  | No pre-seeded demo data — live demo will fail on CLIP HF API   | Demo is unreliable on stage                                  | <1 hour (seed data) |

### P2 — SHOULD FIX (Quality of demo)

| #   | Issue                                                    | Impact                              | Fix Effort         |
| --- | -------------------------------------------------------- | ----------------------------------- | ------------------ |
| M1  | Search threshold too loose — results include wrong items | Demo looks less impressive          | <30 min            |
| V1  | Moat is zero — nothing prevents Stylebook copying        | Pitch is vulnerable                 | Long-term          |
| M2  | No learning loop                                         | Not ML-rigorous                     | Phase 2            |
| M3  | Bias in tagging                                          | Risk of poor Indian fashion support | Prompt engineering |

---

## VERIFICATION COMMANDS RUN

```bash
# Check broken import
grep "aiTaggingService" /Users/ankitsinha/Documents/GitHub/Prompt_Closet-Claude/apps/mobile/src/screens/wardrobe/AddItemScreen.tsx
# → FOUND: imports from non-existent @/services/aiTaggingService

# Check actual service file name
ls /Users/ankitsinha/Documents/GitHub/Prompt_Closet-Claude/apps/mobile/src/services/
# → embeddingService.ts, taggingService.ts (NO aiTaggingService.ts)

# Check Magic Bar navigation
grep -n "MagicBar" /Users/ankitsinha/Documents/GitHub/Prompt_Closet-Claude/apps/mobile/src/navigation/index.tsx
# → MagicBar is a root stack screen, but not in the tab navigator
# → Only accessible via button press, not discoverable navigation

# Check ReviewTagsScreen wiring
grep -n "ReviewTags\|navigate" /Users/ankitsinha/Documents/GitHub/Prompt_Closet-Claude/apps/mobile/src/screens/wardrobe/AddItemScreen.tsx
# → No navigation to ReviewTagsScreen found in AddItemScreen

# Check search threshold
grep "match_threshold\|0\.2\|0\.25" /Users/ankitsinha/Documents/GitHub/Prompt_Closet-Claude/apps/mobile/src/services/embeddingService.ts
# → semanticSearch called with 0.2 and 0.25 in multiple places
```
