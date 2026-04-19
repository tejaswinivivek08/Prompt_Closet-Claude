/**
 * Dead Weight Detector Service
 *
 * Flags wardrobe items not worn in 45+ days.
 * Uses worn_last_at timestamp (updated when outfit containing item is saved).
 *
 * Note: "Worn" is a noisy proxy — outfit save = likely worn for casual items,
 * but festive items may be legitimately unworn between occasions.
 * Threshold should be extended for items tagged as "festive" or "wedding".
 */

import { supabase } from "../lib/supabase";

// ============================================================
// TYPES
// ============================================================

export interface NeglectedItem {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  suggested_name: string;
  category: string;
  worn_last_at: string | null;
  wear_count: number;
  days_since_worn: number | null;
  neglect_badge: boolean;
}

export interface DeadWeightSummary {
  neglected_count: number;
  total_active: number;
  neglect_rate: number; // percentage
  neglected_items: NeglectedItem[];
}

// ============================================================
// CONSTANTS
// ============================================================

const DEAD_WEIGHT_THRESHOLD_DAYS = 45;
const FESTIVE_THRESHOLD_DAYS = 120; // Festive items get longer runway

// ============================================================
// DEAD WEIGHT DETECTION
// ============================================================

/**
 * Get all neglected items for a user.
 * An item is neglected if:
 * - worn_last_at is NULL and created > 45 days ago, OR
 * - worn_last_at > 45 days ago
 * - AND item has no explicit "neglect_badge" override
 */
export async function getNeglectedItems(
  userId: string,
): Promise<NeglectedItem[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DEAD_WEIGHT_THRESHOLD_DAYS);
  const festiveCutoffDate = new Date();
  festiveCutoffDate.setDate(
    festiveCutoffDate.getDate() - FESTIVE_THRESHOLD_DAYS,
  );

  const { data: items, error } = await supabase
    .from("wardrobe_items")
    .select(
      "id, image_url, thumbnail_url, ai_tags, category, worn_last_at, wear_count, created_at",
    )
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error || !items) {
    throw new Error(`Failed to fetch wardrobe items: ${error?.message}`);
  }

  const now = new Date();
  const neglected: NeglectedItem[] = [];

  for (const item of items) {
    const occasionStr = String(
      (item.ai_tags as Record<string, unknown>)?.occasion ?? "",
    );
    const isFestive = occasionStr.toLowerCase().includes("festive");

    const thresholdDays = isFestive
      ? FESTIVE_THRESHOLD_DAYS
      : DEAD_WEIGHT_THRESHOLD_DAYS;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    const lastWorn = item.worn_last_at ? new Date(item.worn_last_at) : null;
    const createdAt = new Date(item.created_at);

    let isNeglected = false;
    let daysSinceWorn: number | null = null;

    if (!lastWorn) {
      // Never worn — check creation date
      if (createdAt < thresholdDate) {
        isNeglected = true;
        daysSinceWorn = Math.floor(
          (now.getTime() - createdAt.getTime()) / 86400000,
        );
      }
    } else {
      daysSinceWorn = Math.floor(
        (now.getTime() - lastWorn.getTime()) / 86400000,
      );
      if (lastWorn < thresholdDate) {
        isNeglected = true;
      }
    }

    const suggestedName =
      ((item.ai_tags as Record<string, unknown>)?.suggested_name as string) ??
      item.category;

    neglected.push({
      id: item.id,
      image_url: item.image_url,
      thumbnail_url: item.thumbnail_url,
      suggested_name: suggestedName,
      category: item.category,
      worn_last_at: item.worn_last_at,
      wear_count: item.wear_count ?? 0,
      days_since_worn: daysSinceWorn,
      neglect_badge: isNeglected,
    });
  }

  return neglected.filter((item) => item.neglect_badge);
}

/**
 * Get dead weight summary for a user (for notification / dashboard).
 */
export async function getDeadWeightSummary(
  userId: string,
): Promise<DeadWeightSummary> {
  const neglectedItems = await getNeglectedItems(userId);

  const { count: totalActive } = await supabase
    .from("wardrobe_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  const total = totalActive ?? 0;
  const neglectedCount = neglectedItems.length;

  return {
    neglected_count: neglectedCount,
    total_active: total,
    neglect_rate: total > 0 ? (neglectedCount / total) * 100 : 0,
    neglected_items: neglectedItems,
  };
}

/**
 * Mark an item as "worn today" — clears neglect badge and updates wear count.
 * Called when user explicitly marks an item as worn, or when outfit containing item is saved.
 */
export async function markAsWorn(
  userId: string,
  itemId: string,
): Promise<void> {
  const { error } = await supabase
    .from("wardrobe_items")
    .update({
      worn_last_at: new Date().toISOString(),
      wear_count: supabase.rpc("increment_wear_count", { item_id: itemId }),
    })
    .eq("user_id", userId)
    .eq("id", itemId);

  if (error) {
    // Fallback: manual increment
    const { data: item } = await supabase
      .from("wardrobe_items")
      .select("wear_count")
      .eq("id", itemId)
      .single();

    await supabase
      .from("wardrobe_items")
      .update({
        worn_last_at: new Date().toISOString(),
        wear_count: (item?.wear_count ?? 0) + 1,
      })
      .eq("id", itemId);
  }
}

/**
 * Add neglect_badge to an item's ai_tags (for manual override).
 */
export async function setNeglectBadge(
  userId: string,
  itemId: string,
  flagged: boolean,
): Promise<void> {
  const { data: item } = await supabase
    .from("wardrobe_items")
    .select("ai_tags")
    .eq("id", itemId)
    .single();

  if (!item) return;

  const currentTags = (item.ai_tags as Record<string, unknown>) ?? {};
  const updatedTags = {
    ...currentTags,
    neglect_badge: flagged,
    neglect_badge_set_at: flagged ? new Date().toISOString() : null,
  };

  await supabase
    .from("wardrobe_items")
    .update({ ai_tags: updatedTags })
    .eq("id", itemId)
    .eq("user_id", userId);
}
