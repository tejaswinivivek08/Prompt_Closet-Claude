# Camera Capture Flow

**Phase**: User Flows
**Date**: 2026-04-17
**Product**: Prompt Closet

---

## Flow Overview

Photo and image capture flow for adding wardrobe items to the closet. Covers single-item camera capture, gallery multi-select batch upload, AI tagging review, and save confirmation.

---

## Entry Points

| Entry Point           | Trigger                    | Context                   |
| --------------------- | -------------------------- | ------------------------- |
| Camera tab            | Tab bar tap                | Default camera viewfinder |
| FAB on Closet         | Tap floating action button | Opens camera directly     |
| Empty Closet CTA      | "Add your first item" tap  | First-time user setup     |
| Magic Bar empty state | "Take me to Camera" tap    | Empty closet nudge        |

---

## Screen: Camera Viewfinder

### Visual Layout

```
+-------------------------------------------+
| [flash off]              [gallery toggle] |
|                                           |
|                                           |
|                                           |
|              [viewfinder]                  |
|           (camera preview)                 |
|                                           |
|                                           |
|                                           |
| [gallery thumb]              [capture btn] |
|                              (large circle)|
+-------------------------------------------+
|  Magic Bar rail visible above tab bar     |
+-------------------------------------------+
|  Closet | Style | Camera | Search | Me    |
+-------------------------------------------+
```

### Elements

**Header Bar**:

- Flash toggle (off/on/auto) - left side
- Gallery toggle button - right side
- Tap either to toggle mode

**Viewfinder**:

- Full-screen camera preview
- Subtle grid overlay (rule of thirds) - optional
- Focus indicator (yellow square) on tap-to-focus

**Bottom Controls**:

- Gallery thumbnail (last photo or 0) - bottom left
- Large circular capture button - bottom center
- Mode indicator text (optional: "Single" badge)

**Gallery Toggle**:

- When tapped, switches to gallery picker (see Gallery Multi-Select section)

### States

| State              | Visual                 | Behavior               |
| ------------------ | ---------------------- | ---------------------- |
| Active             | Live camera preview    | Capture button enabled |
| Flash firing       | Brief white overlay    | 100ms flash effect     |
| Processing         | Capture btn -> spinner | Waiting for photo      |
| Permissions denied | Gray screen + prompt   | "Enable Camera" button |
| Low light          | Night mode icon        | Auto flash suggestion  |

### Interactions

1. **Tap capture button** -> Take photo, advance to Tag Review
2. **Tap gallery thumbnail** -> Switch to gallery picker
3. **Tap gallery toggle** -> Switch to gallery picker
4. **Tap flash toggle** -> Cycle: off -> on -> auto -> off
5. **Tap viewfinder** -> Show focus indicator at tap point
6. **Pinch** -> Zoom camera (if supported)

**Error Handling**:

- Camera unavailable: "Camera not available. Try using gallery instead." + gallery shortcut
- Storage full: "Not enough storage to take photos" + gallery shortcut

---

## Screen: Gallery Multi-Select (Batch Upload)

### Entry Point

Tap gallery toggle or gallery thumbnail on Camera screen

### Visual Layout

```
+-------------------------------------------+
| [x]  Select Photos (3/10)    [Continue]  |
+-------------------------------------------+
|  +---+---+---+                           |
|  | + | + |   |                          |
|  +---+---+---+    <- grid of photos      |
|  |   |   | + |       checkmarks =        |
|  +---+---+---+       selected            |
|  | + |   |   |                          |
|  +---+---+---+                           |
|                                           |
|                                           |
|                                           |
|  [camera toggle]                          |
+-------------------------------------------+
```

### Elements

**Header**:

- Close button (x) - top left
- Title "Select Photos (N/10)" - center
- Continue button - top right (disabled until 1+ selected)

**Grid**:

- 3-column photo grid
- Last row may be partial
- Select up to 10 photos

**Photo Cells**:

- Thumbnail image
- Checkmark overlay when selected
- Selection order number (1, 2, 3...) when selected

