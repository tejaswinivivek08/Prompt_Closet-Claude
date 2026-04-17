# Prompt Closet -- Tech Stack Decisions

**Phase**: 02-Plans
**Date**: 2026-04-17
**Status**: Approved for implementation

---

## 1. Technology Stack Summary

| Layer                   | Technology                     | Decision                            |
| ----------------------- | ------------------------------ | ----------------------------------- |
| **Frontend**            | React Native + Expo            | Primary mobile app                  |
| **Backend**             | Supabase                       | Auth, database, storage, pgvector   |
| **ML: Tagging**         | Claude Vision API              | Auto-tagging with structured output |
| **ML: Embeddings**      | CLIP ViT-B/32 via Hugging Face | Semantic similarity                 |
| **ML: Clustering**      | Scikit-learn (Python)          | HAC clustering                      |
| **Deployment: iOS**     | EAS Build + TestFlight         | iOS distribution                    |
| **Deployment: Android** | EAS Build + APK                | Android distribution                |

---

## 2. React Native with Expo

### Decision: Use Expo with a Development Build

**Not**: Expo Go (managed workflow only)

### Rationale

| Option                     | Pros                                                                   | Cons                                                           | Verdict                                     |
| -------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------- |
| **Expo Go (managed)**      | Fast iteration, no native build                                        | Cannot use custom native modules; limited to Expo SDK packages | **Insufficient** for production ML features |
| **Expo Development Build** | Native modules accessible; fast iteration on own device; same codebase | Requires local Xcode/Android Studio for full builds            | **Selected**                                |
| **React Native CLI**       | Full control over native code                                          | Complex setup; separate iOS/Android tooling; slower iteration  | **Overkill** for demo scope                 |

### Why Not Expo Go

Expo Go is the managed workflow that runs JavaScript bundle from Expo's servers. It does NOT support:

- Custom native modules (e.g., ONNX Runtime for on-device ML)
- Custom native code modifications
- Offline bundle caching (app requires network for initial load)

Prompt Closet needs:

- `@anthropic-ai/sdk` for Claude Vision
- `expo-secure-store` for token persistence
- Native image processing (expo-image-manipulator)

All work with Development Build but Expo Go support varies.

### Development Build vs Production Build

| Build Type      | Purpose                          | Distribution                    | Review Time                                   |
| --------------- | -------------------------------- | ------------------------------- | --------------------------------------------- |
| **Development** | Iteration, testing on own device | Device via USB/cable            | Instant                                       |
| **Preview**     | Demo on specific devices         | TestFlight (iOS), APK (Android) | 24-48h (iOS first time), instant (subsequent) |
| **Production**  | App Store release                | App Store, Play Store           | 24-48h review                                 |

### Configuration

```json
// app.json
{
  "expo": {
    "name": "Prompt Closet",
    "slug": "prompt-closet",
    "version": "1.0.0",
    "sdkVersion": "52.0.0",
    "ios": {
      "bundleIdentifier": "com.promptcloset.app",
      "infoPlist": {
        "NSCameraUsageDescription": "Prompt Closet needs camera access to photograph your clothes.",
        "NSPhotoLibraryUsageDescription": "Prompt Closet needs photo library access to import clothing images."
      }
    },
    "android": {
      "package": "com.promptcloset.app",
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

### EAS Build Configuration

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "enterpriseDomain": "com.promptcloset.app"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Why EAS Build

EAS (Expo Application Services) provides:

- Managed iOS and Android builds without local Xcode/Android Studio
- Faster iteration (submit build, download when ready)
- Certificate and provisioning profile management
- Simpler CI/CD integration

For a course demo, EAS Build is faster than setting up local build environments.

---

## 3. Supabase

### Decision: Use Supabase for All Backend Services

### Components Used

| Service        | Purpose                              | Why Supabase                    |
| -------------- | ------------------------------------ | ------------------------------- |
| **Auth**       | Email authentication, JWT management | Built-in, zero-config with Expo |
| **PostgreSQL** | Primary database                     | Reliable, RLS for security      |
| **pgvector**   | Vector similarity search             | Same database, no new vendor    |
| **Storage**    | Image and thumbnail storage          | Built-in, RLS policies          |
| **Realtime**   | Optional: upload progress            | Nice-to-have, not critical      |

### Why Not Alternatives

| Alternative                    | Why Not                                                             |
| ------------------------------ | ------------------------------------------------------------------- |
| **Firebase**                   | Vendor lock-in, different mental model; Supabase is more SQL-native |
| **AWS Amplify**                | More complex setup; requires AWS account management                 |
| **Parse / Backendless**        | Less mature auth story; no pgvector                                 |
| **Pinecone / Weaviate**        | Overkill for <500 items; adds new vendor and cost                   |
| **Firebase + Cloud Functions** | Would need separate vector DB anyway                                |

### Supabase Project Setup

```bash
# Create Supabase project
# Dashboard: https://app.supabase.com

