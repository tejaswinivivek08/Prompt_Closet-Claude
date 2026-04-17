# Magic Bar — Detailed Specification

**Domain**: UI / AI Interaction
**Authority**: This spec is the authority on all Magic Bar behavior. Read before implementing or modifying any Magic Bar component.
**Last Updated**: 2026-04-17

---

## 1. Overview

The Magic Bar is the app's primary AI interaction surface — a persistent rail above the tab bar that expands into a full-screen conversational overlay on demand. It is the P0 feature of the app, always visible and always accessible regardless of which screen the user is on.

**Designation**: Conversational Generative AI (per AI Interaction Pattern Map, Section 7 of 04-ux-design.md)

**Core responsibilities**:

- Accept natural language text or voice input describing an occasion, weather, mood, or style request
- Retrieve relevant wardrobe items via CLIP embeddings (semantic similarity)
- Compose outfits using Claude (slot-based decomposition)
- Present results as outfit cards with reasoning
- Maintain a conversation thread for iterative refinement

---

## 2. Placement and Layout

### 2.1 Persistent Rail (Collapsed State)

The Magic Bar rail is a **persistent element** that lives ABOVE the tab bar and BELOW the content zone. It is visible on ALL screens at ALL times, including during camera capture.

```
+-------------------------------------------+
|  [Content Zone — varies by screen]        |
|                                           |
+-------------------------------------------+
|  [sparkle icon] "What are you dressing for?" [>] |
+-------------------------------------------+
|  [Closet] [Style] [Camera] [Search] [Profile] |
+-------------------------------------------+
```

**Rail specifications**:

- Height: 52px
- Background: surface color with subtle bottom border (1px, subtle separator)
- Leftmost element: sparkle icon (AI indicator, amber/gold color per identifier spec)
- Center: placeholder text (see Section 5 for rotation logic)
- Rightmost: chevron/expand indicator

**Critical**: The rail is NOT inside a tab. It is a sibling element to the tab bar. It must not disappear during any screen transition except full-screen camera.

### 2.2 Expanded State (Full-Screen Overlay)

When the user taps the rail or begins typing, the Magic Bar expands into a full-screen modal overlay.

```
+-------------------------------------------+
|  [x close]           Style Assistant      |
+-------------------------------------------+
|                                            |
|  Recent conversations:                     |
|  +--------------------------------------+  |
|  | "Rainy Diwali dinner"     2 outfits  > |  |
|  +--------------------------------------+  |
|  | "Job interview at a bank"  1 outfit  > |  |
|  +--------------------------------------+  |
|                                            |
|  -- or --                                  |
|                                            |
|  Try asking:                               |
|  +--------------------------------------+  |
|  | Something for a first date          +  |
|  +--------------------------------------+  |
|  +--------------------------------------+  |
|  | Casual Friday outfit                 +  |
|  +--------------------------------------+  |
|  +--------------------------------------+  |
|  | Warm and cozy for winter             +  |
|  +--------------------------------------+  |
|                                            |
+-------------------------------------------+
|  [mic]  What are you dressing for?    [>] |
+-------------------------------------------+
```

**Expanded overlay specifications**:

- Full-screen modal with semi-transparent scrim behind
- Drag-to-dismiss gesture (swipe down) supported
- Header: close button (x) left, "Style Assistant" title center
- Body: scrollable conversation history + suggestion chips
- Footer: persistent input bar (same as collapsed, just expanded)

---

## 3. Input Design

### 3.1 Text Input

**Primary text field** with the following specifications:

```
+-------------------------------------------+
|  [mic icon]  [  What are you dressing for? ] [send icon] |
+-------------------------------------------+
```

- Left accessory: microphone icon (voice toggle)
- Center: single-line text input
- Right accessory: send/arrow icon (submit button)
- Placeholder text: rotates based on context (see Section 5)
- Submit: activated by send button tap OR by pressing Return/Enter on keyboard
- Keyboard: default mobile keyboard, auto-focus on expand

**Voice input**:

- Tap microphone to start recording; tap again to stop and transcribe
- Press-and-hold also supported for hands-free recording while dressing
- Transcription shown inline in the text field before submission, fully editable
- Voice icon pulses amber while recording

### 3.2 Placeholder Rotation

Placeholder text rotates based on the following context hierarchy:

| Context                 | Placeholder Text                          |
| ----------------------- | ----------------------------------------- |
| Morning (5am–11:59am)   | "What are you wearing today?"             |
| Afternoon (12pm–4:59pm) | "Dressing for the afternoon?"             |
| Evening (5pm–9:59pm)    | "Going out tonight?"                      |
| Night (10pm–4:59am)     | "Planning tomorrow's look?"               |
| Just added item         | "Ask me about your new [item name]"       |
| Raining (weather API)   | "Something rain-friendly?"                |
| Weekend                 | "Casual weekend outfit?"                  |
| Default/fallback        | "Describe the occasion, weather, or mood" |

**Rotation logic**: Evaluated on each open of the Magic Bar. Highest-priority matching context wins.

---

## 4. Processing States (Stream of Thought)

The Magic Bar shows a visible, animated reasoning stream during AI processing. **This is the highest-risk moment for user abandonment.** A blank spinner for 10+ seconds will kill engagement. The Stream of Thought MUST be visible for all AI processing.

### 4.1 State Machine

```
    [IDLE]
       |
       | (user taps rail or types)
       v
    [EXPANDED]
       |
       | (user submits prompt)
       v
    [RECEIVING] --(timeout 15s)--> [ERROR: retry?]
       |
       | (0.5s transition)
       v
    [THINKING]
       |  "Looking through your closet..."
       |  (0.5s – 3s)
       v
    [ASSEMBLING]
       |  Items arriving one by one
       |  (3s – 8s)
       v
    [COMPLETE]
       |
       +-- [Save] ------> [SAVED to Style]
       +-- [Shuffle] ---> [THINKING] (regenerate)
       +-- [Follow-up] --> [EXPANDED] (conversation continues)
       +-- [Dismiss] ---> [IDLE]

    Any state --(Stop/Close)--> [IDLE]
```

**State transition rules**:

- RECEIVING → THINKING: after 0.5s (minimum engagement to show processing began)
- THINKING → ASSEMBLING: when first items are retrieved from CLIP similarity search
- ASSEMBLING → COMPLETE: when all outfit items confirmed and reasoning generated
- Any state → IDLE: user dismisses, stops, or navigates away
- Timeout: if COMPLETE not reached within 15s of RECEIVING, transition to ERROR state

### 4.2 State Visuals

**STATE 1: RECEIVING**

- Duration: 0–0.5s
- Input field collapses. Rail shows:
  - "Finding something perfect..."
  - Animated sparkle icon
- No spinner — the sparkle animation IS the indicator

**STATE 2: THINKING**

- Duration: 0.5s–3s
- Animated thought stream displayed:

```
+-------------------------------------------+
|  Looking through your closet...            |
|  > Checked 47 items                        |
|  > Matching to "rainy Diwali dinner"      |
|  > Considering color harmony...            |
|  > Found 3 strong candidates               |
+-------------------------------------------+
```

- Each line appears with a typewriter animation (50ms per character)
- Lines stack and scroll; most recent at bottom
- Thinking indicator (three animated dots) replaces cursor

**STATE 3: ASSEMBLING**

- Duration: 3s–8s
- Outfit components arrive progressively:

```
+-------------------------------------------+
|  Putting it together...                    |
|                                            |
|  [top: arriving...]    [shoes: thinking]  |
|  [bottom: selected  ]  [layer: thinking]  |
+-------------------------------------------+
```

- Each slot shows current state: `thinking` (pulsing placeholder) → `arriving` (fade-in thumbnail) → `selected` (full thumbnail with label)
- Slots fill left-to-right as items are confirmed
- A slot labeled `thinking` that receives no item shows `skipped` state

**STATE 4: COMPLETE**

- Full outfit card revealed (see Section 6)
- Processing UI collapses; outfit card animates in (scale from 0.95 to 1.0, 200ms ease-out)

### 4.3 Stop / Cancel

A stop button (X icon) is visible during RECEIVING, THINKING, and ASSEMBLING states. Tapping it immediately:

- Cancels any in-flight API request
- Clears processing UI
- Returns to IDLE state (collapsed rail) if no conversation history
- Returns to EXPANDED state (with previous results visible) if conversation exists

---

## 5. Output Format: Outfit Card

The output of a successful Magic Bar query is an **outfit card** — a cohesive visual assembly of 2–5 items with reasoning.

### 5.1 Outfit Card Anatomy

