# Closet Browsing Flow

**Phase**: User Flows
**Date**: 2026-04-17
**Product**: Prompt Closet

---

## Flow Overview

Closet grid browsing, filtering, search, and item detail interactions for wardrobe management.

---

## Screen: Closet Grid (Default View)

### Visual Layout

```
+-------------------------------------------+
| [search icon] Search your closet...       |
+-------------------------------------------+
| All | Tops | Bottoms | Dresses | Outer... |
| [color v] [occasion v] [formality ---v-] |
+-------------------------------------------+
|  +---+---+---+                            |
|  |   |   |   |  <- 3-column grid          |
|  +---+---+---+     square thumbnails      |
|  |   |   |   |                           |
|  +---+---+---+                           |
|  |   |   |   |                           |
|  +---+---+---+                           |
|                                           |
|                                           |
|                         [+ FAB]           |
+-------------------------------------------+
|  Magic Bar rail (above tab bar)          |
+-------------------------------------------+
|  Closet | Style | Camera | Search | Me    |
+-------------------------------------------+
```

### Grid Specifications

- **Columns**: 3 columns on phones, 4 columns on tablets
- **Cell aspect ratio**: 1:1 (square)
- **Thumbnail**: Optimized image from Supabase Storage
- **Spacing**: 4px gap between cells

### Item Card States

**Default (Thumbnail Only)**:

```
+---------+
|         |
|  [img]  |
|         |
+---------+
  Navy blouse
```

**Tapped (Tags Revealed)**:

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

**Long-Press (Actions)**:

```
+---------+
| [edit]  |
|  [img]  |
| [delete]|
+---------+
```

### Filter Bar

**Horizontal scroll** below search bar:

| Filter    | Type                 | Options                                                    |
| --------- | -------------------- | ---------------------------------------------------------- |
| Category  | Chip (single select) | All, Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories |
| Color     | Dropdown/modal       | Color swatches (visual, not text)                          |
| Occasion  | Multi-select         | Casual, Work, Formal, Party, Date, Athletic, Travel        |
| Formality | Slider               | 1-10 range                                                 |
| Pattern   | Chip                 | Solid, Striped, Plaid, Floral, Geometric, Abstract         |

### Active Filter State

When filters are active:

- Selected filters show as chips above grid
- Each chip has (x) to remove
- "Clear all" button appears when 2+ filters active
- Grid updates immediately on filter change

### Sort Options

Accessible via sort icon or "Sort" chip:

| Option           | Behavior                         |
| ---------------- | -------------------------------- |
| Recently added   | Newest first (default)           |
| Most worn        | Highest timesWorn first (future) |
| Color grouped    | Color palette order              |
| Category grouped | Category alphabetized            |

---

## Entry Points to Closet

| Entry Point           | Context                          | Returns To |
| --------------------- | -------------------------------- | ---------- |
| App launch            | User logged in, closet has items | Closet tab |
| Camera save           | Item just added                  | Closet tab |
| Tab bar               | Any screen                       | Closet tab |
| Back from Item Detail | After viewing detail             | Closet tab |

---

## Interactions

### Tap Item Card

**Behavior**: Progressive disclosure - tags revealed below thumbnail

**Animation**: Tags slide down (200ms ease-out)

**Second Tap**: Tags hide

### Long-Press Item Card

**Behavior**: Show action menu overlay

**Actions Available**:

- Edit tags
- Delete item
- Add to outfit (from Magic Bar context)

**Animation**: Scale down to 0.95 on touch, action sheet slides up

### Semantic Search

**Entry**: Tap search bar OR Search tab

**Behavior**:

- Text input triggers semantic search (CLIP embeddings)
- Results match meaning, not just keywords
- "warm cozy sweater" matches warm colors + knit textures
- "something blue" matches navy, royal, teal items

**Results Display**:

- Replaces grid with relevance-ordered items
- "Back to all" button to clear search
- Relevance indicator optional (dot intensity or % match)

**Empty Results**:

- "No items match 'warm cozy sweater'"
- Suggestions: "Try 'sweater', 'casual', or add more items"

---

## Screen: Item Detail View

### Entry Point

Tap item thumbnail from grid (not tag reveal)

### Visual Layout

```
+-------------------------------------------+
| [back]     Navy Silk Blouse       [edit]  |
+-------------------------------------------+
|                                           |
|  +------------------------------------+  |
|  |                                    |  |
|  |                                    |  |
|  |         [full-size image]          |  |
|  |                                    |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                           |
|  Category     Tops                       |
|  Color        Navy                       |
|  Pattern      Solid                      |
|  Occasions    Casual, Work                |
|  Formality    6 / 10                     |
|                                           |
|  Added        April 15, 2026             |
|  Times worn   3                          |
|  Last worn    April 10, 2026             |
|                                           |
|  +------------------------------------+  |
|  |  Delete Item                       |  |
|  +------------------------------------+  |
+-------------------------------------------+
```

### Elements

**Image**:

- Full-width display
- Pinch to zoom
- Swipe left/right to see multiple photos (if available)

**Tag Display**:

