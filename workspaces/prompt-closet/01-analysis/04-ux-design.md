# Prompt Closet -- UX Design Analysis

**Phase**: 01-Analysis
**Date**: 2026-04-17
**Trust Level**: LOW (creative/exploration -- no safety-critical output)
**AI Type**: Generative + Assistive + Analytical (hybrid)

---

## Table of Contents

1. [Top-Down Design Analysis](#1-top-down-design-analysis)
2. [Mobile UX Architecture](#2-mobile-ux-architecture)
3. [Magic Bar Interaction Design](#3-magic-bar-interaction-design)
4. [Closet Grid Design](#4-closet-grid-design)
5. [AI Feedback Loop](#5-ai-feedback-loop)
6. [Demo Flow](#6-demo-flow)
7. [AI Interaction Pattern Map](#7-ai-interaction-pattern-map)
8. [AI-Generated Design Audit](#8-ai-generated-design-audit)
9. [Component Specification Index](#9-component-specification-index)

---

## 1. Top-Down Design Analysis

### L1: Frame/Layout

The app divides into two primary activity zones with a persistent navigation scaffold:

```
+-------------------------------------------+
|  STATUS BAR (system)                      |
+-------------------------------------------+
|                                           |
|  CONTENT ZONE (85-90% of screen)          |
|  - Closet grid: visual-first browsing     |
|  - Magic Bar results: outfit cards        |
|  - Camera viewfinder: capture flow        |
|                                           |
+-------------------------------------------+
|  MAGIC BAR ACCESS RAIL (persistent)       |
|  [contextual prompt bar -- always visible  |
|   except during full-screen camera]       |
+-------------------------------------------+
|  TAB BAR (10-15% of screen)               |
|  Closet | Style | Camera | Search | Profile|
+-------------------------------------------+
```

The layout prioritizes the content zone at roughly 85/15, keeping navigation compact. The Magic Bar sits BETWEEN the content and the tab bar as a persistent rail -- always accessible, never obstructing content, and visually distinct from both zones.

**Key layout decision**: The Magic Bar is NOT inside a tab. It is a persistent affordance that rides above the tab bar on every screen. This is the single most important architectural choice in the app. Users should never have to navigate to the Magic Bar; it should be wherever they are.

### L2: Feature Communication

Feature hierarchy by user value:

| Priority    | Feature                         | Discovery Mechanism                 |
| ----------- | ------------------------------- | ----------------------------------- |
| P0 (hero)   | Magic Bar -- outfit suggestions | Persistent rail, always visible     |
| P1 (core)   | Camera capture + auto-tag       | Prominent camera tab, FAB on Closet |
| P2 (core)   | Closet grid browsing            | Default tab on launch               |
| P3 (power)  | Semantic search                 | Dedicated tab + inline in Closet    |
| P4 (future) | Style profile / learning        | Profile tab, progressive disclosure |
| P5 (future) | Avatar try-on                   | Contextual from outfit results      |

Discovery path for a new user:

```
Launch -> Onboarding (3 slides) -> Empty Closet ->
  "Add your first item" CTA -> Camera ->
  Auto-tag reveal -> Closet populated ->
  Magic Bar suggestion chips appear ->
  First outfit suggestion ->
  Hooked
```

### L3: Component Effectiveness

States that every major component MUST handle:

| Component   | States                                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Closet grid | Empty (new user), Loading (items fetching), Populated (items), Filtering (active filters), Error (fetch failed)                                                      |
| Magic Bar   | Idle (prompt chips), Thinking (streaming thought), Streaming (results arriving), Complete (outfit cards), Error (no matches), Empty closet (nothing to suggest from) |
| Item card   | Thumbnail, Tags collapsed, Tags expanded, Selected (in outfit), Detail view                                                                                          |
| Camera      | Permissions denied, Viewfinder active, Capturing, Processing (AI tagging), Tag review/edit                                                                           |

### L4: Visual Details (deferred to implementation)

Color, typography, motion -- addressed after L1-L3 are finalized. Preliminary direction: warm neutral palette (not the AI-slop purple-blue gradient), photographic content as the visual star, minimal chrome.

---

## 2. Mobile UX Architecture

### 2.1 Screen Map

```
                          +------------------+
                          |    Launch        |
                          +--------+---------+
                                   |
                          +--------v---------+
                          |    Onboarding    |
                          |  (3 slides,      |
                          |   skip anytime)  |
                          +--------+---------+
                                   |
                          +--------v---------+
                          |    Sign Up /     |
                          |    Log In        |
                          +--------+---------+
                                   |
                 +-----------------+-----------------+
                 |                                   |
        +--------v---------+               +--------v---------+
        |  Empty Closet    |               |  Populated       |
        |  (onboarding     |               |  Closet          |
        |   CTA visible)   |               |                  |
        +--------+---------+               +--------+---------+
                 |                                   |
        +--------v---------+               +--------v---------+
        |  Camera          |<-------+------|  Closet Grid     |
        |  (viewfinder)    |        |      |  (default tab)   |
        +--------+---------+        |      +---+----------+---+
                 |                  |          |          |
        +--------v---------+        |          |     +----v------+
        |  Tag Review      |        |          |     | Item      |
        |  (edit AI tags)  |        |          |     | Detail    |
        +--------+---------+        |          |     +-----------+
                 |                  |          |
        +--------v---------+        |    +-----v-----------+
        |  Closet Grid     |--------+    | Magic Bar       |
        |  (item appears)  |             | Results         |
        +------------------+             | (outfit cards)  |
                                        +-----+-----------+
                                              |
                                        +-----v-----------+
                                        | Outfit Detail   |
                                        | (items + why)   |
                                        +-----------------+

TAB BAR NAVIGATION:

+--------+--------+--------+--------+--------+
| Closet | Style  | Camera | Search | Profile|
+--------+--------+--------+--------+--------+
  grid     saved     add     sem      prefs
  browse   outfits   items   search   style
                            + voice   profile
```

### 2.2 Tab Structure (5 tabs)

| Tab | Icon      | Label         | Primary Content           | Secondary Content            |
| --- | --------- | ------------- | ------------------------- | ---------------------------- |
| 1   | Hanger    | Closet        | Wardrobe grid (all items) | Filter bar, sort, FAB to add |
| 2   | Star      | Style         | Saved outfits, favorites  | Style profile (future)       |
| 3   | Camera    | + (prominent) | Camera viewfinder         | Gallery picker               |
| 4   | Magnifier | Search        | Semantic search           | Voice input toggle           |
| 4   | Person    | Profile       | Settings, style insights  | Data management              |

**Tab ordering rationale**: Closet is the home base (most visited). Style is the aspirational layer (saved outfits for quick access). Camera is the creation action (center = thumb-reachable on large phones). Search is the discovery tool. Profile is the least-visited settings area.

### 2.3 Camera Flow

The camera flow must handle two distinct patterns: single-item capture and batch upload.

```
ENTRY POINTS:
  1. Camera tab (center of tab bar)
  2. FAB on Closet grid (+ button)
  3. "Add items" CTA on empty closet state

FLOW:
+-------------------+     +-------------------+
|  Camera tab       |     |  Gallery picker   |
|  (viewfinder)     |     |  (multi-select)   |
|  - single capture |     |  - select up to   |
|  - batch hint     |     |    10 photos      |
+--------+----------+     +--------+----------+
         |                         |
         v                         v
+--------------------------------------------+
|  Tag Review Screen                          |
|  (single item: edit tags inline)            |
|  (batch: grid of thumbnails, tap to edit)   |
|                                             |
|  Per item:                                  |
|  [Photo]  Category: [Tops / v]             |
|           Color: [Navy / v]                |
|           Pattern: [Solid / v]             |
|           Occasion: [Casual, Work / v]     |
|           Formality: [====|====] 6/10      |
|                                             |
|  [Retake]            [Save to Closet]       |
+--------------------------------------------+

BATCH STRATEGY:
  Phase 1 (demo): Gallery multi-select -> sequential AI tagging
  -> progress indicator ("Tagging 3 of 8...") -> bulk save

  Phase 2 (post-demo): Parallel processing with streaming results
  -> items appear in closet as each finishes tagging
```

**Camera-first vs Gallery-first**: Both entry points always visible. The viewfinder shows a camera icon to switch to gallery; the gallery picker shows a camera icon to switch to viewfinder. Never force the user into one mode.

### 2.4 Magic Bar Placement

The Magic Bar lives as a persistent element ABOVE the tab bar. It is always visible and accessible from any screen.

```
+-------------------------------------------+
|                                           |
|  [Current screen content]                 |
|                                           |
+-------------------------------------------+
|  [icon] What are you dressing for?    [>] |
|  "Rainy Diwali dinner" "Job interview"    |
+-------------------------------------------+
|  Closet | Style | Camera | Search | Me    |
+-------------------------------------------+
```

When tapped, the Magic Bar expands into a full-screen overlay with the prompt input, suggestion chips, and conversation history. This prevents the persistent rail from consuming too much vertical space while giving the input room to breathe when active.

```
EXPANDED STATE (full-screen overlay):

+-------------------------------------------+
|  [x]                    Style Assistant   |
+-------------------------------------------+
|                                           |
|  Recent conversations:                    |
|  > "Rainy Diwali dinner"     2 outfits    |
|  > "Job interview at a bank" 1 outfit     |
|                                           |
|  -- or --                                 |
|                                           |
|  Try asking:                              |
|  +----------------------------+           |
|  | Something for a first date |           |
|  +----------------------------+           |
|  +----------------------------+           |
|  | Casual Friday outfit       |           |
|  +----------------------------+           |
|  +----------------------------+           |
|  | Warm and cozy for winter   |           |
|  +----------------------------+           |
|                                           |
+-------------------------------------------+
|  [mic]  What are you dressing for? [send] |
+-------------------------------------------+
```

---

## 3. Magic Bar Interaction Design

### 3.1 AI Type Classification

The Magic Bar is a **Conversational Generative** AI interaction. Essential patterns:

| Pattern     | Application in Prompt Closet                                         |
| ----------- | -------------------------------------------------------------------- |
| Open Input  | Natural language text/voice prompt                                   |
| Suggestions | Contextual prompt chips (rotating by time, weather, closet contents) |
| Follow-ups  | "Something warmer" / "Not that top" / "Different shoes"              |
| Memory      | Remembers size, preferred brands, past outfit selections             |
| Controls    | Stop generation, regenerate, save outfit                             |
| Variations  | "Show me 3 options" comparison view                                  |
| Disclosure  | "AI-suggested outfit" label on every result                          |

### 3.2 Input Design

**Text + Voice. Both. Not one.**

- Text input: Primary input field with placeholder prompt
- Voice input: Microphone icon, press-and-hold or tap to record
- Voice is critical for the demo (impressive to MBA audience) and for real-world use (dressing while holding phone)
- Voice transcription shown inline before submission, with editable text

**Input field specification**:

```
+-------------------------------------------+
|  [mic]  [  What are you dressing for?  ]  |
|         [  placeholder text            ]  |
|         [                     ] [arrow >] |
+-------------------------------------------+
         ^                         ^
         voice btn              submit btn
```

Placeholder text rotates contextually:

- Morning: "What are you wearing today?"
- Evening: "Going out tonight?"
- Post-add: "Ask me about your new [item name]"
- Generic: "Describe the occasion, weather, or mood"

### 3.3 Processing States (Stream of Thought)

AI processing is the highest-risk moment for user abandonment. The app MUST show visible progress.

```
STATE 1: RECEIVING (0-0.5s)
  Input field collapses. Bar shows:
  "Finding something perfect..."

STATE 2: THINKING (0.5-3s)
  Animated thought stream:
  +-------------------------------------------+
  |  Looking through your closet...            |
  |  > Checked 47 items                        |
  |  > Matching to "rainy Diwali dinner"       |
  |  > Considering color harmony...            |
  +-------------------------------------------+

STATE 3: ASSEMBLING (3-8s)
  Outfit components arriving:
  +-------------------------------------------+
  |  Putting it together...                    |
  |                                            |
  |  [top:     arriving...]   [shoes: thinking]|
  |  [bottom:  selected  ]   [layer: thinking] |
  +-------------------------------------------+

STATE 4: COMPLETE
  Full outfit card revealed (see 3.4)
```

**Why stream of thought matters**: The LLM + CLIP retrieval + outfit composition pipeline will take 3-10 seconds. A blank spinner for 10 seconds will kill the demo. Showing the AI's reasoning process turns wait time into engagement time. MBA audience members will see the ML pipeline at work, which is the whole point.

### 3.4 Output Format: Outfit Card

The output is an outfit card -- a cohesive visual assembly of 2-5 items with reasoning.

```
+-------------------------------------------+
|  OUTFIT FOR: Rainy Diwali Dinner           |
|  +-----+  +-----+  +-----+  +-----+       |
|  | TOP |  | BTM |  | LAY |  | SHO |       |
|  |     |  |     |  |     |  |     |       |
|  +-----+  +-----+  +-----+  +-----+       |
|  Navy     Charcoal  Cream     Brown        |
|  silk     wool     cashmere  leather       |
|  blouse   trousers sweater  boots          |
|                                            |
|  WHY THIS WORKS:                           |
|  "The navy and cream pairing is classic    |
|   Diwali elegance. Leather boots handle    |
|   rain. The cashmere layer adds warmth     |
|   for evening celebrations."               |
|                                            |
|  [Save]  [Shuffle]  [Try another]          |
+-------------------------------------------+
```

**Outfit card anatomy**:

1. Context header -- echoes the user's prompt
2. Item thumbnails -- 2-5 items in a horizontal scrollable strip
3. Color + material labels -- quick scan info
4. Reasoning paragraph -- WHY the AI chose these items together (this is the trust builder)
5. Action rail -- Save (to Style tab), Shuffle (regenerate variations), Try another (new prompt)

### 3.5 Follow-Up Flow: Conversational, Not Single-Shot

The Magic Bar supports a conversation thread, not just single-shot queries. This is essential for the "not that, something warmer" use case.

```
CONVERSATION THREAD:

User:  "Show me something for a rainy Diwali dinner"
AI:    [Outfit Card A: navy blouse, wool trousers, boots]

User:  "Not the trousers, something more festive"
AI:    [Outfit Card B: navy blouse, silk skirt, boots]
       ^ kept the blouse and boots (user didn't object)
       ^ swapped trousers for silk skirt (more festive)

User:  "Perfect. Save this."
AI:    "Saved to your Style collection."
       [Undo] button visible for 5 seconds
```

Thread model:

- Each thread starts with a fresh prompt
- Follow-ups modify the previous result (not start from scratch)
- Thread persists for the session; accessible from Style tab history
- Maximum 10 turns per thread before suggesting "Start a new look"

### 3.6 Prompt Suggestions / Chips

Three tiers of suggestions, always visible when the Magic Bar is expanded:

**Tier 1: Contextual (top priority)**
Based on time of day, day of week, weather (if location permission granted), recent additions:

| Context            | Suggestion                               |
| ------------------ | ---------------------------------------- |
| Monday 8am         | "What should I wear to work today?"      |
| Friday 5pm         | "Going out tonight?"                     |
| Just added a dress | "What occasions work with my new dress?" |
| Raining outside    | "Something rain-friendly"                |
| Weekend            | "Casual brunch outfit"                   |

**Tier 2: Closet-aware (second priority)**
Based on underused items, gaps, or interesting combinations:

| Trigger                     | Suggestion                       |
| --------------------------- | -------------------------------- |
| Item worn 0 times           | "Show me outfits with my [item]" |
| Single-color closet         | "Add some color to my outfit"    |
| 20+ items, no outfits saved | "Create my first outfit"         |

**Tier 3: Seasonal / Cultural (third priority)**

| Period   | Suggestion                              |
| -------- | --------------------------------------- |
| October  | "Something for Halloween"               |
| November | "Diwali celebration outfit"             |
| December | "Holiday party look"                    |
| General  | "Surprise me with something unexpected" |

**Suggestion chip design**: Rounded pill, text-only, horizontally scrollable row of 3-5 chips. Tapping a chip pre-fills (does not submit) the prompt, allowing the user to modify before sending.

### 3.7 Error States

| Error            | Cause                                    | UI Response                                                                                                                                       |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty closet     | User has not added items yet             | "Your closet is empty! Add some clothes first, then I can help you style them." [Take me to Camera]                                               |
| No matches       | Prompt too specific or closet too small  | "I could not find the right pieces for that. Try broadening your request, or add more items to your closet." [Add items] [Try asking differently] |
| AI failure       | API timeout or error                     | "Something went wrong on my end. Try again?" [Retry]                                                                                              |
| Offline          | No network connection                    | "I need internet to style you. Check your connection."                                                                                            |
| Ambiguous prompt | "something nice" with no further context | "What kind of occasion? Work, date night, casual hangout?" [chip suggestions]                                                                     |

---

## 4. Closet Grid Design

### 4.1 Grid Layout

**View**: 3-column grid on phones, 4-column on tablets. Each cell is a square thumbnail with the item photo.

```
+---+---+---+
|   |   |   |  <- Navy silk blouse
|   |   |   |     Charcoal wool trousers
+---+---+---+     Cream cashmere sweater
|   |   |   |     Brown leather boots
|   |   |   |     ...
+---+---+---+
```

**Why 3 columns, not 2**: Wardrobe items are photographed flat or on hangers -- they tend to be taller than wide. Three columns at phone width (390px) gives ~120px per cell, enough to distinguish a top from a bottom from a dress. Two columns wastes horizontal space; four columns makes items too small to identify at a glance.

### 4.2 Item Card States

```
DEFAULT (thumbnail only):
+---------+
|         |
|  [img]  |
|         |
+---------+
  Navy blouse

TAPPED (tags revealed):
+---------+
|         |
|  [img]  |
|         |
+---------+
  Navy blouse
  Tops / Solid
  Casual, Work
  Formality: 6

LONG-PRESS (actions):
+---------+
| [edit]  |
|  [img]  |
| [delete]|
+---------+
```

Tag display strategy: **Progressive disclosure**. Default state shows thumbnail + primary label (color + category). Tap reveals all tags. Long-press reveals actions (edit, delete, add to outfit). This prevents tag clutter from overwhelming the visual browsing experience.

### 4.3 Filter and Sort

Filter bar sits above the grid, horizontally scrollable:

```
+-------------------------------------------+
| All | Tops | Bottoms | Dresses | Outer... |
| [color v] [occasion v] [formality ---v-]  |
+-------------------------------------------+
|  +   +   +   |   +   +   +   |   +   +   +
|  +   +   +   |   +   +   +   |   +   +   +
+-------------------------------------------+
```

Filter dimensions:

- **Category**: Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories, Full Body
- **Color**: Visual color swatches (not text) -- tap to filter
- **Occasion**: Casual, Work, Formal, Party, Date, Athletic, Travel
- **Formality**: Slider 1-10
- **Pattern**: Solid, Striped, Plaid, Floral, Geometric, Abstract
- **Sort**: Recently added, Most worn (future), Color grouped, Category grouped

**Active filter state**: Selected filters show as colored chips above the grid with an (x) to remove. "Clear all" button when 2+ filters active.

### 4.4 Semantic Search Within Grid

The Search tab provides dedicated semantic search. However, the Closet grid also has a lightweight search bar at the top:

```
+-------------------------------------------+
| [magnifier] Search your closet...         |
+-------------------------------------------+
| All | Tops | Bottoms | ...                |
+-------------------------------------------+
```

Typing in the closet search triggers semantic search (using CLIP embeddings via pgvector cosine similarity), not just text matching. This means:

- "warm cozy sweater" matches items tagged as sweaters + warm colors + knit textures
- "something blue" matches navy, royal blue, teal items
- "date night top" matches items with high formality + occasion:date

Search results replace the grid with relevance-ordered items, with a "Back to all" button.

### 4.5 Empty Closet State

This is a critical onboarding moment. The empty state must be inviting, not intimidating.

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
```

Empty state design principles:

- One clear CTA, not multiple options
- Three-step illustration showing the value loop (capture -> tag -> style)
- No suggestion chips from the Magic Bar yet (nothing to suggest from)
- Magic Bar rail still visible but grayed out with "Add clothes to unlock style suggestions"

---

## 5. AI Feedback Loop

### 5.1 Style Profile Visualization

The Profile tab includes a progressively disclosed "Style DNA" section:

```
+-------------------------------------------+
|  YOUR STYLE DNA                            |
|                                            |
|  Color Palette                             |
|  [##][##][##][##][##]                      |
|  Navy Charcoal Cream Brown Olive           |
|                                            |
|  Top Categories                            |
|  Tops      ████████████████ 14             |
|  Bottoms   ████████         7              |
|  Shoes     █████            4              |
|  Outerwear ███              2              |
|                                            |
|  Formality Range                           |
|  Casual  [==|========]  Formal             |
|  Average: 6.2 / 10                         |
|                                            |
|  Go-to Occasions                           |
|  Work (62%)  Casual (28%)  Date (10%)      |
+-------------------------------------------+
```

**When this appears**: After 5+ items are in the closet. Below 5 items, show "Keep adding clothes to discover your style" with a progress indicator (5/10 items to unlock).

### 5.2 "We Noticed" Moments

These are contextual nudges that surface in the Magic Bar suggestion chips or as toast notifications:

| Trigger                                 | Nudge                                                               | Frequency Cap        |
| --------------------------------------- | ------------------------------------------------------------------- | -------------------- |
| 5+ navy items, no other colors          | "Your closet is heavy on navy. Want to explore some color variety?" | Once                 |
| 3+ formal items, never used together    | "You have pieces for a great formal outfit. Want to see it?"        | Once per combination |
| Item worn (selected in outfit) 5+ times | "Your [item] is a workhorse! Here are fresh ways to wear it."       | Weekly               |
| New season, closet has items for it     | "Summer is coming. Here is what works from your current closet."    | Once per season      |

**Design rule**: Maximum one nudge per session. Nudges are always dismissible with "Not now" and "Don't show again." Over-nudging destroys trust faster than no-nudging.

### 5.3 Clustering Results Surfacing

Style clusters surface as named "looks" in the Style tab:

```
+-------------------------------------------+
|  YOUR LOOKS                                |
|                                            |
|  +--------+  +--------+  +--------+       |
|  | Look 1 |  | Look 2 |  | Look 3 |       |
|  | "Office|  | "Weekend|  | "Night |       |
|  |  Core" |  |  Chill" |  |  Out"  |       |
|  | 5 items|  | 4 items |  | 3 items|       |
|  +--------+  +--------+  +--------+       |
|                                            |
|  Based on items you wear together often    |
|  and styles you gravitate toward.          |
+-------------------------------------------+
```

Cluster naming: AI-generated based on the dominant characteristics of items in the cluster. User can rename. Clusters appear after 10+ items and at least 3 saved outfits.

---

## 6. Demo Flow

### 6.1 Ideal Demo Sequence (5-7 minutes)

```
BEAT 1: HOOK (30s)
  "This is Prompt Closet -- your AI stylist."
  Show the app icon, tap to launch.
  Skip onboarding (already completed).

BEAT 2: THE CLOSET (45s)
  "Here is my digital wardrobe."
  Scroll through pre-seeded closet (15-20 items).
  Tap one item to show tags.
  Tap the filter bar: filter by "Formal" -- show results.

BEAT 3: ADDING AN ITEM (60s) [LIVE]
  "Let me add something new."
  Tap camera tab.
  Photograph an item (or pick from gallery to control lighting).
  Show the AI auto-tagging in real time:
    "Analyzing... Category: Tops, Color: Burgundy, Pattern: Solid..."
  Edit one tag to show it is correctable.
  Save. Item appears in closet.

BEAT 4: THE MAGIC BAR -- THE HERO (90s) [LIVE]
  "Now the magic. Watch this."
  Tap the Magic Bar rail.
  Type or say: "Show me something for a rainy Diwali dinner"
  Show Stream of Thought processing:
    "Looking through 18 items..."
    "Matching to rainy weather..."
    "Considering festive colors..."
  Outfit card appears with 3-4 items + reasoning.

BEAT 5: CONVERSATIONAL REFINEMENT (45s) [LIVE]
  "Not the skirt -- something more comfortable."
  Type: "Not the skirt, something more comfortable"
  AI swaps the skirt, keeps the rest.
  "Save this outfit." -> Saved.

BEAT 6: SEMANTIC SEARCH (30s)
  "I can also search by meaning, not just keywords."
  Go to Search tab.
  Type: "warm and cozy for winter"
  Results: items with warm colors, knit textures, sweaters.
  "This is powered by CLIP embeddings and vector search."

BEAT 7: STYLE DNA (30s)
  "And the app learns my style over time."
  Go to Profile tab.
  Show Style DNA: color palette, formality range, top occasions.
  "This will get smarter the more I use it."

BEAT 8: CLOSE (15s)
  "That is Prompt Closet. AI-powered personal styling,
   starting with the clothes you already own."
```

### 6.2 Pre-Seed Strategy

**Pre-seed these items** (photographed ahead of time, tags confirmed):

| Item                   | Category    | Color      | Formality | Occasion     |
| ---------------------- | ----------- | ---------- | --------- | ------------ |
| Navy silk blouse       | Tops        | Navy       | 7         | Work, Date   |
| Charcoal wool trousers | Bottoms     | Charcoal   | 8         | Work, Formal |
| Cream cashmere sweater | Outerwear   | Cream      | 5         | Casual, Work |
| Brown leather boots    | Shoes       | Brown      | 4         | Casual, Work |
| Burgundy wrap dress    | Dresses     | Burgundy   | 7         | Date, Party  |
| Dark denim jeans       | Bottoms     | Indigo     | 3         | Casual       |
| White cotton t-shirt   | Tops        | White      | 2         | Casual       |
| Black blazer           | Outerwear   | Black      | 9         | Work, Formal |
| Gold earrings          | Accessories | Gold       | 6         | Party, Date  |
| Olive chinos           | Bottoms     | Olive      | 4         | Casual, Work |
| Floral silk scarf      | Accessories | Multi      | 5         | Work, Date   |
| Black pumps            | Shoes       | Black      | 8         | Work, Formal |
| Grey wool coat         | Outerwear   | Grey       | 7         | Work, Formal |
| Striped linen shirt    | Tops        | Blue/White | 4         | Casual       |
| Red clutch             | Accessories | Red        | 7         | Party, Date  |

This selection ensures the Magic Bar demo has enough variety to compose interesting outfits while being small enough to manage.

### 6.3 Latency Management During Live Demo

| Operation                   | Expected Latency | Demo Mitigation                      |
| --------------------------- | ---------------- | ------------------------------------ |
| Auto-tagging (single item)  | 3-6s             | Stream of Thought makes it engaging  |
| Magic Bar outfit generation | 5-10s            | Stream of Thought shows AI reasoning |
| Semantic search             | 1-2s             | Fast enough for live demo            |
| Follow-up refinement        | 3-5s             | Conversation context cached          |
| Image upload to Supabase    | 1-3s             | Background upload with progress bar  |

**Demo-day fallbacks**:

1. **Network failure**: Pre-load 2-3 Magic Bar responses in local cache. If API fails, serve cached response with a brief "using cached results" note.
2. **API timeout**: After 15 seconds, show "Taking longer than expected. Here is a fallback suggestion based on your closet" with a locally composed outfit using simple rules (color matching, formality range).
3. **Slow auto-tagging**: Show the tag review screen with confidence percentages loading in sequence rather than all at once.

**Critical demo rule**: Never show a blank loading spinner for more than 2 seconds. Always have Stream of Thought, skeleton screens, or progressive loading visible.

---

## 7. AI Interaction Pattern Map

Mapping the AI interaction patterns (from skills/25) to Prompt Closet features:

### Wayfinders

| Pattern     | Implementation                                                          |
| ----------- | ----------------------------------------------------------------------- |
| Suggestions | Magic Bar prompt chips (contextual, closet-aware)                       |
| Gallery     | Pre-composed outfit examples in onboarding                              |
| Templates   | "Fill in the blank" prompts: "[Occasion] outfit for [weather]"          |
| Follow-ups  | Post-outfit chips: "Something warmer" / "Different shoes" / "Save this" |
| Initial CTA | Magic Bar rail on every screen (never an empty state)                   |
| Randomize   | "Surprise me" chip in Magic Bar                                         |

### Prompt Actions

| Pattern    | Implementation                                                    |
| ---------- | ----------------------------------------------------------------- |
| Open Input | Magic Bar text + voice input                                      |
| Regenerate | "Shuffle" button on outfit card                                   |
| Variations | "Show me 3 options" toggle (grid view of alternatives)            |
| Auto-fill  | Camera -> auto-tag (AI fills category, color, pattern, formality) |

### Tuners

| Pattern    | Implementation                                                     |
| ---------- | ------------------------------------------------------------------ |
| Parameters | Formality slider in Magic Bar expanded view (collapsed by default) |
| Filters    | Closet grid filter bar (category, color, occasion, formality)      |
| Modes      | "Conservative / Balanced / Adventurous" style mode (future)        |

### Governors

| Pattern           | Implementation                                                        |
| ----------------- | --------------------------------------------------------------------- |
| Stream of Thought | Magic Bar processing states (Section 3.3)                             |
| Controls          | Stop button during generation; "Try another" to abandon               |
| Draft Mode        | Outfit shown as draft before saving (save is explicit)                |
| Branches          | Conversation thread branching ("What if I swap the top?")             |
| Citations         | Each item in outfit card links back to its closet entry               |
| Memory            | Style profile persists across sessions; user can view/edit in Profile |

### Trust Builders

| Pattern        | Implementation                                                                |
| -------------- | ----------------------------------------------------------------------------- |
| Disclosure     | "AI-suggested outfit" label on every Magic Bar result                         |
| Caveat         | First-time tooltip: "Suggestions are based on your closet. Results may vary." |
| Data Ownership | Profile tab: "Your data" section with export and delete options               |
| Consent        | Onboarding: explicit permission for image processing, location (weather)      |

### Identifiers

| Pattern     | Implementation                                                      |
| ----------- | ------------------------------------------------------------------- |
| Avatar      | Abstract icon (not photorealistic) -- hanger + sparkle motif        |
| Personality | Warm but direct tone; avoids "I love that!" sycophancy              |
| Name        | "Style Assistant" (not a human name; sets appropriate expectations) |
| Color       | Warm amber/gold accent for AI elements (distinct from neutral UI)   |

---

## 8. AI-Generated Design Audit

Running the AI Slop detection checklist against this design:

| Fingerprint                                       | Present? | Notes                                                       |
| ------------------------------------------------- | -------- | ----------------------------------------------------------- |
| Inter/Roboto default, font-weight: 600 everywhere | No       | Font selection deferred to implementation                   |
| Purple-to-blue gradients, neon accents            | No       | Warm neutral palette; amber/gold AI accent                  |
| Cards-in-cards                                    | Marginal | Outfit cards contain item cards -- justified by the feature |
| Uniform spacing (no rhythm)                       | No       | Content zone 85%, nav 15%; intentional rhythm               |
| Glassmorphism everywhere                          | No       | None specified                                              |
| Uniform rounded-2xl                               | No       | Not specified; let implementation decide                    |
| transition-all 300ms everywhere                   | No       | Not specified                                               |

**Verdict: PASS** (1 marginal -- outfit cards within cards is structurally justified, not decorative)

---

## 9. Component Specification Index

These components need detailed specifications before implementation. Listed in dependency order:

| #   | Component          | Spec Scope                                                   | Depends On         |
| --- | ------------------ | ------------------------------------------------------------ | ------------------ |
| 1   | Tab Navigator      | 5 tabs, icons, labels, active states                         | None               |
| 2   | Magic Bar Rail     | Persistent input, expand/collapse, placeholder rotation      | Tab Navigator      |
| 3   | Magic Bar Expanded | Full-screen overlay, suggestion chips, thread history, input | Magic Bar Rail     |
| 4   | Stream of Thought  | Processing states, animated text, progress indicators        | Magic Bar Expanded |
| 5   | Outfit Card        | Item thumbnails, reasoning paragraph, action buttons         | Stream of Thought  |
| 6   | Closet Grid        | 3-column grid, item cards, filter bar, sort                  | Tab Navigator      |
| 7   | Item Card          | Thumbnail, tags (collapsed/expanded), actions                | Closet Grid        |
| 8   | Camera Flow        | Viewfinder, gallery picker, batch handling                   | Tab Navigator      |
| 9   | Tag Review         | AI tag display, edit controls, confidence indicators         | Camera Flow        |
| 10  | Semantic Search    | Input, results, relevance display                            | Tab Navigator      |
| 11  | Style DNA          | Color palette, formality range, category chart, occasions    | Profile Tab        |
| 12  | Empty States       | Closet empty, search no results, Magic Bar empty closet      | Multiple           |
| 13  | Onboarding         | 3-slide intro, value proposition, permissions                | None               |

---

## Appendix A: Screen Flow Diagram (ASCII)

```
                        [Launch]
                           |
                    [Onboarding]
                    (3 slides + skip)
                           |
                    [Sign Up / Log In]
                           |
              +------------+------------+
              |                         |
       [Empty Closet]           [Populated Closet]
       (add items CTA)          (grid + Magic Bar)
              |                         |
         [Camera] <----------+    [Magic Bar Tap]
         [Gallery]           |         |
              |              |    [Expanded Overlay]
         [Tag Review]        |         |
         (edit AI tags)      |    [Prompt Input]
              |              |         |
         [Closet Grid] ------+    [Stream of Thought]
         (item added)              |
                              [Outfit Card]
                                   |
                         +---------+---------+
                         |                   |
                    [Follow-up]          [Save Outfit]
                    (conversation)       (Style Tab)
                         |
                    [Updated Card]
                         |
                    [Save / Discard]
```

## Appendix B: Magic Bar State Machine

```
    [IDLE]
       |
       | (user taps rail or types)
       v
    [EXPANDED]
       |
       | (user submits prompt)
       v
    [RECEIVING] --(timeout)--> [ERROR: retry?]
       |
       | (0.5s)
       v
    [THINKING]
       |  "Looking through your closet..."
       | (3s)
       v
    [ASSEMBLING]
       |  Items arriving one by one
       | (5s)
       v
    [COMPLETE]
       |
       +-- [Save] ------> [SAVED to Style]
       +-- [Shuffle] ---> [THINKING] (regenerate)
       +-- [Follow-up] -> [EXPANDED] (conversation continues)
       +-- [Dismiss] ---> [IDLE]

    Any state --(Stop)--> [IDLE]
```

## Appendix C: Closet Item Data Model

```typescript
interface WardrobeItem {
  id: string;
  imageUrl: string; // Supabase Storage URL
  thumbnailUrl: string; // Optimized thumbnail
  userId: string; // Supabase Auth UID

  // AI-generated tags (from Claude Vision)
  category: Category; // Tops | Bottoms | Dresses | Outerwear | Shoes | Accessories
  color: ColorTag; // Primary color name + hex
  colorSecondary?: string; // Secondary color for multi-color items
  pattern: Pattern; // Solid | Striped | Plaid | Floral | Geometric | Abstract
  occasions: Occasion[]; // Casual | Work | Formal | Party | Date | Athletic | Travel
  formalityScore: number; // 1-10

  // Embedding (from CLIP)
  embedding: number[]; // 512-dim CLIP vector stored in pgvector

  // Metadata
  brand?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // Usage tracking (future)
  timesWorn?: number;
  lastWorn?: Date;
}

interface OutfitSuggestion {
  id: string;
  prompt: string; // User's natural language prompt
  items: WardrobeItem[]; // 2-5 items
  reasoning: string; // AI explanation
  threadId: string; // Conversation thread
  saved: boolean;
  createdAt: Date;
}

interface StyleProfile {
  dominantColors: { color: string; count: number }[];
  categoryDistribution: { category: Category; count: number }[];
  avgFormality: number;
  topOccasions: { occasion: Occasion; percentage: number }[];
  styleClusters?: { name: string; items: string[] }[]; // Future
}
```
