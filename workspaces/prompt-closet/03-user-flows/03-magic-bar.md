# Magic Bar Interaction Flow

**Phase**: User Flows
**Date**: 2026-04-17
**Product**: Prompt Closet

---

## Flow Overview

The Magic Bar is the core AI styling interaction. It persists across all screens and expands to a full-screen conversational interface for outfit suggestions, refinements, and saving.

---

## Magic Bar Architecture

### Placement

The Magic Bar lives as a **persistent rail above the tab bar**, visible on every screen except full-screen camera.

```
+-------------------------------------------+
|                                           |
|  [Screen Content - varies by tab]         |
|                                           |
+-------------------------------------------+
|  [sparkle] What are you dressing for? [>] |
+-------------------------------------------+
|  Closet | Style | Camera | Search | Me    |
+-------------------------------------------+
```

### Collapsed State (Rail)

**Always visible except during full-screen camera capture.**

| State    | Visual                   | Behavior                                  |
| -------- | ------------------------ | ----------------------------------------- |
| Idle     | Prompt chips visible     | Suggestions rotate based on context       |
| Disabled | Grayed rail text         | "Add clothes to unlock style suggestions" |
| Expanded | Rail replaced by overlay | Full-screen input mode active             |

### Expanded State (Full-Screen Overlay)

**Triggered by tapping the rail or submitting a prompt.**

```
+-------------------------------------------+
|  [x]                    Style Assistant   |
+-------------------------------------------+
|                                           |
|  Recent conversations:                    |
|  > "Rainy Diwali dinner"     2 outfits    |
|  > "Job interview"          1 outfit      |
|                                           |
|  Try asking:                              |
|  +----------------------------+           |
|  | Something for a first date |           |
|  +----------------------------+           |
|  +----------------------------+           |
|  | Casual Friday outfit        |           |
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

## Screen: Magic Bar Expanded

### Input Area

**Text Input**:

- Placeholder text rotates contextually:
  - Morning (5am-12pm): "What are you wearing today?"
  - Evening (5pm-10pm): "Going out tonight?"
  - Post-item-add: "Ask me about your new [item name]"
  - Generic: "Describe the occasion, weather, or mood"

**Voice Input**:

- Microphone icon left of text field
- Press-and-hold to record
- Tap-to-record alternative
- Transcription shown inline before submission

**Submit**:

- Arrow/send button right of text field
- Disabled when input is empty
- Submits on tap

### Suggestion Chips

Three tiers of suggestions, shown when input is empty:

**Tier 1: Contextual** (top priority, time/weather-aware):
| Context | Suggestion |
|---------|------------|
| Monday 8am | "What should I wear to work today?" |
| Friday 5pm | "Going out tonight?" |
| Raining | "Something rain-friendly" |
| Weekend | "Casual brunch outfit" |

**Tier 2: Closet-Aware** (based on wardrobe state):
| Trigger | Suggestion |
|---------|------------|
| Just added item | "What occasions work with my new [item]?" |
| 20+ items, no outfits | "Create my first outfit" |
| Unworn items | "Show me outfits with my [unworn item]" |

**Tier 3: Seasonal/Cultural**:
| Period | Suggestion |
|--------|-----------|
| October | "Something for Halloween" |
| November | "Diwali celebration outfit" |
| December | "Holiday party look" |
| Any time | "Surprise me with something unexpected" |

**Chip Behavior**:

- Tap chip -> pre-fill input (does not submit)
- User can modify before sending
- Horizontally scrollable row

### Conversation History

**Shown when previous conversations exist**:

- List of past prompts with outfit count
- Tap to continue any thread
- "New conversation" option at top

**Thread Persistence**:

- Threads persist for session
- Accessible from Style tab history
- Max 10 turns per thread before "Start new look" prompt

---

## Processing States (Stream of Thought)

After prompt submission, the Magic Bar shows AI reasoning progress.

### State 1: Receiving (0-0.5s)

**Visual**:

```
[input field collapses]
"Finding something perfect..."
```

### State 2: Thinking (0.5-3s)

**Visual** (animated, lines appear sequentially):

```
+-------------------------------------------+
|  Looking through your closet...           |
|  > Checked 47 items                      |
|  > Matching to "rainy Diwali dinner"     |
|  > Considering color harmony...          |
+-------------------------------------------+
```

### State 3: Assembling (3-8s)

**Visual** (items arrive progressively):

```
+-------------------------------------------+
|  Putting it together...                   |
|                                           |
|  [top: arriving...]   [shoes: thinking]   |
|  [bottom: selected]   [layer: thinking]  |
+-------------------------------------------+
```

### State 4: Complete

Full outfit card revealed (see Outfit Card section)

---

## Screen: Outfit Card Result

### Visual Layout

```
+-------------------------------------------+
|  OUTFIT FOR: Rainy Diwali Dinner         |
|  +-----+  +-----+  +-----+  +-----+      |
|  | TOP |  | BTM |  | LAY |  | SHO |      |
|  |     |  |     |  |     |  |     |      |
|  +-----+  +-----+  +-----+  +-----+      |
|  Navy     Charcoal  Cream     Brown       |
|  silk     wool     cashmere  leather     |
|  blouse   trousers sweater  boots        |
|                                           |
|  WHY THIS WORKS:                         |
|  "The navy and cream pairing is classic  |
|   Diwali elegance. Leather boots handle  |
|   rain. The cashmere layer adds warmth   |
|   for evening celebrations."              |
|                                           |
|  [Save]  [Shuffle]  [Try another]        |
+-------------------------------------------+
|  "Not that top, something warmer" [>]    |
+-------------------------------------------+
```

### Card Anatomy

| Section         | Content                              |
| --------------- | ------------------------------------ |
| Header          | Echoes user's prompt                 |
| Item strip      | 2-5 horizontal scrollable thumbnails |
| Item labels     | Color + material + category per item |
| Reasoning       | AI explanation paragraph             |
| Action rail     | Save / Shuffle / Try another         |
| Follow-up input | "Not that..." refinement bar         |

### Item Thumbnails

- Tap item thumbnail -> navigate to Item Detail
- Long-press item -> show "Remove from outfit" option

### Action Buttons

| Button      | Behavior                                          |
| ----------- | ------------------------------------------------- |
| Save        | Save outfit to Style tab, show confirmation toast |
| Shuffle     | Regenerate with same prompt, new item combination |
| Try another | Start fresh prompt input                          |

---

## Conversational Refinement

### Follow-Up Flow

**User** submits: "Not that top, something warmer"

**AI Response**:

- Keeps unchanged items (user didn't object)
- Swaps objected item with alternatives
- Shows new outfit card

**Visual**:

```
+-------------------------------------------+
|  "Not the skirt, something more comfortable"
|                                           |
|  [Outfit Card B]                          |
|  (blouse + boots preserved, skirt swapped)|
|                                           |
+-------------------------------------------+
```

### Thread Rules

- Follow-ups modify previous result (not start fresh)
- Maximum 10 turns per thread
- "Start a new look" prompt after 10 turns
- Thread saved to Style tab history on explicit save

### Follow-Up Suggestions (Chips)

Contextual chips appear below outfit card:

- "Something warmer"
- "Dress it up"
- "Make it casual"
- "Different shoes"
- "Show fewer items"

---

## Screen: Outfit Saved Confirmation

**Trigger**: Save button tapped

**Animation**:

1. Outfit card shows checkmark overlay (300ms)
2. "Saved to your Style collection!" toast
3. "Undo" button visible for 5 seconds

```
+-------------------------------------------+
|  [Outfit Card with checkmark]             |
|                                           |
|  Saved to your Style collection!          |
|                                           |
|  [Undo]              [View Outfit]        |
+-------------------------------------------+
```

### Undo Behavior

- Tap Undo -> outfit removed from Style tab
- After 5 seconds -> Undo button disappears
- Tap View Outfit -> navigate to Style tab

---

## Error States

| Error            | Cause                                  | UI Response                                                                        |
| ---------------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| Empty closet     | No items in closet                     | "Your closet is empty! Add some clothes first." [Take me to Camera]                |
| No matches       | Prompt too specific / closet too small | "I couldn't find the right pieces. Try broadening your request or add more items." |
| AI failure       | API timeout/error                      | "Something went wrong. Try again?" [Retry]                                         |
| Offline          | No network                             | "I need internet to style you. Check your connection."                             |
| Ambiguous prompt | Vague request                          | "What kind of occasion? Work, date night, casual?" [suggestion chips]              |

---

## Empty Closet State

**When closet has 0 items, Magic Bar shows**:

```
+-------------------------------------------+
|  [sparkle icon - grayed]                  |
|  Add clothes to unlock style suggestions |
+-------------------------------------------+
```

**Tap behavior**:

- Show toast: "Add items to your closet first"
- Tap "Take me to Camera" (if shown) -> Camera flow

---

## State Machine

```
[IDLE - Rail]
   |
   | (user taps rail or types)
   v
