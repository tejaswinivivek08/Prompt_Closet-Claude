// Auth types
export interface Session {
  user: User | null;
  accessToken: string | null;
}

export interface User {
  id: string;
  email: string;
  aud: string;
  created_at: string;
}

export interface AuthError {
  message: string;
  status?: number;
}

// Wardrobe item types
export type ClothingCategory =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "footwear"
  | "accessory"
  | "traditional";

export type Pattern =
  | "solid"
  | "striped"
  | "floral"
  | "printed"
  | "embroidered"
  | "checkered";

export type Occasion =
  | "casual"
  | "office"
  | "party"
  | "festive"
  | "wedding"
  | "temple"
  | "beach"
  | "date";

export type Season = "all-season" | "summer" | "winter" | "monsoon";

export interface WardrobeItem {
  id: string;
  user_id: string;
  image_url: string;
  thumbnail_url: string | null;
  category: ClothingCategory;
  subcategory: string | null;
  colors: string[];
  pattern: Pattern;
  fabric: string | null;
  occasions: Occasion[];
  formality_score: number;
  season: Season[];
  brand: string | null;
  purchase_price: number | null;
  last_worn_at: string | null;
  wear_count: number;
  is_active: boolean;
  ai_tags: Record<string, unknown> | null;
  created_at: string;
}

export interface ItemEmbedding {
  id: string;
  item_id: string;
  user_id: string;
  clip_embedding: number[];
  created_at: string;
}

// AI tagging stub response
export interface AITagResult {
  category: ClothingCategory;
  subcategory: string | null;
  colors: string[];
  pattern: Pattern;
  occasions: Occasion[];
  formality_score: number;
  confidence: number;
}

// Upload progress
export type UploadStatus =
  | "idle"
  | "compressing"
  | "uploading"
  | "tagging"
  | "done"
  | "error";

export interface UploadState {
  status: UploadStatus;
  progress: number;
  error?: string;
}
