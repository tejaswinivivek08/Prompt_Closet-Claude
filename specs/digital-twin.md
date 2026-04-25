# Digital Twin / Virtual Try-On — Phase 2 Spec

## Overview

Virtual try-on allows users to see how a garment looks on their own body before purchasing. The user selects a clothing item from their closet, takes or uploads a full-body photo, and receives an AI-generated image showing the garment draped on their body. This is a pipeline feature: the core work is API orchestration, image storage, and consent management — not model training.

---

## Virtual Try-On Architecture

### User Flow

```
[1] User browses closet and taps "Try On" on a garment card
           |
           v
[2] Modal opens: camera capture or photo library upload
    - Full-body photo required (face visible recommended, optional)
    - Minimum resolution: 512x1024px
    - Max file size: 10MB
    - Accepted formats: JPEG, PNG, WebP
           |
           v
[3] User reviews the uploaded body photo, confirms consent
    - Consent banner displayed: "Your photo will be sent to FASHN for virtual
      try-on. Photos are auto-deleted after 48 hours."
    - User must explicitly tap "Agree & Continue"
           |
           v
[4] FASHN API call triggered (person_photo_url + garment_photo_url)
           |
           v
[5] Loading state displayed (estimated 8-15 seconds)
           |
           v
[6] Result image displayed in modal
    - User can save to gallery or discard
    - Garment in result inherits pose/body from input photo
           |
           v
[7] On success: result URL stored to Supabase Storage
    - Associated with the garment item for future reference
           |
           v
[8] On failure: fallback flow (see Fallback Architecture)
```

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (React)                       │
│  ClosetGrid → TryOnModal → CameraUpload → ResultView        │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/v1/tryon
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Supabase Edge Functions                    │
│  tryon-request  ─────►  FASHN API  ─────►  tryon-result     │
│  (validates,   (uploads photos to    (receives webhook,     │
│   checks consent)  Supabase Storage)    stores result)       │
└─────────────────────────────────────────────────────────────┘
```

### FASHN API Integration (Primary Provider)

**API Endpoint:** `POST https://api.fashn.ai/v1/tryon`

**Authentication:** Bearer token via `FASHN_API_KEY` environment variable.

**Input Format:**

```json
{
  "person_image": "https://<project>.supabase.co/storage/v1/object/public/user_body_photos/<user_id>/<photo_id>.jpg",
  "garment_image": "https://<project>.supabase.co/storage/v1/object/public/garment_items/<item_id>.jpg",
  "category": "upper_body | lower_body | dress | full_body",
  "description": "AI-detected category from auto-tagging"
}
```

**Output Format:**

```json
{
  "status": "success",
  "result_url": "https://<project>.supabase.co/storage/v1/object/public/tryon_results/<user_id>/<result_id>.jpg",
  "processing_time_ms": 12400,
  "result_id": "<uuid>"
}
```

**Error Response:**

```json
{
  "status": "error",
  "error_code": "invalid_image | processing_failed | rate_limit | timeout",
  "message": "Human-readable error message"
}
```

**Rate Limits:** FASHN Tier 1: 60 requests/minute. Client-side debounce of 3 seconds between requests.

### Fallback Architecture

**Fallback 1 — fal.ai:**

- fal.ai has a virtual-try-on model (`fal-ai/idm-vton`) with similar input/output contract.
- Same input: person image URL + garment image URL.
- Same output: result image URL.
- Triggered when FASHN returns 429 (rate limit) or 5xx.

**Fallback 2 — Self-hosted (Lambda + Replicate):**

- Replicate model: `cuuupid/idm-vton` or `stability-ai/try-on`.
- Deployed as AWS Lambda behind API Gateway.
- Cold-start latency: 15-25 seconds.
- Triggered when both FASHN and fal.ai fail.

**Fallback 3 — Graceful Degradation:**

- If all providers fail after 3 retries: show user-friendly message.
- Message: "Virtual try-on is temporarily unavailable. Please try again in a few minutes."
- Log failure to `vton_attempts` table for monitoring.

### Privacy: User Photos and Third-Party API

**Critical:** User body photos are sent to a third-party API (FASHN). This requires explicit, informed consent.

**Consent Flow (mandatory, cannot be bypassed):**

