# Closet UI — Detailed Specification

**Domain**: UI
**Authority**: This spec is the authority on all Closet grid behavior. Read before implementing or modifying any Closet UI component.
**Last Updated**: 2026-04-17

---

## 1. Overview

The Closet grid is the primary browsing surface of the app — a visual-first display of all wardrobe items. It is the default tab on app launch and the most frequently visited screen. The grid provides direct visual access to items, inline filtering, and progressive tag disclosure without requiring users to open item details.

**Designation**: Visual browsing + semantic filtering surface

**Core responsibilities**:

- Display all wardrobe items as visual thumbnails in a 3-column grid
- Filter by category, color, occasion, formality, and pattern
- Sort by recency, color, or category
- Provide lightweight semantic search within the grid
- Support item card interactions: tap (reveal tags), long-press (actions)
- Guide empty-state users through onboarding

---

## 2. Grid Layout

### 2.1 Column and Cell Specification

**3-column grid** on phones; **4-column grid** on tablets.

```
+---+---+---+
|   |   |   |   ← Row 1
+---+---+---+
|   |   |   |   ← Row 2
+---+---+---+
|   |   |   |   ← Row 3
+---+---+---+
```

**Cell dimensions (phone)**:

- Cell width: floor((screen_width - 16px padding) / 3) ≈ 120px at 390px screen width
- Cell height: square (equal to cell width)
- Gap between cells: 4px
- Grid padding: 8px horizontal

**Cell dimensions (tablet)**:

- Cell width: floor((screen_width - 32px padding) / 4) ≈ 180px at 1024px screen width
- Cell height: square
- Gap between cells: 6px
- Grid padding: 16px horizontal

**Why 3 columns**: Wardrobe items are photographed flat or on hangers — they tend to be taller than wide. Three columns at phone width gives ~120px per cell, enough to visually distinguish a top from a bottom from a dress. Two columns wastes horizontal space; four columns makes items too small to identify at a glance.

### 2.2 Grid Structure

```
+-------------------------------------------+
|  [magnifier icon] Search your closet...   |  ← Search bar (semantic search)
+-------------------------------------------+
|  All | Tops | Bottoms | Dresses | Outer  |  ← Category filter (horizontal scroll)
|  [color v] [occasion v] [formality ---v]  |  ← Advanced filter bar (horizontal scroll)
+-------------------------------------------+
|  +---+ +---+ +---+                        |
|  |   | |   | |   |                        |  ← Item grid (scrollable)
|  +---+ +---+ +---+                        |
|  |   | |   | |   |                        |
|  +---+ +---+ +---+                        |
|  |   | |   | |   |                        |
|  +---+ +---+ +---+                        |
+-------------------------------------------+
|                                           |
|  [+ FAB - floating action button]         |  ← Camera shortcut (bottom right)
|                                           |
+-------------------------------------------+
```

**Grid scroll**: Vertical scrolling within the grid zone. The filter bar is sticky (does not scroll away).

---

## 3. Item Card States

The item card has three distinct states with progressive disclosure of information.

### 3.1 Default State (Thumbnail Only)

```
+---------+
|         |
|         |
|  [img]  |
|         |
|         |
+---------+
  Navy blouse
```

**Default state shows**:

- Square thumbnail photo (item photo fills the square)
- Primary label below image: color + category (e.g., "Navy blouse")
- No tags visible
- No borders or chrome

**Why thumbnail only by default**: Visual browsing requires minimal clutter. Users scan photos, not text. Tags are secondary and revealed on demand.

### 3.2 Tapped State (Tags Revealed)

When the user taps an item card, it transitions to the tags-revealed state:

```
+---------+
|         |
|  [img]  |
|         |
+---------+
  Navy blouse
  Tops / Solid
  Casual, Work
  Formality: 6
```

**Tags-revealed state shows**:

- Same thumbnail
- Full category name: "Tops"
- Pattern: "Solid"
- Occasions: "Casual, Work"
- Formality score: "6 / 10" with visual indicator

**Behavior**:

- Tapping the card again or tapping elsewhere collapses the tags
- Only one card can be in "tapped" state at a time — tapping a new card collapses the previous one
- Transition: 150ms ease-out, tags fade in below label

### 3.3 Long-Press State (Actions Revealed)

When the user long-presses an item card (300ms hold), the actions overlay appears:

```
+---------+
| [edit ] |
|  [img]  |
| [delete]|
+---------+
```

