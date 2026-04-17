# Style Profile Flow

**Phase**: User Flows
**Date**: 2026-04-17
**Product**: Prompt Closet

---

## Flow Overview

Style DNA visualization, contextual nudges, outfit history, and data management within the Profile tab.

---

## Screen: Profile Tab (Default View)

### Visual Layout

```
+-------------------------------------------+
|  [avatar]                                 |
|  Your Profile                             |
|                                           |
|  YOUR STYLE DNA                           |
|  (locked state - see unlock requirements) |
|                                           |
|  +------------------------------------+  |
|  |  Keep adding clothes to discover   |  |
|  |  your style                        |  |
|  |                                    |  |
|  |  [progress: 3/5 items]            |  |
|  +------------------------------------+  |
|                                           |
|  RECENT OUTFITS                           |
|  [outfit card 1]  [outfit card 2]        |
|                                           |
|  STYLE NUDGES                             |
|  [nudge card 1]                           |
|                                           |
|  +------------------------------------+  |
|  |  Data & Privacy                   |  |
|  |  Export my data                   |  |
|  |  Delete my account                |  |
|  +------------------------------------+  |
|                                           |
+-------------------------------------------+
|  Magic Bar rail                           |
+-------------------------------------------+
|  Closet | Style | Camera | Search | Me    |
+-------------------------------------------+
```

---

## Screen: Style DNA (Unlocked)

### Unlock Requirements

- **Threshold**: 5+ items in closet
- **Display**: Progress indicator when locked
- **Animation**: Unlock celebration when threshold reached

### Unlocked Visual Layout

```
+-------------------------------------------+
|  YOUR STYLE DNA                           |
|                                           |
|  Color Palette                             |
|  [##][##][##][##][##]                     |
|  Navy Charcoal Cream Brown Olive           |
|  (dominant colors from closet)             |
|                                           |
|  Top Categories                            |
|  Tops      ████████████████ 14            |
|  Bottoms   ████████         7              |
|  Shoes     █████            4             |
|  Outerwear ███              2             |
|                                           |
|  Formality Range                           |
|  Casual  [==|========]  Formal             |
|  Average: 6.2 / 10                         |
|                                           |
|  Go-to Occasions                           |
|  Work (62%)  Casual (28%)  Date (10%)      |
|                                           |
+-------------------------------------------+
```

### Style DNA Components

#### Color Palette

- Top 5 dominant colors from closet items
- Visual swatches with color names
- Bar chart showing distribution

**Data Source**: Item color tags aggregated

#### Category Distribution

- Horizontal bar chart
- Shows count per category
- Sorted by frequency (highest first)

**Data Source**: Item category tags aggregated

#### Formality Range

- Visual slider showing 1-10 range
- Highlighted region shows user's range
- Average formality score displayed

**Data Source**: Item formality scores averaged

#### Occasion Breakdown

- Pie chart or bar chart
- Percentage per occasion
- Top 3 occasions highlighted

**Data Source**: Item occasion tags aggregated

---

## Progress Indicator (Locked State)

### Visual

```
+-------------------------------------------+
|  YOUR STYLE DNA                           |
|                                           |
|  +------------------------------------+  |
|  |                                    |  |
|  |    [closet illustration]           |  |
|  |                                    |  |
|  |    Keep adding clothes to         |  |
|  |    discover your style             |  |
|  |                                    |  |
|  |    [====----] 3/5 items            |  |
|  |                                    |  |
|  |    "Add 2 more items to unlock"   |  |
|  +------------------------------------+  |
|                                           |
+-------------------------------------------+
```

### States

| Items | Progress | Message                              |
| ----- | -------- | ------------------------------------ |
| 0     | 0/5      | "Add your first item to start"       |
| 1-2   | 1-2/5    | "Keep going! X more items to unlock" |
| 3-4   | 3-4/5    | "Almost there! X more to unlock"     |
| 5+    | 5/5      | Style DNA unlocked with animation    |

### Unlock Animation

**Trigger**: Item count reaches 5

**Sequence** (1.5s total):

1. Progress bar fills completely (300ms)
2. Lock icon transforms to sparkle (300ms)
3. "Your Style DNA is ready!" text appears (300ms)
4. Style DNA sections fade in sequentially (600ms)

---

## "We Noticed" Style Nudges

### Entry Point

Profile tab, below Style DNA section

### Visual Layout

```
+-------------------------------------------+
|  WE NOTICED                               |
|                                           |
|  +------------------------------------+  |
|  | [icon] Your closet is heavy on     |  |
|  | navy. Want to explore some color   |  |
|  | variety?                           |  |
|  |                                    |  |
|  | [Explore colors]    [Not now]      |  |
|  +------------------------------------+  |
|                                           |
+-------------------------------------------+
```

### Nudge Triggers

| Trigger                         | Nudge Content                                                          | Frequency       |
| ------------------------------- | ---------------------------------------------------------------------- | --------------- |
| 5+ items same color, no others  | "Your closet is heavy on [color]. Want to explore some color variety?" | Once            |
| 3+ formal items, never combined | "You have pieces for a great formal outfit. Want to see it?"           | Once per combo  |
| Item worn 5+ times              | "Your [item name] is a workhorse! Here are fresh ways to wear it."     | Weekly          |
| New season, relevant items      | "Summer is coming. Here's what works from your current closet."        | Once per season |