1. After body photo upload, modal displays consent banner before any API call.
2. Consent text (verbatim): "Your photo will be sent to FASHN, a third-party AI provider, to generate the virtual try-on image. FASHN processes this image solely for this request and does not store it. Your photo will be automatically deleted from our servers after 48 hours. You have the right to request immediate deletion at any time."
3. Two buttons: "Agree & Continue" (enabled) / "Cancel" (returns to closet).
4. Consent timestamp and body photo ID stored in `user_body_photos` table.
5. If user previously consented within the last 30 days, skip banner (consent cached).

**Photo Not Stored on FASHN Servers Post-Request:** Per FASHN's data processing agreement, uploaded images are not persisted after processing. This must be verified in the DPA before production use.

---

## Data Model

### New Table: `user_body_photos`

```sql
CREATE TABLE user_body_photos (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_url   TEXT        NOT NULL,  -- Supabase Storage URL
    photo_id    TEXT        NOT NULL UNIQUE,  -- Storage object key, for deletion
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,  -- Soft delete; row remains for audit
    consent_given BOOLEAN    NOT NULL DEFAULT FALSE,
    consent_timestamp TIMESTAMPTZ,
    source      TEXT        NOT NULL DEFAULT 'camera'  -- 'camera' | 'gallery' | 'web'
);

CREATE INDEX idx_user_body_photos_user_id ON user_body_photos(user_id);
CREATE INDEX idx_user_body_photos_deleted_at ON user_body_photos(deleted_at) WHERE deleted_at IS NULL;
```

**Auto-Delete After 48 Hours:**

- Supabase cron job (`pg_cron`) runs every 15 minutes.
- Query: `DELETE FROM user_body_photos WHERE created_at < NOW() - INTERVAL '48 hours' AND deleted_at IS NULL;`
- Before deletion: photo object deleted from Supabase Storage via `storage.objects` DELETE.
- `deleted_at` set to `NOW()` (soft delete) before storage deletion.
- Row retained for audit trail with `deleted_at` populated.

**Consent Storage:**

- `consent_given = TRUE` and `consent_timestamp` set when user taps "Agree & Continue".
- No API call made before consent is persisted.

### New Table: `tryon_results`

```sql
CREATE TABLE tryon_results (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    garment_item_id  UUID        NOT NULL REFERENCES closet_items(id) ON DELETE CASCADE,
    body_photo_id   UUID        NOT NULL REFERENCES user_body_photos(id) ON DELETE SET NULL,
    result_url      TEXT        NOT NULL,
    provider        TEXT        NOT NULL,  -- 'fashn' | 'fal' | 'self_hosted'
    processing_time_ms INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message   TEXT
);

CREATE INDEX idx_tryon_results_user_id ON tryon_results(user_id);
CREATE INDEX idx_tryon_results_garment_item_id ON tryon_results(garment_item_id);
```

**Retention:** `tryon_results` images auto-deleted after 30 days (user can re-generate). Result URLs are not sensitive (garment on generic body).

### Existing Table Updates: `closet_items`

```sql
-- Add to closet_items
last_tryon_at    TIMESTAMPTZ,
tryon_count      INTEGER NOT NULL DEFAULT 0,
```

---

## FASHN API Integration

### Authentication

- API key stored in `.env` as `FASHN_API_KEY`.
- Edge Function reads key via `Deno.env.get('FASHN_API_KEY')`.
- Key rotated via environment variable update; no code change needed.

### Input Photo Pre-Processing

1. User uploads body photo to Supabase Storage: `user_body_photos/<user_id>/<uuid>.jpg`
2. Photo made publicly readable for FASHN API access (signed URL with 5-minute expiry, or public bucket with RLS).
3. Garment item photo URL retrieved from `closet_items.image_url` (already in Supabase Storage).
4. Both URLs passed to FASHN API.

### Output Handling

1. On FASHN success (`status: "success"`):
   - Download result image to Supabase Storage: `tryon_results/<user_id>/<result_id>.jpg`
   - Insert row into `tryon_results` with `result_url`.
   - Update `closet_items.last_tryon_at` and increment `tryon_count`.
   - Return result URL to client.

2. On FASHN failure (retryable: 429, 500, 502, 503, 504):
   - Retry up to 2 times with exponential backoff (1s, 2s).
   - On all retries exhausted, trigger Fallback 1 (fal.ai).
   - On Fallback 1 failure, trigger Fallback 2 (self-hosted).
   - On all providers fail, insert `tryon_results` row with `error_message`, return user-friendly error to client.