**Actions available**:

- **Edit**: Opens the Tag Review screen (same UI as post-capture tag editing)
- **Delete**: Confirms deletion, then removes from closet

**Behavior**:

- Long-press triggers a haptic feedback (if available)
- A semi-transparent action overlay appears over the thumbnail
- Edit and Delete are displayed as icon+label buttons stacked vertically
- Tapping outside or tapping a second time dismisses the overlay
- Long-press does NOT trigger the tapped (tags revealed) state

### 3.4 State Transition Summary

| Interaction               | Resulting State  | Transition                              |
| ------------------------- | ---------------- | --------------------------------------- |
| Tap                       | Tags revealed    | Default → Tapped (150ms fade-in tags)   |
| Tap again / tap elsewhere | Default          | Tapped → Default (150ms fade-out tags)  |
| Long-press (300ms)        | Actions revealed | Default → Long-Press (haptic + overlay) |
| Tap outside               | Default          | Long-Press → Default                    |

**Important**: Long-press does NOT activate the tags-revealed state. The two interaction models are orthogonal and independent.

---

## 4. Filter Bar

The filter bar sits above the grid as a sticky horizontal strip. It is always visible and provides immediate access to all filtering dimensions.

### 4.1 Filter Bar Layout

```
+-------------------------------------------+
|  [magnifier] Search your closet...         |  ← Search bar (full-width, top)
+-------------------------------------------+
|  All | Tops | Bottoms | Dresses | Outer | Shoes | Accessories  |  ← Category pills
+-------------------------------------------+
|  [color v]  [occasion v]  [formality |====]  [pattern v]   [sort v]  |  ← Secondary filters
+-------------------------------------------+
```

**Category pills**:

- "All" is always the first pill and is selected by default
- Active category: pill has filled background (amber/gold)
- Inactive category: pill has outline style
- Horizontal scroll if categories exceed screen width
- Tapping a category filters the grid to that category only

### 4.2 Secondary Filters

| Filter    | Type             | Options                                                                                                            |
| --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Color     | Dropdown / sheet | Visual color swatches (not text): Navy, Charcoal, Cream, Brown, Olive, Burgundy, Indigo, Black, White, Gold, Multi |
| Occasion  | Dropdown / sheet | Casual, Work, Formal, Party, Date, Athletic, Travel                                                                |
| Formality | Slider           | 1 (casual) to 10 (formal); single-thumb continuous slider                                                          |
| Pattern   | Dropdown / sheet | Solid, Striped, Plaid, Floral, Geometric, Abstract                                                                 |
| Sort      | Dropdown / sheet | Recently added (default), Most worn (future), Color grouped, Category grouped                                      |

**Formality slider behavior**:

- Range: 1–10
- Single thumb, continuous value
- On release, grid filters to items within ±1 of selected value
- Value label shown above thumb: "Formality: 6"
- Tapping a value on the slider sets it without needing to drag

### 4.3 Color Swatch Specification

Color filter uses visual swatches, not text:

```
+---+
|   |  ← Navy (#1a1a2e)
+---+
|   |  ← Charcoal (#36454f)
+---+
|   |  ← Cream (#fffdd0)
+---+
|   |  ← Brown (#654321)
+---+
  ...
```

- Each swatch: 28px × 28px circle
- Border: 2px solid transparent (default), 2px solid amber when selected
- Multi-color items show as a split circle or the dominant color

### 4.4 Active Filter State

When filters are active, the filter bar visually indicates this:

```
+-------------------------------------------+
|  [All]  [Tops*]  [Bottoms]  [Dresses]    |  ← Active category shown with asterisk or bold
+-------------------------------------------+
|  [× Navy] [× Work] [Formality: 6]  [Clear] |  ← Active filter chips
+-------------------------------------------+
```

**Active filter chips**:

- Each active filter (color, occasion, formality, pattern) shown as a chip with × remove button
- "Clear All" button appears when 2+ filters active
- Chips use amber/gold background
- Tapping × removes that individual filter

### 4.5 Filter Behavior

- Filters are applied immediately (no "Apply" button needed)
- Multiple filters within a dimension are OR (Navy OR Charcoal)
- Multiple filters across dimensions are AND (Tops AND Navy AND Work)
- Filters persist across app sessions (stored in local preferences)
- Empty filter state (no results): shown inline within grid, not a separate screen

---

## 5. Semantic Search Within Grid

