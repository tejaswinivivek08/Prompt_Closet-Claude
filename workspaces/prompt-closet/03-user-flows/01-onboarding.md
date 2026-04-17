# Onboarding Flow

**Phase**: User Flows
**Date**: 2026-04-17
**Product**: Prompt Closet

---

## Flow Overview

New user journey from app launch to populated closet state. This flow handles first-run experience, authentication, and initial wardrobe setup.

---

## Screen: App Launch

**Entry Point**: User taps app icon

**Steps**:

1. App launches to splash screen (logo + tagline)
2. System checks for existing auth session
   3a. If authenticated -> navigate to Closet tab
   3b. If not authenticated -> navigate to Onboarding

**Exit Point**: Advances to Onboarding (first-time users) or Closet (returning users)

---

## Screen: Onboarding (3 Slides)

**Entry Point**: First-time app launch

### Slide 1: Value Proposition

**Visual**: Animated open closet with floating outfit cards
**Headline**: "Your AI Stylist"
**Subtext**: "Digitize your wardrobe and get outfit suggestions powered by AI"

**States**:

- Default: First slide active
- Swipe indicator: "Swipe to learn more" with chevron

**Interactions**:

- Swipe left/right to navigate slides
- Tap "Skip" button (top-right) -> skip to Sign Up
- Tap "Next" -> advance to Slide 2

### Slide 2: How It Works

**Visual**: Three-step illustration (camera -> AI tags -> outfit)
**Headline**: "Three Steps to Your Style"
**Steps**:

1. "Snap photos of your clothes"
2. "AI tags each item automatically"
3. "Get styled for any occasion"

**Interactions**:

- Swipe left/right to navigate
- Tap "Skip" -> skip to Sign Up
- Tap "Next" -> advance to Slide 3

### Slide 3: Get Started

**Visual**: Magic Bar preview with sample prompt
**Headline**: "Ready to Find Your Style?"
**Subtext**: "Join thousands who've discovered their perfect look"

**Interactions**:

- Tap "Get Started" -> advance to Sign Up
- Tap "Skip" -> skip to Sign Up

**Exit Point**: From any slide, tapping Skip/Get Started -> Sign Up screen

---

## Screen: Sign Up / Log In

**Entry Point**: Completion of onboarding OR returning user without session

### Primary Entry Point

**Steps**:

1. Screen displays with email input as primary option
2. "Continue with Google" button visible below
3. "Already have an account? Log in" link at bottom

### Email Sign Up Flow

**Steps**:

1. User enters email address
2. Tap "Continue" button
3. System checks if email exists
   4a. If new email -> show password creation screen
   4b. If exists -> show "Email already registered. Log in instead?" prompt
4. User creates password (min 8 chars, shown/hidden toggle)
5. Tap "Create Account"
6. System sends verification email
7. Show "Check your email" screen with resend option

### Email Verification

**Steps**:

1. User taps link in verification email
2. App opens (deep link) -> account verified
3. Show success animation -> navigate to permissions

**Error States**:

- Invalid email format: inline validation error "Please enter a valid email"
- Weak password: inline error "Password must be at least 8 characters"
- Network failure: toast "Couldn't connect. Please try again."

### Google Sign Up / Log In

**Steps**:

1. User taps "Continue with Google"
2. Native Google sign-in sheet appears
3. User selects account and grants permissions
4. System creates/retrieves user record
5. Navigate directly to permissions screen

**Error States**:

- Google sign-in cancelled: dismiss sheet, remain on Sign Up
- Network failure: toast "Couldn't connect with Google. Try email instead."

---

## Screen: Permissions

**Entry Point**: Account created and verified (or Google sign-in complete)

### Permission 1: Camera Access

**Visual**: Camera icon + phone illustration
**Headline**: "Take Photos of Your Clothes"
**Body**: "Prompt Closet needs camera access to photograph your wardrobe items."

**States**:

- Default: explanation screen
- Granted: green checkmark, auto-advance after 1s
- Denied: red X with "Enable in Settings" button
- Permanently Denied: redirect to Settings app with instructions

**Interactions**:

- Tap "Enable Camera" -> system permission dialog
- Tap "Skip for Now" -> defer, show Photos permission next