### Webhook (Optional, for Async Results)

FASHN supports async processing via webhook. If latency exceeds 15 seconds:

- Client polls `GET /api/v1/tryon/<result_id>/status` every 3 seconds.
- FASHN POSTs to webhook URL on completion.
- Webhook handler stores result and updates status.

**Initial implementation:** Synchronous mode (polling is Phase 2b enhancement).

### Error Handling Matrix

| Error Code          | Retry? | Fallback? | User Message                                          |
| ------------------- | ------ | --------- | ----------------------------------------------------- |
| `invalid_image`     | No     | No        | "Please upload a clearer photo. Full body required."  |
| `processing_failed` | Yes (2x) | Yes (all) | "Try-on generation failed. Please try again."         |
| `rate_limit`        | Yes (2x) | Yes (all) | "High demand. Please wait a moment and try again."   |
| `timeout`           | Yes (2x) | Yes (all) | "Request timed out. Please try again."                |
| `garment_too_small` | No     | No        | "Please select a clearer garment image."              |
| `body_not_detected` | No     | No        | "Could not detect body in photo. Please use a full-body shot." |

---

## Privacy & Consent

### Indian DPDP Act Compliance

**Digital Personal Data Protection Act, 2023 (DPDP) — Key Obligations:**

1. **Consent must be free, specific, informed, and unambiguous.**
   - Consent banner must be shown before photo upload triggers any API call.
   - User must take affirmative action ("Agree & Continue").
   - Consent purpose must be stated: "virtual try-on processing only."

2. **Right to Erasure.**
   - User can request deletion of body photo at any time via "Delete My Data" in settings.
   - Erasure request deletes photo from Supabase Storage AND sets `deleted_at` on the row.
   - FASHN's DPA must include erasure obligation on their side (verify with FASHN before production).

3. **Data Minimization.**
   - Body photos used ONLY for the virtual try-on request.
   - Photos not used for model training, analytics, or any other purpose.
   - Photo resolution capped at 2048px longest edge (no ultra-high-res storage).

4. **Consent Records.**
   - `consent_timestamp` stored with each body photo.
   - Consent not transferable between sessions (re-consent required after 30 days).
   - User can view all consented body photos in "Privacy & Data" settings.

5. **Data Breach Notification.**
   - If body photo is exposed or accessed without authorization: DPDP breach notification to user within 72 hours.
   - Incident logged; response protocol defined in incident-response.md.

### GDPR Notes (EU Users)

If the user is in the EU/EEA or Supabase EU region:

1. **Lawful Basis:** Explicit consent (Article 6(1)(a)) — same consent flow applies.
2. **Additional Rights:** Right to portability (receive photo on request), right to restrict processing.
3. **Data Processor Agreement:** FASHN must have a GDPR-compliant DPA with Prompt Closet before EU users can use virtual try-on.
4. **Cross-Border Transfers:** If FASHN processes outside EU, Standard Contractual Clauses (SCCs) required.
5. **Privacy Notice:** "Virtual Try-On" must be listed in the app's privacy policy with FASHN disclosed.

**Note:** The app should detect user region via Supabase auth metadata or IP geolocation and apply the stricter of DPDP or GDPR as applicable.

### Consent UI Copy

**Consent Banner (Phase 2):**

```
Virtual Try-On uses your photo and selected garment to generate an AI image.

Your photo will be sent to FASHN (fashn.ai) for processing. FASHN does not store
your image after the request is complete.

Your photo will be automatically deleted from our servers after 48 hours.

[Agree & Continue]  [Cancel]
```

**Privacy Settings Screen:**

- List of all body photos with consent timestamps.
- "Delete" button per photo (immediate deletion).
- "Delete All Photos" bulk action.
- Link to full privacy policy.

### Right to Erasure

**Implementation:**

1. User requests erasure via settings → "Delete My Data" → "Delete Body Photos."
2. Supabase function calls `storage.delete()` for each photo object.
3. Sets `deleted_at = NOW()` on each `user_body_photos` row.
4. Sends confirmation toast: "All body photos deleted."
5. FASHN erasure request filed via their support API (if available) or email.

---

## ML Evaluation

### Output Quality Criteria