The closet grid has a lightweight search bar at the top of the screen. This is distinct from the full Search tab but shares the same semantic search capability.

### 5.1 Search Bar

```
+-------------------------------------------+
|  [magnifier icon]  Search your closet... |
+-------------------------------------------+
```

- Placeholder: "Search your closet..."
- Always visible at the top of the closet screen
- Activating search (tapping) opens the keyboard
- Clearing search (× button) returns to filtered grid view

### 5.2 Search Behavior

**Type**: Semantic search using CLIP embeddings (not text matching)

This means:

- "warm cozy sweater" matches items tagged as sweaters + warm colors + knit textures
- "something blue" matches navy, royal blue, teal items
- "date night top" matches items with high formality (4-5) + occasion:date
- "rain-friendly" matches items with rain-resistant materials or covered footwear

**Implementation**: Query text is embedded via CLIP → cosine similarity search against all item embeddings in pgvector → results sorted by relevance score.

### 5.3 Search Results

```
+-------------------------------------------+
|  [< Back]  Search results for "warm..."  |
+-------------------------------------------+
|  +---+ +---+ +---+                        |
|  |   | |   | |   |                        |
|  +---+ +---+ +---+                        |
|  |   | |   | |   |                        |
|  +---+ +---+ +---+                        |
+-------------------------------------------+
|  Relevance: [sorted by similarity score]  |
+-------------------------------------------+
```

- Results replace the grid with relevance-ordered items
- "Back to all" button returns to the full filtered grid
- Match score is not displayed (too technical for users)
- Maximum 50 results displayed (paginated if more)

---

## 6. Empty Closet State

The empty closet state is a **critical onboarding moment**. It must be inviting, not intimidating. This is where new users understand the app's value proposition.

### 6.1 Empty State UI

```
+-------------------------------------------+
|                                           |
|                                           |
|           [illustration:                  |
|            an open closet                 |
|            with sparkle accent]           |
|                                           |
|           Your closet awaits              |
|                                           |
|    Photograph your clothes and I will     |
|    help you put together great outfits.   |
|                                           |
|    +------------------------------------+  |
|    |      + Add your first item          |  |
|    +------------------------------------+  |
|                                           |
|    or                                     |
|                                           |
|    [snap icon]  Snap a photo             |
|    [sparkle]    AI tags it instantly     |
|    [hanger]     Get styled               |
|                                           |
+-------------------------------------------+
```

### 6.2 Empty State Design Principles

1. **Single CTA**: One primary action button ("Add your first item"). Not multiple options.
2. **Value loop illustration**: Three-step visual (snap → AI tags → get styled) showing the complete workflow.
3. **No Magic Bar suggestions**: Suggestion chips do not appear (nothing to suggest from)
4. **Magic Bar rail visible but muted**: Rail shows "Add clothes to unlock style suggestions" in muted/grayed text
5. **No pressure**: No "start from scratch" language; no intimidating empty shelf imagery

### 6.3 First Item Added (Transition State)

When the first item is added during onboarding, a brief celebration state appears before returning to the grid:

```
+-------------------------------------------+
|                                           |
|   [sparkle animation]                    |
|                                           |
|   Your first item added!                  |
|   "Navy silk blouse"                     |
|                                           |
|   Keep adding to unlock outfit magic.     |
|                                           |
|                   [Continue]              |
|                                           |
+-------------------------------------------+
```

This state:

- Appears for 2 seconds after first item save
- Shows item thumbnail + name
- Auto-dismisses and shows closet grid

---

## 7. Sort Options

Sort is accessible via a dropdown in the secondary filter bar:

```
+-------------------------------------------+
|  ... [formality ---] [pattern v] [sort v] |
+-------------------------------------------+
```

**Sort options**:

| Option           | Description                                         | Default? |
| ---------------- | --------------------------------------------------- | -------- |
| Recently added   | Newest items first (by createdAt desc)              | YES      |
| Most worn        | Items with highest timesWorn first (future feature) | No       |
| Color grouped    | Group by dominant color, alphabetical within        | No       |
| Category grouped | Group by category, alphabetical within              | No       |
| Least worn       | Items with 0 or lowest timesWorn (future)           | No       |

**Sort persistence**: Sort preference persists across sessions (stored in local preferences), but does not persist across devices (not synced to Supabase account).

---

## 8. Progressive Disclosure for Tags

Tags follow a progressive disclosure model — shown incrementally as the user engages.