# Enable pgvector
# SQL Editor:
CREATE EXTENSION IF NOT EXISTS vector;

# Install Supabase CLI (optional, for local development)
npm install -g supabase
```

### Free Tier Limits

| Resource     | Free Tier Limit | Demo Usage                    |
| ------------ | --------------- | ----------------------------- |
| MAU          | 50,000          | 1 (demo user)                 |
| Database     | 500MB           | <50MB                         |
| Storage      | 1GB             | ~150MB (50 images @ 3MB each) |
| API Requests | Unlimited       | <10K/month                    |
| pgvector     | Enabled         | 512-dim vectors, <1000 rows   |

**Verdict**: Free tier is sufficient for demo with significant headroom.

### Why pgvector Over a Dedicated Vector DB

| Factor         | pgvector                  | Dedicated (Pinecone, Weaviate)   |
| -------------- | ------------------------- | -------------------------------- |
| Infrastructure | Same DB                   | New service, new billing         |
| Setup          | `CREATE EXTENSION vector` | Account, create index, configure |
| Scale          | 1K-10K items              | Millions                         |
| Query latency  | <5ms @ 500 items          | <10ms                            |
| Cost           | Included in Supabase      | $70+/month minimum               |
| Operations     | None new                  | Monitor, scale, backup           |

For a demo with 50-500 items, pgvector is architecturally correct and eliminates a new vendor dependency.

---

## 4. Claude Vision API for Tagging

### Decision: Claude Sonnet 4 via Anthropic API

### Model Selection

| Model           | Cost                 | Speed   | Vision Quality | Decision                     |
| --------------- | -------------------- | ------- | -------------- | ---------------------------- |
| Claude Sonnet 4 | $3/1M tokens (input) | Fast    | Excellent      | **Selected**                 |
| Claude Opus 4   | $15/1M tokens        | Slower  | Best           | Overkill for tagging         |
| GPT-4o          | $5/1M tokens         | Fast    | Excellent      | Alternative                  |
| Claude Haiku    | $0.25/1M tokens      | Fastest | Good           | Too weak for nuanced tagging |

**Claude Sonnet 4** provides excellent vision quality at 1/5th the cost of Opus 4, which is appropriate for the volume and complexity of clothing tagging.

### API Integration

```typescript
// lib/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function tagImageWithClaude(
  imageUrl: string,
): Promise<ClothingTags> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: imageUrl },
          },
          {
            type: "text",
            text: TAGGING_PROMPT,
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return JSON.parse(text);
}
```

### Cost Analysis

| Image Count  | Claude Sonnet 4 Cost | Notes                                                 |
| ------------ | -------------------- | ----------------------------------------------------- |
| 50 items     | ~$0.15               | Assuming ~100K tokens input (image + prompt) per item |
| 500 items    | ~$1.50               | Demo-scale cost                                       |
| 10,000 items | ~$30                 | If app scales                                         |

**Verdict**: $1.50 for 500-item demo is negligible. Well within course demo budget.

### Why Not AWS Rekognition or Google Vision

| Service           | Tagging Quality                             | Cost           | Decision                                              |
| ----------------- | ------------------------------------------- | -------------- | ----------------------------------------------------- |
| **Claude Vision** | Rich structured output, NL reasoning        | ~$0.003/image  | **Selected** — best for fashion-specific nuanced tags |
| AWS Rekognition   | Labels only, no fashion-specific categories | ~$0.001/image  | Labels insufficient for outfit composition            |
| Google Vision AI  | General labels, no occasion/formality       | ~$0.0015/image | Missing key attributes (formality, occasion)          |

Claude Vision's structured output (category, color, pattern, occasion, formality_score) maps directly to the data model. Alternatives would require post-processing to extract equivalent information.

---

## 5. CLIP ViT-B/32 via Hugging Face Inference API

### Decision: CLIP ViT-B/32 from Hugging Face

### Model Selection

| Model             | Dimensions | Latency (warm) | Latency (cold) | Quality | Decision                         |
| ----------------- | ---------- | -------------- | -------------- | ------- | -------------------------------- |
| **clip-ViT-B-32** | 512        | 1-3s           | 10-30s         | Good    | **Selected** — fastest, smallest |
| clip-ViT-B-16     | 512        | 2-5s           | 15-30s         | Better  | Not worth the tradeoff           |
| clip-ViT-L-14     | 768        | 5-10s          | 20-45s         | Best    | Too slow for demo                |

### Why Not Alternatives

| Alternative                        | Why Not                                                          |
| ---------------------------------- | ---------------------------------------------------------------- |
| **OpenAI CLIP**                    | No free hosted API; would need to self-host                      |
| **FashionCLIP**                    | Smaller community, less documented, HF support varies            |
| **ONNX Runtime (on-device)**       | Expo managed workflow doesn't support custom native modules well |
| **AWS SageMaker endpoint**         | Overkill for demo; adds cost and complexity                      |
| **Google Cloud Vision Embeddings** | No free tier; separate API                                       |

### Hugging Face Inference API

```typescript
// lib/huggingface.ts
const HF_API_URL =
  "https://api-inference.huggingface.co/models/sentence-transformers/clip-ViT-B-32";

