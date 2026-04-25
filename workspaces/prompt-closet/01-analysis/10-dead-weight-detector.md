# Dead Weight Detector -- Analysis

## Executive Summary

The dead weight detector flags wardrobe items not worn in 45 days and surfaces them via a "Neglected" badge on the closet grid and a weekly push notification. The critical ambiguity is the definition of "worn" -- current Phase 1 has no mechanism to confirm an item was actually worn. The 45-day threshold is aggressive for Indian occasion logic where festive items (Diwali saree, wedding sherwani) may be legitimately unworn for months. Push notification implementation requires EAS Build with custom dev client on Expo.

**Complexity: Moderate** -- UX subtlety (false positive "neglect" on seasonal items), push notification infrastructure complexity.

---

## 1. Feature Description

### What It Does

- Tracks the last worn date for each wardrobe item
- Flags items inactive for >45 days as "neglected"
- Displays "Neglected" badge on closet grid item cards
- Sends weekly push notification listing neglected items
- Provides actionable next steps: "Style it", "Archive it", "Donate it"

### User Journey

```
Item added → Last worn = created_at → [每天]
  ↓
After 45 days with no "worn today" signal
  → Item receives "Neglected" badge
  → Added to weekly notification list
  → Shown in Dead Weight Screen
  → User chooses: restyle / archive / donate / mark as worn
```

---

## 2. "Worn" Definition -- The Critical Ambiguity

### Current Assumption: Outfit Save = Wear

The Phase 2 brief implicitly assumes "user saved an outfit containing this item" = "item was worn". This is a **noisy proxy** for actual wear because:

1. Users save outfits for future reference without immediate intent to wear
2. Users save aspirational outfits they never actually wear
3. Users may wear an item without saving an outfit (e.g., quick出门 look)

### Signal Quality by User Action

| Action | Worn Signal Confidence | Notes |
|--------|----------------------|-------|
| Marked "worn today" explicitly | High | Direct confirmation |
| Outfit saved with item (casual) | Medium | Proxy but reasonable |
| Outfit saved with item (formal/festive) | Low | May be bookmarking |
| Item photographed on body (Mirror feature) | High | Visual confirmation |
| Item not in any saved outfit for 45 days | Low (for festive items) | False positive risk |

### Decision: Two-Tier Worn Definition

Implement both explicit and implicit signals:

```sql
ALTER TABLE wardrobe_items ADD COLUMN last_worn_at TIMESTAMPTZ;
ALTER TABLE wardrobe_items ADD COLUMN last_worn_source VARCHAR(20); -- 'explicit', 'outfit_save', 'photo'

-- Explicit "worn today" button on item detail
UPDATE wardrobe_items SET last_worn_at = NOW(), last_worn_source = 'explicit' WHERE id = ?;

-- Outfit save auto-update (only for casual/formal tags, NOT festive)
UPDATE wardrobe_items
SET last_worn_at = NOW(), last_worn_source = 'outfit_save'
WHERE id IN (SELECT item_id FROM item_in_outfit WHERE outfit_id = ?)
  AND item_id IN (
      SELECT wi.id FROM wardrobe_items wi
      JOIN ai_tags t ON t.item_id = wi.id
      WHERE t.occasions && ARRAY['casual', 'work', 'date']::VARCHAR[]
  );
```

**Key rule**: Festive items (Diwali, Wedding, Eid, Navratri) are EXCLUDED from outfit-save auto-update because saving a festive outfit is almost always bookmarking, not wearing.

---

## 3. 45-Day Threshold Analysis

### Current Brief: 45 Days is Fixed

This is **too aggressive** for Indian wardrobe patterns:

| Occasion | Typical Wear Frequency | Neglect Risk |
|----------|------------------------|--------------|
| Daily wear (casual tops, jeans) | 1-3x per week | 45 days = genuinely neglected |
| Work wear | 3-5x per week | 45 days = possibly traveling |
| Date night | 1-2x per month | 45 days = normal |
| Festive (Diwali saree) | 1x per year | 45 days = normal, NOT neglected |
| Wedding (sherwani) | 1x per 2-3 years | 45 days = NEVER neglected |
| Religious (temple wear) | 2-4x per month | 45 days = possibly traveling |

### Recommended: Occasion-Adjusted Thresholds