### 8.1 Disclosure Levels

| Level | Information Shown                                         | Trigger                   |
| ----- | --------------------------------------------------------- | ------------------------- |
| 0     | Thumbnail + primary label (color + category)              | Default state             |
| 1     | All tags (category, color, pattern, occasions, formality) | Tap card                  |
| 2     | Usage stats, notes, brand                                 | Open item detail (future) |

### 8.2 Tag Display Format

When tags are revealed (Level 1):

```
Primary label:   "Navy blouse" (color + category, always shown)
Category:        "Tops"
Pattern:         "Solid"
Occasions:       "Casual, Work"
Formality:       [=====|=====] 6/10
```

**Formality visual indicator**: A 10-segment bar with the score filled:

- Segments 1–3: filled = casual (charcoal gray)
- Segments 4–6: filled = business casual (muted blue)
- Segments 7–10: filled = formal (amber/gold)

This allows quick visual scanning of formality without reading the number.

---

## 9. Item Detail (Future)

Item detail view is accessed from the tapped state via an explicit "View details" link or by swiping up on the tapped card. This spec does not cover item detail — it is deferred to a future specification.

---

## 10. Grid + Magic Bar Interaction

The closet grid and Magic Bar coexist on the same screen:

```
+-------------------------------------------+
|  [Closet screen with grid visible]        |
|                                           |
|  +---+ +---+ +---+                        |
|  |   | |   | |   |                        |
|  +---+ +---+ +---+                        |
|                                           |
+-------------------------------------------+
|  [sparkle] "What are you dressing for?"   |  ← Magic Bar rail
+-------------------------------------------+
|  [Closet] [Style] [Camera] [Search] [Me]  |  ← Tab bar
+-------------------------------------------+
```

**Interaction rules**:

- Scrolling the grid does NOT affect the Magic Bar rail (rail is sticky above tab bar)
- Magic Bar expansion does NOT hide the grid — it presents as an overlay
- Submitting a Magic Bar prompt replaces the grid content with outfit cards
- Returning from outfit results restores the grid in its previous filter/sort state

---

## 11. Floating Action Button (FAB)

A floating action button appears at the bottom-right of the closet grid (above the Magic Bar rail):

```
+-------------------------------------------+
|  +---+                                   |
|  |   |                                   |
|  | + |  ← FAB (bottom-right)              |
|  |   |                                   |
+-------------------------------------------+
```

- Icon: camera + icon or simple "+"
- Action: Opens camera flow (same as Camera tab)
- Visibility: Shown when grid has 1+ items
- Behavior: Single tap opens camera, does not require long-press
- Position: 16px from right edge, 16px above Magic Bar rail

---

## 12. Component Inventory

| Component             | States                                                                            |
| --------------------- | --------------------------------------------------------------------------------- |
| Item Card             | Default (thumbnail + label), Tapped (tags revealed), Long-Press (actions overlay) |
| Category Filter Pills | Default (outline), Active (filled), Disabled                                      |
| Color Swatch          | Default (no border), Selected (amber border), Disabled (grayed)                   |
| Formality Slider      | Default, Active (dragging), Disabled                                              |
| Occasion Filter       | Default, Selected, Disabled                                                       |
| Pattern Filter        | Default, Selected, Disabled                                                       |
| Sort Dropdown         | Closed, Open, Option selected                                                     |
| Search Bar            | Empty, Active (keyboard open), Has text, Showing results                          |
| Empty Closet State    | No items, First item added (transition)                                           |
| FAB                   | Default, Pressed                                                                  |
| Active Filter Chips   | Default, Removable                                                                |

---

## 13. Screen Specifications Summary

| Element             | Specification                              |
| ------------------- | ------------------------------------------ |
| Grid columns        | 3-column (phone), 4-column (tablet)        |
| Cell size           | Square, floor((width - padding) / columns) |
| Cell gap            | 4px (phone), 6px (tablet)                  |
| Filter bar          | Sticky above grid                          |
| Primary label       | Color + category (e.g., "Navy blouse")     |
| Tag reveal          | On tap, 150ms fade-in                      |
| Long-press delay    | 300ms before action overlay                |
| Formality indicator | 10-segment bar, color-coded                |
| Search type         | CLIP semantic (not text matching)          |
| Empty state CTA     | Single "Add your first item" button        |
| FAB position        | 16px from right, 16px above Magic Bar rail |