export async function generateEmbedding(imageUrl: string): Promise<number[]> {
  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: imageUrl }),
  });

  if (!response.ok) {
    throw new Error(`HF API error: ${response.status}`);
  }

  return response.json();
}
```

### Free Tier Limits

| Limit        | Free Tier   | Demo Usage             |
| ------------ | ----------- | ---------------------- |
| Requests/day | 1,000       | 50 items = 50 requests |
| Concurrent   | 10 requests | 3 concurrent (safe)    |

### Pre-Warming Strategy

HF Inference API cold starts take 10-30 seconds. For demo reliability:

1. Pre-compute all demo embeddings before demo day
2. Make a dummy API call 30 seconds before any live demo search
3. Keep embeddings cached on server for repeat queries

```typescript
// Before demo search
async function prewarmAPI() {
  console.log("Pre-warming HF API...");
  await generateEmbedding("https://example.com/dummy.jpg");
  console.log("API warm!");
}
```

### Fallback Strategy

If HF API fails during demo:

1. Show "Processing..." indefinitely (user can still browse closet)
2. Queue embedding generation for retry
3. Semantic search falls back to tag-only filtering
4. Have pre-computed embeddings ready as backup

---

## 6. EAS Build for iOS TestFlight + Android APK

### Decision: Use EAS Build for Both Platforms

### Why EAS Build

| Factor       | EAS Build                     | Local Build                   |
| ------------ | ----------------------------- | ----------------------------- |
| Setup        | Minimal (JSON config)         | Requires Xcode/Android Studio |
| Hardware     | Cloud servers                 | Need Mac for iOS              |
| Iteration    | Submit job, wait for download | Local compile                 |
| Certificates | Managed by EAS                | Manual management             |
| CI/CD        | Native integration            | Manual setup                  |

### Build Configuration

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS (TestFlight)
eas build --platform ios --profile preview

# Build for Android (APK)
eas build --platform android --profile preview
```

### iOS TestFlight Distribution

