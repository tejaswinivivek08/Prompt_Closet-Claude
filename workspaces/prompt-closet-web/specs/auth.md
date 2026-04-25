# Auth Spec — Prompt Closet Web

## Supabase Auth Flow

Uses `@supabase/ssr` for Next.js App Router compatibility.

### Browser Client

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

### Server Client

```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
export async function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    },
  );
}
```

## Auth Page (`/auth`)

- Sign-in tab: email input + "Send magic link" button
- Sign-up tab: email input + "Create account" button
- Same magic link flow as mobile app
- Redirects to `/app/closet` on success

## Auth Callback (`/auth/callback`)

Edge function handles magic link token exchange:

- Reads `code` param from URL
- Exchanges for session
- Sets session cookies
- Redirects to `/app/closet`

## Route Protection (Middleware)

```typescript
// middleware.ts
// Matches /app/* routes
// If no session → redirect to /auth
// If session → allow, inject user header
```

## Sign-Out

`POST /api/auth/signout` — calls `supabase.auth.signOut()`, clears cookies, redirects to `/`.
