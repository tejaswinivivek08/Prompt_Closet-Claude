-- ============================================================
-- Dead Weight Detector — utilities and RPC functions
-- ============================================================

-- Increment wear count RPC (used by markAsWorn)
CREATE OR REPLACE FUNCTION public.increment_wear_count(item_id UUID)
RETURNS INTEGER AS $$
  UPDATE wardrobe_items
  SET wear_count = COALESCE(wear_count, 0) + 1,
      worn_last_at = NOW()
  WHERE id = item_id
  RETURNING wear_count;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Index for efficient dead weight scan
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_neglect
ON public.wardrobe_items(user_id, worn_last_at);