| Step | Action                                       | Time                |
| ---- | -------------------------------------------- | ------------------- |
| 1    | Create Apple Developer account ($99/year)    | Before week 1       |
| 2    | Create App Store Connect app record          | Day 1               |
| 3    | Configure iOS credentials in EAS             | Day 1               |
| 4    | Submit first build for TestFlight review     | 2 weeks before demo |
| 5    | Add demo device UDID to provisioning profile | 1 week before demo  |
| 6    | Submit updated build                         | 3 days before demo  |
| 7    | Install on demo device from TestFlight       | Demo day            |

**Critical**: First TestFlight submission requires Apple review (24-48 hours). Subsequent builds are instant.

### Android APK Distribution

| Step | Action                                               | Time              |
| ---- | ---------------------------------------------------- | ----------------- |
| 1    | Create Google Play Developer account ($25 one-time)  | Optional for demo |
| 2    | Enable "Install from unknown sources" on demo device | Demo setup        |
| 3    | Build APK via EAS                                    | 30 minutes        |
| 4    | Transfer to demo device via USB or cloud storage     | Demo day          |
| 5    | Install APK directly                                 | Demo day          |

**Advantage**: Android APK can be installed same-day without review. Faster iteration for demo.

### Why Not Expo Go for Demo

Expo Go limitations for demo:

- Requires Expo account and internet for app download
- Cannot persist auth tokens reliably (app killed = session lost)
- No access to native modules for ML
- Less professional appearance (shows "Expo Go" branding)

Development Build advantages:

- Standalone app icon (no Expo branding)
- Auth tokens persist reliably
- Full native module support
- Professional demo experience

---

## 7. Technology Compatibility Matrix

| Package                  | Expo SDK | React Native | Notes                  |
| ------------------------ | -------- | ------------ | ---------------------- |
| `@supabase/supabase-js`  | 52+      | 0.76+        | Works with Expo        |
| `@anthropic-ai/sdk`      | 52+      | 0.76+        | Works with Expo        |
| `expo-image-picker`      | 52+      | 0.76+        | Camera and gallery     |
| `expo-image-manipulator` | 52+      | 0.76+        | Compression and resize |
| `expo-secure-store`      | 52+      | 0.76+        | Token persistence      |
| `expo-router`            | 52+      | 0.76+        | File-based routing     |
| `react-native-svg`       | 52+      | 0.76+        | Style DNA charts       |

All listed packages are compatible with Expo SDK 52 and React Native 0.76+.

---

## 8. Environment Configuration

### Required Environment Variables

```bash
# .env (never commit this file)
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
HF_API_KEY=hf_...
```

**Note**: `EXPO_PUBLIC_*` variables are embedded in the app binary. For Phase 1 demo, this is acceptable. For production, ML API keys should be moved to a server-side component (Supabase Edge Functions).

### Environment Loading

```typescript
// lib/env.ts
import Constants from "expo-constants";

export const env = {
  supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl,
  supabaseAnonKey: Constants.expoConfig?.extra?.supabaseAnonKey,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  hfApiKey: process.env.HF_API_KEY,
};
```

```json
// app.json
{
  "expo": {
    "extra": {
      "supabaseUrl": "$EXPO_PUBLIC_SUPABASE_URL",
      "supabaseAnonKey": "$EXPO_PUBLIC_SUPABASE_ANON_KEY"
    }
  }
}
```

---

## 9. File Structure

