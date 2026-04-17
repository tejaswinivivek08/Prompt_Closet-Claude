# Authentication Specification

## Overview

Supabase Auth handles user registration and session management. Phase 1 uses email-only (magic link or password). Google OAuth is deferred to P2.

## Auth Flow

1. User enters email on sign-up screen
2. Supabase sends magic link (or user sets password)
3. On confirmation, session token stored in Expo SecureStore
4. Session persists across app restarts via refresh token
5. Auth state observed via `supabase.auth.onAuthStateChange()`

## Session Management

```typescript
// On app launch
const {
  data: { session },
} = await supabase.auth.getSession();
if (session) {
  /* show closet */
} else {
  /* show login */
}

// Listen for changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    /* redirect to login */
  }
});
```

## RLS Dependency

Every table with user data has RLS enabled. Policies use `auth.uid()` to scope data to the authenticated user. No anonymous access.

## Profile Creation

On first sign-up, a `profiles` row is created via Supabase trigger:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Defer to P2

- Google OAuth (requires app registration, consent screen review)
- Social login providers
- Account deletion flow
- Password reset