| Category | Neglect Threshold | Rationale |
|----------|------------------|----------|
| Casual / Daily | 30 days | High frequency; neglect is meaningful |
| Work / Professional | 45 days | Moderate frequency |
| Date / Social | 60 days | Lower frequency |
| Festive (Diwali, Navratri) | 180 days | Annual occasions |
| Wedding | 365 days | Bi-annual or less |
| Religious / Temple | 90 days | Monthly occasions |

```sql
-- Occasion-specific thresholds (in days)
CREATE TABLE neglect_thresholds (
    occasion_tag VARCHAR(50) PRIMARY KEY,
    threshold_days INT NOT NULL DEFAULT 45
);

INSERT INTO neglect_thresholds VALUES
    ('casual', 30),
    ('work', 45),
    ('date', 60),
    ('festive', 180),
    ('wedding', 365),
    ('religious', 90);
```

Items with multiple occasion tags use the **longest** applicable threshold (least aggressive flagging).

---

## 4. UX for Neglected Items

### Badge Design

"Neglected" badge appears on closet grid card:
- Color: Muted amber/orange (warning, not error)
- Icon: hanger with subtle downwards arrow
- Tap action: Opens item detail with "last worn X days ago" + suggested actions

### Dedicated Dead Weight Screen

Accessed from closet tab → "Neglected Items" filter.

Layout:
```
[Header] "5 items haven't been worn in 45 days"
[Filter chips] All | Restyle | Archive | Donate

[Grid of item cards with badges]
  [Item 1] Kurti -- last worn 52 days ago
           [Restyle] [Archive] [Donate]
  [Item 2] Jeans -- last worn 60 days ago
           ...
```

### Suggested Actions

| Action | Behavior |
|--------|----------|
| **Restyle** | Opens Magic Bar with that item as anchor; "Style this with..." |
| **Archive** | Moves to "Archived" section (hidden from main grid but not deleted) |
| **Mark as worn** | Explicit "worn today" confirmation; clears badge |
| **Donate** | Marks as donated (removes from closet); optional: log to donation tracking |
| **This is wrong** | Reports false positive; adjusts threshold for this item's occasion |

### Notification Content Strategy

Generic: "5 items haven't been worn in 45 days" -- high ignore/dismiss rate.

**Better**: Personalized with specific item + occasion context:

```
"Your blue kurti (worn last in March) hasn't been styled recently.
  Diwali season coming up -- want to restyle it with a new look?"
```

Context-aware notifications require:
1. Item name (from `wardrobe_items.name`)
2. Last worn date
3. Upcoming occasion from calendar (if available)
4. Season context (monsoon, summer, festive)

---

## 5. Push Notification Architecture

### Expo Notifications Setup

```typescript
// app/(tabs)/_layout.tsx
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});
```

### Weekly Notification Scheduling

```typescript
import * as Crypto from 'expo-crypto';

// Trigger weekly: every Sunday 10am
await Notifications.scheduleNotificationAsync({
  content: {
    title: "Your Weekly Wardrobe Report",
    body: `${neglectedCount} items haven't been worn recently. Tap to restyle or archive.`,
    data: { screen: 'DeadWeight', count: neglectedCount },
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: 1,  // Sunday
    hour: 10,
    minute: 0,
  },
});
```

### EAS Build Requirement

**expo-notifications** with custom icon/badge requires EAS Build for:
- Custom push notification icon (Android adaptive icon)
- Custom notification sound
- Background notification handling

**For development**: `expo start --dev-client` works with `expo-notifications` in Expo Go for basic testing.

**For production**: EAS Build mandatory.

```
eas build --platform android --profile preview
eas build --platform ios --profile preview  # requires Apple Developer account
```

### Notification Payload (Supabase Edge Function)

```typescript
interface DeadWeightNotification {
  user_id: string;
  item_count: number;
  items: Array<{
    item_id: string;
    item_name: string;
    days_since_worn: number;
    thumbnail_url: string;
  }>;
  top_occasion: string; // for personalization
}
```

---

## 6. Notification Fatigue Mitigation

### Problem

Weekly push for neglected items will be ignored if:
- No items are neglected (negative signal -- app always notifies even with 0 items)
- Items are flagged incorrectly (festive false positives)
- User has already seen them in-app

### Mitigation Rules

1. **Only notify if `neglected_count >= 3`**: Do not notify for 1-2 items (user can see in-app)
2. **Respect quiet hours**: Do not send between 9pm-8am user local time
3. **Deduplicate**: If user already opened Dead Weight screen this week, skip notification
4. **Limit to 1 notification per category per month**: Not every week -- rotate between "neglected", "style suggestion", "outfit of the week"
5. **Negative feedback loop**: If user dismisses notification 3x consecutively, auto-pause for 30 days

```typescript
// Supabase Edge Function: should_send_notification
const { data: userSettings } = await supabase
  .from('user_notification_settings')
  .select('dead_weight_enabled, quiet_hours_start, quiet_hours_end, paused_until')
  .eq('user_id', userId)
  .single();

