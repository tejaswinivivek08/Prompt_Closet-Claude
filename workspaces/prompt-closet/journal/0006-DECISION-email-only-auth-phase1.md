# DECISION: Email-Only Auth for Phase 1 — Google OAuth Deferred to Phase 1.1

**Phase**: 02-todos
**Date**: 2026-04-17

## Decision

Phase 1 ships with Supabase email magic link only. Google OAuth is explicitly deferred to Phase 1.1.

## Rationale

Google OAuth on mobile requires:

1. Apple Developer account ($99/yr) for iOS
2. Google Cloud Console project with OAuth 2.0 credentials
3. OAuth consent screen review by Google (2-4 business days — not same-day)
4. Correct redirect URI configuration matching `expo-auth-session`

For a course demo with a fixed timeline, the registration and review delay is a blocker. Email magic link is Supabase's built-in, zero-configuration auth that works on day 1.

## Trade-off

- Some users prefer one-click Google sign-in over email magic link
- This is a friction increase for Phase 1 users
- The friction is eliminated entirely once Google OAuth is added (it's additive, not a replacement)

## Resolution

- Phase 1: Email magic link (Task 3)
- Phase 1.1: Google OAuth after registration completes (Task 4)
- Brief updated to reflect email-only for Phase 1

## Filed As

- `todos/active/Phase-1-Task-Breakdown.md` § Decision D1
- `specs/auth.md` § Defer to P2 (already documented)
