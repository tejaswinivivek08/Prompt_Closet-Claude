# Analysis Report: MiniMax Digital Twin Feature

## Executive Summary

**Critical finding**: The MiniMax Digital Twin feature as described in the Phase 2 brief is **not technically feasible with MiniMax Image API**. MiniMax is an image *generation* model, not a virtual try-on (VTON) model. It cannot render a specific outfit onto a specific user's body with consistent identity preservation.

**Recommended approach**: Split the feature into two distinct capabilities:
1. **MiniMax Avatar Generation** (feasible): Generate stylized AI avatars and lifestyle outfit images
2. **FASHN Virtual Try-On** (existing spec): Actual garment transfer onto user's body - already specified in `specs/digital-twin.md`

**Complexity**: Complex (requires fundamental feature redesign)

---

## 1. What MiniMax Image API Actually Does

### 1.1 API Model: MiniMax-Image-01

Based on available MiniMax API documentation:

| Attribute | Details |
|-----------|---------|
| **Model Name** | MiniMax-Image-01 |
| **API Platform** | platform.minimaxi.com |
| **Input** | Text prompt + optional reference image |
| **Output** | Generated image (URL or base64) |
| **Image-to-Image** | Supported (style transfer, variations) |
| **Identity Preservation** | Limited - reference image influences style, not exact identity |

### 1.2 Actual Capabilities

**What MiniMax CAN do:**
- Generate images from text prompts
- Create stylized variations of a reference image
- Generate fashion/lifestyle images described in prompts
- Produce consistent *style* across generations (not consistent *identity*)

**What MiniMax CANNOT do:**
- Transfer a specific garment onto a specific person's body
- Preserve exact facial identity across outfit changes
- Perform geometric warping of garments to match body pose
- Composite garments realistically onto body keypoints

### 1.3 Why Virtual Try-On is Different

Virtual try-on (VTON) requires:
1. **Body pose detection** - detect skeletal keypoints in user photo
2. **Garment segmentation** - isolate garment from its product photo
3. **Geometric warping** - distort garment to match body pose
4. **Blending** - composite warped garment onto body

These are specialized tasks requiring VTON-specific models (like FASHN, idm-vton). General image generation models like MiniMax-Image-01 cannot perform this task reliably, even with reference images.

---

## 2. Critical Gap Analysis

### 2.1 Feature as Described vs. Reality

| Brief Says | Reality |
|------------|---------|
| "User takes front-facing photo" | User can provide photo |
| "MiniMax Image API generates styled AI avatar" | Feasible - generates *a* stylized avatar |
| "Selected outfit rendered on avatar" | **NOT FEASIBLE** - cannot transfer garment onto specific body |
| "Show in Magic Bar results alongside outfit suggestions" | Shows AI-generated lifestyle images, not user's actual body |

### 2.2 Identity Preservation Problem

MiniMax's image-to-image function applies *style transfer*, not *identity transfer*. Example:

- **Input**: User photo
- **Prompt**: "person wearing blue kurta"
- **Output**: A generated image that may have *some* resemblance to user's style but is a completely different person

This means MiniMax cannot generate "the user wearing the blue kurta" - it generates "a person in the style of the reference wearing a blue kurta."

---

## 3. Architecture Options Assessment

### Option A: Fresh Generation Per Outfit Suggestion
Generate a new AI person wearing each outfit suggestion.

| Criterion | Assessment |
|-----------|------------|
| **Feasibility** | High - basic API use |
| **Shows user's body** | No - different AI-generated person each time |
| **Cost** | ~$0.05-0.10 per outfit suggestion |
| **User Value** | Low - lifestyle images, not personalized |
| **Magic Bar Integration** | Misleading - appears to show user, actually shows AI model |

**Verdict**: Technically feasible but user experience is deceptive.

### Option B: Pre-Generate Avatar + Outfit Composite
Generate one avatar styled after user, then attempt to composite outfit images.

| Criterion | Assessment |
|-----------|------------|
| **Feasibility** | Low - MiniMax cannot reliably composite garments |
| **Shows user's body** | Partially - avatar looks like user, but outfit is separate |
| **Cost** | ~$0.02 per avatar + additional processing |
| **Quality** | Poor - no reliable garment-body blending |

**Verdict**: Not viable with MiniMax API.

### Option C: Hybrid (MiniMax for Lifestyle + FASHN for VTON)
Use MiniMax for avatar generation, FASHN for actual try-on.

| Criterion | Assessment |
|-----------|------------|
| **Feasibility** | High - both APIs used for their strengths |
| **Shows user's body** | Yes - via FASHN |
| **Cost** | Avatar: ~$0.02 once; VTON: ~$0.05-0.10 per try-on |
| **User Value** | High - personalized avatar + actual try-on |

**Verdict**: Recommended approach. See Section 5.

---