if (!userSettings.dead_weight_enabled) return false;
if (userSettings.paused_until && new Date(userSettings.paused_until) > new Date()) return false;

// Check quiet hours
const userHour = new Date().getHours();
if (userHour >= userSettings.quiet_hours_start || userHour < userSettings.quiet_hours_end) return false;

// Check if already seen this week
const { data: seenThisWeek } = await supabase
  .from('notification_seen')
  .select('id')
  .eq('user_id', userId)
  .eq('type', 'dead_weight')
  .gte('created_at', getStartOfWeek());

if (seenThisWeek.length > 0) return false;
```

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Festive items incorrectly flagged as neglected | High | High | Occasion-adjusted thresholds (180/365 days); exclude festive from outfit-save auto-worn |
| User receives notification for 0-1 items (noise) | Medium | Medium | Threshold: only notify when neglected >= 3 items |
| Push notification permission denied | High | Low | In-app notification badge as fallback; prompt once on first dead weight detection |
| Notification fatigue -> permanent disable | Medium | Medium | Context-aware content, deduplication, negative feedback pause |
| "Worn" signal false positive (saved but not worn) | High | Medium | Explicit "worn today" button; festive exclusion from outfit-save update |
| EAS Build complexity underestimated | Medium | Medium | Reserve 1-2 days for build troubleshooting; Expo Go acceptable for internal testing |
| Performance: weekly notification job on large user base | Low | Medium | pg_cron scheduled function; batch notification payload; Supabase free tier limits |

---

## 8. Implementation Roadmap

### Phase 2A: Schema + Worn Tracking (Week 1-2)
1. Add `last_worn_at` and `last_worn_source` columns to `wardrobe_items`
2. Implement explicit "worn today" button on item detail
3. Wire outfit save to auto-update `last_worn_at` (casual/work only, not festive)
4. Add `neglect_thresholds` reference table
5. SQL query for neglected items with occasion-adjusted thresholds

### Phase 2B: Badge + Dead Weight Screen (Week 3-4)
1. "Neglected" badge component on closet grid card
2. Filter: "Neglected Items" on closet screen
3. Dead Weight Screen with item cards and suggested actions (Restyle / Archive / Donate)
4. Archive and Donate flows

### Phase 2C: Push Notifications (Week 5-6)
1. Expo notifications setup with EAS Build
2. Weekly `pg_cron` scheduled function to compute neglected items
3. Supabase Edge Function to send batch notifications
4. User notification settings (enable/disable, quiet hours, pause)
5. A/B test: contextual notification vs generic notification

---

## 9. Cross-Reference Audit

| Document | Finding |
|----------|---------|
| `briefs/02-phase2-ml-expansion.md` | Specifies "45 days" fixed threshold and weekly push; does not address festive item false positive |
| `02-phase2-ml-expansion.md` | Lists push notification as Expo feature but does not note EAS Build requirement |
| `ml-evaluation.md` | Dead weight detector is not an ML feature; purely heuristic/rule-based; no MGMT 655 relevance |
| `04-ml-technique-gaps.md` | Dead weight not discussed; this analysis fills that gap |

---

## 10. Success Criteria

- [ ] `last_worn_at` populated for all items (backfilled from `created_at`)
- [ ] Explicit "worn today" button clears "Neglected" badge
- [ ] "Neglected" badge appears on closet grid for items exceeding occasion-adjusted thresholds
- [ ] Dead Weight Screen shows ≤10% false positive rate (user-reported via "This is wrong" feedback)
- [ ] Weekly notification sent only when `neglected_count >= 3` and user has not dismissed in last 30 days
- [ ] Push notification permission request: >60% opt-in rate
- [ ] EAS Build successful for both iOS and Android
