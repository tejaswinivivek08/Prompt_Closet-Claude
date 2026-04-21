import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

// SecureStore adapter for Supabase session persistence
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silent fail - session will be lost but app won't crash
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Silent fail
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function deleteItem(
  itemId: string,
  userId: string,
): Promise<{ error: Error | null }> {
  // Soft-delete: set is_active = false on wardrobe_items
  const { error: wardrobeError } = await supabase
    .from("wardrobe_items")
    .update({ is_active: false })
    .eq("id", itemId)
    .eq("user_id", userId);

  if (wardrobeError) {
    return { error: new Error(wardrobeError.message) };
  }

  // Also delete corresponding row from item_embeddings
  const { error: embeddingsError } = await supabase
    .from("item_embeddings")
    .delete()
    .eq("item_id", itemId)
    .eq("user_id", userId);

  if (embeddingsError) {
    return { error: new Error(embeddingsError.message) };
  }

  return { error: null };
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
          skin_tone_palette: string | null;
          body_measurements: Record<string, unknown> | null;
          style_preferences: string[] | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          skin_tone_palette?: string | null;
          body_measurements?: Record<string, unknown> | null;
          style_preferences?: string[] | null;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          skin_tone_palette?: string | null;
          body_measurements?: Record<string, unknown> | null;
          style_preferences?: string[] | null;
        };
      };
      wardrobe_items: {
        Row: {
          id: string;
          user_id: string;
          image_url: string;
          thumbnail_url: string | null;
          category: string;
          subcategory: string | null;
          colors: string[];
          pattern: string;
          fabric: string | null;
          occasions: string[];
          formality_score: number;
          season: string[];
          brand: string | null;
          purchase_price: number | null;
          last_worn_at: string | null;
          wear_count: number;
          is_active: boolean;
          ai_tags: Record<string, unknown> | null;
          suggested_name: string | null;
          style_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          image_url: string;
          thumbnail_url?: string | null;
          category: string;
          subcategory?: string | null;
          colors: string[];
          pattern: string;
          fabric?: string | null;
          occasions: string[];
          formality_score: number;
          season: string[];
          brand?: string | null;
          purchase_price?: number | null;
          last_worn_at?: string | null;
          wear_count?: number;
          is_active?: boolean;
          ai_tags?: Record<string, unknown> | null;
          suggested_name?: string | null;
          style_notes?: string | null;
          created_at?: string;
        };
        Update: {
          image_url?: string;
          thumbnail_url?: string | null;
          category?: string;
          subcategory?: string | null;
          colors?: string[];
          pattern?: string;
          fabric?: string | null;
          occasions?: string[];
          formality_score?: number;
          season?: string[];
          brand?: string | null;
          purchase_price?: number | null;
          last_worn_at?: string | null;
          wear_count?: number;
          is_active?: boolean;
          ai_tags?: Record<string, unknown> | null;
          suggested_name?: string | null;
          style_notes?: string | null;
        };
      };
      item_embeddings: {
        Row: {
          id: string;
          item_id: string;
          user_id: string;
          clip_embedding: number[];
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          user_id: string;
          clip_embedding: number[];
          created_at?: string;
        };
        Update: {
          clip_embedding?: number[];
        };
      };
      outfits: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          item_ids: string[];
          occasion: string | null;
          rating: number | null;
          worn_on: string | null;
          notes: string | null;
          ai_generated: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string | null;
          item_ids: string[];
          occasion?: string | null;
          rating?: number | null;
          worn_on?: string | null;
          notes?: string | null;
          ai_generated?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string | null;
          item_ids?: string[];
          occasion?: string | null;
          rating?: number | null;
          worn_on?: string | null;
          notes?: string | null;
          ai_generated?: boolean;
        };
      };
    };
  };
};