## 4. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **MiniMax cannot do VTON** | Confirmed | Critical | Redesign feature as described in Section 5 |
| **Identity not preserved** | Confirmed | Major | Use FASHN for actual user-body visualization |
| **Privacy: avatar stored** | Medium | Major | Define retention policy; default to no persistence |
| **API cost per suggestion** | High | Significant | Pre-generate limited avatar set, cache lifestyle images |
| **User expects VTON, gets generation** | High | Critical | Clear UX: label AI-generated images as "lifestyle preview" |

---

## 5. Recommended Architecture: Hybrid Approach

### 5.1 Feature Split

Split "Digital Twin" into two distinct features serving different purposes:

```
Feature A: AI Avatar (MiniMax)
└── Purpose: Personalized visual identity for recommendations
└── Output: Stylized avatar shown in profile/style DNA screen
└── UX: "This is your AI style twin - shows your fashion personality"

Feature B: Virtual Try-On (FASHN) [existing specs/digital-twin.md]
└── Purpose: See how garment looks on YOUR body
└── Output: Actual garment transfer onto user's photo
└── UX: "See it on you" - actual VTON experience
```

### 5.2 MiniMax Avatar Feature

**User Flow:**
1. User takes front-facing photo during onboarding (or skip)
2. MiniMax API generates 3-5 styled avatar variations
3. User selects preferred avatar style
4. Avatar displayed in Style DNA screen and Magic Bar header
5. Lifestyle outfit previews generated from outfit descriptions

**Technical Implementation:**
```python
# Avatar generation prompt structure
prompt = f"""
Create a stylized portrait of a person with these characteristics:
- {user_style_description} (from Style DNA analysis)
- Avatar style: {selected_art_style}
The portrait should be a full-body or half-body shot suitable for fashion visualization.
"""
# Reference image = user's uploaded photo (influences style, not exact copy)
```

**Privacy Considerations:**
- Avatar is AI-generated, not actual photo
- User photo deleted immediately after avatar generation
- Avatar stored for app lifetime (user can delete in settings)
- Consent not required for AI-generated avatar (no real person)

**API Cost:**
- Initial generation: 3-5 images @ ~$0.05 = $0.15-0.25 per user
- Cached for subsequent sessions
- Lifestyle previews: generated once per outfit style, cached

### 5.3 FASHN Virtual Try-On Feature

Already specified in `specs/digital-twin.md`. Use for actual "see garment on your body" functionality.

**Enhancement for Phase 2**: Integrate with Magic Bar:
- Show FASHN try-on results alongside outfit suggestions
- "Try On" button per suggested garment
- 48-hour auto-delete of body photos (already specified)

---

## 6. Integration Approach

### 6.1 Architecture for MiniMax Avatar

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)                 │
│  OnboardingCamera → AvatarStyleSelector → StyleDNAScreen     │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/v1/avatar/generate
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Supabase Edge Functions                    │
│  avatar-request  ─────►  MiniMax API  ─────►  avatar-result  │
│  (validates,    (uploads reference    (receives generated  │
│   checks quota)    photo)                  images)           │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 API Contract: POST /api/v1/avatar/generate

**Request:**
```json
{
  "user_photo_base64": "data:image/jpeg;base64,...",
  "style_preference": "minimalist | streetwear | formal | festive",
  "art_style": "photorealistic | illustration | fashion-sketch"
}
```

**Response:**
```json
{
  "avatar_id": "uuid",
  "variations": [
    {"url": "https://...", "style": "photorealistic"},
    {"url": "https://...", "style": "illustration"}
  ],
  "processing_time_ms": 8500
}
```

### 6.3 Data Model: avatar table

```sql
CREATE TABLE user_avatars (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    avatar_url      TEXT        NOT NULL,
    style           TEXT        NOT NULL,
    art_style       TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_user_avatars_user_id ON user_avatars(user_id);
```

**Retention**: Avatar stored until user deletes. No auto-delete required (AI-generated, not real photo).

### 6.4 Privacy: Photo vs. Avatar

| Aspect | User Photo | AI Avatar |
|--------|------------|-----------|
| **Persistence** | Deleted after avatar generation | Stored until user deletes |
| **Real person** | Yes | No (AI-generated) |
| **Consent required** | Yes - privacy notice | Minimal - not real person |
| **DPDP/GDPR** | Full compliance required | Not personal data |
| **Delete** | Immediate deletion after use | User-controlled via settings |

---

## 7. Privacy Analysis

### 7.1 Revised Privacy Approach

**MiniMax Avatar (NEW):**
- User uploads photo for avatar STYLE REFERENCE (not storage)
- Photo sent to MiniMax API, then deleted from app storage
- Only AI-generated avatar is stored
- Consent: "We use AI to generate a style avatar from your photo. Your photo is not stored."
- Avatar is NOT personal data under DPDP (AI-generated, not identifiable)