```
prompt-closet/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx               # Root layout with providers
│   ├── index.tsx                 # Redirect to closet or auth
│   ├── auth/
│   │   └── login.tsx             # Auth screen
│   ├── closet/
│   │   ├── _layout.tsx           # Closet tab layout
│   │   ├── index.tsx             # Closet grid
│   │   └── [id].tsx              # Item detail
│   ├── camera/
│   │   ├── _layout.tsx           # Camera tab layout
│   │   ├── index.tsx             # Camera capture
│   │   └── review.tsx            # Tag review
│   ├── search/
│   │   ├── _layout.tsx           # Search tab layout
│   │   └── index.tsx             # Semantic search
│   └── profile/
│       ├── _layout.tsx           # Profile tab layout
│       └── index.tsx             # Style profile
│
├── components/
│   ├── ui/                       # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Text.tsx
│   ├── closet/
│   │   ├── ItemCard.tsx
│   │   ├── ClosetGrid.tsx
│   │   ├── FilterBar.tsx
│   │   └── EmptyState.tsx
│   ├── magic-bar/
│   │   ├── MagicBarRail.tsx
│   │   ├── MagicBarExpanded.tsx
│   │   ├── OutfitCard.tsx
│   │   └── StreamOfThought.tsx
│   ├── camera/
│   │   ├── CameraView.tsx
│   │   └── TagReviewForm.tsx
│   └── style/
│       └── StyleDNA.tsx
│
├── lib/
│   ├── supabase.ts               # Supabase client
│   ├── anthropic.ts              # Claude Vision client
│   ├── huggingface.ts            # HF Inference client
│   ├── env.ts                    # Environment config
│   └── retry.ts                  # Retry utilities
│
├── services/
│   ├── auth.service.ts           # Auth operations
│   ├── upload.service.ts          # Upload + tag pipeline
│   ├── closet.service.ts          # CRUD operations
│   ├── search.service.ts         # Semantic search
│   └── outfit.service.ts          # Outfit composition
│
├── hooks/
│   ├── useAuth.ts                # Auth state hook
│   ├── useCloset.ts              # Closet data hook
│   └── useSearch.ts              # Search hook
│
├── types/
│   ├── database.ts               # Supabase generated types
│   ├── clothing.ts               # Clothing item types
│   └── outfit.ts                 # Outfit types
│
├── app.json                      # Expo configuration
├── eas.json                      # EAS Build configuration
├── babel.config.js               # Babel configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

---

## 10. Dependencies List

### Production Dependencies

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-image-picker": "~15.0.0",
    "expo-image-manipulator": "~13.0.0",
    "expo-secure-store": "~13.0.0",
    "expo-constants": "~17.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@anthropic-ai/sdk": "^0.27.0",
    "react-native": "0.76.5",
    "react": "18.3.1",
    "react-native-svg": "^15.0.0",
    "react-native-reanimated": "^3.16.0",
    "react-native-gesture-handler": "^2.20.0",
    "react-native-safe-area-context": "^4.12.0",
    "react-native-screens": "^4.0.0"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@types/react": "~18.3.0",
    "typescript": "^5.5.0",
    "eas-cli": "^13.0.0"
  }
}
```

---

## 11. Technology Decision Summary

| Decision           | Selected                   | Rejected                              |
| ------------------ | -------------------------- | ------------------------------------- |
| Mobile framework   | Expo + Development Build   | Expo Go (managed), React Native CLI   |
| Backend            | Supabase                   | Firebase, AWS Amplify, Parse          |
| Vector DB          | pgvector (in Supabase)     | Pinecone, Weaviate, dedicated service |
| Tagging model      | Claude Sonnet 4            | AWS Rekognition, Google Vision        |
| Embedding model    | CLIP ViT-B/32 (HF)         | FashionCLIP, on-device ONNX           |
| Embedding provider | Hugging Face Inference API | OpenAI API, self-hosted               |
| iOS build          | EAS Build + TestFlight     | Local Xcode                           |
| Android build      | EAS Build + APK            | Local Android Studio                  |
| Routing            | Expo Router (file-based)   | React Navigation                      |

---

## 12. Risk Assessment by Technology

| Technology            | Risk                             | Likelihood | Impact | Mitigation                                            |
| --------------------- | -------------------------------- | ---------- | ------ | ----------------------------------------------------- |
| Expo + native modules | Custom modules require dev build | Medium     | High   | Use Expo SDK packages only; avoid custom native code  |
| HF Inference API      | Cold start, rate limits          | High       | Medium | Pre-compute embeddings; pre-warm API                  |
| Claude Vision         | Rate limits, parse errors        | Medium     | Medium | Retry logic; fallback tags                            |
| Supabase free tier    | Storage/bandwidth limits         | Low        | Medium | Monitor usage; stay well under limits                 |
| EAS Build             | iOS certificate issues           | Medium     | High   | Start early (2 weeks before demo); Android as primary |
| TestFlight            | Apple review delays              | Medium     | High   | Submit first build 2 weeks early; have APK ready      |