[EXPANDED - Input Mode]
   |
   | (user submits prompt)
   v
[RECEIVING]
   |
   | (0.5s)
   v
[THINKING]
   |  Stream of thought visible
   | (3s)
   v
[ASSEMBLING]
   |  Items arriving
   | (5s)
   v
[COMPLETE - Outfit Card]
   |
   +-- [Save] ----> [SAVED] --> [IDLE]
   +-- [Shuffle] -> [THINKING] (regenerate)
   +-- [Follow-up] -> [EXPANDED] (conversation continues)
   +-- [Dismiss x] -> [IDLE]

Any state --(Stop/Cancel)--> [IDLE]
```

---

## Flow Summary Diagram

```
[Persistent Rail - Visible on All Screens]
              |
              | (tap)
              v
[Expanded Overlay]
              |
              | (submit prompt)
              v
[Processing States]
  Receiving -> Thinking -> Assembling -> Complete
              |                           |
              |                           v
              |                    [Outfit Card]
              |                           |
              +-------------------+----+---+
                                  |    |
                             [Save] [Follow-up]
                                  |    |
                                  v    v
                           [Saved] [Refined Card]
                                  |    |
                                  |    +-- (loop)
                                  v
                             [Style Tab]
```

---

## Key UX Decisions

| Decision                      | Rationale                                                            |
| ----------------------------- | -------------------------------------------------------------------- |
| Persistent rail above tab bar | Magic Bar accessible from anywhere without navigation                |
| Full-screen expansion         | Allows conversation history + suggestions without cluttering content |
| Stream of Thought             | 3-10s pipeline latency becomes engaging demo moment                  |
| Reasoning paragraph           | Builds trust in AI choices; explains "why" not just "what"           |
| Follow-up not new thread      | Conversation context produces better refinements                     |
| Max 10 turns                  | Prevents infinite loops; guides user toward decisions                |
| 5s undo window                | Brief grace period without cluttering UI                             |
| Chips pre-fill not submit     | User can modify AI suggestion before committing                      |