- All tags shown (category, color, pattern, occasion, formality)
- Wear history (if tracked)

**Actions**:

- Edit button -> Tag Editor modal
- Delete button -> Confirm dialog

### Edit Mode

**Trigger**: Tap "Edit" button

**Behavior**: Inline editing with same tag fields as Tag Review screen

---

## Screen: Tag Editor Modal

### Entry Point

Edit button from Item Detail or long-press action menu

### Visual Layout

Same as Tag Review screen but:

- Pre-populated with existing tags
- Single item context
- "Save Changes" / "Cancel" buttons

---

## Screen: Delete Confirmation

### Entry Point

Delete from long-press menu or Item Detail

### Dialog

```
+-------------------------------------------+
|  Delete Navy Silk Blouse?                 |
|                                           |
|  This will remove the item from your      |
|  closet and all outfits. This action     |
|  cannot be undone.                        |
|                                           |
|  [Cancel]              [Delete]          |
+-------------------------------------------+
```

### States

| State      | Behavior                                                     |
| ---------- | ------------------------------------------------------------ |
| Default    | Delete button is destructive red                             |
| Confirming | Brief loading spinner                                        |
| Deleted    | Dialog dismisses, item removed from grid with fade animation |

---

## Screen: Empty Closet State

### Visual Layout

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

### Magic Bar State

Rail visible but disabled: "Add clothes to unlock style suggestions"

### Entry Points from Empty State

1. "Add your first item" CTA -> Camera flow
2. Camera tab -> Camera flow
3. FAB (if visible) -> Camera flow

---

## Filter Flow Detail

### Category Filter

**Type**: Single-select chip group

**Behavior**:

- Tap chip to select (deselects previous)
- Tap "All" to clear category filter
- Grid updates immediately

### Color Filter

**Type**: Modal with color swatches

**Behavior**:

- Tap swatch to toggle
- Multiple colors can be selected
- "Apply" button to confirm
- "Clear" to reset

### Occasion Filter

**Type**: Multi-select chip group

**Behavior**:

- Tap chip to toggle on/off
- Multiple occasions = OR logic (matches any)
- All deselected = no occasion filter

### Formality Filter

**Type**: Range slider

**Behavior**:

- Dual handles for min/max range
- Or single handle for exact match
- Updates in real-time

### Pattern Filter

**Type**: Single-select chip group

**Behavior**: Same as Category

---

## Search Flow Detail

### Search Bar Behavior

```
+-------------------------------------------+
| [magnifier] Search your closet...         |
+-------------------------------------------+
```

**States**:
| State | Visual | Behavior |
|-------|--------|----------|
| Empty | Placeholder visible | - |
| Typing | Text shown | Live suggestions |
| Results | Grid replaced | Relevance ordered |
| No results | Empty state | Suggestions shown |

### Search Suggestions (Type-Ahead)

- Shows recent searches
- Shows semantic matches as user types
- "Search for 'blue top'" suggestion

### Voice Search

**Trigger**: Mic icon in search bar

**Behavior**: Same as Magic Bar voice input

---

## State Summary

| State          | Trigger                                          | Grid Display                |
| -------------- | ------------------------------------------------ | --------------------------- |
| Default        | No filters                                       | All items, recently added   |
| Filtered       | Category/Color/Occasion/Pattern/Formality active | Matching items only         |
| Sorted         | Sort option selected                             | Items in sort order         |
| Searching      | Search bar active                                | Search results              |
| Empty filtered | Filters match nothing                            | Empty state + clear filters |

---

## Flow Summary Diagram

```
[Closet Tab Active]
        |
        v
[Closet Grid - Default]
        |
        +-- [Tap item] --> [Tags Revealed]
        |                       |
        |                       +-- [Tap again] --> [Tags Hidden]
        |
        +-- [Long-press] --> [Action Menu]
        |                       |
        |                       +-- [Edit] --> [Tag Editor]
        |                       +-- [Delete] --> [Confirm Dialog]
        |                       +-- [Add to Outfit] --> [Magic Bar]
        |
        +-- [Filter chips] --> [Filters Active]
        |                       |
        |                       +-- [Clear] --> [Default]
        |
        +-- [Search bar] --> [Semantic Search]
        |                       |
        |                       +-- [Results] --> [Back to All]
        |                       +-- [No Results] --> [Suggestions]
        |
        +-- [Sort] --> [Sort Options]
        |               |
        |               +-- [Select] --> [Sorted Grid]
        |
        +-- [FAB] --> [Camera Flow]
```

---

## Key UX Decisions

| Decision                      | Rationale                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| 3-column grid                 | Wardrobe photos are vertical; 3 cols at 390px = 120px cells, enough to distinguish items |
| Progressive disclosure on tap | Thumbnail browsing is visual-first; tags are secondary                                   |
| Long-press for actions        | Actions are destructive/irreversible; gesture requires intention                         |
| Semantic search not keyword   | CLIP embeddings find "warm cozy sweater" not just text matches                           |
| OR logic for multi-select     | "Casual OR Work" is more useful than AND                                                 |
| Filter chips above grid       | Keeps filters visible while scrolling                                                    |
