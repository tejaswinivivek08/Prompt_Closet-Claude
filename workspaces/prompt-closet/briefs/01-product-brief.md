# Prompt Closet — Product Brief

## Course Context

MBA Machine Learning course (MGMT 655). Demo-grade app for iOS TestFlight + Android APK.

## Product Concept

AI-powered personal stylist mobile app. Users digitize their physical wardrobe by photographing clothes. An AI auto-tags each item (category, color, pattern, occasion). A natural language "Magic Bar" lets users prompt their way to outfit suggestions (e.g. "Show me something for a rainy Diwali dinner"). A 2D digital avatar enables virtual try-on. The app learns personal style over time using clustering on clothing embeddings.

## Tech Stack

- Frontend: React Native with Expo (iOS + Android from one codebase)
- Backend: Supabase (auth, PostgreSQL, pgvector for embeddings, storage for images)
- ML: CLIP embeddings via Hugging Face API for semantic image understanding
- LLM: Claude API (claude-sonnet-4-20250514) for the Magic Bar NLP and auto-tagging
- Deployment: iOS TestFlight + Android APK for demo

## Phase 1 Scope

1. Project scaffold with Supabase auth (email + Google)
2. Camera/image upload flow
3. Auto-tagging pipeline: image -> Claude Vision API -> structured metadata (category, color, pattern, occasion, formality score)
4. CLIP embedding generation and storage in Supabase pgvector
5. Closet grid UI displaying all items with their tags
6. Basic semantic search using cosine similarity on embeddings

## Analysis Requests

- Technical risks or blockers before building
- Whether CLIP + pgvector is appropriate vs alternatives
- What to build first to de-risk
- Gaps in Phase 1 scope