**Footer**:

- Camera toggle button to return to viewfinder

### States

| State              | Behavior                                     |
| ------------------ | -------------------------------------------- |
| 0 selected         | Continue button disabled                     |
| 1-9 selected       | Continue enabled, counter updates            |
| 10 selected        | "Maximum 10 photos" toast on additional taps |
| Loading thumbnails | Skeleton placeholders                        |

### Interactions

1. **Tap photo** -> Toggle selection (add/remove)
2. **Tap Continue** -> Begin batch processing
3. **Tap camera toggle** -> Return to viewfinder (selections preserved)
4. **Tap x** -> Discard selections, return to previous state

---

## Screen: Tag Review (Single Item)

### Entry Point

Photo captured from camera OR single photo tapped from gallery

### Visual Layout

```
+-------------------------------------------+
| [x cancel]     Review Tags      [Save]   |
+-------------------------------------------+
|                                           |
|  +------------------------------------+  |
|  |                                    |  |
|  |         [captured photo]           |  |
|  |                                    |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                           |
|  Analyzing...                             |
|  [Category]    [Tops              v]    |
|  [Color]       [Navy              v]    |
|  [Pattern]     [Solid             v]    |
|  [Occasion]    [Casual, Work      v]    |
|  [Formality]   [=====|====]  6/10      |
|                                           |
|  +------------------------------------+  |
|  |  [Retake]                          |  |
|  +------------------------------------+  |
|                                           |
+-------------------------------------------+
```

### Tag Display States

**Loading (AI Processing)**:

- "Analyzing..." text with animated dots
- Tags show skeleton loaders
- 3-6 second expected wait

**Tags Loaded**:

- Each tag shows AI-suggested value
- Dropdown/chip selector for each field
- Confidence indicator (optional: percentage)

**Editable Fields**:

| Field     | Type                    | Options                                                                                  |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| Category  | Dropdown                | Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories, Full Body                         |
| Color     | Dropdown + color swatch | Navy, Charcoal, Cream, Brown, Burgundy, Indigo, White, Black, Olive, Gold, Silver, Multi |
| Pattern   | Dropdown                | Solid, Striped, Plaid, Floral, Geometric, Abstract                                       |
| Occasion  | Multi-select chips      | Casual, Work, Formal, Party, Date, Athletic, Travel                                      |
| Formality | Slider (1-10)           | 1=very casual, 10=very formal                                                            |

### Interactions

1. **Tap tag dropdown** -> Open selector for that tag
2. **Tap chip (Occasion)** -> Toggle selection
3. **Drag formality slider** -> Adjust formality score
4. **Tap Retake** -> Return to camera with same context
5. **Tap Save** -> Save item, animate to closet grid
6. **Tap Cancel (x)** -> Confirm discard, return to previous screen

**Validation**:

- Category required (must select one)
- All other fields optional but recommended
- If no category: "Please select a category" inline error

### Error States

| Error             | UI Response                                                                    |
| ----------------- | ------------------------------------------------------------------------------ |
| AI tagging failed | "Couldn't analyze this photo. Edit tags manually or try again." + Retry button |
| Upload failed     | "Upload failed. Check connection." + Retry button                              |
| Network error     | "No connection. Tags saved locally - will sync when online."                   |

---

## Screen: Tag Review (Batch Mode)

### Entry Point

Continue tapped after selecting multiple photos in gallery

### Visual Layout

```
+-------------------------------------------+
| [x]  Tagging Items (1 of 3)     [Save All]|
+-------------------------------------------+
|  +---+  Navy Silk Blouse                  |
|  |img|  Tops / Solid / Navy               |
|  +---+  [edit]                             |
|----------                                  |
|  +---+  Charcoal Wool Trousers             |
|  |img|  Bottoms / Solid / Charcoal        |
|  +---+  [edit]                             |
|----------                                  |
|  +---+  Cream Cashmere Sweater             |
|  |img|  Outerwear / Solid / Cream         |
|  +---+  [edit]                             |
|                                           |
|  [cancel batch]        [Save All (3)]     |
+-------------------------------------------+
```