```
+-------------------------------------------+
|  OUTFIT FOR: Rainy Diwali Dinner           |
|  +-------+ +-------+ +-------+ +-------+  |
|  |       | |       | |       | |       |  |
|  |  TOP  | |  BTM  | |  LAY  | |  SHO  |  |
|  |       | |       | |       | |       |  |
|  +-------+ +-------+ +-------+ +-------+  |
|  Navy     Charcoal  Cream     Brown        |
|  silk     wool      cashmere  leather      |
|  blouse   trousers  sweater   boots       |
|                                            |
|  WHY THIS WORKS:                           |
|  "The navy and cream pairing is classic   |
|   Diwali elegance. Leather boots handle   |
|   rain. The cashmere layer adds warmth    |
|   for evening celebrations."              |
|                                            |
|  [Save outfit]  [Shuffle]  [Try another]  |
+-------------------------------------------+
```

### 5.2 Anatomy Fields

| Field                   | Content                                  | Notes                                      |
| ----------------------- | ---------------------------------------- | ------------------------------------------ |
| Context header          | Echoes the user's prompt verbatim        | "OUTFIT FOR: [original prompt text]"       |
| Item strip              | 2–5 item thumbnails in horizontal scroll | Each item is tappable to view closet entry |
| Color + material labels | Per-item quick-scan labels               | Appear below each thumbnail                |
| Reasoning paragraph     | 2–4 sentence AI explanation              | The trust builder — always shown           |
| Action rail             | Save / Shuffle / Try another             | Save = persist to Style tab                |

**Item thumbnail specifications**:

- Size: 72px × 72px
- Border radius: 8px
- Background: item photo (no placeholder background)
- Border: 2px solid amber/gold when selected in current outfit
- Label: color name (primary) on first line, material + category on second line

**Reasoning paragraph**:

- Font: body text (14px)
- Color: secondary text color
- Max 4 lines; if longer, truncate with "..." and expand on tap
- Always shows "AI-suggested outfit" label above reasoning (per Trust Builders pattern)

### 5.3 Multiple Outfit Options

If the user asks for options or if the AI returns multiple valid compositions:

- Display 2–3 outfit cards vertically stacked
- Each card is independently actionable (save, shuffle, refine)
- "Show me 3 options" is triggered by explicit request or via toggle

---

## 6. Follow-Up Conversation Thread

The Magic Bar supports **iterative refinement** through a conversation thread. This is essential for the "not that, something warmer" use case. The model is NOT single-shot.

### 6.1 Thread Behavior

**Conversation flow example**:

```
User:  "Show me something for a rainy Diwali dinner"
AI:    [Outfit Card A: navy blouse, wool trousers, boots, cashmere sweater]

User:  "Not the trousers, something more festive"
AI:    [Outfit Card B: navy blouse, silk skirt, boots, cashmere sweater]
       ^ blouse and boots retained (user didn't object)
       ^ trousers replaced with silk skirt (more festive)

User:  "Perfect. Save this."
AI:    "Saved to your Style collection."
       [Undo] button visible for 5 seconds
```

**Thread rules**:

- Each thread starts with a fresh prompt (not a follow-up)
- Follow-ups modify the previous result using conversational context
- Thread persists for the entire session (not cleared on dismiss)
- Thread accessible from Style tab history
- Maximum 10 turns per thread; at turn 10, prompt "Start a new look?"
- Follow-up does NOT re-run full CLIP retrieval from scratch — it uses cached closet embeddings + conversation context

### 6.2 Follow-Up Input

During an active thread, the input bar shows:

```
+-------------------------------------------+
|  [mic]  Not the trousers...            [>] |
+-------------------------------------------+
```

The previous outfit card remains visible above the input, visually grounding the conversation.

### 6.3 Follow-Up Chip Suggestions

After receiving an outfit, the following chips appear below the outfit card:

- "Something warmer"
- "More formal"
- "Different shoes"
- "Save this outfit"

These are tappable quick-refine actions that pre-fill the input without requiring the user to type.

---

## 7. Prompt Suggestion Chips

Three tiers of suggestion chips appear in the expanded Magic Bar when no active thread exists. Chips are horizontally scrollable rows.

### 7.1 Tier 1: Contextual (Highest Priority)

Based on time of day, day of week, weather, location, recent additions.