**Exit Point**: Camera permission resolved -> Photos permission screen

### Permission 2: Photos Access

**Visual**: Photo gallery icon
**Headline**: "Import Existing Photos"
**Body**: "You can also import photos of clothes from your gallery."

**States**:

- Default: explanation screen
- Granted: green checkmark, auto-advance after 1s
- Denied: red X with guidance text
- Permanently Denied: redirect to Settings

**Interactions**:

- Tap "Enable Photos" -> system permission dialog
- Tap "Skip for Now" -> defer

**Exit Point**: Photos permission resolved -> Empty Closet state

---

## Screen: Empty Closet State

**Entry Point**: Permissions complete (or skipped), closet has no items

### Visual Layout

```
+-------------------------------------------+
|                                           |
|           [illustration of                |
|            an open closet]                |
|                                           |
|        Your closet awaits                 |
|                                           |
|   Photograph your clothes and I will      |
|   help you put together great outfits.    |
|                                           |
|   +-------------------------------+       |
|   |  + Add your first item        |       |
|   +-------------------------------+       |
|                                           |
|   or                                      |
|                                           |
|   [illustration]  Snap a photo            |
|   [illustration]  AI tags it              |
|   [illustration]  Get styled              |
|                                           |
+-------------------------------------------+
|  [icon] Add clothes to unlock style...   |
+-------------------------------------------+
|  Closet | Style | Camera | Search | Me    |
+-------------------------------------------+
```

### Magic Bar State (Empty Closet)

**Persistent rail visible but disabled**:

- Rail shows grayed out prompt: "Add clothes to unlock style suggestions"
- Tap on rail shows toast: "Add items to your closet first"

### Entry Point States

**From Empty Closet, user can**:

1. Tap "Add your first item" CTA -> Camera flow
2. Tap Camera tab -> Camera flow
3. Tap FAB on Closet grid -> Camera flow

---

## Flow Summary

```
[App Launch]
     |
     v
[Auth Check]
     |
     +-- (authenticated) --> [Closet Grid]
     |
     +-- (not authenticated)
          v
     [Onboarding 3 Slides]
     |        |        |
     v        v        v
     [Skip]  [Skip]  [Skip]
     |        |        |
     +--------+--------+
          v
     [Sign Up / Log In]
     |        |
     v        v
[Email]  [Google]
     |        |
     v        v
[Verify]  (auto)
     |
     v
[Permissions: Camera]
     |
     v
[Permissions: Photos]
     |
     v
[Empty Closet State]
     |
     +-- CTA / Camera tab / FAB
          v
     [Camera Flow]
          |
          v
     [Tag Review]
          |
          v
     [Closet Grid - populated]
```

---

## Key UX Decisions

| Decision                         | Rationale                                                   |
| -------------------------------- | ----------------------------------------------------------- |
| 3-slide onboarding               | Enough context without overwhelming; skip available         |
| Email primary, Google secondary  | Captures email for account recovery; Google for convenience |
| Camera before Photos permission  | Camera is the primary capture method                        |
| Magic Bar grayed on empty closet | Sets expectation that Magic Bar depends on closet content   |
| "Add first item" CTA prominent   | Reduces decision paralysis; single clear action             |

---

## Error Handling

| Scenario                        | Handling                                                   |
| ------------------------------- | ---------------------------------------------------------- |
| Network failure during sign up  | Retry button with "Check your connection" message          |
| Google sign-in unavailable      | Show email option with note about Google being unavailable |
| Permission permanently denied   | Show Settings redirect with clear instructions             |
| Verification email not received | "Resend email" button with 60s cooldown                    |

---

## Exit Points Summary

| From Screen  | Exit To                 | Trigger                             |
| ------------ | ----------------------- | ----------------------------------- |
| Onboarding   | Sign Up                 | Skip / Get Started / swipe to end   |
| Sign Up      | Permissions             | Account created + verified          |
| Permissions  | Empty Closet            | Camera + Photos permissions handled |
| Empty Closet | Camera Flow             | CTA tap / Camera tab / FAB          |
| Empty Closet | (existing user returns) | Closet Grid (populated)             |