### Batch Processing States

**Processing (Item N of Total)**:

- Progress indicator: "Tagging 1 of 3..."
- Currently processing item shows skeleton loader
- Completed items show AI-suggested tags
- User can edit any item before saving

**All Items Processed**:

- "All items tagged!" success state
- "Save All" button enabled
- Each item expandable for review

**Partial Failure**:

- Failed items marked with red indicator
- "Retry failed" button available
- User can save successful items and retry later

### Interactions

1. **Tap item row** -> Expand to show full tag editor
2. **Tap edit** -> Open tag editor for that item
3. **Tap Save All** -> Save all items, show confirmation
4. **Tap cancel batch** -> Confirm dialog -> discard all, return to gallery
5. **Tap Retry** (on failed items) -> Re-process failed item

### Progress Indicator

```
"Tagging 3 of 8..."

Progress bar: [====--------] 3/8

Each item appears in the list as it finishes:
+  Navy Blouse       - done
+  Charcoal Trousers - done
-  Cream Sweater     - processing
?  Brown Boots       - pending
...
```

---

## Screen: Save Confirmation

### Single Item Save

**Trigger**: "Save" tapped on single item review

**Animation Sequence** (300ms total):

1. Tag review screen slides down
2. Closet grid fades in
3. New item card scales up from 0.8 to 1.0 with bounce
4. Brief "Saved!" toast in bottom-left

**Navigation**: Auto-navigate to Closet grid after 500ms

### Batch Save

**Trigger**: "Save All" tapped on batch review

**Animation Sequence**:

1. Progress: "Saving 3 items..."
2. Items appear in closet grid one by one (staggered 200ms)
3. "All saved!" toast
4. Continue button returns to previous context

---

## Error Handling Matrix

| Error                    | Screen         | User Message                                         | Action                 |
| ------------------------ | -------------- | ---------------------------------------------------- | ---------------------- |
| Camera permission denied | Camera         | "Camera access needed to photograph clothes"         | "Open Settings" button |
| Photos permission denied | Gallery        | "Enable photo access to import images"               | "Open Settings" button |
| AI tagging timeout       | Tag Review     | "Couldn't analyze. Try again or edit tags manually." | Retry / Manual Edit    |
| Upload failed            | Tag Review     | "Upload failed. Check your connection."              | Retry button           |
| Storage full             | Camera/Gallery | "Not enough storage space"                           | Gallery shortcut       |
| Session expired          | Any            | "Please log in again"                                | Navigate to Login      |

---

## Flow Summary Diagram

```
                    [Camera Entry Point]
                     (tab/FAB/CTA/empty state)
                            |
                            v
                    [Camera Viewfinder]
                            |
              +-------------+-------------+
              |                           |
         [Gallery Toggle]          [Capture Button]
              |                           |
              v                           v
        [Gallery Picker]           [Photo Captured]
              |                           |
              |                     [Processing]
              |                           |
              |                           v
         [Multi-Select]            [Tag Review]
         (1-10 photos)         (Single Item Review)
              |                           |
              |                           +-- [Retake] --> [Camera]
              |                           |
              |                           v
              |                     [Save] --> [Closet Grid]
              v
        [Batch Review]
         (Item list)
              |
              +-- [Edit item] --> [Tag Editor]
              |
              v
        [Save All]
              |
              v
        [Closet Grid]
         (all items)
```

---

## Key UX Decisions

| Decision              | Rationale                                              |
| --------------------- | ------------------------------------------------------ |
| Camera-first default  | Faster for single items; gallery always one tap away   |
| Batch limit 10        | Prevents overwhelming AI pipeline; reasonable for demo |
| Tag review required   | AI suggestions are starting point, not final truth     |
| Formality slider 1-10 | Intuitive scale for formality perception               |
| Retake available      | Allows fixing poor photo quality before saving         |
