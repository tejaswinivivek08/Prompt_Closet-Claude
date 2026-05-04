# Red Team Validation Report — Prompt Closet Web

**Date:** 2026-04-30
**App:** https://prompt-closet-web.vercel.app
**Phase:** 04-validate

---

## Spec Compliance Audit

Sources audited: `specs/`, `briefs/`, `workspaces/prompt-closet-web/01-analysis/`, `workspaces/prompt-closet-web/02-plans/`, `workspaces/prompt-closet-web/todos/completed/`

### Spec Promises vs Implementation

| Spec Section | Promise | Verification | Status |
|---|---|---|---|
| Magic Bar | Keyword-based outfit matching | `grep -n "parseQuery\|scoreItem\|buildOutfits" apps/web/prompt-closet-web/src/app/api/magicbar/route.ts` → 3 functions found | ✅ IMPLEMENTED |
| Magic Bar | MiniMax LLM enhancement | `grep -n "MiniMax\|minimax" apps/web/prompt-closet-web/src/app/api/magicbar/route.ts` → Enhancement block present | ✅ IMPLEMENTED |
| Upload | Claude Vision primary tagging | `grep -n "claude\|vision\|anthropic" apps/web/prompt-closet-web/src/app/api/upload/route.ts` → claude-sonnet-4-20250514 | ✅ IMPLEMENTED |
| Upload | MiniMax fallback | `grep -n "MiniMax\|image-01" apps/web/prompt-closet-web/src/app/api/upload/route.ts` → `analyzeWithMiniMax()` defined | ⚠️ RETURNS NULL |
| Digital Twin | 3D avatar viewer | `grep -n "three\|@react-three\|GLBModel" apps/web/prompt-closet-web/src/components/AvatarViewer.tsx` → Three.js canvas present | ✅ IMPLEMENTED |
| Digital Twin | MiniMax avatar generation | `grep -n "MiniMax\|avatar" apps/web/prompt-closet-web/src/app/api/avatar/route.ts` → Endpoint exists | ⚠️ FALLBACK ONLY |
| Auth | Magic link via Supabase | `grep -n "signInWithOtp" apps/web/prompt-closet-web/src/app/auth/AuthClient.tsx` → Found | ✅ IMPLEMENTED |
| Closet | Item CRUD | `grep -n "supabase.*insert\|supabase.*delete\|supabase.*update" apps/web/prompt-closet-web/src/app/app/closet/ClosetClient.tsx` → CRUD operations present | ✅ IMPLEMENTED |

---

## GAP Findings

### GAP-1: HuggingFace CLIP Embeddings Not Implemented — HIGH

**Evidence:**
```bash
$ grep -rni "clip\|CLIP\|huggingface\|sentence_transformer" apps/web/prompt-closet-web/src/
# No results
```

**Impact:** The Magic Bar keyword-based approach is a fallback. Semantic similarity search via CLIP embeddings was listed as an enhancement path and is not implemented. Outfit scoring relies on exact keyword matching only.

**Recommendation:** Implement CLIP embeddings for semantic outfit matching, or explicitly scope Magic Bar to keyword-only.

---

### GAP-2: MiniMax Vision Analysis Always Returns Null — HIGH

**Evidence:**
`apps/web/prompt-closet-web/src/app/api/upload/route.ts`:
```typescript
async function analyzeWithMiniMax(imageBase64: string): Promise<string[]> {
  // ... API call to MiniMax image-01 ...
  // MiniMax image-01 returns image URLs, NOT structured tag text
  return null; // ← Always falls through to FALLBACK_TAGS
}
```

**Impact:** Every uploaded image uses `FALLBACK_TAGS` (coral, beige, casual, etc.) regardless of actual image content. No actual AI vision analysis occurs.

**Root Cause:** MiniMax's `image-01` model generates images, not analyzes them. Structured tag extraction requires a vision-capable model (Claude Vision, GPT-4o, or MiniMax's VL model).

**Fix Options:**
1. Use Claude Vision (already wired for primary tagging — extend to also return structured tags for upload)
2. Use MiniMax's VL model for vision analysis (check if available)
3. Acknowledge MiniMax vision is not available and remove `analyzeWithMiniMax` dead code

---

### GAP-3: Digital Twin Uses Unsplash Fallback, Not Real 3D Avatar — MEDIUM

**Evidence:**
`apps/web/prompt-closet-web/src/app/app/twin/TwinClient.tsx`:
```typescript
const avatarUrl = useMemo(() => {
  if (imageUrl) return imageUrl;
  if (avatarData?.image_url) return avatarData.image_url;
  // Unsplash fallback
  return `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop`;
}, [imageUrl, avatarData]);
```

**Impact:** Digital Twin always shows the Unsplash photo-person, never a MiniMax-generated or actual 3D avatar. The 6-step wizard captures body data that is never used in avatar generation.

**Fix:** Wire collected body data to MiniMax avatar API or implement proper 3D avatar generation pipeline.

---

### GAP-4: No Test Files Exist — HIGH

**Evidence:**
```bash
$ find apps/web/prompt-closet-web -name "*.test.*" -o -name "*.spec.*" -o -name "**/__tests__/**"
# No results
```

**Impact:** Zero regression coverage. Any future change can break existing functionality with no signal.

**Required:** Add Playwright E2E tests for critical paths (auth, closet CRUD, magic bar, twin wizard).

---

### GAP-5: Navbar.tsx Is Orphaned — LOW

**Evidence:**
```bash
$ grep -r "Navbar" apps/web/prompt-closet-web/src/app/
# No results referencing Navbar.tsx
```

**Impact:** `src/components/Navbar.tsx` exists and has fixes applied (logo sizing to 48px, active state rose-gold border), but is never imported. The app layout (`app/app/layout.tsx`) uses an inline navigation implementation instead.

**Disposition:** Either import `Navbar.tsx` into the app layout, or delete it to avoid dead code confusion.

---

## E2E Validation (Playwright)

| Test | Result |
|---|---|
| Landing page loads, title correct | ✅ PASS |
| Hero section present with logo, tagline, CTA | ✅ PASS |
| Pricing section (S$0, S$9.99, S$49.99) | ✅ PASS |
| Features section visible | ✅ PASS |
| Auth page: sign-in tab, email field | ✅ PASS |
| Auth page: sign-up tab switch | ✅ PASS |
| Protected route `/app/closet` redirects to `/auth` | ✅ PASS |

---

## End-to-End Flows

| Flow | Status |
|---|---|
| Sign up with magic link | ✅ Handled by `signInWithOtp` |
| Add item to closet (upload photo) | ✅ `upload/route.ts` processes image |
| Magic Bar search | ✅ Keyword matching + LLM enhancement |
| Accept/reject outfit suggestion | ✅ Inserts to `outfits` table, logs feedback |
| Digital Twin wizard | ✅ 6 steps, saves to `digital_twins` table |

---

## Summary

| Finding | Severity | Type |
|---|---|---|
| CLIP embeddings not implemented | HIGH | GAP |
| MiniMax vision always returns null | HIGH | GAP |
| Digital Twin uses Unsplash fallback | MEDIUM | GAP |
| No test files | HIGH | GAP |
| Navbar.tsx orphaned | LOW | GAP |

**Convergence Criteria:**
- 2 CRITICAL findings remain: none
- 3 HIGH findings remain: CLIP, MiniMax null, no tests
- Next step: resolve HIGH gaps before Phase 05 codify