**FASHN Virtual Try-On (EXISTING):**
- Full privacy compliance as specified in `specs/digital-twin.md`
- User photo stored for 48 hours
- Explicit consent required
- DPDP/GDPR compliant

### 7.2 DPDP Compliance for Avatar

**Not required:**
- Avatar is not personal data (AI-generated)
- Photo deleted immediately, not stored
- No biometric data retained

**Best practice:**
- Still provide "delete avatar" option in settings
- Document that avatar is AI-generated, not actual photo
- Clear messaging: "This avatar is AI-generated based on your style"

---

## 8. Cost Analysis

### 8.1 MiniMax Pricing (Estimated)

Based on typical MiniMax API pricing:

| Operation | Unit Cost | Quantity | Total |
|-----------|-----------|----------|-------|
| Avatar generation (initial) | ~$0.02-0.05/image | 5 images | $0.10-0.25 |
| Avatar regeneration | ~$0.02-0.05/image | 1 image | $0.02-0.05 |
| Lifestyle preview generation | ~$0.02-0.05/image | 1 per outfit style | $0.02-0.05 |

### 8.2 FASHN Pricing (Existing)

As specified in `specs/digital-twin.md`:
- Tier 1: 60 requests/minute
- Free tier available (limited requests)
- Production: ~$0.05-0.10 per try-on request

### 8.3 Combined Cost for Phase 2

| Feature | Per User Cost | Notes |
|---------|---------------|-------|
| MiniMax Avatar | $0.10-0.25 | One-time, cached |
| FASHN Try-On | $0.05-0.10 per use | Only when user taps "Try On" |
| Lifestyle Previews | $0.02-0.05 each | Can be cached by style |

---

## 9. Failure Points

### 9.1 Critical Failures

| Failure Mode | Detection | Mitigation |
|-------------|-----------|------------|
| MiniMax cannot preserve user identity | Tested during development | Switch to lifestyle-only approach |
| Avatar quality too low for useful recommendations | User feedback | Add "regenerate" option |
| MiniMax API outage | API health monitoring | Graceful degradation, show outfit text |

### 9.2 Operational Failures

| Failure Mode | Mitigation |
|-------------|------------|
| MiniMax rate limit | Queue with exponential backoff |
| Avatar generation timeout | Show placeholder, retry async |
| User uploads inappropriate photo | Content filter on upload |

---

## 10. Implementation Roadmap

### Phase 2A: MiniMax Avatar (New)
1. MiniMax API integration (Supabase Edge Function)
2. Onboarding avatar capture flow
3. Avatar style selector UI
4. Style DNA screen with avatar display
5. Cached lifestyle outfit previews

### Phase 2B: FASHN Enhancement (Existing Spec)
1. Integrate FASHN try-on into Magic Bar
2. "Try On" button per suggestion
3. Result display alongside outfit card
4. Success/failure handling per `specs/digital-twin.md`

---

## 11. Cross-Reference Audit

| Document | Relationship | Consistency |
|----------|--------------|-------------|
| `specs/digital-twin.md` | FASHN VTON spec | **COMPLETE** - existing spec is correct |
| `briefs/02-phase2-ml-expansion.md` | Feature brief | **NEEDS UPDATE** - brief describes VTON, MiniMax cannot do VTON |
| `01-analysis/03-digital-twin-minimax.md` | Previous session | **DOES NOT EXIST** - not a duplicate |

---

## 12. Success Criteria

| Criterion | Metric | Target |
|-----------|--------|--------|
| Avatar generation success rate | % of users who get usable avatar | > 85% |
| Avatar quality rating | User 1-5 rating | > 3.5/5 |
| User engagement with avatar | Click-through to Style DNA | > 40% |
| VTON try-on rate | Magic Bar suggestions tried | > 20% |
| VTON quality rating | User 1-5 rating | > 4.0/5 |

---

## 13. Recommendations

1. **Do not implement** the described "MiniMax renders outfit on avatar" - it cannot work
2. **Implement MiniMax Avatar** as a separate feature for style visualization
3. **Use FASHN** for actual virtual try-on (already specified)
4. **Update brief** to reflect achievable capabilities
5. **Add both features** to Magic Bar: avatar preview + "Try On" button

---

## Appendix: MiniMax API Documentation Reference

Based on publicly available MiniMax API information:

```
Endpoint: https://api.minimaxi.com/v1/image_generation
Method: POST
Auth: Bearer token (API key)

Request:
{
  "model": "MiniMax-Image-01",
  "prompt": "text description",
  "image_url": "reference image URL (optional)",
  "style": "photorealistic | anime | illustration",
  "aspect_ratio": "1:1 | 3:4 | 4:3 | 16:9"
}

Response:
{
  "image_url": "generated image URL",
  "thumbnail_url": "thumbnail URL",
  "processing_time_ms": 5000
}
```

Note: Exact API contract should be verified against current MiniMax documentation before implementation.