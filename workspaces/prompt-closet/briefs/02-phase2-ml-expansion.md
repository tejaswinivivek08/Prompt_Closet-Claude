# Phase 2 Brief — Prompt Closet ML Expansion

## Phase 2 Goal

Add AI intelligence layers on top of Phase 1 foundation: style learning, contextual recommendations, digital twin, preference tracking, and dead-item detection. Indian occasion logic is expanded.

## Features

### 1. Style DNA Engine (K-means clustering)
- Cluster user's wardrobe CLIP embeddings into k=5 style archetypes
- Labels: Minimalist / Maximalist / Streetwear / Formal / Festive
- New StyleDNAScreen showing user's style profile
- Use cluster distances to weight Magic Bar recommendations

### 2. Contextual OOTD (Outfit of the Day)
- OpenWeatherMap free tier → Singapore weather (temp, humidity, rain)
- Google Calendar API → upcoming events
- Home screen proactive card: "It's 32°C and humid — here's today's outfit"
- Indian occasion detection: calendar event text containing "Diwali", "wedding", "puja" → festive filter applied

### 3. MiniMax Digital Twin Upgrade
- User takes front-facing photo during onboarding
- MiniMax Image API generates a styled AI avatar
- Outfit visualization: selected outfit rendered on avatar
- Show in Magic Bar results alongside outfit suggestions

### 4. Outfit Preference Learning
- Track accepted vs rejected outfits from Magic Bar
- Implicit feedback matrix stored in outfit_feedback table
- Weight future recommendations toward accepted styles

### 5. Dead Weight Detector
- Flag items not worn in 45 days
- "Neglected" badge on closet grid
- Weekly push notification: "5 items haven't been worn in 45 days"

### 6. Indian Occasion Logic Expansion
- Dedicated occasion profiles: Tamil Wedding, Punjabi Wedding, Diwali, Navratri, Temple, Eid
- Saree draping style suggestions, dupatta pairing logic, regional formality codes

## Tech Stack Context
- Frontend: React Native with Expo
- Backend: Supabase (PostgreSQL, pgvector, storage, pg_cron)
- Existing: CLIP embeddings (512-dim), Claude API, Supabase auth
- New: OpenWeatherMap API, Google Calendar API, MiniMax Image API

## Constraints
- MGMT 655 rubric requires demonstration of actual model training (not just API calls)
- Must have meaningful ML evaluation metrics
- Demo-day deadline: Phase 2 features must be functional for grading

## Analysis Required
- Technical risks for each feature
- Recommended build order
- ML technique gaps for MGMT 655
- MiniMax API integration approach