The virtual try-on output is evaluated on two dimensions:

| Dimension     | Definition                                              | Target      |
| ------------- | ------------------------------------------------------- | ----------- |
| **Photorealism** | Image appears like a real photograph, not AI-generated | > 4.0/5.0 user rating |
| **Garment Fit**   | Garment drapes naturally on body, correct proportions  | > 3.5/5.0 user rating |
| **Pose Coherence**| Body pose in result matches input body photo            | > 4.0/5.0 user rating |

**User Feedback Collection:** After viewing a try-on result, user can tap "Helpful" / "Not Helpful." This feedback stored in `tryon_feedback` table:

```sql
CREATE TABLE tryon_feedback (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id       UUID        NOT NULL REFERENCES tryon_results(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    helpful         BOOLEAN     NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### For MGMT 645 Academic Context

This feature demonstrates **API integration and pipeline thinking**, not model training or ML research:

1. **API Orchestration:** Coordinating multiple providers (FASHN → fal.ai → self-hosted) with retry logic, fallback flows, and graceful degradation.
2. **Data Pipeline:** Upload → validate → call external API → store result → return to user, with consent and auto-deletion as data governance controls.
3. **Error Handling as Product Decision:** Every error code from FASHN maps to a specific user message and recovery action — this is systems design, not ML.
4. **Privacy Engineering:** Consent capture, DPDP/GDPR compliance, data minimization, and auto-deletion are privacy-by-design, not ML model choices.

If self-hosted model is chosen: **model deployment skills** are demonstrated — packaging a Replicate model into an AWS Lambda function with API Gateway, cold-start management, and cost-per-inference tracking.

### Quality Monitoring

| Metric                    | Target       | Alert Threshold    |
| ------------------------- | ------------ | ------------------ |
| Try-on success rate       | > 90%        | < 85% in 1 hour    |
| Avg processing time       | < 15s        | > 20s in 1 hour    |
| User helpful rating       | > 75%        | < 60% in 24 hours  |
| Fallback chain triggered  | < 5% of requests | > 10%         |

---

## API Surface

### Endpoints

| Method | Path                              | Description                        |
| ------ | --------------------------------- | ---------------------------------- |
| POST   | `/api/v1/tryon`                    | Initiate try-on request            |
| GET    | `/api/v1/tryon/<result_id>`       | Poll for result (sync fallback)    |
| DELETE | `/api/v1/tryon/photos/<photo_id>` | Delete a body photo                |
| GET    | `/api/v1/tryon/history`           | List past try-on results            |

### POST /api/v1/tryon — Request Body

```json
{
  "garment_item_id": "uuid of closet_items row",
  "body_photo_id": "uuid of user_body_photos row",
  "force_refresh": false  // re-generate even if cached result exists
}
```

### POST /api/v1/tryon — Response

```json
{
  "result_id": "uuid",
  "status": "success | processing | error",
  "result_url": "https://...",  // present when status=success
  "processing_time_ms": 12400,  // present when status=success
  "error": {                     // present when status=error
    "code": "processing_failed",
    "message": "Try-on generation failed. Please try again."
  }
}
```

---

## Implementation Notes

### Phase 2 Scope (This Spec)

- FASHN as primary provider (API key via `.env`)
- Body photo upload to Supabase Storage with 48h auto-delete
- Consent flow as described above
- Fallback 1 (fal.ai) wired and tested
- Fallback 2 (self-hosted Lambda) as placeholder — deployed when FASHN proves insufficient
- Sync mode only (no webhook/polling for Phase 2)

### Phase 2b Scope (Deferred)

- Async webhook mode for long-running FASHN requests
- User rating collection UI
- Quality monitoring dashboard
- Self-hosted Lambda deployment (if needed)

### Non-Goals for Phase 2

- Multi-person try-on (two people in body photo)
- Video try-on
- 3D avatar generation
- Garment color/size customization
- Social sharing of try-on results

---

## Related Specs

| File                  | Relationship                                          |
| --------------------- | ----------------------------------------------------- |
| `data-model.md`       | Schema definitions for `user_body_photos`, `tryon_results` |
| `image-pipeline.md`   | Photo upload, compression, storage conventions         |
| `auto-tagging.md`    | Category detection used to set `category` field in FASHN request |
| `closet-ui.md`        | "Try On" button placement on garment cards             |