### Nudge Behavior

- Maximum **one nudge per session**
- "Not now" dismisses for this session
- "Don't show again" permanently dismisses this nudge type
- Tapping action navigates to relevant screen (Magic Bar, closet filter)

### Persistence

Nudge dismissals stored per-nudge-type:

- Show again next session (for "not now")
- Never show again (for "don't show again")

---

## Style Clusters (Future Feature)

### Current State

Not implemented in Phase 1

### Planned Visual Layout

```
+-------------------------------------------+
|  YOUR LOOKS                               |
|  (Based on how you wear items together)   |
|                                           |
|  +--------+  +--------+  +--------+       |
|  | Look 1 |  | Look 2 |  | Look 3 |      |
|  | "Office|  | "Weekend|  | "Night |      |
|  |  Core" |  |  Chill" |  |  Out"  |      |
|  | 5 items|  | 4 items |  | 3 items|      |
|  +--------+  +--------+  +--------+       |
|                                           |
|  Clusters appear after 10+ items          |
|  and 3+ saved outfits                     |
+-------------------------------------------+
```

### Display Conditions

- Hidden until 10+ items AND 3+ saved outfits
- Cluster names AI-generated (user can rename)
- Tapping cluster navigates to filtered closet view

---

## Saved Outfits Section

### Entry Point

Profile tab OR Style tab (primary location)

### Visual Layout

```
+-------------------------------------------+
|  RECENT OUTFITS                           |
|                                           |
|  +--------+  +--------+  +--------+       |
|  | outfit |  | outfit |  | outfit |      |
|  | card   |  | card   |  | card   |      |
|  +--------+  +--------+  +--------+       |
|                                           |
|  [View All Outfits]                       |
|                                           |
+-------------------------------------------+
```

### Outfit Card (Compact)

```
+--------+
| [img]  |
| [img]  |
| [img]  |
+--------+
Date: Apr 15
```

### Outfit Detail (Tap)

Navigates to full outfit view with:

- All items in outfit
- Original prompt
- Reasoning paragraph
- "Wear again" / "Delete" actions

---

## Data & Privacy Section

### Visual Layout

```
+-------------------------------------------+
|  DATA & PRIVACY                           |
|                                           |
|  +------------------------------------+  |
|  |  Export my data                   |  |
|  +------------------------------------+  |
|                                           |
|  +------------------------------------+  |
|  |  Delete my account                |  |
|  +------------------------------------+  |
|                                           |
+-------------------------------------------+
```

### Export My Data

**Behavior**:

- Tap -> Confirm dialog
- Generates ZIP file with:
  - All item images
  - All tags (CSV/JSON)
  - All saved outfits
  - Style DNA data
- Download link sent to email (for large exports)
- Direct download for small exports

**Dialog**:

```
+-------------------------------------------+
|  Export Your Data                         |
|                                           |
|  We'll prepare a download of all your    |
|  closet items, outfits, and style data.   |
|                                           |
|  This may take a few minutes.             |
|                                           |
|  [Cancel]              [Export]           |
+-------------------------------------------+
```

### Delete My Account

**Behavior**:

- Tap -> Account deletion flow
- Requires password re-entry
- Warning: all data will be permanently deleted
- 30-day recovery window (if supported by backend)

**Dialog**:

```
+-------------------------------------------+
|  Delete Your Account?                     |
|                                           |
|  This will permanently delete:           |
|  - All your closet items                  |
|  - All saved outfits                      |
|  - Your style profile                     |
|  - Account and login access               |
|                                           |
|  This action cannot be undone.            |
|                                           |
|  [Cancel]              [Delete Account]   |
+-------------------------------------------+
```

**Post-Deletion**:

- Navigate to app launch
- Show "Account deleted" confirmation
- All local data cleared

---

## Style Profile State Machine

```
[Profile Tab Active]
        |
        v
[Check: Item Count >= 5?]
        |
        +-- NO --> [Style DNA Locked]
        |               |
        |               v
        |         [Show Progress]
        |               |
        |               +-- (items reach 5)
        |                       |
        |                       v
        |                 [Unlock Animation]
        |                       |
        |                       v
        +----------------------+
        |
        +-- YES --> [Style DNA Unlocked]
        |               |
        |               v
        |         [Show All Sections]
        |               |
        |               +-- [Nudge Available?]
        |               |           |
        |               |           +-- YES --> [Show Nudge]
        |               |           |
        |               |           +-- NO --> [No Nudge]
        |               |
        |               +-- [Style Clusters?]
        |                       |
        |                       +-- YES --> [Show Clusters]
        |                       |
        |                       +-- NO --> [Hidden]
        |
        v
[Data & Privacy Section]
        |
        +-- [Export] --> [Export Flow]
        +-- [Delete] --> [Delete Flow]
```

---

## Key UX Decisions

| Decision                           | Rationale                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------- |
| 5-item unlock threshold            | Enough data for meaningful insights without overwhelming first-time users |
| One nudge per session              | Over-nudging destroys trust faster than no nudging                        |
| Progressive cluster reveal         | 10 items + 3 outfits = sufficient outfit history for clustering           |
| Data export before delete          | Industry best practice; user's right to their data                        |
| 30-day deletion window             | Safety net for accidental deletions                                       |
| Style DNA visualized not just data | Visual presentation increases engagement with insights                    |