| Context               | Suggestion                               |
| --------------------- | ---------------------------------------- |
| Monday 8am            | "What should I wear to work today?"      |
| Friday 5pm            | "Going out tonight?"                     |
| Just added a dress    | "What occasions work with my new dress?" |
| Raining (weather API) | "Something rain-friendly"                |
| Weekend               | "Casual brunch outfit"                   |
| Evening               | "Date night outfit"                      |

**Weather API**: Uses device location (with permission) to fetch current conditions. If location denied, weather-based suggestions are skipped.

**Recent additions**: Triggered when a new item was saved to closet in the current session. Shows "Ask me about your new [item category]".

### 7.2 Tier 2: Closet-Aware (Second Priority)

Based on underused items, gaps in wardrobe, or interesting combinations.

| Trigger                     | Suggestion                             |
| --------------------------- | -------------------------------------- |
| Item worn 0 times           | "Show me outfits with my [item name]"  |
| Single-color closet         | "Add some color to my outfit"          |
| 20+ items, no outfits saved | "Create my first outfit"               |
| Many tops, few bottoms      | "I have nothing to wear with this top" |

### 7.3 Tier 3: Seasonal / Cultural (Third Priority)

| Period   | Suggestion                              |
| -------- | --------------------------------------- |
| October  | "Something for Halloween"               |
| November | "Diwali celebration outfit"             |
| December | "Holiday party look"                    |
| January  | "New year, fresh style"                 |
| General  | "Surprise me with something unexpected" |

### 7.4 Chip Design Specification

- Shape: rounded pill (border-radius: 20px)
- Padding: 10px horizontal, 8px vertical
- Font: 14px body text
- Background: surface variant color
- Text: primary text color
- Tappable: pre-fills input, does NOT auto-submit
- Horizontal scroll: single row, no pagination
- Max visible chips: 4 on phone, 6 on tablet

---

## 8. Error States

Every error state must be handled gracefully with a specific, actionable message. No generic error text.

### 8.1 Error State Table

| Error                | Trigger                                                           | UI Response                                                                                                 | Action Buttons                                   |
| -------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Empty closet**     | User has 0 items in closet                                        | "Your closet is empty! Add some clothes first, then I can help you style them."                             | [Take me to Camera]                              |
| **No matches**       | Prompt too specific, closet too small, or no items match criteria | "I couldn't find the right pieces for that. Try broadening your request, or add more items to your closet." | [Add items] [Try asking differently]             |
| **AI failure**       | API timeout (15s+), API error, or network error                   | "Something went wrong on my end. Try again?"                                                                | [Retry]                                          |
| **Offline**          | No network connection detected                                    | "I need internet to style you. Check your connection."                                                      | [Check connection] (opens settings)              |
| **Ambiguous prompt** | "something nice" with no further context                          | "What kind of occasion? Work, date night, casual hangout?"                                                  | [chip suggestions: Work / Date / Casual / Party] |
| **Rate limited**     | Too many requests in short window                                 | "I'm getting too many requests. Give me a moment!"                                                          | [Wait 30s] or auto-retry                         |

### 8.2 Empty Closet Error

This error has a special treatment because it is a critical onboarding moment:

```
+-------------------------------------------+
|                                           |
|  [sparkle icon - grayed out]             |
|                                           |
|  Your closet is empty                    |
|                                           |
|  Add some clothes first, then I can       |
|  help you style them.                    |
|                                           |
|  +-------------------------------------+  |
|  |      + Add your first item          |  |
|  +-------------------------------------+  |
|                                           |
+-------------------------------------------+
```

The Magic Bar rail itself, when tapped while closet is empty, shows a grayed-out version with the message "Add clothes to unlock style suggestions".

### 8.3 No Matches Error

```
+-------------------------------------------+
|  [hanger icon - grayed out]               |
|                                           |
|  I couldn't find the right pieces         |
|                                           |
|  Try broadening your request — less       |
|  specific occasions or colors.            |
|                                           |
|  [Add items to closet]  [Try differently] |
|                                           |
|  -- or try these --                       |
|                                           |
|  [Casual outfit]  [Work outfit]  [Date]   |
|                                           |
+-------------------------------------------+
```

---

## 9. State Machine Specification

Full state machine for the Magic Bar component:

```
States: IDLE | EXPANDED | RECEIVING | THINKING | ASSEMBLING | COMPLETE | ERROR

Transitions:

IDLE:
  + tap_rail → EXPANDED
  + type_input → EXPANDED

EXPANDED:
  + submit_prompt → RECEIVING
  + tap_suggestion_chip → RECEIVING (chip text pre-filled as prompt)
  + close → IDLE
  + swipe_down → IDLE

RECEIVING:
  + 0.5s elapsed → THINKING
  + 15s timeout → ERROR
  + stop/cancel → IDLE

THINKING:
  + first_items_retrieved → ASSEMBLING
  + 15s total timeout → ERROR
  + stop/cancel → IDLE

ASSEMBLING:
  + all_items_confirmed → COMPLETE
  + stop/cancel → IDLE

COMPLETE:
  + tap_save → SAVED (transient state → COMPLETE)
  + tap_shuffle → THINKING
  + follow_up_submitted → RECEIVING
  + close → IDLE

ERROR:
  + tap_retry → RECEIVING
  + close → IDLE
```

**Guards**:

- `submit_prompt` is only valid if input text is non-empty OR voice recording is non-empty
- `follow_up_submitted` is only valid if in COMPLETE state (requires a prior outfit to refine)
- `tap_shuffle` re-uses conversation context but re-runs outfit composition
- Thread history (prior turns) is preserved across all transitions except close → IDLE

---

## 10. Controls

| Control                    | Location                | Behavior                                                     |
| -------------------------- | ----------------------- | ------------------------------------------------------------ |
| Close (X)                  | Expanded overlay header | Returns to IDLE; clears current thread                       |
| Stop (X during processing) | Overlays processing UI  | Cancels API request; returns to IDLE or last COMPLETE        |
| Send button                | Input bar right         | Submits current input text                                   |
| Microphone                 | Input bar left          | Toggles voice recording                                      |
| Save outfit                | Outfit card action rail | Persists outfit to Style tab; shows undo for 5s              |
| Shuffle                    | Outfit card action rail | Regenerates outfit with same prompt; transitions to THINKING |
| Try another                | Outfit card action rail | Transitions to EXPANDED with new prompt prompt               |
| Follow-up chips            | Below outfit card       | Pre-fill input with refinement text                          |

---

## 11. AI-Specific Design Patterns

Implemented per the AI Interaction Pattern Map (Section 7 of 04-ux-design.md):

| Pattern           | Implementation                                                  |
| ----------------- | --------------------------------------------------------------- |
| Open Input        | Magic Bar text + voice input                                    |
| Suggestions       | Prompt chips (3 tiers: contextual, closet-aware, seasonal)      |
| Follow-ups        | "Something warmer" / "Different shoes" quick chips              |
| Memory            | Style profile persists across sessions (Profile tab)            |
| Stream of Thought | Processing states: Receiving → Thinking → Assembling → Complete |
| Controls          | Stop during generation; Save/Shuffle/Try another                |
| Variations        | "Show me 3 options" toggle                                      |
| Auto-fill         | Camera → auto-tag (AI fills tags before user confirms)          |
| Disclosure        | "AI-suggested outfit" label on every result                     |
| Avatar            | Sparkle icon (hanger + sparkle motif — not photorealistic)      |
| Personality       | Warm but direct tone; no sycophancy ("I love that!")            |
| Name              | "Style Assistant" — not a human name                            |
| Color accent      | Amber/gold for all AI elements                                  |

---

## 12. Dependencies

| Dependency                 | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| CLIP embeddings            | Semantic similarity search for item retrieval  |
| Claude API                 | Outfit composition + reasoning generation      |
| Weather API (optional)     | Tier 1 contextual suggestions                  |
| Conversation context cache | Follow-up refinement without full re-retrieval |
| Supabase storage           | Outfit image assembly and serving              |

---

## 13. Component Inventory

| Component                  | States                                                   |
| -------------------------- | -------------------------------------------------------- |
| Magic Bar Rail             | Idle (visible), Active (processing), Expanded            |
| Magic Bar Expanded Overlay | Empty (no history), Thread (conversation active)         |
| Stream of Thought Display  | Receiving, Thinking, Assembling                          |
| Outfit Card                | Loading (partial), Complete, Error                       |
| Prompt Suggestion Chip     | Default, Pressed                                         |
| Follow-Up Chip             | Default, Pressed                                         |
| Input Bar                  | Empty, Has Text, Recording (voice)                       |
| Error State                | Empty Closet, No Matches, AI Failure, Offline, Ambiguous |
| Action Rail Button         | Default, Pressed, Loading, Disabled                      |
