export interface LayerState {
  item_id: string;
  image_url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
}

export interface SavedStyle {
  id: string;
  name: string;
  tags: string[];
  notes: string | null;
  thumbnail_url: string | null;
  item_ids: string[];
  item_layers: LayerState[];
  gender: "female" | "male";
  created_at: string;
}

export interface WardrobeItemBasic {
  id: string;
  image_url: string;
  category: string;
  suggested_name: string | null;
}

export interface StyleBuilderSavePayload {
  name: string;
  tags: string[];
  notes: string;
  item_ids: string[];
  item_layers: LayerState[];
  gender: "female" | "male";
}
