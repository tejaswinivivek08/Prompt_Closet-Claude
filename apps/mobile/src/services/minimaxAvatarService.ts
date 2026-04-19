/**
 * MiniMax Avatar Service
 *
 * Generates a styled AI avatar from a user photo using MiniMax Image API.
 * The avatar is used in Magic Bar results to visualize outfit suggestions.
 *
 * Flow:
 * 1. User uploads photo during onboarding
 * 2. MiniMax API generates stylized avatar
 * 3. Avatar stored in Supabase Storage
 * 4. Avatar displayed in Magic Bar results
 *
 * Note: User body photos processed through third-party APIs require
 * explicit consent. See FASHN DPA risk (journal/0010-RISK-fashn-dpa-unverified-body-photos.md)
 * for virtual try-on compliance. MiniMax avatar generates artistic representation
 * (not realistic body rendering), reducing biometric sensitivity.
 */

import { supabase } from "../lib/supabase";

// ============================================================
// TYPES
// ============================================================

export interface AvatarResult {
  avatar_url: string;
  avatar_id: string;
  style: string;
  generated_at: string;
}

export type AvatarStyle =
  | "illustration" // flat illustration style
  | "fashion_sketch" // fashion illustration look
  | "anime" // anime character style
  | "fashion_model"; // editorial fashion model aesthetic

const AVATAR_STYLES: Record<AvatarStyle, string> = {
  illustration:
    "Stylized fashion illustration, soft pastel colors, elegant pose, full body, minimalist background",
  fashion_sketch:
    "Fashion sketch style, detailed garment rendering, artistic linework, neutral background",
  anime:
    "Anime character illustration, vibrant colors, dynamic pose, fashion-forward outfit, clean background",
  fashion_model:
    "Editorial fashion photography style, studio lighting, professional pose, high fashion aesthetic",
};

// ============================================================
// CONSTANTS
// ============================================================

const MINIMAX_API_URL = "https://api.minimax.chat/v1/image_generation";

// ============================================================
// AVATAR GENERATION
// ============================================================

/**
 * Generate a styled avatar from a user photo.
 *
 * @param userId  - Current user's ID
 * @param photoUrl - Public URL of the user's photo
 * @param style   - Avatar style preference
 * @returns Avatar result with stored URL
 */
export async function generateAvatar(
  userId: string,
  photoUrl: string,
  style: AvatarStyle = "illustration",
): Promise<AvatarResult> {
  const apiKey = process.env.EXPO_PUBLIC_MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error(
      "MiniMax API key not configured. Set EXPO_PUBLIC_MINIMAX_API_KEY in .env",
    );
  }

  const prompt = AVATAR_STYLES[style];

  // Call MiniMax image generation API
  // Using their Flash API for fast generation
  const response = await fetch(`${MINIMAX_API_URL}/flash`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "MiniMax-Image-01",
      prompt: `Transform this photo into a ${style} avatar. ${prompt}. Maintain recognizable similarity to the original face while applying the artistic style. Full body visible if photo allows.`,
      image_url: photoUrl,
      num_images: 1,
      resolution: "1024x1024",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (!data.data?.[0]?.image_url) {
    throw new Error("MiniMax returned no image URL in response");
  }

  const generatedUrl = data.data[0].image_url;
  const avatarId = crypto.randomUUID();

  // Download and store avatar in Supabase Storage
  const avatarStoredUrl = await storeAvatar(
    userId,
    avatarId,
    generatedUrl,
    style,
  );

  // Save avatar record to database
  const { error: dbError } = await supabase.from("user_avatars").upsert({
    user_id: userId,
    avatar_url: avatarStoredUrl,
    style,
    is_active: true,
    created_at: new Date().toISOString(),
  });

  if (dbError) {
    console.error(
      "[MiniMaxAvatar] Failed to save avatar record:",
      dbError.message,
    );
    // Non-fatal: avatar was generated and stored, just not recorded
  }

  return {
    avatar_url: avatarStoredUrl,
    avatar_id: avatarId,
    style,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Store generated avatar image in Supabase Storage.
 */
async function storeAvatar(
  userId: string,
  avatarId: string,
  imageUrl: string,
  style: string,
): Promise<string> {
  // Download the generated image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to download generated avatar");
  }
  const imageBlob = await imageResponse.blob();

  const filePath = `avatars/${userId}/${avatarId}.png`;

  const { error: uploadError } = await supabase.storage
    .from("user-content")
    .upload(filePath, imageBlob, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload avatar: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("user-content")
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

// ============================================================
// AVATAR MANAGEMENT
// ============================================================

/**
 * Get the user's current active avatar.
 */
export async function getUserAvatar(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_avatars")
    .select("avatar_url")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.avatar_url;
}

/**
 * List all avatars for a user.
 */
export async function listUserAvatars(userId: string): Promise<AvatarResult[]> {
  const { data, error } = await supabase
    .from("user_avatars")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => ({
    avatar_url: row.avatar_url,
    avatar_id: row.id,
    style: row.style,
    generated_at: row.created_at,
  }));
}

/**
 * Deactivate current avatar (does not delete, keeps for history).
 */
export async function deactivateAvatar(userId: string): Promise<void> {
  await supabase
    .from("user_avatars")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);
}

/**
 * Style options for avatar selection UI.
 */
export const AVATAR_STYLE_OPTIONS: {
  value: AvatarStyle;
  label: string;
  emoji: string;
}[] = [
  { value: "illustration", label: "Illustration", emoji: "🎨" },
  { value: "fashion_sketch", label: "Fashion Sketch", emoji: "✏️" },
  { value: "anime", label: "Anime", emoji: "✨" },
  { value: "fashion_model", label: "Fashion Model", emoji: "📸" },
];
